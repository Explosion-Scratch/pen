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
          <h3>Project Location</h3>
          <div class="settings-row path-row">
            <code 
              class="path-display" 
              @click="copyPath" 
              title="Click to copy path"
            >
              {{ currentPath || 'Loading...' }}
              <i class="ph-duotone ph-copy"></i>
            </code>
          </div>
        </div>
        <div class="settings-section">
          <h3>Preview</h3>
          <div class="settings-row">
            <span class="settings-label">Auto Preview</span>
            <label class="switch-toggle">
              <input 
                type="checkbox" 
                v-model="localSettings.autoRun" 
              />
              <span class="switch-slider"></span>
            </label>
          </div>
          <div class="settings-row">
            <span class="settings-label">Inject DevTools Bridge</span>
            <label class="switch-toggle">
              <input 
                type="checkbox" 
                v-model="previewInject"
              />
              <span class="switch-slider"></span>
            </label>
          </div>
          <div class="settings-row url-row">
            <span class="settings-label">App URL</span>
            <a :href="settings.previewUrl" target="_blank" class="url-text-link" title="Open in new tab">
              {{ settings.previewUrl }}
              <i class="ph-duotone ph-arrow-square-out"></i>
            </a>
          </div>
        </div>
        <div class="settings-section">
          <h3>Global Resources</h3>
          <div class="resource-group">
            <h4>Google Fonts</h4>
            <div
              v-for="(font, index) in localConfig.globalResources.fonts"
              :key="'font-' + index"
              class="resource-item-wrapper"
            >
              <div class="resource-item">
                <input 
                  type="text" 
                  :value="font"
                  @input="e => updateFontValue(index, e.target.value)"
                  placeholder="Font Name (e.g. Roboto)"
                />
                <button class="remove-btn" @click="removeFont(index)" title="Remove Font">
                  <i class="ph-duotone ph-trash"></i>
                </button>
              </div>
            </div>
            <div class="resource-add">
              <input
                type="text"
                v-model="fontInput"
                placeholder="Font name (e.g. Inter or Fira Code:400,700)"
                @keydown.enter.prevent="addFont"
              />
              <button
                v-if="fontInput.trim()"
                class="add-url-btn"
                @mousedown.prevent="addFont"
              >
                Add font
              </button>
            </div>
          </div>
          <div class="resource-group">
            <h4>Scripts</h4>
            <div
              v-for="(script, index) in localConfig.globalResources.scripts"
              :key="'script-' + index"
              class="resource-item-wrapper"
            >
              <div class="resource-item">
                <input 
                  type="text" 
                  :value="typeof script === 'string' ? script : script.src"
                  @input="e => updateScriptValue(index, e.target.value)"
                  placeholder="Script URL"
                />
                <button 
                  class="settings-btn" 
                  :class="{ active: typeof script === 'object' }"
                  @click="toggleScriptSettings(index)"
                  title="Resource Settings"
                >
                  <i class="ph-duotone ph-gear"></i>
                </button>
                <button class="remove-btn" @click="removeScript(index)">
                  <i class="ph-duotone ph-trash"></i>
                </button>
              </div>
              
              <div v-if="typeof script === 'object'" class="resource-expanded-settings">
                <div class="settings-grid">
                  <div class="settings-field">
                    <label>Inject To</label>
                    <input type="text" v-model="script.injectTo" placeholder="head" />
                  </div>
                  <div class="settings-field">
                    <label>Position</label>
                    <select v-model="script.injectPosition">
                      <option value="beforebegin">Before Begin</option>
                      <option value="afterbegin">After Begin</option>
                      <option value="beforeend">Before End</option>
                      <option value="afterend">After End</option>
                    </select>
                  </div>
                  <div class="settings-field">
                    <label>Priority</label>
                    <input type="number" v-model.number="script.priority" />
                  </div>
                  <div class="settings-field">
                    <label>Type</label>
                    <select v-model="script.type">
                      <option value="module">Module (import/export)</option>
                      <option value="classic">Classic (text/javascript)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
            <div class="resource-add">
              <input
                type="text"
                v-model="scriptInput"
                placeholder="Search CDNJS or paste script URL"
                @input="onScriptInput"
                @focus="scriptFocused = true"
                @blur="scriptBlur"
              />
              <button
                v-if="isUrl(scriptInput)"
                class="add-url-btn"
                @mousedown.prevent="addScriptFromUrl(scriptInput)"
              >
                Add script
              </button>
            </div>
            <div v-if="scriptSuggestions.length && !isUrl(scriptInput)" class="suggestions">
              <button
                v-for="hit in scriptSuggestions"
                :key="hit.objectID + hit.version"
                class="suggestion-item"
                @mousedown.prevent="addScriptFromHit(hit)"
              >
                <span class="suggestion-name">{{ hit.name }}</span>
                <span class="suggestion-desc">{{ (hit.description || '').slice(0, 50) }}{{ (hit.description || '').length > 50 ? '…' : '' }}</span>
                <span class="suggestion-url">{{ cdnjsUrl(hit) }}</span>
              </button>
            </div>
          </div>
          <div class="resource-group">
            <h4>Styles</h4>
            <div
              v-for="(style, index) in localConfig.globalResources.styles"
              :key="'style-' + index"
              class="resource-item-wrapper"
            >
              <div class="resource-item">
                <input 
                  type="text" 
                  :value="typeof style === 'string' ? style : style.src"
                  @input="e => updateStyleValue(index, e.target.value)"
                  placeholder="Style URL"
                />
                <button 
                  class="settings-btn" 
                  :class="{ active: typeof style === 'object' }"
                  @click="toggleStyleSettings(index)"
                  title="Resource Settings"
                >
                  <i class="ph-duotone ph-gear"></i>
                </button>
                <button class="remove-btn" @click="removeStyle(index)">
                  <i class="ph-duotone ph-trash"></i>
                </button>
              </div>

              <div v-if="typeof style === 'object'" class="resource-expanded-settings">
                <div class="settings-grid">
                  <div class="settings-field">
                    <label>Inject To</label>
                    <input type="text" v-model="style.injectTo" placeholder="head" />
                  </div>
                  <div class="settings-field">
                    <label>Position</label>
                    <select v-model="style.injectPosition">
                      <option value="beforebegin">Before Begin</option>
                      <option value="afterbegin">After Begin</option>
                      <option value="beforeend">Before End</option>
                      <option value="afterend">After End</option>
                    </select>
                  </div>
                  <div class="settings-field">
                    <label>Priority</label>
                    <input type="number" v-model.number="style.priority" />
                  </div>
                </div>
              </div>
            </div>
            <div class="resource-add">
              <input
                type="text"
                v-model="styleInput"
                placeholder="Paste style URL"
              />
              <button
                v-if="isUrl(styleInput)"
                class="add-url-btn"
                @mousedown.prevent="addStyleFromUrl(styleInput)"
              >
                Add style
              </button>
            </div>
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
import { ref, watch, computed } from 'vue'

