import { ref, reactive } from 'vue'

class FileSystem {
  constructor() {
    this.socket = null
    this.isConnected = ref(false)
    this.files = reactive({})
    this.onMessageCallbacks = new Set()
    this.config = reactive({})
    this.previewUrl = ref('')
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
        // Only reject if it's the initial connection attempt
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

  on(callback) {
    this.onMessageCallbacks.add(callback)
  }

  off(callback) {
    this.onMessageCallbacks.delete(callback)
  }

  handleMessage(message) {
    if (message.type === 'init') {
      this.updateConfig(message.config)
      this.updateFiles(message.files)
    } else if (message.type === 'external-update') {
        this.files[message.filename] = message.content
    } else if (message.type === 'sync-editors') {
         // Pass through to listeners
    }

    for (const cb of this.onMessageCallbacks) cb(message)
  }

  updateFiles(newFiles) {
    Object.keys(this.files).forEach(key => delete this.files[key])
    Object.assign(this.files, newFiles)
  }
  
  updateConfig(newConfig) {
    Object.assign(this.config, newConfig)
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

  getPreviewURL() {
      return {
          displayURL: 'http://localhost:3000',
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

export const fileSystem = new FileSystem()
