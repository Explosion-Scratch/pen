<template>
  <div class="app">
    <template v-if="showHomeScreen">
      <HomeScreen
        :projects="homeProjects"
        @new-project="showTemplatePicker = true"
        @open-project="openProject"
        @import-folder="handleImportFolder"
        @import-file="handleImportFile"
        @import-gist="handleImportGist"
        @import-url="handleImportUrl"
      />
    </template>

    <template v-else-if="!isLoading">
      <Toolbar
        :project-name="config?.name"
        :settings="appSettings"
        :preview-state="previewState"
        :is-virtual="isVirtual"
        :config="config"
        @settings="showSettings = true"
        @new-project="showTemplatePicker = true"
        @update-settings="handleAppSettingsUpdate"
        @update-project-name="handleProjectNameUpdate"
        @export="handleExport"
        @export-editor="handleExportEditor"
        @export-zip="handleExportZip"
        @export-url="handleExportUrl"
        @import="handleImportFolder"
        @import-file="handleImportFile"
        @import-gist="handleImportGist"
        @import-url="handleImportUrl"
        @open-projects="showProjects = true"
        @open-project="openProject"
        @show-homescreen="goHome"
      />
      <PaneManager
        :editors="editors"
        :files="files"
        :adapters="adapters"
        :preview-state="previewState"
        :settings="appSettings"
        :errors="errors"
        @update="handleFileUpdate"
        @render="(isManual) => handleRender(isManual)"
        :last-manual-render="lastManualRender"
        @rename="handleRename"
        @settings-update="handleEditorSettingsUpdate"
        @format="handleFormat"
        @minify="handleMinify"
        @compile="handleCompile"
        @settings="showSettings = true"
        @jump="handleJump"
        @clear-errors="handleClearErrors"
      />
    </template>

    <SettingsModal
      v-if="showSettings"
      :config="config"
      :settings="appSettings"
      :current-path="currentPath"
      :is-portable="isVirtual"
      @close="showSettings = false"
      @save="handleSettingsSave"
      @toast="addToast"
      @restore-snapshot="handleRestoreSnapshot"
    />

    <ProjectsModal
      v-if="showProjects"
      @close="showProjects = false"
      @open-project="openProjectFromModal"
      @toast="addToast"
    />

    <Toast :toasts="toasts" @remove="removeToast" @jump="handleJump" />

    <Teleport to="body">
      <div
        v-if="showTemplatePicker"
        class="modal-overlay"
        @click.self="showTemplatePicker = false"
      >
        <TemplatePickerModal
          :skip-name="!isVirtual"
          @close="showTemplatePicker = false"
          @select="handleTemplateSelect"
        />
      </div>
    </Teleport>

    <Teleport to="body">
      <NamePromptModal
        v-if="namePrompt"
        :title="namePrompt.title"
        :label="namePrompt.label"
        :placeholder="namePrompt.placeholder"
        :initial="namePrompt.initial"
        :confirm-text="namePrompt.confirmText"
        @confirm="namePrompt.onConfirm"
        @cancel="namePrompt = null"
      />
    </Teleport>

    <div v-if="isLoading" class="loading-overlay">
      <div class="loading-content">
        <i class="ph-duotone ph-pen-nib loading-icon"></i>
        <div class="loading-spinner"></div>
        <p>Loading Pen...</p>
      </div>
    </div>

    <GistAuthModal />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch } from "vue";
import PaneManager from "./components/PaneManager.vue";
import SettingsModal from "./components/SettingsModal.vue";
import TemplatePickerModal from "./components/TemplatePickerModal.vue";
import Toolbar from "./components/Toolbar.vue";
import Toast from "./components/Toast.vue";
import GistAuthModal from "./components/GistAuthModal.vue";
import HomeScreen from "./components/HomeScreen.vue";
import ProjectsModal from "./components/ProjectsModal.vue";
import NamePromptModal from "./components/NamePromptModal.vue";
import {
  editorStateManager,
  fileSystemMirror,
  useEditors,
  useFileSystem,
  exportProject,
  exportEditor,
  exportAsZip,
} from "./state_management.js";
import { fileSystem, hasPersistentBackingStore } from "./filesystem.js";
import { useGist } from "./composables/useGist.js";
import { projectManager, projectIdForGist } from "./project_manager.js";
import { parseURLData, buildShareURL, parseGistId, decodeProjectFromURL } from "./utils/url_codec.js";
import { importer } from "./utils/importer.js";
import { loadProjectTemplate } from "../core/project_templates.js";
import { getAllAdapters } from "../core/adapter_registry.js";

