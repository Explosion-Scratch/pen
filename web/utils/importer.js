import JSZip from 'jszip';

/**
 * Handles importing Pen projects from ZIP files or portable editor exports (.html).
 */
export const importer = {
  /**
   * Processes a list of files (from an input change or drop event).
   * Filters for .zip and .html files.
   */
  async processFiles(files) {
    if (!files || !files.length) return null;

    const file = files[0];
    const name = file.name.toLowerCase();
    
    // Check if it's a folder selection (webkitRelativePath present and contains /)
    const isFolder = file.webkitRelativePath && file.webkitRelativePath.includes('/');

    if (isFolder) {
      return this.fromFolder(files);
    } else if (name.endsWith('.zip')) {
      return this.fromZip(file);
    } else if (name.endsWith('.html')) {
      return this.fromPortableHtml(file);
    }

    throw new Error('Only folders, .zip, or portable .html exports are supported for import.');
  },

  /**
   * Imports from a list of files representing a folder.
   */
  async fromFolder(filesList) {
    const files = {};
    for (const file of filesList) {
      const path = file.webkitRelativePath || file.name;
      // Skip hidden files/folders and node_modules
      if (path.includes('/.') || path.startsWith('.') || path.includes('/node_modules/')) continue;
      
      files[path] = await file.text();
    }

    // Try to find config
    const configPath = Object.keys(files).find(p => p.endsWith('.pen.config.json') || p.endsWith('pen.json'));
    let config = { 
      name: filesList[0]?.webkitRelativePath?.split('/')[0] || 'Imported Folder',
      editors: [] 
    };

    if (configPath) {
      try {
        config = { ...config, ...JSON.parse(files[configPath]) };
      } catch (e) {
        console.warn('Failed to parse config from folder', e);
      }
    }

    // Auto-detect editors if needed
    if (!config.editors || !config.editors.length) {
      const detected = [];
      for (const fname of Object.keys(files)) {
        const ext = fname.split('.').pop()?.toLowerCase();
        if (['html', 'js', 'css', 'vue', 'jsx', 'ts', 'tsx', 'scss', 'less'].includes(ext)) {
          let type = ext;
          if (ext === 'js') type = 'javascript';
          if (ext === 'ts') type = 'typescript';
          if (['scss', 'sass', 'less'].includes(ext)) type = 'scss';
          detected.push({ filename: fname, type });
        }
      }
      config.editors = detected.slice(0, 3);
    }

    return { files, config };
  },

  /**
   * Imports from a ZIP archive.
   * Expects 'pen.json' or '.pen.config.json' for configuration.
   */
  async fromZip(file) {
    const zip = await JSZip.loadAsync(file);
    const configFile = zip.file('pen.json') || zip.file('.pen.config.json');
    
    const files = {};
    for (const [path, zipEntry] of Object.entries(zip.files)) {
      if (zipEntry.dir || path === 'pen.json' || path === '.pen.config.json') continue;
      // Skip Mac OS metadata stuff
      if (path.startsWith('__MACOSX/') || path.includes('/.')) continue;
      
      files[path] = await zipEntry.async('string');
    }

    let config = { name: file.name.replace('.zip', ''), editors: [] };
    if (configFile) {
      try {
        config = JSON.parse(await configFile.async('string'));
      } catch (e) {
        console.warn('Failed to parse pen.json from zip', e);
      }
    }

    // Auto-detect editors if not specified
    if (!config.editors || !config.editors.length) {
      const detected = [];
      for (const fname of Object.keys(files)) {
        const ext = fname.split('.').pop()?.toLowerCase();
        if (['html', 'js', 'css', 'vue', 'jsx', 'ts', 'tsx'].includes(ext)) {
          let type = ext;
          if (ext === 'js') type = 'javascript';
          if (ext === 'ts') type = 'typescript';
          detected.push({ filename: fname, type });
        }
      }
      config.editors = detected.slice(0, 3);
    }

    return { files, config };
  },

  /**
   * Imports from a portable HTML editor export.
   * Handles the double-encoding used in exports: 
   * JSON.parse(decodeURIComponent("...encoded JSON..."))
   */
  async fromPortableHtml(file) {
    const html = await file.text();
    
    // The export uses: window.__initial_file_map__ = JSON.parse(decodeURIComponent("..."))
    // We need to find the content inside the decodeURIComponent("...")
    
    const fileMapMatch = html.match(/window\.__initial_file_map__\s*=\s*JSON\.parse\(decodeURIComponent\((["'])(.*?)\1\)\)/);
    const configMatch = html.match(/window\.__initial_config__\s*=\s*JSON\.parse\(decodeURIComponent\((["'])(.*?)\1\)\)/);

    if (!fileMapMatch || !configMatch) {
      // Fallback to old format just in case
      const legacyFileMap = html.match(/window\.__initial_file_map__\s*=\s*([^;]+);/);
      const legacyConfig = html.match(/window\.__initial_config__\s*=\s*([^;]+);/);
      
      if (legacyFileMap && legacyConfig) {
        try {
          return {
            files: JSON.parse(legacyFileMap[1]),
            config: JSON.parse(legacyConfig[1])
          };
        } catch (e) {}
      }
      
      throw new Error('Invalid portable HTML: Could not find project data.');
    }

    try {
      const files = JSON.parse(decodeURIComponent(fileMapMatch[2]));
      const config = JSON.parse(decodeURIComponent(configMatch[2]));
      return { files, config };
    } catch (e) {
      console.error('Import Error:', e);
      throw new Error('Failed to parse embedded project data. It might be corrupted.');
    }
  }
};
