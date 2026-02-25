<template>
  <div class="homescreen">
    <div class="homescreen-inner">
      <header class="hs-header">
        <div class="hs-logo">
          <i class="ph-duotone ph-pen-nib"></i>
          <h1>Pen</h1>
        </div>
        <p class="hs-tagline">Your projects</p>
      </header>

      <div class="hs-actions">
        <button class="hs-action-btn primary" @click="$emit('new-project')">
          <i class="ph-duotone ph-plus"></i>
          <span>New Project</span>
        </button>
        <div class="import-wrapper" ref="importRef">
          <button class="hs-action-btn" @click="importOpen = !importOpen">
            <i class="ph-duotone ph-download-simple"></i>
            <span>Import</span>
            <i class="ph ph-caret-down caret" :class="{ open: importOpen }"></i>
          </button>
          <Transition name="fade">
            <div v-if="importOpen" class="import-dropdown">
              <button class="import-option" @click="handleImportAction('folder')">
                <i class="ph-duotone ph-folder"></i>
                Import Folder
              </button>
              <button class="import-option" @click="handleImportAction('file')">
                <i class="ph-duotone ph-file-zip"></i>
                Import File (ZIP/HTML)
              </button>
              <button class="import-option" @click="handleImportAction('gist')">
                <i class="ph-duotone ph-github-logo"></i>
                Import Gist
              </button>
              <button class="import-option" @click="handleImportAction('url')">
                <i class="ph-duotone ph-link"></i>
                Import from URL
              </button>
            </div>
          </Transition>
        </div>
      </div>

      <div v-if="projects.length > 0" class="hs-projects">
        <div
          v-for="project in projects"
          :key="project.id"
          class="project-card"
          @click="$emit('open-project', project.id)"
        >
          <div class="project-card-main">
            <div class="project-name">{{ project.name }}</div>
            <div class="project-meta">
              <span class="project-files">{{ project.fileCount }} file{{ project.fileCount === 1 ? '' : 's' }}</span>
              <span class="project-date">{{ formatDate(project.lastOpenedAt) }}</span>
            </div>
          </div>
          <div class="project-tags">
            <span v-if="project.gistId" class="tag tag-gist">gist</span>
          </div>
        </div>
      </div>

      <div v-else class="hs-empty">
        <i class="ph-duotone ph-notebook"></i>
        <p>No projects yet. Create one to get started.</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

defineProps({
  projects: { type: Array, default: () => [] }
})

const emit = defineEmits(['new-project', 'open-project', 'import-folder', 'import-file', 'import-gist', 'import-url'])

const importOpen = ref(false)
const importRef = ref(null)

function handleImportAction(type) {
  importOpen.value = false
  emit(`import-${type}`)
}

function formatDate(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  const now = new Date()
  const diff = now - d
  if (diff < 60000) return 'Just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`
  return d.toLocaleDateString()
}

function handleClickOutside(e) {
  if (importRef.value && !importRef.value.contains(e.target)) {
    importOpen.value = false
  }
}

onMounted(() => window.addEventListener('click', handleClickOutside))
onUnmounted(() => window.removeEventListener('click', handleClickOutside))
</script>

<style scoped>
.homescreen {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  height: 100dvh;
  background: var(--color-background);
  padding: 24px;
  overflow-y: auto;
}

.homescreen-inner {
  width: 100%;
  max-width: 520px;
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.hs-header {
  text-align: center;
}

.hs-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-bottom: 6px;
}

.hs-logo i {
  font-size: 28px;
  color: var(--color-accent);
}

.hs-logo h1 {
  font-family: var(--font-serif);
  font-size: 26px;
  font-weight: 700;
  color: var(--color-text);
}

.hs-tagline {
  font-size: 13px;
  color: var(--color-text-muted);
}

.hs-actions {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.hs-action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.hs-action-btn:hover {
  border-color: var(--color-text-muted);
}

.hs-action-btn.primary {
  background: var(--color-accent);
  color: white;
  border-color: var(--color-accent);
}

.hs-action-btn.primary:hover {
  background: var(--color-accent-hover);
  border-color: var(--color-accent-hover);
}

.hs-action-btn i:not(.caret) {
  font-size: 16px;
}

.caret {
  font-size: 10px;
  transition: transform var(--transition-fast);
}

.caret.open {
  transform: rotate(180deg);
}

.import-wrapper {
  position: relative;
}

.import-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  min-width: 200px;
  background: var(--color-surface);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  padding: 4px;
  z-index: 10;
}

.import-option {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  color: var(--color-text);
  transition: background var(--transition-fast);
  text-align: left;
}

.import-option:hover {
  background: var(--color-background-alt);
}

.import-option i {
  font-size: 16px;
  color: var(--color-text-muted);
}

.hs-projects {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.project-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  background: var(--color-surface);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.project-card:hover {
  border-color: var(--color-border);
  box-shadow: var(--shadow-sm);
}

.project-card:active {
  background: var(--color-background-alt);
}

.project-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text);
  margin-bottom: 2px;
}

.project-meta {
  display: flex;
  gap: 10px;
  font-size: 11px;
  color: var(--color-text-muted);
}

.project-tags {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.tag {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 999px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.tag-gist {
  background: var(--color-background-alt);
  color: var(--color-text-muted);
  border: 1px solid var(--color-border-light);
}

.hs-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 40px;
  color: var(--color-text-muted);
  text-align: center;
}

.hs-empty i {
  font-size: 36px;
  opacity: 0.4;
}

.hs-empty p {
  font-size: 13px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.12s ease, transform 0.12s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

@media (max-width: 480px) {
  .homescreen {
    padding: 16px;
    align-items: flex-start;
    padding-top: 60px;
  }

  .hs-actions {
    flex-direction: column;
  }

  .import-dropdown {
    left: 0;
    right: 0;
    min-width: 0;
  }
}
</style>
