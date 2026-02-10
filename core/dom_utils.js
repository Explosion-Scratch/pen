import { parseHTML } from 'linkedom'

export function parseHtml(htmlString) {
  const { document } = parseHTML(htmlString)
  return document
}

export function select(document, selector) {
  return document.querySelector(selector)
}

export function selectAll(document, selector) {
  return document.querySelectorAll(selector)
}

export function serialize(document) {
  return `<!DOCTYPE html>\n${document.documentElement.outerHTML}`
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
  if (!element) {
    element = document.createElement(tagType)
    if (parent === 'head') {
      document.head.appendChild(element)
    } else {
      document.body.appendChild(element)
    }
  }
  for (const [key, value] of Object.entries(attributes)) {
    element.setAttribute(key, value)
  }
  if (content !== null) {
    element.innerHTML = content
  }
  return element
}
