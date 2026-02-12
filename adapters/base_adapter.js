import { importModule, isBrowser } from './import_module.js'

let prettierBundle = null

/**
 * @returns {Promise<{prettier: object, plugins: object[]}>}
 */
async function getPrettier() {
  if (isBrowser) {
    if (!window.prettier) {
      throw new Error('Prettier not found on window object. Ensure CDN script is loaded.')
    }
    return {
      prettier: window.prettier,
      plugins: [
        window.prettierPlugins?.babel,
        window.prettierPlugins?.estree,
        window.prettierPlugins?.html,
        window.prettierPlugins?.postcss,
        window.prettierPlugins?.markdown,
        window.prettierPlugins?.yaml
      ].filter(Boolean)
    }
  }

  if (!prettierBundle) {
    const [
      prettier,
      parserBabel,
      parserEstree,
      parserHtml,
      parserCss,
      parserMarkdown,
      parserYaml
    ] = await Promise.all([
      importModule('prettier'),
      importModule('prettier/plugins/babel', { cacheKey: 'prettier-babel' }),
      importModule('prettier/plugins/estree', { cacheKey: 'prettier-estree' }),
      importModule('prettier/plugins/html', { cacheKey: 'prettier-html' }),
      importModule('prettier/plugins/postcss', { cacheKey: 'prettier-postcss' }),
      importModule('prettier/plugins/markdown', { cacheKey: 'prettier-markdown' }),
      importModule('prettier/plugins/yaml', { cacheKey: 'prettier-yaml' })
    ])

    prettierBundle = {
      prettier,
      plugins: [parserBabel, parserEstree, parserHtml, parserCss, parserMarkdown, parserYaml]
    }
  }

  return prettierBundle
}

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
      const { prettier, plugins } = await getPrettier()
      return await prettier.format(code, {
        parser,
        filepath: filename || undefined,
        semi: true,
        singleQuote: true,
        printWidth: 100,
        trailingComma: 'none',
        plugins
      })
    } catch (err) {
      // Re-throw so the caller (client/server) can handle and report the error
      throw err
    }
  }


  async saveFile(filename, content, context = {}) {
    if (this.onSaveFile) {
      await this.onSaveFile(filename, content, context)
    } else {
      console.warn('BaseAdapter: No onSaveFile callback registered.')
    }
  }


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

