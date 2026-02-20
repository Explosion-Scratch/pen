import { input, select, confirm } from '@inquirer/prompts'
import { writeFileSync, readFileSync, existsSync, mkdirSync, readdirSync } from 'fs'
import { join, basename, relative } from 'path'
import { getAdapter, getAdaptersByCategory, getAllAdapters } from '../core/adapter_registry.js'
import { loadAllProjectTemplates } from '../core/project_templates.js'
import { launchEditorFlow } from './server.js'
import { findAvailablePort } from './port_utils.js'
import chalk from 'chalk'

const CONFIG_FILENAME = '.pen.config.json'

export async function initializeNewProjectFlow(projectPath) {
  console.log(`\n${chalk.bold("Create a new Pen project")}\n`)

  const targetDirInput = await input({
    message: 'Target directory',
    default: '.'
  })

  const targetDir = targetDirInput === '.' ? projectPath : join(projectPath, targetDirInput)

  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true })
  } else {
    if (existsSync(join(targetDir, CONFIG_FILENAME))) {
      const overwrite = await confirm({ message: chalk.yellow('A Pen project already exists in this directory. Overwrite it?'), default: false })
      if (!overwrite) {
        console.log(chalk.red('Aborted.'))
        process.exit(0)
      }
    } else {
      const files = readdirSync(targetDir)
      if (files.length > 0) {
        const initAny = await confirm({ message: chalk.yellow('Target directory is not empty. Initialize Pen project here anyway?'), default: false })
        if (!initAny) {
          console.log(chalk.red('Aborted.'))
          process.exit(0)
        }
      }
    }
  }

  const defaultName = basename(targetDir) === '' || basename(targetDir) === '.' ? 'my-pen-project' : basename(targetDir)

  const projectName = await input({
    message: 'Project name',
    default: defaultName,
    validate: v => v.length > 0 || 'Required'
  })

  // Update projectPath to the new subfolder
  projectPath = targetDir

  const templates = await loadAllProjectTemplates()
  const choices = [
    ...templates.map(t => ({
      name: `${t.title} — ${t.description}`,
      value: t.id
    })),
    { name: chalk.dim('Custom... (pick each editor)'), value: '__custom__' }
  ]

  const templateChoice = await select({
    message: 'Start from a template',
    choices,
    default: 'vanilla'
  })

  let config, files

  if (templateChoice === '__custom__') {
    ({ config, files } = await buildCustomConfig(projectName))
  } else {
    const tmpl = templates.find(t => t.id === templateChoice)
    config = { ...tmpl.config, name: projectName }
    files = { ...tmpl.files }
  }

  writeFileSync(join(projectPath, CONFIG_FILENAME), JSON.stringify(config, null, 2))
  for (const [filename, content] of Object.entries(files)) {
    writeFileSync(join(projectPath, filename), content)
  }

  console.log(`\n${chalk.green("Project created!")}\n`)
  console.log(`   ${projectName}`)
  config.editors.forEach(e => console.log(`   ${e.filename}`))
  console.log('')

  const launchNow = await confirm({ message: 'Launch the editor?', default: true })
  if (launchNow) await launchEditorFlow(projectPath)
}

async function buildCustomConfig(projectName) {
  const pick = async (category, label) => {
    const adapters = getAdaptersByCategory(category)
    return select({
      message: `Choose ${label}`,
      choices: adapters.map(a => ({ name: `${a.name} — ${a.description}`, value: a.id }))
    })
  }

  const markupId = await pick('markup', 'markup')
  const styleId = await pick('style', 'styling')
  const scriptId = await pick('script', 'scripting')

  const adapters = [markupId, styleId, scriptId].map(id => getAdapter(id))
  const config = {
    name: projectName,
    version: '1.0.0',
    editors: adapters.map((A, i) => ({
      type: A.id,
      filename: `${['index', 'style', 'script'][i]}${A.fileExtension}`,
      settings: A.getDefaultSettings?.() || {}
    })),
    globalResources: { scripts: [], styles: [] }
  }

  const files = {}
  for (const editor of config.editors) {
    const A = getAdapter(editor.type)
    files[editor.filename] = await A.getDefaultTemplate({ projectName })
  }

  return { config, files }
}

