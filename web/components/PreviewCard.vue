<template>
  <div class="preview-card">
    <header
      class="preview-header"
      @click="(e) => e.altKey && $emit('toggle-maximize')"
    >
      <div class="preview-info">
        <div class="url-input-container" :class="{ 'is-loading': isLoading }">
          <div class="loading-bar"></div>
          <div
            class="url-highlight-overlay"
            aria-hidden="true"
            v-if="!isFocused"
          >
            <span class="url-protocol">{{ urlParts.protocol }}</span
            ><span class="url-host">{{ urlParts.host }}</span
            ><span class="url-path">{{ urlParts.path }}</span>
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
            placeholder="Preview URL"
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
          v-if="errors.length > 0"
          class="action-btn error-btn"
          @click="toggleErrors"
          :class="{ active: showErrors }"
          title="Show Errors"
        >
          <i class="ph-duotone ph-warning-circle"></i>
          <span class="error-badge">{{ errors.length }}</span>
        </button>
        <button
          class="action-btn"
          @click="toggleDevtools"
          :class="{ active: showDevtools }"
          title="Toggle DevTools"
        >
          <i class="ph-duotone ph-terminal-window"></i>
        </button>

        <button
          class="action-btn"
          @click="$emit('toggle-maximize')"
          :title="isMaximized ? 'Restore Preview' : 'Maximize Preview'"
        >
          <i
            :class="isMaximized ? 'ph-duotone ph-arrows-in' : 'ph-duotone ph-arrows-out'"
          ></i>
        </button>
      </div>
    </header>
    <div class="preview-body">
      <Splitpanes
        v-if="showDevtools"
        horizontal
        class="default-theme preview-split"
      >
        <Pane min-size="20">
          <Splitpanes
            v-if="showErrors"
            horizontal
            class="default-theme preview-split"
          >
            <Pane min-size="20">
              <iframe
                ref="iframe"
                :key="iframeKey"
                :src="currentPreviewUrl"
                sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
                class="preview-iframe"
                @load="onIframeLoad"
              ></iframe>
            </Pane>
            <Pane size="30" min-size="10">
              <ErrorPanel
                :errors="errors"
                @close="showErrors = false"
                @jump="handleJumpToError"
              />
            </Pane>
          </Splitpanes>
          <iframe
            v-else
            ref="iframe"
            :key="iframeKey"
            :src="currentPreviewUrl"
            sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
            class="preview-iframe"
            @load="onIframeLoad"
          ></iframe>
        </Pane>
        <Pane min-size="20">
          <iframe
            ref="devtoolsIframe"
            :key="devtoolsKey"
            :src="devtoolsUrl"
            class="devtools-iframe"
            tabindex="-1"
            @load="onDevtoolsLoad"
          ></iframe>
        </Pane>
      </Splitpanes>
      <div v-else class="full-height-container">
        <Splitpanes
          v-if="showErrors"
          horizontal
          class="default-theme preview-split"
        >
          <Pane min-size="20">
            <iframe
              ref="iframe"
              :key="iframeKey"
              :src="currentPreviewUrl"
              sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
              class="preview-iframe"
              @load="onIframeLoad"
            ></iframe>
          </Pane>
          <Pane size="30" min-size="10">
            <ErrorPanel
              :errors="errors"
              @close="showErrors = false"
              @jump="handleJumpToError"
            />
          </Pane>
        </Splitpanes>
        <iframe
          v-else
          ref="iframe"
          :key="iframeKey"
          :src="currentPreviewUrl"
          sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
          class="preview-iframe"
          @load="onIframeLoad"
        ></iframe>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed, onMounted, onUnmounted, nextTick } from "vue";
import { Splitpanes, Pane } from "splitpanes";
import "splitpanes/dist/splitpanes.css";
import ErrorPanel from "./ErrorPanel.vue";
import { useFileSystem } from "../state_management.js";
import { supportWorkers } from "../utils/patches.js";
import { DevToolsManager } from "../utils/DevToolsManager.js";

