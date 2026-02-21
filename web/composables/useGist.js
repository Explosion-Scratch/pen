import { ref, onMounted, onUnmounted } from 'vue';
import { fileSystem, fetchRemoteGist } from '../filesystem.js';
import { useFileSystem } from '../state_management.js';

// Global state for Gist UI
export const showAuthPrompt = ref(false);
export const githubToken = ref("");
export const isPublishingGist = ref(false);
export const publishedGistData = ref(null); // { id, url }
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
    const filesPayload = {};
    const { files, config, isVirtual, hasUnsavedChanges, persist, notify } = fileSystem;
    
    for (const [filename, content] of Object.entries(files)) {
      filesPayload[filename] = { content: content || " " }; // Gist API requires non-empty content
    }
    
    const configData = config.value || config;
    if (configData && Object.keys(configData).length > 0) {
      filesPayload['.pen.config.json'] = { content: JSON.stringify(configData, null, 2) };
    }

    let url = 'https://api.github.com/gists';
    let method = 'POST';

    let description = configData?.name || "Pen Project";
    const payload = {
      description,
      public: true,
      files: filesPayload
    };

    if (action === 'update-gist') {
      const gistId = configData?.gistId || new URLSearchParams(window.location.search).get('gistId');
      if (!gistId) throw new Error("No Gist ID found to update.");
      url = `https://api.github.com/gists/${gistId}`;
      method = 'PATCH';
    }

    const response = await fetch(url, {
      method,
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
      if (config.value) {
        config.value.gistId = data.id;
      } else if (config) {
        config.gistId = data.id;
      }
    }
    
    if (isVirtual?.value) {
        hasUnsavedChanges.value = false;
        if (persist) persist();
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
    const urlParams = new URLSearchParams(window.location.search);
    const gistId = urlParams.get('gistId');
    if (!gistId) return;
    
    if (confirm("Are you sure you want to revert to the original gist files? Unsaved local changes will be lost.")) {
      try {
        const gist = await fetchRemoteGist(gistId);
        const gistFiles = {};
        for (const [filename, fileObj] of Object.entries(gist.files)) {
          gistFiles[filename] = fileObj.content;
        }
        
        let gistConfig = { name: "Gist " + gistId, editors: [] };
        if (gistFiles['.pen.config.json']) {
          try { gistConfig = JSON.parse(gistFiles['.pen.config.json']); delete gistFiles['.pen.config.json']; } catch(e) {}
        }
        gistConfig.gistId = gistId;
        
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
  }

  return {
    initGist,
    setupGistListeners,
    publishGist,
    updateGist,
    revertGist
  }
}
