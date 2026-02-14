import { CSSAdapter } from './css_adapter.js'
import { loadAndRenderTemplate } from '../../core/template_engine.js'
import { importModule } from '../import_module.js'
import { CompileError } from '../../core/errors.js'

/**
 * @returns {Promise<object>}
 */
async function getLess() {
  return importModule('less', { cdnUrl: 'https://esm.sh/less@4.2.0?bundle' })
}

export class LESSAdapter extends CSSAdapter {
  static type = 'style'
  static id = 'less'
  static name = 'LESS'
  static description = 'Leaner Style Sheets'
  static extends = 'css'
  static fileExtension = '.less'
  static mimeType = 'text/x-less'
  static compileTargets = ['CSS']
  static canMinify = true

  static getCdnResources(settings = {}) {
    return CSSAdapter.getCdnResources(settings)
  }

  static async getDefaultTemplate(variables = {}) {
    const template = await loadAndRenderTemplate('less', variables)
    if (template) return template

    return `/* ${variables.projectName || 'Pen'} Styles (LESS) */
@color-accent: #C2410C;

.container {
  h1 {
    color: @color-accent;
  }
}`
  }

  initialize(codemirrorInstance, fullConfig) {
    const parentInit = super.initialize(codemirrorInstance, fullConfig)
    return {
      ...parentInit,
      syntax: 'less',
      actions: {
        ...parentInit.actions,
        compile: (target) => (target === 'CSS' || target === 'css') ? this.compileToCSS.bind(this) : null
      }
    }
  }

  async compileToCSS(code) {
    try {
      const less = await getLess()
      const filename = 'style.less'
      const result = await less.render(code, {
        filename,
        sourceMap: { sourceMapInline: true, sourceMapFileInline: true }
      })
      return result.css
    } catch (err) {
      // LESS error object usually has line, column, message
      throw new CompileError(err.message, {
          adapterId: this.constructor.id,
          filename: 'style.less',
          line: err.line,
          column: err.column, // LESS columns might be 0-indexed? Let's check docs or assume 1-based or just pass it
          originalError: err
      })
    }
  }

  async render(content, fileMap) {
    // Pipeline processor handles catching CompileError
    const css = await this.compileToCSS(content)
    const styleType = this.settings.tailwind ? 'text/tailwindcss' : 'text/css'
    return {
      ...fileMap,
      css,
      styleType
    }
  }

  async beautify(code, filename = null) {
    return await super.beautify(code, 'less', filename)
  }
}
