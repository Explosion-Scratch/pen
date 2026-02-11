const isBrowser = typeof window !== 'undefined'

const moduleCache = new Map()

/**
 * Dynamically imports a module based on the current environment (Node or browser).
 * Caches modules after first load to avoid redundant imports.
 *
 * @param {string} nodeSpecifier - The npm package specifier for Node (e.g. 'sass', 'typescript')
 * @param {object} [options]
 * @param {string} [options.cdnUrl] - CDN URL for browser import (e.g. 'https://esm.sh/sass@1.80.0')
 * @param {string} [options.windowGlobal] - Name of a global variable to check on `window` first (e.g. 'ts')
 * @param {string} [options.cacheKey] - Custom cache key (defaults to nodeSpecifier)
 * @param {boolean} [options.useDefault=true] - Whether to unwrap `.default` from the imported module
 * @returns {Promise<any>} The loaded module
 */
export async function importModule(nodeSpecifier, options = {}) {
  const {
    cdnUrl,
    windowGlobal,
    cacheKey = nodeSpecifier,
    useDefault = true
  } = options

  const cached = moduleCache.get(cacheKey)
  if (cached) return cached

  let mod

  if (isBrowser) {
    if (windowGlobal && window[windowGlobal]) {
      mod = window[windowGlobal]
    } else if (cdnUrl) {
      const imported = await import(/* @vite-ignore */ cdnUrl)
      mod = useDefault ? (imported.default || imported) : imported
    } else {
      throw new Error(
        `Module "${nodeSpecifier}" is not available in the browser. ` +
        `Provide a cdnUrl or ensure it's loaded as a global via <script> tag.`
      )
    }
  } else {
    const imported = await import(/* @vite-ignore */ nodeSpecifier)
    mod = useDefault ? (imported.default || imported) : imported
  }

  moduleCache.set(cacheKey, mod)
  return mod
}

/**
 * Clears the module cache. Useful for testing or hot-reloading.
 * @param {string} [cacheKey] - If provided, only clear that key. Otherwise clear all.
 */
export function clearModuleCache(cacheKey) {
  if (cacheKey) {
    moduleCache.delete(cacheKey)
  } else {
    moduleCache.clear()
  }
}

export { isBrowser }
