<template>
  <div class="pane-manager" :class="[settings.layoutMode, { 'is-any-dragging': isAnyDragging }]">
    <div v-show="isAnyDragging" class="drag-overlay"></div>

    <Splitpanes 
      :key="`main-${settings.layoutMode}`"
      class="default-theme main-split" 
      :horizontal="settings.layoutMode === 'rows'"
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
          @ready="() => pm.init(editors.length)"
          @resize="(p) => pm.updateFromSplitpanes(p)"
        >
          <Pane 
            :size="pm.getSize(idx)"
            v-for="(editor, idx) in editors" 
            :key="editor.id || editor.filename"
            :min-size="pm.getMinSize(idx)"
          >
            <EditorCard
              :editor="editor"
              :adapter="adapters[idx]"
              :content="files[editor.filename] || ''"
              :is-collapsed="pm.isCollapsed(idx)"
              :layout-mode="settings.layoutMode"
              @update="(content) => $emit('update', editor.filename, content)"
              @rename="handleRename"
              @settings-update="handleSettingsUpdate"
              @toggle-collapse="pm.setCollapsed(idx)"
              @format="(filename) => $emit('format', filename)"
              @minify="(filename) => $emit('minify', filename)"
              @compile="(filename, target) => $emit('compile', filename, target)"
              @run="handleEditorRun"
              @dblclick-header="toggleMaximize(idx)"
            />
          </Pane>
        </Splitpanes>
      </Pane>
      <Pane :size="previewMaximized ? 98 : previewSize" :min-size="15" class="preview-pane">
        <PreviewCard 
          :preview-state="previewState" 
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
          <i :class="['ph-light', (altHoveredPane === 'preview' ? previewMaximized : pm.maximizedIdx.value === altHoveredPane) ? 'ph-arrows-in' : 'ph-arrows-out']" style="font-size: 32px;"></i>
          <span>{{ (altHoveredPane === 'preview' ? previewMaximized : pm.maximizedIdx.value === altHoveredPane) ? 'Restore' : 'Maximize' }}</span>
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
import { usePanesManager } from '../composables/usePanesManager.js'

const pm = usePanesManager()

const previewMaximized = ref(false)
const previewSize = ref(60)

const altHoveredPane = ref(null)
const overlayStyle = ref({})
const altPressed = ref(false)
let altKeyDown = false

const props = defineProps({
  editors: { type: Array, default: () => [] },
  files: { type: Object, default: () => ({}) },
  adapters: { type: Array, default: () => [] },
  previewState: { type: Object, default: () => ({ displayURL: '', contentURL: '' }) },
  settings: { type: Object, required: true },
  lastManualRender: { type: Number, default: 0 }
})

const emit = defineEmits(['update', 'render', 'rename', 'settings-update', 'format', 'minify', 'compile', 'settings'])

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
  pm.setMaximized(idx)
  altHoveredPane.value = null
}

function handleEditorRun() { emit('render', true) }

watch(() => props.editors.length, (len) => {
  if (len > 0) pm.init(len)
})

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

const mouseX = ref(0)
const mouseY = ref(0)

function onKeyDown(e) {
  if (e.key === 'Alt') {
    altKeyDown = true
    altPressed.value = true
    checkAltHover()
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
  mouseX.value = e.clientX
  mouseY.value = e.clientY
  
  if (altKeyDown) {
    checkAltHover()
  } else {
    if (altHoveredPane.value !== null) altHoveredPane.value = null
  }
}

function checkAltHover() {
  const x = mouseX.value
  const y = mouseY.value
  
  const editorCards = document.querySelectorAll('.editor-card')
  const previewCard = document.querySelector('.preview-card')
  let found = null
  let rect = null

  editorCards.forEach((card, idx) => {
    const r = card.getBoundingClientRect()
    if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
      found = idx
      rect = r
    }
  })

  if (found === null && previewCard) {
    const r = previewCard.getBoundingClientRect()
    if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
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
  backdrop-filter: blur(4px) saturate(50%);
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
