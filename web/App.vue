<template>
  <div class="app">
    <Toolbar
      :project-name="config?.name"
      :settings="appSettings"
      @settings="showSettings = true"
      @new-project="showTemplatePicker = true"
      @update-settings="handleAppSettingsUpdate"
      @update-project-name="handleProjectNameUpdate"
    />
    <PaneManager
      :editors="editors"
      :files="files"
      :adapters="adapters"
      :preview-html="previewHtml"
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
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import PaneManager from './components/PaneManager.vue'
import SettingsModal from './components/SettingsModal.vue'
import TemplatePickerModal from './components/TemplatePickerModal.vue'
import Toolbar from './components/Toolbar.vue'
import Toast from './components/Toast.vue'
import { editorStateManager } from './state_management.js'

const appSettings = reactive({
  autoRun: true,
  previewUrl: 'http://localhost:3002',
  layoutMode: 'columns'
})

const config = ref(null)
const currentPath = ref('')
const files = ref({})
const editors = ref([])
const adapters = ref([])
const previewHtml = ref('')
const showSettings = ref(false)
const showTemplatePicker = ref(false)
const lastActivity = ref({})
const toasts = ref([])
const lastManualRender = ref(0)
const IDLE_THRESHOLD = 2000 // 2 seconds
let ws = null
let saveDebounceTimer = null
let renderDebounceTimer = null

function connectWebSocket() {
  const wsUrl = `ws://localhost:3001`
  ws = new WebSocket(wsUrl)

  ws.onopen = () => {
    console.log('Connected to Pen server')
  }

  ws.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data)

      if (message.type === 'init') {
        config.value = message.config
        files.value = message.files
        adapters.value = message.adapters || []
        if (message.rootPath) currentPath.value = message.rootPath
        
        editors.value = (message.config.editors || []).map((e, idx) => ({
          ...e,
          id: e.id || `editor-${idx}-${Date.now()}`
        }))

        if (message.config.autoRun !== undefined) appSettings.autoRun = message.config.autoRun
        if (message.config.previewUrl) appSettings.previewUrl = message.config.previewUrl
        if (message.config.layoutMode) appSettings.layoutMode = message.config.layoutMode

        if (appSettings.autoRun) {
          ws.send(JSON.stringify({ type: 'render' }))
        }
      }

      if (message.type === 'preview') {
        previewHtml.value = message.html
      }

      if (message.type === 'reload') {
        window.location.reload()
      }

      if (message.type === 'external-update') {
        const now = Date.now()
        const lastEdit = lastActivity.value[message.filename] || 0
        if (now - lastEdit > IDLE_THRESHOLD) {
          files.value[message.filename] = message.content
        }
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
        // Update editors and adapters with server-synced data
        adapters.value = message.adapters || []
        
        // Merge editor config updates but preserve runtime state if possible
        // Actually simplest is to just map them again as we do in init
        // We need to preserve IDs if possible or just rely on index/filename
        const newEditors = (message.editors || []).map((e, idx) => {
           // Try to find existing editor to keep ID or state if needed
           // For now just regenerating like init is probably safer for consistency
           return {
             ...e,
             id: e.id || `editor-${idx}-${Date.now()}`
           }
        })
        editors.value = newEditors
      }
    } catch (err) {
      console.error('WebSocket message error:', err)
    }
  }

  ws.onclose = () => {
    console.log('Disconnected from server')
    setTimeout(connectWebSocket, 2000)
  }

  ws.onerror = (err) => console.error('WebSocket error:', err)
}

function handleFileUpdate(filename, content) {
  files.value[filename] = content
  lastActivity.value[filename] = Date.now()
  
  if (saveDebounceTimer) clearTimeout(saveDebounceTimer)
  saveDebounceTimer = setTimeout(() => saveFile(filename, content), 200)

  if (appSettings.autoRun) {
    if (renderDebounceTimer) clearTimeout(renderDebounceTimer)
    renderDebounceTimer = setTimeout(() => handleRender(false), 300)
  }
}

function saveFile(filename, content) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'update', filename, content }))
  }
}

function saveFiles() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'save', files: files.value }))
  }
}

function handleRender(isManual = false) {
  if (isManual) lastManualRender.value = Date.now()
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'render' }))
  }
}

function handleRename(oldFilename, newFilename, newType) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    const content = files.value[oldFilename]
    delete files.value[oldFilename]
    files.value[newFilename] = content

    const editorIdx = editors.value.findIndex(e => e.filename === oldFilename)
    if (editorIdx !== -1) {
      editors.value[editorIdx] = { ...editors.value[editorIdx], filename: newFilename, type: newType }
    }

    ws.send(JSON.stringify({ type: 'rename', oldFilename, newFilename, newType }))
  }
}

function handleAppSettingsUpdate(newSettings) {
  Object.assign(appSettings, newSettings)
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'save-config',
      config: { ...config.value, ...appSettings }
    }))
  }
}

function handleEditorSettingsUpdate(filename, settings) {
  const editor = editors.value.find(e => e.filename === filename)
  if (editor) {
    editor.settings = settings
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'editor-settings', filename, settings }))
    }
  }
}

function handleFormat(filename) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'format', filename }))
  }
}

function handleMinify(filename) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'minify', filename }))
  }
}

function handleCompile(filename, target) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'compile', filename, target }))
  }
}

function handleSettingsSave(newConfig, newSettings) {
  config.value = newConfig
  if (newSettings) Object.assign(appSettings, newSettings)
  showSettings.value = false
  if (ws && ws.readyState === WebSocket.OPEN) {
    const finalConfig = { 
      ...newConfig, 
      autoRun: appSettings.autoRun,
      previewUrl: appSettings.previewUrl,
      layoutMode: appSettings.layoutMode
    }
    ws.send(JSON.stringify({ type: 'save-config', config: finalConfig }))
  }
}

function handleProjectNameUpdate(newName) {
  if (config.value) {
    config.value.name = newName
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'save-config',
        config: { ...config.value, ...appSettings }
      }))
    }
  }
}

function handleTemplateSelect(templateId) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'start-template', templateId }))
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
    saveFiles()
  }
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
    event.preventDefault()
    handleRender(true)
  }
}

onMounted(() => {
  connectWebSocket()
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  if (ws) ws.close()
  if (saveDebounceTimer) clearTimeout(saveDebounceTimer)
  if (renderDebounceTimer) clearTimeout(renderDebounceTimer)
  window.removeEventListener('keydown', handleKeydown)
})
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
