import { create } from 'zustand';
import { getItem, setItem, exportAll } from '../utils/storage';

export const useUIStore = create((set) => ({
  language: getItem('settings', { language: 'en' }).language || 'en',
  setLanguage: (language) => {
    set((state) => {
      const nextSettings = { ...(getItem('settings', {})), language };
      setItem('settings', nextSettings);
      return { ...state, language };
    });
  },

  showSettings: false,
  toggleSettings: () =>
    set((state) => ({
      showSettings: !state.showSettings,
    })),

  downloadData: () => {
    const data = exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'luminalearn-data.json';
    a.click();
    URL.revokeObjectURL(url);
  },
}));

