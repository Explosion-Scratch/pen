import * as prettier from 'prettier'

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

  static getDefaultTemplate(variables = {}) {
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
      return await prettier.format(code, {
        parser,
        filepath: filename || undefined,
        semi: true,
        singleQuote: true,
        printWidth: 100,
        trailingComma: 'none'
      })
    } catch (err) {
      // Re-throw so the caller (server) can handle and report the error
      throw err
    }
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

