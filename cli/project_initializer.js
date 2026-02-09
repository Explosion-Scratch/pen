import { input, select, checkbox, confirm } from '@inquirer/prompts'
import { writeFileSync, readFileSync, existsSync } from 'fs'
import { join, basename } from 'path'
import { getAdapter, getAdaptersByCategory, getAllAdapters } from '../core/adapter_registry.js'
import { launchEditorFlow } from './server.js'

const CONFIG_FILENAME = '.pen.config.json'

export async function initializeNewProjectFlow(projectPath) {
  console.log('\n✨ Creating a new Pen project...\n')

  const projectName = await input({
    message: 'Project name',
    default: basename(projectPath) || 'my-pen-project',
    validate: (v) => v.length > 0 || 'Project name is required'
  })

  const markupAdapters = getAdaptersByCategory('markup')
  const markupChoice = await select({
    message: 'Choose your primary markup',
    choices: markupAdapters.map(a => ({
      name: `${a.name} - ${a.description}`,
      value: a.id
    }))
  })

  const styleAdapters = getAdaptersByCategory('style')
  const styleChoice = await select({
    message: 'Choose your styling tool',
    choices: styleAdapters.map(a => ({
      name: `${a.name} - ${a.description}`,
      value: a.id
    }))
  })

  const scriptAdapters = getAdaptersByCategory('script')
  const scriptChoice = await select({
    message: 'Choose your scripting tool',
    choices: scriptAdapters.map(a => ({
      name: `${a.name} - ${a.description}`,
      value: a.id
    }))
  })

  const markupAdapter = getAdapter(markupChoice)
  const styleAdapter = getAdapter(styleChoice)
  const scriptAdapter = getAdapter(scriptChoice)

  const config = {
    name: projectName,
    version: '1.0.0',
    editors: [
      {
        type: markupChoice,
        filename: `index${markupAdapter.fileExtension}`,
        settings: markupAdapter.getDefaultSettings ? markupAdapter.getDefaultSettings() : {}
      },
      {
        type: styleChoice,
        filename: `style${styleAdapter.fileExtension}`,
        settings: styleAdapter.getDefaultSettings ? styleAdapter.getDefaultSettings() : {}
      },
      {
        type: scriptChoice,
        filename: `script${scriptAdapter.fileExtension}`,
        settings: scriptAdapter.getDefaultSettings ? scriptAdapter.getDefaultSettings() : {}
      }
    ],
    globalResources: {
      scripts: [],
      styles: []
    }
  }

  writeFileSync(join(projectPath, CONFIG_FILENAME), JSON.stringify(config, null, 2))

  for (const editor of config.editors) {
    const adapter = getAdapter(editor.type)
    const template = adapter.getDefaultTemplate({ projectName })
    writeFileSync(join(projectPath, editor.filename), template)
  }

  console.log('\n✅ Project created successfully!\n')
  console.log(`   📁 ${projectName}`)
  config.editors.forEach(e => console.log(`   📄 ${e.filename}`))
  console.log('')

  const launchNow = await confirm({
    message: 'Launch the editor now?',
    default: true
  })

  if (launchNow) {
    await launchEditorFlow(projectPath)
  }
}

export async function interactiveConfigurationFlow(projectPath) {
  const configPath = join(projectPath, CONFIG_FILENAME)
  const config = JSON.parse(readFileSync(configPath, 'utf-8'))

  console.log('\n⚙️  Configuring Pen project...\n')
  console.log(`Project: ${config.name}`)
  console.log('Current editors:')
  config.editors.forEach((e, i) => {
    const adapter = getAdapter(e.type)
    console.log(`  ${i + 1}. ${adapter.name} (${e.filename})`)
  })
  console.log('')

  const action = await select({
    message: 'What would you like to do?',
    choices: [
      { name: 'Add a new editor', value: 'add' },
      { name: 'Remove an editor', value: 'remove' },
      { name: 'Change filenames', value: 'rename' },
      { name: 'Toggle Normalize.css', value: 'normalize' },
      { name: 'Manage global CDN links', value: 'cdn' },
      { name: 'Save and exit', value: 'exit' }
    ]
  })

  switch (action) {
    case 'add':
      await addEditor(config, projectPath)
      break
    case 'remove':
      await removeEditor(config)
      break
    case 'rename':
      await renameEditor(config)
      break
    case 'normalize':
      await toggleNormalize(config)
      break
    case 'cdn':
      await manageCdn(config)
      break
  }

  writeFileSync(configPath, JSON.stringify(config, null, 2))
  console.log('\n✅ Configuration saved!\n')

  if (action !== 'exit') {
    await interactiveConfigurationFlow(projectPath)
  }
}

