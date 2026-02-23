<template>
  <div class="template-picker-modal">
    <header class="modal-header">
      <div class="header-content">
        <i class="ph-duotone ph-sparkle"></i>
        <h3>Start from Template</h3>
      </div>
      <button class="close-btn" @click="$emit('close')">
        <i class="ph-duotone ph-x"></i>
      </button>
    </header>

    <div class="search-bar">
      <div class="search-container">
        <i class="ph-duotone ph-magnifying-glass search-icon"></i>
        <input 
          ref="searchInput"
          v-model="searchQuery" 
          type="text" 
          placeholder="Search templates..." 
          class="search-input"
        />
        <button v-if="searchQuery" class="clear-search" @click="searchQuery = ''">
          <i class="ph-duotone ph-x-circle"></i>
        </button>
      </div>
    </div>
    
    <div class="modal-body">
      <p class="modal-description">Choose a starter template for your project. Warning: This will overwrite your current configuration and files.</p>
      
      <div v-if="filteredTemplates.length > 0" class="template-grid">
        <div 
          v-for="tmpl in filteredTemplates" 
          :key="tmpl.id" 
          class="template-card"
          @click="selectTemplate(tmpl)"
        >
          <div class="template-icon" v-html="tmpl.icon"></div>
          <div class="template-info">
            <span class="template-title">{{ tmpl.title }}</span>
            <p class="template-desc">{{ tmpl.description }}</p>
          </div>
        </div>
      </div>
      <div v-else class="empty-state">
        <i class="ph-duotone ph-magnifying-glass"></i>
        <p>No templates found matching "{{ searchQuery }}"</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { loadAllProjectTemplates } from '../../core/project_templates.js'

const emit = defineEmits(['close', 'select'])
const templates = ref([])
const searchQuery = ref('')
const searchInput = ref(null)

const filteredTemplates = computed(() => {
  const query = searchQuery.value.toLowerCase().trim()
  if (!query) return templates.value
  
  return templates.value.filter(tmpl => {
    return tmpl.title.toLowerCase().includes(query) || 
           tmpl.description.toLowerCase().includes(query)
  })
})

onMounted(async () => {
  try {
    const rawTemplates = await loadAllProjectTemplates()
    templates.value = rawTemplates
    
    setTimeout(() => {
      searchInput.value?.focus()
    }, 100)
  } catch (err) {
    console.error('Failed to load templates:', err)
  }
})

function selectTemplate(tmpl) {
  emit('select', tmpl.id)
}
</script>

<style scoped>
.template-picker-modal {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 600px;
  max-height: 85vh;
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xl);
  animation: slideUp 240ms cubic-bezier(0.16, 1, 0.3, 1);
  overflow: hidden;
}

@media (max-width: 768px) {
  .template-picker-modal {
    max-width: calc(100% - 16px);
    max-height: 90vh;
    margin: 8px;
  }

  .template-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .modal-header {
    padding: 16px 16px;
  }

  .search-bar {
    padding: 12px 16px;
  }

  .modal-body {
    padding: 16px;
  }
}

@media (max-width: 480px) {
  .template-picker-modal {
    max-width: 100%;
    max-height: 100vh;
    margin: 0;
    border-radius: 0;
    height: 100%;
  }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--color-border-light);
  background: var(--color-background-alt);
}

.header-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-content i {
  font-size: 24px;
  color: var(--color-accent);
}

.header-content h3 {
  font-family: var(--font-serif);
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  color: var(--color-text-muted);
  transition: all var(--transition-fast);
}

.close-btn:hover {
  background: var(--color-border-light);
  color: var(--color-text);
}

.search-bar {
  padding: 16px 24px;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border-light);
  position: sticky;
  top: 0;
  z-index: 10;
}

.search-container {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 12px;
  font-size: 20px;
  color: var(--color-text-muted);
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 10px 40px 10px 44px;
  background: var(--color-background-alt);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  font-size: 14px;
  color: var(--color-text);
  transition: all var(--transition-fast);
}

.search-input:focus {
  outline: none;
  background: var(--color-surface);
  border-color: var(--color-accent);
  box-shadow: 0 0 0 4px rgba(194, 65, 12, 0.1);
}

.clear-search {
  position: absolute;
  right: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-muted);
  font-size: 20px;
  transition: color var(--transition-fast);
  padding: 0;
}

.clear-search:hover {
  color: var(--color-text);
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.modal-description {
  font-size: 13px;
  color: var(--color-text-muted);
  margin-bottom: 24px;
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}

.template-card {
  display: flex;
  flex-direction: column;
  padding: 20px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.template-card:hover {
  border-color: var(--color-accent);
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.template-icon {
  width: 40px;
  height: 40px;
  margin-bottom: 16px;
  color: var(--color-accent);
  display: flex;
  align-items: center;
}

.template-icon :deep(svg) {
  width: 100%;
  height: 100%;
}

.template-title {
  display: block;
  font-weight: 600;
  font-size: 15px;
  margin-bottom: 6px;
}

.template-desc {
  font-size: 12px;
  color: var(--color-text-muted);
  line-height: 1.5;
  margin-bottom: 16px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  color: var(--color-text-muted);
  text-align: center;
}

.empty-state i {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
  color: var(--color-accent);
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>

