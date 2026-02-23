import { ref, onMounted, onUnmounted } from 'vue';
import { fileSystem, hasGistLocalData } from '../filesystem.js';
import { useFileSystem } from '../state_management.js';
import { publishGistApi, updateGistApi, fetchGistApi, normalizeGistPayload, restoreMissingGistFiles } from '../../core/gist_api.js';

export const showAuthPrompt = ref(false);
export const githubToken = ref("");
export const isPublishingGist = ref(false);
export const isPublicGist = ref(false);
export const publishedGistData = ref(null);
let pendingAuthAction = null;

function toTimestamp(value) {
  const t = Date.parse(value || "");
  return Number.isFinite(t) ? t : 0;
}

function stampGistMetadata(configObj, gistMeta) {
  const next = { ...(configObj || {}) };
  if (gistMeta?.id) next.gistId = gistMeta.id;
  if (gistMeta?.updatedAt) next.gistUpdatedAt = gistMeta.updatedAt;
  if (gistMeta?.fetchedAt) next.gistFetchedAt = gistMeta.fetchedAt;
  return next;
}

export function submitAuthToken() {
  if (!githubToken.value || !pendingAuthAction) return;
  isPublishingGist.value = true;
  const token = githubToken.value.trim();
  if (fileSystem.isVirtual.value) {
    handlePortableGistAction(pendingAuthAction, token);
  } else {
    fileSystem.socket.send(JSON.stringify({ 
      type: pendingAuthAction, 
      token
    }));
  }
  showAuthPrompt.value = false;
  githubToken.value = "";
  pendingAuthAction = null;
}

async function handlePortableGistAction(action, token) {
  try {
    isPublishingGist.value = true;
    const { files, config } = fileSystem;
    const configData = config.value || config;
    
    const filesToUpload = { ...files };
    if (configData && Object.keys(configData).length > 0) {
      filesToUpload['.pen.config.json'] = JSON.stringify(configData, null, 2);
    }
    
    const payload = normalizeGistPayload(filesToUpload, configData?.name, action === 'publish-gist', isPublicGist.value);

    const gistId = action === 'update-gist' ? (configData?.gistId || new URLSearchParams(window.location.search).get('gistId')) : null;
    if (action === 'update-gist' && !gistId) throw new Error("No Gist ID found to update.");

    let data;
    if (action === 'update-gist') {
      data = await updateGistApi(token, gistId, payload);
    } else {
      data = await publishGistApi(token, payload);
    }
    
    const updatedConfig = stampGistMetadata(configData, {
      id: data.id,
      updatedAt: data.updated_at || new Date().toISOString(),
      fetchedAt: new Date().toISOString(),
    });
    fileSystem.saveConfig(updatedConfig);
    
    if (fileSystem.isVirtual?.value) {
      fileSystem.markSaved?.();
    }

    publishedGistData.value = {
      id: data.id,
      url: data.html_url,
      editorUrl: `https://explosion-scratch.github.io/pen?gistId=${data.id}`
    };
  } catch (err) {
    if (fileSystem.notify) {
      fileSystem.notify({
        type: 'toast-error',
        name: 'Gist Error',
        title: 'Gist Error',
        message: err.message
      });
    } else {
      console.error(err);
      alert(err.message);
    }
  } finally {
    isPublishingGist.value = false;
  }
}

export function closeAuthPrompt() {
  showAuthPrompt.value = false;
  isPublishingGist.value = false;
}

export function closeSuccessModal() {
  publishedGistData.value = null;
}

