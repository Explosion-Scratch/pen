<template>
  <div class="pane-manager" :class="[settings.layoutMode, { 'is-any-dragging': isAnyDragging }]">
    <div v-show="isAnyDragging" class="drag-overlay"></div>

    <Splitpanes 
      :key="`main-${settings.layoutMode}`"
      class="default-theme main-split" 
      :horizontal="settings.layoutMode === 'rows'"
      @ready="onReady"
    >
      <Pane>
        <Splitpanes 
          :key="`editors-${settings.layoutMode}`"
          class="editors-split"
          :horizontal="settings.layoutMode === 'columns'"
          @ready="() => onEditorsReady()"
          @resize="(panes) => updatePanes(panes)"
        >
          <Pane 
            :size="panes[idx]?.size || 100 / editors.length"
            v-for="(editor, idx) in editors" 
            :key="editor.id || editor.filename"
            :min-size="minPaneSize"
          >
            <EditorCard
              :editor="editor"
              :content="files[editor.filename] || ''"
              :is-collapsed="collapsedEditors[idx]"
              :layout-mode="settings.layoutMode"
              @update="(content) => $emit('update', editor.filename, content)"
              @rename="handleRename"
              @settings-update="handleSettingsUpdate"
              @toggle-collapse="togglePaneCollapse(idx)"
              @format="(filename) => $emit('format', filename)"
              @run="handleEditorRun"
            />
          </Pane>
        </Splitpanes>
      </Pane>
      <Pane :min-size="15" class="preview-pane">
        <PreviewCard 
          :html="previewHtml" 
          :settings="settings"
          :last-manual-render="lastManualRender"
          @refresh="$emit('render', true)" 
          @settings="$emit('settings')"
        />
        <div v-show="isAnyDragging" class="iframe-blocker"></div>
      </Pane>
    </Splitpanes>
    
    <div class="layout-controls">
      <button 
        class="layout-btn" 
        :class="{ active: settings.layoutMode === 'columns' }"
        @click="settings.layoutMode = 'columns'"
        title="2 Column, 3 Row layout"
      >
        <i class="ph-duotone ph-columns"></i>
      </button>
      <button 
        class="layout-btn" 
        :class="{ active: settings.layoutMode === 'rows' }"
        @click="settings.layoutMode = 'rows'"
        title="2 Row, 3 Column layout"
      >
        <i class="ph-duotone ph-rows"></i>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { Splitpanes, Pane } from 'splitpanes'
import 'splitpanes/dist/splitpanes.css'
import EditorCard from './EditorCard.vue'
import PreviewCard from './PreviewCard.vue'

const collapseThreshold = 7
const collapsedEditors = ref([])
const panes = ref([])
const previousSizes = ref([])
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
  settings: {
    type: Object,
    required: true
  },
  lastManualRender: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits(['update', 'render', 'rename', 'settings-update', 'format', 'settings'])

const minPaneSize = 5
const isAnyDragging = ref(false)
let activeSplitter = null

function togglePaneCollapse(idx) {
  console.log("Toggle collapse:", idx, panes.value, "Prev:", previousSizes.value);
  console.log("Collapsed Editors", collapsedEditors.value);
  if (collapsedEditors.value[idx]) {
    // Expanding: Restore to previous size (or equal share if none)
    const prevSize = previousSizes.value[idx] || (100 / props.editors.length);
    panes.value[idx].size = prevSize;
  } else {
    console.log(JSON.parse(JSON.stringify(panes.value)))
    // Collapsing: Save current size, then set to min
    previousSizes.value[idx] = panes.value[idx].size;
    panes.value[idx].size = minPaneSize;
    console.log(JSON.parse(JSON.stringify(panes.value)))
  }
  
  // Force update collapsed state (though @resize should trigger it, this ensures sync)
  updateCollapsed();
}

function handleEditorRun() {
  emit('render', true)
}


function updatePanes(p){
  console.log("Update panes:" ,p);
  panes.value = p;
  updateCollapsed()
}

function updateCollapsed() {
  collapsedEditors.value = panes.value.map(p => p.size <= collapseThreshold)
}

function onReady() {}

watch(props.editors, onEditorsReady);

async function onEditorsReady() {
  if (!props.editors.length){
    return setTimeout(() => onEditorsReady(), 100);
  }
  console.log('Editors ready', props.editors)
  const P = { size: 100 / props.editors.length, min: 5, max: 100 };
  panes.value = new Array(props.editors.length).fill({...P}).map(i => JSON.parse(JSON.stringify(i)));
  console.log('Editors ready:', panes.value)
  previousSizes.value = new Array(props.editors.length).fill(100 / props.editors.length);
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
