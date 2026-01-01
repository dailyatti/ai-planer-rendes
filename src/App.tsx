
import { useState, useEffect } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { DataProvider } from './contexts/DataContext';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import MainContent from './components/MainContent';
import { ViewType } from './types/planner';
import { MigrationService } from './services/MigrationService'; // Import added

function AppContent() {
  const [activeView, setActiveView] = useState<ViewType>('daily');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Run migration on mount
  useEffect(() => {
    // We don't await this because it might be the old synchronous version (returning undefined)
    // or the new async version (returning a Promise).
    // In either case, the service handles its own errors internally, so we don't need to .catch here.
    try {
      MigrationService.run();
    } catch (e) {
      console.error('Migration run failed:', e);
    }
  }, []);

  const handleSettingsClick = () => {
    setActiveView('settings');
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      {/* Mesh gradient background */}
      <div
        className="fixed inset-0 pointer-events-none opacity-50 dark:opacity-30"
        style={{
          backgroundImage: `
radial - gradient(at 20 % 20 %, hsla(228, 89 %, 60 %, 0.1) 0px, transparent 50 %),
  radial - gradient(at 80 % 10 %, hsla(189, 100 %, 56 %, 0.08) 0px, transparent 50 %),
  radial - gradient(at 10 % 80 %, hsla(355, 85 %, 50 %, 0.06) 0px, transparent 50 %)
    `
        }}
      />

      {/* Main layout */}
      <div className="relative flex min-h-screen">
        <Sidebar
          activeView={activeView}
          onViewChange={setActiveView}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <div className="flex-1 flex flex-col min-w-0">
          <Header
            onMenuClick={() => setSidebarOpen(!sidebarOpen)}
            sidebarOpen={sidebarOpen}
            onSettingsClick={handleSettingsClick}
            activeView={activeView}
          />

          <MainContent
            activeView={activeView}
            sidebarOpen={sidebarOpen}
          />
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <SettingsProvider>
          <DataProvider>
            <AppContent />
          </DataProvider>
        </SettingsProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;