import { JavaScriptAdapter } from './javascript_adapter.js'
import { loadAndRenderTemplate } from '../../core/template_engine.js'
import ts from 'typescript'

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

  compileToJs(tsCode) {
    try {
      const result = ts.transpileModule(tsCode, {
        compilerOptions: {
          target: this.getTargetEnum(),
          module: ts.ModuleKind.ESNext,
          strict: this.settings.strict,
          esModuleInterop: true,
          skipLibCheck: true,
          sourceMap: true,
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

  getTargetEnum() {
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
      const result = ts.transpileModule(content, {
        compilerOptions: {
          target: this.getTargetEnum(),
          module: ts.ModuleKind.ESNext,
          strict: this.settings.strict,
          esModuleInterop: true,
          skipLibCheck: true,
          sourceMap: true,
          inlineSourceMap: true,
          inlineSources: true
        }
      })
      return {
        ...fileMap,
        js: result.outputText
      }
    } catch (err) {
      return {
        ...fileMap,
        js: `/* TypeScript Error: ${err.message} */\nconsole.error('TypeScript compilation failed');`
      }
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
