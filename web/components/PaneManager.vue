<template>
  <div class="pane-manager" :class="[layoutMode, { 'is-any-dragging': isAnyDragging }]">
    <div v-show="isAnyDragging" class="drag-overlay"></div>

    <Splitpanes 
      :key="`main-${layoutMode}`"
      class="default-theme main-split" 
      :horizontal="layoutMode === 'rows'"
      @resize="handleMainResize"
      @ready="onReady"
    >
      <Pane :size="100 - previewPaneSize">
        <Splitpanes 
          :key="`editors-${layoutMode}`"
          class="editors-split"
          :horizontal="layoutMode === 'columns'"
          @resize="handleEditorsResize"
          @ready="onEditorsReady"
        >
          <Pane 
            v-for="(editor, idx) in editors" 
            :key="editor.id || editor.filename"
            :size="getEditorSize(idx)"
            :min-size="minPaneSize"
          >
            <EditorCard
              :editor="editor"
              :content="files[editor.filename] || ''"
              :is-collapsed="isPaneCollapsed(idx)"
              :layout-mode="layoutMode"
              @update="(content) => $emit('update', editor.filename, content)"
              @rename="handleRename"
              @settings-update="handleSettingsUpdate"
              @toggle-collapse="togglePaneCollapse(idx)"
              @format="(filename) => $emit('format', filename)"
            />
          </Pane>
        </Splitpanes>
      </Pane>
      <Pane :size="previewPaneSize" :min-size="15" class="preview-pane">
        <PreviewCard 
          :html="previewHtml" 
          :auto-run="autoRun"
          @refresh="$emit('render')" 
          @toggle-auto-run="$emit('toggle-auto-run')"
        />
        <div v-show="isAnyDragging" class="iframe-blocker"></div>
      </Pane>
    </Splitpanes>
    
    <div class="layout-controls">
      <button 
        class="layout-btn" 
        :class="{ active: layoutMode === 'columns' }"
        @click="$emit('set-layout', 'columns')"
        title="2 Column, 3 Row layout"
      >
        <i class="ph-duotone ph-columns"></i>
      </button>
      <button 
        class="layout-btn" 
        :class="{ active: layoutMode === 'rows' }"
        @click="$emit('set-layout', 'rows')"
        title="2 Row, 3 Column layout"
      >
        <i class="ph-duotone ph-rows"></i>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { Splitpanes, Pane } from 'splitpanes'
import 'splitpanes/dist/splitpanes.css'
import EditorCard from './EditorCard.vue'
import PreviewCard from './PreviewCard.vue'

