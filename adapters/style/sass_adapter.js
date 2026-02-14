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
    const template = await loadAndRenderTemplate('sass', variables)
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
      const result = sass.compileString(scssCode, {
        style: 'expanded',
        sourceMap: true,
        sourceMapIncludeSources: true
      })
      let css = result.css
      if (result.sourceMap) {
        const mapBase64 = btoa(JSON.stringify(result.sourceMap))
        css += `\n/*# sourceMappingURL=data:application/json;base64,${mapBase64} */`
      }
      return css
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
    const css = await this.compileToCSS(content)
    
    const styleType = this.settings.tailwind ? 'text/tailwindcss' : 'text/css'
    return {
    ...fileMap,
    css,
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
