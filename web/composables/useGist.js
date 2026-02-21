import { ref, onMounted, onUnmounted } from 'vue';
import { fileSystem, fetchRemoteGist } from '../filesystem.js';
import { useFileSystem } from '../state_management.js';

export const showAuthPrompt = ref(false);
export const githubToken = ref("");
export const isPublishingGist = ref(false);
export const publishedGistData = ref(null);
let pendingAuthAction = null;

export function submitAuthToken() {
  if (!githubToken.value || !pendingAuthAction) return;
  isPublishingGist.value = true;
  if (fileSystem.isVirtual.value) {
    handlePortableGistAction(pendingAuthAction, githubToken.value);
  } else {
    fileSystem.socket.send(JSON.stringify({ 
      type: pendingAuthAction, 
      token: githubToken.value 
    }));
  }
  showAuthPrompt.value = false;
  githubToken.value = "";
  pendingAuthAction = null;
}

async function handlePortableGistAction(action, token) {
  try {
    isPublishingGist.value = true;
    const payload = {
      description: configData?.name || "Pen Project",
      public: true,
      files: Object.fromEntries(
        Object.entries(files).map(([k, v]) => [k, { content: v || " " }])
      )
    };
    
    if (configData && Object.keys(configData).length > 0) {
      payload.files['.pen.config.json'] = { content: JSON.stringify(configData, null, 2) };
    }

    const gistId = action === 'update-gist' ? (configData?.gistId || new URLSearchParams(window.location.search).get('gistId')) : null;
    if (action === 'update-gist' && !gistId) throw new Error("No Gist ID found to update.");

    const response = await fetch(`https://api.github.com/gists${gistId ? `/${gistId}` : ''}`, {
      method: gistId ? 'PATCH' : 'POST',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`GitHub API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (action === 'publish-gist') {
      configData.gistId = data.id;
    }
    
    if (fileSystem.isVirtual?.value) {
      fileSystem.hasUnsavedChanges.value = false;
      fileSystem.persist?.();
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
      const gist = await fetchRemoteGist(gistId);
      const gistFiles = {};
      for (const [filename, fileObj] of Object.entries(gist.files)) {
        gistFiles[filename] = fileObj.content;
      }

      let gistConfig = { name: "Gist " + gistId, editors: [] };
      if (gistFiles['.pen.config.json']) {
        try {
          gistConfig = JSON.parse(gistFiles['.pen.config.json']);
          delete gistFiles['.pen.config.json'];
        } catch(e) {}
      }
      gistConfig.gistId = gistId;

      if (fileSystem.isVirtual.value) {
        if (Object.keys(fileSystem.files).length === 0 || (Object.keys(fileSystem.files).length === 1 && Object.keys(fileSystem.files)[0] === 'index.html')) {
           setConfig(gistConfig, true);
           setAllFiles(gistFiles);
        }
      } else {
        const shouldReplace = confirm("A gist ID is present. Overwrite current project with gist contents? (This cannot be undone)");
        if (shouldReplace) {
           setConfig(gistConfig, false);
           setAllFiles(gistFiles, false);
           fileSystem.saveConfig(gistConfig);
           fileSystem.socket.send(JSON.stringify({ type: "save", files: gistFiles }));
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
       fileSystem.socket.send(JSON.stringify({ type: "publish-gist", isPublic: true }));
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
      const gist = await fetchRemoteGist(gistId);
      const gistFiles = Object.fromEntries(
        Object.entries(gist.files).map(([k, v]) => [k, v.content])
      );
      
      let gistConfig = { name: `Gist ${gistId}`, editors: [], gistId };
      if (gistFiles['.pen.config.json']) {
        try { Object.assign(gistConfig, JSON.parse(gistFiles['.pen.config.json'])); } catch (e) {}
        delete gistFiles['.pen.config.json'];
      }
      
      setConfig(gistConfig, true);
      setAllFiles(gistFiles);
      if (fileSystem.isVirtual.value) {
        fileSystem.hasUnsavedChanges.value = false;
        fileSystem.persist();
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
