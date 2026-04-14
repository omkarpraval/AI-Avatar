export function useAI() {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

  async function ask(question, payload = {}) {
    const res = await fetch(`${baseUrl}/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, ...payload }),
    });
    if (!res.ok) {
      let message = 'AI request failed';
      let data = null;
      try {
        data = await res.json();
        if (data?.error) message = data.error;
      } catch {
        // ignore JSON parse error, fall back to status text
        if (res.statusText) message = res.statusText;
      }
      const err = new Error(message);
      err.status = res.status;
      err.payload = data;
      throw err;
    }
    return res.json();
  }

  async function explainPage(pagePayload) {
    const res = await fetch(`${baseUrl}/explain-page`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pagePayload),
    });
    if (!res.ok) {
      let message = 'Explain page failed';
      let data = null;
      try {
        data = await res.json();
        if (data?.error) message = data.error;
      } catch {
        if (res.statusText) message = res.statusText;
      }
      const err = new Error(message);
      err.status = res.status;
      err.payload = data;
      throw err;
    }
    return res.json();
  }

  return {
    ask,
    explainPage,
  };
}

