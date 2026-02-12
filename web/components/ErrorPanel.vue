<template>
  <div class="error-panel">
    <div class="error-header">
      <h3 class="error-title">
        <i class="ph-duotone ph-warning-circle"></i>
        Errors ({{ errors.length }})
      </h3>
      <div class="header-actions">
        <button v-if="errors.length > 0" class="clear-btn" @click="$emit('clear')" title="Clear Errors">
          <i class="ph-duotone ph-trash"></i>
        </button>
        <button class="close-btn" @click="$emit('close')" title="Close Panel">
          <i class="ph-duotone ph-x"></i>
        </button>
      </div>
    </div>
    <div class="error-list">
      <div 
        v-for="(error, index) in errors" 
        :key="index"
        class="error-item"
        @click="$emit('jump', error)"
      >
        <div class="error-icon">
          <i class="ph-duotone ph-bug"></i>
        </div>
        <div class="error-content">
          <div class="error-message" :title="error.message">{{ formatMessage(error.message) }}</div>
          <div class="error-location">
            <span class="error-file">{{ error.filename }}</span>
            <span v-if="error.line" class="error-pos">:{{ error.line }}:{{ error.column || 1 }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  errors: {
    type: Array,
    default: () => []
  }
})

defineEmits(['close', 'jump', 'clear'])

function formatMessage(msg) {

  if (!msg) return 'Unknown Error'
  const firstLine = msg.split('\n')[0]
  return firstLine.length > 150 ? firstLine.substring(0, 150) + '...' : firstLine
}
</script>

<style scoped>
.error-panel {
  display: flex;
  flex-direction: column;
  background: var(--color-surface);
  border-left: 1px solid var(--color-border);
  height: 100%;
  font-family: var(--font-sans);
  overflow: hidden;
}

.error-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--color-background-alt);
  border-bottom: 1px solid var(--color-border-light);
  flex-shrink: 0;
  height: var(--pane-header-height);
}

.error-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-error-dark);
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 4px;
}

.close-btn, .clear-btn {
  background: transparent;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  padding: 4px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
}

.close-btn:hover, .clear-btn:hover {
  background: var(--color-background);
  color: var(--color-text);
}

.clear-btn:hover {
  color: var(--color-error);
}

.error-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.error-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background var(--transition-fast);
  border: 1px solid transparent;
  background: var(--color-background);
}

.error-item:hover {
  background: var(--color-background-alt);
  border-color: var(--color-border-light);
}

.error-icon {
  color: var(--color-error-dark);
  font-size: 14px;
  margin-top: 3px;
  flex-shrink: 0;
}

.error-content {
  flex: 1;
  min-width: 0;
}

.error-message {
  font-size: 12px;
  color: var(--color-text);
  margin-bottom: 2px;
  line-height: 1.4;
  word-break: break-word;
  font-family: var(--font-mono);
}

.error-location {
  font-size: 11px;
  color: var(--color-text-muted);
  font-family: var(--font-mono);
  display: flex;
  align-items: center;
  gap: 4px;
}

.error-file {
  font-weight: 500;
}
</style>
