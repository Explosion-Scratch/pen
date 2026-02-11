// Basic DOM Utils for SSR/Node. Browser uses native DOM.
import { parseHTML } from 'linkedom'
const isBrowser = typeof window !== 'undefined'

import { getAdapter } from './adapter_registry.js'
import { createBaseDocument, serialize, injectIntoHead, injectAfterBody, mergeHead, updateOrCreateElement } from './dom_utils.js'
import { transformImportsToCdn } from './cdn_transformer.js'

/**
 * @param {Object} fileMap
 * @param {Object} config
 * @param {Object} [options]
 * @param {boolean} [options.dev=false]
 * @returns {Promise<string>}
 */
export async function executeSequentialRender(fileMap, config, options = {}) {
  const document = createBaseDocument('en', config.name || 'Pen Preview')
  const orderedEditors = getEditorOrder(config)
  const importOverrides = config.importOverrides || {}

  // Determine if we should inject devtools
  // Default to the dev option, but allow config to override
  let injectDev = options.dev
  if (config.preview && config.preview.injectDevTools === false) {
    injectDev = false
  } else if (config.preview && config.preview.injectDevTools === true) {
    // If explicitly true in config, maybe allow it in production too?
    // But user said "only the editor should when building" in their e.g.
    // So let's stick to: dev option is the primary driver, config can disable it.
    injectDev = options.dev
  }

  for (const editor of orderedEditors) {
    const Adapter = getAdapter(editor.type)
    const adapter = new Adapter()
    adapter.setSettings({ ...(editor.settings || {}), importOverrides })

    const content = fileMap[editor.filename] || ''
    const rendered = await adapter.render(content, fileMap)

    if (Adapter.type === 'markup') {
      injectMarkup(document, rendered)
    } else if (Adapter.type === 'style') {
      injectStyle(document, editor, Adapter, rendered)
    } else if (Adapter.type === 'script') {
      injectScript(document, editor, rendered, importOverrides)
    }
  }

  injectGlobalResources(document, config)
  
  if (injectDev) {
    injectDebugScript(document)
  }

  const finalHtml = serialize(document)
  return finalHtml
}

function injectDebugScript(document) {
  const debugScript = `
    import chobitsu from 'https://esm.sh/chobitsu';
    window.chobitsu = chobitsu;
    
    // Connect Chobitsu to parent window (DevTools bridge)
    chobitsu.setOnMessage((message) => {
      window.parent.postMessage(message, '*');
    });
    
    window.addEventListener('message', (event) => {
      // Basic security check - in production you'd want to check origin
      if (event.data && event.data.event === 'DEV') {
        try {
          chobitsu.sendRawMessage(event.data.data);
        } catch (e) {
          console.error('Failed to send message to Chobitsu:', e);
        }
      }
    });

    // Initialize
    console.log('DevTools Bridge Initialized');
  `
  
  updateOrCreateElement(
    document,
    'pen-debug-bridge',
    'script',
    { id: 'pen-debug-bridge', type: 'module' },
    debugScript,
    'head',
    true
  )
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
      rendered.css + (editor.filename ? `\n\n/*# sourceURL=${editor.filename} */` : ''),
      'head'
    )
  }
  const resources = Adapter.getCdnResources?.(editor.settings) || { scripts: [], styles: [] }
  for (const styleUrl of resources.styles || []) {
    injectIntoHead(document, 'link', { rel: 'stylesheet', href: styleUrl })
  }
  for (const scriptUrl of resources.scripts || []) {
    injectIntoHead(document, 'script', { src: scriptUrl })
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
  // Inject global scripts into HEAD for better library availability
  for (const scriptUrl of config.globalResources.scripts || []) {
    injectIntoHead(document, 'script', { src: scriptUrl })
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
    return valA - valB
  })
}
