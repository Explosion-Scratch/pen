const NPM_IMPORT_REGEX = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"]([^'"\.\/][^'"]*)['"];?/g
const CSS_IMPORT_REGEX = /@import\s+(?:url\(\s*)?['"]([^'"]+)['"](?:\s*\))?[^;]*;?/g

const IMPORT_OVERRIDES = {
  'tailwindcss': 'https://cdn.tailwindcss.com',
  'tailwindcss/preflight': 'https://cdn.jsdelivr.net/npm/tailwindcss@3/src/css/preflight.css',
  'vue': 'https://unpkg.com/vue@3/dist/vue.esm-browser.js',
  'three': 'https://unpkg.com/three@latest/build/three.module.js',
  'solid-js': 'https://esm.sh/solid-js',
  'solid-js/web': 'https://esm.sh/solid-js/web',
  'solid-js/h': 'https://esm.sh/solid-js/h',
  'd3': 'https://cdn.jsdelivr.net/npm/d3@7/+esm',
}

/**
 * @param {string} packageName
 * @param {Object} overrides
 * @returns {string}
 */
export function getCdnUrl(packageName, overrides = {}) {
  const allOverrides = { ...IMPORT_OVERRIDES, ...overrides }
  let baseName = packageName
  const lastAt = packageName.lastIndexOf('@')
  if (lastAt > 0) {
    baseName = packageName.substring(0, lastAt)
  }

  if (allOverrides[baseName]) {
    return allOverrides[baseName]
  }
  
  const cleanName = packageName.startsWith('@')
    ? packageName.split('/').slice(0, 2).join('/')
    : packageName.split('/')[0]
  return `https://esm.run/${cleanName}`
}

/**
 * @param {string} importPath
 * @returns {boolean}
 */
export function isRelativeImport(importPath) {
  return importPath.startsWith('.') || importPath.startsWith('/')
}

/**
 * @param {string} jsCode
 * @param {Object} overrides - per-project import overrides { 'package': 'url' }
 * @returns {string}
 */
export function transformImportsToCdn(jsCode, overrides = {}) {
  const allOverrides = { ...IMPORT_OVERRIDES, ...overrides }
  return jsCode.replace(NPM_IMPORT_REGEX, (match, packageName) => {
    if (isRelativeImport(packageName) || packageName.startsWith('http://') || packageName.startsWith('https://')) {
      return match
    }
    const url = allOverrides[packageName] || getCdnUrl(packageName, overrides)
    return match.replace(`"${packageName}"`, `"${url}"`).replace(`'${packageName}'`, `'${url}'`)
  })
}

/**
 * @param {string} cssCode
 * @param {Object} overrides - per-project import overrides { 'package': 'url' }
 * @returns {string}
 */
export function transformCssImports(cssCode, overrides = {}) {
  const allOverrides = { ...IMPORT_OVERRIDES, ...overrides }
  return cssCode.replace(CSS_IMPORT_REGEX, (match, importPath) => {
    if (isRelativeImport(importPath)) return match
    if (importPath.startsWith('http://') || importPath.startsWith('https://')) return match
    const url = allOverrides[importPath] || `https://esm.run/${importPath}`
    return match.replace(importPath, url)
  })
}

/**
 * @param {string} jsCode
 * @returns {string[]}
 */
export function extractImports(jsCode) {
  const imports = new Set()
  for (const match of jsCode.matchAll(NPM_IMPORT_REGEX)) {
    const packageName = match[1]
    if (!isRelativeImport(packageName) && !packageName.startsWith('http://') && !packageName.startsWith('https://')) {
      imports.add(packageName)
    }
  }
  return [...imports]
}
