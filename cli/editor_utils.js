import { execSync, spawn } from "child_process";

/** @type {{ id: string, name: string, command: string }[]} */
const KNOWN_EDITORS = [
  { id: "vscode", name: "VS Code", command: "code" },
  { id: "vscode-insiders", name: "VS Code Insiders", command: "code-insiders" },
  { id: "cursor", name: "Cursor", command: "cursor" },
  { id: "windsurf", name: "Windsurf", command: "windsurf" },
  { id: "zed", name: "Zed", command: "zed" },
  { id: "intellij", name: "IntelliJ IDEA", command: "idea" },
  { id: "xcode", name: "Xcode", command: "xed" },
  { id: "antigravity", name: "Antigravity", command: "antigravity" },
];

/**
 * Resolves the full PATH by spawning a login shell.
 * This picks up editors installed via brew, nix, etc.
 * whose PATH entries live in .zshrc/.bash_profile.
 * @returns {string}
 */
function getFullPath() {
  try {
    const shell = process.env.SHELL || "/bin/sh";
    const loginPath = execSync(`${shell} -l -c 'printf "%s" "$PATH"'`, {
      timeout: 5000,
      encoding: "utf-8",
    }).trim();
    if (loginPath) {
      const existing = process.env.PATH || "";
      const merged = [...new Set([...existing.split(":"), ...loginPath.split(":")])].join(":");
      return merged;
    }
  } catch {}
  return process.env.PATH || "";
}

/**
 * Resolves an executable via `which`, using the full login shell PATH.
 * @param {string} cmd
 * @returns {string|null}
 */
function whichCommand(cmd) {
  try {
    const fullPath = getFullPath();
    return execSync(`which ${cmd}`, {
      timeout: 3000,
      encoding: "utf-8",
      env: { ...process.env, PATH: fullPath },
    }).trim();
  } catch {
    return null;
  }
}

/**
 * Detects which known editors are installed on the system.
 * @returns {string[]} Array of editor IDs
 */
export function detectInstalledEditors() {
  return KNOWN_EDITORS
    .filter((e) => whichCommand(e.command) !== null)
    .map((e) => e.id);
}

/**
 * Opens a project directory in the specified editor.
 * @param {string} editorId
 * @param {string} projectPath
 * @returns {{ success: boolean, error?: string }}
 */
export function openProjectInEditor(editorId, projectPath) {
  const editor = KNOWN_EDITORS.find((e) => e.id === editorId);
  if (!editor) return { success: false, error: `Unknown editor: ${editorId}` };

  const execPath = whichCommand(editor.command);
  if (!execPath) return { success: false, error: `${editor.name} not found in PATH` };

  try {
    const child = spawn(execPath, [projectPath], {
      detached: true,
      stdio: "ignore",
    });
    child.unref();
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
