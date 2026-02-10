import { CSSAdapter } from './css_adapter.js'
import { loadAndRenderTemplate } from '../../core/template_engine.js'
import stylus from 'stylus'

export class StylusAdapter extends CSSAdapter {
  static type = 'style'
  static id = 'stylus'
  static name = 'Stylus'
  static description = 'Expressive CSS preprocessor'
  static extends = 'css'
  static fileExtension = '.styl'
  static mimeType = 'text/x-stylus'

  static getCdnResources(settings = {}) {
    const parentResources = CSSAdapter.getCdnResources(settings)
    return {
      scripts: [...parentResources.scripts],
      styles: [...parentResources.styles]
    }
  }

  static getDefaultTemplate(variables = {}) {
    const template = loadAndRenderTemplate('stylus', variables)
    if (template) return template

    return `/* ${variables.projectName || 'Pen'} Styles */

color-background = #FDFCFB
color-text = #1A1A1A
color-accent = #C2410C
font-serif = 'Source Serif Pro', Georgia, serif
font-mono = 'Maple Mono', 'Fira Code', monospace

*
  box-sizing border-box
  margin 0
  padding 0

body
  font-family font-serif
  background color-background
  color color-text
  line-height 1.6
  padding 2rem

.container
  max-width 800px
  margin 0 auto

  h1
    font-size 2.5rem
    margin-bottom 1rem
    color color-accent

  p
    font-size 1.125rem
    margin-bottom 1rem`
  }

  static getDefaultSettings() {
    return {
      ...CSSAdapter.getDefaultSettings(),
      compress: false
    }
  }

  initialize(codemirrorInstance, fullConfig) {
    const parentInit = super.initialize(codemirrorInstance, fullConfig)
    return {
      ...parentInit,
      syntax: 'stylus',
      actions: {
        ...parentInit.actions,
        compile: (target) => target === 'css' ? this.compileToCss.bind(this) : null
      }
    }
  }

  async compileToCss(stylusCode) {
    return new Promise((resolve) => {
      stylus(stylusCode)
        .set('compress', this.settings.compress)
        .render((err, css) => {
          if (err) {
            console.error('Stylus compilation error:', err)
            resolve(`/* Stylus Error: ${err.message} */`)
          } else {
            resolve(css)
          }
        })
    })
  }

  async render(content, fileMap) {
    return new Promise((resolve) => {
      stylus(content)
        .set('compress', this.settings.compress)
        .render((err, css) => {
          if (err) {
            resolve({
              ...fileMap,
              css: `/* Stylus Error: ${err.message} */`
            })
          } else {
            resolve({
              ...fileMap,
              css
            })
          }
        })
    })
  }

  static getSchema() {
    return {
      ...super.getSchema(),
      compress: {
        type: 'boolean',
        name: 'Compress Output',
        description: 'Output minified CSS',
        default: false
      }
    }
  }

  async beautify(code) {
    return code
  }
}
