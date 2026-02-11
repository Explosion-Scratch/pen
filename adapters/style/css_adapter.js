import { BaseAdapter } from '../base_adapter.js'
import { loadAndRenderTemplate } from '../../core/template_engine.js'
import { transformCssImports } from '../../core/cdn_transformer.js'

export class CSSAdapter extends BaseAdapter {
  static type = 'style'
  static id = 'css'
  static name = 'CSS'
  static description = 'Cascading Style Sheets'
  static extends = null
  static fileExtension = '.css'
  static mimeType = 'text/css'
  static canMinify = true

  static getCdnResources(settings = {}) {
    const resources = { scripts: [], styles: [] }
    if (settings.normalize) {
      resources.styles.push('https://cdn.skypack.dev/normalize.css')
    }
    return resources
  }

  static async getDefaultTemplate(variables = {}) {
    const template = await loadAndRenderTemplate('css', variables)
    if (template) return template

    return `/* ${variables.projectName || 'Pen'} Styles */

:root {
  --color-background: #FDFCFB;
  --color-text: #1A1A1A;
  --color-accent: #C2410C;
  --font-serif: 'Source Serif Pro', Georgia, serif;
  --font-mono: 'Maple Mono', 'Fira Code', monospace;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: var(--font-serif);
  background: var(--color-background);
  color: var(--color-text);
  line-height: 1.6;
  padding: 2rem;
}

.container {
  max-width: 800px;
  margin: 0 auto;
}

h1 {
  font-size: 2.5rem;
  margin-bottom: 1rem;
  color: var(--color-accent);
}

p {
  font-size: 1.125rem;
  margin-bottom: 1rem;
}`
  }

  static getDefaultSettings() {
    return {
      normalize: true,
      autoprefixer: false,
      tailwind: false
    }
  }

  initialize(codemirrorInstance, fullConfig) {
    return {
      syntax: 'css',
      theme: 'pen-light',
      extensions: [],
      actions: {
        beautify: (code) => this.beautify(code),
        minify: (code) => this.minify(code),
        compile: null,
        destroy: null
      }
    }
  }

  async beautify(code, filename = null) {
    return await super.beautify(code, 'css', filename)
  }

  minify(code) {
    return code
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\s+/g, ' ')
      .replace(/\s*([{}:;,])\s*/g, '$1')
      .replace(/;}/g, '}')
      .trim()
  }

  async render(content, fileMap) {
    const css = transformCssImports(content, this.settings.importOverrides || {})
    const styleType = this.settings.tailwind ? 'text/tailwindcss' : 'text/css'
    return { ...fileMap, css, styleType }
  }

  static getSchema() {
    return {
      normalize: {
        type: 'boolean',
        name: 'Include Normalize.css',
        description: 'Include Normalize.css for consistent cross-browser styling',
        default: true
      },
      autoprefixer: {
        type: 'boolean',
        name: 'Auto-prefix CSS',
        description: 'Automatically add vendor prefixes',
        default: false
      },
      tailwind: {
        type: 'boolean',
        name: 'Tailwind CSS',
        description: 'Enable Tailwind CDN processing (supports @layer, @apply, etc.)',
        default: false
      }
    }
  }
}
