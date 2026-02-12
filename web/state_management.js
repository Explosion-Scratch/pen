import { ref, reactive, readonly, watch, computed } from 'vue'
import { executeSequentialRender } from '../core/pipeline_processor.js'
import { getAdapter } from '../core/adapter_registry.js'
import { exportAsZip as zipExport, exportProject as projectExport, exportEditor as editorExport } from './utils/exports.js'
import { fileSystem } from './filesystem.js'



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

  setAllFiles(files, skipRender = false) {
    fileSystem.updateFiles(files)
    if (!skipRender) triggerRender()
  },


  
  setConfig(config, skipRender = false) {
    fileSystem.updateConfig(config)
    if (!skipRender) triggerRender()
  },

  get config() {
    return fileSystem.config
  },
  
  // Reactive error state
  _errors: reactive([]),
  get errors() {
    return this._errors
  },
  setErrors(errs) {
    this._errors.splice(0, this._errors.length, ...errs)
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


let pendingRender = false

// Orchestration Logic
async function triggerRender() {
  if (isRendering) {
    pendingRender = true
    return
  }
  isRendering = true
  try {
    do {
      pendingRender = false
      const files = { ...fileSystem.files }
      const config = { ...fileSystem.config }
      const { html, errors } = await executeSequentialRender(files, config, { dev: true })
      
      fileSystemMirror.setErrors(errors || [])

      const previewUrl = await fileSystem.writePreview(html)
      
      const previewEvent = new CustomEvent('pen-preview-update', { detail: previewUrl })
      window.dispatchEvent(previewEvent)
    } while (pendingRender)
  } catch (err) {
    console.error('Render error:', err)
  } finally {
    isRendering = false
  }
}


export async function exportProject() {
  return projectExport(fileSystem.files, fileSystem.config)
}

export async function exportEditor() {
  return editorExport(fileSystem.files, fileSystem.config)
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
  

  setSocket(ws) {}
}

export async function exportAsZip() {
  return zipExport(fileSystem.files, fileSystem.config)
}

export function useFileSystem() {
  return {
    files: fileSystemMirror.files,
    updateFile: fileSystemMirror.updateFile,
    getFile: fileSystemMirror.getFile,
    getAllFiles: fileSystemMirror.getAllFiles,
    setAllFiles: fileSystemMirror.setAllFiles,

    setConfig: fileSystemMirror.setConfig,
    config: fileSystemMirror.config,
    isVirtual: fileSystem.isVirtual,
    hasUnsavedChanges: fileSystem.hasUnsavedChanges,
    fs: fileSystem,
    errors: fileSystemMirror.errors,
    addError: (err) => fileSystemMirror._errors.push(err)
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
