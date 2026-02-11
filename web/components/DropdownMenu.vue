<template>
  <div class="dropdown-container" ref="containerRef">
    <div class="dropdown-trigger" @click.stop="toggle">
      <slot name="trigger">
        <button class="menu-btn">
          <i class="ph ph-dots-three-vertical"></i>
        </button>
      </slot>
    </div>

    <Transition name="fade">
      <div v-if="isOpen" class="dropdown-menu" :class="[alignClass, { 'is-submenu': isSubmenu }]">
        <div class="dropdown-items">
          <template v-for="(item, index) in items" :key="index">
            <div v-if="item.divider" class="dropdown-divider"></div>
            <div
              v-else
              class="dropdown-item"
              :class="{ 'has-children': item.children?.length > 0, 'disabled': item.disabled }"
              @click.stop="handleItemClick(item)"
              @mouseenter="hoveredItem = item"
              @mouseleave="hoveredItem = null"
            >
              <div class="item-content">
                <i v-if="item.icon" :class="[item.icon, 'item-icon']"></i>
                <span class="item-label">{{ item.label }}</span>
              </div>
              
              <i v-if="item.children?.length > 0" class="ph ph-caret-right submenu-icon"></i>

              <Transition name="fade">
                <div v-if="item.children?.length > 0 && hoveredItem === item" class="submenu-container">
                  <DropdownMenu 
                    :items="item.children" 
                    :is-submenu="true" 
                    @action="handleSubAction"
                    @close="close"
                  />
                </div>
              </Transition>
            </div>
          </template>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  items: {
    type: Array,
    required: true
  },
  align: {
    type: String,
    default: 'right'
  },
  isSubmenu: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['action', 'close'])

const isOpen = ref(props.isSubmenu)
const containerRef = ref(null)
const hoveredItem = ref(null)

const alignClass = computed(() => `align-${props.align}`)

function toggle() {
  if (props.isSubmenu) return
  isOpen.value = !isOpen.value
}

function close() {
  isOpen.value = false
  hoveredItem.value = null
  emit('close')
}

function handleItemClick(item) {
  if (item.disabled) return
  if (item.children?.length > 0) return

  if (item.action) {
    if (typeof item.action === 'function') {
      item.action()
    } else {
      emit('action', item.action)
    }
  }
  
  close()
}

function handleSubAction(action) {
  emit('action', action)
  close()
}

function handleClickOutside(event) {
  if (props.isSubmenu) return
  if (containerRef.value && !containerRef.value.contains(event.target)) {
    close()
  }
}

onMounted(() => {
  if (!props.isSubmenu) {
    window.addEventListener('click', handleClickOutside)
  }
})

onUnmounted(() => {
  if (!props.isSubmenu) {
    window.removeEventListener('click', handleClickOutside)
  }
})

defineExpose({ close })
</script>

<script>
export default {
  name: 'DropdownMenu'
}
</script>

<style scoped>
.dropdown-container {
  position: relative;
  display: inline-block;
}

.dropdown-trigger {
  cursor: pointer;
  display: flex;
  align-items: center;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  z-index: 1000;
  min-width: 180px;
  background: var(--color-surface);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  padding: 4px;
  margin-top: 4px;
}

.dropdown-menu.is-submenu {
  position: static;
  border: none;
  box-shadow: none;
  margin-top: 0;
  padding: 0;
  background: transparent;
}

.submenu-container {
  position: absolute;
  left: 100%;
  top: -5px;
  background: var(--color-surface);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  padding: 4px;
  min-width: 160px;
}

.align-right {
  right: 0;
}

.align-left {
  left: 0;
}

.dropdown-items {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.dropdown-item {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  color: var(--color-text);
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;
  transition: all var(--transition-fast);
}

.dropdown-item:hover {
  background: var(--color-background-alt);
}

.dropdown-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.item-content {
  display: flex;
  align-items: center;
  gap: 10px;
}

.item-icon {
  font-size: 16px;
  color: var(--color-text-muted);
}

.dropdown-item:hover .item-icon {
  color: var(--color-accent);
}

.item-label {
  flex: 1;
}

.submenu-icon {
  font-size: 10px;
  color: var(--color-text-muted);
  margin-left: 8px;
}

.dropdown-divider {
  height: 1px;
  background: var(--color-border-light);
  margin: 4px 8px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.submenu-container .fade-enter-from,
.submenu-container .fade-leave-to {
  opacity: 0;
  transform: translateX(-4px);
}

.menu-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: var(--radius-sm);
  color: var(--color-text-muted);
  transition: all var(--transition-fast);
}

.menu-btn:hover {
  background: var(--color-border-light);
  color: var(--color-text);
}
</style>
