<template>
  <div class="preview-card">
    <header class="preview-header">
      <div class="preview-info">
        <i class="ph-duotone ph-monitor-play"></i>
        <span class="preview-title">Preview</span>
      </div>
      <div class="preview-actions">
        <button 
          v-if="!autoRun"
          class="action-btn play-btn" 
          @click="$emit('refresh')" 
          title="Run (Cmd+Enter)"
        >
          <i class="ph-duotone ph-play"></i>
        </button>
        <label class="auto-run-toggle" :title="autoRun ? 'Auto-run enabled' : 'Auto-run disabled'">
          <input 
            type="checkbox" 
            :checked="autoRun" 
            @change="$emit('toggle-auto-run')"
          />
          <span class="toggle-track">
            <i v-if="autoRun" class="ph-duotone ph-lightning"></i>
            <i v-else class="ph-duotone ph-pause"></i>
          </span>
        </label>
        <button class="action-btn" @click="openInNewTab" title="Open in new tab">
          <i class="ph-duotone ph-arrow-square-out"></i>
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
    <div class="preview-body" :class="{ 'with-devtools': showDevtools }">
      <iframe
        ref="iframe"
        :srcdoc="enhancedHtml"
        sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
        class="preview-iframe"
      ></iframe>
      <div v-if="showDevtools" class="devtools-panel">
        <div class="devtools-header">
          <button 
            v-for="tab in devtoolsTabs" 
            :key="tab.id"
            class="devtools-tab"
            :class="{ active: activeDevtoolsTab === tab.id }"
            @click="activeDevtoolsTab = tab.id"
          >
            {{ tab.name }}
          </button>
        </div>
        <div class="devtools-content">
          <div v-if="activeDevtoolsTab === 'console'" class="console-output" ref="consoleOutputRef">
            <div 
              v-for="(log, idx) in consoleLogs" 
              :key="idx" 
              class="console-entry"
              :class="log.type"
            >
              <span class="console-type">{{ log.type }}</span>
              <span class="console-message">{{ log.message }}</span>
            </div>
            <div v-if="consoleLogs.length === 0" class="console-empty">
              Console is empty
            </div>
          </div>
          <div v-else-if="activeDevtoolsTab === 'errors'" class="errors-output">
            <div 
              v-for="(error, idx) in errors" 
              :key="idx" 
              class="error-entry"
            >
              <span class="error-message">{{ error.message }}</span>
              <span class="error-source" v-if="error.source">{{ error.source }}</span>
            </div>
            <div v-if="errors.length === 0" class="errors-empty">
              No errors
            </div>
          </div>
        </div>
        <div class="devtools-actions">
          <button class="devtools-btn" @click="clearConsole" title="Clear console">
            <i class="ph-duotone ph-trash"></i>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed, onMounted, onUnmounted, nextTick } from 'vue'

const props = defineProps({
  html: {
    type: String,
    default: ''
  },
  autoRun: {
    type: Boolean,
    default: true
  }
})

defineEmits(['refresh', 'toggle-auto-run'])

const iframe = ref(null)
const showDevtools = ref(false)
const activeDevtoolsTab = ref('console')
const consoleLogs = ref([])
const errors = ref([])
const consoleOutputRef = ref(null)

const devtoolsTabs = [
  { id: 'console', name: 'Console' },
  { id: 'errors', name: 'Errors' }
]

const devtoolsScript = `
<script>
(function() {
  const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info,
    debug: console.debug
  };

  function formatArgs(args) {
    return Array.from(args).map(arg => {
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg, null, 2);
        } catch(e) {
          return String(arg);
        }
      }
      return String(arg);
    }).join(' ');
  }

  function sendToParent(type, args) {
    window.parent.postMessage({
      type: 'console',
      data: { type, message: formatArgs(args) }
    }, '*');
  }

  console.log = function() {
    originalConsole.log.apply(console, arguments);
    sendToParent('log', arguments);
  };
  console.warn = function() {
    originalConsole.warn.apply(console, arguments);
    sendToParent('warn', arguments);
  };
  console.error = function() {
    originalConsole.error.apply(console, arguments);
    sendToParent('error', arguments);
  };
  console.info = function() {
    originalConsole.info.apply(console, arguments);
    sendToParent('info', arguments);
  };
  console.debug = function() {
    originalConsole.debug.apply(console, arguments);
    sendToParent('debug', arguments);
  };

  window.onerror = function(message, source, lineno, colno, error) {
    window.parent.postMessage({
      type: 'error',
      data: { 
        message: message,
        source: source ? source + ':' + lineno + ':' + colno : null
      }
    }, '*');
    return false;
  };

  window.addEventListener('unhandledrejection', function(event) {
    window.parent.postMessage({
      type: 'error',
      data: { 
        message: 'Unhandled Promise Rejection: ' + (event.reason?.message || event.reason),
        source: null
      }
    }, '*');
  });
})();
<\/script>
`

