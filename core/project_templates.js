import { getAdapter } from './adapter_registry.js'

export async function loadAllProjectTemplates() {
  const isNode = typeof process !== 'undefined' && process.versions != null && process.versions.node != null

  if (isNode) {
    try {
      const { readFileSync, existsSync, readdirSync } = await import('fs')
      const { join, dirname } = await import('path')
      const { fileURLToPath } = await import('url')
      
      const __filename = fileURLToPath(import.meta.url)
      const __dirname = dirname(__filename)
      const PROJECT_TEMPLATES_DIR = join(__dirname, '../project-templates')

      if (!existsSync(PROJECT_TEMPLATES_DIR)) return []
      
      const dirs = readdirSync(PROJECT_TEMPLATES_DIR, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name)
      
      const templates = []
      for (const id of dirs) {
        const tmpl = await loadProjectTemplateInNode(id, PROJECT_TEMPLATES_DIR, { readFileSync, join, existsSync })
        if (tmpl) templates.push(tmpl)
      }
      return templates
    } catch (e) {
      console.error('Core: Failed to load project templates in Node', e)
      return []
    }
  } else {
    // Browser / Vite
    return await loadProjectTemplatesInBrowser()
  }
}

export async function loadProjectTemplate(templateId) {
  const templates = await loadAllProjectTemplates()
  return templates.find(t => t.id === templateId) || null
}

async function loadProjectTemplateInNode(id, baseDir, fs) {
  const { readFileSync, join, existsSync } = fs
  const dir = join(baseDir, id)
  const configPath = join(dir, '.pen.config.json')
  
  if (!existsSync(configPath)) return null

  try {
    const config = JSON.parse(readFileSync(configPath, 'utf-8'))
    if (!config.template) return null

    const iconPath = join(dir, 'icon.svg')
    const icon = existsSync(iconPath) ? readFileSync(iconPath, 'utf-8') : ''

    const files = {}
    // Load files defined in editors
    if (config.editors) {
      for (const editor of config.editors) {
        const filePath = join(dir, editor.filename)
        if (existsSync(filePath)) {
          files[editor.filename] = readFileSync(filePath, 'utf-8')
        }
      }
    }

    const templateMeta = config.template
    // Don't mutate original config object if we want to be pure, but here we just delete for the return object
    // We clone it first to be safe
    const configClean = JSON.parse(JSON.stringify(config))
    delete configClean.template

    return {
      id,
      title: templateMeta.title || id,
      description: templateMeta.description || '',
      icon,
      config: configClean,
      files
    }
  } catch (err) {
    console.error(`Failed to load template ${id}`, err)
    return null
  }
}

