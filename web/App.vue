<template>
  <div class="app">
    <PaneManager
      :editors="editors"
      :files="files"
      :preview-html="previewHtml"
      :settings="appSettings"
      @update="handleFileUpdate"
      @render="(isManual) => handleRender(isManual)"
      :last-manual-render="lastManualRender"
      @rename="handleRename"
      @settings-update="handleEditorSettingsUpdate"
      @format="handleFormat"
      @settings="showSettings = true"
    />
    <SettingsModal
      v-if="showSettings"
      :config="config"
      :settings="appSettings"
      @close="showSettings = false"
      @save="handleSettingsSave"
    />
    <Toast
      :toasts="toasts"
      @remove="removeToast"
      @jump="handleJump"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, watch } from 'vue'
import PaneManager from './components/PaneManager.vue'
import SettingsModal from './components/SettingsModal.vue'
import Toast from './components/Toast.vue'
import { editorStateManager } from './state_management.js'

const appSettings = reactive({
  autoRun: true,
  previewUrl: 'http://localhost:3002',
  layoutMode: 'columns'
})

const config = ref(null)
const files = ref({})
const editors = ref([])
const previewHtml = ref('')
const showSettings = ref(false)
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
        // Add unique IDs for stable keying in PaneManager
        editors.value = (message.config.editors || []).map((e, idx) => ({
          ...e,
          id: e.id || `editor-${idx}-${Date.now()}`
        }))

        // Sync settings from config if they exist
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

      if (message.type === 'external-update') {
        const now = Date.now()
        const lastEdit = lastActivity.value[message.filename] || 0
        if (now - lastEdit > IDLE_THRESHOLD) {
          files.value[message.filename] = message.content
        } else {
          console.log(`⏳ Squashing external update for ${message.filename} because user is active`)
        }
      }

      if (message.type === 'update-ack') {
        // acknowledged
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
    } catch (err) {
      console.error('WebSocket message error:', err)
    }
  }

  ws.onclose = () => {
    console.log('Disconnected from server')
    setTimeout(connectWebSocket, 2000)
  }

  ws.onerror = (err) => {
    console.error('WebSocket error:', err)
  }
}

function handleFileUpdate(filename, content) {
  files.value[filename] = content
  lastActivity.value[filename] = Date.now()
  
  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer)
  }
  saveDebounceTimer = setTimeout(() => {
    saveFile(filename, content)
  }, 200)

  if (appSettings.autoRun) {
    if (renderDebounceTimer) {
      clearTimeout(renderDebounceTimer)
    }
    renderDebounceTimer = setTimeout(() => {
      handleRender(false)
    }, 300)
  }
}

function saveFile(filename, content) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    // Send only the updated file content via a specific update message
    // instead of sending all files via 'save' message.
    ws.send(JSON.stringify({
      type: 'update',
      filename,
      content
    }))
  }
}

function saveFiles() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'save',
      files: files.value
    }))
  }
}

function handleRender(isManual = false) {
  if (isManual) {
    lastManualRender.value = Date.now()
  }
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
      editors.value[editorIdx] = {
        ...editors.value[editorIdx],
        filename: newFilename,
        type: newType
      }
    }

    ws.send(JSON.stringify({
      type: 'rename',
      oldFilename,
      newFilename,
      newType
    }))
  }
}

function handleEditorSettingsUpdate(filename, settings) {
  const editor = editors.value.find(e => e.filename === filename)
  if (editor) {
    editor.settings = settings
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'editor-settings',
        filename,
        settings
      }))
    }
  }
}

function handleFormat(filename) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'format',
      filename
    }))
  }
}

const handleSettingsSave = (newConfig, newSettings) => {
  config.value = newConfig
  if (newSettings) {
    Object.assign(appSettings, newSettings)
  }
  showSettings.value = false
  if (ws && ws.readyState === WebSocket.OPEN) {
    // Also include appSettings in the config sync if needed, 
    // but the server mostly cares about autoRun for the render logic
    const finalConfig = { 
      ...newConfig, 
      autoRun: appSettings.autoRun,
      previewUrl: appSettings.previewUrl,
      layoutMode: appSettings.layoutMode
    }
    ws.send(JSON.stringify({ type: 'save-config', config: finalConfig }))
  }
}

// Methods for layout and auto-run are now handled via direct mutation of appSettings in components or emitted events


function addToast(toast) {
  const id = Date.now()
  toasts.value.push({
    id,
    ...toast
  })

  // Auto remove after 5 seconds
  setTimeout(() => {
    removeToast(id)
  }, 5000)
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
  if (ws) {
    ws.close()
  }
  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer)
  }
  if (renderDebounceTimer) {
    clearTimeout(renderDebounceTimer)
  }
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
</style>
