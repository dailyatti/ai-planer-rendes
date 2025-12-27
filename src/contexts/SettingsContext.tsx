import React, { createContext, useContext, useState, useEffect } from 'react';

export type TimeZone = 'UTC' | 'Europe/Budapest' | 'America/New_York' | 'Europe/London' | 'Europe/Berlin' | 'Europe/Paris' | 'Europe/Rome' | 'America/Los_Angeles';
export type DateFormat = 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
export type Currency = 'USD' | 'EUR' | 'GBP' | 'HUF' | 'CAD' | 'AUD' | 'JPY' | 'CHF' | 'SEK' | 'NOK' | 'DKK';
export type AIProvider = 'openai' | 'gemini' | null;

interface GeneralSettings {
  timeZone: TimeZone;
  dateFormat: DateFormat;
  autoSave: boolean;
  compactMode: boolean;
  animations: boolean;
  sidebarPosition: 'left' | 'right';
}

interface NotificationSettings {
  taskReminders: boolean;
  goalMilestones: boolean;
  subscriptionPayments: boolean;
  weeklySummary: boolean;
  notificationTime: string;
}

interface PrivacySettings {
  analytics: boolean;
  crashReports: boolean;
}

interface AIConfig {
  provider: AIProvider;
  apiKey: string;
}

interface AppSettings {
  general: GeneralSettings;
  notifications: NotificationSettings;
  privacy: PrivacySettings;
  aiConfig: AIConfig;
}

const defaultSettings: AppSettings = {
  general: {
    timeZone: 'UTC',
    dateFormat: 'MM/DD/YYYY',
    autoSave: true,
    compactMode: false,
    animations: true,
    sidebarPosition: 'left',
  },
  notifications: {
    taskReminders: true,
    goalMilestones: true,
    subscriptionPayments: true,
    weeklySummary: false,
    notificationTime: '09:00',
  },
  privacy: {
    analytics: false,
    crashReports: true,
  },
  aiConfig: {
    provider: null,
    apiKey: ''
  }
};

interface SettingsContextType {
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => void;
  resetSettings: () => void;
  exportSettings: () => string;
  importSettings: (settingsJson: string) => boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      // MigrationService should have run by now, so digitalplanner-settings should exist if there was data.
      const saved = localStorage.getItem('digitalplanner-settings');
      let initialSettings = saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;

      // Migrate legacy AI config if needed
      if (!initialSettings.aiConfig?.apiKey) {
        try {
          const legacyAI = localStorage.getItem('digitalplanner_ai_config');
          if (legacyAI) {
            const parsedAI = JSON.parse(legacyAI);
            initialSettings = {
              ...initialSettings,
              aiConfig: {
                provider: parsedAI.provider || 'gemini',
                apiKey: parsedAI.apiKey || ''
              }
            };
          }
        } catch (e) { console.error('Error migrating AI config', e); }
      }
      return initialSettings;
    } catch (error) {
      console.error('Error loading settings:', error);
      return defaultSettings;
    }
  });

  useEffect(() => {
    localStorage.setItem('digitalplanner-settings', JSON.stringify(settings));
  }, [settings]);

  const updateSettings = (updates: Partial<AppSettings>) => {
    setSettings(prev => ({
      ...prev,
      ...updates,
      general: { ...prev.general, ...updates.general },
      notifications: { ...prev.notifications, ...updates.notifications },
      privacy: { ...prev.privacy, ...updates.privacy },
      aiConfig: { ...prev.aiConfig, ...updates.aiConfig },
    }));
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
    localStorage.removeItem('digitalplanner-settings');
  };

  const exportSettings = (): string => {
    return JSON.stringify({
      version: '1.0',
      exportDate: new Date().toISOString(),
      settings,
    }, null, 2);
  };

  const importSettings = (settingsJson: string): boolean => {
    try {
      const parsed = JSON.parse(settingsJson);
      if (parsed.settings && typeof parsed.settings === 'object') {
        setSettings({ ...defaultSettings, ...parsed.settings });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error importing settings:', error);
      return false;
    }
  };

  return (
    <SettingsContext.Provider value={{
      settings,
      updateSettings,
      resetSettings,
      exportSettings,
      importSettings,
    }}>
      {children}
    </SettingsContext.Provider>
  );
};