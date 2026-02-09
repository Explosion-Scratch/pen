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
    <div class="preview-body">
      <Splitpanes v-if="showDevtools" horizontal class="default-theme preview-split">
        <Pane min-size="20">
          <iframe
            ref="iframe"
            :srcdoc="enhancedHtml"
            sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
            class="preview-iframe"
          ></iframe>
        </Pane>
        <Pane min-size="20">
          <iframe
            ref="devtoolsIframe"
            :srcdoc="devtoolsSrcdoc"
            class="devtools-iframe"
          ></iframe>
        </Pane>
      </Splitpanes>
      <iframe
        v-else
        ref="iframe"
        :srcdoc="enhancedHtml"
        sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
        class="preview-iframe"
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
  autoRun: {
    type: Boolean,
    default: true
  }
})

defineEmits(['refresh', 'toggle-auto-run'])

const iframe = ref(null)
const devtoolsIframe = ref(null)
const showDevtools = ref(false)

const devtoolsScript = `
<script src="https://cdn.jsdelivr.net/npm/chobitsu"><\/script>
<script type="module">
  (function() {
    if (window._chobitsu_initialized) return;
    window._chobitsu_initialized = true;

    chobitsu.setOnMessage((data) => {
      if (data.includes('"id":"tmp')) return;
      window.parent.postMessage({ event: 'CHOBITSU_EVENT', data }, '*');
    });

    window.addEventListener('message', (event) => {
      const { type, event: eventType, data } = event.data || {};
      if (eventType === 'DEV' && typeof data === 'string') {
        chobitsu.sendRawMessage(data);
      }
    });

    const sendToDevtools = (message) => {
      window.parent.postMessage({ event: 'CHOBITSU_EVENT', data: JSON.stringify(message) }, '*');
    };

    let id = 0;
    const sendToChobitsu = (message) => {
      message.id = 'tmp' + ++id;
      chobitsu.sendRawMessage(JSON.stringify(message));
    };

    const notifyNavigation = () => {
      sendToDevtools({
        method: 'Page.frameNavigated',
        params: {
          frame: {
            id: '1',
            loaderId: '1',
            url: location.href,
            securityOrigin: location.origin,
            mimeType: 'text/html'
          },
          type: 'Navigation'
        }
      });
      sendToChobitsu({ method: 'Network.enable' });
      sendToDevtools({ method: 'Runtime.executionContextsCleared' });
      sendToChobitsu({ method: 'Runtime.enable' });
      sendToChobitsu({ method: 'Debugger.enable' });
      sendToChobitsu({ method: 'DOMStorage.enable' });
      sendToChobitsu({ method: 'DOM.enable' });
      sendToChobitsu({ method: 'CSS.enable' });
      sendToChobitsu({ method: 'Overlay.enable' });
      sendToDevtools({ method: 'DOM.documentUpdated' });
    };
    
    setTimeout(notifyNavigation, 200);
  })();
<\/script>
`

const devtoolsSrcdoc = computed(() => {
  return `
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
  <script type="module">
    window.addEventListener('message', (event) => {
      const { event: eventType, data } = event.data || {};
      if (eventType === 'DEV_COMMAND' && typeof data === 'string') {
        window.postMessage(data, '*');
      }
    });

    const originalPostMessage = window.postMessage;
    window.postMessage = function(data, targetOrigin, transfer) {
      // Only send back to parent if it's a CDP command (has "id")
      // Events from the backend don't have "id" and shouldn't be sent back
      if (typeof data === 'string' && data.includes('"id":')) {
        window.parent.postMessage({ event: 'CHII_COMMAND', data }, '*');
      }
      return originalPostMessage.apply(this, arguments);
    };
  <\/script>
  <script type="module" src="https://cdn.jsdelivr.net/npm/chii@1.12.3/public/front_end/entrypoints/chii_app/chii_app.js"><\/script>
</body>
</html>`
})

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
  // Chobitsu doesn't have a direct clear command via this bridge easily,
  // but reloading the iframe (which happens on change) clears it.
}

function handleMessage(event) {
  if (event.source === iframe.value?.contentWindow) {
    if (event.data?.event === 'CHOBITSU_EVENT') {
      devtoolsIframe.value?.contentWindow?.postMessage({ event: 'DEV_COMMAND', data: event.data.data }, '*');
    }
  } else if (event.source === devtoolsIframe.value?.contentWindow) {
    if (event.data?.event === 'CHII_COMMAND') {
      iframe.value?.contentWindow?.postMessage({ event: 'DEV', data: event.data.data }, '*');
    }
  }
}

onMounted(() => {
  window.addEventListener('message', handleMessage)
})

onUnmounted(() => {
  window.removeEventListener('message', handleMessage)
})

watch(() => props.html, () => {
  // No longer needed to clear logs manually
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
