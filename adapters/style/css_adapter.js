import { BaseAdapter } from '../base_adapter.js'
import { loadAndRenderTemplate } from '../../core/template_engine.js'
import { transformCssImports } from '../../core/cdn_transformer.js'

export class CSSAdapter extends BaseAdapter {
  static type = 'style'
  static id = 'css'
  static name = 'CSS'
  static description = 'Cascading Style Sheets'
  static extends = null
  static fileExtension = '.css'
  static mimeType = 'text/css'
  static canMinify = true

  static getCdnResources(settings = {}) {
    const resources = { scripts: [], styles: [] }
    if (settings.normalize) {
      resources.styles.push('https://cdn.skypack.dev/normalize.css')
    }
    if (settings.tailwind) {
      resources.scripts.push('https://cdn.tailwindcss.com')
    }
    return resources
  }

  static async getDefaultTemplate(variables = {}) {
    return await loadAndRenderTemplate('css', variables)
  }

  static getDefaultSettings() {
    return {
      normalize: false,
      autoprefixer: false,
      tailwind: false,
      injectTo: 'head',
      injectPosition: 'beforeend',
      priority: 20
    }
  }

  initialize(codemirrorInstance, fullConfig) {
    return {
      syntax: 'css',
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
    return await super.beautify(code, 'css', filename)
  }

  minify(code) {
    return code
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\s+/g, ' ')
      .replace(/\s*([{}:;])\s*/g, '$1')
      .replace(/;}/g, '}')
      .trim()
  }

  async render(content, fileMap) {
    const css = transformCssImports(content, this.settings.importOverrides || {})
    const styleType = this.settings.tailwind ? 'text/tailwindcss' : 'text/css'
    return { ...fileMap, css, styleType }
  }

  static getSchema() {
    return {
      normalize: {
        type: 'boolean',
        name: 'Include Normalize.css',
        description: 'Include Normalize.css for consistent cross-browser styling',
        default: false
      },
      autoprefixer: {
        type: 'boolean',
        name: 'Auto-prefix CSS',
        description: 'Automatically add vendor prefixes',
        default: false
      },
      tailwind: {
        type: 'boolean',
        name: 'Tailwind CSS',
        description: 'Enable Tailwind CDN processing (supports @layer, @apply, etc.)',
        default: false
      },
      ...super.getSchema()
    }
  }
} 
