import { BaseAdapter } from '../base_adapter.js'
import { loadAndRenderTemplate } from '../../core/template_engine.js'

export class PugAdapter extends BaseAdapter {
  static type = 'markup'
  static id = 'pug'
  static name = 'Pug'
  static description = 'Pug template engine (formerly Jade)'
  static extends = null
  static fileExtension = '.pug'
  static mimeType = 'text/x-pug'

  static getCdnResources(settings = {}) {
    return {
      scripts: ['https://cdn.skypack.dev/pug'],
      styles: []
    }
  }

  static async getDefaultTemplate(variables = {}) {
    const template = await loadAndRenderTemplate('pug', variables)
    if (template) return template

    return `.container
  h1 Welcome to ${variables.projectName || 'Pen'}
  p Start editing to see your changes live!`
  }

  static getDefaultSettings() {
    return {
      pretty: true
    }
  }

  initialize(codemirrorInstance, fullConfig) {
    return {
      syntax: 'pug',
      theme: 'pen-light',
      extensions: [],
      actions: {
        beautify: null,
        minify: null,
        compile: (target) => target === 'html' ? this.compileToHtml : null,
        destroy: null
      }
    }
  }

  async compileToHtml(pugCode) {
    return '<!-- Pug support currently disabled in browser -->'
    /*
    try {
      const pug = await import('pug')
      return pug.render(pugCode, { pretty: this.settings.pretty })
    } catch (err) {
      console.error('Pug compilation error:', err)
      return `<!-- Pug Error: ${err.message} -->`
    }
    */
  }

  async render(content, fileMap) {
    return {
        ...fileMap,
        bodyContent: '<!-- Pug support currently disabled in browser -->'
    }
    /*
    try {
      const pug = await import('pug')
      const html = pug.render(content, { pretty: this.settings.pretty })
      return {
        ...fileMap,
        bodyContent: html
      }
    } catch (err) {
      return {
        ...fileMap,
        bodyContent: `<pre class="error">Pug Error: ${err.message}</pre>`
      }
    }
    */
  }

  static getSchema() {
    return {
      pretty: {
        type: 'boolean',
        name: 'Pretty Print',
        description: 'Output formatted HTML with indentation',
        default: true
      }
    }
  }
}
