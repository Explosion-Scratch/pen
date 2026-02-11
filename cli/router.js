import { existsSync } from 'fs'
import { join } from 'path'
import { initializeNewProjectFlow, interactiveConfigurationFlow, productionPreviewFlow } from './project_initializer.js'
import { launchEditorFlow } from './server.js'
import { loadAllProjectTemplates } from '../core/project_templates.js'

const CONFIG_FILENAME = '.pen.config.json'

const LOGO = `
  ╭──────────────────────────────────╮
  │       ✒  \x1b[1mPen\x1b[0m  Editor              │
  │   Local CodePen-style editor     │
  ╰──────────────────────────────────╯`

export async function handleCliInput(args) {
  const flags = args.filter(a => a.startsWith('--'))
  const cleanArgs = args.filter(a => !a.startsWith('--'))
  
  const command = cleanArgs[0]
  const cwd = process.cwd()
  const configPath = join(cwd, CONFIG_FILENAME)
  const hasConfig = existsSync(configPath)

  const options = {
    headless: flags.includes('--headless') || flags.includes('-h') && command !== 'help' // Basic check
  }

  // Proper flag handling for common ones
  if (args.includes('--headless')) options.headless = true

  switch (command) {
    case 'init':
    case 'new':
      await initializeNewProjectFlow(cwd)
      break

    case 'configure':
    case 'config':
      if (!hasConfig) {
        printNoProject()
        process.exit(1)
      }
      await interactiveConfigurationFlow(cwd)
      break

    case 'serve':
    case 'build':
      if (!hasConfig) {
        printNoProject()
        process.exit(1)
      }
      await productionPreviewFlow(cwd)
      break

    case 'templates':
    case 'list-templates':
      printTemplateList()
      break

    case 'help':
    case '--help':
    case '-h':
      if (args[0] === 'help' || args[0] === '--help' || (args[0] === '-h' && !hasConfig)) {
        printHelp()
        break
      }
      // fall through if it might be -h for headless in a project
      if (hasConfig) {
        await launchEditorFlow(cwd, options)
      } else {
        printHelp()
      }
      break

    case '--version':
    case '-v':
      console.log('pen v1.0.0')
      break

    default:
      if (hasConfig) {
        await launchEditorFlow(cwd, options)
      } else {
        await initializeNewProjectFlow(cwd)
      }
  }
}

function printNoProject() {
  console.log('\n\x1b[33m⚠\x1b[0m  No Pen project found in current directory.')
  console.log('   Run \x1b[1mpen init\x1b[0m to create one.\n')
}

function printTemplateList() {
  const templates = loadAllProjectTemplates()
  console.log(LOGO)
  console.log('\n  \x1b[1mAvailable Templates\x1b[0m\n')

  if (templates.length === 0) {
    console.log('  (no templates found)\n')
    return
  }

  for (const t of templates) {
    const editors = t.config.editors.map(e => e.type).join(', ')
    console.log(`  \x1b[36m${t.title.padEnd(20)}\x1b[0m ${t.description}`)
    console.log(`  ${''.padEnd(20)} \x1b[2m${editors}\x1b[0m\n`)
  }
}

function printHelp() {
  console.log(`${LOGO}

  \x1b[1mUsage:\x1b[0m pen [command] [options]

  \x1b[1mCommands:\x1b[0m

    \x1b[36m(none)\x1b[0m              Launch editor, or create project if none exists
    \x1b[36minit\x1b[0m / \x1b[36mnew\x1b[0m          Create a new Pen project (with template picker)
    \x1b[36mconfigure\x1b[0m / \x1b[36mconfig\x1b[0m  Interactively edit editors, settings, CDN links
    \x1b[36mserve\x1b[0m / \x1b[36mbuild\x1b[0m       Build and serve a production preview
    \x1b[36mtemplates\x1b[0m            List available project templates

  \x1b[1mOptions:\x1b[0m

    \x1b[36m-h\x1b[0m, \x1b[36m--help\x1b[0m          Show this help message
    \x1b[36m-v\x1b[0m, \x1b[36m--version\x1b[0m       Show version number

  \x1b[1mExamples:\x1b[0m

    pen                    Launch or initialize
    pen init               Create from template
    pen config             Modify project settings
    pen serve              Preview the production build
    pen templates          See all starter templates
`)
}
