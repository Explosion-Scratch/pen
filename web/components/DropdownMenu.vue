<template>
  <div class="dropdown-container" ref="containerRef">
    <div class="dropdown-trigger" v-if="!isSubmenu" @click.stop="toggle">
      <slot name="trigger">
        <button class="menu-btn">
          <i class="ph ph-dots-three-vertical"></i>
        </button>
      </slot>
    </div>

    <Transition name="fade">
      <div v-if="isOpen && !isSubmenu" class="dropdown-backdrop" @click.stop="close"></div>
    </Transition>

    <Transition name="fade">
      <div v-if="isOpen" class="dropdown-menu" :class="[alignClass, { 'is-submenu': isSubmenu }]">
        <div class="dropdown-items">
          <template v-for="(item, index) in items" :key="index">
            <div v-if="item.divider" class="dropdown-divider"></div>
            <template v-else>
              <div
                class="dropdown-item"
                :class="{ 
                  'has-children': item.children?.length > 0, 
                  'disabled': item.disabled,
                  'is-expanded': item.children?.length > 0 && expandedItem === index
                }"
                @click.stop="handleItemClick(item, index)"
                @mouseenter="!isMobileDevice && (hoveredItem = item)"
                @mouseleave="!isMobileDevice && (hoveredItem = null)"
              >
                <div class="item-content">
                  <img v-if="item.iconSrc" :src="item.iconSrc" class="item-icon-img" />
                  <i v-else-if="item.icon" :class="[item.icon, 'item-icon']"></i>
                  <span class="item-label">{{ item.label }}</span>
                </div>
                
                <i v-if="item.children?.length > 0" :class="['submenu-icon', isMobileDevice ? (expandedItem === index ? 'ph ph-caret-up' : 'ph ph-caret-down') : (align === 'right' ? 'ph ph-caret-left' : 'ph ph-caret-right')]"></i>

                <!-- Desktop: hover flyout -->
                <Transition v-if="!isMobileDevice" name="fade">
                  <div v-if="item.children?.length > 0 && hoveredItem && JSON.stringify(hoveredItem) === JSON.stringify(item)" class="submenu-container" :class="{ 'opens-left': align === 'right' }">
                    <DropdownMenu 
                      :items="item.children" 
                      :is-submenu="true" 
                      @action="handleSubAction"
                      @close="close"
                    />
                  </div>
                </Transition>
              </div>
              <!-- Mobile: inline expanded children -->
              <div v-if="isMobileDevice && item.children?.length > 0 && expandedItem === index" class="mobile-submenu">
                <div
                  v-for="(child, ci) in item.children"
                  :key="ci"
                  class="dropdown-item submenu-child"
                  :class="{ 'disabled': child.disabled }"
                  @click.stop="handleItemClick(child, ci)"
                >
                  <div class="item-content">
                    <img v-if="child.iconSrc" :src="child.iconSrc" class="item-icon-img" />
                    <i v-else-if="child.icon" :class="[child.icon, 'item-icon']"></i>
                    <span class="item-label">{{ child.label }}</span>
                  </div>
                </div>
              </div>
            </template>
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
const expandedItem = ref(null)
const isMobileDevice = ref(false)

function checkMobile() {
  isMobileDevice.value = window.innerWidth <= 768
}

const alignClass = computed(() => `align-${props.align}`)

function toggle() {
  if (props.isSubmenu) return
  isOpen.value = !isOpen.value
  expandedItem.value = null
}

function handleKeydown(event) {
  if (isOpen.value && event.key === 'Escape') {
    close()
  }
}

function close() {
  isOpen.value = false
  hoveredItem.value = null
  expandedItem.value = null
  emit('close')
}

function handleItemClick(item, index) {
  if (item.disabled) return

  if (item.children?.length > 0) {
    if (isMobileDevice.value) {
      expandedItem.value = expandedItem.value === index ? null : index
    }
    return
  }

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
  checkMobile()
  window.addEventListener('resize', checkMobile)
  if (!props.isSubmenu) {
    window.addEventListener('click', handleClickOutside)
    window.addEventListener('keydown', handleKeydown)
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
  if (!props.isSubmenu) {
    window.removeEventListener('click', handleClickOutside)
    window.removeEventListener('keydown', handleKeydown)
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

.dropdown-backdrop {
  display: none;
}

@media (max-width: 768px) {
  .dropdown-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.3);
    z-index: 1000;
    backdrop-filter: blur(2px);
  }
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

.submenu-container.opens-left {
  left: auto;
  right: 100%;
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

.item-icon-img {
  width: 16px;
  height: 16px;
  object-fit: contain;
  flex-shrink: 0;
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

@media (max-width: 768px) {
  .dropdown-menu:not(.is-submenu) {
    position: fixed;
    top: auto;
    bottom: 0;
    left: 0;
    right: 0;
    max-height: 70vh;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    margin-top: 0;
    padding: 8px 8px calc(8px + env(safe-area-inset-bottom, 0px));
    animation: slideUpSheet 200ms ease;
    z-index: 1001;
  }

  .dropdown-item {
    padding: 12px 16px;
    font-size: 14px;
  }

  .submenu-container {
    position: static;
    border: none;
    box-shadow: none;
    padding: 0 0 0 24px;
    min-width: 0;
    background: transparent;
  }

  .submenu-container.opens-left {
    left: 0;
    right: auto;
  }
}

.mobile-submenu {
  padding-left: 20px;
  border-left: 2px solid var(--color-border-light);
  margin-left: 20px;
  margin-bottom: 4px;
  animation: expandDown 150ms ease;
}

.mobile-submenu .submenu-child {
  padding: 10px 14px;
  font-size: 13px;
}

.dropdown-item.is-expanded {
  background: var(--color-background-alt);
}

.dropdown-item.is-expanded .submenu-icon {
  color: var(--color-accent);
}

@keyframes slideUpSheet {
  from {
    opacity: 0;
    transform: translateY(100%);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes expandDown {
  from {
    opacity: 0;
    max-height: 0;
  }
  to {
    opacity: 1;
    max-height: 500px;
  }
}
</style>
