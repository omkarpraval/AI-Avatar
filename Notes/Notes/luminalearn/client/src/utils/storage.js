const NAMESPACE = 'lumina';

function ns(key) {
  return `${NAMESPACE}:${key}`;
}

export function getItem(key, defaultValue) {
  try {
    const raw = window.localStorage.getItem(ns(key));
    if (!raw) return defaultValue;
    return JSON.parse(raw);
  } catch {
    return defaultValue;
  }
}

export function setItem(key, value) {
  try {
    window.localStorage.setItem(ns(key), JSON.stringify(value));
  } catch {
    // ignore quota errors for now
  }
}

export function updateItem(key, updater, defaultValue) {
  const prev = getItem(key, defaultValue);
  const next = updater(prev);
  setItem(key, next);
  return next;
}

export function exportAll() {
  const keys = [
    'documents',
    'notes',
    'flashcards',
    'analytics',
    'settings',
    'aiCache',
  ];
  const result = {};
  keys.forEach((k) => {
    result[k] = getItem(k, null);
  });
  return result;
}

export function clearAll() {
  const prefix = `${NAMESPACE}:`;
  Object.keys(window.localStorage).forEach((key) => {
    if (key.startsWith(prefix)) {
      window.localStorage.removeItem(key);
    }
  });
}

