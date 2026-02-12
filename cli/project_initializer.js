import { input, select, confirm } from '@inquirer/prompts'
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs'
import { join, basename } from 'path'
import { getAdapter, getAdaptersByCategory, getAllAdapters } from '../core/adapter_registry.js'
import { loadAllProjectTemplates } from '../core/project_templates.js'
import { launchEditorFlow } from './server.js'

const CONFIG_FILENAME = '.pen.config.json'

export async function initializeNewProjectFlow(projectPath) {
  console.log('\n\x1b[1m✨ Create a new Pen project\x1b[0m\n')

  const templates = await loadAllProjectTemplates()
  const choices = [
    ...templates.map(t => ({
      name: `${t.title} — ${t.description}`,
      value: t.id
    })),
    { name: '\x1b[2mCustom... (pick each editor)\x1b[0m', value: '__custom__' }
  ]

  const templateChoice = await select({
    message: 'Start from a template',
    choices
  })

  const projectName = await input({
    message: 'Project name',
    default: 'my-pen-project',
    validate: v => v.length > 0 || 'Required'
  })

  // Create subfolder for project
  const targetDir = join(projectPath, projectName)
  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true })
  }
  
  // Update projectPath to the new subfolder
  projectPath = targetDir

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

  console.log('\n\x1b[32m✅ Project created!\x1b[0m\n')
  console.log(`   📁 ${projectName}`)
  config.editors.forEach(e => console.log(`   📄 ${e.filename}`))
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

  console.log(`\n\x1b[1m⚙️  ${config.name}\x1b[0m\n`)
  config.editors.forEach((e, i) => {
    const A = getAdapter(e.type)
    console.log(`  ${i + 1}. \x1b[36m${A.name}\x1b[0m  ${e.filename}`)
  })
  console.log('')

  const actions = [
    { name: 'Add editor', value: 'add' },
    { name: 'Remove editor', value: 'remove' },
    { name: 'Rename file', value: 'rename' },
    { name: 'Toggle Normalize.css', value: 'normalize' },
    { name: 'Manage CDN links', value: 'cdn' },
    { name: 'Manage import overrides', value: 'overrides' },
    { name: 'Done', value: 'exit' }
  ]

  const action = await select({ message: 'Action', choices: actions })

  if (action === 'add') await addEditor(config, projectPath)
  else if (action === 'remove') await removeEditor(config)
  else if (action === 'rename') await renameEditor(config)
  else if (action === 'normalize') toggleNormalize(config)
  else if (action === 'cdn') await manageCdn(config)
  else if (action === 'overrides') await manageImportOverrides(config)

  writeFileSync(configPath, JSON.stringify(config, null, 2))
  console.log('\n\x1b[32m✅ Saved!\x1b[0m\n')

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

async function removeEditor(config) {
  if (config.editors.length <= 1) { console.log('  Cannot remove last editor.'); return }
  const idx = await select({
    message: 'Remove',
    choices: config.editors.map((e, i) => ({ name: `${getAdapter(e.type).name} (${e.filename})`, value: i }))
  })
  config.editors.splice(idx, 1)
}

async function renameEditor(config) {
  const idx = await select({
    message: 'Rename',
    choices: config.editors.map((e, i) => ({ name: `${getAdapter(e.type).name} (${e.filename})`, value: i }))
  })
  config.editors[idx].filename = await input({ message: 'New filename', default: config.editors[idx].filename })
}

function toggleNormalize(config) {
  const style = config.editors.find(e => getAdapter(e.type).type === 'style')
  if (!style) { console.log('  No style editor.'); return }
  style.settings = style.settings || {}
  style.settings.normalize = !style.settings.normalize
  console.log(`  Normalize.css: ${style.settings.normalize ? 'ON' : 'OFF'}`)
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

  console.log('\n  \x1b[1mImport Overrides\x1b[0m')
  console.log('  Maps bare package names to custom URLs.\n')
  if (entries.length) entries.forEach(([k, v]) => console.log(`  \x1b[36m${k}\x1b[0m → ${v}`))
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

export async function productionPreviewFlow(projectPath) {
  const { executeSequentialRender } = await import('../core/pipeline_processor.js')
  const configPath = join(projectPath, CONFIG_FILENAME)
  const config = JSON.parse(readFileSync(configPath, 'utf-8'))

  const fileMap = {}
  for (const editor of config.editors) {
    const filePath = join(projectPath, editor.filename)
    if (existsSync(filePath)) fileMap[editor.filename] = readFileSync(filePath, 'utf-8')
  }

  console.log('\n\x1b[1m🔨 Building preview...\x1b[0m\n')

  const { html: htmlBlob } = await executeSequentialRender(fileMap, config, { dev: false })
  writeFileSync(join(projectPath, '.pen-preview.html'), htmlBlob)

  const express = (await import('express')).default
  const open = (await import('open')).default
  const app = express()

  app.get('/', (req, res) => res.send(htmlBlob))

  const server = app.listen(0, () => {
    const port = server.address().port
    console.log(`  🌐 http://localhost:${port}\n`)
    open(`http://localhost:${port}`)
  })

  console.log('  Press Ctrl+C to stop.\n')
}

export async function buildFlow(projectPath, outputFile) {
  const { executeSequentialRender } = await import('../core/pipeline_processor.js')
  const configPath = join(projectPath, CONFIG_FILENAME)
  const config = JSON.parse(readFileSync(configPath, 'utf-8'))

  const fileMap = {}
  for (const editor of config.editors) {
    const filePath = join(projectPath, editor.filename)
    if (existsSync(filePath)) fileMap[editor.filename] = readFileSync(filePath, 'utf-8')
  }

  const { html: htmlBlob } = await executeSequentialRender(fileMap, config, { dev: false })

  if (outputFile) {
    writeFileSync(join(projectPath, outputFile), htmlBlob)
  } else {
    process.stdout.write(htmlBlob)
  }
}
