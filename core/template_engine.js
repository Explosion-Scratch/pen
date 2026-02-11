import Handlebars from 'handlebars'

export async function loadAdapterTemplate(adapterId) {
  // Check for Node environment
  const isNode = typeof process !== 'undefined' && process.versions != null && process.versions.node != null

  if (isNode) {
    try {
      const { readFileSync, existsSync } = await import('fs')
      const { join, dirname } = await import('path')
      const { fileURLToPath } = await import('url')
      
      const __filename = fileURLToPath(import.meta.url)
      const __dirname = dirname(__filename)
      const templatePath = join(__dirname, `../templates/${adapterId}.hbs`)
      
      if (existsSync(templatePath)) {
        return readFileSync(templatePath, 'utf-8')
      }
    } catch (e) {
      console.error('Core: Failed to load template in Node', e)
    }
    return null
  } else {
    // Browser environment (Vite)
    try {
      let content
      switch (adapterId) {
        case 'css': content = (await import('../templates/css.hbs?raw')).default; break;
        case 'html': content = (await import('../templates/html.hbs?raw')).default; break;
        case 'javascript': content = (await import('../templates/javascript.hbs?raw')).default; break;
        case 'less': content = (await import('../templates/less.hbs?raw')).default; break;
        case 'pug': content = (await import('../templates/pug.hbs?raw')).default; break;
        case 'sass': content = (await import('../templates/sass.hbs?raw')).default; break;
        case 'slim': content = (await import('../templates/slim.hbs?raw')).default; break;
        case 'stylus': content = (await import('../templates/stylus.hbs?raw')).default; break;
        case 'typescript': content = (await import('../templates/typescript.hbs?raw')).default; break;
        default: return null
      }
      return content
    } catch (e) {
      console.error(`Failed to load template ${adapterId}`, e)
      return null
    }
  }
}

export async function loadAndRenderTemplate(adapterId, variables = {}) {
  const template = await loadAdapterTemplate(adapterId)
  if (!template) {
    return ''
  }
  return renderTemplate(template, variables)
}

export function renderTemplate(templateString, variables = {}) {
  const compiled = Handlebars.compile(templateString)
  return compiled(variables)
}

Handlebars.registerHelper('uppercase', (str) => {
  if (typeof str === 'string') {
    return str.toUpperCase()
  }
  return str
})

Handlebars.registerHelper('lowercase', (str) => {
  if (typeof str === 'string') {
    return str.toLowerCase()
  }
  return str
})

Handlebars.registerHelper('capitalize', (str) => {
  if (typeof str === 'string') {
    return str.charAt(0).toUpperCase() + str.slice(1)
  }
  return str
})
