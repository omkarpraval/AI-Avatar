import { useUIStore } from '../../store/useUIStore';

export function SettingsDrawer() {
  const showSettings = useUIStore((s) => s.showSettings);
  const toggleSettings = useUIStore((s) => s.toggleSettings);
  const language = useUIStore((s) => s.language);
  const setLanguage = useUIStore((s) => s.setLanguage);
  const downloadData = useUIStore((s) => s.downloadData);

  if (!showSettings) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div
        className="flex-1 bg-black/40"
        onClick={toggleSettings}
        aria-hidden="true"
      />
      <aside className="w-80 max-w-full bg-[var(--bg-secondary)] h-full border-l border-[var(--border-subtle)] p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Settings</h3>
          <button
            type="button"
            className="text-sm text-[var(--text-secondary)]"
            onClick={toggleSettings}
          >
            ✕
          </button>
        </div>
        <div className="space-y-3 text-sm">
          <div>
            <div className="font-medium mb-1">Language</div>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full bg-transparent border border-[var(--border-subtle)] rounded px-2 py-1 text-sm"
            >
              <option value="en">English</option>
              <option value="hi">Hindi</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="zh">Chinese (Simplified)</option>
              <option value="ar">Arabic</option>
              <option value="pt">Portuguese</option>
              <option value="ja">Japanese</option>
              <option value="ko">Korean</option>
              <option value="it">Italian</option>
              <option value="ru">Russian</option>
              <option value="bn">Bengali</option>
              <option value="ur">Urdu</option>
              <option value="ta">Tamil</option>
            </select>
          </div>
          <div className="pt-2 border-t border-[var(--border-subtle)] mt-2">
            <div className="font-medium mb-1">Data export</div>
            <button
              type="button"
              onClick={downloadData}
              className="px-3 py-1.5 rounded-full text-xs"
              style={{ backgroundImage: 'var(--grad-brand)' }}
            >
              ⬇️ Export my data (JSON)
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

