import { useState } from 'react';
import { useAI } from '../hooks/useAI';
import { useDocumentStore } from '../store/useDocumentStore';
import { useStudyStore } from '../store/useStudyStore';

export function FlashcardsPage() {
  const { ask } = useAI();
  const documents = useDocumentStore((s) => s.documents);
  const setFlashcards = useStudyStore((s) => s.setFlashcards);
  const flashcards = useStudyStore((s) => s.flashcards);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const currentDoc = documents[0];

  const handleGenerate = async () => {
    if (!currentDoc) return;
    setLoading(true);
    setError('');
    try {
      const documentText = (currentDoc.pages || [])
        .map((p) => p.text)
        .join('\n\n');
      const baseUrl =
        import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
      const res = await fetch(`${baseUrl}/flashcards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentText, count: 20 }),
      });
      if (!res.ok) throw new Error('Flashcard generation failed');
      const json = await res.json();
      setFlashcards(json.flashcards || []);
    } catch (e) {
      setError('Unable to generate flashcards. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Flashcards</h2>
        <button
          type="button"
          disabled={loading || !currentDoc}
          onClick={handleGenerate}
          className="px-4 py-2 rounded-full text-sm font-medium disabled:opacity-50"
          style={{ backgroundImage: 'var(--grad-brand)' }}
        >
          {loading ? 'Generating…' : 'Generate from current document'}
        </button>
      </div>
      {error && <div className="text-xs text-red-400">{error}</div>}
      <div className="flex-1 grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {flashcards.map((card, idx) => (
          <div key={idx} className="glass-card p-4 text-sm space-y-2">
            <div className="font-medium">{card.front}</div>
            <div className="text-[var(--text-secondary)] text-xs">
              {card.back}
            </div>
          </div>
        ))}
        {!flashcards.length && (
          <div className="text-xs text-[var(--text-secondary)]">
            No flashcards yet. Generate a deck from your current document.
          </div>
        )}
      </div>
    </div>
  );
}


