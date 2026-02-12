import { ref, reactive } from 'vue'
import { getAllAdapters } from '../core/adapter_registry.js'

const Storage = {
  getItem(key, defaultValue = '{}') {
    try {
      return localStorage.getItem(key) || defaultValue
    } catch (e) {
      console.warn(`Storage: Failed to get ${key}`, e)
      return defaultValue
    }
  },
  setItem(key, value) {
    try {
      localStorage.setItem(key, value)
    } catch (e) {
      console.warn(`Storage: Failed to set ${key}`, e)
    }
  }
}

class BaseFileSystem {
  constructor() {
    this.files = reactive({})
    this.config = reactive({})
    this.previewUrl = ref('')
    this.onMessageCallbacks = new Set()
    this.isVirtual = false
    this.hasUnsavedChanges = ref(false)
  }

  on(callback) {
    this.onMessageCallbacks.add(callback)
  }

  off(callback) {
    this.onMessageCallbacks.delete(callback)
  }

  notify(message) {
    for (const cb of this.onMessageCallbacks) cb(message)
  }

  updateFiles(newFiles) {
    Object.keys(this.files).forEach(key => delete this.files[key])
    Object.assign(this.files, newFiles)
  }
  
  updateConfig(newConfig) {
    Object.assign(this.config, newConfig)
  }

  getPreviewURL() {
    return {
      displayURL: 'http://preview.pen/',
      contentURL: this.previewUrl.value
    }
  }

  async writePreview(html) {
    if (this.previewUrl.value) {
      URL.revokeObjectURL(this.previewUrl.value)
    }
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    this.previewUrl.value = url
    
    return this.getPreviewURL()
  }

  renameFile(oldFilename, newFilename, newType) {
    if (this.files[oldFilename] !== undefined) {
      const content = this.files[oldFilename]
      delete this.files[oldFilename]
      this.files[newFilename] = content
      this.notify({ type: 'rename', oldFilename, newFilename })
    }
  }

  deleteFile(filename) {
    if (this.files[filename] !== undefined) {
      delete this.files[filename]
      this.notify({ type: 'delete', filename })
    }
  }
}

class WebSocketFS extends BaseFileSystem {
  constructor() {
    super()
    this.socket = null
    this.isConnected = ref(false)
  }

  async connect(url = 'ws://localhost:3001') {
    return new Promise((resolve, reject) => {
      this.socket = new WebSocket(url)
      
      this.socket.onopen = () => {
        console.log('FileSystem connected')
        this.isConnected.value = true
        resolve()
      }

      this.socket.onclose = () => {
        console.log('FileSystem disconnected')
        this.isConnected.value = false
        setTimeout(() => this.connect(url), 2000)
      }

      this.socket.onerror = (err) => {
        console.error('FileSystem WebSocket error:', err)
        if (!this.isConnected.value) reject(err)
      }

      this.socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          this.handleMessage(message)
        } catch (err) {
          console.error('Failed to parse message:', err)
        }
      }
    })
  }

  handleMessage(message) {
    if (message.type === 'init') {
      this.updateConfig(message.config)
      this.updateFiles(message.files)
    } else if (message.type === 'reinit') {
      if (message.config) {
        Object.keys(this.config).forEach(key => delete this.config[key])
        this.updateConfig(message.config)
      }
      if (message.files) this.updateFiles(message.files)
    } else if (message.type === 'external-update') {
      this.files[message.filename] = message.content
    }
    this.notify(message)
  }

  writeFile(filename, content) {
    this.files[filename] = content
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: 'update', filename, content }))
    }
  }

  saveConfig(newConfig) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: 'save-config', config: newConfig }))
    }
  }

  renameFile(oldFilename, newFilename, newType) {
    super.renameFile(oldFilename, newFilename, newType)
    
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: 'rename', oldFilename, newFilename, newType }))
    }
  }

  deleteFile(filename) {
    super.deleteFile(filename)
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: 'delete', filename }))
    }
  }
}

class VirtualFS extends BaseFileSystem {
  constructor(projectName) {
    super()
    this.isVirtual = true
    this.isConnected = ref(true)
    this.storageKey = projectName ? `pen-vfs-files-${projectName}` : 'pen-vfs-files'
    this.configKey = projectName ? `pen-vfs-config-${projectName}` : 'pen-vfs-config'
  }

  /**
   * Connects to the virtual file system and restores state from localStorage.
   * Keys are scoped by project name to avoid clashing between different exports.
   * @returns {Promise<void>}
   */
  async connect() {
    const initialFiles = window.__initial_file_map__ || {}
    const initialConfig = window.__initial_config__ || {}
    
    let storedFiles = {}
    let storedConfig = {}

    try {
      const storedConfigRaw = Storage.getItem(this.configKey)
      const parsedConfig = JSON.parse(storedConfigRaw)

      // Only load stored files if project name matches
      if (parsedConfig.name === initialConfig.name) {
        storedConfig = parsedConfig
        const storedFilesRaw = Storage.getItem(this.storageKey)
        storedFiles = JSON.parse(storedFilesRaw)
      } else if (parsedConfig.name) {
        console.warn(`VFS: Discarding stale data for project "${parsedConfig.name}" (Current: "${initialConfig.name}")`)
      }
    } catch (e) {
      console.warn('VFS: Failed to restore state from local storage', e)
    }

    const finalFiles = { ...initialFiles, ...storedFiles }
    const finalConfig = { ...initialConfig, ...storedConfig }
    
    this.updateConfig(finalConfig)
    this.updateFiles(finalFiles)

    this.notify({ type: 'init', files: this.files, config: this.config, adapters: getAllAdapters() })
    return Promise.resolve()
  }

  updateFiles(newFiles) {
    super.updateFiles(newFiles)
    this.persist()
  }

  updateConfig(newConfig) {
    super.updateConfig(newConfig)
    Storage.setItem(this.configKey, JSON.stringify(this.config))
  }

  writeFile(filename, content) {
    this.files[filename] = content
    this.hasUnsavedChanges.value = true
    this.persist()
  }

  saveConfig(newConfig) {
    this.updateConfig(newConfig)
  }

  renameFile(oldFilename, newFilename, newType) {
    super.renameFile(oldFilename, newFilename, newType)
    this.hasUnsavedChanges.value = true
    this.persist()
  }

  deleteFile(filename) {
    super.deleteFile(filename)
    this.hasUnsavedChanges.value = true
    this.persist()
  }

  persist() {
    Storage.setItem(this.storageKey, JSON.stringify(this.files))
  }
}

export const fileSystem = window.__initial_file_map__ 
  ? new VirtualFS(window.__initial_config__?.name) 
  : new WebSocketFS()
