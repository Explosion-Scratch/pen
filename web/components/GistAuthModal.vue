<template>
  <Teleport to="body">
    <!-- Loading Overlay -->
    <div v-if="isPublishingGist" class="modal-overlay gist-loading">
      <div class="loading-content">
        <i class="ph-duotone ph-cloud-arrow-up loading-icon"></i>
        <div class="loading-spinner"></div>
        <p>Publishing to Gist...</p>
      </div>
    </div>

    <!-- Success Modal -->
    <div v-else-if="publishedGistData" class="modal-overlay" @click.self="closeSuccessModal">
      <div class="modal auth-modal success-modal">
        <div class="success-header">
          <i class="ph-fill ph-check-circle success-icon"></i>
          <h3>Published Successfully</h3>
        </div>
        
        <div class="url-group">
          <label>Online Editor</label>
          <div class="url-box">
             <a :href="publishedGistData.editorUrl" target="_blank" title="Open Online Editor">{{ publishedGistData.editorUrl }}</a>
             <button class="icon-btn" @click="copyToClipboard(publishedGistData.editorUrl, 'editor')" title="Copy URL">
                <i :class="copied === 'editor' ? 'ph-bold ph-check text-success' : 'ph-duotone ph-copy'"></i>
             </button>
          </div>
        </div>

        <div class="url-group">
          <label>GitHub Gist</label>
          <div class="url-box">
             <a :href="publishedGistData.url" target="_blank" title="View on GitHub">{{ publishedGistData.url }}</a>
             <button class="icon-btn" @click="copyToClipboard(publishedGistData.url, 'gist')" title="Copy URL">
                <i :class="copied === 'gist' ? 'ph-bold ph-check text-success' : 'ph-duotone ph-copy'"></i>
             </button>
          </div>
        </div>

        <div class="modal-actions minimal-actions">
          <button @click="closeSuccessModal">Close</button>
        </div>
      </div>
    </div>

    <!-- Auth Prompt -->
    <div v-else-if="showAuthPrompt" class="modal-overlay" @click.self="closeAuthPrompt">
      <div class="modal auth-modal">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <h2 style="margin: 0; font-size: 16px;">GitHub Authentication</h2>
          <button class="icon-btn" @click="closeAuthPrompt" style="padding: 4px; margin-right: -4px;"><i class="ph-bold ph-x"></i></button>
        </div>
        <p style="margin-bottom: 16px;">Enter a Personal Access Token with the "gist" scope.</p>
        <input type="password" v-model="githubToken" placeholder="ghp_..." autofocus />
        <div class="modal-actions" style="margin-top: 0; margin-bottom: 4px;">
          <button class="primary" @click="submitAuthToken" :disabled="!githubToken" style="width: 100%; justify-content: center;">Submit Token</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref } from "vue";
import { 
  showAuthPrompt, 
  githubToken, 
  submitAuthToken, 
  closeAuthPrompt,
  isPublishingGist,
  publishedGistData,
  closeSuccessModal
} from "../composables/useGist.js";

const copied = ref(null);

const copyToClipboard = async (text, type) => {
  try {
    await navigator.clipboard.writeText(text);
    copied.value = type;
    setTimeout(() => {
      copied.value = null;
    }, 2000);
  } catch (err) {
    console.error('Failed to copy text', err);
  }
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 200ms ease;
  backdrop-filter: blur(2px);
}

.gist-loading {
  background: var(--color-background);
}

.loading-content {
  text-align: center;
  color: var(--color-text-muted);
}

.loading-icon {
  font-size: 48px;
  color: var(--color-accent);
  margin-bottom: 24px;
  display: block;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  margin: 0 auto 16px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.auth-modal {
  background: var(--color-surface);
  padding: 24px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  width: 400px;
  max-width: 90vw;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.auth-modal h2 {
  margin-bottom: 12px;
  color: var(--color-text);
  font-family: var(--font-serif);
}

.auth-modal p {
  color: var(--color-text-muted);
  font-size: 14px;
  margin-bottom: 20px;
  line-height: 1.5;
}

.auth-modal input {
  width: 100%;
  padding: 8px 10px;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text);
  margin-bottom: 16px;
  font-family: var(--font-mono);
  font-size: 13px;
}

.auth-modal input:focus {
  outline: none;
  border-color: var(--color-accent);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.modal-actions button {
  padding: 8px 16px;
  border-radius: var(--radius-md);
  font-weight: 500;
  cursor: pointer;
  border: 1px solid var(--color-border);
  background: var(--color-background);
  color: var(--color-text);
}

.modal-actions button.primary {
  background: var(--color-accent);
  color: #fff;
  border-color: var(--color-accent);
}

.modal-actions button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.success-modal {
  padding: 20px;
  width: 440px;
}

.success-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
}

.success-icon {
  color: var(--color-success);
  font-size: 20px;
}

.success-header h3 {
  font-size: 15px;
  font-weight: 500;
  margin: 0;
  color: var(--color-text);
  font-family: var(--font-sans);
}

.url-group {
  margin-bottom: 16px;
}

.url-group label {
  display: block;
  font-size: 11px;
  text-transform: uppercase;
  color: var(--color-text-muted);
  margin-bottom: 6px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.url-box {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 6px 8px 6px 12px;
}

.url-box a {
  flex: 1;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--color-text);
  text-decoration: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 0.2s;
}

.url-box a:hover {
  text-decoration: underline;
  color: var(--color-accent);
}

.icon-btn {
  background: transparent;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  padding: 6px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.icon-btn i {
  font-size: 16px;
}

.icon-btn:hover {
  background: var(--color-surface-hover);
  color: var(--color-text);
}

.text-success {
  color: var(--color-success) !important;
}

.minimal-actions {
  margin-top: 24px;
}

.minimal-actions button {
  width: 100%;
  justify-content: center;
}
</style>
