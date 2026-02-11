import { ref, reactive, readonly, watch, computed } from 'vue'
import { executeSequentialRender } from '../core/pipeline_processor.js'
import { getAdapter } from '../core/adapter_registry.js'
import { fileSystem } from './filesystem.js'

// We now rely on fileSystem for the source of truth for files and config
// But we might want to keep some local state or just proxy it.
// The fileSystem exposes reactive 'files' and 'config'.

let isRendering = false

export const fileSystemMirror = {
  get files() {
    return fileSystem.files
  },

  updateFile(filename, content, skipRender = false) {
    fileSystem.writeFile(filename, content)
    if (!skipRender && fileSystem.config.autoRun !== false) {
      triggerRender()
    }
  },

  getFile(filename) {
    return fileSystem.files[filename] || ''
  },

  getAllFiles() {
    return { ...fileSystem.files }
  },

  setAllFiles(files) {
    fileSystem.updateFiles(files)
    triggerRender()
  },

  receiveExternalUpdate(filename, content) {
    // This is now handled by FileSystem internally, 
    // but if App needs to call it manually...
    // Actually FileSystem handles 'external-update' message.
    // If we need to trigger render on external update:
    // We can listen to FileSystem changes?
    // Or FileSystem can trigger an event.
    triggerRender()
  },
  
  setConfig(config) {
    fileSystem.updateConfig(config)
    triggerRender()
  },

  get config() {
    return fileSystem.config
  }
}

fileSystem.on((msg) => {
  if (msg.type === 'init' || msg.type === 'reinit' || msg.type === 'external-update') {
    triggerRender()
  }
})

watch(fileSystem.files, () => {
    if (fileSystem.config.autoRun !== false) triggerRender()
}, { deep: true })


// Orchestration Logic
async function triggerRender() {
  if (isRendering) return
  isRendering = true
  try {
    const html = await executeSequentialRender({ ...fileSystem.files }, { ...fileSystem.config }, { dev: true })
    
    // Abstracted "Write to Preview -> Get URL"
    const previewUrl = await fileSystem.writePreview(html)
    
    // Broadcast preview URL update instead of HTML content
    const previewEvent = new CustomEvent('pen-preview-update', { detail: previewUrl })
    window.dispatchEvent(previewEvent)
  } catch (err) {
    console.error('Render error:', err)
  } finally {
    isRendering = false
  }
}

export async function exportProject() {
  try {
    const html = await executeSequentialRender({ ...fileSystem.files }, { ...fileSystem.config }, { dev: false })
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${fileSystem.config.name || 'pen-project'}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (err) {
    console.error('Export error:', err)
    throw err
  }
}

export async function exportEditor() {
  try {
    const response = await fetch(window.location.href)
    let html = await response.text()
    
    html = html.replace(/<script>\s*window\.__initial_file_map__[\s\S]*?<\/script>/g, '')
    html = html.replace(/<script>\s*window\.__initial_config__[\s\S]*?<\/script>/g, '')

    const currentFiles = { ...fileSystem.files }
    const currentConfig = { ...fileSystem.config }

    const inject = `
  <script>
    window.__initial_file_map__ = ${JSON.stringify(currentFiles)};
    window.__initial_config__ = ${JSON.stringify(currentConfig)};
  </script>`
    
    if (html.includes('<head>')) {
      html = html.replace('<head>', '<head>' + inject)
    } else {
      html = inject + html
    }

    const origin = window.location.origin
    html = html.replace(/(src|href)="\/([^"]+)"/g, `$1="${origin}/$2"`)

    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${fileSystem.config.name || 'pen-editor'}-portable.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (err) {
    console.error('Export Editor error:', err)
    throw err
  }
}

export const editorStateManager = {
  editors: {},

  registerEditor(filename, instance, methods) {
    this.editors[filename] = { instance, ...methods }
  },

  getEditor(filename) {
    return this.editors[filename] || null
  },

  unregisterEditor(filename) {
    delete this.editors[filename]
  },

  jumpToLocation(filename, line, column) {
    const editor = this.editors[filename]
    if (editor && editor.jumpToLine) {
      editor.jumpToLine(line, column)
      return true
    }
    return false
  },

  async triggerAction(filename, action) {
    const content = fileSystem.files[filename]
    const editorConfig = fileSystem.config.editors?.find(e => e.filename === filename)
    if (!editorConfig) return

    const Adapter = getAdapter(editorConfig.type)
    const adapter = new Adapter()
    adapter.setSettings(editorConfig.settings || {})

    try {
      let result
      if (action === 'format') {
        result = await adapter.beautify(content, null, filename)
      } else if (action === 'minify') {
        if (adapter.minify) result = await adapter.minify(content)
      } else if (action === 'compile') {
         const target = Adapter.compileTargets?.[0]
         if (target) {
            const methodName = `compileTo${target.charAt(0).toUpperCase() + target.slice(1)}`
            if (adapter[methodName]) result = await adapter[methodName](content)
         }
      }

      if (result && result !== content) {
        fileSystem.writeFile(filename, result)
      }
    } catch (err) {
      console.error(`Action ${action} failed:`, err)
      throw err
    }
  },
  
  // Deprecated/No-op as FileSystem handles this
  setSocket(ws) {}
}

export function useFileSystem() {
  return {
    files: fileSystemMirror.files,
    updateFile: fileSystemMirror.updateFile,
    getFile: fileSystemMirror.getFile,
    getAllFiles: fileSystemMirror.getAllFiles,
    setAllFiles: fileSystemMirror.setAllFiles,
    receiveExternalUpdate: fileSystemMirror.receiveExternalUpdate,
    setConfig: fileSystemMirror.setConfig,
    config: fileSystemMirror.config,
    isVirtual: fileSystem.isVirtual,
    hasUnsavedChanges: fileSystem.hasUnsavedChanges,
    fs: fileSystem
  }
}

export function useEditors() {
  return {
    registerEditor: editorStateManager.registerEditor,
    getEditor: editorStateManager.getEditor,
    unregisterEditor: editorStateManager.unregisterEditor,
    triggerAction: editorStateManager.triggerAction,
    setSocket: editorStateManager.setSocket
  }
}
