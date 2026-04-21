let lockState = {
  active: false,
  lockedTabId: null,
  allowedOrigin: "",
  lockedPath: "",
};
const ENFORCE_ALARM = "avatarask-enforce-lock";
const LOCK_STATE_KEY = "avatarask-lock-state";

const readStoredLockState = async () => {
  const data = await chrome.storage.session.get(LOCK_STATE_KEY);
  return data?.[LOCK_STATE_KEY] || {
    active: false,
    lockedTabId: null,
    allowedOrigin: "",
    lockedPath: "",
  };
};

const writeStoredLockState = async (nextState) => {
  lockState = nextState;
  await chrome.storage.session.set({ [LOCK_STATE_KEY]: nextState });
};

const syncLockState = async () => {
  lockState = await readStoredLockState();
  return lockState;
};

const tryBringLockedTabToFront = async () => {
  await syncLockState();
  if (!lockState.active || !lockState.lockedTabId) return;
  try {
    const lockedTab = await chrome.tabs.get(lockState.lockedTabId);
    if (!lockedTab?.id) return;
    if (lockedTab.windowId) {
      await chrome.windows.update(lockedTab.windowId, { focused: true });
    }
    await chrome.tabs.update(lockedTab.id, { active: true });
  } catch {
    await writeStoredLockState({ active: false, lockedTabId: null, allowedOrigin: "", lockedPath: "" });
  }
};

const startEnforcementAlarm = () => {
  chrome.alarms.clear(ENFORCE_ALARM, () => {
    chrome.alarms.create(ENFORCE_ALARM, { periodInMinutes: 0.02 });
  });
};

const stopEnforcementAlarm = () => {
  chrome.alarms.clear(ENFORCE_ALARM);
};

const enforceActiveTab = async () => {
  await syncLockState();
  if (!lockState.active || !lockState.lockedTabId) return;
  try {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!activeTab?.id) return;
    if (activeTab.id !== lockState.lockedTabId) {
      await tryBringLockedTabToFront();
      return;
    }
    await enforceLockedUrl();
  } catch {
    await writeStoredLockState({ active: false, lockedTabId: null, allowedOrigin: "", lockedPath: "" });
    stopEnforcementAlarm();
  }
};

const enforceLockedUrl = async () => {
  await syncLockState();
  if (!lockState.active || !lockState.lockedTabId || !lockState.allowedOrigin) return;
  try {
    const tab = await chrome.tabs.get(lockState.lockedTabId);
    if (!tab?.id) return;
    const expectedPrefix = `${lockState.allowedOrigin}${lockState.lockedPath || ""}`;
    if (tab.url && !tab.url.startsWith(expectedPrefix)) {
      await chrome.tabs.update(tab.id, { url: expectedPrefix });
    }
  } catch {
    await writeStoredLockState({ active: false, lockedTabId: null, allowedOrigin: "", lockedPath: "" });
  }
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "AVATARASK_EXTENSION") return false;

  if (message.action === "PING") {
    sendResponse({ ok: true, available: true });
    return false;
  }

  if (message.action === "LOCK") {
    (async () => {
      try {
        const senderTabId = sender?.tab?.id;
        if (!senderTabId) {
          sendResponse({ ok: false });
          return;
        }
        const nextState = {
          active: true,
          lockedTabId: senderTabId,
          allowedOrigin: message?.payload?.allowedOrigin || "",
          lockedPath: message?.payload?.lockedPath || "",
        };
        await writeStoredLockState(nextState);
        startEnforcementAlarm();
        sendResponse({ ok: true });
      } catch {
        sendResponse({ ok: false });
      }
    })();
    return true;
  }

  if (message.action === "UNLOCK") {
    (async () => {
      try {
        await writeStoredLockState({ active: false, lockedTabId: null, allowedOrigin: "", lockedPath: "" });
        stopEnforcementAlarm();
        sendResponse({ ok: true });
      } catch {
        sendResponse({ ok: false });
      }
    })();
    return true;
  }

  sendResponse({ ok: false });
  return false;
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  await syncLockState();
  if (!lockState.active || !lockState.lockedTabId) return;
  if (tabId !== lockState.lockedTabId) {
    await tryBringLockedTabToFront();
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
  await syncLockState();
  if (!lockState.active || !lockState.lockedTabId) return;
  if (tabId !== lockState.lockedTabId) {
    if (changeInfo.status === "complete") {
      await tryBringLockedTabToFront();
    }
    return;
  }
  if (changeInfo.status === "complete") {
    await enforceLockedUrl();
  }
});

chrome.windows.onFocusChanged.addListener(async (windowId) => {
  await syncLockState();
  if (!lockState.active || !lockState.lockedTabId) return;
  if (windowId === chrome.windows.WINDOW_ID_NONE) return;
  await tryBringLockedTabToFront();
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== ENFORCE_ALARM) return;
  await enforceActiveTab();
});

chrome.tabs.onRemoved.addListener((tabId) => {
  if (lockState.lockedTabId !== tabId) return;
  writeStoredLockState({ active: false, lockedTabId: null, allowedOrigin: "", lockedPath: "" }).finally(() => {
    stopEnforcementAlarm();
  });
});

chrome.runtime.onStartup.addListener(async () => {
  await syncLockState();
  if (lockState.active) {
    startEnforcementAlarm();
  }
});

chrome.runtime.onInstalled.addListener(async () => {
  await syncLockState();
  if (lockState.active) {
    startEnforcementAlarm();
  }
});
