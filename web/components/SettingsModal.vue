<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal">
      <header class="modal-header">
        <h2>Project Settings</h2>
        <button class="close-btn" @click="$emit('close')">
          <i class="ph-duotone ph-x"></i>
        </button>
      </header>
      <div class="modal-body">
        <div class="settings-section">
          <h3>Project</h3>
          <div class="setting-row">
            <label>Name</label>
            <input type="text" v-model="localConfig.name" />
          </div>
        </div>

        <div class="settings-section">
          <h3>Editors</h3>
          <div class="editors-list">
            <div
              v-for="(editor, index) in localConfig.editors"
              :key="index"
              class="editor-item"
            >
              <div class="editor-item-info">
                <i :class="getEditorIcon(editor.type)"></i>
                <span>{{ editor.filename }}</span>
              </div>
              <span class="editor-type">{{ editor.type }}</span>
            </div>
          </div>
        </div>

        <div class="settings-section">
          <h3>Global Resources</h3>
          <div class="resource-group">
            <h4>Scripts</h4>
            <div
              v-for="(script, index) in localConfig.globalResources.scripts"
              :key="'script-' + index"
              class="resource-item"
            >
              <input type="text" v-model="localConfig.globalResources.scripts[index]" />
              <button class="remove-btn" @click="removeScript(index)">
                <i class="ph-duotone ph-trash"></i>
              </button>
            </div>
            <button class="add-btn" @click="addScript">
              <i class="ph-duotone ph-plus"></i>
              Add Script
            </button>
          </div>
          <div class="resource-group">
            <h4>Styles</h4>
            <div
              v-for="(style, index) in localConfig.globalResources.styles"
              :key="'style-' + index"
              class="resource-item"
            >
              <input type="text" v-model="localConfig.globalResources.styles[index]" />
              <button class="remove-btn" @click="removeStyle(index)">
                <i class="ph-duotone ph-trash"></i>
              </button>
            </div>
            <button class="add-btn" @click="addStyle">
              <i class="ph-duotone ph-plus"></i>
              Add Style
            </button>
          </div>
        </div>
      </div>
      <footer class="modal-footer">
        <button class="btn btn-secondary" @click="$emit('close')">Cancel</button>
        <button class="btn btn-primary" @click="save">Save</button>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  config: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close', 'save'])

const localConfig = ref(JSON.parse(JSON.stringify(props.config)))

const editorIcons = {
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

function getEditorIcon(type) {
  return editorIcons[type] || 'ph-duotone ph-file'
}

function addScript() {
  localConfig.value.globalResources.scripts.push('')
}

function removeScript(index) {
  localConfig.value.globalResources.scripts.splice(index, 1)
}

function addStyle() {
  localConfig.value.globalResources.styles.push('')
}

function removeStyle(index) {
  localConfig.value.globalResources.styles.splice(index, 1)
}

function save() {
  emit('save', localConfig.value)
}

watch(() => props.config, (newConfig) => {
  localConfig.value = JSON.parse(JSON.stringify(newConfig))
}, { deep: true })
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
  max-width: 500px;
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

.close-btn i {
  font-size: 18px;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.settings-section {
  margin-bottom: 24px;
}

.settings-section:last-child {
  margin-bottom: 0;
}

.settings-section h3 {
  font-family: var(--font-serif);
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 12px;
}

.setting-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.setting-row label {
  font-size: 12px;
  color: var(--color-text-muted);
  font-weight: 500;
}

.setting-row input {
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: 14px;
  transition: all var(--transition-fast);
}

.setting-row input:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px rgba(194, 65, 12, 0.1);
}

.editors-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.editor-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: var(--color-background-alt);
  border-radius: var(--radius-md);
}

.editor-item-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.editor-item-info i {
  font-size: 16px;
  color: var(--color-accent);
}

.editor-item-info span {
  font-family: var(--font-mono);
  font-size: 13px;
}

.editor-type {
  font-size: 11px;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.resource-group {
  margin-bottom: 16px;
}

.resource-group:last-child {
  margin-bottom: 0;
}

.resource-group h4 {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-muted);
  margin-bottom: 8px;
}

.resource-item {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.resource-item input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: 13px;
  font-family: var(--font-mono);
}

.resource-item input:focus {
  outline: none;
  border-color: var(--color-accent);
}

.remove-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  color: var(--color-text-muted);
  transition: all var(--transition-fast);
}

.remove-btn:hover {
  background: #FEE2E2;
  color: #DC2626;
}

.add-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-md);
  font-size: 13px;
  color: var(--color-text-muted);
  width: 100%;
  justify-content: center;
  transition: all var(--transition-fast);
}

.add-btn:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
  background: rgba(194, 65, 12, 0.04);
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
