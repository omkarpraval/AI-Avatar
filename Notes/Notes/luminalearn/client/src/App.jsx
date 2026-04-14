import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { StudyRoom } from './pages/StudyRoom';
import { FlashcardsPage } from './pages/FlashcardsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { NotesPage } from './pages/NotesPage';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { SettingsDrawer } from './components/layout/SettingsDrawer';

function AppShell() {
  useKeyboardShortcuts();
  return (
    <div className="min-h-screen flex bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 px-6 py-4">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/study" element={<StudyRoom />} />
            <Route path="/flashcards" element={<FlashcardsPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/notes" element={<NotesPage />} />
          </Routes>
        </main>
      </div>
      <SettingsDrawer />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}

export default App;
