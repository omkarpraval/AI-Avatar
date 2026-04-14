import { useNavigate } from 'react-router-dom';
import { FileUploadZone } from '../components/document/FileUploadZone';

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center gap-10 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-40">
        <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-purple-600 blur-3xl" />
        <div className="absolute -right-40 -bottom-40 h-80 w-80 rounded-full bg-cyan-500 blur-3xl" />
      </div>

      <section className="relative z-10 text-center max-w-3xl space-y-4">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-tr from-purple-500 via-blue-500 to-cyan-400 shadow-lg shadow-purple-500/40">
          <span className="text-3xl">📘</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
          Study Smarter. Understand Deeper.
        </h1>
        <p className="text-[var(--text-secondary)] text-lg">
          Upload any document. Ask anything. Watch your knowledge come alive with
          AI-powered highlights, explanations, and flashcards.
        </p>
        <button
          type="button"
          onClick={() => navigate('/study')}
          className="mt-4 px-8 py-3 rounded-full text-sm font-medium text-white shadow-lg shadow-purple-500/40"
          style={{ backgroundImage: 'var(--grad-brand)' }}
        >
          Start Studying
        </button>
      </section>

      <section className="relative z-10 grid grid-cols-2 md:grid-cols-3 gap-4 max-w-4xl">
        {[
          'Smart Highlighting',
          'AI Explanations',
          'Concept Maps',
          'Flashcards',
          'Progress Tracking',
          '30+ Languages',
        ].map((label) => (
          <div
            key={label}
            className="glass-card px-4 py-3 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] transition-transform duration-200 hover:-translate-y-1"
          >
            {label}
          </div>
        ))}
      </section>

      <FileUploadZone />
    </div>
  );
}

