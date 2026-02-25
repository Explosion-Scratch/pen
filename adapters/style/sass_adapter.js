import { CSSAdapter } from './css_adapter.js'
import { loadAndRenderTemplate } from '../../core/template_engine.js'
import { importModule } from '../import_module.js'
import { CompileError } from '../../core/errors.js'

/**
 * @returns {Promise<object>}
 */
async function getSass() {
  return importModule('sass', { cdnUrl: 'https://jspm.dev/sass' })
}


export class SASSAdapter extends CSSAdapter {
  static type = 'style'
  static id = 'sass'
  static name = 'SASS/SCSS'
  static description = 'Syntactically Awesome Style Sheets'
  static extends = 'css'
  static fileExtension = '.scss'
  static mimeType = 'text/x-scss'
  static compileTargets = ['CSS']
  static canMinify = true

  static getCdnResources(settings = {}) {
    const parentResources = CSSAdapter.getCdnResources(settings)
    return {
      scripts: [...parentResources.scripts],
      styles: [...parentResources.styles]
    }
  }

  static async getDefaultTemplate(variables = {}) {
    return await loadAndRenderTemplate('sass', variables)
  }

  static getDefaultSettings() {
    return {
      ...CSSAdapter.getDefaultSettings(),
      indentedSyntax: false
    }
  }

  initialize(codemirrorInstance, fullConfig) {
    const parentInit = super.initialize(codemirrorInstance, fullConfig)
    return {
      ...parentInit,
      syntax: 'scss',
      actions: {
        ...parentInit.actions,
        compile: (target) => (target === 'CSS' || target === 'css') ? this.compileToCSS.bind(this) : null
      }
    }
  }

  async compileToCSS(scssCode) {
    try {
      const sass = await getSass()
      const wantMaps = !!this.settings._generateSourceMaps
      const result = sass.compileString(scssCode, {
        style: 'expanded',
        sourceMap: wantMaps,
        ...(wantMaps ? { sourceMapIncludeSources: true } : {})
      })
      
      return { css: result.css, map: wantMaps ? result.sourceMap : undefined }
    } catch (err) {
      // SASS error object has 'span' with start.line, start.column
      throw new CompileError(err.message, {
          adapterId: this.constructor.id,
          filename: 'style.scss',
          line: err.span?.start?.line !== undefined ? err.span.start.line + 1 : undefined,
          column: err.span?.start?.column !== undefined ? err.span.start.column + 1 : undefined,
          originalError: err
      })
    }
  }

  async minify(code) {
    try {
      const sass = await getSass()
      const result = sass.compileString(code, {
        style: 'compressed'
      })
      return result.css
    } catch (err) {
      throw err
    }
  }

  async render(content, fileMap) {
    // Pipeline processor handles catching CompileError
    const { css, map } = await this.compileToCSS(content)
    
    const styleType = this.settings.tailwind ? 'text/tailwindcss' : 'text/css'
    return {
    ...fileMap,
    css,
    map,
    styleType
    }
  }

  static getSchema() {
    return {
      ...super.getSchema(),
      indentedSyntax: {
        type: 'boolean',
        name: 'Use indented syntax',
        description: 'Use SASS indented syntax instead of SCSS',
        default: false
      }
    }
  }

  async beautify(code, filename = null) {
    return await super.beautify(code, 'scss', filename)
  }
}