const enhancedHtml = computed(() => {
  if (!props.html) return ''
  
  const headClose = props.html.indexOf('</head>')
  if (headClose !== -1) {
    return props.html.slice(0, headClose) + devtoolsScript + props.html.slice(headClose)
  }
  
  const bodyStart = props.html.indexOf('<body')
  if (bodyStart !== -1) {
    return props.html.slice(0, bodyStart) + devtoolsScript + props.html.slice(bodyStart)
  }
  
  return devtoolsScript + props.html
})

function openInNewTab() {
  window.open('http://localhost:3002', '_blank')
}

function toggleDevtools() {
  showDevtools.value = !showDevtools.value
}

function clearConsole() {
  consoleLogs.value = []
  errors.value = []
}

function handleMessage(event) {
  if (event.data?.type === 'console') {
    consoleLogs.value.push(event.data.data)
    nextTick(() => {
      if (consoleOutputRef.value) {
        consoleOutputRef.value.scrollTop = consoleOutputRef.value.scrollHeight
      }
    })
  } else if (event.data?.type === 'error') {
    errors.value.push(event.data.data)
  }
}

onMounted(() => {
  window.addEventListener('message', handleMessage)
})

onUnmounted(() => {
  window.removeEventListener('message', handleMessage)
})

watch(() => props.html, () => {
  consoleLogs.value = []
  errors.value = []
}, { immediate: false })
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
  padding: 0 12px;
  background: var(--color-background-alt);
  border-bottom: 1px solid var(--color-border-light);
  flex-shrink: 0;
}

.preview-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.preview-info i {
  font-size: 16px;
  color: var(--color-accent);
}

.preview-title {
  font-family: var(--font-sans);
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
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

.auto-run-toggle {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.auto-run-toggle input {
  display: none;
}

.toggle-track {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 20px;
  border-radius: 10px;
  background: var(--color-border);
  transition: all var(--transition-fast);
}

.auto-run-toggle input:checked + .toggle-track {
  background: var(--color-accent);
}

.toggle-track i {
  font-size: 12px;
  color: white;
}

.preview-body {
  flex: 1;
  overflow: hidden;
  background: white;
  display: flex;
  flex-direction: column;
}

.preview-body.with-devtools {
  display: grid;
  grid-template-rows: 1fr 200px;
}

.preview-iframe {
  width: 100%;
  height: 100%;
  border: none;
  background: white;
}

.devtools-panel {
  display: flex;
  flex-direction: column;
  background: var(--color-surface);
  border-top: 1px solid var(--color-border);
}

.devtools-header {
  display: flex;
  align-items: center;
  gap: 0;
  border-bottom: 1px solid var(--color-border-light);
  padding: 0 8px;
  flex-shrink: 0;
}

.devtools-tab {
  padding: 8px 12px;
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--color-text-muted);
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: all var(--transition-fast);
}

.devtools-tab:hover {
  color: var(--color-text);
}

.devtools-tab.active {
  color: var(--color-accent);
  border-bottom-color: var(--color-accent);
}

.devtools-content {
  flex: 1;
  overflow: auto;
  font-family: var(--font-mono);
  font-size: 12px;
}

.console-output,
.errors-output {
  padding: 8px 12px;
}

.console-entry,
.error-entry {
  display: flex;
  gap: 8px;
  padding: 4px 0;
  border-bottom: 1px solid var(--color-border-light);
}

.console-entry:last-child,
.error-entry:last-child {
  border-bottom: none;
}

.console-type {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  flex-shrink: 0;
}

.console-entry.log .console-type {
  background: #e0e7ff;
  color: #4338ca;
}

.console-entry.warn .console-type {
  background: #fef3c7;
  color: #b45309;
}

.console-entry.error .console-type {
  background: #fee2e2;
  color: #dc2626;
}

.console-entry.info .console-type {
  background: #dbeafe;
  color: #2563eb;
}

.console-entry.debug .console-type {
  background: #f3e8ff;
  color: #9333ea;
}

.console-message,
.error-message {
  flex: 1;
  word-break: break-word;
  white-space: pre-wrap;
}

.error-entry {
  flex-direction: column;
  gap: 4px;
}

.error-message {
  color: #dc2626;
}

.error-source {
  font-size: 10px;
  color: var(--color-text-muted);
}

.console-empty,
.errors-empty {
  color: var(--color-text-muted);
  font-style: italic;
  padding: 16px 0;
  text-align: center;
}

.devtools-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-top: 1px solid var(--color-border-light);
}

.devtools-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: var(--radius-sm);
  color: var(--color-text-muted);
  transition: all var(--transition-fast);
}

.devtools-btn:hover {
  background: var(--color-border-light);
  color: var(--color-text);
}
</style>
