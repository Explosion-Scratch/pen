import { getAdapter } from "./adapter_registry.js";
import { SourceMapBuilder } from "./source_map_builder.js";
import {
  createBaseDocument,
  serialize,
  mergeHead,
  injectResourceByConfig,
} from "./dom_utils.js";
import { transformImportsToCdn } from "./cdn_transformer.js";
import { CompileError } from "./errors.js";
import { ResourceManager } from "./resource_manager.js";



/**
 * @param {Object} fileMap
 * @param {Object} config
 * @param {Object} [options]
 * @param {boolean} [options.dev=false]
 * @returns {Promise<string>}
 */
export async function executeSequentialRender(fileMap, config, options = {}) {
  const document = createBaseDocument("en", config.name || "Pen Preview");
  const orderedEditors = getEditorOrder(config);
  const importOverrides = config.importOverrides || {};
  const errors = [];
  const resourceManager = new ResourceManager();

  let injectDev = options.dev;
  if (config.preview && config.preview.injectDevTools === false) {
    injectDev = false;
  } else if (config.preview && config.preview.injectDevTools === true) {
    injectDev = options.dev;
  }

  // Register Global Resources
  injectGlobalResources(resourceManager, config);

  // Register System Resources (Dev tools, etc)
  if (injectDev && !options.standalone) {
    resourceManager.add(getLocationShimResource());
    resourceManager.add(getErrorListenerResource());
    for (const res of getDebugScriptResources()) {
      resourceManager.add(res);
    }
  }

  for (const editor of orderedEditors) {
    try {
      const Adapter = getAdapter(editor.type);
      const adapter = new Adapter();
      adapter.setSettings({ ...(editor.settings || {}), importOverrides, _generateSourceMaps: !!injectDev });

      const content = fileMap[editor.filename] || "";
      const rendered = await adapter.render(content, fileMap);

      // Handle adapter-provided resources
      const adapterResources = Adapter.getCdnResources?.(editor.settings) || {};
      if (adapterResources.styles) {
        for (const styleUrl of adapterResources.styles) {
          resourceManager.add({ type: 'link', attrs: { rel: 'stylesheet', href: styleUrl }, priority: 5 });
        }
      }
      if (adapterResources.scripts) {
        for (const scriptUrl of adapterResources.scripts) {
          resourceManager.add({ type: 'script', attrs: { src: scriptUrl }, priority: 5 });
        }
      }
      if (adapterResources.bodyScripts) {
         for (const scriptDef of adapterResources.bodyScripts) {
            resourceManager.add({ 
              type: 'script', 
              ...(typeof scriptDef === 'string' ? { attrs: { src: scriptDef } } : { attrs: { src: scriptDef.src, ...(scriptDef.attrs || {}) }, type: scriptDef.type }),
              priority: 15 
            });
         }
      }

      if (Adapter.type === "markup") {
        injectMarkup(document, rendered);
        
        if (injectDev && editor.filename && content) {
             const htmlMapResource = getHtmlSourceMapResource(editor.filename, content);
             resourceManager.add(htmlMapResource);
        }

      } else if (Adapter.type === "style") {
        // Use SourceMapBuilder for Styles (CSS)
        // Note: For now we are still keeping one style block per editor for simplicity in DOM insertion,
        // but we can generate a source map for it.
        const styleId = `pen-style-${editor.type}`;
        
        // If the adapter returned a map, we use it. If not, we generate identity.
        let cssBuilder = new SourceMapBuilder('style.css'); // Virtual filename for the chunk
        let cssCode = rendered.css || "";
        
        if (editor.filename && cssCode) {
           if (injectDev) {
               cssCode = cssCode.replace(/\/\*#\s*sourceMappingURL=.*?\*\//g, '').trimEnd();
               if (rendered.map) {
                 cssBuilder.addWithMap(cssCode, rendered.map, editor.filename, content);
               } else {
                 cssBuilder.add(cssCode, editor.filename, content);
               }
               cssCode += `\n/*# sourceMappingURL=${cssBuilder.toDataURL()} */`;
           }
        }

        resourceManager.add({
          id: styleId,
          tagType: 'style',
          attrs: { id: styleId, type: rendered.styleType || "text/css" },
          srcString: cssCode,
          priority: editor.settings?.priority || 20,
          injectTo: editor.settings?.injectTo || 'head',
          injectPosition: editor.settings?.injectPosition || 'beforeend'
        });
      } else if (Adapter.type === "script") {
        let js = rendered.js || "";
        
        // Transform imports BEFORE mapping? 
        // If we transform imports, we break source maps unless we use a proper transformer that preserves maps.
        // Current 'transformImportsToCdn' is a simple regex replace usually. 
        // For accurate maps, we should ideally parse-transform-generate with maps.
        // For now, let's assume transform doesn't shift lines too much or we accept the slight drift,
        // OR we apply the transform on the 'js' result.
        
        js = transformImportsToCdn(js, importOverrides);
        
        const scriptType = editor.settings?.moduleType === "classic" ? "text/javascript" : "module";
        const scriptId = `pen-script-${editor.type}`;

        let jsBuilder = new SourceMapBuilder('script.js');
        if (editor.filename && js) {
          if (injectDev) {
              js = js.replace(/\/\/# sourceMappingURL=.*/g, '').trimEnd();
              if (rendered.map) {
                jsBuilder.addWithMap(js, rendered.map, editor.filename, content);
              } else {
                jsBuilder.add(js, editor.filename, content);
              }
              jsBuilder.addRaw(`\n//# sourceMappingURL=${jsBuilder.toDataURL()}`);
              js = jsBuilder.toString();
          }
        }

        resourceManager.add({
          id: scriptId,
          tagType: 'script',
          attrs: { id: scriptId, type: scriptType },
          srcString: js,
          priority: editor.settings?.priority || 30,
          injectTo: editor.settings?.injectTo || 'body',
          injectPosition: editor.settings?.injectPosition || 'beforeend'
        });
      }
    } catch (err) {
      console.error(`Error processing ${editor.filename}:`, err);
      if (err instanceof CompileError) {
        errors.push(err);
      } else {
        errors.push(
          new CompileError(err.message, {
            adapterId: editor.type,
            filename: editor.filename,
            title: "Processing Error",
            originalError: err,
          }),
        );
      }
    }
  }

  // Group resources by target and position to handle stack-like insertion
  const groups = [];
  const groupMap = new Map();

  for (const res of resourceManager.getAllSorted()) {
    const key = `${res.injectTo}:${res.injectPosition}`;
    if (!groupMap.has(key)) {
      const g = { target: res.injectTo, position: res.injectPosition, items: [] };
      groups.push(g);
      groupMap.set(key, g);
    }
    groupMap.get(key).items.push(res);
  }

  // Inject groups
  for (const group of groups) {
    // For positions that naturally stack in reverse (LIFO behavior),
    // we reverse the sorted items so that lower priority ends up 
    // being inserted last, which places it closer to the target
    // (and thus earlier in the document relative to others in its group).
    if (group.position === 'afterbegin' || group.position === 'afterend') {
      group.items.reverse();
    }
    
    for (const resConfig of group.items) {
      injectResourceByConfig(document, resConfig);
    }
  }

  let finalHtml = serialize(document);
  
  // Source mapping for markup is handled inside injectMarkup now


  return { html: finalHtml, errors };
}

function getErrorListenerResource() {
  const errorScript = `
    (function() {
      function sendError(error) {
        if (error.filename && error.filename.includes('chobitsu')) return;
        window.parent.postMessage({
          type: 'PEN_ERROR',
          error: {
            message: error.message || 'Unknown Error',
            filename: error.filename,
            line: error.lineno || error.line,
            column: error.colno || error.column,
            stack: error.error ? error.error.stack : null
          }
        }, '*');
      }
      window.onerror = function(message, source, lineno, colno, error) {
        sendError({ message, filename: source, lineno, colno, error });
        return false;
      };
      window.addEventListener('unhandledrejection', function(event) {
        sendError({
          message: 'Unhandled Promise Rejection: ' + (event.reason ? (event.reason.message || event.reason) : 'Unknown'),
          error: event.reason
        });
      });
    })();
  `;
  return {
    id: 'pen-error-listener',
    tagType: 'script',
    attrs: { id: 'pen-error-listener' },
    srcString: errorScript,
    priority: 1,
    injectTo: 'head',
    injectPosition: 'afterbegin'
  };
}

function getLocationShimResource() {
  const shimScript = `(function() {
  const h = window.location.hash || '';
  const m = h.match(/#__pen=([A-Za-z0-9+/=]+)/);
  if (!m) return;
  let penData = { s: '', h: '' };
  try { penData = JSON.parse(atob(m[1])); } catch(e) { return; }
  let mockSearch = penData.s || '';
  let mockHash = penData.h || '';
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
  const OriginalURLSearchParams = window.URLSearchParams;
  window.URLSearchParams = class extends OriginalURLSearchParams {
    constructor(init) { super((init === undefined || init === '') && mockSearch ? mockSearch : init); }
  };
  const OriginalURL = window.URL;
  function PatchedURL(url, base) {
    const u = (url === window.location) ? window.location.href : url;
    const instance = new OriginalURL(u, base);
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
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;
  const updateMockFromUrl = (url) => {
    if (!url) return;
    try {
      const base = window.location.origin + window.location.pathname;
      const temp = new OriginalURL(url, base + mockSearch + mockHash);
      mockSearch = temp.search;
      mockHash = temp.hash;
    } catch(e) {}
  };
  history.pushState = function(state, title, url) { if (url) updateMockFromUrl(url); try { return originalPushState.apply(this, arguments); } catch(e) {} };
  history.replaceState = function(state, title, url) { if (url) updateMockFromUrl(url); try { return originalReplaceState.apply(this, arguments); } catch(e) {} };
  try { Object.defineProperty(document, 'URL', { get: () => window.location.href, configurable: true }); } catch(e) {}
})();`;
  return {
    id: 'pen-location-shim',
    tagType: 'script',
    attrs: { id: 'pen-location-shim' },
    srcString: shimScript,
    priority: 0, // Earliest
    injectTo: 'head',
    injectPosition: 'afterbegin'
  };
}

function getDebugScriptResources() {
  // Chobitsu loaded synchronously via script tag (like Solid Playground)
  const chobitsuScript = {
    id: 'pen-chobitsu',
    tagType: 'script',
    attrs: { id: 'pen-chobitsu', src: 'https://cdn.jsdelivr.net/npm/chobitsu' },
    priority: 1,
    injectTo: 'head',
    injectPosition: 'afterbegin'
  };

  // Bridge script: simple relay matching the Solid Playground pattern.
  // chobitsu is already globally available from the sync script above.
  const bridgeScript = `
    if (typeof chobitsu === 'undefined') {
      console.warn('Pen: Chobitsu not loaded (offline?). DevTools bridge disabled.');
    } else {
    const sendToDevtools = (message) => {
      window.parent.postMessage(JSON.stringify(message), '*');
    };
    let id = 0;
    const sendToChobitsu = (message) => {
      message.id = 'tmp' + ++id;
      chobitsu.sendRawMessage(JSON.stringify(message));
    };

    chobitsu.setOnMessage((message) => {
      if (message.includes('"id":"tmp')) return;
      window.parent.postMessage(message, '*');
    });

    window.addEventListener('message', ({ data }) => {
      try {
        const { event } = data;
        if (event === 'DEV') {
          chobitsu.sendRawMessage(data.data);
        } else if (event === 'LOADED') {
          sendToDevtools({
            method: 'Page.frameNavigated',
            params: {
              frame: {
                id: '1',
                mimeType: 'text/html',
                securityOrigin: location.origin,
                url: location.href,
              },
              type: 'Navigation',
            },
          });
          sendToChobitsu({ method: 'Network.enable' });
          sendToDevtools({ method: 'Runtime.executionContextsCleared' });
          sendToChobitsu({ method: 'Runtime.enable' });
          sendToChobitsu({ method: 'Debugger.enable' });
          sendToChobitsu({ method: 'DOMStorage.enable' });
          sendToChobitsu({ method: 'DOM.enable' });
          sendToChobitsu({ method: 'CSS.enable' });
          sendToChobitsu({ method: 'Overlay.enable' });
          sendToDevtools({ method: 'DOM.documentUpdated' });
        }
      } catch (e) {
        console.error(e);
      }
    });
    console.clear();
    }
  `;

  const bridgeResource = {
    id: 'pen-debug-bridge',
    tagType: 'script',
    attrs: { id: 'pen-debug-bridge', type: 'module' },
    srcString: bridgeScript,
    priority: 2,
    injectTo: 'head',
    injectPosition: 'afterbegin'
  };

  return [chobitsuScript, bridgeResource];
}

function injectMarkup(document, rendered) {
  let bodyHtml = rendered.bodyContent || "";
  let headHtml = rendered.headContent || "";
  const htmlAttrs = rendered.htmlAttributes || {};
  if (bodyHtml && (/\<html/i.test(bodyHtml) || /<!DOCTYPE/i.test(bodyHtml))) {
    const { document: tempDoc } = parseHTML(bodyHtml);
    bodyHtml = tempDoc.body.innerHTML;
    headHtml += tempDoc.head.innerHTML;
    for (const attr of tempDoc.documentElement.attributes) { htmlAttrs[attr.name] = attr.value; }
  }
  if (bodyHtml) {
      document.body.innerHTML = bodyHtml;
  }
  if (headHtml) mergeHead(document, headHtml);
  for (const [key, value] of Object.entries(htmlAttrs)) { document.documentElement.setAttribute(key, value); }
}

function getHtmlSourceMapResource(filename, content) {
  // Minimal JS placeholder
  const jsCode = `export const placeholder = {};`;

  // Source map with original content embedded
  const sourceMap = {
    version: 3,
    file: "virtual-html.js",       // The compiled JS file
    sources: [filename],     // Original filename
    sourcesContent: [content], // Embed the full content here
    names: [],
    mappings: ""             // empty works for file-level mapping
  };

  // Encode source map as base64 data URL
  const base64Map = (typeof btoa === 'function' ? btoa : (str) => Buffer.from(str).toString('base64'))(unescape(encodeURIComponent(JSON.stringify(sourceMap))));
  const sourceMapURL = `data:application/json;base64,${base64Map}`;

  // Combine JS and source map
  const finalCode = `${jsCode}\n//# sourceMappingURL=${sourceMapURL}`;

  return {
      id: 'pen-html-sourcemap',
      tagType: 'script',
      attrs: { type: 'module' },
      srcString: finalCode,
      priority: 100, // Very low priority
      injectTo: 'body',
      injectPosition: 'beforeend'
  };
}

function injectGlobalResources(resourceManager, config) {
  if (!config.globalResources) return;
  
  // Scripts
  for (const scriptDef of config.globalResources.scripts || []) {
    const isString = typeof scriptDef === "string";
    resourceManager.add({
      tagType: 'script',
      priority: 10,
      injectTo: 'head',
      injectPosition: 'beforeend',
      ...(isString ? { attrs: { src: scriptDef } } : { 
        attrs: { src: scriptDef.src, type: scriptDef.type, ...(scriptDef.attrs || {}) }, 
        srcString: scriptDef.srcString,
        priority: scriptDef.priority,
        injectTo: scriptDef.injectTo,
        injectPosition: scriptDef.injectPosition
      })
    });
  }

  // Styles
  for (const styleDef of config.globalResources.styles || []) {
    const isString = typeof styleDef === "string";
    resourceManager.add({
      tagType: 'link',
      priority: 10,
      injectTo: 'head',
      injectPosition: 'beforeend',
      ...(isString ? { attrs: { rel: 'stylesheet', href: styleDef } } : { 
        attrs: { rel: 'stylesheet', href: styleDef.href, ...(styleDef.attrs || {}) }, 
        srcString: styleDef.srcString,
        priority: styleDef.priority,
        injectTo: styleDef.injectTo,
        injectPosition: styleDef.injectPosition
      })
    });
  }

  // Body Scripts (legacy/special)
  if (config.globalResources.bodyScripts) {
    for (const scriptDef of config.globalResources.bodyScripts) {
      const isString = typeof scriptDef === "string";
      resourceManager.add({
        tagType: 'script',
        priority: 15, // Default for body scripts
        injectTo: 'body',
        injectPosition: 'beforeend',
        ...(isString ? { attrs: { src: scriptDef } } : { 
          attrs: { src: scriptDef.src, type: scriptDef.type, ...(scriptDef.attrs || {}) }, 
          srcString: scriptDef.srcString,
          priority: scriptDef.priority,
          injectTo: scriptDef.injectTo,
          injectPosition: scriptDef.injectPosition
        })
      });
    }
  }
}

/**
 * @param {Object} config
 * @returns {Object[]}
 */
export function getEditorOrder(config) {
  const typeOrder = { markup: 0, style: 1, script: 2 };
  return [...config.editors].sort((a, b) => {
    const adapterA = getAdapter(a.type);
    const adapterB = getAdapter(b.type);
    const valA = typeOrder[adapterA.type] ?? 3;
    const valB = typeOrder[adapterB.type] ?? 3;
    return valA - valB;
  });
}
