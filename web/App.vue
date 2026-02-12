<template>
  <div class="app">
    <Toolbar
      :project-name="config?.name"
      :settings="appSettings"
      :preview-state="previewState"
      :is-virtual="isVirtual"
      :has-unsaved-changes="hasUnsavedChanges"
      @settings="showSettings = true"
      @new-project="showTemplatePicker = true"
      @update-settings="handleAppSettingsUpdate"
      @update-project-name="handleProjectNameUpdate"
      @export="handleExport"
      @export-editor="handleExportEditor"
      @export-zip="handleExportZip"
    />
    <PaneManager
      :editors="editors"
      :files="files"
      :adapters="adapters"
      :preview-state="previewState"
      :settings="appSettings"
      :errors="errors"
      @update="handleFileUpdate"
      @render="(isManual) => handleRender(isManual)"
      :last-manual-render="lastManualRender"
      @rename="handleRename"
      @settings-update="handleEditorSettingsUpdate"
      @format="handleFormat"
      @minify="handleMinify"
      @compile="handleCompile"
      @settings="showSettings = true"
      @jump="handleJump"
      @clear-errors="handleClearErrors"
    />
    <SettingsModal
      v-if="showSettings"
      :config="config"
      :settings="appSettings"
      :current-path="currentPath"
      @close="showSettings = false"
      @save="handleSettingsSave"
      @toast="addToast"
    />
    <Toast
      :toasts="toasts"
      @remove="removeToast"
      @jump="handleJump"
    />
    
    <Teleport to="body">
      <div v-if="showTemplatePicker" class="modal-overlay" @click.self="showTemplatePicker = false">
        <TemplatePickerModal
          @close="showTemplatePicker = false"
          @select="handleTemplateSelect"
        />
      </div>
    </Teleport>

    <div v-if="isLoading" class="loading-overlay">
      <div class="loading-content">
        <i class="ph-duotone ph-pen-nib loading-icon"></i>
        <div class="loading-spinner"></div>
        <p>Loading Pen...</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'
import PaneManager from './components/PaneManager.vue'
import SettingsModal from './components/SettingsModal.vue'
import TemplatePickerModal from './components/TemplatePickerModal.vue'
import Toolbar from './components/Toolbar.vue'
import Toast from './components/Toast.vue'
import { editorStateManager, fileSystemMirror, useEditors, useFileSystem, exportProject, exportEditor, exportAsZip } from './state_management.js'
import { fileSystem } from './filesystem.js'

const { files, updateFile, setConfig, setAllFiles, config, isVirtual, hasUnsavedChanges, errors } = useFileSystem()
const { triggerAction } = useEditors()

const editors = computed(() => config.editors || [])

const appSettings = reactive({
  autoRun: true,
  previewUrl: '',
  layoutMode: 'columns'
})


watch(() => config.autoRun, (val) => appSettings.autoRun = val)

const currentPath = ref('')
const adapters = ref([]) 
const showSettings = ref(false)
const showTemplatePicker = ref(false)
const lastActivity = ref({})
const toasts = ref([])
const lastManualRender = ref(0)
const previewState = ref({ displayURL: '', contentURL: '' })
const IDLE_THRESHOLD = 2000 // 2 seconds
const isLoading = ref(true)
let saveDebounceTimer = null

onMounted(async () => {
  // Listen for preview updates from state manager (which gets them from FS writePreview)
  window.addEventListener('pen-preview-update', (e) => {
      previewState.value = e.detail
  })

  // Connect to FS
  try {
     await fileSystem.connect()
  } catch (err) {
      console.error('Failed to connect to FS', err)
      addToast({
        type: 'error',
        title: 'Connection Failed',
        message: 'Could not connect to file system.'
      })
  } finally {
      isLoading.value = false
  }
  
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  if (saveDebounceTimer) clearTimeout(saveDebounceTimer)
  window.removeEventListener('keydown', handleKeydown)
})

function applyInitMessage(message) {
    adapters.value = message.adapters || []
    if (message.rootPath) currentPath.value = message.rootPath
    if (message.config?.autoRun !== undefined) appSettings.autoRun = message.config.autoRun
    if (message.config?.layoutMode) appSettings.layoutMode = message.config.layoutMode
}

fileSystem.on((message) => {
    if (message.type === 'init') {
        applyInitMessage(message)
    }

    if (message.type === 'reinit') {
        if (message.config) setConfig(message.config)
        if (message.files) setAllFiles(message.files)
        applyInitMessage(message)
    }
    
    if (message.type === 'toast-error') {
        addToast({
          type: 'error',
          title: message.name,
          message: message.message,
          details: {
            filename: message.filename,
            line: message.line,
            column: message.column
          }
        })
    }
})


