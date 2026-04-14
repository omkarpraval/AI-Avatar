import { useLocation, useNavigate } from 'react-router-dom';
import { useUIStore } from '../../store/useUIStore';

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const toggleSettings = useUIStore((s) => s.toggleSettings);

  const breadcrumb =
    location.pathname === '/'
      ? 'Landing'
      : location.pathname === '/study'
        ? 'Study Room'
        : location.pathname === '/flashcards'
          ? 'Flashcards'
          : location.pathname === '/analytics'
            ? 'Analytics'
            : location.pathname === '/notes'
              ? 'Notes'
              : '';

  return (
    <header className="h-16 flex items-center justify-between px-6 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]/80 backdrop-blur-md">
      <div className="flex items-center gap-2">
        <div
          className="h-9 w-9 rounded-xl flex items-center justify-center text-xl cursor-pointer"
          style={{ backgroundImage: 'var(--grad-brand)' }}
          onClick={() => navigate('/')}
        >
          ✨
        </div>
        <div>
          <div className="text-sm font-semibold tracking-tight">LuminaLearn</div>
          <div className="text-[11px] text-[var(--text-muted)]">{breadcrumb}</div>
        </div>
      </div>

      <div className="flex items-center gap-3 text-[13px]">
        <button
          type="button"
          className="px-3 py-1.5 rounded-full glass-card text-[13px] flex items-center gap-1"
          onClick={() => navigate('/notes')}
        >
          <span>📚</span>
          <span>Notes</span>
        </button>
        <button
          type="button"
          className="px-3 py-1.5 rounded-full glass-card text-[13px] flex items-center gap-1"
          onClick={() => navigate('/analytics')}
        >
          <span>📊</span>
          <span>Analytics</span>
        </button>
        <button
          type="button"
          className="px-3 py-1.5 rounded-full glass-card text-[13px] flex items-center gap-1"
          onClick={toggleSettings}
        >
          <span>⚙️</span>
          <span>Settings</span>
        </button>
      </div>
    </header>
  );
}