const CDNJS_ALGOLIA_APP = '2QWLVLXZB6'
const CDNJS_ALGOLIA_KEY = '2663c73014d2e4d6d1778cc8ad9fd010'

const props = defineProps({
  config: {
    type: Object,
    required: true
  },
  settings: {
    type: Object,
    required: true
  },
  currentPath: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['close', 'save', 'toast'])

const localConfig = ref(JSON.parse(JSON.stringify(props.config)))
const localSettings = ref(JSON.parse(JSON.stringify(props.settings)))
const scriptInput = ref('')
const styleInput = ref('')
const fontInput = ref('')
const scriptSuggestions = ref([])
const scriptFocused = ref(false)
const previewInject = computed({
  get: () => {
    if (!localConfig.value.preview) return true // default to true
    return localConfig.value.preview.injectDevTools !== false
  },
  set: (val) => {
    if (!localConfig.value.preview) localConfig.value.preview = {}
    localConfig.value.preview.injectDevTools = val
  }
})

let scriptSearchTimer = null
let scriptBlurTimer = null

function copyPath() {
  if (props.currentPath) {
    navigator.clipboard.writeText(props.currentPath)
    emit('toast', {
      type: 'info',
      title: 'Path Copied',
      message: 'Project path copied to clipboard'
    })
  }
}


function isUrl(s) {
  if (!s || typeof s !== 'string') return false
  const t = s.trim()
  return t.startsWith('http://') || t.startsWith('https://')
}

function cdnjsUrl(hit) {
  return `https://cdnjs.cloudflare.com/ajax/libs/${hit.objectID}/${hit.version}/${hit.filename}`
}

async function searchCdnjs(query) {
  if (!query.trim()) return []
  const res = await fetch(
    'https://2qwlvlxzb6-2.algolianet.com/1/indexes/*/queries',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Algolia-Application-Id': CDNJS_ALGOLIA_APP,
        'X-Algolia-API-Key': CDNJS_ALGOLIA_KEY
      },
      body: JSON.stringify({
        requests: [{ indexName: 'libraries', params: `query=${encodeURIComponent(query.trim())}` }]
      })
    }
  )
  const data = await res.json()
  const hits = data?.results?.[0]?.hits ?? []
  return hits.slice(0, 8)
}