const {
  files,
  updateFile,
  setConfig,
  setAllFiles,
  config,
  isVirtual,
  hasUnsavedChanges,
  errors,
} = useFileSystem();
const { triggerAction } = useEditors();

const editors = computed(() => config.editors || []);

const appSettings = reactive({
  autoRun: true,
  previewUrl: "",
  layoutMode: "columns",
});

watch(
  () => config.autoRun,
  (val) => (appSettings.autoRun = val),
);

const currentPath = ref("");
const adapters = ref([]);
const showSettings = ref(false);
const showProjects = ref(false);
const showTemplatePicker = ref(false);
const showHomeScreen = ref(false);
const homeProjects = ref([]);
const namePrompt = ref(null);
const toasts = ref([]);
const lastManualRender = ref(0);
const previewState = ref({ displayURL: "", contentURL: "", externalURL: "" });
const EXTERNAL_SYNC_IDLE_MS = 10000;
const isLoading = ref(true);
let externalApplyTimer = null;
const lastUserEditAt = ref(Date.now());
const pendingExternalReinit = ref(null);

const { initGist, setupGistListeners } = useGist();
setupGistListeners();

onMounted(async () => {
  window.addEventListener("pen-preview-update", (e) => {
    previewState.value = e.detail;
  });

  try {
    await fileSystem.connect();

    if (fileSystem.isVirtual.value) {
      await resolvePortableStartup();
    } else {
      await initGist();
    }

    if (fileSystem.isVirtual.value && !hasPersistentBackingStore) {
      addToast({
        type: "error",
        title: "Persistent Storage Unavailable",
        message: "Browser storage is unavailable. Export your work to avoid losing changes on refresh.",
      });
    }
  } catch (err) {
    console.error("Failed to connect to FS", err);
    addToast({
      type: "error",
      title: "Connection Failed",
      message: "Could not connect to file system.",
    });
  } finally {
    isLoading.value = false;
  }

  window.addEventListener("keydown", handleKeydown);
  window.addEventListener("beforeunload", handleBeforeUnload);
});

async function resolvePortableStartup() {
  const urlParams = new URLSearchParams(window.location.search);
  const gistIdParam = urlParams.get('gistId');

  const urlData = parseURLData();
  if (urlData) {
    const name = urlData.config?.name || 'Imported';
    const id = projectManager.createProject(name, urlData.files, urlData.config);
    fileSystem.loadFromData(id, urlData.files, urlData.config);
    adapters.value = getAllAdapters();
    window.history.replaceState({}, '', window.location.pathname);
    return;
  }

  if (gistIdParam) {
    const projId = projectIdForGist(gistIdParam);
    if (projectManager.hasProject(projId)) {
      fileSystem.loadProject(projId);
    } else {
      const id = projectManager.createProject(`Gist ${gistIdParam}`, {}, {}, gistIdParam);
      fileSystem.loadFromData(id, {}, { name: `Gist ${gistIdParam}`, gistId: gistIdParam, editors: [] });
    }
    adapters.value = getAllAdapters();
    await initGist();
    return;
  }

  if (window.__initial_file_map__) {
    const initialConfig = window.__initial_config__ || {};
    const initialFiles = window.__initial_file_map__;
    const name = initialConfig.name || 'Portable Pen';
    const existingProjects = projectManager.listProjects();
    const matchingProject = existingProjects.find(p =>
      p.name === name && !p.gistId
    );

    if (matchingProject) {
      fileSystem.loadProject(matchingProject.id);
    } else {
      const id = projectManager.createProject(name, initialFiles, initialConfig);
      fileSystem.loadFromData(id, initialFiles, initialConfig);
    }
    adapters.value = getAllAdapters();
    return;
  }

  const allProjects = projectManager.listProjects();
  const nonGist = allProjects.filter(p => !p.gistId);

  if (allProjects.length === 0) {
    homeProjects.value = allProjects;
    showHomeScreen.value = true;
    return;
  }

  if (nonGist.length === 1 && allProjects.length <= 1) {
    fileSystem.loadProject(nonGist[0].id);
    adapters.value = getAllAdapters();
    return;
  }

  homeProjects.value = allProjects;
  showHomeScreen.value = true;
}

