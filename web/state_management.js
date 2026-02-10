import { ref, reactive, readonly } from 'vue'

const fileMap = reactive({})

const editorInstances = reactive({})

export const fileSystemMirror = {
  get files() {
    return readonly(fileMap)
  },

  updateFile(filename, content) {
    fileMap[filename] = content
  },

  getFile(filename) {
    return fileMap[filename] || ''
  },

  getAllFiles() {
    return { ...fileMap }
  },

  setAllFiles(files) {
    Object.keys(fileMap).forEach(key => delete fileMap[key])
    Object.assign(fileMap, files)
  },

  receiveExternalUpdate(filename, content) {
    fileMap[filename] = content
  }
}

export const editorStateManager = {
  // We'll store by filename for easier access
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
  }
}

export function useFileSystem() {
  return {
    files: fileSystemMirror.files,
    updateFile: fileSystemMirror.updateFile,
    getFile: fileSystemMirror.getFile,
    getAllFiles: fileSystemMirror.getAllFiles,
    setAllFiles: fileSystemMirror.setAllFiles
  }
}

export function useEditors() {
  return {
    registerEditor: editorStateManager.registerEditor,
    getEditor: editorStateManager.getEditor,
    unregisterEditor: editorStateManager.unregisterEditor,
    triggerAction: editorStateManager.triggerAction
  }
}
