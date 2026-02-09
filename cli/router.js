import { existsSync } from 'fs'
import { join } from 'path'
import { initializeNewProjectFlow, interactiveConfigurationFlow, productionPreviewFlow } from './project_initializer.js'
import { launchEditorFlow } from './server.js'

const CONFIG_FILENAME = '.pen.config.json'

export async function handleCliInput(args) {
  const command = args[0]
  const cwd = process.cwd()
  const configPath = join(cwd, CONFIG_FILENAME)
  const hasConfig = existsSync(configPath)

  switch (command) {
    case 'configure':
      if (!hasConfig) {
        console.log('No Pen project found in current directory.')
        console.log('Run `pen` to create a new project first.')
        process.exit(1)
      }
      await interactiveConfigurationFlow(cwd)
      break

    case 'serve':
      if (!hasConfig) {
        console.log('No Pen project found in current directory.')
        console.log('Run `pen` to create a new project first.')
        process.exit(1)
      }
      await productionPreviewFlow(cwd)
      break

    case 'help':
    case '--help':
    case '-h':
      printHelp()
      break

    default:
      if (hasConfig) {
        await launchEditorFlow(cwd)
      } else {
        await initializeNewProjectFlow(cwd)
      }
  }
}

function printHelp() {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                           PEN                                 ║
║         A CodePen-like Editor for Local Development           ║
╚═══════════════════════════════════════════════════════════════╝

Usage: pen [command]

Commands:
  (none)      Create a new project or launch editor for existing one
  configure   Interactively configure editors and settings
  serve       Build and serve production preview

Examples:
  pen                    # Initialize or launch editor
  pen configure          # Modify project settings
  pen serve              # Preview production build

`)
}
