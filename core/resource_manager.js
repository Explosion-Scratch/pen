/**
 * Handles collecting and sorting scripts and styles for the preview document.
 */
export class ResourceManager {
  constructor() {
    this.resources = [];
  }

  /**
   * Add a resource configuration.
   * @param {Object} config
   * @param {string} config.type 'script' | 'style' | 'link'
   * @param {number} [config.priority=10]
   * @param {string} [config.id] Unique identifier to prevent duplicates
   * @param {string} [config.src] URL for scripts
   * @param {string} [config.href] URL for links/styles
   * @param {string} [config.srcString] Inline content
   * @param {string} [config.injectTo='head'] Target selector
   * @param {string} [config.injectPosition='beforeend'] beforebegin, afterbegin, beforeend, afterend
   * @param {Object} [config.attrs] Additional HTML attributes
   */
  add(config) {
    if (config.id) {
      const existingIdx = this.resources.findIndex(r => r.id === config.id);
      if (existingIdx !== -1) {
        // Update existing if new priority is higher (lower number) or just ignore?
        // Usually, we want to allow overrides.
        this.resources[existingIdx] = { ...this.resources[existingIdx], ...config };
        return;
      }
    }
    
    this.resources.push({
      priority: 10,
      injectTo: 'head',
      injectPosition: 'beforeend',
      ...config
    });
  }

  /**
   * Returns all resources sorted by priority (ascending).
   * @returns {Object[]}
   */
  getAllSorted() {
    return [...this.resources].sort((a, b) => (a.priority || 10) - (b.priority || 10));
  }
}
