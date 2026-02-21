<template>
  <header class="toolbar">
    <div class="toolbar-left">
      <div class="logo">
        <i class="ph-duotone ph-pen-nib"></i>
        <input
          ref="titleInput"
          v-model="localProjectName"
          class="title-input"
          @blur="saveTitle"
          @keydown.enter="$event.target.blur()"
          @keydown.esc="cancelEditing"
        />
      </div>
    </div>
    <div class="toolbar-center">
      <div
        v-if="isVirtual"
        class="vfs-badge"
        :title="
          hasUnsavedChanges
            ? 'Virtual storage has unsaved changes'
            : 'Using virtual storage'
        "
      >
        <i class="ph-bold ph-hard-drive"></i>
        <span>Portable</span>
        <span v-if="hasUnsavedChanges" class="unsaved-dot"></span>
      </div>
    </div>
    <div class="toolbar-right">
      <DropdownMenu :items="menuItems" align="right">
        <template #trigger>
          <button class="toolbar-btn menu-trigger" title="Menu">
            <i class="ph-bold ph-dots-three-vertical"></i>
          </button>
        </template>
      </DropdownMenu>
    </div>
  </header>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted } from "vue";
import DropdownMenu from "./DropdownMenu.vue";
import {
  detectEditors,
  openInEditor,
  availableEditors,
  editorsLoading,
  editorsDetected,
  getAllEditorDefs,
} from "../utils/editor_registry.js";
import { useGist } from "../composables/useGist.js";

const { publishGist, updateGist, revertGist } = useGist();

const props = defineProps({
  projectName: {
    type: String,
    default: "Pen",
  },
  settings: {
    type: Object,
    required: true,
  },
  previewState: {
    type: Object,
    default: () => ({ displayURL: "", contentURL: "", externalURL: "" }),
  },
  isVirtual: {
    type: Boolean,
    default: false,
  },
  hasUnsavedChanges: {
    type: Boolean,
    default: false,
  },
  config: {
    type: Object,
    default: () => ({}),
  }
});

const emit = defineEmits([
  "settings",
  "new-project",
  "update-settings",
  "update-project-name",
  "export",
  "export-editor",
  "export-zip",
  "import",
  "import-file",
]);

const localProjectName = ref(props.projectName);
const titleInput = ref(null);

watch(
  () => props.projectName,
  (newVal) => {
    localProjectName.value = newVal;
  },
);

function saveTitle() {
  if (localProjectName.value && localProjectName.value !== props.projectName) {
    emit("update-project-name", localProjectName.value);
  } else {
    localProjectName.value = props.projectName;
  }
}

function cancelEditing() {
  localProjectName.value = props.projectName;
  titleInput.value?.blur();
}

function openPreviewTab() {
  const url = props.previewState?.externalURL || props.previewState?.contentURL || "http://localhost:3002";
  window.open(url, "_blank");
}

// computed(() => {
// return document.documentElement.getAttribute('data-theme') !== 'light'
// })
const isDark = ref(false)

function buildEditorChildren() {
  if (editorsLoading.value || !editorsDetected.value) {
    return [{ label: "Detecting...", icon: "ph-duotone ph-spinner", disabled: true }]
  }

  const dark = isDark.value
  const defs = getAllEditorDefs(dark)
  const installed = defs.filter(d => availableEditors.value.includes(d.id))

  if (installed.length === 0) {
    return [{ label: "No editors found", icon: "ph-duotone ph-warning", disabled: true }]
  }

  return installed.map(ed => ({
    label: ed.name,
    iconSrc: ed.iconSrc,
    action: () => openInEditor(ed.id),
  }))
}

onMounted(() => {
  if (!props.isVirtual) {
    detectEditors()
  }
})