function openProject(projectId) {
  showHomeScreen.value = false;
  fileSystem.loadProject(projectId);
  adapters.value = getAllAdapters();
}

function openProjectFromModal(projectId) {
  showProjects.value = false;
  openProject(projectId);
}

function goHome() {
  homeProjects.value = projectManager.listProjects();
  showHomeScreen.value = true;
}

onUnmounted(() => {
  if (externalApplyTimer) clearTimeout(externalApplyTimer);
  window.removeEventListener("keydown", handleKeydown);
  window.removeEventListener("beforeunload", handleBeforeUnload);
});

function applyReinitMessage(message) {
  if (message.config) setConfig(message.config);
  if (message.files) setAllFiles(message.files);
  applyInitMessage(message);
}

function scheduleExternalReinitApply() {
  if (!pendingExternalReinit.value) return;
  if (externalApplyTimer) clearTimeout(externalApplyTimer);
  const idleFor = Date.now() - lastUserEditAt.value;
  const waitMs = Math.max(0, EXTERNAL_SYNC_IDLE_MS - idleFor);
  externalApplyTimer = setTimeout(applyQueuedExternalReinit, waitMs);
}

function applyQueuedExternalReinit() {
  if (!pendingExternalReinit.value) return;
  const idleFor = Date.now() - lastUserEditAt.value;
  if (idleFor < EXTERNAL_SYNC_IDLE_MS) {
    scheduleExternalReinitApply();
    return;
  }
  const shouldApply = confirm(
    "Local project files changed outside the editor. Apply those filesystem changes to open editors now?",
  );
  if (!shouldApply) {
    addToast({
      type: "info",
      title: "External Changes Pending",
      message: "Keeping current editor state. You can apply external file changes later by reloading.",
    });
    pendingExternalReinit.value = null;
    return;
  }
  applyReinitMessage(pendingExternalReinit.value);
  pendingExternalReinit.value = null;
  addToast({
    type: "success",
    title: "External Changes Applied",
    message: "Updated editors from local filesystem changes.",
  });
}

function applyInitMessage(message) {
  adapters.value = message.adapters || [];
  if (message.rootPath) currentPath.value = message.rootPath;
  if (message.config?.autoRun !== undefined)
    appSettings.autoRun = message.config.autoRun;
  if (message.config?.layoutMode)
    appSettings.layoutMode = message.config.layoutMode;
}

fileSystem.on((message) => {
  if (message.type === "init") {
    applyInitMessage(message);
  }

  if (message.type === "reinit") {
    if (message.origin === "external-fs") {
      pendingExternalReinit.value = message;
      addToast({
        type: "info",
        title: "External Change Detected",
        message: "Will prompt to apply local filesystem changes after 10s of inactivity.",
      });
      scheduleExternalReinitApply();
      return;
    }
    pendingExternalReinit.value = null;
    if (externalApplyTimer) clearTimeout(externalApplyTimer);
    applyReinitMessage(message);
  }

  if (message.type === "toast-error") {
    addToast({
      type: "error",
      title: message.name,
      message: message.message,
      details: {
        filename: message.filename,
        line: message.line,
        column: message.column,
      },
    });
  }

  if (message.type === "toast-success") {
    addToast({ type: "success", title: message.title, message: message.message });
  }
});

function handleFileUpdate(filename, content) {
  updateFile(filename, content);
  lastUserEditAt.value = Date.now();
  if (pendingExternalReinit.value) scheduleExternalReinitApply();
}

function handleRender(isManual = false) {
  if (isManual) lastManualRender.value = Date.now();
  const firstFile = Object.keys(files)[0];
  if (firstFile) updateFile(firstFile, files[firstFile]);
}