function handleFileUpdate(filename, content) {
  // Update state (triggers render if autoRun)
  updateFile(filename, content)
  lastActivity.value[filename] = Date.now()
  

}

function handleRender(isManual = false) {
  if (isManual) lastManualRender.value = Date.now()

  const firstFile = Object.keys(files)[0]
  if (firstFile) updateFile(firstFile, files[firstFile])
}

function handleRename(oldFilename, newFilename, newType) {
    const editor = config.editors?.find(e => e.filename === oldFilename)
    if (editor) {
      editor.filename = newFilename
      editor.type = newType
    }
    fileSystem.renameFile(oldFilename, newFilename, newType)
}

function handleAppSettingsUpdate(newSettings) {
  Object.assign(appSettings, newSettings)
  fileSystem.saveConfig({ ...config, ...appSettings })
}

function handleEditorSettingsUpdate(filename, settings) {
    const editor = config.editors.find(e => e.filename === filename)
    if (editor) editor.settings = settings
    
    if (fileSystem.socket && fileSystem.socket.readyState === WebSocket.OPEN) {
      fileSystem.socket.send(JSON.stringify({ type: 'editor-settings', filename, settings }))
    } else if (fileSystem.isVirtual.value || fileSystem.fallbackMode) {
      fileSystem.saveConfig(config)
    }
}


function handleFormat(filename) { triggerAction(filename, 'format') }
function handleMinify(filename) { triggerAction(filename, 'minify') }
function handleCompile(filename, target) { triggerAction(filename, 'compile') }

function handleSettingsSave(newConfig, newSettings) {
  setConfig(newConfig)
  if (newSettings) Object.assign(appSettings, newSettings)
  showSettings.value = false
  
  const finalConfig = { 
      ...newConfig, 
      autoRun: appSettings.autoRun,
      previewUrl: appSettings.previewUrl,
      layoutMode: appSettings.layoutMode
  }
  fileSystem.saveConfig(finalConfig)
}

function handleProjectNameUpdate(newName) {
    const newConfig = { ...config, name: newName }
    setConfig(newConfig)
    fileSystem.saveConfig({ ...newConfig, ...appSettings })
}

function handleExport() {
  exportProject().catch(err => {
    addToast({
      type: 'error',
      title: 'Export Failed',
      message: err.message
    })
  })
}

function handleExportZip() {
  exportAsZip().catch(err => {
    addToast({
      type: 'error',
      title: 'Export Failed',
      message: err.message
    })
  })
}


function handleExportEditor() {
  exportEditor().catch(err => {
    addToast({
      type: 'error',
      title: 'Export Failed',
      message: err.message
    })
  })
}




async function handleTemplateSelect(templateId) {
  showTemplatePicker.value = false

  if (fileSystem.isVirtual.value) {
    const { loadProjectTemplate } = await import('../core/project_templates.js')
    const template = await loadProjectTemplate(templateId)
    if (!template) return

    const newConfig = { ...template.config, name: config.name || 'Untitled' }
    setConfig(newConfig, true)
    if (template.files) setAllFiles(template.files)

    const { getAdapter } = await import('../core/adapter_registry.js')
    adapters.value = (newConfig.editors || []).map(e => {
      const A = getAdapter(e.type)
      return {
        id: A.id, type: e.type, name: A.name, description: A.description,
        fileExtension: A.fileExtension, compileTargets: A.compileTargets || [],
        canMinify: A.canMinify || false, schema: A.getSchema?.() || {}
      }
    })
  } else if (fileSystem.socket && fileSystem.socket.readyState === WebSocket.OPEN) {
    fileSystem.socket.send(JSON.stringify({ type: 'start-template', templateId }))
  }
}

function addToast(toast) {
  const id = Date.now()
  toasts.value.push({ id, ...toast })
  setTimeout(() => removeToast(id), 5000)
}

function removeToast(id) {
  toasts.value = toasts.value.filter(t => t.id !== id)
}



function handleJump(details) {
  editorStateManager.jumpToLocation(details.filename, details.line, details.column)
}

function handleClearErrors() {
  console.log('App: Clearing errors')
  fileSystemMirror.setErrors([])
}

function handleKeydown(event) {
  if (event.key === 'Escape') {
    if (showSettings.value) showSettings.value = false
    if (showTemplatePicker.value) showTemplatePicker.value = false
  }
  if ((event.metaKey || event.ctrlKey) && event.key === 's') {
    event.preventDefault()

  }
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
    event.preventDefault()
    handleRender(true)
  }
}
</script>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--color-background);
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 200ms ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.loading-overlay {
  position: fixed;
  inset: 0;
  background: var(--color-background);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  animation: fadeIn 0.3s ease-out;
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  color: var(--color-text-muted);
}

.loading-icon {
  font-size: 48px;
  color: var(--color-accent);
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
