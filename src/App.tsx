import { useState } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { DataProvider } from './contexts/DataContext';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import MainContent from './components/MainContent';
import VoiceAssistant from './components/VoiceAssistant';
import { ViewType } from './types/planner';

function AppContent() {
  const [activeView, setActiveView] = useState<ViewType>('daily');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { language } = useLanguage();

  const handleSettingsClick = () => {
    setActiveView('settings');
    setSidebarOpen(false);
  };

  const handleVoiceCommand = (command: any) => {
    console.log('Voice command received:', command);

    // Handle navigation commands
    if (command.type === 'navigation' && command.target) {
      const viewMap: Record<string, ViewType> = {
        'daily': 'daily',
        'weekly': 'weekly',
        'monthly': 'monthly',
        'yearly': 'yearly',
        'hourly': 'hourly',
        'notes': 'notes',
        'goals': 'goals',
        'drawing': 'drawing',
        'budget': 'budget',
        'invoicing': 'invoicing',
        'pomodoro': 'pomodoro',
        'statistics': 'statistics',
        'integrations': 'integrations',
        'settings': 'settings',
      };

      if (viewMap[command.target]) {
        setActiveView(viewMap[command.target]);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      {/* Mesh gradient background */}
      <div
        className="fixed inset-0 pointer-events-none opacity-50 dark:opacity-30"
        style={{
          backgroundImage: `
            radial-gradient(at 20% 20%, hsla(228, 89%, 60%, 0.1) 0px, transparent 50%),
            radial-gradient(at 80% 10%, hsla(189, 100%, 56%, 0.08) 0px, transparent 50%),
            radial-gradient(at 10% 80%, hsla(355, 85%, 50%, 0.06) 0px, transparent 50%)
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

      {/* Voice Assistant - Floating button */}
      <VoiceAssistant
        apiKey={localStorage.getItem('GEMINI_API_KEY') || import.meta.env.VITE_GEMINI_API_KEY}
        onCommand={handleVoiceCommand}
        currentLanguage={language}
        currentView={activeView}
      />
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