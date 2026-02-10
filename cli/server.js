import { WebSocketServer } from 'ws'
import express from 'express'
import { createServer } from 'http'
import { watch } from 'chokidar'
import { readFileSync, writeFileSync, existsSync, unlinkSync, promises as fs } from 'fs'
import { join, resolve } from 'path'
import { fileURLToPath } from 'url'
import open from 'open'
import { executeSequentialRender } from '../core/pipeline_processor.js'
import { getAdapter } from '../core/adapter_registry.js'

const CONFIG_FILENAME = '.pen.config.json'

export async function launchEditorFlow(projectPath) {
  const configPath = join(projectPath, CONFIG_FILENAME)
  const config = JSON.parse(readFileSync(configPath, 'utf-8'))

  const httpPort = 3000
  const wsPort = 3001
  const previewPort = 3002

  const clients = new Set()
  let fileMap = {}
  let ignoreNextChange = new Set()

  for (const editor of config.editors) {
    const filePath = join(projectPath, editor.filename)
    if (existsSync(filePath)) {
      fileMap[editor.filename] = readFileSync(filePath, 'utf-8')
    }
  }

  const watchPatterns = config.editors.map(e => join(projectPath, e.filename))
  const watcher = watch(watchPatterns, {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 100 }
  })

  const wss = new WebSocketServer({ port: wsPort })

  wss.on('connection', (ws) => {
    clients.add(ws)
    console.log('📡 Client connected')

    ws.send(JSON.stringify({
      type: 'init',
      config,
      files: fileMap
    }))

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString())

        if (message.type === 'update') {
          fileMap[message.filename] = message.content
          ignoreNextChange.add(message.filename)

          const filePath = join(projectPath, message.filename)
          
          // These can happen in background
          fs.writeFile(filePath, message.content).then(() => {
            setTimeout(() => ignoreNextChange.delete(message.filename), 1000)
          }).catch(err => console.error(`Failed to write ${message.filename}:`, err))

          // Render can also happen in background or we can await it if we want the preview to be immediate
          if (config.autoRun !== false) {
            executeSequentialRender(fileMap, config).then(html => {
              broadcast({ type: 'preview', html })
            })
          }
          
          // Ack immediately to the client
          ws.send(JSON.stringify({ type: 'update-ack', filename: message.filename }))
        }

        if (message.type === 'rename') {
          const { oldFilename, newFilename, newType } = message
          const oldPath = join(projectPath, oldFilename)
          const newPath = join(projectPath, newFilename)

          if (existsSync(oldPath)) {
            const content = readFileSync(oldPath, 'utf-8')
            writeFileSync(newPath, content)
            if (existsSync(oldPath)) unlinkSync(oldPath)
          }

          // Update config
          const editor = config.editors.find((e) => e.filename === oldFilename)
          if (editor) {
            editor.filename = newFilename
            editor.type = newType
            writeFileSync(configPath, JSON.stringify(config, null, 2))
          }

          // Update fileMap
          fileMap[newFilename] = fileMap[oldFilename]
          delete fileMap[oldFilename]

          // Update watcher
          watcher.unwatch(oldPath)
          watcher.add(newPath)

          console.log(`🏷️  Renamed: ${oldFilename} -> ${newFilename} (${newType})`)
          
          if (config.autoRun !== false) {
            const html = await executeSequentialRender(fileMap, config)
            broadcast({ type: 'preview', html })
          }
        }

        if (message.type === 'editor-settings') {
          const { filename, settings } = message
          const editor = config.editors.find((e) => e.filename === filename)
          if (editor) {
            editor.settings = settings
            writeFileSync(configPath, JSON.stringify(config, null, 2))
            console.log(`⚙️  Updated settings for ${filename}`)
            
            if (config.autoRun !== false) {
              const html = await executeSequentialRender(fileMap, config)
              broadcast({ type: 'preview', html })
            }
          }
        }

        if (message.type === 'format') {
          const { filename } = message
          const content = fileMap[filename]
          const editor = config.editors.find((e) => e.filename === filename)
          if (editor && content) {
            try {
              const AdapterClass = getAdapter(editor.type)
              const adapter = new AdapterClass()
              adapter.setSettings(editor.settings || {})
              const formatted = await adapter.beautify(content, null, filename)

              if (formatted !== content) {
                fileMap[filename] = formatted
                writeFileSync(join(projectPath, filename), formatted)
                ignoreNextChange.add(filename)
                setTimeout(() => ignoreNextChange.delete(filename), 200)

                broadcast({
                  type: 'external-update',
                  filename,
                  content: formatted
                })

                if (config.autoRun !== false) {
                  const html = await executeSequentialRender(fileMap, config)
                  broadcast({ type: 'preview', html })
                }
              }
            } catch (err) {
              console.error('Format error:', err)
              
              // Extract line and column if available (common in Prettier/Babel errors)
              let line = 0
              let column = 0
              if (err.loc) {
                line = err.loc.start ? err.loc.start.line : err.loc.line
                column = err.loc.start ? err.loc.start.column : err.loc.column
              }

              broadcast({
                type: 'toast-error',
                filename,
                name: err.name || 'Formatting Error',
                message: err.message.split('\n')[0], // Just the first line of the message
                line,
                column
              })
            }
          }
        }

        if (message.type === 'save') {
          const writePromises = []
          for (const [filename, content] of Object.entries(message.files)) {
            fileMap[filename] = content
            const filePath = join(projectPath, filename)
            writePromises.push(fs.writeFile(filePath, content))
          }
          Promise.all(writePromises).then(async () => {
            if (config.autoRun !== false) {
              const html = await executeSequentialRender(fileMap, config)
              broadcast({ type: 'preview', html })
            }
          }).catch(err => console.error('Bulk save error:', err))
        }

        if (message.type === 'render') {
          const html = await executeSequentialRender(fileMap, config)
          ws.send(JSON.stringify({ type: 'preview', html }))
        }

        if (message.type === 'save-config') {
          const newConfig = message.config
          if (newConfig && typeof newConfig === 'object') {
            Object.assign(config, newConfig)
            writeFileSync(configPath, JSON.stringify(config, null, 2))
            console.log('⚙️  Config saved')
            const html = await executeSequentialRender(fileMap, config)
            broadcast({ type: 'preview', html })
          }
        }
      } catch (err) {
        console.error('WebSocket error:', err)
      }
    })

    ws.on('close', () => {
      clients.delete(ws)
      console.log('📡 Client disconnected')
    })
  })

  function broadcast(message) {
    const data = JSON.stringify(message)
    for (const client of clients) {
      if (client.readyState === 1) {
        client.send(data)
      }
    }
  }


  watcher.on('change', async (filePath) => {
    const filename = filePath.split('/').pop()
    if (ignoreNextChange.has(filename)) return

    console.log(`📝 External change: ${filename}`)
    const content = readFileSync(filePath, 'utf-8')
    fileMap[filename] = content

    broadcast({
      type: 'external-update',
      filename,
      content
    })

    if (config.autoRun !== false) {
      const html = await executeSequentialRender(fileMap, config)
      broadcast({ type: 'preview', html })
    }
  })

  const __dirname = fileURLToPath(new URL('.', import.meta.url))
  const distPath = resolve(__dirname, '../dist')
  const webPath = resolve(__dirname, '../web')

  const app = express()

  app.use(express.json())

  app.get('/api/config', (req, res) => {
    res.json(config)
  })

  app.get('/api/files', (req, res) => {
    res.json(fileMap)
  })

  app.get('/api/adapters', (req, res) => {
    const adapters = config.editors.map(e => {
      const adapter = getAdapter(e.type)
      return {
        id: adapter.id,
        type: adapter.type,
        name: adapter.name,
        description: adapter.description,
        fileExtension: adapter.fileExtension,
        schema: adapter.getSchema ? adapter.getSchema() : {}
      }
    })
    res.json(adapters)
  })

  if (existsSync(distPath)) {
    app.use(express.static(distPath))
  } else {
    app.get('/', (req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Pen Editor</title>
          <script type="module" src="http://localhost:5173/@vite/client"></script>
          <script type="module" src="http://localhost:5173/main.js"></script>
        </head>
        <body>
          <div id="app"></div>
        </body>
        </html>
      `)
    })
  }

  app.listen(httpPort, () => {
    console.log(`\n✨ Pen Editor is running!\n`)
    console.log(`   🌐 Editor:  http://localhost:${httpPort}`)
    console.log(`   📡 WS:      ws://localhost:${wsPort}`)
    console.log(`   📄 Preview: http://localhost:${previewPort}`)
    console.log(`\n   Press Ctrl+C to stop.\n`)
  })

  const previewApp = express()

  const devtoolsScript = `
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
      if (eventType === 'DEV' && typeof data === 'string') {
        chobitsu.sendRawMessage(data);
      }
    });

    const sendToDevtools = (message) => {
      window.parent.postMessage(JSON.stringify(message), '*');
    };

    let id = 0;
    const sendToChobitsu = (message) => {
      message.id = 'tmp' + ++id;
      chobitsu.sendRawMessage(JSON.stringify(message));
    };

    const notifyNavigation = () => {
      sendToDevtools({
        method: 'Page.frameNavigated',
        params: {
          frame: {
            id: '1',
            loaderId: '1',
            url: location.href,
            securityOrigin: location.origin,
            mimeType: 'text/html'
          },
          type: 'Navigation'
        }
      });
      sendToChobitsu({ method: 'Network.enable' });
      sendToDevtools({ method: 'Runtime.executionContextsCleared' });
      sendToChobitsu({ method: 'Runtime.enable' });
      sendToChobitsu({ method: 'Debugger.enable' });
      sendToChobitsu({ method: 'DOMStorage.enable' });
      sendToChobitsu({ method: 'DOM.enable' });
      sendToChobitsu({ method: 'CSS.enable' });
      sendToChobitsu({ method: 'Overlay.enable' });
      sendToDevtools({ method: 'DOM.documentUpdated' });
    };
    
    setTimeout(notifyNavigation, 200);
  })();
<\/script>
`

  previewApp.get('*', async (req, res) => {
    let html = await executeSequentialRender(fileMap, config)
    
    // Inject bridge
    const headClose = html.indexOf('</head>')
    if (headClose !== -1) {
      html = html.slice(0, headClose) + devtoolsScript + html.slice(headClose)
    } else {
      const bodyStart = html.indexOf('<body')
      if (bodyStart !== -1) {
        html = html.slice(0, bodyStart) + devtoolsScript + html.slice(bodyStart)
      } else {
        html = devtoolsScript + html
      }
    }
    
    res.send(html)
  })

  previewApp.listen(previewPort)

  open(`http://localhost:${httpPort}`)
}

export function watchExternalChanges(projectPath, config, callback) {
  const patterns = config.editors.map(e => join(projectPath, e.filename))
  const watcher = watch(patterns, {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 100 }
  })

  watcher.on('change', callback)
  return watcher
}
