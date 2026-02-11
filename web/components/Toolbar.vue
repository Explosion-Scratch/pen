<template>
  <header class="toolbar">
    <div class="toolbar-left">
      <div class="logo">
        <i class="ph-duotone ph-pen-nib"></i>
        <input
          ref="titleInput"
          v-model="localProjectName"
          class="title-input"
          @blur="saveTitle"
          @keydown.enter="$event.target.blur()"
          @keydown.esc="cancelEditing"
        />
      </div>
    </div>
    <div class="toolbar-center">
    </div>
    <div class="toolbar-right">
      <DropdownMenu :items="menuItems" align="right">
        <template #trigger>
          <button class="toolbar-btn menu-trigger" title="Menu">
            <i class="ph-bold ph-dots-three-vertical"></i>
          </button>
        </template>
      </DropdownMenu>
    </div>
  </header>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import DropdownMenu from './DropdownMenu.vue'

const props = defineProps({
  projectName: {
    type: String,
    default: 'Pen'
  },
  settings: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['settings', 'new-project', 'update-settings', 'update-project-name'])

const localProjectName = ref(props.projectName)
const titleInput = ref(null)

watch(() => props.projectName, (newVal) => {
  localProjectName.value = newVal
})

function saveTitle() {
  if (localProjectName.value && localProjectName.value !== props.projectName) {
    emit('update-project-name', localProjectName.value)
  } else {
    localProjectName.value = props.projectName
  }
}

function cancelEditing() {
  localProjectName.value = props.projectName
  titleInput.value?.blur()
}

function openPreviewTab() {
  window.open('http://localhost:3002', '_blank')
}

const menuItems = computed(() => [
  {
    label: 'New Project',
    icon: 'ph-duotone ph-plus',
    action: () => emit('new-project')
  },
  {
    label: 'Open preview',
    icon: 'ph-duotone ph-arrow-square-out',
    action: () => openPreviewTab()
  },
  {
    label: 'Switch orientations',
    icon: props.settings.layoutMode === 'columns' ? 'ph-duotone ph-rows' : 'ph-duotone ph-columns',
    action: () => emit('update-settings', { layoutMode: props.settings.layoutMode === 'columns' ? 'rows' : 'columns' })
  },
  {
    divider: true
  },
  {
    label: 'Settings',
    icon: 'ph-duotone ph-gear',
    action: () => emit('settings')
  }
])
</script>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: var(--header-height);
  padding: 0 16px;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
  z-index: 1000;
}

.toolbar-left,
.toolbar-center,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar-left {
  flex: 1;
}

.toolbar-center {
  flex: 1;
  justify-content: center;
}

.toolbar-right {
  flex: 1;
  justify-content: flex-end;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--color-accent);
}

.logo i {
  font-size: 20px;
}

.title-input {
  font-family: var(--font-serif);
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  padding: 4px 8px;
  outline: none;
  min-width: 120px;
  transition: all 0.2s;
}

.title-input:hover {
  background: var(--color-background);
  border-color: var(--color-border);
}

.title-input:focus {
  background: var(--color-surface);
  border-color: var(--color-accent);
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.toolbar-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-muted);
  transition: all var(--transition-fast);
  background: transparent;
  border: none;
  cursor: pointer;
}

.toolbar-btn:hover, .toolbar-btn.active {
  background: var(--color-background-alt);
  color: var(--color-text);
}

.toolbar-btn i {
  font-size: 18px;
}

.menu-trigger {
  padding: 6px;
}
</style>
