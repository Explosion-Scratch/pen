<template>
  <div class="preview-card">
    <header class="preview-header" @click="e => e.altKey && $emit('toggle-maximize')">
      <div class="preview-info">
        <div class="url-input-container" :class="{ 'is-loading': isLoading }">
          <div class="loading-bar"></div>
          <div class="url-highlight-overlay" aria-hidden="true" v-if="!isFocused">
            <span class="url-protocol">{{ urlParts.protocol }}</span><span class="url-host">{{ urlParts.host }}</span><span class="url-path">{{ urlParts.path }}</span>
          </div>
          <input
            ref="urlInput"
            type="text"
            class="url-input"
            v-model="tempUrl"
            @focus="isFocused = true"
            @blur="isFocused = false"
            @keydown.enter="handleUrlEnter"
            @keydown.esc="handleUrlEsc"
            placeholder="http://localhost:3002"
            spellcheck="false"
          />
        </div>
      </div>
      <div class="preview-actions">
        <button 
          v-if="!settings.autoRun"
          class="action-btn play-btn" 
          @click="$emit('refresh')" 
          title="Run (Cmd+Enter)"
        >
          <i class="ph-duotone ph-play"></i>
        </button>
        <button 
          class="action-btn" 
          @click="$emit('refresh')" 
          title="Refresh Preview"
        >
          <i class="ph-duotone ph-arrows-counter-clockwise"></i>
        </button>
        <button 
          class="action-btn" 
          @click="toggleDevtools" 
          :class="{ active: showDevtools }"
          title="Toggle DevTools"
        >
          <i class="ph-duotone ph-terminal-window"></i>
        </button>
      </div>
    </header>
    <div class="preview-body">
      <Splitpanes v-if="showDevtools" horizontal class="default-theme preview-split">
        <Pane min-size="20">
          <iframe
            ref="iframe"
            :src="currentPreviewUrl"
            sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
            class="preview-iframe"
            @load="onIframeLoad"
          ></iframe>
        </Pane>
        <Pane min-size="20">
          <iframe
            ref="devtoolsIframe"
            :src="devtoolsUrl"
            class="devtools-iframe"
          ></iframe>
        </Pane>
      </Splitpanes>
      <iframe
        v-else
        ref="iframe"
        :src="currentPreviewUrl"
        sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
        class="preview-iframe"
        @load="onIframeLoad"
      ></iframe>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { Splitpanes, Pane } from 'splitpanes'
import 'splitpanes/dist/splitpanes.css'

const props = defineProps({
  html: {
    type: String,
    default: ''
  },
  settings: {
    type: Object,
    required: true
  },
  lastManualRender: {
    type: Number,
    default: 0
  },
  isMaximized: {
    type: Boolean,
    default: false
  }
})

defineEmits(['refresh', 'settings', 'toggle-maximize'])

const iframe = ref(null)
const devtoolsIframe = ref(null)
const urlInput = ref(null)
const showDevtools = ref(false)
const tempUrl = ref(props.settings.previewUrl)
const isFocused = ref(false)
const currentPreviewUrl = ref(props.settings.previewUrl)

watch(() => props.settings.previewUrl, (newVal) => {
  tempUrl.value = newVal
  currentPreviewUrl.value = newVal
})

function triggerFlash() {
  isLoading.value = true
  if (loadingTimer) clearTimeout(loadingTimer)
  loadingTimer = setTimeout(() => {
    isLoading.value = false
  }, 500)
}

function handleUrlEnter() {
  props.settings.previewUrl = tempUrl.value
  urlInput.value?.blur()
  
  // New URL navigation
  currentPreviewUrl.value = tempUrl.value
  triggerFlash()
}

function handleUrlEsc() {
  tempUrl.value = props.settings.previewUrl
  urlInput.value?.blur()
}

function onIframeLoad() {
  isLoading.value = false
}

const devtoolsUrl = ref('')
let devtoolsBlobUrl = null
const isLoading = ref(false)
let loadingTimer = null

watch(() => props.html, () => {
  // Update the iframe URL to reload the content, but don't trigger the flash
  try {
    const url = new URL(props.settings.previewUrl)
    url.searchParams.set('_pen_update', Date.now())
    currentPreviewUrl.value = url.toString()
  } catch (e) {
    currentPreviewUrl.value = props.settings.previewUrl
  }
}, { immediate: false })

watch(() => props.lastManualRender, () => {
  if (props.lastManualRender > 0) {
    triggerFlash()
  }
})

const urlParts = computed(() => {
  try {
    const url = new URL(tempUrl.value)
    return {
      protocol: url.protocol + '//',
      host: url.host,
      path: url.pathname + url.search + url.hash
    }
  } catch (e) {
    return {
      protocol: '',
      host: tempUrl.value,
      path: ''
    }
  }
})