const menuItems = computed(() => {
  const items = [
    {
      label: "New Project",
      icon: "ph-duotone ph-plus",
      action: () => emit("new-project"),
    },
    {
      label: "Import Pen",
      icon: "ph-duotone ph-folder-open",
      children: [
        {
          label: "Import Folder",
          icon: "ph-duotone ph-folder",
          action: () => emit("import"),
        },
        {
          label: "Import File (ZIP/HTML)",
          icon: "ph-duotone ph-file-zip",
          action: () => emit("import-file"),
        },
      ],
    },
    {
      label: "Open preview",
      icon: "ph-duotone ph-arrow-square-out",
      action: () => openPreviewTab(),
    },
  ]

  const urlParams = new URLSearchParams(window.location.search);
  const gistIdParam = urlParams.get('gistId');
  const activeGistId = props.config.gistId || gistIdParam;

  if (!props.isVirtual) {
    const editorChildren = buildEditorChildren();
    
    if (activeGistId) {
      editorChildren.unshift({
        label: "GitHub Gist (Portable Editor)",
        icon: "ph-duotone ph-github-logo",
        action: () => window.open(`https://explosion-scratch.github.io/pen?gistId=${activeGistId}`, '_blank')
      });
    }

    items.push({
      label: "Open in...",
      icon: "ph-duotone ph-app-window",
      children: editorChildren,
    })
  }

  const gistChildren = [];

  if (props.config.gistId) {
    gistChildren.push({
      label: "Update Gist",
      icon: "ph-duotone ph-cloud-arrow-up",
      action: () => updateGist(),
    });
  } else {
    gistChildren.push({
      label: "Publish to Gist",
      icon: "ph-duotone ph-github-logo",
      action: () => publishGist(),
    });
  }

  if (gistIdParam) {
    gistChildren.push({
      label: "Revert to Gist",
      icon: "ph-duotone ph-arrow-counter-clockwise",
      action: () => revertGist(),
    });
  }

  if (gistChildren.length > 0) {
    items.push({
      label: "GitHub Gist",
      icon: "ph-duotone ph-github-logo",
      children: gistChildren
    });
  }

  items.push(
    {
      label: "Export",
      icon: "ph-duotone ph-export",
      children: [
        {
          label: "Export HTML",
          icon: "ph-duotone ph-download-simple",
          action: () => emit("export"),
        },
        {
          label: "Export ZIP",
          icon: "ph-duotone ph-file-zip",
          action: () => emit("export-zip"),
        },
        {
          label: "Export Editor",
          icon: "ph-duotone ph-grid-four",
          action: () => emit("export-editor"),
        },
      ],
    },
    {
      label: "Switch orientations",
      icon:
        props.settings.layoutMode === "columns"
          ? "ph-duotone ph-rows"
          : "ph-duotone ph-columns",
      action: () =>
        emit("update-settings", {
          layoutMode:
            props.settings.layoutMode === "columns" ? "rows" : "columns",
        }),
    },
    {
      divider: true,
    },
    {
      label: "Settings",
      icon: "ph-duotone ph-gear",
      action: () => emit("settings"),
    },
  )

  return items
});
</script>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: var(--header-height);
  padding: 0 16px;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
  z-index: 1000;
}

.toolbar-left,
.toolbar-center,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar-left {
  flex: 1;
}

.toolbar-center {
  flex: 1;
  justify-content: center;
}

.toolbar-right {
  flex: 1;
  justify-content: flex-end;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--color-accent);
}

.logo i {
  font-size: 20px;
}

.title-input {
  font-family: var(--font-serif);
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  padding: 4px 8px;
  outline: none;
  min-width: 120px;
  transition: all 0.2s;
}

.title-input:hover {
  background: var(--color-background);
  border-color: var(--color-border);
}

.title-input:focus {
  background: var(--color-surface);
  border-color: var(--color-accent);
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.toolbar-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-muted);
  transition: all var(--transition-fast);
  background: transparent;
  border: none;
  cursor: pointer;
}

.toolbar-btn:hover,
.toolbar-btn.active {
  background: var(--color-background-alt);
  color: var(--color-text);
}

.toolbar-btn i {
  font-size: 18px;
}

.menu-trigger {
  padding: 6px;
}

.vfs-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--color-text-muted);
  padding: 2px 4px;
  border-radius: var(--radius-sm);
  font-size: 10px;
  font-weight: 500;
  opacity: 0.6;
  cursor: default;
  transition: opacity var(--transition-fast);
}

.vfs-badge:hover {
  opacity: 1;
}

.vfs-badge i {
  font-size: 12px;
}

.unsaved-dot {
  width: 4px;
  height: 4px;
  background: var(--color-accent);
  border-radius: 50%;
  margin-left: 2px;
}
</style>
