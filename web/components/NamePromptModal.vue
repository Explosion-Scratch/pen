<template>
  <div class="modal-overlay" @click.self="$emit('cancel')">
    <div class="name-modal">
      <h3>{{ title }}</h3>
      <div class="name-form">
        <label class="name-label" for="prompt-name">{{ label }}</label>
        <input
          ref="inputRef"
          id="prompt-name"
          v-model="value"
          type="text"
          class="name-input"
          :placeholder="placeholder"
          @keydown.enter="confirm"
          @keydown.esc="$emit('cancel')"
        />
      </div>
      <div class="name-actions">
        <button class="btn btn-secondary" @click="$emit('cancel')">Cancel</button>
        <button class="btn btn-primary" @click="confirm" :disabled="!value.trim()">
          {{ confirmText }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const props = defineProps({
  title: { type: String, default: 'Name Project' },
  label: { type: String, default: 'Project name' },
  placeholder: { type: String, default: 'My Project' },
  initial: { type: String, default: '' },
  confirmText: { type: String, default: 'Create' },
})

const emit = defineEmits(['confirm', 'cancel'])
const value = ref(props.initial)
const inputRef = ref(null)

onMounted(() => {
  setTimeout(() => {
    inputRef.value?.focus()
    inputRef.value?.select()
  }, 50)
})

function confirm() {
  const name = value.value.trim()
  if (!name) return
  emit('confirm', name)
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
  animation: fadeIn 150ms ease;
}

.name-modal {
  width: 100%;
  max-width: 360px;
  padding: 24px;
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  gap: 16px;
  animation: slideUp 200ms cubic-bezier(0.16, 1, 0.3, 1);
}

.name-modal h3 {
  font-family: var(--font-serif);
  font-size: 16px;
  font-weight: 600;
}

.name-form {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.name-label {
  font-size: 11px;
  font-weight: 500;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.name-input {
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: 14px;
  color: var(--color-text);
  background: var(--color-background-alt);
  transition: all var(--transition-fast);
}

.name-input:focus {
  outline: none;
  border-color: var(--color-accent);
  background: var(--color-surface);
}

.name-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.btn {
  padding: 7px 14px;
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 500;
  transition: all var(--transition-fast);
}

.btn-secondary {
  background: var(--color-background-alt);
  color: var(--color-text);
}

.btn-secondary:hover {
  background: var(--color-border-light);
}

.btn-primary {
  background: var(--color-accent);
  color: white;
}

.btn-primary:hover {
  background: var(--color-accent-hover);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
@keyframes slideUp {
  from { opacity: 0; transform: translateY(10px) }
  to { opacity: 1; transform: translateY(0) }
}
</style>