function handleRename(oldFilename, newFilename, newType) {
  const hasConflict =
    oldFilename !== newFilename &&
    Object.prototype.hasOwnProperty.call(files, newFilename);
  let allowOverwrite = false;
  if (hasConflict) {
    allowOverwrite = confirm(`A file named "${newFilename}" already exists. Overwrite it?`);
    if (!allowOverwrite) return;
  }

  const isServerMode =
    !fileSystem.isVirtual.value &&
    !fileSystem.fallbackMode &&
    fileSystem.socket &&
    fileSystem.socket.readyState === WebSocket.OPEN;

  if (isServerMode) {
    fileSystem.renameFile(oldFilename, newFilename, newType, allowOverwrite);
    return;
  }

  const editor = config.editors?.find((e) => e.filename === oldFilename);
  if (editor) {
    editor.filename = newFilename;
    editor.type = newType;
  }
  const renamed = fileSystem.renameFile(oldFilename, newFilename, newType, allowOverwrite);
  if (renamed) {
    fileSystem.saveConfig(config);
  }
}

function handleAppSettingsUpdate(newSettings) {
  Object.assign(appSettings, newSettings);
  fileSystem.saveConfig({ ...config, ...appSettings });
}

function handleEditorSettingsUpdate(filename, settings) {
  const editor = config.editors.find((e) => e.filename === filename);
  if (editor) editor.settings = settings;

  if (fileSystem.socket && fileSystem.socket.readyState === WebSocket.OPEN) {
    fileSystem.socket.send(
      JSON.stringify({ type: "editor-settings", filename, settings }),
    );
  } else if (fileSystem.isVirtual.value || fileSystem.fallbackMode) {
    fileSystem.saveConfig(config);
  }
}

function handleFormat(filename) { triggerAction(filename, "format") }
function handleMinify(filename) { triggerAction(filename, "minify") }
function handleCompile(filename, target) { triggerAction(filename, "compile", target) }

function handleSettingsSave(newConfig, newSettings) {
  setConfig(newConfig);
  if (newSettings) Object.assign(appSettings, newSettings);
  showSettings.value = false;
  const finalConfig = {
    ...newConfig,
    autoRun: appSettings.autoRun,
    previewUrl: appSettings.previewUrl,
    layoutMode: appSettings.layoutMode,
  };
  fileSystem.saveConfig(finalConfig);
}

function handleProjectNameUpdate(newName) {
  const newConfig = { ...config, name: newName };
  setConfig(newConfig);
  fileSystem.saveConfig({ ...newConfig, ...appSettings });
  if (fileSystem.activeProjectId?.value) {
    projectManager.renameProject(fileSystem.activeProjectId.value, newName);
  }
}

function handleExport() {
  exportProject().catch((err) => addToast({ type: "error", title: "Export Failed", message: err.message }));
}

function handleExportZip() {
  exportAsZip().catch((err) => addToast({ type: "error", title: "Export Failed", message: err.message }));
}

function handleExportEditor() {
  exportEditor().catch((err) => addToast({ type: "error", title: "Export Failed", message: err.message }));
}

function handleExportUrl() {
  try {
    const url = buildShareURL({ files: { ...fileSystem.files }, config: { ...fileSystem.config } });
    navigator.clipboard.writeText(url);
    addToast({ type: "success", title: "URL Copied", message: "Share URL copied to clipboard." });
  } catch (err) {
    addToast({ type: "error", title: "Export Failed", message: err.message });
  }
}

async function handleImportFolder() {
  const input = document.createElement("input");
  input.type = "file";
  input.webkitdirectory = true;
  input.onchange = async (e) => {
    if (!e.target.files?.length) return;
    await importAndCreateProject(e.target.files);
  };
  input.click();
}

async function handleImportFile() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".zip,.html";
  input.onchange = async (e) => {
    if (!e.target.files?.length) return;
    await importAndCreateProject(e.target.files);
  };
  input.click();
}