async function loadProjectTemplatesInBrowser() {
  const templates = []
  
  // Mapping of template IDs to their resource loaders
  const manifest = {
    'canvas': {
      config: () => import('../project-templates/canvas/.pen.config.json'),
      icon: () => import('../project-templates/canvas/icon.svg?raw'),
      files: {
        'index.html': () => import('../project-templates/canvas/index.html?raw'),
        'style.css': () => import('../project-templates/canvas/style.css?raw'),
        'sketch.js': () => import('../project-templates/canvas/sketch.js?raw'),
      }
    },
    'scss-ts': {
      config: () => import('../project-templates/scss-ts/.pen.config.json'),
      icon: () => import('../project-templates/scss-ts/icon.svg?raw'),
      files: {
        'index.html': () => import('../project-templates/scss-ts/index.html?raw'),
        'style.scss': () => import('../project-templates/scss-ts/style.scss?raw'),
        'script.ts': () => import('../project-templates/scss-ts/script.ts?raw'),
      }
    },
    'tailwind': {
      config: () => import('../project-templates/tailwind/.pen.config.json'),
      icon: () => import('../project-templates/tailwind/icon.svg?raw'),
      files: {
        'index.html': () => import('../project-templates/tailwind/index.html?raw'),
        'style.css': () => import('../project-templates/tailwind/style.css?raw'),
        'script.js': () => import('../project-templates/tailwind/script.js?raw'),
      }
    },
    'vanilla': {
      config: () => import('../project-templates/vanilla/.pen.config.json'),
      icon: () => import('../project-templates/vanilla/icon.svg?raw'),
      files: {
        'index.html': () => import('../project-templates/vanilla/index.html?raw'),
        'style.css': () => import('../project-templates/vanilla/style.css?raw'),
        'script.js': () => import('../project-templates/vanilla/script.js?raw'),
      }
    },
    'vue': {
      config: () => import('../project-templates/vue/.pen.config.json'),
      icon: () => import('../project-templates/vue/icon.svg?raw'),
      files: {
        'index.html': () => import('../project-templates/vue/index.html?raw'),
        'style.css': () => import('../project-templates/vue/style.css?raw'),
        'script.js': () => import('../project-templates/vue/script.js?raw'),
      }
    },
    'react': {
      config: () => import('../project-templates/react/.pen.config.json'),
      icon: () => import('../project-templates/react/icon.svg?raw'),
      files: {
        'index.html': () => import('../project-templates/react/index.html?raw'),
        'style.css': () => import('../project-templates/react/style.css?raw'),
        'script.jsx': () => import('../project-templates/react/script.jsx?raw'),
      }
    },
    'solid': {
      config: () => import('../project-templates/solid/.pen.config.json'),
      icon: () => import('../project-templates/solid/icon.svg?raw'),
      files: {
        'index.html': () => import('../project-templates/solid/index.html?raw'),
        'style.less': () => import('../project-templates/solid/style.less?raw'),
        'script.jsx': () => import('../project-templates/solid/script.jsx?raw'),
      }
    },
    'd3': {
      config: () => import('../project-templates/d3/.pen.config.json'),
      icon: () => import('../project-templates/d3/icon.svg?raw'),
      files: {
        'index.html': () => import('../project-templates/d3/index.html?raw'),
        'style.less': () => import('../project-templates/d3/style.less?raw'),
        'script.js': () => import('../project-templates/d3/script.js?raw'),
      }
    },
    'threejs': {
      config: () => import('../project-templates/threejs/.pen.config.json'),
      icon: () => import('../project-templates/threejs/icon.svg?raw'),
      files: {
        'index.html': () => import('../project-templates/threejs/index.html?raw'),
        'style.less': () => import('../project-templates/threejs/style.less?raw'),
        'script.js': () => import('../project-templates/threejs/script.js?raw'),
      }
    },
    'lit': {
      config: () => import('../project-templates/lit/.pen.config.json'),
      icon: () => import('../project-templates/lit/icon.svg?raw'),
      files: {
        'index.html': () => import('../project-templates/lit/index.html?raw'),
        'style.less': () => import('../project-templates/lit/style.less?raw'),
        'script.js': () => import('../project-templates/lit/script.js?raw'),
      }
    },
    'preact': {
      config: () => import('../project-templates/preact/.pen.config.json'),
      icon: () => import('../project-templates/preact/icon.svg?raw'),
      files: {
        'index.html': () => import('../project-templates/preact/index.html?raw'),
        'style.less': () => import('../project-templates/preact/style.less?raw'),
        'script.jsx': () => import('../project-templates/preact/script.jsx?raw'),
      }
    },

    'observable': {
      config: () => import('../project-templates/observable/.pen.config.json'),
      icon: () => import('../project-templates/observable/icon.svg?raw'),
      files: {
        'index.html': () => import('../project-templates/observable/index.html?raw'),
        'style.less': () => import('../project-templates/observable/style.less?raw'),
        'script.js': () => import('../project-templates/observable/script.js?raw'),
      }
    },
    'htmx': {
      config: () => import('../project-templates/htmx/.pen.config.json'),
      icon: () => import('../project-templates/htmx/icon.svg?raw'),
      files: {
        'index.html': () => import('../project-templates/htmx/index.html?raw'),
        'style.less': () => import('../project-templates/htmx/style.less?raw'),
        'script.js': () => import('../project-templates/htmx/script.js?raw'),
      }
    },

    'unocss': {
      config: () => import('../project-templates/unocss/.pen.config.json'),
      icon: () => import('../project-templates/unocss/icon.svg?raw'),
      files: {
        'index.html': () => import('../project-templates/unocss/index.html?raw'),
        'style.css': () => import('../project-templates/unocss/style.css?raw'),
        'script.js': () => import('../project-templates/unocss/script.js?raw'),
      }
    }
  }

  for (const [id, loader] of Object.entries(manifest)) {
    try {
      const configModule = await loader.config()
      const config = configModule.default || configModule
      
      const iconModule = await loader.icon()
      const icon = iconModule.default || iconModule

      const files = {}
      for (const [filename, fileLoader] of Object.entries(loader.files)) {
        const fileMod = await fileLoader()
        files[filename] = fileMod.default || fileMod
      }

      const templateMeta = config.template || {}
      const configClean = JSON.parse(JSON.stringify(config))
      delete configClean.template

      templates.push({
        id,
        title: templateMeta.title || id,
        description: templateMeta.description || '',
        icon,
        config: configClean,
        files
      })
    } catch (e) {
      console.warn(`Failed to load browser template ${id}`, e)
    }
  }

  return templates
}

export function listProjectTemplateIds() {
  return ['canvas', 'scss-ts', 'tailwind', 'vanilla', 'vue', 'react', 'solid', 'd3', 'threejs', 'lit', 'preact', 'observable', 'htmx', 'unocss']
}
