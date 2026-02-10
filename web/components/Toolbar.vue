<template>
  <header class="toolbar">
    <div class="toolbar-left">
      <div class="logo">
        <i class="ph-duotone ph-pen-nib"></i>
        <span class="logo-text">{{ projectName }}</span>
      </div>
    </div>
    <div class="toolbar-center">
    </div>
    <div class="toolbar-right">
      <button class="toolbar-btn" @click="$emit('new-project')" title="New Project">
        <i class="ph-duotone ph-plus"></i>
      </button>
      <button class="toolbar-btn" @click="openPreviewTab" title="Open in new tab">
        <i class="ph-duotone ph-arrow-square-out"></i>
      </button>
      <button 
        class="toolbar-btn" 
        @click="$emit('update-settings', { layoutMode: settings.layoutMode === 'columns' ? 'rows' : 'columns' })"
        :title="settings.layoutMode === 'columns' ? 'Switch to 2 Row layout' : 'Switch to 2 Column layout'"
      >
        <i :class="['ph-duotone', settings.layoutMode === 'columns' ? 'ph-rows' : 'ph-columns']"></i>
      </button>
      <button class="toolbar-btn" @click="$emit('settings')" title="Settings">
        <i class="ph-duotone ph-gear"></i>
      </button>
    </div>
  </header>
</template>

<script setup>
defineProps({
  projectName: {
    type: String,
    default: 'Pen'
  },
  settings: {
    type: Object,
    required: true
  }
})

defineEmits(['settings', 'new-project', 'update-settings'])

function openPreviewTab() {
  window.open('http://localhost:3002', '_blank')
}
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

.logo-text {
  font-family: var(--font-serif);
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
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
}

.toolbar-btn:hover {
  background: var(--color-background-alt);
  color: var(--color-text);
}

.toolbar-btn i {
  font-size: 18px;
}
</style>