function updateDevtoolsUrl() {
  if (devtoolsBlobUrl) {
    URL.revokeObjectURL(devtoolsBlobUrl)
  }
  
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>DevTools</title>
  <style>
    body { margin: 0; padding: 0; overflow: hidden; height: 100vh; background: #242424; }
    @media (prefers-color-scheme: light) {
      body { background: #fff; }
    }
  </style>
</head>
<body class="undocked" id="-blink-dev-tools">
  <script src="https://unpkg.com/@ungap/custom-elements/es.js"><\/script>
  <script type="module" src="https://cdn.jsdelivr.net/npm/chii@1.12.3/public/front_end/entrypoints/chii_app/chii_app.js"><\/script>
</body>
</html>`

  devtoolsBlobUrl = URL.createObjectURL(new Blob([html], { type: 'text/html' }))
  devtoolsUrl.value = `${devtoolsBlobUrl}#?embedded=${encodeURIComponent(window.location.origin)}`
}

watch(showDevtools, (val) => {
  if (val && !devtoolsUrl.value) {
    updateDevtoolsUrl()
  }
})



// No longer used in header

function toggleDevtools() {
  showDevtools.value = !showDevtools.value
}

function clearConsole() {
  // Chobitsu doesn't have a direct clear command via this bridge easily,
  // but reloading the iframe (which happens on change) clears it.
}

function handleMessage(event) {
  if (event.source === iframe.value?.contentWindow) {
    if (typeof event.data === 'string') {
      devtoolsIframe.value?.contentWindow?.postMessage(event.data, '*');
    }
  } else if (event.source === devtoolsIframe.value?.contentWindow) {
    if (typeof event.data === 'string') {
      iframe.value?.contentWindow?.postMessage({ event: 'DEV', data: event.data }, '*');
    }
  }
}

onMounted(() => {
  window.addEventListener('message', handleMessage)
})

onUnmounted(() => {
  window.removeEventListener('message', handleMessage)
  if (devtoolsBlobUrl) {
    URL.revokeObjectURL(devtoolsBlobUrl)
  }
})


</script>

<style scoped>
.preview-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--color-surface);
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: var(--pane-header-height);
  padding: 0 8px;
  background: var(--color-background-alt);
  border-bottom: 1px solid var(--color-border-light);
  flex-shrink: 0;
  gap: 20px;
}

.preview-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.url-input:hover {
  background: var(--color-background);
  border-color: var(--color-border);
}

.url-input-container {
  position: relative;
  display: flex;
  align-items: center;
  min-width: 280px;
  background: transparent;
  border-radius: var(--radius-sm);
  overflow: hidden;
  flex: 1;
}

.url-highlight-overlay {
  position: absolute;
  inset: 0;
  padding: 4px 8px;
  font-family: var(--font-mono);
  font-size: 12px;
  white-space: nowrap;
  pointer-events: none;
  display: flex;
  align-items: center;
  color: transparent;
  overflow: hidden;
}

.url-protocol { color: var(--color-text-muted); opacity: 0.5; }
.url-host { color: var(--color-accent); font-weight: 500; }
.url-path { color: var(--color-text-muted); }

.url-input {
  width: 100%;
  padding: 4px 8px;
  font-family: var(--font-mono);
  font-size: 12px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  color: transparent;
  caret-color: var(--color-text);
  transition: all var(--transition-fast);
}

.url-input:hover {
  background: var(--color-background);
  border-color: var(--color-border);
}

.url-input:focus {
  outline: none;
  background: var(--color-surface);
  border-color: var(--color-accent);
  color: var(--color-text) !important;
}

/* Keep input text transparent so only overlay (highlighted) is visible when NOT focused */
.url-input {
  color: transparent !important;
  caret-color: var(--color-text);
}

.url-input:focus ~ .url-highlight-overlay {
  display: none;
}

/* Loading bar styles */
.loading-bar {
  --loading-speed: 0.5s;
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  width: 0;
  background: var(--color-accent);
  opacity: 0.05;
  pointer-events: none;
  transition: width var(--transition-fast), opacity var(--transition-fast);
  z-index: 1;
}

.is-loading .loading-bar {
  width: 100%;
  animation: loading-slide var(--loading-speed) ease-in-out forwards;
}

@keyframes loading-slide {
  0% { left: -100%; width: 100%; opacity: 0; }
  20% { opacity: 0.1; }
  80% { opacity: 0.1; }
  100% { left: 100%; width: 100%; opacity: 0; }
}

.url-highlight-overlay {
  position: absolute;
  inset: 0;
  padding: 4px 8px;
  font-family: var(--font-mono);
  font-size: 12px;
  white-space: nowrap;
  pointer-events: none;
  display: flex;
  align-items: center;
  color: transparent;
  overflow: hidden;
  z-index: 2;
}


.preview-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: var(--radius-sm);
  color: var(--color-text-muted);
  transition: all var(--transition-fast);
}

.action-btn:hover {
  background: var(--color-border-light);
  color: var(--color-text);
}

.action-btn.active {
  background: var(--color-accent);
  color: white;
}

.action-btn.play-btn {
  background: var(--color-accent);
  color: white;
}

.action-btn.play-btn:hover {
  background: var(--color-accent-hover);
}

.action-btn i {
  font-size: 14px;
}

/* Auto-run toggle moved to settings */


.preview-body {
  flex: 1;
  overflow: hidden;
  background: white;
  display: flex;
  flex-direction: column;
}

.preview-split :deep(.splitpanes__splitter) {
  background: var(--color-border);
  height: 4px;
  cursor: row-resize;
  position: relative;
  transition: background var(--transition-fast);
}

.preview-split :deep(.splitpanes__splitter:hover) {
  background: var(--color-accent);
}

.preview-split :deep(.splitpanes__splitter::after) {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 20px;
  height: 2px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
}

.preview-iframe {
  width: 100%;
  height: 100%;
  border: none;
  background: white;
  display: block;
}

.devtools-iframe {
  width: 100%;
  height: 100%;
  border: none;
  background: white;
  display: block;
}

@media (prefers-color-scheme: dark) {
  .devtools-iframe {
    background: #242424;
  }
}
</style>
