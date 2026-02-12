import { ref, reactive } from 'vue'
import { getAllAdapters } from '../core/adapter_registry.js'
import { loadProjectTemplate } from '../core/project_templates.js'


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
    this.isVirtual = ref(false)
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
    this.retryCount = 0
    this.maxRetries = 3
    this.fallbackMode = false
    this.storageKey = 'pen-vfs-files-offline'
    this.configKey = 'pen-vfs-config-offline'
  }

  async connect(url = 'ws://localhost:3001') {
    if (this.fallbackMode) return

    return new Promise((resolve, reject) => {
      this._connectRecursive(url, resolve, reject)
    })
  }

  _connectRecursive(url, resolve, reject) {
      this.socket = new WebSocket(url)
      
      this.socket.onopen = () => {
        this.isConnected.value = true
        this.retryCount = 0
        resolve()
      }

      this.socket.onclose = () => {
        this.isConnected.value = false
        if (!this.fallbackMode) {
            if (this.retryCount < this.maxRetries) {
                this.retryCount++
                setTimeout(() => this._connectRecursive(url, resolve, reject), 200)
            } else {
                console.warn('Max retries reached. Switching to fallback mode.')
                this.enableFallbackMode()
                resolve()
            }
        }
      }

      this.socket.onerror = (err) => {
        console.error('FileSystem WebSocket error:', err)
        if (!this.isConnected.value && this.retryCount >= this.maxRetries) {
             reject(err)
        }
      }

      this.socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          this.handleMessage(message)
        } catch (err) {
          console.error('Failed to parse message:', err)
        }
      }
  }

  async enableFallbackMode() {
      this.fallbackMode = true
      this.isVirtual.value = true
      this.isConnected.value = true

      // If we have existing state from the server connection, preserve it
      // and switch to project-specific storage keys
      if (this.config.name && Object.keys(this.files).length > 0) {
          const projectName = this.config.name
          this.storageKey = `pen-vfs-files-${projectName}`
          this.configKey = `pen-vfs-config-${projectName}`
          
          this.persist()
          this.notify({ 
              type: 'init', 
              files: this.files, 
              config: this.config, 
              adapters: getAllAdapters(), 
              isFallback: true 
          })
          return
      }

      let restored = false
      try {
          const storedConfigRaw = Storage.getItem(this.configKey, null)
          if (storedConfigRaw) {
              const storedConfig = JSON.parse(storedConfigRaw)
              this.updateConfig(storedConfig)
              
              const storedFilesRaw = Storage.getItem(this.storageKey, '{}')
              const storedFiles = JSON.parse(storedFilesRaw)
              this.updateFiles(storedFiles)
              restored = true
          }
      } catch (e) {
          console.warn('Fallback: Failed to restore from local storage', e)
      }

      if (!restored) {
          try {
              const template = await loadProjectTemplate('vanilla')
              if (template) {
                  this.updateConfig({ ...template.config, name: 'New Pen' })
                  this.updateFiles(template.files)
              }
          } catch (e) {
              console.error('Fallback: Failed to load vanilla template', e)
          }
      }
      
      this.notify({ type: 'init', files: this.files, config: this.config, adapters: getAllAdapters(), isFallback: true })
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

  persist() {
      if (this.fallbackMode) {
          Storage.setItem(this.storageKey, JSON.stringify(this.files))
          Storage.setItem(this.configKey, JSON.stringify(this.config))
      }
  }

  writeFile(filename, content) {
    this.files[filename] = content
    if (this.fallbackMode) {
        this.hasUnsavedChanges.value = true
        this.persist()
    } else if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: 'update', filename, content }))
    }
  }

  saveConfig(newConfig) {
    if (this.fallbackMode) {
        this.updateConfig(newConfig)
        this.persist()
    } else if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: 'save-config', config: newConfig }))
    }
  }

  renameFile(oldFilename, newFilename, newType) {
    super.renameFile(oldFilename, newFilename, newType)
    
    if (this.fallbackMode) {
        this.hasUnsavedChanges.value = true
        this.persist()
    } else if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: 'rename', oldFilename, newFilename, newType }))
    }
  }

  deleteFile(filename) {
    super.deleteFile(filename)
    if (this.fallbackMode) {
        this.hasUnsavedChanges.value = true
        this.persist()
    } else if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: 'delete', filename }))
    }
  }
}

class VirtualFS extends BaseFileSystem {
  constructor(projectName) {
    super()
    this.isVirtual.value = true
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
