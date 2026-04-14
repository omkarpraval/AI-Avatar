import { useState } from 'react';

export function SplitLayout({ left, right }) {
  const [ratio, setRatio] = useState(0.58);

  const handleDrag = (e) => {
    const container = e.currentTarget.parentElement;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const nextRatio = (e.clientX - rect.left) / rect.width;
    setRatio(Math.min(0.75, Math.max(0.35, nextRatio)));
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex rounded-2xl overflow-hidden glass-card">
      <div style={{ width: `${ratio * 100}%` }} className="h-full overflow-hidden">
        {left}
      </div>
      <div
        className="w-1 cursor-col-resize bg-[var(--border-subtle)]"
        onMouseDown={(startEvent) => {
          const move = (e) => handleDrag(e);
          const up = () => {
            window.removeEventListener('mousemove', move);
            window.removeEventListener('mouseup', up);
          };
          window.addEventListener('mousemove', move);
          window.addEventListener('mouseup', up);
          startEvent.preventDefault();
        }}
      />
      <div
        style={{ width: `${(1 - ratio) * 100}%` }}
        className="h-full border-l border-[var(--border-subtle)]"
      >
        {right}
      </div>
    </div>
  );
}

