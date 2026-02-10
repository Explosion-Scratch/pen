import { readFileSync, existsSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_TEMPLATES_DIR = join(__dirname, '../project-templates')

/**
 * @typedef {Object} ProjectTemplate
 * @property {string} id - folder name
 * @property {string} title
 * @property {string} description
 * @property {string} icon - SVG string
 * @property {Object} config - the .pen.config.json contents
 * @property {Object<string, string>} files - filename -> content
 */

/**
 * @returns {ProjectTemplate[]}
 */
export function loadAllProjectTemplates() {
  if (!existsSync(PROJECT_TEMPLATES_DIR)) return []
  return readdirSync(PROJECT_TEMPLATES_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => loadProjectTemplate(d.name))
    .filter(Boolean)
}

/**
 * @param {string} templateId
 * @returns {ProjectTemplate|null}
 */
export function loadProjectTemplate(templateId) {
  const dir = join(PROJECT_TEMPLATES_DIR, templateId)
  const configPath = join(dir, '.pen.config.json')
  if (!existsSync(configPath)) return null

  const config = JSON.parse(readFileSync(configPath, 'utf-8'))
  if (!config.template) return null

  const iconPath = join(dir, 'icon.svg')
  const icon = existsSync(iconPath) ? readFileSync(iconPath, 'utf-8') : ''

  const files = {}
  for (const editor of config.editors || []) {
    const filePath = join(dir, editor.filename)
    if (existsSync(filePath)) {
      files[editor.filename] = readFileSync(filePath, 'utf-8')
    }
  }

  const templateMeta = config.template
  delete config.template

  return {
    id: templateId,
    title: templateMeta.title || templateId,
    description: templateMeta.description || '',
    icon,
    config,
    files
  }
}

/**
 * @returns {string[]}
 */
export function listProjectTemplateIds() {
  if (!existsSync(PROJECT_TEMPLATES_DIR)) return []
  return readdirSync(PROJECT_TEMPLATES_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
}
