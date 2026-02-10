<template>
  <div class="pane-manager" :class="[settings.layoutMode, { 'is-any-dragging': isAnyDragging }]">
    <div v-show="isAnyDragging" class="drag-overlay"></div>

    <Splitpanes 
      :key="`main-${settings.layoutMode}`"
      class="default-theme main-split" 
      :horizontal="settings.layoutMode === 'rows'"
      @ready="onReady"
      @resize="handleMainResize"
    >
      <Pane 
        :size="previewMaximized ? 2 : (100 - previewSize)" 
        class="editors-container-pane"
        :class="{ 'is-preview-maximized': previewMaximized }"
      >
        <div v-if="previewMaximized" class="editors-collapsed-rail" @click="previewMaximized = false">
          <button class="expand-rail-btn" title="Restore Editors">
            <i :class="settings.layoutMode === 'rows' ? 'ph-bold ph-caret-down' : 'ph-bold ph-caret-right'"></i>
          </button>
        </div>
        <Splitpanes 
          v-else
          :key="`editors-${settings.layoutMode}-${editors.length}`"
          class="editors-split"
          :horizontal="settings.layoutMode === 'columns'"
          @ready="() => onEditorsReady()"
          @resize="(panes) => updatePanes(panes)"
        >
          <Pane 
            :size="maximizedIdx !== null ? (idx === maximizedIdx ? 100 : 0) : (panes[idx]?.size || 100 / editors.length)"
            v-for="(editor, idx) in editors" 
            :key="editor.id || editor.filename"
            :min-size="maximizedIdx !== null ? 0 : minPaneSize"
          >
            <EditorCard
              :editor="editor"
              :adapter="adapters[idx]"
              :content="files[editor.filename] || ''"
              :is-collapsed="maximizedIdx !== null ? idx !== maximizedIdx : collapsedEditors[idx]"
              :layout-mode="settings.layoutMode"
              @update="(content) => $emit('update', editor.filename, content)"
              @rename="handleRename"
              @settings-update="handleSettingsUpdate"
              @toggle-collapse="togglePaneCollapse(idx)"
              @format="(filename) => $emit('format', filename)"
              @run="handleEditorRun"
              @dblclick-header="toggleMaximize(idx)"
            />
          </Pane>
        </Splitpanes>
      </Pane>
      <Pane :size="previewMaximized ? 98 : previewSize" :min-size="15" class="preview-pane">
        <PreviewCard 
          :html="previewHtml" 
          :settings="settings"
          :last-manual-render="lastManualRender"
          :is-maximized="previewMaximized"
          @refresh="$emit('render', true)" 
          @settings="$emit('settings')"
          @toggle-maximize="previewMaximized = !previewMaximized"
        />
        <div v-show="isAnyDragging || altPressed" class="iframe-blocker"></div>
      </Pane>
    </Splitpanes>

    <!-- Alt-hover maximize overlay -->
    <Teleport to="body">
      <div 
        v-if="altHoveredPane !== null"
        class="maximize-overlay"
        :style="overlayStyle"
        @click="toggleMaximize(altHoveredPane)"
      >
        <div class="maximize-overlay-content">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"/>
          </svg>
          <span>{{ (altHoveredPane === 'preview' ? previewMaximized : maximizedIdx === altHoveredPane) ? 'Restore' : 'Maximize' }}</span>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { Splitpanes, Pane } from 'splitpanes'
import 'splitpanes/dist/splitpanes.css'
import EditorCard from './EditorCard.vue'
import PreviewCard from './PreviewCard.vue'

const collapseThreshold = 7
const collapsedEditors = ref([])
const panes = ref([])
const previousSizes = ref([])
const maximizedIdx = ref(null)

const previewMaximized = ref(false)
const previewSize = ref(60) // Default preview size

const altHoveredPane = ref(null)
const overlayStyle = ref({})
const altPressed = ref(false)
let altKeyDown = false

const props = defineProps({
  editors: { type: Array, default: () => [] },
  files: { type: Object, default: () => ({}) },
  adapters: { type: Array, default: () => [] },
  previewHtml: { type: String, default: '' },
  settings: { type: Object, required: true },
  lastManualRender: { type: Number, default: 0 }
})

const emit = defineEmits(['update', 'render', 'rename', 'settings-update', 'format', 'settings'])

const minPaneSize = 5
const isAnyDragging = ref(false)
let activeSplitter = null

function handleMainResize(p) {
  if (p[1] && !previewMaximized.value) {
    previewSize.value = p[1].size
  }
}

function toggleMaximize(idx) {
  if (idx === 'preview') {
    previewMaximized.value = !previewMaximized.value
    altHoveredPane.value = null
    return
  }
  maximizedIdx.value = maximizedIdx.value === idx ? null : idx
  altHoveredPane.value = null
}

function togglePaneCollapse(idx) {
  if (maximizedIdx.value !== null) {
    maximizedIdx.value = null
    return
  }
  if (collapsedEditors.value[idx]) {
    panes.value[idx].size = previousSizes.value[idx] || (100 / props.editors.length)
  } else {
    previousSizes.value[idx] = panes.value[idx].size
    panes.value[idx].size = minPaneSize
  }
  updateCollapsed()
}

function handleEditorRun() { emit('render', true) }

function updatePanes(p) {
  panes.value = p
  updateCollapsed()
}

function updateCollapsed() {
  collapsedEditors.value = panes.value.map(p => p.size <= collapseThreshold)
}

function onReady() {}

watch(props.editors, onEditorsReady)

