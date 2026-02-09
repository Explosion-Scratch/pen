<template>
  <div class="app">
    <Toolbar
      :project-name="config?.name || 'Pen'"
      :is-saving="isSaving"
      :last-saved="lastSaved"
      @settings="showSettings = true"
    />
    <PaneManager
      :editors="editors"
      :files="files"
      :preview-html="previewHtml"
      :layout-mode="layoutMode"
      :auto-run="autoRun"
      @update="handleFileUpdate"
      @render="handleRender"
      @rename="handleRename"
      @settings-update="handleEditorSettingsUpdate"
      @format="handleFormat"
      @set-layout="handleSetLayout"
      @toggle-auto-run="handleToggleAutoRun"
    />
    <SettingsModal
      v-if="showSettings"
      :config="config"
      @close="showSettings = false"
      @save="handleSettingsSave"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import Toolbar from './components/Toolbar.vue'
import PaneManager from './components/PaneManager.vue'
import SettingsModal from './components/SettingsModal.vue'

const config = ref(null)
const files = ref({})
const editors = ref([])
const previewHtml = ref('')
const showSettings = ref(false)
const layoutMode = ref('columns')
const autoRun = ref(true)
const lastActivity = ref({})
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
        editors.value = message.config.editors
        if (autoRun.value) {
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

  if (autoRun.value) {
    if (renderDebounceTimer) {
      clearTimeout(renderDebounceTimer)
    }
    renderDebounceTimer = setTimeout(() => {
      handleRender()
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

function handleRender() {
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

function handleSettingsSave(newConfig) {
  config.value = newConfig
  showSettings.value = false
}

function handleSetLayout(mode) {
  layoutMode.value = mode
}

function handleToggleAutoRun() {
  autoRun.value = !autoRun.value
}

function handleKeydown(event) {
  if ((event.metaKey || event.ctrlKey) && event.key === 's') {
    event.preventDefault()
    saveFiles()
  }
  
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
    event.preventDefault()
    handleRender()
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
