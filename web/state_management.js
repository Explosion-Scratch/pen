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
  registerEditor(id, instance, adapter) {
    editorInstances[id] = { instance, adapter }
  },

  getEditor(id) {
    return editorInstances[id] || null
  },

  unregisterEditor(id) {
    delete editorInstances[id]
  },

  triggerAction(id, actionName) {
    const editor = editorInstances[id]
    if (!editor || !editor.adapter) return null

    const actions = editor.adapter.initialize().actions
    if (actions[actionName]) {
      return actions[actionName]
    }
    return null
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
