import { JavaScriptAdapter } from './javascript_adapter.js'
import { loadAndRenderTemplate } from '../../core/template_engine.js'
import { importModule } from '../import_module.js'
import { CompileError } from '../../core/errors.js'

/**
 * @returns {Promise<object>}
 */
async function getBabel() {
  const Babel = await importModule('@babel/standalone', { windowGlobal: 'Babel' })
  
  if (!Babel.availablePresets['solid']) {
    try {
      const solidPreset = await importModule('babel-preset-solid', { 
        cdnUrl: 'https://esm.sh/babel-preset-solid',
        windowGlobal: 'babelPresetSolid'
      })
      if (solidPreset) {
        Babel.registerPreset('solid', solidPreset.default || solidPreset)
      }
    } catch (e) {
      console.error('JSXAdapter: Failed to load Solid Babel preset', e)
    }
  }

  return Babel
}

/**
 * @param {object} Babel
 * @param {string} code
 * @param {object} [options]
 * @param {string} [options.pragma]
 * @param {string} [options.pragmaFrag]
 * @param {string} [options.runtime]
 * @param {string} [options.compiler]
 * @returns {Promise<string>}
 */
async function transpileJsx(Babel, code, options = {}) {
  const {
    pragma = 'React.createElement',
    pragmaFrag = 'React.Fragment',
    runtime = 'classic',
    compiler = 'react'
  } = options

  const presets = []
  const plugins = [
    ['proposal-decorators', { legacy: true }],
    ['proposal-class-properties', { loose: true }],
    ['proposal-private-methods', { loose: true }],
    ['proposal-private-property-in-object', { loose: true }],
    'proposal-object-rest-spread'
  ]

  if (compiler === 'solid') {
    if (Babel.availablePresets['solid']) {
      presets.push('solid')
    } else {
      // Fallback if not registered, try to use it as a plugin if we have it
      if (Babel.availablePlugins['solid']) {
        plugins.push(['solid', { generate: 'dom', hydratable: false }])
        // We still need JSX syntax
        presets.push(['react', { runtime: 'classic', pragma: 'h' }])
      }
    }
  } else if (runtime === 'automatic') {
    presets.push(['react', { runtime: 'automatic' }])
  } else {
    presets.push(['react', { 
      pragma, 
      pragmaFrag, 
      runtime: 'classic',
      throwIfNamespace: false
    }])
  }

  const result = Babel.transform(code, {
    presets,
    plugins,
    filename: options.filename || 'script.jsx',
    sourceType: 'module',
    sourceMaps: 'inline'
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
  static compileTargets = ['JavaScript']
  static canMinify = true

  static getCdnResources(settings = {}) {
    return { scripts: [], styles: [] }
  }

  static async getDefaultTemplate(variables = {}) {
    const compiler = variables.compiler || 'react'
    const templateId = `jsx_${compiler}`
    
    // Attempt to load compiler-specific template first
    let template = await loadAndRenderTemplate(templateId, variables)
    if (template) return template
    
    // Fallback to generic jsx template
    template = await loadAndRenderTemplate('jsx', variables)
    if (template) return template

    // Absolute fallback (rarely hit now)
    return `import React from 'react'\nexport default () => <div>Hello World</div>`
  }

  static getDefaultSettings() {
    return {
      ...JavaScriptAdapter.getDefaultSettings(),
      compiler: 'react'
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
        compile: (target) => (target === 'JavaScript' || target === 'javascript' ? this.compileToJavaScript.bind(this) : null)
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
  async compileToJavaScript(jsxCode) {
    try {
      const Babel = await getBabel()
      return await transpileJsx(Babel, jsxCode, {
        compiler: this.settings.compiler,
        filename: 'script.jsx'
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
      const filename = Object.keys(fileMap).find(k => fileMap[k] === content) || 'script.jsx'
      const js = await transpileJsx(Babel, content, {
        compiler: this.settings.compiler,
        filename: filename
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
      compiler: {
        type: 'select',
        name: 'JSX Compiler',
        description: 'Underlying framework/compiler for JSX',
        default: 'react',
        options: ['react', 'solid']
      }
    }
  }
}