export async function interactiveConfigurationFlow(projectPath) {
  const configPath = join(projectPath, CONFIG_FILENAME)
  const config = JSON.parse(readFileSync(configPath, 'utf-8'))

  console.log(`\n${chalk.bold(config.name)}\n`)

  const actions = [
    { name: 'Add editor', value: 'add' },
    ...config.editors.map((e, i) => {
      const A = getAdapter(e.type)
      return { name: `Configure ${A.name} (${e.filename})`, value: `editor_${i}` }
    }),
    { name: 'Manage CDN links', value: 'cdn' },
    { name: 'Manage import overrides', value: 'overrides' },
    { name: 'Done', value: 'exit' }
  ]

  const action = await select({ message: 'Action', choices: actions })

  if (action === 'add') {
    await addEditor(config, projectPath)
  } else if (action.startsWith('editor_')) {
    const idx = parseInt(action.replace('editor_', ''), 10)
    await configureEditorFlow(config, idx)
  } else if (action === 'cdn') {
    await manageCdn(config)
  } else if (action === 'overrides') {
    await manageImportOverrides(config)
  }

  writeFileSync(configPath, JSON.stringify(config, null, 2))
  console.log(`\n${chalk.green("Saved!")}\n`)

  if (action !== 'exit') await interactiveConfigurationFlow(projectPath)
}

async function addEditor(config, projectPath) {
  const usedTypes = new Set(config.editors.map(e => e.type))
  const available = getAllAdapters().filter(a => !usedTypes.has(a.id))

  if (!available.length) {
    console.log('  All editor types are in use.')
    return
  }

  const typeId = await select({
    message: 'Editor type',
    choices: available.map(a => ({ name: `${a.name} (${a.type})`, value: a.id }))
  })

  const A = getAdapter(typeId)
  const filename = await input({ message: 'Filename', default: `new${A.fileExtension}` })

  config.editors.push({ type: typeId, filename, settings: A.getDefaultSettings?.() || {} })
  writeFileSync(join(projectPath, filename), await A.getDefaultTemplate({ projectName: config.name }))
}

async function configureEditorFlow(config, editorIndex) {
  const editor = config.editors[editorIndex]
  const A = getAdapter(editor.type)
  const schema = A.getSchema ? A.getSchema() : {}
  // Ensure we have defaults instantiated
  editor.settings = editor.settings || A.getDefaultSettings?.() || {}
  
  // Base editor options
  if (editor.settings.tabSize === undefined) editor.settings.tabSize = 2
  if (editor.settings.lineWrapping === undefined) editor.settings.lineWrapping = true
  if (editor.settings.lineNumbers === undefined) editor.settings.lineNumbers = true
  if (editor.settings.emmet === undefined) editor.settings.emmet = true

  const booleanOnOff = (val) => val ? chalk.green('ON') : chalk.red('OFF')

  const actions = [
    { name: `Rename file ${chalk.dim(`(${editor.filename})`)}`, value: 'rename' },
    { name: 'Remove editor', value: 'remove' },
    { name: `Tab Size ${chalk.dim(`(${editor.settings.tabSize})`)}`, value: 'tabSize' },
    { name: `Line Wrapping ${chalk.dim(`(${booleanOnOff(editor.settings.lineWrapping)})`)}`, value: 'lineWrapping' },
    { name: `Line Numbers ${chalk.dim(`(${booleanOnOff(editor.settings.lineNumbers)})`)}`, value: 'lineNumbers' },
    { name: `Emmet Abbreviations ${chalk.dim(`(${booleanOnOff(editor.settings.emmet)})`)}`, value: 'emmet' }
  ]

  for (const [key, field] of Object.entries(schema)) {
    let displayVal = editor.settings[key]
    if (field.type === 'boolean') {
      displayVal = booleanOnOff(editor.settings[key])
    }
    actions.push({ name: `${field.name} ${chalk.dim(`(${displayVal})`)}`, value: `schema_${key}` })
  }

  actions.push({ name: 'Back', value: 'back' })

  const action = await select({ message: `Configure ${A.name}`, choices: actions })

  if (action === 'back') return

  if (action === 'rename') {
    config.editors[editorIndex].filename = await input({ message: 'New filename', default: config.editors[editorIndex].filename })
  } else if (action === 'remove') {
    if (config.editors.length <= 1) {
      console.log('  Cannot remove last editor.')
    } else {
      const confirmRemove = await confirm({ message: `Are you sure you want to remove ${editor.filename}?`, default: false })
      if (confirmRemove) {
        config.editors.splice(editorIndex, 1)
        return // removed, so exit the flow
      }
    }
  } else if (action === 'tabSize') {
    const size = await select({
      message: 'Tab Size',
      choices: [
        { name: '2 spaces', value: 2 },
        { name: '4 spaces', value: 4 },
        { name: '8 spaces', value: 8 }
      ],
      default: editor.settings.tabSize
    })
    editor.settings.tabSize = size
  } else if (['lineWrapping', 'lineNumbers', 'emmet'].includes(action)) {
    editor.settings[action] = !editor.settings[action]
  } else if (action.startsWith('schema_')) {
    const key = action.replace('schema_', '')
    const field = schema[key]
    
    if (field.type === 'boolean') {
      editor.settings[key] = !editor.settings[key]
    } else if (field.type === 'select') {
      const val = await select({
        message: field.name,
        choices: field.options.map(opt => ({
          name: typeof opt === 'object' ? opt.label : opt,
          value: typeof opt === 'object' ? opt.value : opt
        })),
        default: editor.settings[key]
      })
      editor.settings[key] = val
    } else if (field.type === 'number') {
      const val = await input({
        message: field.name,
        default: editor.settings[key].toString(),
        validate: (v) => !isNaN(parseInt(v, 10)) || 'Must be a number'
      })
      editor.settings[key] = parseInt(val, 10)
    } else {
      const val = await input({
        message: field.name,
        default: editor.settings[key] || ''
      })
      editor.settings[key] = val
    }
  }

  // Continue configuring this editor unless removed
  await configureEditorFlow(config, editorIndex)
}