const props = defineProps({
  editors: {
    type: Array,
    default: () => []
  },
  files: {
    type: Object,
    default: () => ({})
  },
  previewHtml: {
    type: String,
    default: ''
  },
  layoutMode: {
    type: String,
    default: 'columns'
  },
  autoRun: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['update', 'render', 'rename', 'settings-update', 'set-layout', 'toggle-auto-run', 'format'])

const columnsEditorSizes = ref([])
const rowsEditorSizes = ref([])
const previewPaneSize = ref(50)
const minPaneSize = 5 // Increased to ensure header is always visible when "collapsed"
const collapseThreshold = 7 
const isAnyDragging = ref(false)
let activeSplitter = null

function getEditorSize(idx) {
  const sizes = props.layoutMode === 'columns' ? columnsEditorSizes.value : rowsEditorSizes.value
  if (sizes[idx] !== undefined) return sizes[idx]
  return 100 / props.editors.length
}

function isPaneCollapsed(idx) {
  const sizes = props.layoutMode === 'columns' ? columnsEditorSizes.value : rowsEditorSizes.value
  return (sizes[idx] || 0) <= collapseThreshold
}

function togglePaneCollapse(idx) {
  const sizes = props.layoutMode === 'columns' ? columnsEditorSizes : rowsEditorSizes
  if (isPaneCollapsed(idx)) {
    const remainingSpace = 100 - minPaneSize
    const expandedSize = remainingSpace / props.editors.length
    sizes.value[idx] = Math.max(expandedSize, 20)
    const otherIdxs = props.editors.map((_, i) => i).filter(i => i !== idx)
    const newShareForOthers = (100 - sizes.value[idx]) / otherIdxs.length
    otherIdxs.forEach(i => { sizes.value[i] = newShareForOthers })
  } else {
    const oldSize = sizes.value[idx]
    sizes.value[idx] = minPaneSize
    const gainedSpace = oldSize - minPaneSize
    const otherIdxs = props.editors.map((_, i) => i).filter(i => i !== idx)
    const extraPerPane = gainedSpace / otherIdxs.length
    otherIdxs.forEach(i => { sizes.value[i] += extraPerPane })
  }
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

function onReady(panes) {
  // Capture initial sizes from Splitpanes if they are different from our defaults
  if (panes && panes.length >= 2) {
    if (Math.abs(previewPaneSize.value - panes[1].size) > 1) {
      previewPaneSize.value = panes[1].size
    }
  }
}

function onEditorsReady(panes) {
  if (panes && panes.length > 0) {
    const newSizes = panes.map(p => p.size)
    const sizes = props.layoutMode === 'columns' ? columnsEditorSizes : rowsEditorSizes
    if (sizes.value.length === 0 || Math.abs(sizes.value[0] - newSizes[0]) > 1) {
      sizes.value = newSizes
    }
  }
}

function initializeSizes() {
  if (props.editors.length > 0) {
    const count = props.editors.length
    const defaultSize = 100 / count
    const sizes = new Array(count).fill(defaultSize)
    // Ensure perfect 100% sum
    const sum = sizes.reduce((a, b) => a + b, 0)
    if (sum !== 100) {
      sizes[count - 1] += (100 - sum)
    }
    columnsEditorSizes.value = [...sizes]
    rowsEditorSizes.value = [...sizes]
  }
}

watch(() => props.editors.length, initializeSizes, { immediate: true })

function handleMainResize(event) {
  if (event.length >= 2) {
    const newSize = event[1].size
    if (Math.abs(previewPaneSize.value - newSize) > 0.01) {
      previewPaneSize.value = newSize
    }
  }
}

function handleEditorsResize(event) {
  const newSizes = event.map(p => p.size)
  const sizes = props.layoutMode === 'columns' ? columnsEditorSizes : rowsEditorSizes
  
  // Only update if there's a meaningful change to prevent feedback loops
  const hasChanged = sizes.value.length !== newSizes.length || 
                     sizes.value.some((s, i) => Math.abs(s - newSizes[i]) > 0.01)
  
  if (hasChanged) {
    sizes.value = newSizes
  }
}

function handleRename(oldFilename, newFilename, newType) {
  emit('rename', oldFilename, newFilename, newType)
}

function handleSettingsUpdate(filename, settings) {
  emit('settings-update', filename, settings)
}

onMounted(() => {
  window.addEventListener('mousedown', onMouseDown)
})

onUnmounted(() => {
  window.removeEventListener('mousedown', onMouseDown)
  window.removeEventListener('mouseup', onMouseUp)
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
  cursor: inherit;
  pointer-events: none; /* Only exists to show cursor if needed, but iframe-blocker does the heavy lifting */
}

.preview-pane {
  position: relative;
}

.iframe-blocker {
  position: absolute;
  inset: 0;
  z-index: 10;
  background: transparent;
}

/* Fix for "jumping" panes: disable transitions while dragging */
.pane-manager :deep(.splitpanes--dragging .splitpanes__pane) {
  transition: none !important;
}

.pane-manager :deep(.splitpanes) {
  height: 100%;
}

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

/* SURGICAL HIGHLIGHT: Only highlight the specific splitter being dragged */
.pane-manager :deep(.splitpanes__splitter.is-active) {
  background: var(--color-accent);
}

.pane-manager :deep(.splitpanes__splitter:hover) {
  background: var(--color-accent);
}

.pane-manager :deep(.splitpanes--vertical > .splitpanes__splitter) {
  width: 4px;
  cursor: col-resize;
}

.pane-manager :deep(.splitpanes--horizontal > .splitpanes__splitter) {
  height: 4px;
  cursor: row-resize;
}

/* Handle visual for the splitter */
.pane-manager :deep(.splitpanes__splitter::after) {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
}

.pane-manager :deep(.splitpanes--vertical > .splitpanes__splitter::after) {
  width: 2px;
  height: 20px;
}

.pane-manager :deep(.splitpanes--horizontal > .splitpanes__splitter::after) {
  width: 20px;
  height: 2px;
}

.layout-controls {
  position: absolute;
  bottom: 12px;
  left: 12px;
  display: flex;
  gap: 4px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 4px;
  box-shadow: var(--shadow-md);
  z-index: 100;
}

.layout-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  color: var(--color-text-muted);
  transition: all var(--transition-fast);
}

.layout-btn:hover {
  background: var(--color-background-alt);
  color: var(--color-text);
}

.layout-btn.active {
  background: var(--color-accent);
  color: white;
}

.layout-btn i {
  font-size: 16px;
}
</style>
