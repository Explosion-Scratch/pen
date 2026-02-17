const NPM_IMPORT_REGEX =
  /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"]([^'"\.\/][^'"]*)['"];?/g;
const CSS_IMPORT_REGEX =
  /@import\s+(?:url\(\s*)?['"]([^'"]+)['"](?:\s*\))?[^;]*;?/g;

const DEFAULT_CDN = "https://esm.sh";

const IMPORT_OVERRIDES = {
  tailwindcss: "https://cdn.tailwindcss.com",
  "tailwindcss/preflight":
    "https://cdn.jsdelivr.net/npm/tailwindcss@3/src/css/preflight.css",
  vue: "https://unpkg.com/vue@3/dist/vue.esm-browser.js",
  three: "https://unpkg.com/three@latest/build/three.module.js",
  d3: "https://cdn.jsdelivr.net/npm/d3@7/+esm",
};

/**
 * @param {string} packageName
 * @param {Object} overrides
 * @returns {string}
 */
export function getCdnUrl(packageName, overrides = {}) {
  const allOverrides = { ...IMPORT_OVERRIDES, ...overrides };

  // Exact match (e.g., "preact/hooks", "solid-js/web")
  if (allOverrides[packageName]) {
    return allOverrides[packageName];
  }

  // Version-stripped match (e.g., "react@18" → check "react")
  const lastAt = packageName.lastIndexOf("@");
  if (lastAt > 0) {
    const baseName = packageName.substring(0, lastAt);
    if (allOverrides[baseName]) {
      return allOverrides[baseName];
    }
  }

  // Preserve full path including subpaths (e.g., "preact/hooks" → "https://esm.sh/preact/hooks")
  return `${DEFAULT_CDN}/${packageName}`;
}

/**
 * @param {string} importPath
 * @returns {boolean}
 */
export function isRelativeImport(importPath) {
  return importPath.startsWith(".") || importPath.startsWith("/");
}

/**
 * @param {string} jsCode
 * @param {Object} overrides - per-project import overrides { 'package': 'url' }
 * @returns {string}
 */
export function transformImportsToCdn(jsCode, overrides = {}) {
  const allOverrides = { ...IMPORT_OVERRIDES, ...overrides };
  return jsCode.replace(NPM_IMPORT_REGEX, (match, packageName) => {
    // Check for explicit override first, even if it's an absolute URL
    if (allOverrides[packageName]) {
      const url = allOverrides[packageName];
      return match
        .replace(`"${packageName}"`, `"${url}"`)
        .replace(`'${packageName}'`, `'${url}'`);
    }

    if (
      isRelativeImport(packageName) ||
      packageName.startsWith("http://") ||
      packageName.startsWith("https://")
    ) {
      return match;
    }
    const url = getCdnUrl(packageName, overrides);
    return match
      .replace(`"${packageName}"`, `"${url}"`)
      .replace(`'${packageName}'`, `'${url}'`);
  });
}

/**
 * @param {string} cssCode
 * @param {Object} overrides - per-project import overrides { 'package': 'url' }
 * @returns {string}
 */
export function transformCssImports(cssCode, overrides = {}) {
  const allOverrides = { ...IMPORT_OVERRIDES, ...overrides };
  return cssCode.replace(CSS_IMPORT_REGEX, (match, importPath) => {
    if (isRelativeImport(importPath)) return match;
    if (importPath.startsWith("http://") || importPath.startsWith("https://"))
      return match;
    const url = allOverrides[importPath] || `${DEFAULT_CDN}/${importPath}`;
    return match.replace(importPath, url);
  });
}

/**
 * @param {string} jsCode
 * @returns {string[]}
 */
export function extractImports(jsCode) {
  const imports = new Set();
  for (const match of jsCode.matchAll(NPM_IMPORT_REGEX)) {
    const packageName = match[1];
    if (
      !isRelativeImport(packageName) &&
      !packageName.startsWith("http://") &&
      !packageName.startsWith("https://")
    ) {
      imports.add(packageName);
    }
  }
  return [...imports];
}
