<template>
  <div class="app">
    <Toolbar
      :project-name="config?.name"
      :settings="appSettings"
      :preview-state="previewState"
      @settings="showSettings = true"
      @new-project="showTemplatePicker = true"
      @update-settings="handleAppSettingsUpdate"
      @update-project-name="handleProjectNameUpdate"
      @export="handleExport"
    />
    <PaneManager
      :editors="editors"
      :files="files"
      :adapters="adapters"
      :preview-state="previewState"
      :settings="appSettings"
      @update="handleFileUpdate"
      @render="(isManual) => handleRender(isManual)"
      :last-manual-render="lastManualRender"
      @rename="handleRename"
      @settings-update="handleEditorSettingsUpdate"
      @format="handleFormat"
      @minify="handleMinify"
      @compile="handleCompile"
      @settings="showSettings = true"
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
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'
import PaneManager from './components/PaneManager.vue'
import SettingsModal from './components/SettingsModal.vue'
import TemplatePickerModal from './components/TemplatePickerModal.vue'
import Toolbar from './components/Toolbar.vue'
import Toast from './components/Toast.vue'
import { editorStateManager, fileSystemMirror, useEditors, useFileSystem, exportProject } from './state_management.js'
import { fileSystem } from './filesystem.js'

const { files, updateFile, receiveExternalUpdate, setConfig, setAllFiles, config } = useFileSystem()
const { triggerAction } = useEditors()

const editors = computed(() => config.editors || [])

const appSettings = reactive({
  autoRun: true,
  previewUrl: 'http://localhost:3002', // This might be overridden by blob url
  layoutMode: 'columns'
})

// Sync local appSettings with global config where appropriate
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
let saveDebounceTimer = null

onMounted(async () => {
  // Connect to FS
  try {
     await fileSystem.connect()
  } catch (err) {
      console.error('Failed to connect to FS', err)
  }
  
  window.addEventListener('keydown', handleKeydown)
  
  // Listen for preview updates from state manager (which gets them from FS writePreview)
  window.addEventListener('pen-preview-update', (e) => {
      previewState.value = e.detail
  })
})

onUnmounted(() => {
  if (saveDebounceTimer) clearTimeout(saveDebounceTimer)
  window.removeEventListener('keydown', handleKeydown)
})

// Listen to FS events for things that aren't reactive file/config changes
fileSystem.on((message) => {
    if (message.type === 'init') {
        adapters.value = message.adapters || []
        if (message.rootPath) currentPath.value = message.rootPath
        
        if (message.config.autoRun !== undefined) appSettings.autoRun = message.config.autoRun
        // Preview URL might be managed by FS/State now, but appSettings.previewUrl is for external?
        if (message.config.layoutMode) appSettings.layoutMode = message.config.layoutMode
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

      if (message.type === 'sync-editors') {
        adapters.value = message.adapters || []
      }
      
      if (message.type === 'reload') {
          // Full reload requested?
          // Or just re-init?
          window.location.reload()
      }
})


function handleFileUpdate(filename, content) {
  // Update state (triggers render if autoRun)
  updateFile(filename, content)
  lastActivity.value[filename] = Date.now()
  
  // Debounced save handled by FS interface inside updateFile? 
  // No, updateFile in state_management calls fileSystem.writeFile which sends 'update' immediately/optimistically?
  // Actually fileSystem.writeFile sends immediately.
  // Do we want to debounce the Network call?
  // The logic in state_management calls fileSystem.writeFile.
  // In `filesystem.js`, `writeFile` sends immediately.
  // If we want debounce, we should do it here or in filesystem.
  // Previous logic had debounce. Let's keep debounce here and calling a "save" method?
  // But updateFile triggers render.
  // We can separate "update local content" (for render) and "save to disk" (network).
  // `fileSystem.writeFile` mirrors `files[filename] = content` AND sends network.
  // To debounce network, we shouldn't call `writeFile` on every keystroke if it sends network.
  // We should update `files` directly? But `files` is readonly from `useFileSystem`.
  // We need a method `updateFileContentOnly` vs `saveFile`.
  // Or `writeFile` should be debounced internally?
  // Let's assume `updateFile` in state_management updates reactive state (triggering render) AND saves.
  // If we want to debounce save, we might need to change `state_management` or `filesystem`.
  // For now, let's trust `filesystem.writeFile` is what we use, but maybe we should debounce the *network* part in filesystem?
  // Or just rely on the fact that WebSocket is fast? 
  // Previous code debounced `saveFile`.
  
  // Let's implement debounce here if possible, but `updateFile` on line 61 calls `fileSystem.writeFile`.
  // We can change `state_management` to have `updateLocal` vs `save`.
  // But `fileSystem.files` is the source of truth.
  // If we modify `fileSystem.files` directly (if allowed) it updates state.
  // `filesystem.js` `this.files` is reactive.
  // `writeFile` does `this.files[filename] = content` then sends.
  
  // Let's leave it as is for now (immediate send). If performance is issue, we debounce in `filesystem.js`.
}

function handleRender(isManual = false) {
  if (isManual) lastManualRender.value = Date.now()
  // Trigger render in state manager.
  // We can just call updateFile with same content to trigger?
  // Or `fileSystemMirror.updateFile` has logic to trigger render.
  const firstFile = Object.keys(files)[0]
  if (firstFile) updateFile(firstFile, files[firstFile])
}

function handleRename(oldFilename, newFilename, newType) {
    fileSystem.renameFile(oldFilename, newFilename, newType)
}

function handleAppSettingsUpdate(newSettings) {
  Object.assign(appSettings, newSettings)
  fileSystem.saveConfig({ ...config, ...appSettings })
}

function handleEditorSettingsUpdate(filename, settings) {
    // Local update
    const editor = config.editors.find(e => e.filename === filename)
    if (editor) editor.settings = settings
    
    if (fileSystem.socket && fileSystem.socket.readyState === WebSocket.OPEN) {
      fileSystem.socket.send(JSON.stringify({ type: 'editor-settings', filename, settings }))
    }
}

// delegates to state manager
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

function handleTemplateSelect(templateId) {
  if (fileSystem.socket && fileSystem.socket.readyState === WebSocket.OPEN) {
    fileSystem.socket.send(JSON.stringify({ type: 'start-template', templateId }))
  }
  showTemplatePicker.value = false
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

function handleKeydown(event) {
  if ((event.metaKey || event.ctrlKey) && event.key === 's') {
    event.preventDefault()
    // saveFiles() // Sync all?
    // FileSystem handles granular updates.
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
</style>