export function useGist() {
  const { setConfig, setAllFiles } = useFileSystem();

  function triggerToast(type, title, message) {
    fileSystem.notify({
      type: type === 'error' ? 'toast-error' : 'toast-success',
      name: title,
      title: title,
      message: message
    });
  }

  async function initGist() {
    const urlParams = new URLSearchParams(window.location.search);
    const gistId = urlParams.get('gistId');
    if (!gistId) return;

    try {
      const gist = await fetchGistApi(gistId);
      let gistFiles = {};
      for (const [filename, fileObj] of Object.entries(gist.files)) {
        gistFiles[filename] = fileObj.content;
      }

      let gistConfig = { name: "Gist " + gistId, editors: [] };
      if (gistFiles['.pen.config.json']) {
        try {
          gistConfig = JSON.parse(gistFiles['.pen.config.json']);
          delete gistFiles['.pen.config.json'];
          gistFiles = restoreMissingGistFiles(gistConfig, gistFiles);
        } catch(e) {}
      }
      gistConfig = stampGistMetadata(gistConfig, {
        id: gistId,
        updatedAt: gist.updated_at,
        fetchedAt: new Date().toISOString(),
      });

      if (fileSystem.isVirtual.value) {
        const hasLocal = hasGistLocalData(gistId);
        if (!hasLocal) {
          setConfig(gistConfig, true);
          setAllFiles(gistFiles);
          fileSystem.saveConfig(gistConfig);
          fileSystem.markSaved?.();
          return;
        }
        const localGistUpdatedAt = toTimestamp(fileSystem.config?.gistUpdatedAt);
        const remoteGistUpdatedAt = toTimestamp(gist.updated_at);
        const isRemoteNewer =
          remoteGistUpdatedAt > 0 &&
          (localGistUpdatedAt === 0 || remoteGistUpdatedAt > localGistUpdatedAt);
        if (isRemoteNewer) {
          const overwrite = confirm(
            "A newer version of this gist exists on GitHub. Overwrite your local draft with the newer gist?",
          );
          if (!overwrite) {
            fileSystem.saveConfig(
              stampGistMetadata(fileSystem.config, {
                id: gistId,
                updatedAt: gist.updated_at,
                fetchedAt: new Date().toISOString(),
              }),
            );
            return;
          }
          setConfig(gistConfig, true);
          setAllFiles(gistFiles);
          fileSystem.saveConfig(gistConfig);
          fileSystem.markSaved?.();
        } else {
          fileSystem.saveConfig(
            stampGistMetadata(fileSystem.config, {
              id: gistId,
              updatedAt: gist.updated_at,
              fetchedAt: new Date().toISOString(),
            }),
          );
        }
      } else {
        const dirtyMessage = fileSystem.hasUnsavedChanges.value
          ? "You have unsaved local changes."
          : "This will replace the current project files.";
        const shouldReplace = confirm(
          `A gist ID is present. ${dirtyMessage} Overwrite current project with gist contents?`,
        );
        if (shouldReplace) {
          fileSystem.socket.send(
            JSON.stringify({
              type: "replace-project",
              config: gistConfig,
              files: gistFiles,
            }),
          );
        }
      }
    } catch (err) {
      triggerToast('error', 'Gist Error', err.message);
    }
  }

  function handleMessage(message) {
    if (message.type === "prompt-auth-token") {
      isPublishingGist.value = false;
      pendingAuthAction = message.action;
      showAuthPrompt.value = true;
    } else if (message.type === "gist-published") {
      isPublishingGist.value = false;
      publishedGistData.value = {
        id: message.gistId,
        url: message.url,
        editorUrl: `https://explosion-scratch.github.io/pen?gistId=${message.gistId}`
      };
    } else if (message.type === "toast-error" && isPublishingGist.value) {
      if (message.message?.toLowerCase().includes("gist") || message.name?.toLowerCase().includes("gist")) {
        isPublishingGist.value = false;
      }
    }
  }

  function setupGistListeners() {
    onMounted(() => {
      fileSystem.on(handleMessage);
    });

    onUnmounted(() => {
      fileSystem.off(handleMessage);
    });
  }

  function publishGist() {
    if (fileSystem.isVirtual.value) {
       pendingAuthAction = 'publish-gist';
       showAuthPrompt.value = true;
    } else {
       isPublishingGist.value = true;
       fileSystem.socket.send(JSON.stringify({ type: "publish-gist", isPublic: isPublicGist.value }));
    }
  }

  function updateGist() {
    if (fileSystem.isVirtual.value) {
       pendingAuthAction = 'update-gist';
       showAuthPrompt.value = true;
    } else {
       isPublishingGist.value = true;
       fileSystem.socket.send(JSON.stringify({ type: "update-gist" }));
    }
  }

  async function revertGist() {
    const gistId = new URLSearchParams(window.location.search).get('gistId');
    if (!gistId || !confirm("Revert to the original gist files? Unsaved changes will be lost.")) return;
    
    try {
      const gist = await fetchGistApi(gistId);
      let gistFiles = Object.fromEntries(
        Object.entries(gist.files).map(([k, v]) => [k, v.content])
      );
      
      let gistConfig = { name: `Gist ${gistId}`, editors: [], gistId };
      if (gistFiles['.pen.config.json']) {
        try { 
          Object.assign(gistConfig, JSON.parse(gistFiles['.pen.config.json'])); 
          delete gistFiles['.pen.config.json'];
          gistFiles = restoreMissingGistFiles(gistConfig, gistFiles);
        } catch (e) {}
      }
      
      gistConfig = stampGistMetadata(gistConfig, {
        id: gistId,
        updatedAt: gist.updated_at,
        fetchedAt: new Date().toISOString(),
      });

      setConfig(gistConfig, true);
      setAllFiles(gistFiles);
      if (fileSystem.isVirtual.value) {
        fileSystem.markSaved?.();
        fileSystem.saveConfig(gistConfig);
      } else if (fileSystem.socket && fileSystem.socket.readyState === WebSocket.OPEN) {
        fileSystem.socket.send(
          JSON.stringify({
            type: "replace-project",
            config: gistConfig,
            files: gistFiles,
          }),
        );
      }
      triggerToast('success', 'Reverted', 'Successfully reverted to gist.');
    } catch(err) {
      triggerToast('error', 'Revert Failed', err.message);
    }
  }

  return {
    initGist,
    setupGistListeners,
    publishGist,
    updateGist,
    revertGist
  }
}
