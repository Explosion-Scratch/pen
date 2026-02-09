<template>
  <div class="editor-card" :class="{ collapsed: isCollapsed }">
    <header class="editor-header">
      <div class="editor-info">
        <i :class="getEditorIcon(editor.type)"></i>
        <input
          v-if="!isCollapsed"
          type="text"
          class="editor-filename-input"
          :value="editor.filename"
          @change="handleFilenameChange"
          @keydown.enter="handleFilenameChange"
          spellcheck="false"
        />
        <span v-else class="editor-filename-vertical">{{ editor.filename }}</span>
      </div>
      <div class="editor-actions" v-if="!isCollapsed">
        <button class="action-btn" @click="showSettings = true" title="Editor settings">
          <i class="ph-duotone ph-gear-six"></i>
        </button>
        <button class="action-btn" @click="formatCode" title="Format code">
          <i class="ph-duotone ph-magic-wand"></i>
        </button>
        <button class="action-btn" @click="$emit('toggle-collapse')" title="Collapse">
          <i class="ph-duotone ph-caret-up"></i>
        </button>
      </div>
      <div class="editor-actions" v-else>
        <button class="action-btn" @click="$emit('toggle-collapse')" title="Expand">
          <i class="ph-duotone ph-caret-down"></i>
        </button>
      </div>
    </header>
    <div class="editor-body" v-show="!isCollapsed" ref="editorContainer"></div>
    
    <Teleport to="body">
      <div v-if="showSettings" class="settings-overlay" @click.self="showSettings = false">
        <EditorSettings
          :adapter="getAdapter()"
          :settings="editor.settings || {}"
          @close="showSettings = false"
          @save="handleSettingsSave"
        />
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { EditorView, basicSetup } from 'codemirror'
import { EditorState, Compartment } from '@codemirror/state'
import { keymap } from '@codemirror/view'
import { javascript } from '@codemirror/lang-javascript'
import { html } from '@codemirror/lang-html'
import { css } from '@codemirror/lang-css'
import { sass } from '@codemirror/lang-sass'
import { indentWithTab } from '@codemirror/commands'
import { abbreviationTracker, expandAbbreviation } from '@emmetio/codemirror6-plugin'
import { penLightTheme } from '../codemirror/theme.js'
import EditorSettings from './EditorSettings.vue'

