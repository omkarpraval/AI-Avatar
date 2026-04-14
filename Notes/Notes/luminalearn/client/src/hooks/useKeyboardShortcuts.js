import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export function useKeyboardShortcuts() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    function handler(e) {
      const isStudy = location.pathname === '/study';

      if (e.ctrlKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        // Future: open command palette
      }

      if (!isStudy) return;

      if (e.ctrlKey && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        // Explain page: navigate to study (already there) – hook into viewer later
        navigate('/study');
      }
      if (e.ctrlKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        navigate('/flashcards');
      }
      if (e.ctrlKey && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        // Mind map placeholder
      }
    }

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [location.pathname, navigate]);
}

