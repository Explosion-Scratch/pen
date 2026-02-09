import { CSSAdapter } from './css_adapter.js'
import { loadAndRenderTemplate } from '../../core/template_engine.js'
import less from 'less'

export class LESSAdapter extends CSSAdapter {
  static type = 'style'
  static id = 'less'
  static name = 'LESS'
  static description = 'Leaner Style Sheets'
  static extends = 'css'
  static fileExtension = '.less'
  static mimeType = 'text/x-less'

  static getCdnResources(settings = {}) {
    const parentResources = CSSAdapter.getCdnResources(settings)
    return {
      scripts: [...parentResources.scripts],
      styles: [...parentResources.styles]
    }
  }

  static getDefaultTemplate(variables = {}) {
    const template = loadAndRenderTemplate('less', variables)
    if (template) return template

    return `/* ${variables.projectName || 'Pen'} Styles */

@color-background: #FDFCFB;
@color-text: #1A1A1A;
@color-accent: #C2410C;
@font-serif: 'Source Serif Pro', Georgia, serif;
@font-mono: 'Maple Mono', 'Fira Code', monospace;

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: @font-serif;
  background: @color-background;
  color: @color-text;
  line-height: 1.6;
  padding: 2rem;
}

.container {
  max-width: 800px;
  margin: 0 auto;

  h1 {
    font-size: 2.5rem;
    margin-bottom: 1rem;
    color: @color-accent;
  }

  p {
    font-size: 1.125rem;
    margin-bottom: 1rem;
  }
}`
  }

  static getDefaultSettings() {
    return {
      ...CSSAdapter.getDefaultSettings(),
      strictMath: false
    }
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

  async compileToCss(lessCode) {
    try {
      const result = await less.render(lessCode, {
        strictMath: this.settings.strictMath
      })
      return result.css
    } catch (err) {
      console.error('LESS compilation error:', err)
      return `/* LESS Error: ${err.message} */`
    }
  }

  async render(content, fileMap) {
    try {
      const result = await less.render(content, {
        strictMath: this.settings.strictMath
      })
      return {
        ...fileMap,
        css: result.css
      }
    } catch (err) {
      return {
        ...fileMap,
        css: `/* LESS Error: ${err.message} */`
      }
    }
  }

  getSchema() {
    return {
      ...super.getSchema(),
      strictMath: {
        type: 'boolean',
        name: 'Strict Math',
        description: 'Enable strict math mode',
        default: false
      }
    }
  }

  async beautify(code) {
    return await super.beautify(code, 'less')
  }
}
