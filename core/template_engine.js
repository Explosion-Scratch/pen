const isBrowser = typeof window !== 'undefined'
// Handlebars removed as requested.

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
      const templatePath = join(__dirname, `../templates/${adapterId}.txt`)
      
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
        case 'css': content = (await import('../templates/css.txt?raw')).default; break;
        case 'html': content = (await import('../templates/html.txt?raw')).default; break;
        case 'javascript': content = (await import('../templates/javascript.txt?raw')).default; break;
        case 'less': content = (await import('../templates/less.txt?raw')).default; break;
        case 'sass': content = (await import('../templates/sass.txt?raw')).default; break;
        case 'stylus': content = (await import('../templates/stylus.txt?raw')).default; break;
        case 'typescript': content = (await import('../templates/typescript.txt?raw')).default; break;
        case 'jsx': content = (await import('../templates/jsx.txt?raw')).default; break;
        default: return null
      }
      return content
    } catch (e) {
      console.error(`Failed to load template ${adapterId}`, e)
      return null
    }
  }
}

/**
 * Simplified to just return the template as Handlebars is removed.
 */
export async function loadAndRenderTemplate(adapterId, variables = {}) {
  return await loadAdapterTemplate(adapterId) || ''
}

export function renderTemplate(templateString, variables = {}) {
  return templateString
}
