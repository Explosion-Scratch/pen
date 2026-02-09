import { HTMLAdapter } from '../adapters/markup/html_adapter.js'
import { PugAdapter } from '../adapters/markup/pug_adapter.js'
import { SlimAdapter } from '../adapters/markup/slim_adapter.js'
import { CSSAdapter } from '../adapters/style/css_adapter.js'
import { SASSAdapter } from '../adapters/style/sass_adapter.js'
import { LESSAdapter } from '../adapters/style/less_adapter.js'
import { StylusAdapter } from '../adapters/style/stylus_adapter.js'
import { JavaScriptAdapter } from '../adapters/script/javascript_adapter.js'
import { TypeScriptAdapter } from '../adapters/script/typescript_adapter.js'

const adapters = new Map([
  ['html', HTMLAdapter],
  ['pug', PugAdapter],
  ['slim', SlimAdapter],
  ['css', CSSAdapter],
  ['sass', SASSAdapter],
  ['less', LESSAdapter],
  ['stylus', StylusAdapter],
  ['javascript', JavaScriptAdapter],
  ['typescript', TypeScriptAdapter]
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
    description: Adapter.description
  }))
}

export function getAdaptersByCategory(category) {
  return Array.from(adapters.values())
    .filter(Adapter => Adapter.type === category)
    .map(Adapter => ({
      id: Adapter.id,
      type: Adapter.type,
      name: Adapter.name,
      description: Adapter.description
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
    mimeType: Adapter.mimeType
  }
}
