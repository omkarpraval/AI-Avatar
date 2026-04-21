window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  const data = event.data;
  if (!data || data.source !== "avatarask-web" || data.type !== "AVATARASK_EXTENSION") return;

  const postResponse = (payload) => {
    window.postMessage(
      {
        source: "avatarask-extension",
        type: "AVATARASK_EXTENSION_RESPONSE",
        action: data.action,
        payload,
      },
      "*"
    );
  };

  try {
    chrome.runtime.sendMessage(
      {
        type: "AVATARASK_EXTENSION",
        action: data.action,
        payload: data.payload || {},
      },
      (response) => {
        if (chrome.runtime.lastError) {
          postResponse({
            ok: false,
            available: false,
            error: chrome.runtime.lastError.message || "Extension context invalidated",
          });
          return;
        }

        postResponse(response || { ok: false, available: false });
      }
    );
  } catch (error) {
    postResponse({
      ok: false,
      available: false,
      error: error instanceof Error ? error.message : "Extension unavailable",
    });
  }
});
