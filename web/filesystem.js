import { ref, reactive } from "vue";
import { getAllAdapters } from "../core/adapter_registry.js";
import { projectManager, projectIdForGist } from "./project_manager.js";

export async function fetchRemoteGist(gistId) {
  const response = await fetch(`https://api.github.com/gists/${gistId}`);
  if (!response.ok) throw new Error(`Failed to fetch gist ${gistId}: ${response.statusText}`);
  return response.json();
}

const memoryStore = new Map();

function getBackingStore() {
  try {
    const testKey = "__pen_storage_test__";
    localStorage.setItem(testKey, "1");
    localStorage.removeItem(testKey);
    return localStorage;
  } catch {
    try {
      const testKey = "__pen_storage_test__";
      sessionStorage.setItem(testKey, "1");
      sessionStorage.removeItem(testKey);
      return sessionStorage;
    } catch {
      return null;
    }
  }
}

const backingStore = getBackingStore();
export const hasPersistentBackingStore = !!backingStore;

const Storage = {
  getItem(key, defaultValue = "{}") {
    if (backingStore) {
      try {
        return backingStore.getItem(key) || defaultValue;
      } catch {
        return defaultValue;
      }
    }
    return memoryStore.get(key) ?? defaultValue;
  },
  setItem(key, value) {
    if (backingStore) {
      try {
        backingStore.setItem(key, value);
        return;
      } catch {}
    }
    memoryStore.set(key, value);
  },
  removeItem(key) {
    if (backingStore) {
      try {
        backingStore.removeItem(key);
        return;
      } catch {}
    }
    memoryStore.delete(key);
  },
};

class BaseFileSystem {
  constructor() {
    this.files = reactive({});
    this.config = reactive({});
    this.previewUrl = ref("");
    this.onMessageCallbacks = new Set();
    this.isVirtual = ref(false);
    this.hasUnsavedChanges = ref(false);
    this.previewServerUrl = ref("");
    this.rootPath = ref("");
    this.activeProjectId = ref(null);
  }

  get capabilities() {
    return {
      multiProject: false,
      localFileSystem: false,
    }
  }

  on(callback) {
    this.onMessageCallbacks.add(callback);
  }

  off(callback) {
    this.onMessageCallbacks.delete(callback);
  }

  notify(message) {
    for (const cb of this.onMessageCallbacks) cb(message);
  }

  updateFiles(newFiles) {
    Object.keys(this.files).forEach((key) => delete this.files[key]);
    Object.assign(this.files, newFiles);
  }

  updateConfig(newConfig) {
    Object.assign(this.config, newConfig);
  }

  getPreviewURL() {
    let display = "http://preview.pen/";
    let external = this.previewUrl.value;
    
    if (this.previewServerUrl.value && !this.isVirtual.value && !this.fallbackMode) {
      display = this.previewServerUrl.value;
      external = this.previewServerUrl.value;
    }

    return {
      displayURL: display,
      externalURL: external,
      contentURL: this.previewUrl.value,
    };
  }

  async writePreview(html) {
    if (this.previewUrl.value && this.previewUrl.value.startsWith("blob:")) {
      URL.revokeObjectURL(this.previewUrl.value);
    }

    if (this._useSrcdoc === undefined) {
      this._useSrcdoc = window.location.protocol === 'file:';
    }

    if (this._useSrcdoc) {
      this.previewUrl.value = "srcdoc:" + html;
      return this.getPreviewURL();
    }

    let url;
    try {
      const blob = new Blob([html], { type: "text/html" });
      url = URL.createObjectURL(blob);
    } catch (err) {
      console.warn("URL.createObjectURL failed, falling back to srcdoc:", err);
      this._useSrcdoc = true;
      this.previewUrl.value = "srcdoc:" + html;
      return this.getPreviewURL();
    }

    if (!this._blobTestDone) {
      this._blobTestDone = true;
      const works = await new Promise((resolve) => {
        const testFrame = document.createElement("iframe");
        testFrame.style.display = "none";
        testFrame.src = url;
        const timer = setTimeout(() => {
          cleanup();
          resolve(false);
        }, 500);
        const onLoad = () => {
          cleanup();
          resolve(true);
        };
        const onError = () => {
          cleanup();
          resolve(false);
        };
        const cleanup = () => {
          clearTimeout(timer);
          testFrame.removeEventListener("load", onLoad);
          testFrame.removeEventListener("error", onError);
          testFrame.remove();
        };
        testFrame.addEventListener("load", onLoad);
        testFrame.addEventListener("error", onError);
        document.body.appendChild(testFrame);
      });

      if (!works) {
        this._useSrcdoc = true;
        URL.revokeObjectURL(url);
        this.previewUrl.value = "srcdoc:" + html;
        return this.getPreviewURL();
      }
    }

    this.previewUrl.value = url;
    return this.getPreviewURL();
  }

