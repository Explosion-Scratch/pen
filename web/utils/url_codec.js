import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string'

/**
 * @param {{ files: Record<string, string>, config: object }} projectData
 * @returns {string}
 */
export function encodeProjectToURL(projectData) {
  const payload = JSON.stringify({
    files: projectData.files,
    config: projectData.config,
  })
  return compressToEncodedURIComponent(payload)
}

/**
 * @param {string} encoded
 * @returns {{ files: Record<string, string>, config: object } | null}
 */
export function decodeProjectFromURL(encoded) {
  try {
    const json = decompressFromEncodedURIComponent(encoded)
    if (!json) return null
    const parsed = JSON.parse(json)
    if (!parsed || typeof parsed !== 'object') return null
    return {
      files: parsed.files || {},
      config: parsed.config || {},
    }
  } catch {
    return null
  }
}

/**
 * @param {{ files: Record<string, string>, config: object }} projectData
 * @returns {string}
 */
export function buildShareURL(projectData) {
  const encoded = encodeProjectToURL(projectData)
  const base = window.location.origin + window.location.pathname
  return `${base}?data=${encoded}`
}

/**
 * @returns {{ files: Record<string, string>, config: object } | null}
 */
export function parseURLData() {
  const params = new URLSearchParams(window.location.search)
  const data = params.get('data')
  if (!data) return null
  return decodeProjectFromURL(data)
}

/**
 * @param {string} input - A gist URL or raw gist ID
 * @returns {string | null}
 */
export function parseGistId(input) {
  if (!input || typeof input !== 'string') return null
  const trimmed = input.trim()
  const urlMatch = trimmed.match(/gist\.github\.com\/(?:[^/]+\/)?([a-f0-9]+)/i)
  if (urlMatch) return urlMatch[1]
  if (/^[a-f0-9]{20,}$/i.test(trimmed)) return trimmed
  const paramMatch = trimmed.match(/[?&]gistId=([a-f0-9]+)/i)
  if (paramMatch) return paramMatch[1]
  return null
}
