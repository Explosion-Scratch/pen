import { WebSocketServer } from 'ws'
import express from 'express'
import { watch } from 'chokidar'
import { readFileSync, writeFileSync, existsSync, unlinkSync, promises as fs } from 'fs'
import { join, resolve } from 'path'
import { fileURLToPath } from 'url'
import open from 'open'
import { executeSequentialRender } from '../core/pipeline_processor.js'
import { getAdapter } from '../core/adapter_registry.js'
import { loadAllProjectTemplates } from '../core/project_templates.js'

const CONFIG_FILENAME = '.pen.config.json'

const DEVTOOLS_BRIDGE = `
<script src="https://cdn.jsdelivr.net/npm/chobitsu"><\/script>
<script type="module">
  (function() {
    if (window._chobitsu_initialized) return;
    window._chobitsu_initialized = true;
    chobitsu.setOnMessage((data) => {
      if (data.includes('"id":"tmp')) return;
      window.parent.postMessage(data, '*');
    });
    window.addEventListener('message', (event) => {
      const { event: eventType, data } = event.data || {};
      if (eventType === 'DEV' && typeof data === 'string') chobitsu.sendRawMessage(data);
    });
    const sendToDevtools = (msg) => window.parent.postMessage(JSON.stringify(msg), '*');
    let id = 0;
    const sendToChobitsu = (msg) => { msg.id = 'tmp' + ++id; chobitsu.sendRawMessage(JSON.stringify(msg)); };
    const notifyNavigation = () => {
      sendToDevtools({ method: 'Page.frameNavigated', params: { frame: { id: '1', loaderId: '1', url: location.href, securityOrigin: location.origin, mimeType: 'text/html' }, type: 'Navigation' } });
      sendToChobitsu({ method: 'Network.enable' });
      sendToDevtools({ method: 'Runtime.executionContextsCleared' });
      for (const m of ['Runtime.enable','Debugger.enable','DOMStorage.enable','DOM.enable','CSS.enable','Overlay.enable']) sendToChobitsu({ method: m });
      sendToDevtools({ method: 'DOM.documentUpdated' });
    };
    setTimeout(notifyNavigation, 200);
  })();
<\/script>
`