  renameFile(oldFilename, newFilename, newType, allowOverwrite = false) {
    if (
      oldFilename !== newFilename &&
      this.files[newFilename] !== undefined &&
      !allowOverwrite
    ) {
      this.notify({
        type: "toast-error",
        name: "Rename Failed",
        title: "Rename Failed",
        message: `A file named "${newFilename}" already exists.`,
      });
      return false;
    }
    if (this.files[oldFilename] !== undefined) {
      const content = this.files[oldFilename];
      delete this.files[oldFilename];
      this.files[newFilename] = content;
      this.notify({ type: "rename", oldFilename, newFilename });
      return true;
    }
    return false;
  }

  deleteFile(filename) {
    if (this.files[filename] !== undefined) {
      delete this.files[filename];
      this.notify({ type: "delete", filename });
    }
  }

  loadProject(projectId) {
    const project = projectManager.getProject(projectId);
    if (!project) return false;

    this.activeProjectId.value = projectId;
    projectManager.touchProject(projectId);

    Object.keys(this.config).forEach(k => delete this.config[k]);
    this.updateConfig(project.config);
    this.updateFiles(project.files);
    this.hasUnsavedChanges.value = false;

    this.notify({
      type: "init",
      files: this.files,
      config: this.config,
      adapters: getAllAdapters(),
    });
    return true;
  }

  loadFromData(projectId, files, config) {
    this.activeProjectId.value = projectId;
    projectManager.touchProject(projectId);

    Object.keys(this.config).forEach(k => delete this.config[k]);
    this.updateConfig(config);
    this.updateFiles(files);
    this.hasUnsavedChanges.value = false;

    projectManager.saveProjectFiles(projectId, { ...files });
    projectManager.saveProjectConfig(projectId, { ...config });
    projectManager.setDirty(projectId, false);

    this.notify({
      type: "init",
      files: this.files,
      config: this.config,
      adapters: getAllAdapters(),
    });
  }
}

class WebSocketFS extends BaseFileSystem {
  constructor() {
    super();
    this.socket = null;
    this.isConnected = ref(false);
    this.retryCount = 0;
    this.maxRetries = 3;
    this.fallbackMode = false;
    this.pendingFileWrites = 0;
    this.pendingConfigWrites = 0;
    this.pendingBulkSaves = 0;
  }

  get capabilities() {
    if (this.fallbackMode) {
      return { multiProject: true, localFileSystem: false }
    }
    return { multiProject: false, localFileSystem: true }
  }

  async connect(url = "ws://localhost:3001") {
    if (this.fallbackMode) return;

    if (window.location.protocol === "file:") {
      console.log("File protocol detected, skipping WebSocket connection.");
      await this.enableFallbackMode();
      return;
    }

    return new Promise((resolve, reject) => {
      this._connectRecursive(url, resolve, reject);
    });
  }

