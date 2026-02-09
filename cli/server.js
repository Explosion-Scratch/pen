import { WebSocketServer } from 'ws'
import express from 'express'
import { createServer } from 'http'
import { watch } from 'chokidar'
import { readFileSync, writeFileSync, existsSync } from 'fs'
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

          writeFileSync(join(projectPath, message.filename), message.content)

          setTimeout(() => ignoreNextChange.delete(message.filename), 200)

          const html = await executeSequentialRender(fileMap, config)
          broadcast({ type: 'preview', html })
        }

        if (message.type === 'save') {
          for (const [filename, content] of Object.entries(message.files)) {
            writeFileSync(join(projectPath, filename), content)
          }
        }

        if (message.type === 'render') {
          const html = await executeSequentialRender(fileMap, config)
          ws.send(JSON.stringify({ type: 'preview', html }))
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

  const watchPatterns = config.editors.map(e => join(projectPath, e.filename))
  const watcher = watch(watchPatterns, {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 100 }
  })

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

    const html = await executeSequentialRender(fileMap, config)
    broadcast({ type: 'preview', html })
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

  previewApp.get('/', async (req, res) => {
    const html = await executeSequentialRender(fileMap, config)
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
