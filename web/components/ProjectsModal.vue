<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal">
      <header class="modal-header">
        <h2>Projects</h2>
        <button class="close-btn" @click="$emit('close')">
          <i class="ph-duotone ph-x"></i>
        </button>
      </header>
      <div class="modal-body">
        <div v-if="projects.length === 0" class="empty-state">
          No projects found.
        </div>
        <div v-else class="projects-list">
          <div
            v-for="project in projects"
            :key="project.id"
            class="project-row"
            :class="{ current: project.id === activeProjectId }"
          >
            <div class="project-info" @click="openProject(project.id)">
              <div class="project-title-row">
                <template v-if="editingId === project.id">
                  <input
                    ref="renameInput"
                    v-model="editingName"
                    class="rename-input"
                    @blur="finishRename(project.id)"
                    @keydown.enter="finishRename(project.id)"
                    @keydown.esc="cancelRename"
                    @click.stop
                  />
                </template>
                <template v-else>
                  <strong>{{ project.name }}</strong>
                </template>
                <span v-if="project.id === activeProjectId" class="badge badge-current">current</span>
                <span v-if="project.gistId" class="badge badge-gist">gist</span>
              </div>
              <div class="project-meta">
                <span>{{ project.fileCount }} file{{ project.fileCount === 1 ? '' : 's' }}</span>
                <span>{{ formatDate(project.lastOpenedAt) }}</span>
              </div>
            </div>
            <div class="project-actions">
              <button
                class="action-btn"
                title="Rename"
                @click.stop="startRename(project)"
              >
                <i class="ph-duotone ph-pencil-simple"></i>
              </button>
              <button
                class="action-btn"
                title="Open"
                @click.stop="openProject(project.id)"
              >
                <i class="ph-duotone ph-arrow-right"></i>
              </button>
              <button
                class="action-btn danger"
                title="Delete"
                :disabled="project.id === activeProjectId"
                @click.stop="deleteProject(project.id, project.name)"
              >
                <i class="ph-duotone ph-trash"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { projectManager } from '../project_manager.js'
import { getActiveProjectId } from '../filesystem.js'

const emit = defineEmits(['close', 'open-project', 'toast'])

const projects = ref([])
const activeProjectId = ref(null)
const editingId = ref(null)
const editingName = ref('')
const renameInput = ref(null)

function refresh() {
  projects.value = projectManager.listProjects()
  activeProjectId.value = getActiveProjectId()
}

onMounted(refresh)

function formatDate(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString()
}

function openProject(id) {
  emit('open-project', id)
}

function startRename(project) {
  editingId.value = project.id
  editingName.value = project.name
  nextTick(() => {
    const inputs = renameInput.value
    const el = Array.isArray(inputs) ? inputs[0] : inputs
    el?.focus()
    el?.select()
  })
}

function finishRename(id) {
  const name = editingName.value.trim()
  if (name && name !== projects.value.find(p => p.id === id)?.name) {
    projectManager.renameProject(id, name)
    refresh()
    emit('toast', { type: 'success', title: 'Renamed', message: `Project renamed to "${name}"` })
  }
  editingId.value = null
}

function cancelRename() {
  editingId.value = null
}

function deleteProject(id, name) {
  if (id === activeProjectId.value) return
  if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
  projectManager.deleteProject(id)
  refresh()
  emit('toast', { type: 'success', title: 'Deleted', message: `"${name}" has been removed.` })
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
  max-width: 480px;
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
  padding: 12px;
}

.empty-state {
  padding: 24px;
  text-align: center;
  font-size: 13px;
  color: var(--color-text-muted);
}

.projects-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.project-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  transition: background var(--transition-fast);
}

.project-row:hover {
  background: var(--color-background-alt);
}

.project-row.current {
  background: var(--color-background-alt);
}

.project-info {
  flex: 1;
  min-width: 0;
  cursor: pointer;
}

.project-title-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  margin-bottom: 2px;
  flex-wrap: wrap;
}

.project-meta {
  display: flex;
  gap: 8px;
  font-size: 11px;
  color: var(--color-text-muted);
}

.rename-input {
  padding: 2px 6px;
  border: 1px solid var(--color-accent);
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 600;
  background: var(--color-surface);
  color: var(--color-text);
  outline: none;
  min-width: 100px;
}

.badge {
  font-size: 9px;
  padding: 1px 5px;
  border-radius: 999px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.badge-current {
  color: var(--color-accent);
  border: 1px solid var(--color-accent);
}

.badge-gist {
  color: var(--color-text-muted);
  background: var(--color-surface);
  border: 1px solid var(--color-border-light);
}

.project-actions {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.project-row:hover .project-actions {
  opacity: 1;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  color: var(--color-text-muted);
  transition: all var(--transition-fast);
}

.action-btn:hover {
  background: var(--color-border-light);
  color: var(--color-text);
}

.action-btn.danger:hover {
  background: #FEE2E2;
  color: #DC2626;
}

.action-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.action-btn i {
  font-size: 15px;
}

@keyframes fadeIn {
  from { opacity: 0 }
  to { opacity: 1 }
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(16px) }
  to { opacity: 1; transform: translateY(0) }
}

@media (max-width: 768px) {
  .modal {
    max-width: calc(100% - 16px);
    margin: 8px;
  }

  .project-actions {
    opacity: 1;
  }
}
</style>
