import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function getGistAuthToken() {
  try {
    const { stdout } = await execAsync("gh auth token");
    if (stdout) {
      return stdout.trim();
    }
  } catch (e) {
    // Ignore errors, gh probably not installed or not authed
  }
  return null;
}

export class AuthRequiredError extends Error {
  constructor(message = "GitHub authentication token is required.") {
    super(message);
    this.name = "AuthRequiredError";
  }
}

import { fetchGistApi, publishGistApi, updateGistApi, normalizeGistPayload } from "../core/gist_api.js";

export async function publishGist(files, description, isPublic = false, customToken = null) {
  const token = customToken || await getGistAuthToken();
  if (!token) {
    throw new AuthRequiredError();
  }

  const payload = normalizeGistPayload(files, description, true, isPublic);
  return await publishGistApi(token, payload);
}

export async function updateGist(gistId, files, description, customToken = null) {
  const token = customToken || await getGistAuthToken();
  if (!token) {
    throw new AuthRequiredError();
  }

  const existingGist = await fetchGist(gistId, token);
  const gistFiles = { ...files };
  
  if (existingGist.files) {
    for (const filename of Object.keys(existingGist.files)) {
      if (!(filename in files)) {
        gistFiles[filename] = null;
      }
    }
  }

  const payload = normalizeGistPayload(gistFiles, description, false);
  return await updateGistApi(token, gistId, payload);
}

export async function fetchGist(gistId, token = null) {
  return await fetchGistApi(gistId, token);
}
