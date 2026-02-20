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

function normalizeFilesForGist(files) {
  const gistFiles = {};
  for (const [filename, content] of Object.entries(files)) {
    // Gist API requires content for files. Empty strings might be rejected, but we can pass them.
    // If a file is deleted during an update, you set its value to null, but here we just pass current files.
    gistFiles[filename] = { content: content || " " }; // Gist doesn't allow empty files, replace with space
  }
  return gistFiles;
}

export async function publishGist(files, description, isPublic = false, customToken = null) {
  const token = customToken || await getGistAuthToken();
  if (!token) {
    throw new AuthRequiredError();
  }

  const response = await fetch("https://api.github.com/gists", {
    method: "POST",
    headers: {
      "Accept": "application/vnd.github.v3+json",
      "Authorization": `token ${token}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({
      description: description || "Created with Pen",
      public: isPublic,
      files: normalizeFilesForGist(files)
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to publish gist: ${response.status} ${response.statusText} - ${errorText}`);
  }

  return response.json();
}

export async function updateGist(gistId, files, description, customToken = null) {
  const token = customToken || await getGistAuthToken();
  if (!token) {
    throw new AuthRequiredError();
  }

  // To update a gist and delete files not present in the new 'files' object,
  // we technically need to fetch the existing gist first to find files to delete (set to null).
  // But for now, we will simply fetch the gist first to get existing files.
  const existingGist = await fetchGist(gistId, token);
  const gistFiles = {};
  
  // Set all current files
  for (const [filename, content] of Object.entries(files)) {
    gistFiles[filename] = { content: content || " " };
  }

  // Set removed files to null
  if (existingGist.files) {
    for (const filename of Object.keys(existingGist.files)) {
      if (!(filename in files)) {
        gistFiles[filename] = null;
      }
    }
  }

  const updatePayload = {
    files: gistFiles
  };
  if (description) updatePayload.description = description;

  const response = await fetch(`https://api.github.com/gists/${gistId}`, {
    method: "PATCH",
    headers: {
      "Accept": "application/vnd.github.v3+json",
      "Authorization": `token ${token}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify(updatePayload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to update gist: ${response.status} ${response.statusText} - ${errorText}`);
  }

  return response.json();
}

export async function fetchGist(gistId, token = null) {
  const headers = {
    "Accept": "application/vnd.github.v3+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (token) {
    headers["Authorization"] = `token ${token}`;
  }

  const response = await fetch(`https://api.github.com/gists/${gistId}`, { headers });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch gist ${gistId}: ${response.statusText}`);
  }
  
  return response.json();
}
