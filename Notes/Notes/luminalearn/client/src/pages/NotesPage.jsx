import { useStudyStore } from '../store/useStudyStore';

export function NotesPage() {
  const notes = useStudyStore((s) => s.notes);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Study Notes</h2>
      <p className="text-[var(--text-secondary)] text-sm max-w-2xl">
        Saved Q&amp;A notes from your study sessions appear below. Click any note
        to review the answer.
      </p>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {notes.map((n) => (
          <div key={n.id} className="glass-card p-3 text-sm space-y-1">
            <div className="font-medium text-[var(--text-primary)] line-clamp-2">
              {n.question}
            </div>
            <div className="text-[var(--text-secondary)] text-xs line-clamp-3">
              {n.answer}
            </div>
            <div className="text-[10px] text-[var(--text-muted)]">
              {new Date(n.createdAt).toLocaleString()}
            </div>
          </div>
        ))}
        {notes.length === 0 && (
          <div className="text-xs text-[var(--text-secondary)]">
            No notes yet. Ask questions in the Study Room to start building your
            notebook.
          </div>
        )}
      </div>
    </div>
  );
}


