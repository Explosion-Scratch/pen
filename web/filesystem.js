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

function sanitizeStoragePart(value) {
  return String(value || "unknown")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "unknown";
}

function stableStringify(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(",")}}`;
}

function strongFingerprint(value) {
  const input = stableStringify(value);
  const FNV_PRIME = 0x100000001b3n;
  const FNV_OFFSET = 0xcbf29ce484222325n;
  let hashA = FNV_OFFSET;
  let hashB = FNV_OFFSET ^ 0x9e3779b97f4a7c15n;
  for (let i = 0; i < input.length; i++) {
    const code = BigInt(input.charCodeAt(i));
    hashA ^= code;
    hashA = (hashA * FNV_PRIME) & 0xffffffffffffffffn;
    hashB ^= code + BigInt(i + 1);
    hashB = (hashB * (FNV_PRIME + 0x9e3779b1n)) & 0xffffffffffffffffn;
  }
  return `${hashA.toString(16).padStart(16, "0")}${hashB.toString(16).padStart(16, "0")}`;
}

function deriveProjectScope({ rootPath = "", projectName = "", files = {}, config = {} } = {}) {
  const pathPart = rootPath ? sanitizeStoragePart(rootPath) : "no-path";
  const namePart = sanitizeStoragePart(projectName || config?.name || "untitled");
  const fp = strongFingerprint({
    rootPath,
    projectName,
    editors: config?.editors || [],
    fileNames: Object.keys(files || {}).sort(),
  }).slice(0, 16);
  return `${pathPart}-${namePart}-${fp}`;
}

const STORAGE_INDEX_KEY = "pen-vfs-storage-index-v1";

function safeParse(raw, fallback) {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function readStorageIndex() {
  const parsed = safeParse(Storage.getItem(STORAGE_INDEX_KEY, null), null);
  if (!parsed || typeof parsed !== "object") return { entries: {} };
  if (!parsed.entries || typeof parsed.entries !== "object") {
    return { entries: {} };
  }
  return parsed;
}

function writeStorageIndex(index) {
  Storage.setItem(STORAGE_INDEX_KEY, JSON.stringify(index));
}

function hasObjectData(key) {
  const parsed = safeParse(Storage.getItem(key, null), null);
  if (!parsed || typeof parsed !== "object") return false;
  return Object.keys(parsed).length > 0;
}

function signatureKeyFor(configKey) {
  return `pen-vfs-signature-${configKey}`;
}

function resolveStorageKeySet(storageKey, configKey, dirtyKey, identity) {
  const desiredSignature = strongFingerprint(identity);
  const existingSignature = Storage.getItem(signatureKeyFor(configKey), null);
  const looksOccupied = hasObjectData(storageKey) || !!Storage.getItem(configKey, null);
  let resolved = { storageKey, configKey, dirtyKey, keyCollapsed: false };
  if (existingSignature && existingSignature !== desiredSignature && looksOccupied) {
    const fork = `-fork-${Date.now().toString(36)}`;
    resolved = {
      storageKey: `${storageKey}${fork}`,
      configKey: `${configKey}${fork}`,
      dirtyKey: `${dirtyKey}${fork}`,
      keyCollapsed: true,
    };
  }
  const resolvedSignature = strongFingerprint({
    ...identity,
    configKey: resolved.configKey,
  });
  Storage.setItem(signatureKeyFor(resolved.configKey), resolvedSignature);
  return resolved;
}

function touchStorageEntry({ storageKey, configKey, dirtyKey, identity = {}, dirtyValue = null }) {
  const index = readStorageIndex();
  const now = Date.now();
  const entry = index.entries[configKey] || { createdAt: now };
  const resolvedDirty = dirtyValue === null
    ? Storage.getItem(dirtyKey, "0") === "1"
    : !!dirtyValue;
  const next = {
    ...entry,
    storageKey,
    configKey,
    dirtyKey,
    identity,
    lastSeenAt: now,
    dirty: resolvedDirty,
  };
  if (resolvedDirty) next.lastDirtyAt = now;
  index.entries[configKey] = next;
  writeStorageIndex(index);
}

function readStoredSnapshot(configKey) {
  const index = readStorageIndex();
  const entry = index.entries[configKey];
  if (!entry) return null;
  const config = safeParse(Storage.getItem(entry.configKey, null), null);
  const files = safeParse(Storage.getItem(entry.storageKey, null), null);
  if (!config || typeof config !== "object") return null;
  if (!files || typeof files !== "object") return null;
  return { entry, config, files };
}

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
    this.storageIdentity = {};
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

  setStorageKeys(storageKey, configKey, dirtyKey, identity = {}) {
    const resolved = resolveStorageKeySet(storageKey, configKey, dirtyKey, identity);
    this.storageKey = resolved.storageKey;
    this.configKey = resolved.configKey;
    this.dirtyKey = resolved.dirtyKey;
    this.storageIdentity = identity;
    touchStorageEntry({
      storageKey: this.storageKey,
      configKey: this.configKey,
      dirtyKey: this.dirtyKey,
      identity: this.storageIdentity,
      dirtyValue: this.hasUnsavedChanges.value,
    });
    if (resolved.keyCollapsed) {
      this.notify({
        type: "toast-error",
        name: "Storage Key Collision Detected",
        title: "Storage Key Collision Detected",
        message: "A local draft key conflict was detected. A safe forked storage key was created.",
      });
    }
  }

  touchStorageState(dirtyValue = null) {
    if (!this.storageKey || !this.configKey || !this.dirtyKey) return;
    touchStorageEntry({
      storageKey: this.storageKey,
      configKey: this.configKey,
      dirtyKey: this.dirtyKey,
      identity: this.storageIdentity || {},
      dirtyValue,
    });
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
}

class WebSocketFS extends BaseFileSystem {
  constructor() {
    super();
    this.socket = null;
    this.isConnected = ref(false);
    this.retryCount = 0;
    this.maxRetries = 3;
    this.fallbackMode = false;
    const fallbackScope = deriveProjectScope({
      rootPath: `${window.location.pathname || ""}${window.location.search || ""}`,
      projectName: "offline",
      files: {},
      config: {},
    });
    this.setStorageKeys(
      `pen-vfs-files-offline-${fallbackScope}`,
      `pen-vfs-config-offline-${fallbackScope}`,
      `pen-vfs-dirty-offline-${fallbackScope}`,
      {
        mode: "offline-default",
        scope: fallbackScope,
      },
    );
    this.pendingFileWrites = 0;
    this.pendingConfigWrites = 0;
    this.pendingBulkSaves = 0;
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
      const scope = deriveProjectScope({
        rootPath: this.rootPath.value,
        projectName: this.config.name,
        files: this.files,
        config: this.config,
      });
      this.setStorageKeys(
        `pen-vfs-files-offline-${scope}`,
        `pen-vfs-config-offline-${scope}`,
        `pen-vfs-dirty-offline-${scope}`,
        {
          mode: "offline-project",
          scope,
          rootPath: this.rootPath.value || "",
          name: this.config.name || "",
          editors: (this.config.editors || []).map((e) => e.filename),
        },
      );

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
        this.hasUnsavedChanges.value = Storage.getItem(this.dirtyKey, "0") === "1";
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
      if (message.rootPath) this.rootPath.value = message.rootPath;
      this.pendingFileWrites = 0;
      this.pendingConfigWrites = 0;
      this.pendingBulkSaves = 0;
      this.hasUnsavedChanges.value = false;
      this.touchStorageState(false);
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
      this.touchStorageState(false);
    } else if (message.type === "update-ack") {
      this.pendingFileWrites = Math.max(0, this.pendingFileWrites - 1);
      this.hasUnsavedChanges.value =
        this.pendingFileWrites > 0 ||
        this.pendingConfigWrites > 0 ||
        this.pendingBulkSaves > 0;
      this.touchStorageState(this.hasUnsavedChanges.value);
    } else if (message.type === "config-saved") {
      this.pendingConfigWrites = Math.max(0, this.pendingConfigWrites - 1);
      this.hasUnsavedChanges.value =
        this.pendingFileWrites > 0 ||
        this.pendingConfigWrites > 0 ||
        this.pendingBulkSaves > 0;
      this.touchStorageState(this.hasUnsavedChanges.value);
    } else if (message.type === "save-ack") {
      this.pendingBulkSaves = Math.max(0, this.pendingBulkSaves - 1);
      this.hasUnsavedChanges.value =
        this.pendingFileWrites > 0 ||
        this.pendingConfigWrites > 0 ||
        this.pendingBulkSaves > 0;
      this.touchStorageState(this.hasUnsavedChanges.value);
    }
    this.notify(message);
  }

  persist() {
    if (this.fallbackMode) {
      Storage.setItem(this.storageKey, JSON.stringify(this.files));
      Storage.setItem(this.configKey, JSON.stringify(this.config));
      Storage.setItem(this.dirtyKey, this.hasUnsavedChanges.value ? "1" : "0");
      this.touchStorageState(this.hasUnsavedChanges.value);
    }
  }

  writeFile(filename, content) {
    this.files[filename] = content;
    if (this.fallbackMode) {
      this.hasUnsavedChanges.value = true;
      this.persist();
    } else if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.pendingFileWrites++;
      this.hasUnsavedChanges.value = true;
      this.socket.send(JSON.stringify({ type: "update", filename, content }));
    }
  }

  saveConfig(newConfig) {
    if (this.fallbackMode) {
      this.updateConfig(newConfig);
      this.persist();
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
      const renamed = super.renameFile(
        oldFilename,
        newFilename,
        newType,
        allowOverwrite,
      );
      if (!renamed) return false;
      this.hasUnsavedChanges.value = true;
      this.persist();
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
      this.hasUnsavedChanges.value = true;
      this.persist();
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

function contentFingerprint(obj) {
  return strongFingerprint(obj);
}

class VirtualFS extends BaseFileSystem {
  constructor(projectName, initialFiles, gistId = null, initialConfig = null) {
    super();
    this.isVirtual.value = true;
    this.isConnected = ref(true);
    this.gistId = gistId;
    if (gistId) {
      this.setStorageKeys(
        `pen-vfs-files-gist-${gistId}`,
        `pen-vfs-config-gist-${gistId}`,
        `pen-vfs-dirty-gist-${gistId}`,
        {
          mode: "gist",
          gistId,
        },
      );
    } else {
      const fp = contentFingerprint({
        files: initialFiles || {},
        config: initialConfig || {},
        name: projectName || "",
      });
      const base = projectName || "untitled";
      this.setStorageKeys(
        `pen-vfs-files-${base}-${fp}`,
        `pen-vfs-config-${base}-${fp}`,
        `pen-vfs-dirty-${base}-${fp}`,
        {
          mode: "portable",
          projectName: projectName || "",
          fingerprint: fp,
          editors: Object.keys(initialFiles || {}).sort(),
        },
      );
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
    this.hasUnsavedChanges.value = Storage.getItem(this.dirtyKey, "0") === "1";
    this.touchStorageState(this.hasUnsavedChanges.value);

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
    this.touchStorageState(this.hasUnsavedChanges.value);
  }

  writeFile(filename, content) {
    this.files[filename] = content;
    this.hasUnsavedChanges.value = true;
    this.persist();
    Storage.setItem(this.dirtyKey, "1");
  }

  saveConfig(newConfig) {
    this.updateConfig(newConfig);
  }

  renameFile(oldFilename, newFilename, newType, allowOverwrite = false) {
    const renamed = super.renameFile(oldFilename, newFilename, newType, allowOverwrite);
    if (!renamed) return false;
    this.hasUnsavedChanges.value = true;
    this.persist();
    Storage.setItem(this.dirtyKey, "1");
    return true;
  }

  deleteFile(filename) {
    super.deleteFile(filename);
    this.hasUnsavedChanges.value = true;
    this.persist();
    Storage.setItem(this.dirtyKey, "1");
  }

  persist() {
    Storage.setItem(this.storageKey, JSON.stringify(this.files));
    this.touchStorageState(this.hasUnsavedChanges.value);
  }

  markSaved() {
    this.hasUnsavedChanges.value = false;
    Storage.setItem(this.dirtyKey, "0");
    this.touchStorageState(false);
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

export function listStoredDrafts() {
  const index = readStorageIndex();
  return Object.values(index.entries)
    .filter((entry) => entry && typeof entry === "object")
    .map((entry) => {
      const snapshot = readStoredSnapshot(entry.configKey);
      const config = snapshot?.config || {};
      const files = snapshot?.files || {};
      return {
        id: entry.configKey,
        configKey: entry.configKey,
        storageKey: entry.storageKey,
        dirty: !!entry.dirty,
        createdAt: Number(entry.createdAt || 0),
        lastSeenAt: Number(entry.lastSeenAt || 0),
        lastDirtyAt: Number(entry.lastDirtyAt || 0),
        title: config.name || entry.identity?.projectName || "Untitled",
        gistId: config.gistId || entry.identity?.gistId || null,
        mode: entry.identity?.mode || "unknown",
        fileCount: Object.keys(files).length,
      };
    })
    .sort((a, b) => b.lastSeenAt - a.lastSeenAt);
}

export function readStoredDraft(configKey) {
  const snapshot = readStoredSnapshot(configKey);
  if (!snapshot) return null;
  return {
    meta: {
      id: snapshot.entry.configKey,
      createdAt: Number(snapshot.entry.createdAt || 0),
      lastSeenAt: Number(snapshot.entry.lastSeenAt || 0),
      lastDirtyAt: Number(snapshot.entry.lastDirtyAt || 0),
      dirty: !!snapshot.entry.dirty,
      mode: snapshot.entry.identity?.mode || "unknown",
      title: snapshot.config?.name || "Untitled",
      gistId: snapshot.config?.gistId || null,
    },
    config: snapshot.config,
    files: snapshot.files,
  };
}

export function deleteStoredDraft(configKey) {
  const index = readStorageIndex();
  const entry = index.entries[configKey];
  if (!entry) return false;
  Storage.removeItem(entry.storageKey);
  Storage.removeItem(entry.configKey);
  Storage.removeItem(entry.dirtyKey);
  Storage.removeItem(signatureKeyFor(entry.configKey));
  delete index.entries[configKey];
  writeStorageIndex(index);
  return true;
}

export function getActiveStorageConfigKey() {
  return fileSystem?.configKey || null;
}

export let fileSystem;

const urlParams = new URLSearchParams(window.location?.search || '');
const gistId = urlParams.get('gistId');

if (window.__initial_file_map__) {
  fileSystem = new VirtualFS(window.__initial_config__?.name, window.__initial_file_map__, gistId, window.__initial_config__);
} else if (gistId) {
  fileSystem = new VirtualFS(null, null, gistId);
} else {
  fileSystem = new WebSocketFS();
}
