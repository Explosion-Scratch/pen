/**
 * Reconstructs omitted blank files that were not sent across the GitHub API.
 * Ensures the runtime files perfectly map to the explicit config editors array.
 */
export function restoreMissingGistFiles(gistConfig, gistFiles) {
  if (Array.isArray(gistConfig?.editors)) {
    gistConfig.editors.forEach((ed) => {
      if (ed.filename && !(ed.filename in gistFiles)) {
        gistFiles[ed.filename] = "";
      }
    });
  }
  return gistFiles;
}

/**
 * Creates the GitHub Gists JSON POST/PATCH payload format.
 * Skips files containing strictly empty strings or zero lengths (as GitHub throws a 422 if contents are blank).
 */
export function normalizeGistPayload(files, description = "Pen Project", isPublish = false) {
  const payload = {
    description: description,
    files: Object.fromEntries(
      Object.entries(files)
        .filter(([_, content]) => typeof content === "string" ? content.trim().length > 0 : content === null)
        .map(([k, v]) => [k, v === null ? null : { content: v }])
    ),
  };
  if (isPublish) {
    payload.public = true;
  }
  return payload;
}

export async function fetchGistApi(gistId, token = null) {
  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token.trim()}`;
  }

  const response = await fetch(`https://api.github.com/gists/${gistId}`, {
    headers,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch gist ${gistId}: ${response.statusText}`);
  }

  return response.json();
}

export async function publishGistApi(token, payload) {
  const response = await fetch("https://api.github.com/gists", {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token.trim()}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to publish gist: ${response.status} ${response.statusText} - ${errorText}`
    );
  }

  return response.json();
}

export async function updateGistApi(token, gistId, payload) {
  const response = await fetch(`https://api.github.com/gists/${gistId}`, {
    method: "PATCH",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token.trim()}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to update gist: ${response.status} ${response.statusText} - ${errorText}`
    );
  }

  return response.json();
}
