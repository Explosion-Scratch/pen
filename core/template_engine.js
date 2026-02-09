import Handlebars from 'handlebars'
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const TEMPLATES_DIR = join(__dirname, '../templates')

export function renderTemplate(templateString, variables = {}) {
  const compiled = Handlebars.compile(templateString)
  return compiled(variables)
}

export function loadAdapterTemplate(adapterId) {
  const templatePath = join(TEMPLATES_DIR, `${adapterId}.hbs`)
  if (!existsSync(templatePath)) {
    return null
  }
  return readFileSync(templatePath, 'utf-8')
}

export function loadAndRenderTemplate(adapterId, variables = {}) {
  const template = loadAdapterTemplate(adapterId)
  if (!template) {
    return ''
  }
  return renderTemplate(template, variables)
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
