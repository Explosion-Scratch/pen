import { parseHTML } from 'linkedom'
import { BaseAdapter } from '../base_adapter.js'
import { loadAndRenderTemplate } from '../../core/template_engine.js'

export class HTMLAdapter extends BaseAdapter {
  static type = 'markup'
  static id = 'html'
  static name = 'HTML'
  static description = 'Standard HTML markup'
  static extends = null
  static fileExtension = '.html'
  static mimeType = 'text/html'
  static editableSelector = 'body'

  static getCdnResources(settings = {}) {
    return { scripts: [], styles: [] }
  }

  static async getDefaultTemplate(variables = {}) {
    const template = await loadAndRenderTemplate('html', variables)
    if (template) return template

    return `<div class="container">
  <h1>Welcome to ${variables.projectName || 'Pen'}</h1>
  <p>Start editing to see your changes live!</p>
</div>`
  }

  static getDefaultSettings() {
    return {
      doctype: 'html5',
      lang: 'en'
    }
  }

  initialize(codemirrorInstance, fullConfig) {
    return {
      syntax: 'html',
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
    return await super.beautify(code, 'html', filename)
  }

  minify(code) {
    return code.replace(/\n\s*/g, '').replace(/>\s+</g, '><')
  }

  async render(content, fileMap) {
    const isFullDocument = /<html/i.test(content) || /<!DOCTYPE/i.test(content)

    if (isFullDocument) {
      const { document } = parseHTML(content)
      return {
        ...fileMap,
        bodyContent: document.body.innerHTML,
        headContent: document.head.innerHTML,
        htmlAttributes: Array.from(document.documentElement.attributes).reduce((acc, attr) => {
          acc[attr.name] = attr.value
          return acc
        }, {})
      }
    }

    return {
      ...fileMap,
      bodyContent: content
    }
  }

  static getSchema() {
    return {
      doctype: {
        type: 'select',
        name: 'Document Type',
        description: 'HTML document type declaration',
        default: 'html5',
        options: ['html5', 'xhtml']
      },
      lang: {
        type: 'string',
        name: 'Language',
        description: 'Document language attribute',
        default: 'en'
      }
    }
  }
}
