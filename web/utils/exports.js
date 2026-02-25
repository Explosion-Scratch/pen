import JSZip from 'jszip'
import { executeSequentialRender } from '../../core/pipeline_processor.js'

function triggerDownload(url, filename) {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

function downloadFile(blob, filename) {
  try {
    const url = URL.createObjectURL(blob)
    triggerDownload(url, filename)
    setTimeout(() => URL.revokeObjectURL(url), 100)
  } catch (err) {
    console.warn('URL.createObjectURL failed, falling back to data URI', err)
    const reader = new FileReader()
    reader.onload = (e) => triggerDownload(e.target.result, filename)
    reader.readAsDataURL(blob)
  }
}export async function exportAsZip(files, config, filename) {
  try {
    const zip = new JSZip()
    
    // Add all files
    for (const [path, content] of Object.entries(files)) {
      zip.file(path, content)
    }
    
    // Add config
    zip.file('pen.json', JSON.stringify(config, null, 2))
    
    const content = await zip.generateAsync({ type: 'blob' })
    downloadFile(content, filename || `${config.name || 'project'}.zip`)
  } catch (err) {
    console.error('Export Zip error:', err)
    throw err
  }
}

export async function exportProject(files, config) {
  try {
    const { html } = await executeSequentialRender({ ...files }, { ...config }, { dev: false })
    const blob = new Blob([html], { type: 'text/html' })
    downloadFile(blob, `${config.name || 'pen-project'}.html`)
  } catch (err) {
    console.error('Export error:', err)
    throw err
  }
}

export async function exportEditor(files, config) {
  try {
    let html;
    try {
      const response = await fetch(window.location.href);
      html = await response.text();
    } catch {
      html = "<!DOCTYPE html>\n" + document.documentElement.outerHTML;
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    doc.querySelectorAll("script").forEach((s) => {
      const text = s.textContent.trim();
      if (
        text.includes("window.__initial_file_map__") &&
        text.includes("window.__initial_config__") &&
        !s.src &&
        !s.type
      ) {
        s.remove();
      }
    });
    html = "<!DOCTYPE html>\n" + doc.documentElement.outerHTML;

    const enc = (a) => JSON.stringify(encodeURIComponent(JSON.stringify(a)));
    const dec = (a) => `JSON.parse(decodeURIComponent(${a}))`;

    const inject = `
  <script>
    window.__initial_file_map__ = ${dec(enc(files))};
    window.__initial_config__ = ${dec(enc(config))};
  <\/script>`;

    if (html.includes("<head>")) {
      html = html.replace("<head>", "<head>" + inject);
    } else {
      html = inject + html;
    }

    const blob = new Blob([html], { type: "text/html" });
    downloadFile(blob, `${config.name || "pen-editor"}-portable.html`);
  } catch (err) {
    console.error("Export Editor error:", err);
    throw err;
  }
}
