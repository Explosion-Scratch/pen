<template>
  <header class="toolbar">
    <div class="toolbar-left">
      <div class="logo">
        <i class="ph-duotone ph-pen-nib" @click="$emit('show-homescreen')" style="cursor:pointer"></i>
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
        title="Using browser storage"
      >
        <i class="ph-bold ph-hard-drive"></i>
        <span>Portable</span>
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
import { ref, computed, watch, onMounted } from "vue";
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
import { projectManager } from "../project_manager.js";
import { fileSystem } from "../filesystem.js";

const { publishGist, updateGist, revertGist } = useGist();

const props = defineProps({
  projectName: { type: String, default: "Pen" },
  settings: { type: Object, required: true },
  previewState: { type: Object, default: () => ({ displayURL: "", contentURL: "", externalURL: "" }) },
  isVirtual: { type: Boolean, default: false },
  config: { type: Object, default: () => ({}) },
});

const emit = defineEmits([
  "settings",
  "new-project",
  "update-settings",
  "update-project-name",
  "export",
  "export-editor",
  "export-zip",
  "export-url",
  "import",
  "import-file",
  "import-gist",
  "import-url",
  "open-projects",
  "open-project",
  "show-homescreen",
]);

const localProjectName = ref(props.projectName);
const titleInput = ref(null);
const isDark = ref(false);

watch(() => props.projectName, (newVal) => { localProjectName.value = newVal });

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

function buildEditorChildren() {
  if (editorsLoading.value || !editorsDetected.value) {
    return [{ label: "Detecting...", icon: "ph-duotone ph-spinner", disabled: true }];
  }
  const defs = getAllEditorDefs(isDark.value);
  const installed = defs.filter(d => availableEditors.value.includes(d.id));
  if (installed.length === 0) {
    return [{ label: "No editors found", icon: "ph-duotone ph-warning", disabled: true }];
  }
  return installed.map(ed => ({
    label: ed.name,
    iconSrc: ed.iconSrc,
    action: () => openInEditor(ed.id),
  }));
}

function buildRecentProjectChildren() {
  const projects = projectManager.listProjects();
  const activeId = fileSystem.activeProjectId?.value;
  if (projects.length === 0) {
    return [{ label: "No projects", icon: "ph-duotone ph-folder-notch", disabled: true }];
  }
  const items = projects.slice(0, 8).map(p => {
    const badges = [];
    if (p.id === activeId) badges.push({ text: "current", type: "accent" });
    if (p.gistId) badges.push({ text: "gist", type: "muted" });
    return {
      label: p.name,
      icon: p.gistId ? "ph-duotone ph-github-logo" : "ph-duotone ph-folder-notch-open",
      badges,
      action: () => emit("open-project", p.id),
    };
  });
  items.push({ divider: true });
  items.push({
    label: "All Projects…",
    icon: "ph-duotone ph-folders",
    action: () => emit("open-projects"),
  });
  if (fileSystem.capabilities.multiProject) {
    items.push({
      label: "Home",
      icon: "ph-duotone ph-house",
      action: () => emit("show-homescreen"),
    });
  }
  return items;
}

onMounted(() => {
  if (!props.isVirtual) detectEditors();
});

const urlParams = new URLSearchParams(window.location.search);
const gistIdParam = urlParams.get('gistId');

const menuItems = computed(() => {
  const activeGistId = props.config.gistId || gistIdParam;
  const items = [];

  items.push({
    label: "New Project",
    icon: "ph-duotone ph-plus",
    action: () => emit("new-project"),
  });

  if (fileSystem.capabilities.multiProject) {
    items.push({
      label: "Open Project",
      icon: "ph-duotone ph-folder-notch-open",
      children: buildRecentProjectChildren(),
    });
  }

  items.push({
    label: "Import",
    icon: "ph-duotone ph-download-simple",
    children: [
      { label: "Import Folder", icon: "ph-duotone ph-folder", action: () => emit("import") },
      { label: "Import File (ZIP/HTML)", icon: "ph-duotone ph-file-zip", action: () => emit("import-file") },
      { label: "Import Gist", icon: "ph-duotone ph-github-logo", action: () => emit("import-gist") },
      { label: "Import from URL", icon: "ph-duotone ph-link", action: () => emit("import-url") },
    ],
  });

  items.push({
    label: "Open preview",
    icon: "ph-duotone ph-arrow-square-out",
    action: () => openPreviewTab(),
  });

  if (!props.isVirtual) {
    const editorChildren = buildEditorChildren();
    if (activeGistId) {
      editorChildren.unshift({
        label: "GitHub Gist (Portable Editor)",
        icon: "ph-duotone ph-github-logo",
        action: () => window.open(`https://explosion-scratch.github.io/pen?gistId=${activeGistId}`, '_blank'),
      });
    }
    items.push({
      label: "Open in...",
      icon: "ph-duotone ph-app-window",
      children: editorChildren,
    });
  }

  if (activeGistId) {
    items.push({
      label: "Revert to Gist",
      icon: "ph-duotone ph-arrow-counter-clockwise",
      action: () => revertGist(),
    });
  }

  const exportChildren = [
    { label: "Export HTML", icon: "ph-duotone ph-download-simple", action: () => emit("export") },
    { label: "Export ZIP", icon: "ph-duotone ph-file-zip", action: () => emit("export-zip") },
    { label: "Export Editor", icon: "ph-duotone ph-grid-four", action: () => emit("export-editor") },
    { label: "Copy Share URL", icon: "ph-duotone ph-link", action: () => emit("export-url") },
  ];

  if (props.config.gistId) {
    exportChildren.push({
      label: "Update Gist",
      icon: "ph-duotone ph-cloud-arrow-up",
      action: () => updateGist(),
    });
  } else {
    exportChildren.push({
      label: "Publish to Gist",
      icon: "ph-duotone ph-github-logo",
      action: () => publishGist(),
    });
  }

  items.push({
    label: "Export",
    icon: "ph-duotone ph-export",
    children: exportChildren,
  });

  items.push({
    label: "Switch orientations",
    icon: props.settings.layoutMode === "columns" ? "ph-duotone ph-rows" : "ph-duotone ph-columns",
    action: () => emit("update-settings", { layoutMode: props.settings.layoutMode === "columns" ? "rows" : "columns" }),
  });

  items.push({ divider: true });

  items.push({
    label: "Settings",
    icon: "ph-duotone ph-gear",
    action: () => emit("settings"),
  });

  if (fileSystem.capabilities.multiProject) {
    items.push({
      label: "Projects",
      icon: "ph-duotone ph-folders",
      action: () => emit("open-projects"),
    });
  }

  return items;
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

@media (max-width: 768px) {
  .toolbar {
    padding: 0 10px;
  }

  .title-input {
    font-size: 14px;
    min-width: 80px;
    padding: 4px 6px;
  }

  .toolbar-center {
    display: none;
  }

  .toolbar-left {
    flex: 1;
    min-width: 0;
  }

  .toolbar-right {
    flex: 0 0 auto;
  }
}

@media (max-width: 480px) {
  .toolbar {
    padding: 0 8px;
  }

  .title-input {
    font-size: 13px;
    min-width: 60px;
  }

  .logo i {
    font-size: 18px;
  }
}
</style>
