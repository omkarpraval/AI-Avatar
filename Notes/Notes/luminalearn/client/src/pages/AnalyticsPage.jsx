import { useStudyStore } from '../store/useStudyStore';
import { useDocumentStore } from '../store/useDocumentStore';

export function AnalyticsPage() {
  const analytics = useStudyStore((s) => s.analytics);
  const documents = useDocumentStore((s) => s.documents);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Analytics</h2>
      <div className="grid md:grid-cols-3 gap-4">
        <div className="glass-card p-4">
          <h3 className="font-medium mb-1">Study Streak</h3>
          <p className="text-[var(--text-secondary)] text-sm">
            {analytics.streakDays || 0} day(s) in a row
          </p>
        </div>
        <div className="glass-card p-4">
          <h3 className="font-medium mb-1">Document Progress</h3>
          <p className="text-[var(--text-secondary)] text-sm">
            {documents.length ? `${documents.length} document(s) loaded` : 'No documents yet'}
          </p>
        </div>
        <div className="glass-card p-4">
          <h3 className="font-medium mb-1">Weak Topics</h3>
          <p className="text-[var(--text-secondary)] text-sm">
            {analytics.weakTopics?.length
              ? analytics.weakTopics.join(', ')
              : 'No weak topics detected yet'}
          </p>
        </div>
      </div>
    </div>
  );
}


