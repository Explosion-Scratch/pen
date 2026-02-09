# Pen

A CodePen-like editor for local development with live preview and preprocessing support.

## Features

- 🎨 **Multiple Editor Types**: HTML, Pug, Slim, CSS, SASS, LESS, Stylus, JavaScript, TypeScript
- ⚡ **Live Preview**: See changes instantly as you type
- 🔄 **File Sync**: Changes sync between external editors and the web UI
- 📦 **CDN Imports**: NPM imports are automatically transformed to Skypack CDN URLs
- 🎯 **Preprocessing**: SASS, LESS, Stylus, and TypeScript compile on the fly
- ✨ **Beautiful Design**: Warm, minimal aesthetic with Maple Mono font

## Installation

```bash
bun install
bun link
```

## Usage

### Create a New Project

Run `pen` in an empty directory to create a new project interactively:

```bash
mkdir my-project
cd my-project
pen
```

This will prompt you to:
1. Enter a project name
2. Choose your markup language (HTML, Pug, Slim)
3. Choose your styling tool (CSS, SASS, LESS, Stylus)
4. Choose your scripting tool (JavaScript, TypeScript)

### Launch the Editor

If you're already in a Pen project directory (has `.pen.config.json`), simply run:

```bash
pen
```

This opens the web editor in your browser with:
- Resizable editor panes for each file
- Live preview panel
- Syntax highlighting with custom warm theme
- File watching for external edits

### Configure Project

Modify your project settings interactively:

```bash
pen configure
```

Options include:
- Add/remove editors
- Change filenames
- Toggle Normalize.css
- Manage global CDN links

### Production Preview

Build and preview the compiled output:

```bash
pen serve
```

## Project Structure

```
my-project/
├── .pen.config.json    # Project configuration
├── index.html          # HTML markup
├── style.scss          # Styles (or .css, .less, .styl)
└── script.js           # JavaScript (or .ts)
```

## Configuration

The `.pen.config.json` file controls your project:

```json
{
  "name": "My Project",
  "version": "1.0.0",
  "editors": [
    { "type": "html", "filename": "index.html" },
    { "type": "sass", "filename": "style.scss", "settings": { "normalize": true } },
    { "type": "javascript", "filename": "script.js" }
  ],
  "globalResources": {
    "scripts": [],
    "styles": []
  }
}
```

## Adapters

### Markup
- **HTML**: Standard HTML with beautify/minify
- **Pug**: Compiles Pug to HTML
- **Slim**: Compiles Slim-like syntax to HTML

### Styles
- **CSS**: Standard CSS with Normalize.css option
- **SASS/SCSS**: Compiles SCSS to CSS
- **LESS**: Compiles LESS to CSS
- **Stylus**: Compiles Stylus to CSS

### Scripts
- **JavaScript**: ES modules with CDN import transformation
- **TypeScript**: Transpiles TypeScript to JavaScript

## CDN Import Transformation

Write imports using package names:

```javascript
import { createApp } from 'vue'
import confetti from 'canvas-confetti'
```

They're automatically transformed to:

```javascript
import { createApp } from 'https://cdn.skypack.dev/vue'
import confetti from 'https://cdn.skypack.dev/canvas-confetti'
```

## Development

```bash
# Start the Vite dev server for the web UI
bun run dev

# Build for production
bun run build
```

## Design

The editor features a "Minimalist Library" aesthetic:
- **Background**: Warm cream (#FDFCFB)
- **Text**: Deep ink (#1A1A1A)
- **Accent**: Terra cotta (#C2410C)
- **Font**: Maple Mono for code, Source Serif Pro for UI
- **Icons**: Phosphor Duotone

## License

MIT