async function manageCdn(config) {
  const type = await select({
    message: 'Resource type',
    choices: [{ name: 'Scripts (JS)', value: 'scripts' }, { name: 'Styles (CSS)', value: 'styles' }]
  })

  const list = config.globalResources[type]
  if (list.length) list.forEach((u, i) => console.log(`  ${i + 1}. ${u}`))
  else console.log('  (none)')

  const action = await select({
    message: 'Action',
    choices: [
      { name: 'Add URL', value: 'add' },
      ...(list.length ? [{ name: 'Remove URL', value: 'remove' }] : []),
      { name: 'Back', value: 'back' }
    ]
  })

  if (action === 'add') {
    list.push(await input({ message: 'CDN URL' }))
  } else if (action === 'remove') {
    const idx = await select({ message: 'Remove', choices: list.map((u, i) => ({ name: u, value: i })) })
    list.splice(idx, 1)
  }
}

async function manageImportOverrides(config) {
  config.importOverrides = config.importOverrides || {}
  const entries = Object.entries(config.importOverrides)

  console.log(`\n  ${chalk.bold("Import Overrides")}`)
  console.log('  Maps bare package names to custom URLs.\n')
  if (entries.length) entries.forEach(([k, v]) => console.log(`  ${chalk.cyan(k)} -> ${v}`))
  else console.log('  (none)')

  const action = await select({
    message: 'Action',
    choices: [
      { name: 'Add override', value: 'add' },
      ...(entries.length ? [{ name: 'Remove override', value: 'remove' }] : []),
      { name: 'Back', value: 'back' }
    ]
  })

  if (action === 'add') {
    const pkg = await input({ message: 'Package name (e.g. vue)' })
    const url = await input({ message: 'CDN URL' })
    config.importOverrides[pkg] = url
  } else if (action === 'remove') {
    const key = await select({
      message: 'Remove',
      choices: entries.map(([k]) => ({ name: k, value: k }))
    })
    delete config.importOverrides[key]
  }
}

