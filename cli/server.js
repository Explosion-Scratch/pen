import { WebSocketServer } from "ws";
import express from "express";
import {
  readFileSync,
  writeFileSync,
  existsSync,
  unlinkSync,
  renameSync,
  promises as fs,
} from "fs";
import { join, resolve } from "path";
import { fileURLToPath } from "url";
import open from "open";
import { getAdapter, getAllAdapters } from "../core/adapter_registry.js";
import { loadAllProjectTemplates } from "../core/project_templates.js";
import { startPreviewServer } from "./project_initializer.js";
import { findAvailablePorts } from "./port_utils.js";
import { detectInstalledEditors, openProjectInEditor } from "./editor_utils.js";
import { createBox } from "./box_util.js";
import chalk from "chalk";
import chokidar from "chokidar";

const CONFIG_FILENAME = ".pen.config.json";

export async function launchEditorFlow(projectPath, options = {}) {
  const configPath = join(projectPath, CONFIG_FILENAME);
  const config = JSON.parse(readFileSync(configPath, "utf-8"));
  
  const preferredHttp = options.port ? parseInt(options.port) : 3000;
  const host = options.host || 'localhost';

  const [httpPort, wsPort, previewPort] = await findAvailablePorts(
    [preferredHttp, preferredHttp + 1, preferredHttp + 2],
    host
  );

  const clients = new Set();
  let fileMap = {};

  for (const editor of config.editors) {
    const filePath = join(projectPath, editor.filename);
    if (existsSync(filePath))
      fileMap[editor.filename] = readFileSync(filePath, "utf-8");
  }

  function stableStringify(value) {
    if (value === null || typeof value !== "object") return JSON.stringify(value);
    if (Array.isArray(value)) {
      return `[${value.map((item) => stableStringify(item)).join(",")}]`;
    }
    const keys = Object.keys(value).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(",")}}`;
  }

  function stateSignature(nextConfig, nextFiles) {
    return stableStringify({
      config: nextConfig,
      files: Object.fromEntries(
        Object.keys(nextFiles)
          .sort()
          .map((k) => [k, nextFiles[k]]),
      ),
    });
  }

  function replaceFileMap(nextFiles) {
    for (const key of Object.keys(fileMap)) delete fileMap[key];
    Object.assign(fileMap, nextFiles);
  }

  const INTERNAL_WRITE_WINDOW_MS = 1500;
  const internalWriteUntil = new Map();
  function markInternalWrite(filePath) {
    internalWriteUntil.set(filePath, Date.now() + INTERNAL_WRITE_WINDOW_MS);
  }
  function isInternalWrite(filePath) {
    const until = internalWriteUntil.get(filePath) || 0;
    return until > Date.now();
  }
  async function writeProjectFile(filename, content) {
    const target = join(projectPath, filename);
    markInternalWrite(target);
    await fs.writeFile(target, content);
  }
  function writeProjectConfig() {
    markInternalWrite(configPath);
    writeFileSync(configPath, JSON.stringify(config, null, 2));
  }

  let latestStateSig = stateSignature(config, fileMap);

  // Broadcast to all connected clients
  const broadcast = (msg) => {
    const data = JSON.stringify(msg);
    for (const c of clients) if (c.readyState === 1) c.send(data);
  };

  let previewDisplayUrl = "";
  try {
    const { port, host: previewHost } = await startPreviewServer(projectPath, { 
      prod: false, 
      port: previewPort,
      host
    });
    previewDisplayUrl = `http://${previewHost}:${port}/`;
  } catch (e) {
    console.error("Failed to start preview server:", e);
  }

  const wss = new WebSocketServer({ port: wsPort, host });

  async function syncFromLocalFilesystem() {
    if (!existsSync(configPath)) return;
    let diskConfig;
    try {
      diskConfig = JSON.parse(readFileSync(configPath, "utf-8"));
    } catch {
      return;
    }
    const diskFiles = {};
    for (const editor of diskConfig.editors || []) {
      const filePath = join(projectPath, editor.filename);
      if (existsSync(filePath)) {
        diskFiles[editor.filename] = readFileSync(filePath, "utf-8");
      } else {
        diskFiles[editor.filename] = "";
      }
    }
    const nextSig = stateSignature(diskConfig, diskFiles);
    if (nextSig === latestStateSig) return;

    for (const key of Object.keys(config)) delete config[key];
    Object.assign(config, diskConfig);
    replaceFileMap(diskFiles);
    latestStateSig = nextSig;

    broadcast({
      type: "reinit",
      origin: "external-fs",
      config,
      rootPath: projectPath.replace(process.env.HOME, "~"),
      files: fileMap,
      adapters: getAllAdapters(),
      previewServerUrl: previewDisplayUrl,
    });
  }

  let externalSyncTimer = null;
  const fsWatcher = chokidar.watch(projectPath, {
    persistent: true,
    ignoreInitial: true,
    depth: 1,
    awaitWriteFinish: { stabilityThreshold: 150, pollInterval: 50 },
  });
  fsWatcher.on("all", (_event, changedPath) => {
    if (isInternalWrite(changedPath)) return;
    if (externalSyncTimer) clearTimeout(externalSyncTimer);
    externalSyncTimer = setTimeout(async () => {
      await syncFromLocalFilesystem();
    }, 250);
  });

  wss.on("connection", (ws) => {
    clients.add(ws);
    if (!options.headless) console.log(" Client connected");

    // Send initial state to client
    const displayPath = projectPath.replace(process.env.HOME, "~");

    ws.send(
      JSON.stringify({
        type: "init",
        config,
        rootPath: displayPath,
        files: fileMap,
        adapters: getAllAdapters(),
        previewServerUrl: previewDisplayUrl,
      }),
    );

    ws.on("message", async (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        await handleMessage(ws, msg);
      } catch (err) {
        console.error("WebSocket error:", err);
      }
    });

    async function handleMessage(ws, msg) {
      switch (msg.type) {
        case "update": {
          fileMap[msg.filename] = msg.content;
          try {
            await writeProjectFile(msg.filename, msg.content);
            latestStateSig = stateSignature(config, fileMap);
            ws.send(
              JSON.stringify({ type: "update-ack", filename: msg.filename }),
            );
          } catch (err) {
            console.error(`Write failed ${msg.filename}:`, err);
            ws.send(
              JSON.stringify({
                type: "toast-error",
                name: "Save Failed",
                title: "Save Failed",
                message: `Could not save ${msg.filename}.`,
              }),
            );
          }
          break;
        }

        case "rename": {
          const { oldFilename, newFilename, newType, allowOverwrite } = msg;
          const oldPath = join(projectPath, oldFilename);
          const newPath = join(projectPath, newFilename);
          const hasTargetConflict =
            oldFilename !== newFilename &&
            (existsSync(newPath) || fileMap[newFilename] !== undefined);

          if (hasTargetConflict && !allowOverwrite) {
            ws.send(
              JSON.stringify({
                type: "toast-error",
                name: "Rename Failed",
                title: "Rename Failed",
                message: `A file named "${newFilename}" already exists.`,
              }),
            );
            break;
          }

          if (oldPath !== newPath && existsSync(oldPath)) {
            try {
              renameSync(oldPath, newPath);
            } catch (e) {
              console.error(
                `Rename failed: ${oldFilename} -> ${newFilename}`,
                e,
              );
            }
          }

          const editor = config.editors.find((e) => e.filename === oldFilename);
          if (editor) {
            editor.filename = newFilename;
            editor.type = newType;
            writeProjectConfig();
          }

          if (oldFilename !== newFilename) {
            fileMap[newFilename] = fileMap[oldFilename];
            delete fileMap[oldFilename];
          }

          console.log(
            `  Renamed: ${oldFilename} -> ${newFilename} (${newType})`,
          );

          broadcast({
            type: "reinit",
            config,
            files: fileMap,
            adapters: getAllAdapters(),
            previewServerUrl: previewDisplayUrl,
          });
          latestStateSig = stateSignature(config, fileMap);
          break;
        }

        case "delete": {
          const { filename } = msg;
          const filePath = join(projectPath, filename);
          if (existsSync(filePath)) {
            try {
              unlinkSync(filePath);
            } catch (e) {}
          }
          const index = config.editors.findIndex(
            (e) => e.filename === filename,
          );
          if (index !== -1) {
            config.editors.splice(index, 1);
            writeProjectConfig();
          }
          delete fileMap[filename];

          console.log(`  Deleted: ${filename}`);

          broadcast({
            type: "reinit",
            config,
            files: fileMap,
            adapters: getAllAdapters(),
            previewServerUrl: previewDisplayUrl,
          });
          latestStateSig = stateSignature(config, fileMap);
          break;
        }

        case "editor-settings": {
          const editor = config.editors.find(
            (e) => e.filename === msg.filename,
          );
          if (editor) {
            editor.settings = msg.settings;
            writeProjectConfig();
            console.log(`  Settings: ${msg.filename}`);
          }
          latestStateSig = stateSignature(config, fileMap);
          break;
        }

        case "save": {
          if (msg.files) {
            const writes = Object.entries(msg.files).map(([fn, c]) => {
              fileMap[fn] = c;
              return writeProjectFile(fn, c);
            });
            try {
              await Promise.all(writes);
              latestStateSig = stateSignature(config, fileMap);
              ws.send(JSON.stringify({ type: "save-ack" }));
            } catch (err) {
              console.error("Bulk save error:", err);
              ws.send(
                JSON.stringify({
                  type: "toast-error",
                  name: "Save Failed",
                  title: "Save Failed",
                  message: "Could not save all project files.",
                }),
              );
            }
          }
          break;
        }

        case "replace-project": {
          const incomingConfig = msg.config;
          const incomingFiles = msg.files || {};
          if (!incomingConfig || typeof incomingConfig !== "object") break;

          const oldFiles = Object.keys(fileMap);
          const newFiles = Object.keys(incomingFiles);
          const filesToDelete = oldFiles.filter((fn) => !newFiles.includes(fn));

          for (const fn of filesToDelete) {
            delete fileMap[fn];
            const oldPath = join(projectPath, fn);
            if (existsSync(oldPath)) {
              try {
                unlinkSync(oldPath);
              } catch (e) {}
            }
          }

          for (const fn of oldFiles) {
            if (!filesToDelete.includes(fn)) delete fileMap[fn];
          }

          for (const [fn, c] of Object.entries(incomingFiles)) {
            fileMap[fn] = c;
            await writeProjectFile(fn, c);
          }

          for (const key of Object.keys(config)) delete config[key];
          Object.assign(config, incomingConfig);
          writeProjectConfig();

          broadcast({
            type: "reinit",
            config,
            files: fileMap,
            rootPath: projectPath.replace(process.env.HOME, "~"),
            adapters: getAllAdapters(),
            previewServerUrl: previewDisplayUrl,
          });
          latestStateSig = stateSignature(config, fileMap);
          break;
        }

        case "start-template": {
          const { loadProjectTemplate } =
            await import("../core/project_templates.js");
          const template = await loadProjectTemplate(msg.templateId);
          if (!template) break;

          const oldFiles = Object.keys(fileMap);
          const newConfig = { ...template.config, name: config.name };

          for (const key of Object.keys(config)) delete config[key];
          Object.assign(config, newConfig);

          for (const fn of oldFiles) {
            delete fileMap[fn];
            const oldPath = join(projectPath, fn);
            if (!template.files?.[fn] && existsSync(oldPath)) {
              try {
                unlinkSync(oldPath);
              } catch (e) {}
            }
          }

          if (template.files) {
            for (const [fn, content] of Object.entries(template.files)) {
              fileMap[fn] = content;
              await writeProjectFile(fn, content);
            }
          }

          writeProjectConfig();
          console.log(`  Project reset to template: ${msg.templateId}`);

          broadcast({
            type: "reinit",
            config,
            rootPath: projectPath.replace(process.env.HOME, "~"),
            files: fileMap,
            adapters: getAllAdapters(),
            previewServerUrl: previewDisplayUrl,
          });
          latestStateSig = stateSignature(config, fileMap);
          break;
        }

        case "save-config": {
          if (msg.config && typeof msg.config === "object") {
            Object.assign(config, msg.config);
            writeProjectConfig();
            console.log("  Config saved");
            latestStateSig = stateSignature(config, fileMap);
            ws.send(JSON.stringify({ type: "config-saved" }));
          }
          break;
        }

        case "publish-gist":
        case "update-gist": {
          try {
            const { publishGist, updateGist } = await import("./gist_utils.js");
            // Include config in the files published so we can reconstruct the project
            const fileMapWithConfig = { ...fileMap, [CONFIG_FILENAME]: readFileSync(configPath, 'utf-8') };
            let result;

            if (msg.type === "update-gist") {
              if (!config.gistId) throw new Error("No gist ID found in config.");
              result = await updateGist(config.gistId, fileMapWithConfig, config.name, msg.token);
              console.log("  Successfully updated gist!");
              ws.send(JSON.stringify({ type: "toast-success", title: "Gist Updated", message: "Successfully updated gist!" }));
            } else {
              result = await publishGist(fileMapWithConfig, config.name, msg.isPublic || false, msg.token);
              config.gistId = result.id;
              writeProjectConfig();
              console.log("  Successfully created gist!");
              
              broadcast({
                type: "reinit",
                config,
                files: fileMap,
                adapters: getAllAdapters(),
                previewServerUrl: previewDisplayUrl,
              });
              
              ws.send(JSON.stringify({ type: "toast-success", title: "Gist Published", message: "Successfully published gist!" }));
            }
            latestStateSig = stateSignature(config, fileMap);
            
            ws.send(JSON.stringify({ type: "gist-published", gistId: result.id, url: result.html_url }));
          } catch (error) {
            if (error.name === "AuthRequiredError" || error.message.includes("authentication token is required")) {
              ws.send(JSON.stringify({ type: "prompt-auth-token", action: msg.type }));
            } else {
              console.error(`  Gist error: ${error.message}`);
              ws.send(JSON.stringify({ type: "toast-error", name: "Gist Error", message: error.message }));
            }
          }
          break;
        }

        case "import-folder": {
          const folderPath = msg.folderPath;
          if (!folderPath || !existsSync(folderPath)) {
            ws.send(
              JSON.stringify({
                type: "import-error",
                message: "Invalid folder path",
              }),
            );
            break;
          }

          const configPath = join(folderPath, CONFIG_FILENAME);
          if (!existsSync(configPath)) {
            ws.send(
              JSON.stringify({
                type: "import-error",
                message: "No .pen.config.json found in folder",
              }),
            );
            break;
          }

          try {
            const newConfig = JSON.parse(readFileSync(configPath, "utf-8"));
            const entries = await fs.readdir(folderPath, {
              withFileTypes: true,
            });
            const newFileMap = {};

            for (const entry of entries) {
              if (entry.isFile() && !entry.name.startsWith(".")) {
                const filePath = join(folderPath, entry.name);
                newFileMap[entry.name] = readFileSync(filePath, "utf-8");
              }
            }

            Object.assign(config, newConfig);
            Object.assign(fileMap, newFileMap);
            latestStateSig = stateSignature(config, fileMap);

            console.log(`  Imported folder: ${folderPath}`);

            broadcast({
              type: "reinit",
              config,
              rootPath: folderPath.replace(process.env.HOME, "~"),
              files: fileMap,
              adapters: getAllAdapters(),
              previewServerUrl: previewDisplayUrl,
            });
          } catch (err) {
            ws.send(
              JSON.stringify({ type: "import-error", message: err.message }),
            );
          }
          break;
        }

        case "detect-editors": {
          const editors = detectInstalledEditors();
          ws.send(JSON.stringify({ type: "editors-detected", editors }));
          if (process.env.DEBUG) {
            console.log(`  Detected editors: ${editors.join(", ") || "none"}`);
          }
          break;
        }

        case "open-in-editor": {
          const result = openProjectInEditor(msg.editorId, projectPath);
          if (result.success) {
            console.log(`  Opened project in: ${msg.editorId}`);
          } else {
            console.error(`  Failed to open in ${msg.editorId}: ${result.error}`);
            ws.send(JSON.stringify({
              type: "toast-error",
              name: "Open in Editor",
              message: result.error,
            }));
          }
          break;
        }
      }
    }

    ws.on("close", () => {
      clients.delete(ws);
      if (!options.headless) console.log(" Client disconnected");
    });
  });

  const __dirname = fileURLToPath(new URL(".", import.meta.url));
  const distPath = resolve(__dirname, "../dist");

  const app = express();
  app.use(express.json());

  app.get("/api/config", (_, res) =>
    res.json({
      ...config,
      rootPath: projectPath.replace(process.env.HOME, "~"),
      previewServerUrl: previewDisplayUrl,
    }),
  );
  app.get("/api/files", (_, res) => res.json(fileMap));
  app.get("/api/templates", async (_, res) => {
    const templates = (await loadAllProjectTemplates()).map(
      ({ id, title, description, icon, config: c }) => ({
        id,
        title,
        description,
        icon,
      }),
    );
    res.json(templates);
  });
  app.get("/api/adapters", (_, res) => {
    res.json(getAllAdapters());
  });

  if (existsSync(distPath)) {
    app.use(express.static(distPath));
    // Fallback for SPA
    app.get("*", (_, res) => res.sendFile(join(distPath, "index.html")));
  } else {
    app.get("/", (_, res) =>
      res.send(
        `<!DOCTYPE html><html><head><title>Pen Editor</title><script type="module" src="http://localhost:5173/@vite/client"></script><script type="module" src="http://localhost:5173/main.js"></script></head><body><div id="app"></div></body></html>`,
      ),
    );
  }

  app.listen(httpPort, host, () => {
    if (options.headless) {
      console.log(`\n${chalk.bold("Pen Services (Headless)")}\n`);
      console.log(`   API:     http://${host}:${httpPort}`);
      console.log(`   WS:      ws://${host}:${wsPort}`);
      console.log(
        `   Preview: http://${host}:${previewPort} (Hosted by Client/Static)\n`,
      );
    } else {
      const editorUrl = `http://${host}:${httpPort}`;
      const wsUrl = `ws://${host}:${wsPort}`;
      
      const serverInfo = `Editor:  ${chalk.cyan(editorUrl)}\nWS:      ${chalk.cyan(wsUrl)}`;
      
      console.log(`\n${chalk.bold("  Pen Editor")}\n`);
      console.log(createBox(serverInfo, 2));
      console.log(`\n  Press Ctrl+C to stop.\n`);

      open(editorUrl);
    }
  });
}