export async function launchEditorFlow(projectPath, options = {}) {
  const configPath = join(projectPath, CONFIG_FILENAME)
  const config = JSON.parse(readFileSync(configPath, 'utf-8'))
  const httpPort = 3000, wsPort = 3001, previewPort = 3002

  const clients = new Set()
  let fileMap = {}
  const ignoreNextChange = new Set()

  for (const editor of config.editors) {
    const filePath = join(projectPath, editor.filename)
    if (existsSync(filePath)) fileMap[editor.filename] = readFileSync(filePath, 'utf-8')
  }

  const watcher = watch(config.editors.map(e => join(projectPath, e.filename)), {
    persistent: true, ignoreInitial: true, awaitWriteFinish: { stabilityThreshold: 100 }
  })

  const broadcast = (msg) => {
    const data = JSON.stringify(msg)
    for (const c of clients) if (c.readyState === 1) c.send(data)
  }

  const renderAndBroadcast = async () => {
    if (config.autoRun === false) return
    const html = await executeSequentialRender(fileMap, config)
    broadcast({ type: 'preview', html })
  }

  const wss = new WebSocketServer({ port: wsPort })

  wss.on('connection', (ws) => {
    clients.add(ws)
    if (!options.headless) console.log('📡 Client connected')
    const getAdaptersInfo = () => config.editors.map(e => {
      const A = getAdapter(e.type)
      return {
        id: A.id,
        type: e.type,
        name: A.name,
        description: A.description,
        fileExtension: A.fileExtension,
        compileTargets: A.compileTargets || [],
        canMinify: A.canMinify || false,
        schema: A.getSchema?.() || {}
      }
    })

    ws.send(JSON.stringify({
      type: 'init',
      config,
      files: fileMap,
      adapters: getAdaptersInfo()
    }))

    ws.on('message', async (raw) => {
      try {
        const msg = JSON.parse(raw.toString())
        await handleMessage(ws, msg)
      } catch (err) {
        console.error('WebSocket error:', err)
      }
    })

    async function handleMessage(ws, msg) {
      switch (msg.type) {
        case 'update': {
          fileMap[msg.filename] = msg.content
          ignoreNextChange.add(msg.filename)
          fs.writeFile(join(projectPath, msg.filename), msg.content)
            .then(() => setTimeout(() => ignoreNextChange.delete(msg.filename), 1000))
            .catch(err => console.error(`Write failed ${msg.filename}:`, err))
          await renderAndBroadcast()
          ws.send(JSON.stringify({ type: 'update-ack', filename: msg.filename }))
          break
        }

        case 'rename': {
          const { oldFilename, newFilename, newType } = msg
          const oldPath = join(projectPath, oldFilename)
          const newPath = join(projectPath, newFilename)
          if (existsSync(oldPath)) {
            writeFileSync(newPath, readFileSync(oldPath, 'utf-8'))
            if (existsSync(oldPath)) unlinkSync(oldPath)
          }
          const editor = config.editors.find(e => e.filename === oldFilename)
          if (editor) {
            editor.filename = newFilename
            editor.type = newType
            writeFileSync(configPath, JSON.stringify(config, null, 2))
          }
          fileMap[newFilename] = fileMap[oldFilename]
          delete fileMap[oldFilename]
          watcher.unwatch(oldPath)
          watcher.add(newPath)
          console.log(`🏷️  Renamed: ${oldFilename} → ${newFilename} (${newType})`)
          
          const adaptersInfo = config.editors.map(e => {
            const A = getAdapter(e.type)
            return {
              id: A.id,
              type: e.type,
              name: A.name,
              description: A.description,
              fileExtension: A.fileExtension,
              compileTargets: A.compileTargets || [],
              canMinify: A.canMinify || false,
              schema: A.getSchema?.() || {}
            }
          })
          
          broadcast({ 
            type: 'sync-editors', 
            editors: config.editors,
            adapters: adaptersInfo
          })
          
          await renderAndBroadcast()
          break
        }

        case 'editor-settings': {
          const editor = config.editors.find(e => e.filename === msg.filename)
          if (editor) {
            editor.settings = msg.settings
            writeFileSync(configPath, JSON.stringify(config, null, 2))
            console.log(`⚙️  Settings: ${msg.filename}`)
            await renderAndBroadcast()
          }
          break
        }

        case 'format':
        case 'minify':
        case 'compile': {
          const content = fileMap[msg.filename]
          const editor = config.editors.find(e => e.filename === msg.filename)
          if (!editor || !content) break
          try {
            const adapter = new (getAdapter(editor.type))()
            adapter.setSettings(editor.settings || {})
            
            let result
            if (msg.type === 'format') {
              result = await adapter.beautify(content, null, msg.filename)
            } else if (msg.type === 'minify') {
              if (adapter.minify) {
                result = await adapter.minify(content)
              } else {
                console.warn(`Minify not supported for ${editor.type}`)
                break
              }
            } else if (msg.type === 'compile') {
              // Look for compileToX methods
              const target = msg.target
              const methodName = `compileTo${target.charAt(0).toUpperCase() + target.slice(1)}`
              if (typeof adapter[methodName] === 'function') {
                result = await adapter[methodName](content)
              } else {
                console.warn(`Compile to ${target} not supported for ${editor.type}`)
                break
              }
            }

            if (result !== undefined && result !== content) {
              fileMap[msg.filename] = result
              writeFileSync(join(projectPath, msg.filename), result)
              ignoreNextChange.add(msg.filename)
              setTimeout(() => ignoreNextChange.delete(msg.filename), 200)
              broadcast({ type: 'external-update', filename: msg.filename, content: result })
              await renderAndBroadcast()
            }
          } catch (err) {
            console.error(`${msg.type} error:`, err)
            const loc = err.loc
            broadcast({
              type: 'toast-error',
              filename: msg.filename,
              name: err.name || `${msg.type.charAt(0).toUpperCase() + msg.type.slice(1)} Error`,
              message: err.message.split('\n')[0],
              line: loc?.start?.line || loc?.line || 0,
              column: loc?.start?.column || loc?.column || 0
            })
          }
          break
        }

        case 'save': {
          const writes = Object.entries(msg.files).map(([fn, c]) => {
            fileMap[fn] = c
            return fs.writeFile(join(projectPath, fn), c)
          })
          await Promise.all(writes).catch(err => console.error('Bulk save error:', err))
          await renderAndBroadcast()
          break
        }

        case 'render': {
          const html = await executeSequentialRender(fileMap, config)
          ws.send(JSON.stringify({ type: 'preview', html }))
          break
        }

        case 'start-template': {
          const { loadProjectTemplate } = await import('../core/project_templates.js')
          const template = loadProjectTemplate(msg.templateId)
          if (!template) break

          const newConfig = { ...template.config, name: config.name }
          Object.assign(config, newConfig)
          
          for (const fn of Object.keys(fileMap)) delete fileMap[fn]
          
          for (const [fn, content] of Object.entries(template.files)) {
            fileMap[fn] = content
            writeFileSync(join(projectPath, fn), content)
          }
          
          writeFileSync(configPath, JSON.stringify(config, null, 2))
          console.log(`🚀 Project reset to template: ${msg.templateId}`)
          
          broadcast({ type: 'reload' })
          break
        }

        case 'save-config': {
          if (msg.config && typeof msg.config === 'object') {
            Object.assign(config, msg.config)
            writeFileSync(configPath, JSON.stringify(config, null, 2))
            console.log('⚙️  Config saved')
            const html = await executeSequentialRender(fileMap, config)
            broadcast({ type: 'preview', html })
          }
          break
        }
      }
    }

    ws.on('close', () => { clients.delete(ws); if (!options.headless) console.log('📡 Client disconnected') })
  })

  watcher.on('change', async (filePath) => {
    const filename = filePath.split('/').pop()
    if (ignoreNextChange.has(filename)) return
    console.log(`📝 External change: ${filename}`)
    fileMap[filename] = readFileSync(filePath, 'utf-8')
    broadcast({ type: 'external-update', filename, content: fileMap[filename] })
    await renderAndBroadcast()
  })

  const __dirname = fileURLToPath(new URL('.', import.meta.url))
  const distPath = resolve(__dirname, '../dist')

  const app = express()
  app.use(express.json())

  app.get('/api/config', (_, res) => res.json(config))
  app.get('/api/files', (_, res) => res.json(fileMap))
  app.get('/api/templates', (_, res) => {
    const templates = loadAllProjectTemplates().map(({ id, title, description, icon, config: c }) => ({
      id, title, description, icon,
      editors: c.editors.map(e => e.type)
    }))
    res.json(templates)
  })
  app.get('/api/adapters', (_, res) => {
    res.json(config.editors.map(e => {
      const A = getAdapter(e.type)
      return { id: A.id, type: e.type, name: A.name, description: A.description, fileExtension: A.fileExtension, compileTargets: A.compileTargets || [], canMinify: A.canMinify || false, schema: A.getSchema?.() || {} }
    }))
  })

  if (!options.headless) {
    if (existsSync(distPath)) {
      app.use(express.static(distPath))
    } else {
      app.get('/', (_, res) => res.send(`<!DOCTYPE html><html><head><title>Pen Editor</title><script type="module" src="http://localhost:5173/@vite/client"></script><script type="module" src="http://localhost:5173/main.js"></script></head><body><div id="app"></div></body></html>`))
    }
  }

  app.listen(httpPort, () => {
    if (options.headless) {
      console.log(`\n\x1b[1m✨ Pen Services (Headless)\x1b[0m\n`)
      console.log(`   📡 API:     http://localhost:${httpPort}`)
      console.log(`   📡 WS:      ws://localhost:${wsPort}`)
      console.log(`   📄 Preview: http://localhost:${previewPort}\n`)
    } else {
      console.log(`\n\x1b[1m✨ Pen Editor\x1b[0m\n`)
      console.log(`   🌐 Editor:  http://localhost:${httpPort}`)
      console.log(`   📡 WS:      ws://localhost:${wsPort}`)
      console.log(`   📄 Preview: http://localhost:${previewPort}`)
      console.log(`\n   Press Ctrl+C to stop.\n`)
    }
  })

  const previewApp = express()
  previewApp.get('*', async (_, res) => {
    let html = await executeSequentialRender(fileMap, config)
    const headClose = html.indexOf('</head>')
    html = headClose !== -1
      ? html.slice(0, headClose) + DEVTOOLS_BRIDGE + html.slice(headClose)
      : DEVTOOLS_BRIDGE + html
    res.send(html)
  })
  previewApp.listen(previewPort)

  if (!options.headless) {
    open(`http://localhost:${httpPort}`)
  }
}