async function importAndCreateProject(fileList) {
  try {
    const result = await importer.processFiles(fileList);
    if (!result) return;

    if (fileSystem.capabilities.multiProject) {
      const suggestedName = result.config?.name || 'Imported';
      namePrompt.value = {
        title: 'Name Imported Project',
        label: 'Project name',
        placeholder: 'Imported Project',
        initial: suggestedName,
        confirmText: 'Import',
        onConfirm: (name) => {
          namePrompt.value = null;
          result.config.name = name;
          const id = projectManager.createProject(name, result.files, result.config);
          showHomeScreen.value = false;
          fileSystem.loadFromData(id, result.files, result.config);
          adapters.value = getAllAdapters();
          addToast({ type: "success", title: "Imported", message: `Created project "${name}"` });
        },
      };
    } else {
      if (!confirm("Importing will replace the current project files. Continue?")) return;
      setConfig(result.config);
      setAllFiles(result.files);
      if (fileSystem.socket && fileSystem.socket.readyState === WebSocket.OPEN) {
        fileSystem.socket.send(JSON.stringify({ type: "replace-project", config: result.config, files: result.files }));
      }
      addToast({ type: "success", title: "Import Successful", message: `Imported ${Object.keys(result.files).length} files` });
    }
  } catch (err) {
    addToast({ type: "error", title: "Import Failed", message: err.message });
  }
}

function handleImportGist() {
  namePrompt.value = {
    title: 'Import Gist',
    label: 'Gist URL or ID',
    placeholder: 'https://gist.github.com/user/abc123',
    initial: '',
    confirmText: 'Import',
    onConfirm: async (input) => {
      namePrompt.value = null;
      const gistId = parseGistId(input);
      if (!gistId) {
        addToast({ type: "error", title: "Invalid Gist", message: "Could not parse a gist ID from that input." });
        return;
      }
      try {
        const { fetchGistApi, restoreMissingGistFiles } = await import('../core/gist_api.js');
        const gist = await fetchGistApi(gistId);
        let gistFiles = {};
        for (const [filename, fileObj] of Object.entries(gist.files)) {
          gistFiles[filename] = fileObj.content;
        }
        let gistConfig = { name: `Gist ${gistId}`, editors: [], gistId };
        if (gistFiles['.pen.config.json']) {
          try {
            Object.assign(gistConfig, JSON.parse(gistFiles['.pen.config.json']));
            delete gistFiles['.pen.config.json'];
            gistFiles = restoreMissingGistFiles(gistConfig, gistFiles);
          } catch {}
        }
        gistConfig.gistId = gistId;

        if (fileSystem.capabilities.multiProject) {
          const projId = projectIdForGist(gistId);
          if (projectManager.hasProject(projId)) {
            openProject(projId);
          } else {
            const id = projectManager.createProject(gistConfig.name, gistFiles, gistConfig, gistId);
            openProject(id);
          }
        } else {
          setConfig(gistConfig);
          setAllFiles(gistFiles);
          if (fileSystem.socket && fileSystem.socket.readyState === WebSocket.OPEN) {
            fileSystem.socket.send(JSON.stringify({ type: "replace-project", config: gistConfig, files: gistFiles }));
          }
        }
        addToast({ type: "success", title: "Gist Imported", message: `Loaded gist ${gistId}` });
      } catch (err) {
        addToast({ type: "error", title: "Gist Import Failed", message: err.message });
      }
    },
  };
}

function handleImportUrl() {
  namePrompt.value = {
    title: 'Import from URL',
    label: 'Pen share URL',
    placeholder: 'https://...?data=...',
    initial: '',
    confirmText: 'Import',
    onConfirm: (input) => {
      namePrompt.value = null;
      try {
        const url = new URL(input.trim());
        const data = url.searchParams.get('data');
        if (!data) {
          addToast({ type: "error", title: "Invalid URL", message: "No project data found in URL." });
          return;
        }
        const parsed = decodeProjectFromURL(data);
        if (!parsed) {
          addToast({ type: "error", title: "Invalid Data", message: "Could not decode project data." });
          return;
        }
        const name = parsed.config?.name || 'Imported';
        if (fileSystem.capabilities.multiProject) {
          const id = projectManager.createProject(name, parsed.files, parsed.config);
          openProject(id);
        } else {
          setConfig(parsed.config);
          setAllFiles(parsed.files);
        }
        addToast({ type: "success", title: "Imported", message: `Imported project "${name}" from URL.` });
      } catch (err) {
        addToast({ type: "error", title: "Import Failed", message: err.message });
      }
    },
  };
}

