import { ref, reactive } from "vue";
import { getAllAdapters } from "../core/adapter_registry.js";
import { loadProjectTemplate } from "../core/project_templates.js";

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

    if (this._useSrcdoc) {
      this.previewUrl.value = "srcdoc:" + html;
      return this.getPreviewURL();
    }

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);

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

  renameFile(oldFilename, newFilename, newType) {
    if (this.files[oldFilename] !== undefined) {
      const content = this.files[oldFilename];
      delete this.files[oldFilename];
      this.files[newFilename] = content;
      this.notify({ type: "rename", oldFilename, newFilename });
    }
  }

  deleteFile(filename) {
    if (this.files[filename] !== undefined) {
      delete this.files[filename];
      this.notify({ type: "delete", filename });
    }
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
    this.storageKey = "pen-vfs-files-offline";
    this.configKey = "pen-vfs-config-offline";
  }

  async connect(url = "ws://localhost:3001") {
    if (this.fallbackMode) return;

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
      if (!this.isConnected.value && this.retryCount >= this.maxRetries) {
        reject(err);
      }
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

    // If we have existing state from the server connection, preserve it
    // and switch to project-specific storage keys
    if (this.config.name && Object.keys(this.files).length > 0) {
      const projectName = this.config.name;
      this.storageKey = `pen-vfs-files-${projectName}`;
      this.configKey = `pen-vfs-config-${projectName}`;

      this.persist();
      this.notify({
        type: "init",
        files: this.files,
        config: this.config,
        adapters: getAllAdapters(),
        isFallback: true,
      });
      return;
    }

    let restored = false;
    try {
      const storedConfigRaw = Storage.getItem(this.configKey, null);
      if (storedConfigRaw) {
        const storedConfig = JSON.parse(storedConfigRaw);
        this.updateConfig(storedConfig);

        const storedFilesRaw = Storage.getItem(this.storageKey, "{}");
        const storedFiles = JSON.parse(storedFilesRaw);
        this.updateFiles(storedFiles);
        restored = true;
      }
    } catch (e) {
      console.warn("Fallback: Failed to restore from local storage", e);
    }

    if (!restored) {
      try {
        const template = await loadProjectTemplate("vanilla");
        if (template) {
          this.updateConfig({ ...template.config, name: "New Pen" });
          this.updateFiles(template.files);
        }
      } catch (e) {
        console.error("Fallback: Failed to load vanilla template", e);
      }
    }

    this.notify({
      type: "init",
      files: this.files,
      config: this.config,
      adapters: getAllAdapters(),
      isFallback: true,
    });
  }

  handleMessage(message) {
    if (message.previewServerUrl !== undefined) {
      this.previewServerUrl.value = message.previewServerUrl;
    }
    
    if (message.type === "init") {
      this.updateConfig(message.config);
      this.updateFiles(message.files);
    } else if (message.type === "reinit") {
      if (message.config) {
        Object.keys(this.config).forEach((key) => delete this.config[key]);
        this.updateConfig(message.config);
      }
      if (message.files) this.updateFiles(message.files);
    }
    this.notify(message);
  }

  persist() {
    if (this.fallbackMode) {
      Storage.setItem(this.storageKey, JSON.stringify(this.files));
      Storage.setItem(this.configKey, JSON.stringify(this.config));
    }
  }

  writeFile(filename, content) {
    this.files[filename] = content;
    if (this.fallbackMode) {
      this.hasUnsavedChanges.value = true;
      this.persist();
    } else if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: "update", filename, content }));
    }
  }

  saveConfig(newConfig) {
    if (this.fallbackMode) {
      this.updateConfig(newConfig);
      this.persist();
    } else if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(
        JSON.stringify({ type: "save-config", config: newConfig }),
      );
    }
  }

  renameFile(oldFilename, newFilename, newType) {
    super.renameFile(oldFilename, newFilename, newType);

    if (this.fallbackMode) {
      this.hasUnsavedChanges.value = true;
      this.persist();
    } else if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(
        JSON.stringify({ type: "rename", oldFilename, newFilename, newType }),
      );
    }
  }

  deleteFile(filename) {
    super.deleteFile(filename);
    if (this.fallbackMode) {
      this.hasUnsavedChanges.value = true;
      this.persist();
    } else if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: "delete", filename }));
    }
  }

  importFolder(folderPath) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: "import-folder", folderPath }));
    }
  }
}

