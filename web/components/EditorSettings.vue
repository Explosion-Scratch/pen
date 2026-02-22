<template>
  <div class="editor-settings-modal">
    <header class="settings-header">
      <h3>{{ adapter?.name || 'Editor' }} Settings</h3>
      <button class="close-btn" @click="$emit('close')">
        <i class="ph-duotone ph-x"></i>
      </button>
    </header>
    <div class="settings-body">
      <div
        v-if="Object.keys(schema).length > 0"
        class="settings-section"
      >
        <h4>{{ adapter?.name || 'Editor' }} Settings</h4>
        <div
          v-for="(setting, key) in schema"
          :key="key"
          class="setting-field"
        >
          <div class="setting-info">
            <label :for="key">{{ setting.name }}</label>
            <p class="setting-description" v-if="setting.description">
              {{ setting.description }}
            </p>
          </div>

          <template v-if="setting.type === 'boolean'">
            <label class="toggle">
              <input
                type="checkbox"
                :id="key"
                v-model="localSettings[key]"
              />
              <span class="toggle-slider"></span>
            </label>
          </template>

          <template v-else-if="setting.type === 'select'">
            <select :id="key" v-model="localSettings[key]">
              <option
                v-for="option in setting.options"
                :key="typeof option === 'object' ? option.value : option"
                :value="typeof option === 'object' ? option.value : option"
              >
                {{ typeof option === 'object' ? option.label : option }}
              </option>
            </select>
          </template>

          <template v-else-if="setting.type === 'number'">
            <input
              type="number"
              :id="key"
              v-model.number="localSettings[key]"
              :min="setting.min"
              :max="setting.max"
            />
          </template>

          <template v-else>
            <input
              type="text"
              :id="key"
              v-model="localSettings[key]"
            />
          </template>
        </div>
      </div>

      <div class="settings-section">
        <h4>Editor Options</h4>
        
        <div class="setting-field">
          <div class="setting-info">
            <label for="tabSize">Tab Size</label>
          </div>
          <select id="tabSize" v-model.number="localSettings.tabSize">
            <option :value="2">2 spaces</option>
            <option :value="4">4 spaces</option>
            <option :value="8">8 spaces</option>
          </select>
        </div>

        <div class="setting-field">
          <div class="setting-info">
            <label for="lineWrapping">Line Wrapping</label>
          </div>
          <label class="toggle">
            <input
              type="checkbox"
              id="lineWrapping"
              v-model="localSettings.lineWrapping"
            />
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div class="setting-field">
          <div class="setting-info">
            <label for="lineNumbers">Line Numbers</label>
          </div>
          <label class="toggle">
            <input
              type="checkbox"
              id="lineNumbers"
              v-model="localSettings.lineNumbers"
            />
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div class="setting-field">
          <div class="setting-info">
            <label for="emmet">Emmet Abbreviations</label>
            <p class="setting-description">Enable Emmet abbreviation expansion with Tab</p>
          </div>
          <label class="toggle">
            <input
              type="checkbox"
              id="emmet"
              v-model="localSettings.emmet"
            />
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>

      <div v-if="Object.keys(schema).length === 0 && !hasEditorOptions" class="no-settings">
        <i class="ph-duotone ph-gear"></i>
        <p>No additional configurable settings for this editor.</p>
      </div>
    </div>
    <footer class="settings-footer">
      <button class="btn btn-secondary" @click="$emit('close')">Cancel</button>
      <button class="btn btn-primary" @click="save">Save</button>
    </footer>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'

const props = defineProps({
  adapter: {
    type: Object,
    default: null
  },
  settings: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['close', 'save'])

const defaultEditorSettings = {
  tabSize: 2,
  lineWrapping: true,
  lineNumbers: true,
  emmet: true
}

const localSettings = ref({ ...defaultEditorSettings, ...props.settings })

const schema = computed(() => {
  if (!props.adapter?.schema) return {}
  return props.adapter.schema
})

const hasEditorOptions = true

watch(() => props.settings, (newSettings) => {
  localSettings.value = { ...defaultEditorSettings, ...newSettings }
}, { deep: true })

function save() {
  emit('save', localSettings.value)
}
</script>

<style scoped>
.editor-settings-modal {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 400px;
  max-height: 80vh;
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  animation: slideUp 200ms ease;
}

@media (max-width: 768px) {
  .editor-settings-modal {
    max-width: calc(100% - 16px);
    max-height: 90vh;
    margin: 8px;
  }
}

@media (max-width: 480px) {
  .editor-settings-modal {
    max-width: 100%;
    max-height: 100vh;
    margin: 0;
    border-radius: 0;
    height: 100%;
  }

  .settings-overlay {
    align-items: stretch;
  }
}

.settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border-light);
}

.settings-header h3 {
  font-family: var(--font-serif);
  font-size: 16px;
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

.settings-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.settings-section {
  margin-bottom: 24px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--color-border-light);
}

.settings-section:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.settings-section h4 {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--color-text-muted);
  margin-bottom: 16px;
}

.setting-field {
  margin-bottom: 16px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.setting-field:last-child {
  margin-bottom: 0;
}

.setting-info {
  flex: 1;
  min-width: 0;
}

.setting-info label {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text);
  display: block;
}

.setting-description {
  font-size: 11px;
  color: var(--color-text-muted);
  line-height: 1.4;
  margin-top: 2px;
}

.setting-field input[type="text"],
.setting-field input[type="number"],
.setting-field select {
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: 13px;
  min-width: 120px;
}

.setting-field input:focus,
.setting-field select:focus {
  outline: none;
  border-color: var(--color-accent);
}

.toggle {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 22px;
}

.toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--color-border);
  border-radius: 22px;
  transition: all var(--transition-fast);
}

.toggle-slider::before {
  position: absolute;
  content: '';
  height: 16px;
  width: 16px;
  left: 3px;
  bottom: 3px;
  background: white;
  border-radius: 50%;
  transition: all var(--transition-fast);
}

.toggle input:checked + .toggle-slider {
  background: var(--color-accent);
}

.toggle input:checked + .toggle-slider::before {
  transform: translateX(18px);
}

.no-settings {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  text-align: center;
  color: var(--color-text-muted);
}

.no-settings i {
  font-size: 32px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.no-settings p {
  font-size: 13px;
}

.settings-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid var(--color-border-light);
}

.btn {
  padding: 8px 16px;
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