export async function startPreviewServer(projectPath, options = {}) {
  const { executeSequentialRender } = await import('../core/pipeline_processor.js')
  const isProd = !!options.prod;
  
  const express = (await import('express')).default;
  const { WebSocketServer } = await import('ws');
  
  const app = express();
  let currentHtml = "";
  let renderCount = 0;

  const render = async () => {
    const configPath = join(projectPath, CONFIG_FILENAME);
    let config;
    try {
      config = JSON.parse(readFileSync(configPath, 'utf-8'));
    } catch(e) {
      console.error(chalk.red('  [Preview] Failed to read config:'), e.message);
      return;
    }
    
    const fileMap = {};
    for (const editor of config.editors) {
      const filePath = join(projectPath, editor.filename);
      if (existsSync(filePath)) fileMap[editor.filename] = readFileSync(filePath, 'utf-8');
    }

    const { html } = await executeSequentialRender(fileMap, config, { dev: !isProd, standalone: true });
    
    currentHtml = html;
    
    if (!isProd) {
      const lrScript = `<script>
(function() {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = protocol + '//' + location.host + '/livereload';
  function connect() {
    const ws = new WebSocket(wsUrl);
    ws.onmessage = (e) => { if (e.data === 'reload') location.reload(); };
    ws.onclose = () => setTimeout(connect, 1000);
  }
  connect();
})();
</script>`;
      if (currentHtml.includes('</body>')) {
        currentHtml = currentHtml.replace('</body>', lrScript + '</body>');
      } else {
        currentHtml += lrScript;
      }
    }
    
    renderCount++;
  };

  await render();

  app.get('/', (req, res) => {
    res.type('html').send(currentHtml);
  });

  const host = options.host || '127.0.0.1';
  const preferredPort = options.port ? parseInt(options.port) : 3002;
  const portToListen = await findAvailablePort(preferredPort, host);
  
  return new Promise((resolve) => {
    const server = app.listen(portToListen, host, async () => {
      const port = server.address().port;
      
      if (!isProd) {
        const chokidar = (await import('chokidar')).default;
        const wss = new WebSocketServer({ server, path: '/livereload' });
        
        const projectFiles = [];
        try {
          const config = JSON.parse(readFileSync(join(projectPath, CONFIG_FILENAME), 'utf-8'));
          for (const editor of config.editors) {
            projectFiles.push(join(projectPath, editor.filename));
          }
          projectFiles.push(join(projectPath, CONFIG_FILENAME));
        } catch(e) {}
        
        const watcher = chokidar.watch(projectFiles, {
          persistent: true,
          ignoreInitial: true,
          awaitWriteFinish: { stabilityThreshold: 100, pollInterval: 50 },
        });
        
        let debounceTimer = null;
        
        watcher.on('all', (event, filePath) => {
          const rel = relative(projectPath, filePath);
          console.log(chalk.dim(`  [livereload] ${event}: ${rel}`));
          
          if (debounceTimer) clearTimeout(debounceTimer);
          debounceTimer = setTimeout(async () => {
            try {
              await render();
              let notified = 0;
              wss.clients.forEach(c => {
                if (c.readyState === 1) {
                  c.send('reload');
                  notified++;
                }
              });
              console.log(chalk.green(`  [livereload] Recompiled (#${renderCount}), notified ${notified} client(s)`));
            } catch(e) {
              console.error(chalk.red(`  [livereload] Error recompiling:`), e.message);
            }
          }, 150);
        });
        
        wss.on('connection', () => {
          console.log(chalk.dim('  [livereload] Client connected'));
        });
      }
      
      resolve({ port, host, server });
    });
  });
}

export async function productionPreviewFlow(projectPath, options = {}) {
  const open = (await import('open')).default;

  console.log(`\n${chalk.bold("Starting preview...")}\n`)
  const { port, host } = await startPreviewServer(projectPath, { 
    prod: options.prod, 
    port: options.port, 
    host: options.host || 'localhost' 
  });
  
  console.log(`  http://${host}:${port}\n`)
  open(`http://${host}:${port}`)

  console.log('  Press Ctrl+C to stop.\n')
}

export async function buildFlow(projectPath, outputFile, options = {}) {
  const { executeSequentialRender } = await import('../core/pipeline_processor.js')
  const configPath = join(projectPath, CONFIG_FILENAME)
  const config = JSON.parse(readFileSync(configPath, 'utf-8'))

  const fileMap = {}
  for (const editor of config.editors) {
    const filePath = join(projectPath, editor.filename)
    if (existsSync(filePath)) fileMap[editor.filename] = readFileSync(filePath, 'utf-8')
  }

  const { html: htmlBlob } = await executeSequentialRender(fileMap, config, { dev: !!options.dev, standalone: true })

  if (outputFile) {
    writeFileSync(join(projectPath, outputFile), htmlBlob)
    console.log(chalk.green(`  Built to ${outputFile}${options.dev ? ' (Development Mode)' : ''}`))
  } else {
    process.stdout.write(htmlBlob)
  }
}