async function addEditor(config, projectPath) {
  const usedTypes = config.editors.map(e => e.type)
  const allAdapters = getAllAdapters()
  const available = allAdapters.filter(a => !usedTypes.includes(a.id))

  if (available.length === 0) {
    console.log('All editor types are already in use.')
    return
  }

  const typeChoice = await select({
    message: 'Select editor type to add',
    choices: available.map(a => ({
      name: `${a.name} (${a.type}) - ${a.description}`,
      value: a.id
    }))
  })

  const adapter = getAdapter(typeChoice)
  const filename = await input({
    message: 'Filename',
    default: `new${adapter.fileExtension}`
  })

  config.editors.push({
    type: typeChoice,
    filename,
    settings: adapter.getDefaultSettings ? adapter.getDefaultSettings() : {}
  })

  const template = adapter.getDefaultTemplate({ projectName: config.name })
  writeFileSync(join(projectPath, filename), template)
}

async function removeEditor(config) {
  if (config.editors.length <= 1) {
    console.log('Cannot remove the last editor.')
    return
  }

  const choices = config.editors.map((e, i) => {
    const adapter = getAdapter(e.type)
    return { name: `${adapter.name} (${e.filename})`, value: i }
  })

  const index = await select({
    message: 'Select editor to remove',
    choices
  })

  config.editors.splice(index, 1)
}

async function renameEditor(config) {
  const choices = config.editors.map((e, i) => {
    const adapter = getAdapter(e.type)
    return { name: `${adapter.name} (${e.filename})`, value: i }
  })

  const index = await select({
    message: 'Select editor to rename',
    choices
  })

  const newName = await input({
    message: 'New filename',
    default: config.editors[index].filename
  })

  config.editors[index].filename = newName
}

async function toggleNormalize(config) {
  const styleEditor = config.editors.find(e => {
    const adapter = getAdapter(e.type)
    return adapter.type === 'style'
  })

  if (!styleEditor) {
    console.log('No style editor found.')
    return
  }

  styleEditor.settings = styleEditor.settings || {}
  styleEditor.settings.normalize = !styleEditor.settings.normalize
  console.log(`Normalize.css is now ${styleEditor.settings.normalize ? 'enabled' : 'disabled'}`)
}

async function manageCdn(config) {
  const resourceType = await select({
    message: 'Resource type',
    choices: [
      { name: 'Scripts (JS)', value: 'scripts' },
      { name: 'Styles (CSS)', value: 'styles' }
    ]
  })

  const current = config.globalResources[resourceType]
  console.log(`Current ${resourceType}:`)
  if (current.length === 0) {
    console.log('  (none)')
  } else {
    current.forEach((url, i) => console.log(`  ${i + 1}. ${url}`))
  }

  const action = await select({
    message: 'Action',
    choices: [
      { name: 'Add URL', value: 'add' },
      { name: 'Remove URL', value: 'remove' },
      { name: 'Back', value: 'back' }
    ]
  })

  if (action === 'add') {
    const url = await input({ message: 'CDN URL' })
    config.globalResources[resourceType].push(url)
  } else if (action === 'remove' && current.length > 0) {
    const index = await select({
      message: 'Select URL to remove',
      choices: current.map((url, i) => ({ name: url, value: i }))
    })
    config.globalResources[resourceType].splice(index, 1)
  }
}

export async function productionPreviewFlow(projectPath) {
  const { executeSequentialRender } = await import('../core/pipeline_processor.js')
  const configPath = join(projectPath, CONFIG_FILENAME)
  const config = JSON.parse(readFileSync(configPath, 'utf-8'))

  const fileMap = {}
  for (const editor of config.editors) {
    const filePath = join(projectPath, editor.filename)
    if (existsSync(filePath)) {
      fileMap[editor.filename] = readFileSync(filePath, 'utf-8')
    }
  }

  console.log('\n🔨 Building production preview...\n')

  const htmlBlob = await executeSequentialRender(fileMap, config)
  const tempPath = join(projectPath, '.pen-preview.html')
  writeFileSync(tempPath, htmlBlob)

  const express = (await import('express')).default
  const open = (await import('open')).default
  const app = express()

  app.get('/', (req, res) => {
    res.send(htmlBlob)
  })

  const server = app.listen(0, () => {
    const port = server.address().port
    console.log(`🌐 Preview running at http://localhost:${port}`)
    open(`http://localhost:${port}`)
  })

  console.log('\nPress Ctrl+C to stop the server.\n')
}