const props = defineProps({
  editor: {
    type: Object,
    required: true
  },
  content: {
    type: String,
    default: ''
  },
  isCollapsed: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update', 'rename', 'settings-update', 'toggle-collapse', 'format'])

const editorContainer = ref(null)
const showSettings = ref(false)
let view = null
let updateListener = null
const languageCompartment = new Compartment()

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

const extensionToType = {
  '.html': 'html',
  '.htm': 'html',
  '.pug': 'pug',
  '.jade': 'pug',
  '.slim': 'slim',
  '.css': 'css',
  '.scss': 'sass',
  '.sass': 'sass',
  '.less': 'less',
  '.styl': 'stylus',
  '.stylus': 'stylus',
  '.js': 'javascript',
  '.mjs': 'javascript',
  '.ts': 'typescript',
  '.tsx': 'typescript'
}

function getEditorIcon(type) {
  return editorIcons[type] || 'ph-duotone ph-file'
}

function getLanguageExtension(type) {
  const type_ = type.toLowerCase()
  if (type_ === 'html' || type_ === 'pug' || type_ === 'slim') {
    return html()
  }
  if (type_ === 'css' || type_ === 'less' || type_ === 'stylus') {
    return css()
  }
  if (type_ === 'sass') {
    return sass()
  }
  if (type_ === 'javascript') {
    return javascript()
  }
  if (type_ === 'typescript') {
    return javascript({ typescript: true })
  }
  return javascript()
}

function isMarkupEditor(type) {
  return ['html', 'pug', 'slim'].includes(type.toLowerCase())
}

function isStyleEditor(type) {
  return ['css', 'sass', 'less', 'stylus'].includes(type.toLowerCase())
}

function getEmmetExtensions() {
  const type_ = props.editor.type.toLowerCase()
  if (isMarkupEditor(type_) || isStyleEditor(type_)) {
    return [
      abbreviationTracker(),
      keymap.of([{
        key: 'Tab',
        run: expandAbbreviation
      }])
    ]
  }
  return []
}

function formatCode() {
  emit('format', props.editor.filename)
}

function getAdapter() {
  return {
    name: props.editor.type.charAt(0).toUpperCase() + props.editor.type.slice(1),
    schema: {}
  }
}

function handleSettingsSave(settings) {
  emit('settings-update', props.editor.filename, settings)
  showSettings.value = false
}

function handleFilenameChange(event) {
  const newFilename = event.target.value.trim()
  if (!newFilename || newFilename === props.editor.filename) {
    event.target.value = props.editor.filename
    return
  }
  
  const ext = newFilename.includes('.') ? 
    '.' + newFilename.split('.').pop().toLowerCase() : null
  
  if (ext && extensionToType[ext]) {
    const newType = extensionToType[ext]
    emit('rename', props.editor.filename, newFilename, newType)
    
    if (view && newType !== props.editor.type) {
      view.dispatch({
        effects: languageCompartment.reconfigure(getLanguageExtension(newType))
      })
    }
  } else if (ext) {
    alert(`Unknown file extension: ${ext}. Please use a supported file extension.`)
    event.target.value = props.editor.filename
  } else {
    emit('rename', props.editor.filename, newFilename, props.editor.type)
  }
}

onMounted(() => {
  if (!editorContainer.value) return

  updateListener = EditorView.updateListener.of((update) => {
    if (update.docChanged) {
      const content = update.state.doc.toString()
      emit('update', content)
    }
  })

  const extensions = [
    basicSetup,
    languageCompartment.of(getLanguageExtension(props.editor.type)),
    penLightTheme,
    updateListener,
    EditorView.lineWrapping,
    ...getEmmetExtensions(),
    keymap.of([indentWithTab])
  ]

  const state = EditorState.create({
    doc: props.content,
    extensions
  })

  view = new EditorView({
    state,
    parent: editorContainer.value
  })
})

watch(() => props.content, (newContent) => {
  if (view && newContent !== view.state.doc.toString()) {
    view.dispatch({
      changes: {
        from: 0,
        to: view.state.doc.length,
        insert: newContent
      }
    })
  }
})

onUnmounted(() => {
  if (view) {
    view.destroy()
  }
})
</script>

<style scoped>
.editor-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--color-surface);
  border-right: 1px solid var(--color-border-light);
  min-width: 40px;
  transition: min-width var(--transition-fast);
}

.editor-card.collapsed {
  min-width: 40px;
  max-width: 40px;
}

.editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: var(--pane-header-height);
  padding: 0 8px;
  background: var(--color-background-alt);
  border-bottom: 1px solid var(--color-border-light);
  flex-shrink: 0;
}

.collapsed .editor-header {
  flex-direction: column;
  height: auto;
  padding: 8px 4px;
  min-height: 100%;
  justify-content: flex-start;
  gap: 8px;
}

.editor-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.collapsed .editor-info {
  flex-direction: column;
  align-items: center;
  writing-mode: vertical-rl;
  text-orientation: mixed;
}

.editor-info i {
  font-size: 16px;
  color: var(--color-accent);
  flex-shrink: 0;
}

.editor-filename-input {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--color-text-muted);
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  padding: 2px 6px;
  min-width: 0;
  flex: 1;
  transition: all var(--transition-fast);
}

.editor-filename-input:hover {
  background: var(--color-background);
  border-color: var(--color-border);
}

.editor-filename-input:focus {
  background: var(--color-surface);
  border-color: var(--color-accent);
  outline: none;
  color: var(--color-text);
}

.editor-filename-vertical {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--color-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding-top: 8px;
}

.editor-actions {
  display: flex;
  align-items: center;
  gap: 2px;
}

.collapsed .editor-actions {
  flex-direction: column;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: var(--radius-sm);
  color: var(--color-text-muted);
  transition: all var(--transition-fast);
}

.action-btn:hover {
  background: var(--color-border-light);
  color: var(--color-text);
}

.action-btn i {
  font-size: 14px;
}

.editor-body {
  flex: 1;
  overflow: hidden;
}

.editor-body :deep(.cm-editor) {
  height: 100%;
}

.settings-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 200ms ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
