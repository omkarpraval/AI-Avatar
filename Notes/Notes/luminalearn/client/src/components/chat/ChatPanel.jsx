import { useEffect, useState } from 'react';
import { useAI } from '../../hooks/useAI';
import { useDocumentStore } from '../../store/useDocumentStore';
import { useUIStore } from '../../store/useUIStore';
import { useStudyStore } from '../../store/useStudyStore';
import { applyHighlights, clearAllHighlights } from '../../utils/highlightEngine';

export function ChatPanel() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [mode, setMode] = useState('chat'); // 'chat' | 'socratic' | 'voice'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { ask } = useAI();
  const documents = useDocumentStore((s) => s.documents);
  const language = useUIStore((s) => s.language);
  const addNote = useStudyStore((s) => s.addNote);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const question = input.trim();
    setInput('');
    setError('');

    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: question,
    };
    setMessages((prev) => [...prev, userMessage]);

    // Build full page map so AI can highlight across multiple pages.
    // Text is trimmed per page to keep payload reasonable.
    const pageMap = documents.map((doc) => ({
      documentName: doc.name,
      pages: (doc.pages || []).map((p) => ({
        pageNumber: p.pageNumber,
        logicalLabel: p.logicalLabel || `Page ${p.pageNumber}`,
        text: (p.text || '').slice(0, 4000),
      })),
    }));

    setLoading(true);
    try {
      const response = await ask(question, {
        documentTexts: [],
        pageMap,
        mode,
        language,
        conversationHistory: [],
      });

      const assistantMessage = {
        id: `${Date.now().toString()}-ai`,
        role: 'assistant',
        content: response.answer || '',
        analogy: response.analogy,
        citations: response.citations || [],
        confidence: response.confidence,
        highlights: response.highlights || [],
      };
      // Debug: inspect highlights returned by AI for matching quality
      if (response.highlights?.length) {
        // eslint-disable-next-line no-console
        console.table(
          response.highlights.map((h) => ({
            page: h.page,
            snippet: h.text_snippet,
            color: h.color,
            type: h.type,
          })),
        );
      }
      setMessages((prev) => [...prev, assistantMessage]);

      addNote({
        id: assistantMessage.id,
        question,
        answer: response.answer || '',
        analogy: response.analogy,
        citations: response.citations || [],
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      if (err.status === 413) {
        setError(
          '📄 Your question is too broad for the AI context window. Ask about a specific topic or a few pages instead of the entire document.',
        );
      } else if (err.status === 429) {
        setError(
          '⏳ The AI is rate limited right now. Please wait a few seconds and try again.',
        );
      } else {
        setError('Something went wrong talking to the tutor. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Apply highlights whenever the latest assistant message includes them
  useEffect(() => {
    const lastAssistant = [...messages]
      .reverse()
      .find((m) => m.role === 'assistant');

    if (lastAssistant?.highlights?.length) {
      // Highlights are document-agnostic: use PDF page numbers directly.
      applyHighlights(lastAssistant.highlights, true, 0);
    } else if (!loading) {
      // If there are no highlights in the latest response, clear existing ones
      clearAllHighlights(false);
    }
  }, [messages, loading]);

  return (
    <div className="h-full flex flex-col bg-[var(--bg-secondary)]">
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border-subtle)] text-xs">
        <div className="font-medium">AI Tutor</div>
        <div className="text-[var(--text-secondary)] flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMode('chat')}
            className={mode === 'chat' ? 'font-semibold text-white' : ''}
          >
            💬 Chat
          </button>
          <button
            type="button"
            onClick={() => setMode('socratic')}
            className={mode === 'socratic' ? 'font-semibold text-white' : ''}
          >
            🧠 Socratic
          </button>
          <button
            type="button"
            onClick={() => setMode('voice')}
            className={mode === 'voice' ? 'font-semibold text-white' : ''}
          >
            🗣️ Voice
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-3 text-sm space-y-3">
        {messages.length === 0 && (
          <p className="text-[var(--text-secondary)]">
            Ask anything about your documents. AI answers, citations, and highlights
            will appear here.
          </p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-[80%] rounded-2xl px-3 py-2 ${
              m.role === 'user'
                ? 'ml-auto bg-gradient-to-tr from-purple-500 to-blue-500 text-white text-right'
                : 'mr-auto glass-card text-[var(--text-secondary)]'
            }`}
          >
            <div className="whitespace-pre-wrap text-sm">{m.content}</div>
            {m.role === 'assistant' && m.citations?.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1 text-[10px]">
                {m.citations.map((c, idx) => (
                  <span
                    // eslint-disable-next-line react/no-array-index-key
                    key={idx}
                    className="px-2 py-0.5 rounded-full bg-[var(--bg-card-hover)]"
                  >
                    📄 Page {c.page}
                  </span>
                ))}
              </div>
            )}
            {m.role === 'assistant' && m.confidence && (
              <div className="mt-1 text-[10px] text-[var(--text-muted)]">
                Confidence: {m.confidence}
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="mr-auto glass-card px-3 py-2 text-xs text-[var(--text-secondary)]">
            Thinking…
          </div>
        )}
        {error && (
          <div className="text-[10px] text-red-400">
            {error}
          </div>
        )}
      </div>

      <form
        className="px-4 py-3 border-t border-[var(--border-subtle)]"
        onSubmit={handleSubmit}
      >
        <div className="flex items-center gap-2">
          <div className="flex-1 glass-card px-3 py-2 flex items-center gap-2">
            <span className="text-xs">🌍</span>
            <textarea
              rows={1}
              className="flex-1 bg-transparent outline-none resize-none text-sm"
              placeholder="Ask anything about your documents..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="h-10 w-10 rounded-full flex items-center justify-center text-lg disabled:opacity-50"
            style={{ backgroundImage: 'var(--grad-brand)' }}
          >
            ➤
          </button>
        </div>
      </form>
    </div>
  );
}

