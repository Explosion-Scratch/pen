import * as Linkedom from 'linkedom'

const isBrowser = typeof window !== 'undefined'

export function parseHtml(htmlString) {
  if (isBrowser) {
    const parser = new DOMParser()
    return parser.parseFromString(htmlString, 'text/html')
  } else {
    const { document } = Linkedom.parseHTML(htmlString)
    return document
  }
}

export function select(document, selector) {
  return document.querySelector(selector)
}

export function selectAll(document, selector) {
  return document.querySelectorAll(selector)
}

export function serialize(document) {
  if (isBrowser) {
    return `<!DOCTYPE html>\n${document.documentElement.outerHTML}`
  }
  if (!document || !document.documentElement) {
    return '<!DOCTYPE html><html><head></head><body></body></html>'
  }
  return `<!DOCTYPE html>\n${document.documentElement.outerHTML}`
}

export function mergeHead(targetDocument, headHtml) {
  if (isBrowser) {
    const tempDoc = parseHtml(`<html><head>${headHtml}</head></html>`)
    const headNodes = Array.from(tempDoc.head.childNodes)
    for (const node of headNodes) {
      targetDocument.head.appendChild(targetDocument.importNode(node, true))
    }
  } else {
    const { document: tempDoc } = Linkedom.parseHTML(`<html><head>${headHtml}</head></html>`)
    const headNodes = Array.from(tempDoc.head.childNodes)
    for (const node of headNodes) {
      targetDocument.head.appendChild(targetDocument.importNode(node, true))
    }
  }
}

export function injectIntoHead(document, tagType, attributes = {}, content = null) {
  const element = document.createElement(tagType)
  for (const [key, value] of Object.entries(attributes)) {
    element.setAttribute(key, value)
  }
  if (content) {
    element.innerHTML = content
  }
  document.head.appendChild(element)
  return element
}

export function injectIntoBody(document, tagType, attributes = {}, content = null) {
  const element = document.createElement(tagType)
  for (const [key, value] of Object.entries(attributes)) {
    element.setAttribute(key, value)
  }
  if (content) {
    element.innerHTML = content
  }
  document.body.appendChild(element)
  return element
}

export function injectAfterBody(document, tagType, attributes = {}, content = null) {
  const element = document.createElement(tagType)
  for (const [key, value] of Object.entries(attributes)) {
    element.setAttribute(key, value)
  }
  if (content) {
    element.innerHTML = content
  }
  document.documentElement.appendChild(element)

  if (document.documentElement.lastChild !== element) {
      document.documentElement.appendChild(element)
  }
  return element
}

export function createBaseDocument(lang = 'en', title = 'Pen Preview') {
  const html = `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body>
</body>
</html>`
  return parseHtml(html)
}

export function setBodyContent(document, htmlContent) {
  document.body.innerHTML = htmlContent
}

export function removeElement(document, selector) {
  const element = document.querySelector(selector)
  if (element) {
    element.remove()
  }
}

export function updateOrCreateElement(document, selector, tagType, attributes, content, parent = 'head', prepend = false) {
  let element
  try {
    element = selector ? document.querySelector(selector) : null
  } catch {
    element = null
  }
  
  if (element && element.tagName.toLowerCase() !== tagType.toLowerCase()) {
      element.remove()
      element = null
  }

  if (!element) {
    element = document.createElement(tagType)
    const parentNode = parent === 'head' || parent === 'before-head' ? document.head : 
                       parent === 'body' || parent === 'before-body' ? document.body : 
                       document.querySelector(parent) || document.documentElement

    const isPrepend = prepend || parent === 'before-head' || parent === 'before-body'

    if (isPrepend) {
      parentNode.prepend(element)
    } else {
      parentNode.appendChild(element)
    }
  }
  
  for (const [key, value] of Object.entries(attributes)) {
    element.setAttribute(key, value)
  }
  
  if (content !== null) {
    if (tagType === 'script' || tagType === 'style') {
      element.textContent = content
    } else {
      element.innerHTML = content
    }
  }
  return element
}

/**
 * Injects a resource into the document based on its configuration.
 * @param {Document} document 
 * @param {Object} config 
 */
export function injectResourceByConfig(document, config) {
  const { 
    tagType, 
    attrs = {}, 
    srcString = null, 
    injectTo = 'head', 
    injectPosition = 'beforeend',
    id = null
  } = config;

  const element = document.createElement(tagType || (attrs.src ? 'script' : attrs.href ? 'link' : 'style'));
  
  for (const [key, value] of Object.entries(attrs)) {
    if (value !== undefined && value !== null) {
      element.setAttribute(key, String(value));
    }
  }

  if (id) element.id = id;

  if (srcString !== null) {
    if (element.tagName === 'SCRIPT' || element.tagName === 'STYLE') {
      element.textContent = srcString;
    } else {
      element.innerHTML = srcString;
    }
  }

  const target = document.querySelector(injectTo) || (injectTo === 'head' ? document.head : injectTo === 'body' ? document.body : document.documentElement);
  
  if (!target) {
    console.warn(`Injection target "${injectTo}" not found, appending to documentElement`);
    document.documentElement.appendChild(element);
    return;
  }

  // Linkedom support for insertAdjacentElement is often spotty or uses different names
  if (target.insertAdjacentElement) {
    target.insertAdjacentElement(injectPosition, element);
  } else {
    // Fallback logic for environments without insertAdjacentElement
    switch (injectPosition) {
      case 'beforebegin':
        target.parentNode?.insertBefore(element, target);
        break;
      case 'afterbegin':
        target.insertBefore(element, target.firstChild);
        break;
      case 'afterend':
        target.parentNode?.insertBefore(element, target.nextSibling);
        break;
      case 'beforeend':
      default:
        target.appendChild(element);
        break;
    }
  }
}