async function handleTemplateSelect({ templateId, name }) {
  showTemplatePicker.value = false;

  if (fileSystem.isVirtual.value && fileSystem.capabilities.multiProject) {
    const template = await loadProjectTemplate(templateId);
    if (!template) return;
    const newConfig = { ...template.config, name: name || 'Untitled' };
    const id = projectManager.createProject(newConfig.name, template.files, newConfig);
    showHomeScreen.value = false;
    fileSystem.loadFromData(id, template.files, newConfig);
    adapters.value = getAllAdapters();
    return;
  }

  if (!fileSystem.isVirtual.value && fileSystem.socket?.readyState === WebSocket.OPEN) {
    fileSystem.socket.send(JSON.stringify({ type: "start-template", templateId }));
    return;
  }

  const template = await loadProjectTemplate(templateId);
  if (!template) return;
  const newConfig = { ...template.config, name: name || config.name || "Untitled" };
  setConfig(newConfig, true);
  if (template.files) setAllFiles(template.files);
  adapters.value = getAllAdapters();
}

function addToast(toast) {
  const id = Date.now();
  toasts.value.push({ id, ...toast });
  setTimeout(() => removeToast(id), 5000);
}

function removeToast(id) {
  toasts.value = toasts.value.filter((t) => t.id !== id);
}

function handleJump(details) {
  editorStateManager.jumpToLocation(details.filename, details.line, details.column);
}

function handleClearErrors() {
  fileSystemMirror.setErrors([]);
}

function handleKeydown(event) {
  if (event.key === "Escape") {
    if (showSettings.value) showSettings.value = false;
    if (showTemplatePicker.value) showTemplatePicker.value = false;
    if (showProjects.value) showProjects.value = false;
    if (namePrompt.value) namePrompt.value = null;
  }
  if ((event.metaKey || event.ctrlKey) && event.key === "s") {
    event.preventDefault();
  }
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
    event.preventDefault();
    handleRender(true);
  }
}

function handleBeforeUnload(event) {
  if (!hasUnsavedChanges.value) return;
  event.preventDefault();
  event.returnValue = "";
}

async function handleRestoreSnapshot(snapshot) {
  if (!snapshot?.config || !snapshot?.files) {
    addToast({ type: "error", title: "Restore Failed", message: "Draft data is unavailable." });
    return;
  }
  const overwriteMessage = hasUnsavedChanges.value
    ? "You have unsaved changes. Importing this saved draft will overwrite the current project. Continue?"
    : "Importing this saved draft will overwrite the current project. Continue?";
  if (!confirm(overwriteMessage)) return;

  setConfig(snapshot.config);
  setAllFiles(snapshot.files);

  if (fileSystem.isVirtual.value || fileSystem.fallbackMode) {
    fileSystem.saveConfig(snapshot.config);
    addToast({
      type: "success",
      title: "Draft Imported",
      message: `Loaded "${snapshot.meta?.title || snapshot.config.name || "Untitled"}" from local storage.`,
    });
    return;
  }

  if (fileSystem.socket && fileSystem.socket.readyState === WebSocket.OPEN) {
    fileSystem.socket.send(
      JSON.stringify({ type: "replace-project", config: snapshot.config, files: snapshot.files }),
    );
    addToast({
      type: "success",
      title: "Draft Imported",
      message: `Applied "${snapshot.meta?.title || snapshot.config.name || "Untitled"}" to the current project.`,
    });
  }
}

onMounted(() => {
  window.addEventListener("dragover", handleGlobalDragOver);
  window.addEventListener("drop", handleGlobalDrop);
});

onUnmounted(() => {
  window.removeEventListener("dragover", handleGlobalDragOver);
  window.removeEventListener("drop", handleGlobalDrop);
});

function handleGlobalDragOver(e) { e.preventDefault() }

async function handleGlobalDrop(e) {
  e.preventDefault();
  if (e.dataTransfer.files?.length) {
    await importAndCreateProject(e.dataTransfer.files);
  }
}
</script>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh;
  background: var(--color-background);
}

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

@keyframes fadeIn {
  from { opacity: 0 }
  to { opacity: 1 }
}

.loading-overlay {
  position: fixed;
  inset: 0;
  background: var(--color-background);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  animation: fadeIn 0.3s ease-out;
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  color: var(--color-text-muted);
}

.loading-icon {
  font-size: 48px;
  color: var(--color-accent);
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg) }
}
</style>
