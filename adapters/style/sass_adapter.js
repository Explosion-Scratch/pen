import { CSSAdapter } from './css_adapter.js'
import { loadAndRenderTemplate } from '../../core/template_engine.js'
import * as sass from 'sass'

export class SASSAdapter extends CSSAdapter {
  static type = 'style'
  static id = 'sass'
  static name = 'SASS/SCSS'
  static description = 'Syntactically Awesome Style Sheets'
  static extends = 'css'
  static fileExtension = '.scss'
  static mimeType = 'text/x-scss'
  static compileTargets = ['css']
  static canMinify = true

  static getCdnResources(settings = {}) {
    const parentResources = CSSAdapter.getCdnResources(settings)
    return {
      scripts: [...parentResources.scripts],
      styles: [...parentResources.styles]
    }
  }

  static getDefaultTemplate(variables = {}) {
    const template = loadAndRenderTemplate('sass', variables)
    if (template) return template

    return `/* ${variables.projectName || 'Pen'} Styles */

$color-background: #FDFCFB;
$color-text: #1A1A1A;
$color-accent: #C2410C;
$font-serif: 'Source Serif Pro', Georgia, serif;
$font-mono: 'Maple Mono', 'Fira Code', monospace;

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: $font-serif;
  background: $color-background;
  color: $color-text;
  line-height: 1.6;
  padding: 2rem;
}

.container {
  max-width: 800px;
  margin: 0 auto;

  h1 {
    font-size: 2.5rem;
    margin-bottom: 1rem;
    color: $color-accent;
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
      indentedSyntax: false,
      sourceMaps: false
    }
  }

  initialize(codemirrorInstance, fullConfig) {
    const parentInit = super.initialize(codemirrorInstance, fullConfig)
    return {
      ...parentInit,
      syntax: 'scss',
      actions: {
        ...parentInit.actions,
        compile: (target) => target === 'css' ? this.compileToCss.bind(this) : null
      }
    }
  }

  async compileToCss(scssCode) {
    try {
      const result = sass.compileString(scssCode, {
        style: 'expanded',
        sourceMap: this.settings.sourceMaps
      })
      return result.css
    } catch (err) {
      console.error('SASS compilation error:', err)
      return `/* SASS Error: ${err.message} */`
    }
  }

  async minify(code) {
    try {
      const result = sass.compileString(code, {
        style: 'compressed',
        sourceMap: this.settings.sourceMaps
      })
      return result.css
    } catch (err) {
      throw err
    }
  }

  async render(content, fileMap) {
    try {
      const result = sass.compileString(content, {
        style: 'expanded',
        sourceMap: this.settings.sourceMaps
      })
      return {
        ...fileMap,
        css: result.css
      }
    } catch (err) {
      return {
        ...fileMap,
        css: `/* SASS Error: ${err.message} */`
      }
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
      },
      sourceMaps: {
        type: 'boolean',
        name: 'Generate source maps',
        description: 'Generate source maps for debugging',
        default: false
      }
    }
  }

  async beautify(code, filename = null) {
    return await super.beautify(code, 'scss', filename)
  }
}
