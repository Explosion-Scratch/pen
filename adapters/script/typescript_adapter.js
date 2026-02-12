import { JavaScriptAdapter } from './javascript_adapter.js'
import { loadAndRenderTemplate } from '../../core/template_engine.js'
import { importModule } from '../import_module.js'
import { CompileError } from '../../core/errors.js'

/**
 * @returns {Promise<object>}
 */
async function getTs() {
  return importModule('typescript', { windowGlobal: 'ts' })
}


export class TypeScriptAdapter extends JavaScriptAdapter {
  static type = 'script'
  static id = 'typescript'
  static name = 'TypeScript'
  static description = 'Typed JavaScript'
  static extends = 'javascript'
  static fileExtension = '.ts'
  static mimeType = 'text/typescript'
  static compileTargets = ['javascript']
  static canMinify = true

  static getCdnResources(settings = {}) {
    return { scripts: [], styles: [] }
  }

  static async getDefaultTemplate(variables = {}) {
    const template = await loadAndRenderTemplate('typescript', variables)
    if (template) return template

    return `/**
 * ${variables.projectName || 'Pen'} Script
 */

interface AppConfig {
  name: string
  version: string
}

const config: AppConfig = {
  name: '${variables.projectName || 'Pen'}',
  version: '1.0.0'
}

document.addEventListener('DOMContentLoaded', (): void => {
  console.log(\`\${config.name} v\${config.version} is ready!\`)

  const container = document.querySelector('.container')
  if (container) {
    container.addEventListener('click', (event: Event): void => {
      console.log('Container clicked!', event)
    })
  }
})`
  }

  static getDefaultSettings() {
    return {
      ...JavaScriptAdapter.getDefaultSettings(),
      target: 'ES2022',
      strict: true
    }
  }

  initialize(codemirrorInstance, fullConfig) {
    const parentInit = super.initialize(codemirrorInstance, fullConfig)
    return {
      ...parentInit,
      syntax: 'typescript',
      actions: {
        ...parentInit.actions,
        compile: (target) => (target === 'javascript' ? this.compileToJs.bind(this) : null)
      }
    }
  }

  async beautify(code) {
    return await super.beautify(code, 'typescript')
  }

  async compileToJs(tsCode) {
    try {
      const ts = await getTs()
      const result = ts.transpileModule(tsCode, {
        compilerOptions: {
          target: this.getTargetEnum(ts),
          module: ts.ModuleKind.ESNext,
          strict: this.settings.strict,
          esModuleInterop: true,
          skipLibCheck: true,
          sourceMap: false,
          inlineSourceMap: true,
          inlineSources: true
        }
      })
      return result.outputText
    } catch (err) {
      console.error('TypeScript compilation error:', err)
      return `/* TypeScript Error: ${err.message} */`
    }
  }

  getTargetEnum(ts) {
    const targetMap = {
      'ES2020': ts.ScriptTarget.ES2020,
      'ES2021': ts.ScriptTarget.ES2021,
      'ES2022': ts.ScriptTarget.ES2022,
      'ESNext': ts.ScriptTarget.ESNext
    }
    return targetMap[this.settings.target] || ts.ScriptTarget.ES2022
  }

  async render(content, fileMap) {
    try {
      const ts = await getTs()
      const result = ts.transpileModule(content, {
        compilerOptions: {
          target: this.getTargetEnum(ts),
          module: ts.ModuleKind.ESNext,
          strict: this.settings.strict,
          esModuleInterop: true,
          skipLibCheck: true,
          sourceMap: false,
          inlineSourceMap: true,
          inlineSources: true
        },
        reportDiagnostics: true
      })
      
      if (result.diagnostics && result.diagnostics.length > 0) {
          const firstDiag = result.diagnostics[0]
          const message = typeof firstDiag.messageText === 'string' ? firstDiag.messageText : firstDiag.messageText.messageText
          let line = undefined
          let column = undefined
          
          if (firstDiag.file && firstDiag.start !== undefined) {
              const { line: l, character } = firstDiag.file.getLineAndCharacterOfPosition(firstDiag.start)
              line = l + 1
              column = character + 1
          }

          throw new CompileError(message, {
            adapterId: this.constructor.id,
            filename: Object.keys(fileMap).find(k => fileMap[k] === content) || 'script.ts',
            line,
            column
          })
      }

      return {
        ...fileMap,
        js: result.outputText
      }
    } catch (err) {
      let line = undefined
      let column = undefined
      let message = err.message || String(err)
      
      if (err.diagnostics && err.diagnostics.length > 0) {
          const firstDiag = err.diagnostics[0]
          message = typeof firstDiag.messageText === 'string' ? firstDiag.messageText : firstDiag.messageText.messageText
          
          if (firstDiag.file && firstDiag.start !== undefined) {
              const { line: l, character } = firstDiag.file.getLineAndCharacterOfPosition(firstDiag.start)
              line = l + 1
              column = character + 1
          }
      }
      
      throw new CompileError(message, {
          adapterId: this.constructor.id,
          filename: Object.keys(fileMap).find(k => fileMap[k] === content) || 'script.ts',
          line,
          column,
          originalError: err
      })
    }
  }

  static getSchema() {
    return {
      ...super.getSchema(),
      target: {
        type: 'select',
        name: 'Target',
        description: 'ECMAScript target version',
        default: 'ES2022',
        options: ['ES2020', 'ES2021', 'ES2022', 'ESNext']
      },
      strict: {
        type: 'boolean',
        name: 'Strict Mode',
        description: 'Enable TypeScript strict mode',
        default: true
      }
    }
  }
}
