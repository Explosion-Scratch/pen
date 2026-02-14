import { BaseAdapter } from '../base_adapter.js'
import { loadAndRenderTemplate } from '../../core/template_engine.js'
import { CompileError } from '../../core/errors.js'
const isBrowser = typeof window !== 'undefined'

let terserModule = null
async function getTerser() {
  if (isBrowser) {
    if (!window.Terser) {
      throw new Error('Terser not found on window object. Ensure CDN script is loaded.')
    }
    return window.Terser
  }

  if (!terserModule) {
    terserModule = await import('terser')
  }
  return terserModule
}

export class JavaScriptAdapter extends BaseAdapter {
  static type = 'script'
  static id = 'javascript'
  static name = 'JavaScript'
  static description = 'ECMAScript / JavaScript'
  static extends = null
  static fileExtension = '.js'
  static mimeType = 'text/javascript'
  static canMinify = true

  static getCdnResources(settings = {}) {
    return { scripts: [], styles: [] }
  }

  static async getDefaultTemplate(variables = {}) {
    const template = await loadAndRenderTemplate('javascript', variables)
    if (template) return template

    return `/**
 * ${variables.projectName || 'Pen'} Script
 */

document.addEventListener('DOMContentLoaded', () => {
  console.log('${variables.projectName || 'Pen'} is ready!')

  const container = document.querySelector('.container')
  if (container) {
    container.addEventListener('click', () => {
      console.log('Container clicked!')
    })
  }
})`
  }

  static getDefaultSettings() {
    return {
      moduleType: 'module',
      strictMode: true,
      injectTo: 'body',
      injectPosition: 'beforeend',
      priority: 30
    }
  }

  initialize(codemirrorInstance, fullConfig) {
    return {
      syntax: 'javascript',
      theme: 'pen-light',
      extensions: [],
      actions: {
        beautify: (code) => this.beautify(code),
        minify: (code) => this.minify(code),
        compile: null,
        destroy: null
      }
    }
  }

  async beautify(code, filename = null) {
    return await super.beautify(code, 'babel', filename)
  }

  async minify(code) {
    try {
      const { minify } = await getTerser()
      const result = await minify(code)
      return result.code || code
    } catch (err) {
      console.error('Minification error:', err)
      return code
    }
  }

  async render(content, fileMap) {
    let js = content
    try {
       const terser = await getTerser()
       if (terser) {
           await terser.minify(js, { parse: {}, compress: false, mangle: false, output: { code: false } })
       }

    } catch (err) {
        throw new CompileError(err.message, {
            adapterId: this.constructor.id,
            filename: Object.keys(fileMap).find(k => fileMap[k] === content) || 'script.js', 
            line: err.line,
            column: err.col,
            originalError: err
        })
    }

    if (this.settings.strictMode && !js.includes("'use strict'") && !js.includes('"use strict"')) {
    }
    return {
      ...fileMap,
      js
    }
  }

  static getSchema() {
    return {
      moduleType: {
        type: 'select',
        name: 'Module Type',
        description: 'JavaScript module system to use',
        default: 'module',
        options: [
          { label: 'Module', value: 'module' },
          { label: 'Classic', value: 'classic' }
        ]
      },
      strictMode: {
        type: 'boolean',
        name: 'Strict Mode',
        description: 'Enable JavaScript strict mode',
        default: true
      },
      ...super.getSchema()
    }
  }
}
