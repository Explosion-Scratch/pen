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
    
    <div class="modal-body">
      <p class="modal-description">Choose a starter template for your project. Warning: This will overwrite your current configuration and files.</p>
      
      <div class="template-grid">
        <div 
          v-for="tmpl in templates" 
          :key="tmpl.id" 
          class="template-card"
          @click="selectTemplate(tmpl)"
        >
          <div class="template-icon" v-html="tmpl.icon"></div>
          <div class="template-info">
            <span class="template-title">{{ tmpl.title }}</span>
            <p class="template-desc">{{ tmpl.description }}</p>
          </div>
          <div class="template-tags">
            <span v-for="tag in tmpl.editors" :key="tag" class="tag">{{ tag }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { loadAllProjectTemplates } from '../../core/project_templates.js'

const emit = defineEmits(['close', 'select'])
const templates = ref([])

onMounted(async () => {
  try {
    templates.value = await loadAllProjectTemplates()
  } catch (err) {
    console.error('Failed to load templates:', err)
  }
})

function selectTemplate(tmpl) {
  if (confirm(`Start new project with "${tmpl.title}" template? This will replace your current files.`)) {
    emit('select', tmpl.id)
  }
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

.template-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: auto;
}

.tag {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  padding: 2px 6px;
  background: var(--color-background-alt);
  border-radius: 4px;
  color: var(--color-text-muted);
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
