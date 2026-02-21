import { BaseAdapter } from '../base_adapter.js'
import { loadAndRenderTemplate } from '../../core/template_engine.js'

export class PythonAdapter extends BaseAdapter {
  static type = 'script'
  static id = 'python'
  static name = 'Python (Brython)'
  static description = 'Python code via Brython'
  static extends = null
  static fileExtension = '.py'
  static mimeType = 'text/python'
  static canMinify = false // Brython handles parsing, Terser crashes on python

  static getCdnResources(settings = {}) {
    return { scripts: [], styles: [] }
  }

  static async getDefaultTemplate(variables = {}) {
    const template = await loadAndRenderTemplate('python', variables)
    if (template) return template

    return `# ${variables.projectName || 'Pen'} Python Script
# Make sure Brython CDN is loaded in project settings
from browser import document

def greet(event):
    print("${variables.projectName || 'Pen'} is ready!")

# document.bind("DOMContentLoaded", greet)`
  }

  static getDefaultSettings() {
    return {
      moduleType: 'text/python', // Injected as <script type="text/python">
      injectTo: 'body',
      injectPosition: 'beforeend',
      priority: 30
    }
  }

  initialize(codemirrorInstance, fullConfig) {
    return {
      syntax: 'python',
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
    return code // Wait for a python formatter if needed
  }

  async minify(code) {
    return code // No minification since Terser fails on Python
  }

  async render(content, fileMap) {
    return {
      ...fileMap,
      js: content 
    }
  }

  static getSchema() {
    return {
      moduleType: {
        type: 'string',
        name: 'Script Type',
        description: 'Script type attribute (e.g. text/python)',
        default: 'text/python'
      },
      ...super.getSchema()
    }
  }
}
