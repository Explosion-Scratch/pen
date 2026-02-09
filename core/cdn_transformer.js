const NPM_IMPORT_REGEX = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"]([^'"\.\/][^'"]*)['"]/g
const SIDE_EFFECT_IMPORT_REGEX = /import\s+['"]([^'"\.\/][^'"]*)['"]/g

export function transformImportsToCdn(jsCode) {
  let transformed = jsCode

  transformed = transformed.replace(NPM_IMPORT_REGEX, (match, packageName) => {
    if (packageName.startsWith('.') || packageName.startsWith('/')) {
      return match
    }
    const cdnUrl = getCdnUrl(packageName)
    return match.replace(`"${packageName}"`, `"${cdnUrl}"`).replace(`'${packageName}'`, `'${cdnUrl}'`)
  })

  return transformed
}

export function getCdnUrl(packageName, version = null) {
  const cleanName = packageName.split('/').slice(0, 2).join('/')
  if (version) {
    return `https://cdn.skypack.dev/${cleanName}@${version}`
  }
  return `https://cdn.skypack.dev/${cleanName}`
}

export function extractImports(jsCode) {
  const imports = []
  const matches = jsCode.matchAll(NPM_IMPORT_REGEX)
  for (const match of matches) {
    const packageName = match[1]
    if (!packageName.startsWith('.') && !packageName.startsWith('/')) {
      imports.push(packageName)
    }
  }
  return [...new Set(imports)]
}

export function isRelativeImport(importPath) {
  return importPath.startsWith('.') || importPath.startsWith('/')
}
