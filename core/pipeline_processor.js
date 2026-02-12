// Basic DOM Utils for SSR/Node. Browser uses native DOM.
import { parseHTML } from 'linkedom'
const isBrowser = typeof window !== 'undefined'

import { getAdapter } from './adapter_registry.js'
import { createBaseDocument, serialize, injectIntoHead, injectAfterBody, mergeHead, updateOrCreateElement } from './dom_utils.js'
import { transformImportsToCdn } from './cdn_transformer.js'
import { CompileError } from './errors.js'

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
  const errors = []

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
    try {
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
    } catch (err) {
      console.error(`Error processing ${editor.filename}:`, err)
      if (err instanceof CompileError) {
        errors.push(err)
      } else {
        errors.push(new CompileError(err.message, {
          adapterId: editor.type,
          filename: editor.filename,
          title: 'Processing Error',
          originalError: err
        }))
      }
    }
  }

  injectGlobalResources(document, config)
  
  if (injectDev) {
    injectLocationShim(document)
    injectDebugScript(document)
  }

  const finalHtml = serialize(document)
  return { html: finalHtml, errors }
}

function injectLocationShim(document) {
  const shimScript = `(function() {
  const h = window.location.hash || '';
  const m = h.match(/#__pen=([A-Za-z0-9+/=]+)/);
  if (!m) return;
  
  let penData = { s: '', h: '' };
  try { penData = JSON.parse(atob(m[1])); } catch(e) { return; }
  console.log('Pen: Location shim active', penData);
  // Mutable state for history API
  let mockSearch = penData.s || '';
  let mockHash = penData.h || '';
  
  // 1. Patch Location (prototype & instance)
  // We try-catch extensively because 'location' properties are often unforgeable
  const targets = [window.Location ? window.Location.prototype : window.location, window.location];
  targets.forEach(t => {
    try {
      const getMockHref = () => {
        const base = window.location.origin + window.location.pathname;
        return base + mockSearch + mockHash;
      };

      Object.defineProperties(t, {
        search: { get: () => mockSearch, configurable: true },
        hash: { get: () => mockHash, configurable: true },
        href: { get: getMockHref, configurable: true },
        toString: { value: getMockHref, configurable: true }
      });
    } catch(e) {}
  });

  // 2. Patch URLSearchParams
  // This ensures 'new URLSearchParams(location.search)' works even if location.search is empty (unpatched)
  // by falling back to mockSearch when input is empty.
  const OriginalURLSearchParams = window.URLSearchParams;
  class PatchedURLSearchParams extends OriginalURLSearchParams {
    constructor(init) {
      if ((init === undefined || init === '') && mockSearch) {
        super(mockSearch);
      } else {
        super(init);
      }
    }
  }
  window.URLSearchParams = PatchedURLSearchParams;

  // 3. Patch URL constructor
  const OriginalURL = window.URL;
  function PatchedURL(url, base) {
    const u = (url === window.location) ? window.location.href : url;
    const instance = new OriginalURL(u, base);
    
    // If we detect the magic hash, hydrate the instance
    if (typeof u === 'string' && u.includes('#__pen=')) {
      const match = u.match(/#__pen=([A-Za-z0-9+/=]+)/);
      if (match) {
        try {
          const d = JSON.parse(atob(match[1]));
          const s = d.s || '';
          const h = d.h || '';
          const baseHref = instance.href.replace(/#__pen=.*$/, '');
          const fullHref = baseHref + s + h;
          const sp = new OriginalURLSearchParams(s);
          
          Object.defineProperties(instance, {
            search: { get: () => s, configurable: true },
            hash: { get: () => h, configurable: true },
            href: { get: () => fullHref, configurable: true },
            searchParams: { get: () => sp, configurable: true },
            toString: { value: () => fullHref, configurable: true }
          });
        } catch(e) {}
      }
    }
    return instance;
  }
  PatchedURL.prototype = OriginalURL.prototype;
  PatchedURL.createObjectURL = OriginalURL.createObjectURL;
  PatchedURL.revokeObjectURL = OriginalURL.revokeObjectURL;
  window.URL = PatchedURL;

  // 4. Patch History API
  // Allows SPAs to update the URL (mock state) without breaking out of the sandbox/iframe
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;
  
  const updateMockFromUrl = (url) => {
    if (!url) return;
    try {
      // Create a URL object to parse the new path/search/hash
      // We use the current mock location as base
      const base = window.location.origin + window.location.pathname;
      const temp = new OriginalURL(url, base + mockSearch + mockHash);
      
      // Update our mutable state
      mockSearch = temp.search;
      mockHash = temp.hash;
    } catch(e) {
      console.warn('Pen: Failed to parse history URL', e);
    }
  };

  history.pushState = function(state, title, url) {
    if (url) updateMockFromUrl(url);
    try {
      return originalPushState.apply(this, arguments);
    } catch(e) {
      // In sandboxed iframes or blobs, pushState might fail. 
      // We swallow the error so the app continues running with our mocked state.
      console.debug('Pen: history.pushState prevented by environment, state mocked.');
    }
  };
  
  history.replaceState = function(state, title, url) {
    if (url) updateMockFromUrl(url);
    try {
      return originalReplaceState.apply(this, arguments);
    } catch(e) {
      console.debug('Pen: history.replaceState prevented by environment, state mocked.');
    }
  };

  // 5. Patch document properties
  try {
    Object.defineProperty(document, 'URL', { 
      get: () => window.location.href, 
      configurable: true 
    });
  } catch(e) {}

  console.log('Pen: Location shim active (SearchParams, History, URL)');
})();`;

  const script = document.createElement('script');
  script.id = 'pen-location-shim';
  script.textContent = shimScript;
  if (document.head) {
    document.head.insertBefore(script, document.head.firstChild);
  } else if (document.documentElement) {
    document.documentElement.insertBefore(script, document.documentElement.firstChild);
  }
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
