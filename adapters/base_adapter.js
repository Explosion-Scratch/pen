import * as prettier from 'prettier'
import parserBabel from 'prettier/plugins/babel'
import parserEstree from 'prettier/plugins/estree'
import parserHtml from 'prettier/plugins/html'
import parserCss from 'prettier/plugins/postcss'
import parserMarkdown from 'prettier/plugins/markdown'
import parserYaml from 'prettier/plugins/yaml'

export class BaseAdapter {
  static type = 'unknown'
  static id = 'base'
  static name = 'Base Adapter'
  static description = 'Base adapter class'
  static extends = null
  static fileExtension = '.txt'
  static mimeType = 'text/plain'
  static compileTargets = []
  static canMinify = false

  constructor() {
    this.settings = {}
  }

  static getCdnResources(settings = {}) {
    return { scripts: [], styles: [] }
  }

  static async getDefaultTemplate(variables = {}) {
    return ''
  }

  static getDefaultSettings() {
    return {}
  }

  initialize(codemirrorInstance, fullConfig) {
    return {
      syntax: 'text',
      theme: 'pen-light',
      extensions: [],
      actions: {
        beautify: async (code) => await this.beautify(code),
        minify: null,
        compile: null,
        destroy: null
      }
    }
  }

  async beautify(code, parser = null, filename = null) {
    if (!parser) return code
    try {
      // In browser, prettier might be available differently or we might need a different strategy.
      // For now, assuming prettier is available or bundled.
      // If running in browser without node resolution, this might need adjustment.
      return await prettier.format(code, {
        parser,
        filepath: filename || undefined,
        semi: true,
        singleQuote: true,
        printWidth: 100,
        trailingComma: 'none',
        plugins: [
          parserBabel,
          parserEstree,
          parserHtml,
          parserCss,
          parserMarkdown,
          parserYaml
        ]
      })
    } catch (err) {
      // Re-throw so the caller (client/server) can handle and report the error
      throw err
    }
  }

  // Orchestration method: Adapters should use this to "save" files.
  // The actual implementation of saving (disk write or WS message) is handled by the callback.
  async saveFile(filename, content, context = {}) {
    if (this.onSaveFile) {
      await this.onSaveFile(filename, content, context)
    } else {
      console.warn('BaseAdapter: No onSaveFile callback registered.')
    }
  }

  // Helper to register the callback
  registerSaveFileCallback(callback) {
    this.onSaveFile = callback
  }

  async render(content, fileMap) {
    return { ...fileMap }
  }

  getSettings() {
    return { ...this.settings }
  }

  setSettings(settingsObj) {
    this.settings = { ...this.settings, ...settingsObj }
  }

  static getSchema() {
    return {}
  }
}

