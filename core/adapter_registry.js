import { HTMLAdapter } from '../adapters/markup/html_adapter.js'
import { CSSAdapter } from '../adapters/style/css_adapter.js'
import { SASSAdapter } from '../adapters/style/sass_adapter.js'
import { LESSAdapter } from '../adapters/style/less_adapter.js'
import { JavaScriptAdapter } from '../adapters/script/javascript_adapter.js'
import { TypeScriptAdapter } from '../adapters/script/typescript_adapter.js'
import { JSXAdapter } from '../adapters/script/jsx_adapter.js'
import { PythonAdapter } from '../adapters/script/python_adapter.js'

const adapters = new Map([
  ['html', HTMLAdapter],
  ['css', CSSAdapter],
  ['sass', SASSAdapter],
  ['less', LESSAdapter],
  ['javascript', JavaScriptAdapter],
  ['typescript', TypeScriptAdapter],
  ['jsx', JSXAdapter],
  ['python', PythonAdapter],
])

export function getAdapter(adapterId) {
  const AdapterClass = adapters.get(adapterId)
  if (!AdapterClass) {
    throw new Error(`Unknown adapter: ${adapterId}`)
  }
  return AdapterClass
}

export function getAllAdapters() {
  return Array.from(adapters.values()).map(Adapter => ({
    id: Adapter.id,
    type: Adapter.type,
    name: Adapter.name,
    description: Adapter.description,
    fileExtension: Adapter.fileExtension,
    compileTargets: Adapter.compileTargets || [],
    canMinify: Adapter.canMinify || false,
    schema: Adapter.getSchema?.() || {}
  }))
}

export function getAdaptersByCategory(category) {
  return Array.from(adapters.values())
    .filter(Adapter => Adapter.type === category)
    .map(Adapter => ({
      id: Adapter.id,
      type: Adapter.type,
      name: Adapter.name,
      description: Adapter.description,
      fileExtension: Adapter.fileExtension,
      compileTargets: Adapter.compileTargets || [],
      canMinify: Adapter.canMinify || false,
      schema: Adapter.getSchema?.() || {}
    }))
}

export function getAdapterMetadata(adapterId) {
  const Adapter = getAdapter(adapterId)
  return {
    id: Adapter.id,
    type: Adapter.type,
    name: Adapter.name,
    description: Adapter.description,
    extends: Adapter.extends,
    fileExtension: Adapter.fileExtension,
    mimeType: Adapter.mimeType,
    compileTargets: Adapter.compileTargets || [],
    canMinify: Adapter.canMinify || false,
    schema: Adapter.getSchema?.() || {}
  }
} 
