<template>
  <TransitionGroup name="toast-list" tag="div" class="toast-container">
    <div
      v-for="toast in toasts"
      :key="toast.id"
      class="toast-item"
      :class="toast.type"
      @click="handleClick(toast)"
    >
      <div class="toast-icon">
        <svg v-if="toast.type === 'error'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
      </div>
      
      <div class="toast-body">
        <div class="toast-main">
          <span class="toast-title">{{ toast.title }}</span>
          <span class="toast-message">{{ toast.message }}</span>
        </div>
        <div v-if="toast.details" class="toast-details">
          <span class="toast-file">{{ toast.details.filename }}</span>
          <span class="toast-line">:{{ toast.details.line }}</span>
        </div>
      </div>

      <button class="toast-close" @click.stop="removeToast(toast.id)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
  </TransitionGroup>
</template>

<script setup>
const props = defineProps({
  toasts: {
    type: Array,
    required: true
  }
})

const emit = defineEmits(['remove', 'jump'])

function removeToast(id) {
  emit('remove', id)
}

function handleClick(toast) {
  if (toast.details) {
    emit('jump', toast.details)
  }
}
</script>

<style scoped>
.toast-container {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 450px;
  pointer-events: none;
}

@media (max-width: 768px) {
  .toast-container {
    left: 8px;
    right: 8px;
    bottom: calc(8px + env(safe-area-inset-bottom, 0px));
    max-width: none;
  }

  .toast-main {
    flex-direction: column;
    gap: 2px;
  }
}

.toast-item {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(8px) saturate(160%);
  -webkit-backdrop-filter: blur(8px) saturate(160%);
  border: 1px solid rgba(229, 226, 223, 0.5);
  border-radius: var(--radius-md);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  transition: all var(--transition-normal);
  position: relative;
  overflow: hidden;
}

.toast-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 3px;
  height: 100%;
}

.toast-item.error::before { background: #EF4444; }
.toast-item.success::before { background: var(--color-syntax-string); }

.toast-item:hover {
  transform: translateY(-1px);
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
}

.toast-icon {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  color: #EF4444;
}

.toast-body {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.toast-main {
  display: flex;
  align-items: baseline;
  gap: 6px;
  min-width: 0;
}

.toast-title {
  font-weight: 600;
  font-size: 13px;
  color: var(--color-text);
  white-space: nowrap;
}

.toast-message {
  font-size: 13px;
  color: var(--color-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.toast-details {
  display: flex;
  align-items: center;
  font-family: var(--font-mono);
  font-size: 11px;
  background: var(--color-background-alt);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  color: var(--color-accent);
  flex-shrink: 0;
}

.toast-line {
  opacity: 0.7;
}

.toast-close {
  flex-shrink: 0;
  width: 14px;
  height: 14px;
  color: var(--color-text-muted);
  opacity: 0.4;
  transition: opacity var(--transition-fast);
}

.toast-item:hover .toast-close {
  opacity: 1;
}

/* Animations */
.toast-list-enter-from { 
  opacity: 0; 
  transform: translateX(12px) scale(0.98); 
}
.toast-list-leave-to { 
  opacity: 0; 
  transform: scale(0.95); 
}
.toast-list-enter-active, .toast-list-leave-active { 
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); 
}
.toast-list-move { 
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1); 
}
</style>
