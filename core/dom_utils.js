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
  // Ensure it's the last child
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

export function updateOrCreateElement(document, selector, tagType, attributes, content, parent = 'head') {
  let element
  try {
    element = document.querySelector(selector)
  } catch {
    element = null
  }
  
  // If we found an element but it's the wrong tag type, remove it and recreate
  if (element && element.tagName.toLowerCase() !== tagType.toLowerCase()) {
      element.remove()
      element = null
  }

  if (!element) {
    element = document.createElement(tagType)
    if (parent === 'head') {
      document.head.appendChild(element)
    } else if (parent === 'body') {
      document.body.appendChild(element)
    } else if (parent === 'after-body') {
      document.documentElement.appendChild(element)
    }
  }
  
  for (const [key, value] of Object.entries(attributes)) {
    element.setAttribute(key, value)
  }
  
  if (content !== null) {
    if (tagType === 'script') {
      element.textContent = content
    } else {
      element.innerHTML = content
    }
  }
  return element
}