function contentFingerprint(obj) {
  const str = JSON.stringify(obj);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
}

class VirtualFS extends BaseFileSystem {
  constructor(projectName, initialFiles, gistId = null) {
    super();
    this.isVirtual.value = true;
    this.isConnected = ref(true);
    this.gistId = gistId;
    if (gistId) {
      this.storageKey = `pen-vfs-files-gist-${gistId}`;
      this.configKey = `pen-vfs-config-gist-${gistId}`;
    } else {
      const fp = initialFiles ? contentFingerprint(initialFiles) : "default";
      const base = projectName || "untitled";
      this.storageKey = `pen-vfs-files-${base}-${fp}`;
      this.configKey = `pen-vfs-config-${base}-${fp}`;
    }
  }

  /**
   * Connects to the virtual file system and restores state from localStorage.
   * Keys are scoped by project name to avoid clashing between different exports.
   * @returns {Promise<void>}
   */
  async connect() {
    const initialFiles = window.__initial_file_map__ || {};
    const initialConfig = window.__initial_config__ || {};

    let storedFiles = null;
    let storedConfig = null;

    try {
      const storedConfigRaw = Storage.getItem(this.configKey, null);
      if (storedConfigRaw) {
        storedConfig = JSON.parse(storedConfigRaw);
        const storedFilesRaw = Storage.getItem(this.storageKey, null);
        if (storedFilesRaw) storedFiles = JSON.parse(storedFilesRaw);
      }
    } catch (e) {
      console.warn("VFS: Failed to restore state from storage", e);
    }

    const finalFiles = storedFiles
      ? { ...initialFiles, ...storedFiles }
      : { ...initialFiles };
    const finalConfig = storedConfig
      ? { ...initialConfig, ...storedConfig }
      : { ...initialConfig };

    this.updateConfig(finalConfig);
    this.updateFiles(finalFiles);

    this.notify({
      type: "init",
      files: this.files,
      config: this.config,
      adapters: getAllAdapters(),
    });
    return Promise.resolve();
  }

  updateFiles(newFiles) {
    super.updateFiles(newFiles);
    this.persist();
  }

  updateConfig(newConfig) {
    super.updateConfig(newConfig);
    Storage.setItem(this.configKey, JSON.stringify(this.config));
  }

  writeFile(filename, content) {
    this.files[filename] = content;
    this.hasUnsavedChanges.value = true;
    this.persist();
  }

  saveConfig(newConfig) {
    this.updateConfig(newConfig);
  }

  renameFile(oldFilename, newFilename, newType) {
    super.renameFile(oldFilename, newFilename, newType);
    this.hasUnsavedChanges.value = true;
    this.persist();
  }

  deleteFile(filename) {
    super.deleteFile(filename);
    this.hasUnsavedChanges.value = true;
    this.persist();
  }

  persist() {
    Storage.setItem(this.storageKey, JSON.stringify(this.files));
  }
}

/**
 * @param {string} gistId
 * @returns {boolean} true if localStorage has meaningful file data for this gist
 */
export function hasGistLocalData(gistId) {
  try {
    const raw = Storage.getItem(`pen-vfs-files-gist-${gistId}`, null);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0;
  } catch {
    return false;
  }
}

export let fileSystem;

const urlParams = new URLSearchParams(window.location?.search || '');
const gistId = urlParams.get('gistId');

if (window.__initial_file_map__) {
  fileSystem = new VirtualFS(window.__initial_config__?.name, window.__initial_file_map__, gistId);
} else if (gistId) {
  fileSystem = new VirtualFS(null, null, gistId);
} else {
  fileSystem = new WebSocketFS();
}
