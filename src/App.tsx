
import { useState, useEffect } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { useSettings, SettingsProvider } from './contexts/SettingsContext';
import { DataProvider, useData } from './contexts/DataContext';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import MainContent from './components/MainContent';
import { VoiceAssistant } from './components/VoiceAssistant';
import { ViewType } from './types/planner';
import { CurrencyService } from './services/CurrencyService';
import { MigrationService } from './services/MigrationService'; // Import added

function AppContent() {
  const { language } = useLanguage();
  const { settings } = useSettings();
  const [activeView, setActiveView] = useState<ViewType>('daily');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { invoices, clients, addPlan } = useData();

  // Run migration on mount
  useEffect(() => {
    MigrationService.run().catch(err => console.error('Migration failed:', err));
  }, []);

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

    // Handle schedule_pending command for invoices
    if (command.type === 'schedule_pending') {
      const pendingInvoices = invoices.filter(inv => inv.status === 'sent');
      if (pendingInvoices.length === 0) {
        console.log(language === 'hu' ? 'Nincs függő számla.' : 'No pending invoices.');
        return;
      }
      pendingInvoices.forEach(invoice => {
        const client = clients.find(c => c.id === invoice.clientId);
        addPlan({
          title: `Invoice #${invoice.invoiceNumber} Payment`,
          description: `Follow up on payment from ${client?.name || 'Client'}.Amount: ${CurrencyService.format(invoice.total, invoice.currency)} `,
          date: new Date(invoice.dueDate),
          startTime: new Date(invoice.dueDate),
          completed: false,
          priority: invoice.status === 'overdue' ? 'high' : 'medium',
          linkedNotes: []
        });
      });
      console.log(language === 'hu' ? 'Függő számlák feladatként ütemezve!' : 'Pending invoices scheduled as tasks!');
    }

    // Handle create_goal - create a new goal and navigate to goals view
    if (command.type === 'create_goal' && command.data) {
      addPlan({
        title: command.data.title,
        description: command.data.description || '',
        date: command.data.targetDate ? new Date(command.data.targetDate) : new Date(),
        priority: 'high',
        completed: false,
        linkedNotes: []
      });
      setActiveView('goals');
      console.log(`Goal created: ${command.data.title} `);
    }

    // Handle create_note - create a note as a task and navigate to notes
    if (command.type === 'create_note' && command.data) {
      addPlan({
        title: command.data.title,
        description: command.data.content || '',
        date: new Date(),
        priority: 'low',
        completed: false,
        linkedNotes: []
      });
      setActiveView('notes');
      console.log(`Note created: ${command.data.title} `);
    }

    // Handle toggle_theme - toggle dark/light mode
    if (command.type === 'toggle_theme') {
      const html = document.documentElement;
      if (command.target === 'dark') {
        html.classList.add('dark');
      } else if (command.target === 'light') {
        html.classList.remove('dark');
      } else {
        html.classList.toggle('dark');
      }
      console.log(`Theme toggled: ${command.target} `);
    }

    // Handle pomodoro - navigate to pomodoro view
    if (command.type === 'pomodoro') {
      setActiveView('pomodoro');
      console.log(`Pomodoro command: ${command.target} `);
    }
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

      {/* Voice Assistant - Floating button */}
      <VoiceAssistant
        apiKey={settings.aiConfig?.apiKey || import.meta.env.VITE_GEMINI_API_KEY || ''}
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