function onScriptInput() {
  scriptFocused.value = true
  const q = scriptInput.value
  if (isUrl(q)) {
    scriptSuggestions.value = []
    return
  }
  clearTimeout(scriptSearchTimer)
  if (!q.trim()) {
    scriptSuggestions.value = []
    return
  }
  scriptSearchTimer = setTimeout(async () => {
    scriptSuggestions.value = await searchCdnjs(q)
  }, 280)
}

function scriptBlur() {
  scriptBlurTimer = setTimeout(() => {
    scriptFocused.value = false
    scriptSuggestions.value = []
  }, 180)
}

function addScriptFromUrl(url) {
  const u = (url || '').trim()
  if (!u) return
  localConfig.value.globalResources.scripts.push(u)
  scriptInput.value = ''
  scriptSuggestions.value = []
}

function addScriptFromHit(hit) {
  localConfig.value.globalResources.scripts.push(cdnjsUrl(hit))
  scriptInput.value = ''
  scriptSuggestions.value = []
}

function addStyleFromUrl(url) {
  const u = (url || '').trim()
  if (!u) return
  localConfig.value.globalResources.styles.push(u)
  styleInput.value = ''
}

function addFont() {
  const f = (fontInput.value || '').trim()
  if (!f) return
  if (!localConfig.value.globalResources.fonts) {
    localConfig.value.globalResources.fonts = []
  }
  localConfig.value.globalResources.fonts.push(f)
  fontInput.value = ''
}

function removeFont(index) {
  localConfig.value.globalResources.fonts.splice(index, 1)
}

function updateFontValue(index, value) {
  localConfig.value.globalResources.fonts[index] = value
}

function removeScript(index) {
  localConfig.value.globalResources.scripts.splice(index, 1)
}

function removeStyle(index) {
  localConfig.value.globalResources.styles.splice(index, 1)
}

function toggleScriptSettings(index) {
  const current = localConfig.value.globalResources.scripts[index]
  if (typeof current === 'string') {
    localConfig.value.globalResources.scripts[index] = {
      src: current,
      priority: 10,
      injectTo: 'head',
      injectPosition: 'beforeend'
    }
  } else {
    localConfig.value.globalResources.scripts[index] = current.src
  }
}

function updateScriptValue(index, value) {
  const current = localConfig.value.globalResources.scripts[index]
  if (typeof current === 'string') {
    localConfig.value.globalResources.scripts[index] = value
  } else {
    current.src = value
  }
}

function toggleStyleSettings(index) {
  const current = localConfig.value.globalResources.styles[index]
  if (typeof current === 'string') {
    localConfig.value.globalResources.styles[index] = {
      src: current,
      priority: 10,
      injectTo: 'head',
      injectPosition: 'beforeend'
    }
  } else {
    localConfig.value.globalResources.styles[index] = current.src
  }
}

function updateStyleValue(index, value) {
  const current = localConfig.value.globalResources.styles[index]
  if (typeof current === 'string') {
    localConfig.value.globalResources.styles[index] = value
  } else {
    current.src = value
  }
}

function save() {
  emit('save', localConfig.value, localSettings.value)
}

