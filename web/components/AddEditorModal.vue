<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal">
      <header class="modal-header">
        <h2>Add Editor</h2>
        <button class="close-btn" @click="$emit('close')">
          <i class="ph-duotone ph-x"></i>
        </button>
      </header>
      <div class="modal-body">
        <div class="adapter-category" v-for="category in categories" :key="category.name">
          <h3>{{ category.name }}</h3>
          <div class="adapter-grid">
            <button
              v-for="adapter in category.adapters"
              :key="adapter.id"
              class="adapter-card"
              :class="{ selected: selectedAdapter === adapter.id }"
              @click="selectAdapter(adapter.id)"
            >
              <i :class="getAdapterIcon(adapter.id)"></i>
              <span class="adapter-name">{{ adapter.name }}</span>
              <span class="adapter-desc">{{ adapter.description }}</span>
            </button>
          </div>
        </div>

        <div v-if="selectedAdapter" class="filename-input">
          <label>Filename</label>
          <input
            type="text"
            v-model="filename"
            :placeholder="getDefaultFilename()"
          />
        </div>
      </div>
      <footer class="modal-footer">
        <button class="btn btn-secondary" @click="$emit('close')">Cancel</button>
        <button
          class="btn btn-primary"
          :disabled="!selectedAdapter"
          @click="addEditor"
        >
          Add Editor
        </button>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  availableAdapters: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['close', 'add'])

const selectedAdapter = ref(null)
const filename = ref('')

const adapterIcons = {
  html: 'ph-duotone ph-file-html',
  pug: 'ph-duotone ph-code',
  slim: 'ph-duotone ph-code',
  css: 'ph-duotone ph-file-css',
  sass: 'ph-duotone ph-file-css',
  less: 'ph-duotone ph-file-css',
  stylus: 'ph-duotone ph-file-css',
  javascript: 'ph-duotone ph-file-js',
  typescript: 'ph-duotone ph-file-ts'
}

const fileExtensions = {
  html: '.html',
  pug: '.pug',
  slim: '.slim',
  css: '.css',
  sass: '.scss',
  less: '.less',
  stylus: '.styl',
  javascript: '.js',
  typescript: '.ts'
}

const categories = computed(() => {
  const markup = props.availableAdapters.filter(a => a.type === 'markup')
  const style = props.availableAdapters.filter(a => a.type === 'style')
  const script = props.availableAdapters.filter(a => a.type === 'script')

  return [
    { name: 'Markup', adapters: markup },
    { name: 'Style', adapters: style },
    { name: 'Script', adapters: script }
  ].filter(c => c.adapters.length > 0)
})

function getAdapterIcon(id) {
  return adapterIcons[id] || 'ph-duotone ph-file'
}

function selectAdapter(id) {
  selectedAdapter.value = id
  filename.value = ''
}

function getDefaultFilename() {
  if (!selectedAdapter.value) return ''
  const ext = fileExtensions[selectedAdapter.value] || '.txt'
  return `new${ext}`
}

function addEditor() {
  if (!selectedAdapter.value) return

  const finalFilename = filename.value || getDefaultFilename()

  emit('add', {
    type: selectedAdapter.value,
    filename: finalFilename,
    settings: {}
  })
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
  z-index: 1000;
  animation: fadeIn 200ms ease;
}

.modal {
  width: 100%;
  max-width: 560px;
  max-height: 80vh;
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  animation: slideUp 300ms ease;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border-light);
}

.modal-header h2 {
  font-family: var(--font-serif);
  font-size: 18px;
  font-weight: 600;
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  color: var(--color-text-muted);
  transition: all var(--transition-fast);
}

.close-btn:hover {
  background: var(--color-background-alt);
  color: var(--color-text);
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.adapter-category {
  margin-bottom: 20px;
}

.adapter-category:last-of-type {
  margin-bottom: 16px;
}

.adapter-category h3 {
  font-family: var(--font-serif);
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 12px;
}

.adapter-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
}

.adapter-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  text-align: center;
  transition: all var(--transition-fast);
}

.adapter-card:hover {
  border-color: var(--color-accent);
  background: rgba(194, 65, 12, 0.04);
}

.adapter-card.selected {
  border-color: var(--color-accent);
  background: rgba(194, 65, 12, 0.08);
}

.adapter-card i {
  font-size: 24px;
  color: var(--color-accent);
}

.adapter-name {
  font-weight: 500;
  font-size: 14px;
  color: var(--color-text);
}

.adapter-desc {
  font-size: 11px;
  color: var(--color-text-muted);
  line-height: 1.3;
}

.filename-input {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 16px;
  border-top: 1px solid var(--color-border-light);
}

.filename-input label {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-muted);
}

.filename-input input {
  padding: 10px 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-family: var(--font-mono);
  font-size: 14px;
}

.filename-input input:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px rgba(194, 65, 12, 0.1);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid var(--color-border-light);
}

.btn {
  padding: 8px 16px;
  border-radius: var(--radius-md);
  font-size: 14px;
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
  background: var(--color-border);
  color: var(--color-text-muted);
  cursor: not-allowed;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
