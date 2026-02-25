import { reactive } from 'vue'

const INDEX_KEY = 'pen-projects-v1'

function uid() {
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8)
}

function getStore() {
  try {
    const k = '__pen_pm_test__'
    localStorage.setItem(k, '1')
    localStorage.removeItem(k)
    return localStorage
  } catch {
    try {
      sessionStorage.setItem('__pen_pm_test__', '1')
      sessionStorage.removeItem('__pen_pm_test__')
      return sessionStorage
    } catch {
      return null
    }
  }
}

const store = getStore()
const memoryFallback = new Map()

const Storage = {
  get(key, fallback = null) {
    if (store) {
      try { return store.getItem(key) ?? fallback } catch { return fallback }
    }
    return memoryFallback.get(key) ?? fallback
  },
  set(key, value) {
    if (store) {
      try { store.setItem(key, value); return } catch {}
    }
    memoryFallback.set(key, value)
  },
  remove(key) {
    if (store) {
      try { store.removeItem(key); return } catch {}
    }
    memoryFallback.delete(key)
  }
}

function readIndex() {
  try {
    const raw = Storage.get(INDEX_KEY)
    if (!raw) return { projects: {}, lastOpenedId: null }
    const parsed = JSON.parse(raw)
    return {
      projects: parsed.projects || {},
      lastOpenedId: parsed.lastOpenedId || null
    }
  } catch {
    return { projects: {}, lastOpenedId: null }
  }
}

function writeIndex(index) {
  Storage.set(INDEX_KEY, JSON.stringify(index))
}

function filesKey(id) { return `pen-proj-files-${id}` }
function configKey(id) { return `pen-proj-config-${id}` }
function dirtyKey(id) { return `pen-proj-dirty-${id}` }

/** @returns {string} */
export function projectIdForGist(gistId) {
  return `gist-${gistId}`
}

export const projectManager = {
  listProjects() {
    const index = readIndex()
    return Object.values(index.projects)
      .map(p => {
        const configRaw = Storage.get(configKey(p.id))
        const filesRaw = Storage.get(filesKey(p.id))
        let fileCount = 0
        try { fileCount = Object.keys(JSON.parse(filesRaw || '{}')).length } catch {}
        const dirty = Storage.get(dirtyKey(p.id), '0') === '1'
        return { ...p, fileCount, dirty }
      })
      .sort((a, b) => (b.lastOpenedAt || 0) - (a.lastOpenedAt || 0))
  },

  getProject(projectId) {
    const index = readIndex()
    const meta = index.projects[projectId]
    if (!meta) return null
    try {
      const config = JSON.parse(Storage.get(configKey(projectId), '{}'))
      const files = JSON.parse(Storage.get(filesKey(projectId), '{}'))
      const dirty = Storage.get(dirtyKey(projectId), '0') === '1'
      return { meta, config, files, dirty }
    } catch {
      return null
    }
  },

  createProject(name, files = {}, config = {}, gistId = null) {
    const id = gistId ? projectIdForGist(gistId) : uid()
    const now = Date.now()
    const meta = {
      id,
      name: name || 'Untitled',
      createdAt: now,
      lastOpenedAt: now,
      gistId: gistId || null,
    }

    const index = readIndex()
    index.projects[id] = meta
    writeIndex(index)

    const finalConfig = { ...config, name: meta.name }
    if (gistId) finalConfig.gistId = gistId
    Storage.set(filesKey(id), JSON.stringify(files))
    Storage.set(configKey(id), JSON.stringify(finalConfig))
    Storage.set(dirtyKey(id), '0')

    return id
  },

  saveProjectFiles(projectId, files) {
    Storage.set(filesKey(projectId), JSON.stringify(files))
  },

  saveProjectConfig(projectId, config) {
    Storage.set(configKey(projectId), JSON.stringify(config))
  },

  setDirty(projectId, dirty) {
    Storage.set(dirtyKey(projectId), dirty ? '1' : '0')
  },

  deleteProject(projectId) {
    const index = readIndex()
    if (!index.projects[projectId]) return false
    delete index.projects[projectId]
    if (index.lastOpenedId === projectId) index.lastOpenedId = null
    writeIndex(index)
    Storage.remove(filesKey(projectId))
    Storage.remove(configKey(projectId))
    Storage.remove(dirtyKey(projectId))
    return true
  },

  renameProject(projectId, newName) {
    const index = readIndex()
    const meta = index.projects[projectId]
    if (!meta) return false
    meta.name = newName
    writeIndex(index)
    try {
      const config = JSON.parse(Storage.get(configKey(projectId), '{}'))
      config.name = newName
      Storage.set(configKey(projectId), JSON.stringify(config))
    } catch {}
    return true
  },

  touchProject(projectId) {
    const index = readIndex()
    if (index.projects[projectId]) {
      index.projects[projectId].lastOpenedAt = Date.now()
      index.lastOpenedId = projectId
      writeIndex(index)
    }
  },

  getLastOpenedId() {
    return readIndex().lastOpenedId
  },

  setLastOpenedId(projectId) {
    const index = readIndex()
    index.lastOpenedId = projectId
    writeIndex(index)
  },

  hasProject(projectId) {
    return !!readIndex().projects[projectId]
  },

  storageKeys(projectId) {
    return {
      filesKey: filesKey(projectId),
      configKey: configKey(projectId),
      dirtyKey: dirtyKey(projectId),
    }
  }
}
