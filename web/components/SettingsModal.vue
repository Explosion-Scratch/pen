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
              class="resource-item"
            >
              <input type="text" v-model="localConfig.globalResources.styles[index]" />
              <button class="remove-btn" @click="removeStyle(index)">
                <i class="ph-duotone ph-trash"></i>
              </button>
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
import { ref, watch } from 'vue'

const CDNJS_ALGOLIA_APP = '2QWLVLXZB6'
const CDNJS_ALGOLIA_KEY = '2663c73014d2e4d6d1778cc8ad9fd010'

const props = defineProps({
  config: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close', 'save'])

const localConfig = ref(JSON.parse(JSON.stringify(props.config)))
const scriptInput = ref('')
const styleInput = ref('')
const scriptSuggestions = ref([])
const scriptFocused = ref(false)
let scriptSearchTimer = null
let scriptBlurTimer = null

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

function removeScript(index) {
  localConfig.value.globalResources.scripts.splice(index, 1)
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