  _connectRecursive(url, resolve, reject) {
    this.socket = new WebSocket(url);

    this.socket.onopen = () => {
      this.isConnected.value = true;
      this.retryCount = 0;
      resolve();
    };

    this.socket.onclose = () => {
      this.isConnected.value = false;
      if (!this.fallbackMode) {
        if (this.retryCount < this.maxRetries) {
          this.retryCount++;
          setTimeout(() => this._connectRecursive(url, resolve, reject), 200);
        } else {
          console.warn("Max retries reached. Switching to fallback mode.");
          this.enableFallbackMode();
          resolve();
        }
      }
    };

    this.socket.onerror = (err) => {
      console.error("FileSystem WebSocket error:", err);
    };

    this.socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (err) {
        console.error("Failed to parse message:", err);
      }
    };
  }

  async enableFallbackMode() {
    this.fallbackMode = true;
    this.isVirtual.value = true;
    this.isConnected.value = true;

    if (this.config.name && Object.keys(this.files).length > 0) {
      const name = this.config.name || 'Offline Pen';
      const id = projectManager.createProject(name, { ...this.files }, { ...this.config });
      this.activeProjectId.value = id;
      this._persistFallback();
      this.notify({
        type: "init",
        files: this.files,
        config: this.config,
        adapters: getAllAdapters(),
        isFallback: true,
      });
      return;
    }

    const projects = projectManager.listProjects();
    const lastId = projectManager.getLastOpenedId();
    const lastProject = lastId ? projectManager.getProject(lastId) : null;

    if (lastProject) {
      this.activeProjectId.value = lastId;
      projectManager.touchProject(lastId);
      this.updateConfig(lastProject.config);
      this.updateFiles(lastProject.files);
      this.hasUnsavedChanges.value = false;
    } else if (projects.length > 0) {
      const first = projects[0];
      const p = projectManager.getProject(first.id);
      if (p) {
        this.activeProjectId.value = first.id;
        projectManager.touchProject(first.id);
        this.updateConfig(p.config);
        this.updateFiles(p.files);
        this.hasUnsavedChanges.value = false;
      }
    } else {
      this.updateConfig({ editors: [] });
    }

    this.notify({
      type: "init",
      files: this.files,
      config: this.config,
      adapters: getAllAdapters(),
      isFallback: true,
    });
  }

  _persistFallback() {
    if (!this.fallbackMode || !this.activeProjectId.value) return;
    projectManager.saveProjectFiles(this.activeProjectId.value, { ...this.files });
    projectManager.saveProjectConfig(this.activeProjectId.value, { ...this.config });
    projectManager.setDirty(this.activeProjectId.value, false);
  }

  handleMessage(message) {
    if (message.previewServerUrl !== undefined) {
      this.previewServerUrl.value = message.previewServerUrl;
    }
    
    if (message.type === "init") {
      this.updateConfig(message.config);
      this.updateFiles(message.files);
      if (message.rootPath) this.rootPath.value = message.rootPath;
      this.pendingFileWrites = 0;
      this.pendingConfigWrites = 0;
      this.pendingBulkSaves = 0;
      this.hasUnsavedChanges.value = false;
    } else if (message.type === "reinit") {
      if (message.config) {
        Object.keys(this.config).forEach((key) => delete this.config[key]);
        this.updateConfig(message.config);
      }
      if (message.files) this.updateFiles(message.files);
      if (message.rootPath) this.rootPath.value = message.rootPath;
      this.pendingFileWrites = 0;
      this.pendingConfigWrites = 0;
      this.pendingBulkSaves = 0;
      this.hasUnsavedChanges.value = false;
    } else if (message.type === "update-ack") {
      this.pendingFileWrites = Math.max(0, this.pendingFileWrites - 1);
      this.hasUnsavedChanges.value =
        this.pendingFileWrites > 0 ||
        this.pendingConfigWrites > 0 ||
        this.pendingBulkSaves > 0;
    } else if (message.type === "config-saved") {
      this.pendingConfigWrites = Math.max(0, this.pendingConfigWrites - 1);
      this.hasUnsavedChanges.value =
        this.pendingFileWrites > 0 ||
        this.pendingConfigWrites > 0 ||
        this.pendingBulkSaves > 0;
    } else if (message.type === "save-ack") {
      this.pendingBulkSaves = Math.max(0, this.pendingBulkSaves - 1);
      this.hasUnsavedChanges.value =
        this.pendingFileWrites > 0 ||
        this.pendingConfigWrites > 0 ||
        this.pendingBulkSaves > 0;
    }
    this.notify(message);
  }

  writeFile(filename, content) {
    this.files[filename] = content;
    if (this.fallbackMode) {
      this._persistFallback();
    } else if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.pendingFileWrites++;
      this.hasUnsavedChanges.value = true;
      this.socket.send(JSON.stringify({ type: "update", filename, content }));
    }
  }

  saveConfig(newConfig) {
    if (this.fallbackMode) {
      this.updateConfig(newConfig);
      this._persistFallback();
    } else if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      Object.assign(this.config, newConfig);
      this.pendingConfigWrites++;
      this.hasUnsavedChanges.value = true;
      this.socket.send(
        JSON.stringify({ type: "save-config", config: newConfig }),
      );
    }
  }

  renameFile(oldFilename, newFilename, newType, allowOverwrite = false) {
    if (this.fallbackMode) {
      const renamed = super.renameFile(oldFilename, newFilename, newType, allowOverwrite);
      if (!renamed) return false;
      this._persistFallback();
      return true;
    }
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.hasUnsavedChanges.value = true;
      this.socket.send(
        JSON.stringify({ type: "rename", oldFilename, newFilename, newType, allowOverwrite }),
      );
      return true;
    }
    return false;
  }

  deleteFile(filename) {
    super.deleteFile(filename);
    if (this.fallbackMode) {
      this._persistFallback();
    } else if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.hasUnsavedChanges.value = true;
      this.socket.send(JSON.stringify({ type: "delete", filename }));
    }
  }

  importFolder(folderPath) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: "import-folder", folderPath }));
    }
  }
}

