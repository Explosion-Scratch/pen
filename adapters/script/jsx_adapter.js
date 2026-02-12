import { JavaScriptAdapter } from './javascript_adapter.js'
import { loadAndRenderTemplate } from '../../core/template_engine.js'
import { importModule } from '../import_module.js'
import { CompileError } from '../../core/errors.js'

/**
 * @returns {Promise<object>}
 */
async function getBabel() {
  return importModule('@babel/standalone', { windowGlobal: 'Babel' })
}

/**
 * @param {object} Babel
 * @param {string} code
 * @param {object} [options]
 * @param {string} [options.pragma]
 * @param {string} [options.pragmaFrag]
 * @param {string} [options.runtime]
 * @returns {string}
 */
function transpileJsx(Babel, code, options = {}) {
  const {
    pragma = 'React.createElement',
    pragmaFrag = 'React.Fragment',
    runtime = 'classic'
  } = options

  const presets = []

  if (runtime === 'automatic') {
    presets.push(['react', { runtime: 'automatic' }])
  } else {
    presets.push(['react', { pragma, pragmaFrag, runtime: 'classic' }])
  }

  const plugins = [
    ['proposal-decorators', { legacy: true }],
    ['proposal-class-properties', { loose: true }],
    ['proposal-private-methods', { loose: true }],
    ['proposal-private-property-in-object', { loose: true }],
    'proposal-object-rest-spread'
  ]

  const result = Babel.transform(code, {
    presets,
    plugins,
    filename: 'script.jsx',
    sourceType: 'module'
  })

  return result.code
}

export class JSXAdapter extends JavaScriptAdapter {
  static type = 'script'
  static id = 'jsx'
  static name = 'JSX'
  static description = 'JavaScript with JSX syntax'
  static extends = 'javascript'
  static fileExtension = '.jsx'
  static mimeType = 'text/javascript'
  static compileTargets = ['javascript']
  static canMinify = true

  static getCdnResources(settings = {}) {
    return { scripts: [], styles: [] }
  }

  static async getDefaultTemplate(variables = {}) {
    const template = await loadAndRenderTemplate('jsx', variables)
    if (template) return template

    return `import React from 'react'
import { createRoot } from 'react-dom/client'

function App() {
  const [count, setCount] = React.useState(0)

  return (
    <div className="container">
      <h1>${variables.projectName || 'Pen'}</h1>
      <p>Count: {count}</p>
      <button onClick={() => setCount(c => c + 1)}>Increment</button>
    </div>
  )
}

const root = createRoot(document.getElementById('root'))
root.render(<App />)`
  }

  static getDefaultSettings() {
    return {
      ...JavaScriptAdapter.getDefaultSettings(),
      pragma: 'React.createElement',
      pragmaFrag: 'React.Fragment',
      jsxRuntime: 'classic'
    }
  }

  initialize(codemirrorInstance, fullConfig) {
    const parentInit = super.initialize(codemirrorInstance, fullConfig)
    return {
      ...parentInit,
      syntax: 'jsx',
      actions: {
        ...parentInit.actions,
        beautify: (code) => this.beautify(code),
        compile: (target) => (target === 'javascript' ? this.compileToJs.bind(this) : null)
      }
    }
  }

  async beautify(code) {
    return await super.beautify(code, 'babel')
  }

  /**
   * @param {string} jsxCode
   * @returns {Promise<string>}
   */
  async compileToJs(jsxCode) {
    try {
      const Babel = await getBabel()
      return transpileJsx(Babel, jsxCode, {
        pragma: this.settings.pragma,
        pragmaFrag: this.settings.pragmaFrag,
        runtime: this.settings.jsxRuntime
      })
    } catch (err) {
      // Babel error usually has loc: { line, column } or line, column directly
      // Message often contains code frame, which we don't want in the main message property if possible
      // But for now, let's keep it simple and just rely on the UI to truncate/format it
      let message = err.message
      if (message.includes('\n')) {
          message = message.split('\n')[0]
      }
      
      // Remove file path from message if present (e.g. "/script.jsx: ")
      message = message.replace(/^\/.*?\: /, '')

      throw new CompileError(message, {
          adapterId: this.constructor.id,
          filename: 'script.jsx', 
          line: err.loc ? err.loc.line : err.line,
          column: err.loc ? err.loc.column : err.column,
          originalError: err
      })
    }
  }

  async render(content, fileMap) {
    try {
      const Babel = await getBabel()
      const js = transpileJsx(Babel, content, {
        pragma: this.settings.pragma,
        pragmaFrag: this.settings.pragmaFrag,
        runtime: this.settings.jsxRuntime
      })
      return {
        ...fileMap,
        js
      }
    } catch (err) {
       let message = err.message
       if (message.includes('\n')) {
           message = message.split('\n')[0]
       }
       message = message.replace(/^\/.*?\: /, '')

       throw new CompileError(message, {
          adapterId: this.constructor.id,
          filename: Object.keys(fileMap).find(k => fileMap[k] === content) || 'script.jsx',
          line: err.loc ? err.loc.line : err.line,
          column: err.loc ? err.loc.column : err.column,
          originalError: err
      })
    }
  }

  static getSchema() {
    return {
      ...super.getSchema(),
      pragma: {
        type: 'string',
        name: 'JSX Pragma',
        description: 'Function to use for JSX element creation',
        default: 'React.createElement'
      },
      pragmaFrag: {
        type: 'string',
        name: 'Fragment Pragma',
        description: 'Component to use for JSX fragments',
        default: 'React.Fragment'
      },
      jsxRuntime: {
        type: 'select',
        name: 'JSX Runtime',
        description: 'JSX transform runtime mode',
        default: 'classic',
        options: ['classic', 'automatic']
      }
    }
  }
}
