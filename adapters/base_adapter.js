export class BaseAdapter {
  static type = 'unknown'
  static id = 'base'
  static name = 'Base Adapter'
  static description = 'Base adapter class'
  static extends = null
  static fileExtension = '.txt'
  static mimeType = 'text/plain'

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
        beautify: null,
        minify: null,
        compile: null,
        destroy: null
      }
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

  getSchema() {
    return {}
  }
}