const props = defineProps({
  previewState: {
    type: Object,
    default: () => ({ displayURL: "", contentURL: "" }),
  },
  settings: {
    type: Object,
    required: true,
  },
  lastManualRender: {
    type: Number,
    default: 0,
  },
  isMaximized: {
    type: Boolean,
    default: false,
  },
  errors: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits([
  "refresh",
  "settings",
  "toggle-maximize",
  "jump",
  "clear-errors",
]);

const { addError } = useFileSystem();

const iframe = ref(null);
const devtoolsIframe = ref(null);
const urlInput = ref(null);
const showDevtools = ref(false);
const showErrors = ref(false);
const tempUrl = ref(props.previewState?.displayURL || "http://preview.pen/");
const isFocused = ref(false);
const currentPreviewUrl = ref(props.previewState?.contentURL || "about:blank");
const isLoading = ref(false);
const iframeKey = ref(0);
const devtoolsKey = ref(0);

// DevTools Manager Instance
let devtoolsManager = null;

let loadingTimer = null;
let previewDebounceTimer = null;

function extractUrlSuffix(displayUrl) {
  try {
    const url = new URL(displayUrl);
    return { search: url.search, hash: url.hash };
  } catch {
    const searchMatch = displayUrl.match(/(\?[^#]*)/);
    const hashMatch = displayUrl.match(/(#.*)$/);
    return { search: searchMatch?.[1] || "", hash: hashMatch?.[1] || "" };
  }
}

function buildIframeUrl(contentURL, displayUrl) {
  if (!contentURL) return "about:blank";
  const { search, hash } = extractUrlSuffix(displayUrl);
  if (!search && !hash) return contentURL;
  const payload = btoa(JSON.stringify({ s: search, h: hash }));
  return contentURL + "#__pen=" + payload;
}

watch(
  () => props.previewState,
  (newState) => {
    if (previewDebounceTimer) clearTimeout(previewDebounceTimer);
    
    // Immediate update for initial load, debounce for subsequent ones
    const delay = iframeKey.value === 0 ? 0 : 300;
    
    previewDebounceTimer = setTimeout(() => {
        if (newState && newState.contentURL) {
          const { search, hash } = extractUrlSuffix(tempUrl.value);
          const baseDisplay = newState.displayURL || "http://preview.pen/";
          tempUrl.value = baseDisplay.replace(/[?#].*$/, "") + search + hash;
          currentPreviewUrl.value = buildIframeUrl(
            newState.contentURL,
            tempUrl.value,
          );
          iframeKey.value++;
          triggerFlash();
        }
    }, delay);
  },
  { immediate: true, deep: true },
);

function triggerFlash() {
  isLoading.value = false;
  nextTick(() => {
    isLoading.value = true;
    if (loadingTimer) clearTimeout(loadingTimer);
    loadingTimer = setTimeout(() => {
      isLoading.value = false;
    }, 500);
  });
}

function handleUrlEnter() {
  urlInput.value?.blur();
  const contentURL = props.previewState?.contentURL;
  if (contentURL) {
    currentPreviewUrl.value = buildIframeUrl(contentURL, tempUrl.value);
  }
  iframeKey.value++;
  triggerFlash();
}

function handleUrlEsc() {
  tempUrl.value = props.previewState?.displayURL || "http://preview.pen/";
  urlInput.value?.blur();
}

function onIframeLoad() {
  if (!showDevtools.value) return;
  devtoolsManager?.onIframeLoad();
}

function onDevtoolsLoad() {
  devtoolsManager?.onDevtoolsLoad();
}

const devtoolsUrl = ref("");
let devtoolsBlobUrl = null;

watch(
  () => props.lastManualRender,
  () => {
    if (props.lastManualRender > 0) {
      iframeKey.value++;
      triggerFlash();
    }
  },
);

const urlParts = computed(() => {
  // Safe parsing to prevent renderer crashes
  if (!tempUrl.value) {
      return { protocol: "", host: "", path: "" };
  }
  try {
    const url = new URL(tempUrl.value);
    return {
      protocol: url.protocol + "//",
      host: url.host,
      path: url.pathname + url.search + url.hash,
    };
  } catch (e) {
    return {
      protocol: "",
      host: tempUrl.value || "",
      path: "",
    };
  }
});

function updateDevtoolsUrl() {
  if (devtoolsBlobUrl) {
    URL.revokeObjectURL(devtoolsBlobUrl);
  }

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>DevTools</title>
  <style>
    body { margin: 0; padding: 0; overflow: hidden; height: 100vh; background: #242424; }
    @media (prefers-color-scheme: light) {
      body { background: #fff; }
    }
  </style>
  <script>
    (${supportWorkers.toString()})();
  <\/script>
</head>
<body class="undocked" id="-blink-dev-tools">
  <script src="https://unpkg.com/@ungap/custom-elements/es.js"><\/script>
  <script type="module" src="https://cdn.jsdelivr.net/npm/chii@1.12.3/public/front_end/entrypoints/chii_app/chii_app.js"><\/script>
</body>
</html>`;

  devtoolsBlobUrl = URL.createObjectURL(
    new Blob([html], { type: "text/html" }),
  );
  devtoolsUrl.value = `${devtoolsBlobUrl}#?embedded=${encodeURIComponent(window.location.origin)}`;
}

watch(showDevtools, (val) => {
  if (val && !devtoolsUrl.value) {
    updateDevtoolsUrl();
  } else if (!val) {
    devtoolsManager?.clear();
  }
});

function toggleDevtools() {
  showDevtools.value = !showDevtools.value;
}

function toggleErrors() {
  showErrors.value = !showErrors.value;
}

function handleJumpToError(error) {
  const emitData = {
    filename: error.filename,
    line: error.line,
    column: error.column,
  };
  emit("jump", emitData);
}

watch(
  () => props.errors,
  (newErrors) => {
    if (newErrors.length > 0 && !showErrors.value) {
    }
    if (newErrors.length === 0 && showErrors.value) {
      showErrors.value = false;
    }
  },
);

function handleClearErrors() {
  console.log("PreviewCard: clear-errors emitted");
  emit("clear-errors");
  showErrors.value = false;
}

function handleKeydown(event) {
  if (event.key === "Escape") {
    if (showErrors.value) showErrors.value = false;
    if (showDevtools.value) showDevtools.value = false;
  }
}

function handleMessage(event) {
  if (event.data && event.data.type === "PEN_ERROR") {
    addError(event.data.error);
    return;
  }
  // Delegate to manager
  devtoolsManager?.handleMessage(event);
}

onMounted(() => {
  // Initialize DevToolsManager
  devtoolsManager = new DevToolsManager(
    useFileSystem, 
    () => iframe.value,
    () => devtoolsIframe.value
  );
  
  window.addEventListener("message", handleMessage);
  window.addEventListener("keydown", handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener("message", handleMessage);
  window.removeEventListener("keydown", handleKeydown);
  if (devtoolsBlobUrl) {
    URL.revokeObjectURL(devtoolsBlobUrl);
  }
});
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

.url-protocol {
  color: var(--color-text-muted);
  opacity: 0.5;
}
.url-host {
  color: var(--color-accent);
  font-weight: 500;
}
.url-path {
  color: var(--color-text-muted);
}

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
  transition:
    width var(--transition-fast),
    opacity var(--transition-fast);
  z-index: 1;
}

.is-loading .loading-bar {
  width: 100%;
  animation: loading-slide var(--loading-speed) ease-in-out forwards;
}

@keyframes loading-slide {
  0% {
    left: -100%;
    width: 100%;
    opacity: 0;
  }
  20% {
    opacity: 0.1;
  }
  80% {
    opacity: 0.1;
  }
  100% {
    left: 100%;
    width: 100%;
    opacity: 0;
  }
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
  content: "";
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

.full-height-container {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
}

.action-btn.error-btn {
  color: var(--color-error);
  position: relative;
}

.action-btn.error-btn:hover {
  background: var(--color-error-bg, rgba(255, 0, 0, 0.1));
}

.action-btn.error-btn.active {
  background: var(--color-error-dark);
  color: white;
}

.error-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  background: var(--color-error);
  color: white;
  font-size: 9px;
  padding: 2px 4px;
  border-radius: 10px;
  min-width: 14px;
  text-align: center;
  border: 2px solid var(--color-background-alt); /* Cutout effect */
}

.action-btn.error-btn.active .error-badge {
  border-color: var(--color-error); /* Blend in when active */
  background: white;
  color: var(--color-error);
}
</style>
