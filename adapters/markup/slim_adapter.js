import { BaseAdapter } from '../base_adapter.js'
import { loadAndRenderTemplate } from '../../core/template_engine.js'

export class SlimAdapter extends BaseAdapter {
  static type = 'markup'
  static id = 'slim'
  static name = 'Slim'
  static description = 'Slim template language'
  static extends = null
  static fileExtension = '.slim'
  static mimeType = 'text/x-slim'

  static getCdnResources(settings = {}) {
    return { scripts: [], styles: [] }
  }

  static getDefaultTemplate(variables = {}) {
    const template = loadAndRenderTemplate('slim', variables)
    if (template) return template

    return `.container
  h1 Welcome to ${variables.projectName || 'Pen'}
  p Start editing to see your changes live!`
  }

  static getDefaultSettings() {
    return {}
  }

  initialize(codemirrorInstance, fullConfig) {
    return {
      syntax: 'slim',
      theme: 'pen-light',
      extensions: [],
      actions: {
        beautify: null,
        minify: null,
        compile: (target) => target === 'html' ? this.compileToHtml : null,
        destroy: null
      }
    }
  }

  parseSlim(slimCode) {
    const lines = slimCode.split('\n')
    const result = []
    const stack = [{ indent: -1, tag: 'root', children: result }]

    for (const line of lines) {
      if (!line.trim()) continue

      const indent = line.search(/\S/)
      const content = line.trim()

      while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
        stack.pop()
      }

      let html = ''

      if (content.startsWith('.')) {
        const classes = content.match(/^\.[a-zA-Z0-9_-]+/g) || []
        const classNames = classes.map(c => c.slice(1)).join(' ')
        const rest = content.replace(/^\.[a-zA-Z0-9_-]+(\.[a-zA-Z0-9_-]+)*/, '').trim()
        html = `<div class="${classNames}">${rest}`
        stack[stack.length - 1].children.push({ html, closer: '</div>', children: [] })
      } else if (content.startsWith('#')) {
        const id = content.match(/^#([a-zA-Z0-9_-]+)/)?.[1] || ''
        const rest = content.replace(/^#[a-zA-Z0-9_-]+/, '').trim()
        html = `<div id="${id}">${rest}`
        stack[stack.length - 1].children.push({ html, closer: '</div>', children: [] })
      } else {
        const tagMatch = content.match(/^([a-zA-Z0-9]+)/)
        if (tagMatch) {
          const tag = tagMatch[1]
          const rest = content.slice(tag.length).trim()
          html = `<${tag}>${rest}`
          stack[stack.length - 1].children.push({ html, closer: `</${tag}>`, children: [] })
        } else {
          stack[stack.length - 1].children.push({ html: content, closer: '', children: [] })
        }
      }

      const node = stack[stack.length - 1].children[stack[stack.length - 1].children.length - 1]
      if (node) {
        stack.push({ indent, ...node })
      }
    }

    function render(nodes, depth = 0) {
      let out = ''
      for (const node of nodes) {
        const indent = '  '.repeat(depth)
        if (node.children && node.children.length > 0) {
          out += `${indent}${node.html}\n`
          out += render(node.children, depth + 1)
          out += `${indent}${node.closer}\n`
        } else {
          out += `${indent}${node.html}${node.closer}\n`
        }
      }
      return out
    }

    return render(result)
  }

  async render(content, fileMap) {
    try {
      const html = this.parseSlim(content)
      return {
        ...fileMap,
        bodyContent: html
      }
    } catch (err) {
      return {
        ...fileMap,
        bodyContent: `<pre class="error">Slim Error: ${err.message}</pre>`
      }
    }
  }

  static getSchema() {
    return {}
  }
}
