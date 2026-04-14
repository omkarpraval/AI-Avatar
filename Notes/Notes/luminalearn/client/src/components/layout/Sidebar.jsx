import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Home', icon: '🏠' },
  { to: '/study', label: 'Study', icon: '📄' },
  { to: '/flashcards', label: 'Flashcards', icon: '📇' },
  { to: '/analytics', label: 'Analytics', icon: '📊' },
  { to: '/notes', label: 'Notes', icon: '📚' },
];

export function Sidebar() {
  return (
    <aside className="hidden md:flex flex-col w-16 border-r border-[var(--border-subtle)] bg-[var(--bg-secondary)]/80 backdrop-blur-md">
      <div className="flex-1 flex flex-col items-center gap-4 py-4">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `w-10 h-10 rounded-2xl flex items-center justify-center text-xl transition-all ${
                isActive
                  ? 'bg-[var(--bg-card)] border border-[var(--border-active)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card)]'
              }`
            }
          >
            <span aria-hidden>{item.icon}</span>
            <span className="sr-only">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </aside>
  );
}