async function onEditorsReady() {
  if (!props.editors.length) return setTimeout(onEditorsReady, 100)
  const size = 100 / props.editors.length
  panes.value = props.editors.map(() => ({ size, min: 5, max: 100 }))
  previousSizes.value = props.editors.map(() => size)
  updateCollapsed()
}

function onMouseDown(e) {
  const splitter = e.target.closest('.splitpanes__splitter')
  if (splitter) {
    isAnyDragging.value = true
    document.body.classList.add('is-pen-dragging')
    activeSplitter = splitter
    activeSplitter.classList.add('is-active')
    window.addEventListener('mouseup', onMouseUp, { once: true })
  }
}

function onMouseUp() {
  isAnyDragging.value = false
  document.body.classList.remove('is-pen-dragging')
  if (activeSplitter) {
    activeSplitter.classList.remove('is-active')
    activeSplitter = null
  }
}

function handleRename(oldFilename, newFilename, newType) { emit('rename', oldFilename, newFilename, newType) }
function handleSettingsUpdate(filename, settings) { emit('settings-update', filename, settings) }

function onKeyDown(e) {
  if (e.key === 'Alt') {
    altKeyDown = true
    altPressed.value = true
  }
}

function onKeyUp(e) {
  if (e.key === 'Alt') {
    altKeyDown = false
    altPressed.value = false
    altHoveredPane.value = null
  }
}

function onMouseMove(e) {
  if (!altKeyDown) {
    if (altHoveredPane.value !== null) altHoveredPane.value = null
    return
  }

  const editorCards = document.querySelectorAll('.editor-card')
  const previewCard = document.querySelector('.preview-card')
  let found = null
  let rect = null

  editorCards.forEach((card, idx) => {
    const r = card.getBoundingClientRect()
    if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
      found = idx
      rect = r
    }
  })

  if (found === null && previewCard) {
    const r = previewCard.getBoundingClientRect()
    if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
      found = 'preview'
      rect = r
    }
  }

  if (found !== null && rect) {
    altHoveredPane.value = found
    overlayStyle.value = {
      position: 'fixed',
      top: rect.top + 'px',
      left: rect.left + 'px',
      width: rect.width + 'px',
      height: rect.height + 'px',
      zIndex: 9998
    }
  } else {
    altHoveredPane.value = null
  }
}

onMounted(() => {
  window.addEventListener('mousedown', onMouseDown)
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('mousemove', onMouseMove)
})

onUnmounted(() => {
  window.removeEventListener('mousedown', onMouseDown)
  window.removeEventListener('mouseup', onMouseUp)
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
  window.removeEventListener('mousemove', onMouseMove)
})
</script>

<style scoped>
.pane-manager {
  flex: 1;
  overflow: hidden;
  position: relative;
  height: 100%;
}

.drag-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  pointer-events: none;
}

.preview-pane { position: relative; }

.editors-container-pane {
  display: flex;
  flex-direction: column;
}

.editors-container-pane.is-preview-maximized {
  background: var(--color-background-alt);
  border-right: 1px solid var(--color-border);
}

.editors-collapsed-rail {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  width: 100%;
  cursor: pointer;
  background: var(--color-background-alt);
  transition: all var(--transition-fast);
}

.editors-collapsed-rail:hover {
  background: var(--color-border-light);
}

.expand-rail-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  color: var(--color-accent);
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
}

.pane-manager :deep(.main-split > .splitpanes__splitter) {
  display: flex;
}

.pane-manager :deep(.main-split.splitpanes--dragging > .splitpanes__splitter) {
  background: var(--color-accent);
}

.is-preview-maximized + :deep(.splitpanes__splitter) {
  display: none !important;
}

.iframe-blocker {
  position: absolute;
  inset: 0;
  z-index: 10;
  background: transparent;
}

.pane-manager :deep(.splitpanes--dragging .splitpanes__pane) { transition: none !important; }
.pane-manager :deep(.splitpanes) { height: 100%; }
.pane-manager :deep(.splitpanes__pane) {
  display: flex;
  flex-direction: column;
  background: var(--color-background);
  transition: none; 
}

.pane-manager :deep(.splitpanes__splitter) {
  background: var(--color-border);
  transition: background var(--transition-fast);
  position: relative;
}

.pane-manager :deep(.splitpanes__splitter.is-active),
.pane-manager :deep(.splitpanes__splitter:hover) {
  background: var(--color-accent);
}

.pane-manager :deep(.splitpanes--vertical > .splitpanes__splitter) { width: 4px; cursor: col-resize; }
.pane-manager :deep(.splitpanes--horizontal > .splitpanes__splitter) { height: 4px; cursor: row-resize; }

.pane-manager :deep(.splitpanes__splitter::after) {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
}

.pane-manager :deep(.splitpanes--vertical > .splitpanes__splitter::after) { width: 2px; height: 20px; }
.pane-manager :deep(.splitpanes--horizontal > .splitpanes__splitter::after) { width: 20px; height: 2px; }

.layout-controls {
  display: none;
}

/* Maximize overlay */
.maximize-overlay {
  background: rgba(194, 65, 12, 0.08);
  border: 2px solid rgba(194, 65, 12, 0.3);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  animation: fadeIn 120ms ease;
  pointer-events: auto;
}

.maximize-overlay:hover {
  background: rgba(194, 65, 12, 0.14);
  border-color: rgba(194, 65, 12, 0.5);
}

.maximize-overlay-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  color: var(--color-accent);
  font-size: 12px;
  font-weight: 600;
}
</style>
