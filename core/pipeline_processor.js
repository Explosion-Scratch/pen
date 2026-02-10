import { parseHTML } from 'linkedom'
import { getAdapter } from './adapter_registry.js'
import { createBaseDocument, serialize, injectIntoHead, injectAfterBody, mergeHead, updateOrCreateElement } from './dom_utils.js'
import { transformImportsToCdn } from './cdn_transformer.js'

/**
 * @param {Object} fileMap
 * @param {Object} config
 * @returns {Promise<string>}
 */
export async function executeSequentialRender(fileMap, config) {
  const document = createBaseDocument('en', config.name || 'Pen Preview')
  const orderedEditors = getEditorOrder(config)
  const importOverrides = config.importOverrides || {}

  for (const editor of orderedEditors) {
    const Adapter = getAdapter(editor.type)
    const adapter = new Adapter()
    adapter.setSettings({ ...(editor.settings || {}), importOverrides })

    const content = fileMap[editor.filename] || ''
    const rendered = await adapter.render(content, fileMap)

    console.log(`[DEBUG] Filename: ${editor.filename}, Category: ${Adapter.type}, Content Length: ${content.length}`)
    if (Adapter.type === 'markup') {
      injectMarkup(document, rendered)
    } else if (Adapter.type === 'style') {
      injectStyle(document, editor, Adapter, rendered)
    } else if (Adapter.type === 'script') {
      console.log(`[DEBUG] Injecting script for ${editor.filename}... JS content length: ${rendered.js?.length || 0}`)
      injectScript(document, editor, rendered, importOverrides)
    }
  }

  injectGlobalResources(document, config)
  const finalHtml = serialize(document)
  console.log(`[DEBUG] Final HTML Length: ${finalHtml.length}, Head has script: ${finalHtml.includes('pen-script')}`)
  return finalHtml
}

function injectMarkup(document, rendered) {
  let bodyHtml = rendered.bodyContent || ''
  let headHtml = rendered.headContent || ''
  const htmlAttrs = rendered.htmlAttributes || {}

  if (bodyHtml && (/\<html/i.test(bodyHtml) || /<!DOCTYPE/i.test(bodyHtml))) {
    const { document: tempDoc } = parseHTML(bodyHtml)
    bodyHtml = tempDoc.body.innerHTML
    headHtml += tempDoc.head.innerHTML
    for (const attr of tempDoc.documentElement.attributes) {
      htmlAttrs[attr.name] = attr.value
    }
  }

  if (bodyHtml) document.body.innerHTML = bodyHtml
  if (headHtml) mergeHead(document, headHtml)
  for (const [key, value] of Object.entries(htmlAttrs)) {
    document.documentElement.setAttribute(key, value)
  }
}

function injectStyle(document, editor, Adapter, rendered) {
  if (rendered.css) {
    updateOrCreateElement(
      document,
      `#pen-style-${editor.type}`,
      'style',
      { id: `pen-style-${editor.type}`, type: rendered.styleType || 'text/css' },
      rendered.css,
      'head'
    )
  }
  const resources = Adapter.getCdnResources?.(editor.settings) || { scripts: [], styles: [] }
  for (const styleUrl of resources.styles || []) {
    injectIntoHead(document, 'link', { rel: 'stylesheet', href: styleUrl })
  }
}

function injectScript(document, editor, rendered, importOverrides) {
  let js = rendered.js || ''
  js = transformImportsToCdn(js, importOverrides)
  
  // Respect moduleType setting, default to 'module'
  const scriptType = editor.settings?.moduleType === 'classic' ? 'text/javascript' : 'module'
  
  updateOrCreateElement(
    document,
    `#pen-script-${editor.type}`,
    'script',
    { id: `pen-script-${editor.type}`, type: scriptType },
    js,
    'after-body'
  )
}

function injectGlobalResources(document, config) {
  if (!config.globalResources) return
  for (const scriptUrl of config.globalResources.scripts || []) {
    injectAfterBody(document, 'script', { src: scriptUrl })
  }
  for (const styleUrl of config.globalResources.styles || []) {
    injectIntoHead(document, 'link', { rel: 'stylesheet', href: styleUrl })
  }
}

/**
 * @param {Object} config
 * @returns {Object[]}
 */
export function getEditorOrder(config) {
  const typeOrder = { markup: 0, style: 1, script: 2 }
  return [...config.editors].sort((a, b) => {
    const adapterA = getAdapter(a.type)
    const adapterB = getAdapter(b.type)
    const valA = typeOrder[adapterA.type] ?? 3
    const valB = typeOrder[adapterB.type] ?? 3
    console.log(`[SORT] Comparing ${a.filename} (${adapterA.type}: ${valA}) with ${b.filename} (${adapterB.type}: ${valB}) result: ${valA - valB}`)
    return valA - valB
  })
}