watch(() => props.config, (newConfig) => {
  localConfig.value = JSON.parse(JSON.stringify(newConfig))
}, { deep: true })

watch(() => props.settings, (newSettings) => {
  localSettings.value = JSON.parse(JSON.stringify(newSettings))
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

@media (max-width: 768px) {
  .modal {
    max-width: calc(100% - 16px);
    max-height: 90vh;
    margin: 8px;
  }

  .modal-header {
    padding: 12px 16px;
  }

  .modal-body {
    padding: 16px;
  }

  .modal-footer {
    padding: 12px 16px;
  }

  .settings-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .modal {
    max-width: 100%;
    max-height: 100vh;
    margin: 0;
    border-radius: 0;
    height: 100%;
  }

  .modal-overlay {
    align-items: stretch;
  }
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

.path-display {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 8px 12px;
  background: var(--color-background-alt);
  border-radius: var(--radius-md);
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--color-text-muted);
  cursor: pointer;
  transition: all var(--transition-fast);
  border: 1px solid transparent;
}

.path-display:hover {
  background: var(--color-background);
  border-color: var(--color-border);
  color: var(--color-text);
}

.path-display:active {
  background: var(--color-surface);
  border-color: var(--color-accent);
}

.path-display i {
  font-size: 14px;
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

.settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding: 0 4px;
}

.settings-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text);
}

.url-row {
  margin-top: 12px;
}

.url-text-link {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--color-accent);
  text-decoration: none;
  background: var(--color-background-alt);
  padding: 6px 10px;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.url-text-link:hover {
  background: var(--color-accent);
  color: white;
}

.url-text-link i {
  font-size: 14px;
}

.switch-toggle {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 20px;
}

.switch-toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

.switch-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--color-border);
  transition: .2s;
  border-radius: 20px;
}

.switch-slider:before {
  position: absolute;
  content: "";
  height: 14px;
  width: 14px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: .2s;
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

input:checked + .switch-slider {
  background-color: var(--color-accent);
}

input:focus + .switch-slider {
  box-shadow: 0 0 1px var(--color-accent);
}

input:checked + .switch-slider:before {
  transform: translateX(20px);
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

.resource-add {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  position: relative;
}

.resource-add input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: 13px;
  font-family: var(--font-mono);
}

.resource-add input:focus {
  outline: none;
  border-color: var(--color-accent);
}

.add-url-btn {
  flex-shrink: 0;
  padding: 8px 12px;
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 500;
  background: var(--color-accent);
  color: white;
  transition: all var(--transition-fast);
}

.add-url-btn:hover {
  background: var(--color-accent-hover);
}

.suggestions {
  margin-top: -4px;
  margin-bottom: 8px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  max-height: 220px;
  overflow-y: auto;
}

.suggestion-item {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  text-align: left;
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: none;
  cursor: pointer;
  font: inherit;
  color: var(--color-text);
  border-bottom: 1px solid var(--color-border-light);
  transition: background var(--transition-fast);
}

.suggestion-item:last-child {
  border-bottom: none;
}

.suggestion-item:hover {
  background: var(--color-background-alt);
}

.suggestion-name {
  font-weight: 500;
  font-size: 13px;
}

.suggestion-desc {
  font-size: 11px;
  color: var(--color-text-muted);
  margin-top: 2px;
}

.suggestion-url {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--color-text-muted);
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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

.settings-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  color: var(--color-text-muted);
  transition: all var(--transition-fast);
}

.settings-btn:hover, .settings-btn.active {
  background: var(--color-background-alt);
  color: var(--color-accent);
}

.resource-item-wrapper {
  margin-bottom: 8px;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
}

.resource-item-wrapper:has(.resource-expanded-settings) {
  border-color: var(--color-border-light);
  background: rgba(var(--color-background-alt-rgb), 0.3);
  padding: 4px;
}

.resource-expanded-settings {
  padding: 12px;
  margin-top: 4px;
  background: var(--color-background-alt);
  border-radius: var(--radius-md);
  animation: slideDown 200ms ease;
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.settings-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.settings-field label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.settings-field input, .settings-field select {
  padding: 6px 10px;
  font-size: 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
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