class VirtualFS extends BaseFileSystem {
  constructor() {
    super();
    this.isVirtual.value = true;
    this.isConnected = ref(true);
  }

  get capabilities() {
    return { multiProject: true, localFileSystem: false }
  }

  async connect() {}

  writeFile(filename, content) {
    this.files[filename] = content;
    this.persist();
  }

  saveConfig(newConfig) {
    this.updateConfig(newConfig);
    if (this.activeProjectId.value) {
      projectManager.saveProjectConfig(this.activeProjectId.value, { ...this.config });
    }
  }

  renameFile(oldFilename, newFilename, newType, allowOverwrite = false) {
    const renamed = super.renameFile(oldFilename, newFilename, newType, allowOverwrite);
    if (!renamed) return false;
    this.persist();
    return true;
  }

  deleteFile(filename) {
    super.deleteFile(filename);
    this.persist();
  }

  persist() {
    if (!this.activeProjectId.value) return;
    projectManager.saveProjectFiles(this.activeProjectId.value, { ...this.files });
    projectManager.saveProjectConfig(this.activeProjectId.value, { ...this.config });
    projectManager.setDirty(this.activeProjectId.value, false);
  }
}

export function hasGistLocalData(gistId) {
  return projectManager.hasProject(projectIdForGist(gistId));
}

export function getActiveProjectId() {
  return fileSystem?.activeProjectId?.value || null;
}

export function listStoredDrafts() {
  return projectManager.listProjects().map(p => ({
    id: p.id,
    configKey: p.id,
    storageKey: p.id,
    dirty: p.dirty,
    createdAt: p.createdAt,
    lastSeenAt: p.lastOpenedAt,
    lastDirtyAt: p.lastOpenedAt,
    title: p.name,
    gistId: p.gistId,
    mode: p.gistId ? 'gist' : 'portable',
    fileCount: p.fileCount,
  }))
}

export function readStoredDraft(projectId) {
  const project = projectManager.getProject(projectId)
  if (!project) return null
  return {
    meta: {
      id: projectId,
      createdAt: project.meta.createdAt,
      lastSeenAt: project.meta.lastOpenedAt,
      lastDirtyAt: project.meta.lastOpenedAt,
      dirty: project.dirty,
      mode: project.meta.gistId ? 'gist' : 'portable',
      title: project.meta.name,
      gistId: project.meta.gistId,
    },
    config: project.config,
    files: project.files,
  }
}

export function deleteStoredDraft(projectId) {
  return projectManager.deleteProject(projectId)
}

export function getActiveStorageConfigKey() {
  return fileSystem?.activeProjectId?.value || null
}

export let fileSystem;

if (window.__initial_file_map__) {
  fileSystem = new VirtualFS();
} else {
  fileSystem = new WebSocketFS();
}
