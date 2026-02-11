import { CSSAdapter } from './css_adapter.js'
import { loadAndRenderTemplate } from '../../core/template_engine.js'
import { importModule } from '../import_module.js'

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
  static compileTargets = ['css']
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
        compile: (target) => target === 'css' ? this.compileToCss.bind(this) : null
      }
    }
  }

  async compileToCss(code) {
    try {
      const less = await getLess()
      const result = await less.render(code)
      return result.css
    } catch (err) {
      console.error('LESS compilation error:', err)
      return `/* LESS Error: ${err.message} */`
    }
  }

  async render(content, fileMap) {
    try {
      console.log('Pen: Rendering LESS...', { contentLen: content?.length })
      const css = await this.compileToCss(content)
      console.log('Pen: LESS Rendered successfully')
      const styleType = this.settings.tailwind ? 'text/tailwindcss' : 'text/css'
      return {
        ...fileMap,
        css,
        styleType
      }
    } catch (err) {
      console.error('Pen: LESS Error:', err)
      return {
        ...fileMap,
        css: `/* LESS Error: ${err.message} */`
      }
    }
  }

  async beautify(code, filename = null) {
    return await super.beautify(code, 'less', filename)
  }
}
