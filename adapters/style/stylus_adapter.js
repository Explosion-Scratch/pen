import { CSSAdapter } from './css_adapter.js'
import { loadAndRenderTemplate } from '../../core/template_engine.js'

export class StylusAdapter extends CSSAdapter {
  static type = 'style'
  static id = 'stylus'
  static name = 'Stylus'
  static description = 'Stylus (Disabled in Browser)'
  static extends = 'css'
  static fileExtension = '.styl'
  static mimeType = 'text/x-stylus'
  static compileTargets = ['css']
  static canMinify = false

  static getCdnResources(settings = {}) {
    return CSSAdapter.getCdnResources(settings)
  }

  static async getDefaultTemplate(variables = {}) {
    return '/* Stylus is currently disabled in the browser environment */'
  }

  static getDefaultSettings() {
    return CSSAdapter.getDefaultSettings()
  }

  initialize(codemirrorInstance, fullConfig) {
    const parentInit = super.initialize(codemirrorInstance, fullConfig)
    return {
      ...parentInit,
      syntax: 'css', // Fallback to CSS syntax highlighting
      actions: {
        beautify: null,
        minify: null,
        compile: null,
        destroy: null
      }
    }
  }

  async compileToCss(code) {
    return '/* Stylus compilation disabled */'
  }

  async minify(code) {
    return code
  }

  async render(content, fileMap) {
    return {
      ...fileMap,
      cssContent: '/* Stylus rendering disabled */'
    }
  }

  static getSchema() {
    return CSSAdapter.getSchema()
  }
}
