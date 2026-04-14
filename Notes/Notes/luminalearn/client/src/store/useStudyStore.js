import { create } from 'zustand';
import { getItem, setItem } from '../utils/storage';

export const useStudyStore = create((set, get) => ({
  notes: getItem('notes', []),
  flashcards: getItem('flashcards', []),
  analytics: getItem('analytics', {
    streakDays: 0,
    documents: {},
    weakTopics: [],
  }),

  addNote: (note) => {
    const next = [...get().notes, note];
    set({ notes: next });
    setItem('notes', next);
  },

  setFlashcards: (cards) => {
    set({ flashcards: cards });
    setItem('flashcards', cards);
  },

  updateAnalytics: (partial) => {
    const current = get().analytics;
    const next = { ...current, ...partial };
    set({ analytics: next });
    setItem('analytics', next);
  },
}));

