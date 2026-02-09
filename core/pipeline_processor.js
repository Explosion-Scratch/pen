import { getAdapter } from './adapter_registry.js'
import { createBaseDocument, serialize, injectIntoHead, injectIntoBody, updateOrCreateElement } from './dom_utils.js'
import { transformImportsToCdn } from './cdn_transformer.js'

export async function executeSequentialRender(fileMap, config) {
  const document = createBaseDocument('en', config.name || 'Pen Preview')

  const orderedEditors = getEditorOrder(config)

  const markupEditors = orderedEditors.filter(e => {
    const adapter = getAdapter(e.type)
    return adapter.type === 'markup'
  })

  for (const editor of markupEditors) {
    const Adapter = getAdapter(editor.type)
    const adapter = new Adapter()
    adapter.setSettings(editor.settings || {})

    const content = fileMap[editor.filename] || ''
    const rendered = await adapter.render(content, fileMap)

    if (rendered.bodyContent) {
      document.body.innerHTML = rendered.bodyContent
    }
  }

  const styleEditors = orderedEditors.filter(e => {
    const adapter = getAdapter(e.type)
    return adapter.type === 'style'
  })

  for (const editor of styleEditors) {
    const Adapter = getAdapter(editor.type)
    const adapter = new Adapter()
    adapter.setSettings(editor.settings || {})

    const content = fileMap[editor.filename] || ''
    const rendered = await adapter.render(content, fileMap)

    if (rendered.css) {
      updateOrCreateElement(
        document,
        `#pen-style-${editor.type}`,
        'style',
        { id: `pen-style-${editor.type}` },
        rendered.css,
        'head'
      )
    }

    const resources = Adapter.getCdnResources ? Adapter.getCdnResources(editor.settings) : { scripts: [], styles: [] }
    for (const styleUrl of resources.styles || []) {
      injectIntoHead(document, 'link', { rel: 'stylesheet', href: styleUrl })
    }
  }

  const scriptEditors = orderedEditors.filter(e => {
    const adapter = getAdapter(e.type)
    return adapter.type === 'script'
  })

  for (const editor of scriptEditors) {
    const Adapter = getAdapter(editor.type)
    const adapter = new Adapter()
    adapter.setSettings(editor.settings || {})

    const content = fileMap[editor.filename] || ''
    const rendered = await adapter.render(content, fileMap)

    let js = rendered.js || ''
    js = transformImportsToCdn(js)

    updateOrCreateElement(
      document,
      `#pen-script-${editor.type}`,
      'script',
      { id: `pen-script-${editor.type}`, type: 'module' },
      js,
      'body'
    )
  }

  if (config.globalResources) {
    for (const scriptUrl of config.globalResources.scripts || []) {
      injectIntoHead(document, 'script', { src: scriptUrl })
    }
    for (const styleUrl of config.globalResources.styles || []) {
      injectIntoHead(document, 'link', { rel: 'stylesheet', href: styleUrl })
    }
  }

  return serialize(document)
}

export function getEditorOrder(config) {
  const typeOrder = { markup: 0, style: 1, script: 2 }

  return [...config.editors].sort((a, b) => {
    const adapterA = getAdapter(a.type)
    const adapterB = getAdapter(b.type)
    return (typeOrder[adapterA.type] || 3) - (typeOrder[adapterB.type] || 3)
  })
}
