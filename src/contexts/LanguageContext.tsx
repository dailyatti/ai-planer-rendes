import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'hu' | 'ro' | 'sk' | 'hr' | 'de' | 'fr' | 'es' | 'it' | 'pl' | 'cn' | 'jp';

type LanguageName = {
  [key in Language]: string;
};

export const LANGUAGE_NAMES: LanguageName = {
  en: 'English',
  hu: 'Magyar',
  ro: 'Română',
  sk: 'Slovenčina',
  hr: 'Hrvatski',
  de: 'Deutsch',
  fr: 'Français',
  es: 'Español',
  it: 'Italiano',
  pl: 'Polski',
  cn: '中文',
  jp: '日本語',
};

interface Translations {
  [key: string]: {
    [key in Language]: string;
  };
}

const translations: Translations = {
  // Navigation
  'nav.hourlyPlanning': {
    en: 'Hourly Planning',
    hu: 'Óránkénti Tervezés',
    ro: 'Planificare Orară',
    sk: 'Hodinové Plánovanie',
    hr: 'Satno Planiranje',
    de: 'Stundenplanung',
    fr: 'Planification Horaire',
    es: 'Planificación Horaria',
    it: 'Pianificazione Oraria',
    pl: 'Planowanie Godzinowe',
    cn: '每小时计划',
    jp: '時間ごとの計画'
  },
  'nav.dailyPlanning': {
    en: 'Daily Planning',
    hu: 'Napi Tervezés',
    ro: 'Planificare Zilnică',
    sk: 'Denné Plánovanie',
    hr: 'Dnevno Planiranje',
    de: 'Tagesplanung',
    fr: 'Planification Quotidienne',
    es: 'Planificación Diaria',
    it: 'Pianificazione Giornaliera',
    pl: 'Planowanie Dzienne',
    cn: '每日计划',
    jp: '日次計画'
  },
  'nav.weeklyPlanning': {
    en: 'Weekly Planning',
    hu: 'Heti Tervezés',
    ro: 'Planificare Săptămânală',
    sk: 'Týždenné Plánovanie',
    hr: 'Tjedno Planiranje',
    de: 'Wochenplanung',
    fr: 'Planification Hebdomadaire',
    es: 'Planificación Semanal',
    it: 'Pianificazione Settimanale',
    pl: 'Planowanie Tygodniowe',
    cn: '每周计划',
    jp: '週次計画'
  },
  'nav.monthlyPlanning': {
    en: 'Monthly Planning',
    hu: 'Havi Tervezés',
    ro: 'Planificare Lunară',
    sk: 'Mesačné Plánovanie',
    hr: 'Mjesečno Planiranje',
    de: 'Monatsplanung',
    fr: 'Planification Mensuelle',
    es: 'Planificación Mensual',
    it: 'Pianificazione Mensile',
    pl: 'Planowanie Miesięczne',
    cn: '每月计划',
    jp: '月次計画'
  },
  'nav.yearlyPlanning': {
    en: 'Yearly Planning',
    hu: 'Éves Tervezés',
    ro: 'Planificare Anuală',
    sk: 'Ročné Plánovanie',
    hr: 'Godišnje Planiranje',
    de: 'Jahresplanung',
    fr: 'Planification Annuelle',
    es: 'Planificación Anual',
    it: 'Pianificazione Annuale',
    pl: 'Planowanie Roczne',
    cn: '年度计划',
    jp: '年次計画'
  },
  'nav.smartNotes': {
    en: 'Smart Notes',
    hu: 'Okos Jegyzetek',
    ro: 'Notițe Inteligente',
    sk: 'Inteligentné Poznámky',
    hr: 'Pametne Bilješke',
    de: 'Intelligente Notizen',
    fr: 'Notes Intelligentes',
    es: 'Notas Inteligentes',
    it: 'Note Intelligenti',
    pl: 'Inteligentne Notatki',
    cn: '智能笔记',
    jp: 'スマートノート'
  },
  'nav.goals': {
    en: 'Goals & Milestones',
    hu: 'Célok és Mérföldkövek',
    ro: 'Obiective și Repere',
    sk: 'Ciele a Míľniky',
    hr: 'Ciljevi i Prekretnice',
    de: 'Ziele & Meilensteine',
    fr: 'Objectifs & Jalons',
    es: 'Objetivos y Hitos',
    it: 'Obiettivi e Traguardi',
    pl: 'Cele i Kamienie Milowe',
    cn: '目标与里程碑',
    jp: '目標とマイルストーン'
  },
  'nav.visualPlanning': {
    en: 'Visual Planning',
    hu: 'Vizuális Tervezés',
    ro: 'Planificare Vizuală',
    sk: 'Vizuálne Plánovanie',
    hr: 'Vizualno Planiranje',
    de: 'Visuelle Planung',
    fr: 'Planification Visuelle',
    es: 'Planificación Visual',
    it: 'Pianificazione Visiva',
    pl: 'Planowanie Wizualne',
    cn: '视觉规划',
    jp: 'ビジュアルプランニング'
  },
  'nav.budgetTracker': {
    en: 'Budget Tracker',
    hu: 'Költségkövető',
    ro: 'Urmărire Buget',
    sk: 'Sledovanie Rozpočtu',
    hr: 'Praćenje Budžeta',
    de: 'Budget-Tracker',
    fr: 'Suivi du Budget',
    es: 'Seguimiento de Presupuesto',
    it: 'Tracciamento Budget',
    pl: 'Śledzenie Budżetu',
    cn: '预算追踪',
    jp: '予算トラッカー'
  },
  'nav.invoicing': {
    en: 'Invoicing',
    hu: 'Számlázás',
    ro: 'Facturare',
    sk: 'Fakturácia',
    hr: 'Izdavanje Računa',
    de: 'Rechnungsstellung',
    fr: 'Facturation',
    es: 'Facturación',
    it: 'Fatturazione',
    pl: 'Fakturowanie',
    cn: '发票',
    jp: '請求書作成'
  },
  'nav.pomodoroTimer': {
    en: 'Pomodoro Timer',
    hu: 'Pomodoro Időmérő',
    ro: 'Cronometru Pomodoro',
    sk: 'Pomodoro Časovač',
    hr: 'Pomodoro Tajmer',
    de: 'Pomodoro-Timer',
    fr: 'Minuteur Pomodoro',
    es: 'Temporizador Pomodoro',
    it: 'Timer Pomodoro',
    pl: 'Licznik Pomodoro',
    cn: '番茄钟',
    jp: 'ポモドーロタイマー'
  },
  'nav.statistics': {
    en: 'Statistics',
    hu: 'Statisztikák',
    ro: 'Statistici',
    sk: 'Štatistiky',
    hr: 'Statistika',
    de: 'Statistiken',
    fr: 'Statistiques',
    es: 'Estadísticas',
    it: 'Statistiche',
    pl: 'Statystyki',
    cn: '统计',
    jp: '統計'
  },
  'nav.integrations': {
    en: 'Integrations',
    hu: 'Integrációk',
    ro: 'Integrări',
    sk: 'Integrácie',
    hr: 'Integracije',
    de: 'Integrationen',
    fr: 'Intégrations',
    es: 'Integraciones',
    it: 'Integrazioni',
    pl: 'Integracje',
    cn: '集成',
    jp: '統合'
  },
  'nav.navigation': {
    en: 'Navigation',
    hu: 'Navigáció',
    ro: 'Navigare',
    sk: 'Navigácia',
    hr: 'Navigacija',
    de: 'Navigation',
    fr: 'Navigation',
    es: 'Navegación',
    it: 'Navigazione',
    pl: 'Nawigacja',
    cn: '导航',
    jp: 'ナビゲーション'
  },

  // Header
  'header.title': {
    en: 'ContentPlanner Pro',
    hu: 'ContentPlanner Pro',
    ro: 'ContentPlanner Pro',
    sk: 'ContentPlanner Pro',
    hr: 'ContentPlanner Pro',
    de: 'ContentPlanner Pro',
    fr: 'ContentPlanner Pro',
    es: 'ContentPlanner Pro',
    it: 'ContentPlanner Pro',
    pl: 'ContentPlanner Pro',
    cn: '内容策划 Pro',
    jp: 'コンテンツプランナー Pro'
  },
  'header.subtitle': {
    en: 'Professional Planning for Content Creators',
    hu: 'Professzionális Tervezés Tartalomkészítőknek',
    ro: 'Planificare Profesională pentru Creatori de Conținut',
    sk: 'Profesionálne Plánovanie pre Tvorcov Obsahu',
    hr: 'Profesionalno Planiranje za Kreatore Sadržaja',
    de: 'Professionelle Planung für Content-Ersteller',
    fr: 'Planification Professionnelle pour Créateurs de Contenu',
    es: 'Planificación Profesional para Creadores de Contenido',
    it: 'Pianificazione Professionale per Creatori di Contenuti',
    pl: 'Profesjonalne Planowanie dla Twórców Treści',
    cn: '内容创作者的专业规划',
    jp: 'コンテンツクリエイターのためのプロフェッショナルな計画'
  },
  'header.lightTheme': {
    en: 'Light Theme',
    hu: 'Világos Téma',
    ro: 'Temă Luminoasă',
    sk: 'Svetlá Téma',
    hr: 'Svijetla Tema',
    de: 'Helles Thema',
    fr: 'Thème Clair',
    es: 'Tema Claro',
    it: 'Tema Chiaro',
    pl: 'Jasny Motyw',
    cn: '亮色主题',
    jp: 'ライトテーマ'
  },
  'header.darkTheme': {
    en: 'Dark Theme',
    hu: 'Sötét Téma',
    ro: 'Temă Întunecată',
    sk: 'Tmavá Téma',
    hr: 'Tamna Tema',
    de: 'Dunkles Thema',
    fr: 'Thème Sombre',
    es: 'Tema Oscuro',
    it: 'Tema Scuro',
    pl: 'Ciemny Motyw',
    cn: '暗色主题',
    jp: 'ダークテーマ'
  },
  'header.importExport': {
    en: 'Import/Export',
    hu: 'Importálás/Exportálás',
    ro: 'Import/Export',
    sk: 'Import/Export',
    hr: 'Uvoz/Izvoz',
    de: 'Import/Export',
    fr: 'Importer/Exporter',
    es: 'Importar/Exportar',
    it: 'Importa/Esporta',
    pl: 'Importuj/Eksportuj',
    cn: '导入/导出',
    jp: 'インポート/エクスポート'
  },
  'header.settings': {
    en: 'Settings',
    hu: 'Beállítások',
    ro: 'Setări',
    sk: 'Nastavenia',
    hr: 'Postavke',
    de: 'Einstellungen',
    fr: 'Paramètres',
    es: 'Configuración',
    it: 'Impostazioni',
    pl: 'Ustawienia',
    cn: '设置',
    jp: '設定'
  },

  // Integrations View
  'integrations.title': {
    en: 'Integrations & API Keys',
    hu: 'Integrációk és API Kulcsok',
    ro: 'Integrări și Chei API',
    sk: 'Integrácie a API Kľúče',
    hr: 'Integracije i API Ključevi',
    de: 'Integrationen & API-Schlüssel',
    fr: 'Intégrations et Clés API',
    es: 'Integraciones y Claves API',
    it: 'Integrazioni e Chiavi API',
    pl: 'Integracje i Klucze API',
    cn: '集成与 API 密钥',
    jp: '統合と API キー'
  },
  'integrations.subtitle': {
    en: 'Manage your connections to external services',
    hu: 'Kezeld a külső szolgáltatásokkal való kapcsolataidat',
    ro: 'Gestionează conexiunile la servicii externe',
    sk: 'Spravujte pripojenia k externým službám',
    hr: 'Upravljajte vezama s vanjskim uslugama',
    de: 'Verwalten Sie Ihre Verbindungen zu externen Diensten',
    fr: 'Gérez vos connexions aux services externes',
    es: 'Administra tus conexiones a servicios externos',
    it: 'Gestisci le tue connessioni ai servizi esterni',
    pl: 'Zarządzaj połączeniami z usługami zewnętrznymi',
    cn: '管理与外部服务的连接',
    jp: '外部サービスへの接続を管理'
  },
  'integrations.available': {
    en: 'Available Integrations',
    hu: 'Elérhető Integrációk',
    ro: 'Integrări Disponibile',
    sk: 'Dostupné Integrácie',
    hr: 'Dostupne Integracije',
    de: 'Verfügbare Integrationen',
    fr: 'Intégrations Disponibles',
    es: 'Integraciones Disponibles',
    it: 'Integrazioni Disponibili',
    pl: 'Dostępne Integracje',
    cn: '可用集成',
    jp: '利用可能な統合'
  },
  'integrations.connected': {
    en: 'Connected',
    hu: 'Csatlakoztatva',
    ro: 'Conectat',
    sk: 'Pripojené',
    hr: 'Povezano',
    de: 'Verbunden',
    fr: 'Connecté',
    es: 'Conectado',
    it: 'Connesso',
    pl: 'Połączono',
    cn: '已连接',
    jp: '接続済み'
  },
  'integrations.configure': {
    en: 'Configure',
    hu: 'Konfigurálás',
    ro: 'Configurare',
    sk: 'Konfigurovať',
    hr: 'Konfiguriraj',
    de: 'Konfigurieren',
    fr: 'Configurer',
    es: 'Configurar',
    it: 'Configura',
    pl: 'Konfiguruj',
    cn: '配置',
    jp: '設定'
  },
  'integrations.connect': {
    en: 'Connect',
    hu: 'Csatlakoztatás',
    ro: 'Conectare',
    sk: 'Pripojiť',
    hr: 'Poveži',
    de: 'Verbinden',
    fr: 'Connecter',
    es: 'Conectar',
    it: 'Connetti',
    pl: 'Połącz',
    cn: '连接',
    jp: '接続'
  },
  'integrations.disconnect': {
    en: 'Disconnect',
    hu: 'Leválasztás',
    ro: 'Deconectare',
    sk: 'Odpojiť',
    hr: 'Odspoji',
    de: 'Trennen',
    fr: 'Déconnecter',
    es: 'Desconectar',
    it: 'Disconnetti',
    pl: 'Rozłącz',
    cn: '断开连接',
    jp: '切断'
  },
  'integrations.enterKey': {
    en: 'Enter API Key',
    hu: 'API Kulcs Megadása',
    ro: 'Introduce Cheia API',
    sk: 'Zadajte API Kľúč',
    hr: 'Unesite API Ključ',
    de: 'API-Schlüssel eingeben',
    fr: 'Entrez la Clé API',
    es: 'Introducir Clave API',
    it: 'Inserisci Chiave API',
    pl: 'Wprowadź Klucz API',
    cn: '输入 API 密钥',
    jp: 'API キーを入力'
  },
  'integrations.getKey': {
    en: 'Get your API key here',
    hu: 'Szerezd be az API kulcsodat itt',
    ro: 'Obține cheia API aici',
    sk: 'Získajte API kľúč tu',
    hr: 'Nabavite svoj API ključ ovdje',
    de: 'Holen Sie sich Ihren API-Schlüssel hier',
    fr: 'Obtenez votre clé API ici',
    es: 'Obtén tu clave API aquí',
    it: 'Ottieni la tua chiave API qui',
    pl: 'Uzyskaj klucz API tutaj',
    cn: '在这里获取 API 密钥',
    jp: 'API キーをここで取得'
  },
  'integrations.testConnection': {
    en: 'Test Connection',
    hu: 'Kapcsolat Tesztelése',
    ro: 'Testează Conexiunea',
    sk: 'Testovať Pripojenie',
    hr: 'Testiraj Vezu',
    de: 'Verbindung testen',
    fr: 'Tester la Connexion',
    es: 'Probar Conexión',
    it: 'Testa Connessione',
    pl: 'Testuj Połączenie',
    cn: '测试连接',
    jp: '接続をテスト'
  },

  // Pomodoro Timer
  'pomodoro.title': {
    en: 'Pomodoro Timer',
    hu: 'Pomodoro Időmérő',
    ro: 'Cronometru Pomodoro',
    sk: 'Pomodoro Časovač',
    hr: 'Pomodoro Tajmer',
    de: 'Pomodoro-Timer',
    fr: 'Minuteur Pomodoro',
    es: 'Temporizador Pomodoro',
    it: 'Timer Pomodoro',
    pl: 'Licznik Pomodoro',
    cn: '番茄钟',
    jp: 'ポモドーロタイマー'
  },
  'pomodoro.subtitle': {
    en: 'Boost your productivity with focused work sessions',
    hu: 'Növeld a produktivitásod fókuszált munkamenetekkel',
    ro: 'Crește productivitatea cu sesiuni de lucru concentrate',
    sk: 'Zvýšte svoju produktivitu pomocou sústredených pracovných relácií',
    hr: 'Povećajte produktivnost fokusiranim radnim sesijama',
    de: 'Steigern Sie Ihre Produktivität mit fokussierten Arbeitssitzungen',
    fr: 'Augmentez votre productivité avec des sessions de travail ciblées',
    es: 'Aumenta tu productividad con sesiones de trabajo enfocadas',
    it: 'Aumenta la tua produttività con sessioni di lavoro mirate',
    pl: 'Zwiększ swoją produktywność dzięki sesjom skupienia',
    cn: '通过专注的工作时段提高生产力',
    jp: '集中した作業セッションで生産性を向上'
  },
  'pomodoro.focusTime': {
    en: 'Focus Time',
    hu: 'Fókuszidő',
    ro: 'Timp de Concentrare',
    sk: 'Čas Sústredenia',
    hr: 'Vrijeme Fokusa',
    de: 'Fokuszeit',
    fr: 'Temps de Concentration',
    es: 'Tiempo de Enfoque',
    it: 'Tempo di Concentrazione',
    pl: 'Czas Skupienia',
    cn: '专注时间',
    jp: 'フォーカスタイム'
  },
  'pomodoro.shortBreak': {
    en: 'Short Break',
    hu: 'Rövid Szünet',
    ro: 'Pauză Scurtă',
    sk: 'Krátka Prestávka',
    hr: 'Kratka Pauza',
    de: 'Kurze Pause',
    fr: 'Courte Pause',
    es: 'Descanso Corto',
    it: 'Pausa Breve',
    pl: 'Krótka Przerwa',
    cn: '短休息',
    jp: '短い休憩'
  },
  'pomodoro.longBreak': {
    en: 'Long Break',
    hu: 'Hosszú Szünet',
    ro: 'Pauză Lungă',
    sk: 'Dlhá Prestávka',
    hr: 'Duga Pauza',
    de: 'Lange Pause',
    fr: 'Longue Pause',
    es: 'Descanso Largo',
    it: 'Pausa Lunga',
    pl: 'Długa Przerwa',
    cn: '长休息',
    jp: '長い休憩'
  },
  'pomodoro.start': {
    en: 'Start',
    hu: 'Indítás',
    ro: 'Start',
    sk: 'Štart',
    hr: 'Start',
    de: 'Start',
    fr: 'Démarrer',
    es: 'Iniciar',
    it: 'Avvia',
    pl: 'Start',
    cn: '开始',
    jp: '開始'
  },
  'pomodoro.pause': {
    en: 'Pause',
    hu: 'Szünet',
    ro: 'Pauză',
    sk: 'Pauza',
    hr: 'Pauza',
    de: 'Pause',
    fr: 'Pause',
    es: 'Pausa',
    it: 'Pausa',
    pl: 'Pauza',
    cn: '暂停',
    jp: '一時停止'
  },
  'pomodoro.reset': {
    en: 'Reset',
    hu: 'Visszaállítás',
    ro: 'Resetare',
    sk: 'Resetovať',
    hr: 'Reset',
    de: 'Zurücksetzen',
    fr: 'Réinitialiser',
    es: 'Reiniciar',
    it: 'Ripristina',
    pl: 'Resetuj',
    cn: '重置',
    jp: 'リセット'
  },

  // Common
  'common.save': {
    en: 'Save',
    hu: 'Mentés',
    ro: 'Salvare',
    sk: 'Uložiť',
    hr: 'Spremi',
    de: 'Speichern',
    fr: 'Enregistrer',
    es: 'Guardar',
    it: 'Salva',
    pl: 'Zapisz',
    cn: '保存',
    jp: '保存'
  },
  'common.cancel': {
    en: 'Cancel',
    hu: 'Mégse',
    ro: 'Anulare',
    sk: 'Zrušiť',
    hr: 'Odustani',
    de: 'Abbrechen',
    fr: 'Annuler',
    es: 'Cancelar',
    it: 'Annulla',
    pl: 'Anuluj',
    cn: '取消',
    jp: 'キャンセル'
  },
  'common.delete': {
    en: 'Delete',
    hu: 'Törlés',
    ro: 'Ștergere',
    sk: 'Vymazať',
    hr: 'Izbriši',
    de: 'Löschen',
    fr: 'Supprimer',
    es: 'Eliminar',
    it: 'Elimina',
    pl: 'Usuń',
    cn: '删除',
    jp: '削除'
  },
  'common.edit': {
    en: 'Edit',
    hu: 'Szerkesztés',
    ro: 'Editare',
    sk: 'Upraviť',
    hr: 'Uredi',
    de: 'Bearbeiten',
    fr: 'Modifier',
    es: 'Editar',
    it: 'Modifica',
    pl: 'Edytuj',
    cn: '编辑',
    jp: '編集'
  },

  // Settings
  'settings.appearance': {
    en: 'Appearance',
    hu: 'Megjelenés',
    ro: 'Aspect',
    sk: 'Vzhľad',
    hr: 'Izgled',
    de: 'Erscheinungsbild',
    fr: 'Apparence',
    es: 'Apariencia',
    it: 'Aspetto',
    pl: 'Wygląd',
    cn: '外观',
    jp: '外観'
  },
  'settings.language': {
    en: 'Language',
    hu: 'Nyelv',
    ro: 'Limbă',
    sk: 'Jazyk',
    hr: 'Jezik',
    de: 'Sprache',
    fr: 'Langue',
    es: 'Idioma',
    it: 'Lingua',
    pl: 'Język',
    cn: '语言',
    jp: '言語'
  },
  'settings.dataPrivacy': {
    en: 'Data & Privacy',
    hu: 'Adatok és Adatvédelem',
    ro: 'Date și Confidențialitate',
    sk: 'Údaje a Súkromie',
    hr: 'Podaci i Privatnost',
    de: 'Daten & Datenschutz',
    fr: 'Données et Confidentialité',
    es: 'Datos y Privacidad',
    it: 'Dati e Privacy',
    pl: 'Dane i Prywatność',
    cn: '数据与隐私',
    jp: 'データとプライバシー'
  }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    // Validate saved language
    const validLanguages: Language[] = ['en', 'hu', 'ro', 'sk', 'hr', 'de', 'fr', 'es', 'it', 'pl', 'cn', 'jp'];
    return (saved && validLanguages.includes(saved as Language)) ? (saved as Language) : 'en';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const t = (key: string): string => {
    if (!translations[key]) {
      console.warn(`Missing translation for key: ${key}`);
      return key.split('.').pop() || key;
    }
    return translations[key][language] || translations[key]['en'] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};