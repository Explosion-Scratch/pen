<template>
  <div class="pane-manager" :class="{ 'row-layout': layoutMode === 'rows' }">
    <Splitpanes 
      class="default-theme" 
      :horizontal="layoutMode === 'rows'"
      @resize="handleResize"
      :push-other-panes="true"
    >
      <Pane 
        v-for="(editor, idx) in editors" 
        :key="editor.filename"
        :size="paneSizes[idx] || defaultPaneSize"
        :min-size="collapsedPanes[idx] ? minCollapsedSize : minPaneSize"
      >
        <EditorCard
          :editor="editor"
          :content="files[editor.filename] || ''"
          @update="(content) => $emit('update', editor.filename, content)"
          @rename="handleRename"
          @settings-update="handleSettingsUpdate"
        />
      </Pane>
      <Pane 
        :size="previewPaneSize" 
        :min-size="15"
      >
        <PreviewCard 
          :html="previewHtml" 
          :auto-run="autoRun"
          @refresh="$emit('render')" 
          @toggle-auto-run="$emit('toggle-auto-run')"
        />
      </Pane>
    </Splitpanes>
    
    <div class="layout-controls">
      <button 
        class="layout-btn" 
        :class="{ active: layoutMode === 'columns' }"
        @click="$emit('set-layout', 'columns')"
        title="Column layout"
      >
        <i class="ph-duotone ph-columns"></i>
      </button>
      <button 
        class="layout-btn" 
        :class="{ active: layoutMode === 'rows' }"
        @click="$emit('set-layout', 'rows')"
        title="Row layout"
      >
        <i class="ph-duotone ph-rows"></i>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
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

const emit = defineEmits(['update', 'render', 'rename', 'settings-update', 'set-layout', 'toggle-auto-run'])

const paneSizes = ref([])
const collapsedPanes = ref([])
const minPaneSize = 10
const minCollapsedSize = 3
const previewPaneSize = ref(30)

const defaultPaneSize = computed(() => {
  if (props.editors.length === 0) return 70
  return 70 / props.editors.length
})

watch(() => props.editors.length, () => {
  paneSizes.value = props.editors.map(() => defaultPaneSize.value)
  collapsedPanes.value = props.editors.map(() => false)
}, { immediate: true })

function handleResize(event) {
  paneSizes.value = event.map(p => p.size)
  event.forEach((pane, idx) => {
    collapsedPanes.value[idx] = pane.size <= minCollapsedSize + 2
  })
}

function handleRename(oldFilename, newFilename, newType) {
  emit('rename', oldFilename, newFilename, newType)
}

function handleSettingsUpdate(filename, settings) {
  emit('settings-update', filename, settings)
}
</script>

<style scoped>
.pane-manager {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.pane-manager :deep(.splitpanes) {
  height: 100%;
}

.pane-manager :deep(.splitpanes__pane) {
  display: flex;
  flex-direction: column;
  transition: min-width 0.2s ease, min-height 0.2s ease;
}

.pane-manager.row-layout :deep(.splitpanes__pane) {
  min-height: 40px;
}

.pane-manager :deep(.splitpanes__splitter) {
  background: var(--color-border);
  transition: background var(--transition-fast);
}

.pane-manager :deep(.splitpanes__splitter:hover) {
  background: var(--color-accent);
}

.pane-manager :deep(.splitpanes--vertical > .splitpanes__splitter) {
  width: 4px;
  min-width: 4px;
  cursor: col-resize;
}

.pane-manager :deep(.splitpanes--horizontal > .splitpanes__splitter) {
  height: 4px;
  min-height: 4px;
  cursor: row-resize;
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
  z-index: 10;
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
