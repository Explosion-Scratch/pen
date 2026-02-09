export const PenConfigStructure = {
  name: 'string',
  version: 'string',
  editors: [
    {
      type: 'adapter_id',
      filename: 'string',
      settings: 'object'
    }
  ],
  globalResources: {
    scripts: ['string'],
    styles: ['string']
  }
}

export function validateConfig(config) {
  if (!config.name || typeof config.name !== 'string') {
    throw new Error('Config must have a name (string)')
  }
  if (!config.version || typeof config.version !== 'string') {
    throw new Error('Config must have a version (string)')
  }
  if (!Array.isArray(config.editors)) {
    throw new Error('Config must have an editors array')
  }
  for (const editor of config.editors) {
    if (!editor.type || typeof editor.type !== 'string') {
      throw new Error('Each editor must have a type (string)')
    }
    if (!editor.filename || typeof editor.filename !== 'string') {
      throw new Error('Each editor must have a filename (string)')
    }
  }
  return true
}

export function createDefaultConfig(name = 'untitled') {
  return {
    name,
    version: '1.0.0',
    editors: [],
    globalResources: {
      scripts: [],
      styles: []
    }
  }
}
