/**
 * Simplified DevToolsManager — matches the Solid Playground pattern.
 *
 * Pure message relay between preview iframe <-> DevTools iframe.
 * The re-enable sequence (Page.frameNavigated, CSS.enable, DOM.enable, etc.)
 * is handled inside the preview iframe itself, triggered by the 'LOADED'
 * event we send on iframe load.
 */
export class DevToolsManager {
  constructor(getFileSystem, getIframe, getDevToolsIframe) {
    this.getFileSystem = getFileSystem;
    this.getIframe = getIframe;
    this.getDevToolsIframe = getDevToolsIframe;
    this.scriptIdToFilename = new Map();
    this.devtoolsLoaded = false;

    this.handleMessage = this.handleMessage.bind(this);
  }

  handleMessage(event) {
    const iframe = this.getIframe();
    const devtoolsIframe = this.getDevToolsIframe();

    // Messages from preview iframe -> forward to DevTools iframe
    if (event.source === iframe?.contentWindow) {
      if (typeof event.data === "string") {
        // Track scripts for source editing
        try {
          const msg = JSON.parse(event.data);
          if (msg.method === "Debugger.scriptParsed") {
            const { scriptId, url } = msg.params;
            if (url && !url.startsWith("http") && !url.startsWith("blob:")) {
              this.scriptIdToFilename.set(scriptId, url);
            }
          }
        } catch {}
        devtoolsIframe?.contentWindow?.postMessage(event.data, "*");
      }
    }

    // Messages from DevTools iframe -> forward to preview iframe
    if (event.source === devtoolsIframe?.contentWindow) {
      if (typeof event.data === "string") {
        // Handle source editing
        try {
          const msg = JSON.parse(event.data);
          if (msg.method === "Debugger.setScriptSource") {
            const { scriptId, scriptSource } = msg.params;
            const filename = this.scriptIdToFilename.get(scriptId);
            if (filename) {
              const { updateFile } = this.getFileSystem();
              updateFile(filename, scriptSource);
            }
          }
        } catch {}
        iframe?.contentWindow?.postMessage({ event: "DEV", data: event.data }, "*");
      }
    }
  }

  /**
   * Called when the preview iframe loads. Sends 'LOADED' to trigger
   * the re-enable sequence inside the iframe (CSS.enable, DOM.enable, etc.)
   */
  onIframeLoad() {
    const iframe = this.getIframe();
    if (!iframe?.contentWindow) return;
    if (this.devtoolsLoaded) {
      iframe.contentWindow.postMessage({ event: "LOADED" }, "*");
    }
  }

  onDevtoolsLoad() {
    this.devtoolsLoaded = true;
    // If the preview iframe is already loaded, send LOADED now
    const iframe = this.getIframe();
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage({ event: "LOADED" }, "*");
    }
  }

  clear() {
    this.scriptIdToFilename.clear();
    this.devtoolsLoaded = false;
  }
}
