import { ref, reactive } from 'vue'
import { getAllAdapters } from '../core/adapter_registry.js'

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
      displayURL: this.isVirtual ? 'Virtual Storage' : 'http://localhost:3000',
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
    if (this.files[oldFilename]) {
      const content = this.files[oldFilename]
      delete this.files[oldFilename]
      this.files[newFilename] = content
    }
    
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: 'rename', oldFilename, newFilename, newType }))
    }
  }
}

class VirtualFS extends BaseFileSystem {
  constructor() {
    super()
    this.isVirtual = true
    this.isConnected = ref(true)
    this.storageKey = 'pen-vfs-files'
    this.configKey = 'pen-vfs-config'
  }

  async connect() {
    const initialFiles = window.__initial_file_map__ || {}
    const initialConfig = window.__initial_config__ || {}
    
    const storedFiles = JSON.parse(localStorage.getItem(this.storageKey) || '{}')
    const storedConfig = JSON.parse(localStorage.getItem(this.configKey) || '{}')

    const finalFiles = { ...initialFiles, ...storedFiles }
    const finalConfig = { ...initialConfig, ...storedConfig }
    
    this.updateConfig(finalConfig)
    this.updateFiles(finalFiles)

    this.notify({ type: 'init', files: this.files, config: this.config, adapters: getAllAdapters() })
    return Promise.resolve()
  }

  writeFile(filename, content) {
    this.files[filename] = content
    this.hasUnsavedChanges.value = true
    this.persist()
  }

  saveConfig(newConfig) {
    Object.assign(this.config, newConfig)
    localStorage.setItem(this.configKey, JSON.stringify(this.config))
  }

  renameFile(oldFilename, newFilename, newType) {
    if (this.files[oldFilename]) {
      const content = this.files[oldFilename]
      delete this.files[oldFilename]
      this.files[newFilename] = content
      this.hasUnsavedChanges.value = true
      this.persist()
    }
  }

  persist() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.files))
  }
}

export const fileSystem = window.__initial_file_map__ ? new VirtualFS() : new WebSocketFS()
