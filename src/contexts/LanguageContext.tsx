import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'hu' | 'ro' | 'sk' | 'hr' | 'de' | 'fr' | 'es' | 'it' | 'pl' | 'cn' | 'jp' | 'pt' | 'tr' | 'ar' | 'ru' | 'hi' | 'bn' | 'ur' | 'th' | 'id';

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
  pt: 'Português',
  tr: 'Türkçe',
  ar: 'العربية',
  ru: 'Русский',
  hi: 'हिन्दी',
  bn: 'বাংলা',
  ur: 'اردو',
  th: 'ไทย',
  id: 'Bahasa Indonesia',
};

interface Translations {
  [key: string]: {
    [key in Language]: string;
  };
}

const translations: Translations = {
  // Invoicing View
  'invoicing.title': {
    en: 'Invoicing & Clients',
    hu: 'Számlázás és Ügyfélkezelés',
    ro: 'Facturare și Clienți',
    sk: 'Fakturácia a Klienti',
    hr: 'Izdavanje Računa i Klijenti',
    de: 'Rechnungsstellung & Kunden',
    fr: 'Facturation et Clients',
    es: 'Facturación y Clientes',
    it: 'Fatturazione e Clienti',
    pl: 'Fakturowanie i Klienci',
    cn: '发票与客户',
    jp: '請求書とクライアント',
    pt: 'Faturação e Clientes',
    tr: 'Faturalama ve Müşteriler',
    ar: 'الفواتير والعملاء',
    ru: 'Счета и Клиенты',
    hi: 'चालान और ग्राहक',
    bn: 'ইনভয়েসিং এবং ক্লায়েন্ট',
    ur: 'انوائسنگ और ग्राहक',
    th: 'การออกใบแจ้งหนี้และลูกค้า',
    id: 'Faktur & Klien'
  },
  'invoicing.subtitle': {
    en: 'Manage your financials and client relationships in one place',
    hu: 'Kezeld pénzügyeidet és ügyfélkapcsolataidat professzionális szinten',
    ro: 'Gestionează finanțele și relațiile cu clienții',
    sk: 'Spravujte financie a vzťahy s klientmi',
    hr: 'Upravljajte financijama i odnosima s klijentima',
    de: 'Verwalten Sie Finanzen und Kundenbeziehungen',
    fr: 'Gérez vos finances et relations clients',
    es: 'Gestiona tus finanzas y relaciones con clientes',
    it: 'Gestisci finanze e relazioni con i clienti',
    pl: 'Zarządzaj finansami i relacjami z klientami',
    cn: '在一处管理您的财务和客户关系',
    jp: '財務とクライアント関係を一か所で管理',
    pt: 'Gerencie suas finanças e relacionamentos com clientes',
    tr: 'Finansmanınızı ve müşteri ilişkilerinizi tek bir yerden yönetin',
    ar: 'âdara al-mālīyāt wa-ʿalāqāt al-ʿumalāʾ fī makān wāḥid',
    ru: 'Управляйте финансами и клиентами в одном месте',
    hi: 'अपने वित्त और ग्राहक संबंधों को एक ही स्थान पर प्रबंधित करें',
    bn: 'আপনার আর্থিক এবং ক্লায়েন্ট সম্পর্কগুলি এক জায়গায় পরিচালনা করুন',
    ur: 'apne māliyāt aur gāhak taʿalluqāt ka intizām ek hī jagah karein',
    th: 'จัดการการเงินและความสัมพันธ์กับลูกค้าในที่เดียว',
    id: 'Kelola keuangan dan hubungan klien Anda di satu tempat'
  },
  'invoicing.dashboard': { en: 'Dashboard', hu: 'Vezérlőpult', ro: 'Tablou de Bord', sk: 'Nástenka', hr: 'Nadzorna Ploča', de: 'Dashboard', fr: 'Tableau de Bord', es: 'Panel', it: 'Cruscotto', pl: 'Pulpit', cn: '仪表盘', jp: 'ダッシュボード', pt: 'Painel', tr: 'Panel', ar: 'لوحة القيادة', ru: 'Дашборд', hi: 'डैशबोर्ड', bn: 'ড্যাশবোর্ড', ur: 'ڈیش بورڈ', th: 'แดชบอร์ด', id: 'Dasbor' },
  'invoicing.invoices': { en: 'Invoices', hu: 'Számlák', ro: 'Facturi', sk: 'Faktúry', hr: 'Računi', de: 'Rechnungen', fr: 'Factures', es: 'Facturas', it: 'Fatture', pl: 'Faktury', cn: '发票', jp: '請求書', pt: 'Faturas', tr: 'Faturalar', ar: 'الفواتير', ru: 'Счета', hi: 'चालान', bn: 'ইনভয়েস', ur: 'انوائس', th: 'ใบแจ้งหนี้', id: 'Faktur' },
  'invoicing.clients': { en: 'Clients', hu: 'Ügyfelek', ro: 'Clienți', sk: 'Klienti', hr: 'Klijenti', de: 'Kunden', fr: 'Clients', es: 'Clientes', it: 'Clienti', pl: 'Klienci', cn: '客户', jp: 'クライアント', pt: 'Clientes', tr: 'Müşteriler', ar: 'العملاء', ru: 'Клиенты', hi: 'ग्राहक', bn: 'ক্লায়েন্ট', ur: 'صارفین', th: 'ลูกค้า', id: 'Klien' },
  'invoicing.analytics': { en: 'Analytics', hu: 'Üzleti Elemzés', ro: 'Analize', sk: 'Analytika', hr: 'Analitika', de: 'Analysen', fr: 'Analyses', es: 'Análisis', it: 'Analisi', pl: 'Analityka', cn: '分析', jp: '分析', pt: 'Análises', tr: 'Analitik', ar: 'التحليلات', ru: 'Аналитика', hi: 'विश्लेषण', bn: 'বিশ্লেষণ', ur: 'تجزیات', th: 'การวิเคราะห์', id: 'Analitik' },

  // Invoicing - New Keys
  'invoicing.createInvoice': { en: 'Create Invoice', hu: 'Számla Létrehozása', ro: 'Creează Factură', sk: 'Vytvoriť Faktúru' },
  'invoicing.totalRevenue': { en: 'Total Revenue', hu: 'Teljes Bevétel', ro: 'Venit Total', sk: 'Celkové Príjmy' },
  'invoicing.pending': { en: 'Pending', hu: 'Függőben', ro: 'În Așteptare', sk: 'Čakajúce' },
  'invoicing.overdue': { en: 'Overdue', hu: 'Lejárt', ro: 'Restant', sk: 'Po splatnosti' },
  'invoicing.searchPlaceholder': { en: 'Search invoices...', hu: 'Számlák keresése...', ro: 'Caută facturi...', sk: 'Hľadať faktúry...' },
  'invoicing.invoiceNumber': { en: 'Invoice Number', hu: 'Bizonylatszám', ro: 'Număr Factură', sk: 'Číslo Faktúry' },
  'invoicing.status': { en: 'Status', hu: 'Állapot', ro: 'Stare', sk: 'Stav' },
  'invoicing.name': { en: 'Name', hu: 'Név', ro: 'Nume', sk: 'Meno' },
  'invoicing.company': { en: 'Company', hu: 'Cég', ro: 'Companie', sk: 'Spoločnosť' },
  'invoicing.email': { en: 'Email', hu: 'Email', ro: 'Email', sk: 'Email' },
  'invoicing.address': { en: 'Address', hu: 'Cím', ro: 'Adresă', sk: 'Adresa' },
  'invoicing.addClient': { en: 'Add Client', hu: 'Ügyfél Hozzáadása', ro: 'Adaugă Client', sk: 'Pridať Klienta' },
  'invoicing.addItem': { en: 'Add Item', hu: 'Tétel Hozzáadása', ro: 'Adaugă Articol', sk: 'Pridať Položku' },
  'invoicing.saveInvoice': { en: 'Save Invoice', hu: 'Számla Mentése', ro: 'Salvează Factura', sk: 'Uložiť Faktúru' },
  'invoicing.autoSaved': { en: 'Auto-saved', hu: 'Automatikusan mentve', ro: 'Salvat automat', sk: 'Automaticky uložené' },
  'invoicing.fromLastMonth': { en: 'from last month', hu: 'az elmúlt hónaphoz képest', ro: 'față de luna trecută', sk: 'oproti minulému mesiacu' },
  'invoicing.subscriptionsRecurring': { en: 'Recurring Subscriptions', hu: 'Ismétlődő Előfizetések', ro: 'Abonamente Recurente', sk: 'Opakované Predplatné' },

  // Invoicing Statuses
  'invoicing.statusCancelled': { en: 'Cancelled', hu: 'Törölve', ro: 'Anulat', sk: 'Zrušené' },
  'invoicing.statusDraft': { en: 'Draft', hu: 'Piszkozat', ro: 'Ciornă', sk: 'Návrh' },
  'invoicing.statusSent': { en: 'Sent', hu: 'Elküldve', ro: 'Trimis', sk: 'Odoslané' },
  'invoicing.statusPaid': { en: 'Paid', hu: 'Fizetve', ro: 'Plătit', sk: 'Zaplatené' },
  'invoicing.statusOverdue': { en: 'Overdue', hu: 'Késedelmes', ro: 'Restant', sk: 'Po splatnosti' },

  // Budget
  'budget.title': { en: 'Budget Tracker', hu: 'Költségvetés Követő', ro: 'Urmărire Buget', sk: 'Sledovanie Rozpočtu' },
  'budget.subtitle': { en: 'Track income, expenses, and financial goals', hu: 'Bevételek, kiadások és pénzügyi célok követése', ro: 'Urmărește veniturile, cheltuielile și obiectivele financiare', sk: 'Sledujte príjmy, výdavky a finančné ciele' },
  'budget.addTransaction': { en: 'Add Transaction', hu: 'Tranzakció Hozzáadása', ro: 'Adaugă Tranzacție', sk: 'Pridať Transakciu' },
  'budget.balance': { en: 'Total Balance', hu: 'Egyenleg', ro: 'Sold Total', sk: 'Celkový Zostatok' },
  'budget.income': { en: 'Total Income', hu: 'Bevételek', ro: 'Venit Total', sk: 'Celkový Príjem' },
  'budget.expense': { en: 'Total Expense', hu: 'Kiadások', ro: 'Cheltuieli Totale', sk: 'Celkové Výdavky' },
  'budget.cashFlow': { en: 'Cash Flow', hu: 'Cash Flow', ro: 'Flux de Numerar', sk: 'Peňažný Tok' },
  'budget.expenseCategories': { en: 'Expense Breakdown', hu: 'Kiadások Kategóriánként', ro: 'Defalcare Cheltuieli', sk: 'Rozdelenie Výdavkov' },
  'budget.transactions': { en: 'Recent Transactions', hu: 'Legutóbbi Tranzakciók', ro: 'Tranzacții Recente', sk: 'Nedávne Transakcie' },
  'budget.noTransactions': { en: 'No transactions found', hu: 'Nincsenek tranzakciók', ro: 'Nicio tranzacție găsită', sk: 'Žiadne transakcie sa nenašli' },
  'budget.name': { en: 'Transaction Name', hu: 'Megnevezés', ro: 'Nume Tranzacție', sk: 'Názov Transakcie' },
  'budget.amount': { en: 'Amount', hu: 'Összeg', ro: 'Sumă', sk: 'Suma' },
  'budget.category': { en: 'Category', hu: 'Kategória', ro: 'Categorie', sk: 'Kategória' },
  'budget.monthlyFixed': { en: 'Monthly Fixed Costs', hu: 'Havi Fix Költségek', ro: 'Costuri Fixe Lunare', sk: 'Mesačné Fixné Náklady' },

  // Common
  'common.close': { en: 'Close', hu: 'Bezárás', ro: 'Închide', sk: 'Zavrieť' },
  'common.save': { en: 'Save', hu: 'Mentés', ro: 'Salvează', sk: 'Uložiť' },
  'common.cancel': { en: 'Cancel', hu: 'Mégsem', ro: 'Anulează', sk: 'Zrušiť' },
  'common.viewAll': { en: 'View All', hu: 'Összes Megtekintése', ro: 'Vezi Tot', sk: 'Zobraziť Všetko' },
  'common.filter': { en: 'Filter', hu: 'Szűrés', ro: 'Filtrează', sk: 'Filter' },
  'common.actions': { en: 'Actions', hu: 'Műveletek', ro: 'Acțiuni', sk: 'Akcie' },
  'common.success': { en: 'Success', hu: 'Siker', ro: 'Succes', sk: 'Úspech' },
  'common.error': { en: 'Error', hu: 'Hiba', ro: 'Eroare', sk: 'Chyba' },
  // ... (adding more keys for invoicing)

  // Hourly View
  'hourly.title': {
    en: 'Hourly Time Blocking',
    hu: 'Óránkénti Időbeosztás',
    ro: 'Blocare Orară',
    sk: 'Hodinové Blokovanie',
    hr: 'Satno Blokiranje',
    de: 'Stundenblockierung',
    fr: 'Blocage Horaire',
    es: 'Bloqueo Horario',
    it: 'Blocco Orario',
    pl: 'Blokowanie Godzinowe',
    cn: '每小时时间块',
    jp: '毎時の時間ブロック',
    pt: 'Bloqueio de Tempo',
    tr: 'Saatlik Zaman Bloklama',
    ar: 'حجب الوقت بالساعة',
    ru: 'Почасовое Планирование',
    hi: 'प्रति घंटा समय ब्लॉक',
    bn: 'ঘণ্টা অনুযায়ী সময় ব্লকিং',
    ur: 'گھنٹہ وار ٹائم بلاکنگ',
    th: 'การบล็อกเวลารายชั่วโมง',
    id: 'Pemblokiran Waktu Per Jam'
  },
  'hourly.subtitle': {
    en: 'Detailed hourly scheduling for maximum productivity',
    hu: 'Részletes órarend a maximális produktivitásért',
    ro: 'Programare orară detaliată',
    sk: 'Podrobné hodinové plánovanie',
    hr: 'Detaljno satno planiranje',
    de: 'Detaillierte Stundenplanung',
    fr: 'Planification horaire détaillée',
    es: 'Programación horaria detallada',
    it: 'Pianificazione oraria dettagliata',
    pl: 'Szczegółowe planowanie godzinowe',
    cn: '详细的每小时安排',
    jp: '詳細な時間割',
    pt: 'Agendamento horário detalhado',
    tr: 'Detaylı saatlik planlama',
    ar: 'جدولة مفصلة بالساعة',
    ru: 'Детальное почасовое расписание',
    hi: 'विस्तृत प्रति घंटा अनुसूची',
    bn: 'বিস্তারিত ঘণ্টা সময়সূচী',
    ur: 'تفصیلی گھنٹہ وار شیڈولिंग',
    th: 'ตารางเวลารายชั่วโมงอย่างละเอียด',
    id: 'Penjadwalan per jam yang rinci'
  },

  // Goals View
  'goals.title': {
    en: 'Goals & Milestones',
    hu: 'Célkitűzések és Mérföldkövek',
    ro: 'Obiective și Repere',
    sk: 'Ciele a Míľniky',
    hr: 'Ciljevi i Prekretnice',
    de: 'Ziele & Meilensteine',
    fr: 'Objectifs & Etapes',
    es: 'Metas e Hitos',
    it: 'Obiettivi e Traguardi',
    pl: 'Cele i Kamienie Milowe',
    cn: '目标与里程碑',
    jp: '目標とマイルストーン',
    pt: 'Metas e Marcos',
    tr: 'Hedefler ve Kilometre Taşları',
    ar: 'الأهداف والمعالم',
    ru: 'Цели и Вехи',
    hi: 'लक्ष्य और मील के पत्थर',
    bn: 'লক্ষ্য এবং মাইলফলক',
    ur: 'اہداف اور سنگ میل',
    th: 'เป้าหมายและเหตุการณ์สำคัญ',
    id: 'Tujuan & Tonggak Sejarah'
  },

  // Navigation
  'nav.hourlyPlanning': { en: 'Hourly Planning', hu: 'Órarend', ro: 'Planificare Orară', sk: 'Hodinové Plánovanie', hr: 'Satno Planiranje', de: 'Stundenplanung', fr: 'Planification Horaire', es: 'Planificación Horaria', it: 'Pianificazione Oraria', pl: 'Planowanie Godzinowe', cn: '每小时计划', jp: '時間ごとの計画', pt: 'Planejamento Horário', tr: 'Saatlik Planlama', ar: 'التخطيط الساعي', ru: 'Почасовое Планирование', hi: 'प्रति घंटा योजना', bn: 'ঘণ্টা পরিকল্পনা', ur: 'گھنٹہ وار منصوبہ بندی', th: 'การวางแผนรายชั่วโมง', id: 'Perencanaan Per Jam' },
  'nav.dailyPlanning': { en: 'Daily Planning', hu: 'Napi Terv', ro: 'Planificare Zilnică', sk: 'Denné Plánovanie', hr: 'Dnevno Planiranje', de: 'Tagesplanung', fr: 'Planification Quotidienne', es: 'Planificación Diaria', it: 'Pianificazione Giornaliera', pl: 'Planowanie Dzienne', cn: '每日计划', jp: '日次計画', pt: 'Planejamento Diário', tr: 'Günlük Planlama', ar: 'التخطيط اليومي', ru: 'Ежедневное Планирование', hi: 'दैनिक योजना', bn: 'দৈনিক পরিকল্পনা', ur: 'روزانہ منصوبہ بندی', th: 'การวางแผนรายวัน', id: 'Perencanaan Harian' },
  'nav.weeklyPlanning': { en: 'Weekly Planning', hu: 'Heti Terv', ro: 'Planificare Săptămânală', sk: 'Týždenné Plánovanie', hr: 'Tjedno Planiranje', de: 'Wochenplanung', fr: 'Planification Hebdomadaire', es: 'Planificación Semanal', it: 'Pianificazione Settimanale', pl: 'Planowanie Tygodniowe', cn: '每周计划', jp: '週次計画', pt: 'Planejamento Semanal', tr: 'Haftalık Planlama', ar: 'التخطيط الأسبوعي', ru: 'Еженедельное Планирование', hi: 'साप्ताहिक योजना', bn: 'সাপ্তাহিক পরিকল্পনা', ur: 'ہفتہ وار منصوبہ بندی', th: 'การวางแผนรายสัปดาห์', id: 'Perencanaan Mingguan' },
  'nav.monthlyPlanning': { en: 'Monthly Planning', hu: 'Havi Terv', ro: 'Planificare Lunară', sk: 'Mesačné Plánovanie', hr: 'Mjesečno Planiranje', de: 'Monatsplanung', fr: 'Planification Mensuelle', es: 'Planificación Mensual', it: 'Pianificazione Mensile', pl: 'Planowanie Miesięczne', cn: '每月计划', jp: '月次計画', pt: 'Planejamento Mensal', tr: 'Aylık Planlama', ar: 'التخطيط الشهري', ru: 'Ежемесячное Планирование', hi: 'मासिक योजना', bn: 'মাসিক পরিকল্পনা', ur: 'ماہانہ منصوبہ بندی', th: 'การวางแผนรายเดือน', id: 'Perencanaan Bulanan' },
  'nav.yearlyPlanning': { en: 'Yearly Planning', hu: 'Éves Terv', ro: 'Planificare Anuală', sk: 'Ročné Plánovanie', hr: 'Godišnje Planiranje', de: 'Jahresplanung', fr: 'Planification Annuelle', es: 'Planificación Anual', it: 'Pianificazione Annuale', pl: 'Planowanie Roczne', cn: '年度计划', jp: '年次計画', pt: 'Planejamento Anual', tr: 'Yıllık Planlama', ar: 'التخطيط السنوي', ru: 'Годовое Планирование', hi: 'वार्षिक योजना', bn: 'বার্ষিক পরিকল্পনা', ur: 'سالانہ منصوبہ بندی', th: 'การวางแผนรายปี', id: 'Perencanaan Tahunan' },
  'nav.smartNotes': { en: 'Smart Notes', hu: 'Okos Jegyzetek', ro: 'Notițe Inteligente', sk: 'Inteligentné Poznámky', hr: 'Pametne Bilješke', de: 'Intelligente Notizen', fr: 'Notes Intelligentes', es: 'Notas Inteligentes', it: 'Note Intelligenti', pl: 'Inteligentne Notatki', cn: '智能笔记', jp: 'スマートノート', pt: 'Notas Inteligentes', tr: 'Akıllı Notlar', ar: 'ملاحظات ذكية', ru: 'Умные Заметки', hi: 'स्मार्ट नोट्स', bn: 'স্মার্ট নোট', ur: 'اسمارٹ نوٹس', th: 'โน้ตอัจฉริยะ', id: 'Catatan Cerdas' },
  'nav.goals': { en: 'Goals & Milestones', hu: 'Célok', ro: 'Obiective și Repere', sk: 'Ciele a Míľniky', hr: 'Ciljevi i Prekretnice', de: 'Ziele & Meilensteine', fr: 'Objectifs & Jalons', es: 'Objetivos y Hitos', it: 'Obiettivi e Traguardi', pl: 'Cele i Kamienie Milowe', cn: '目标与里程碑', jp: '目標とマイルストーン', pt: 'Metas e Marcos', tr: 'Hedefler', ar: 'الأهداف', ru: 'Цели', hi: 'लक्ष्य', bn: 'লক্ষ্য', ur: 'اہداف', th: 'เป้าหมาย', id: 'Tujuan' },
  'nav.visualPlanning': { en: 'Visual Planning', hu: 'Vizuális Terv', ro: 'Planificare Vizuală', sk: 'Vizuálne Plánovanie', hr: 'Vizualno Planiranje', de: 'Visuelle Planung', fr: 'Planification Visuelle', es: 'Planificación Visual', it: 'Pianificazione Visiva', pl: 'Planowanie Wizualne', cn: '视觉规划', jp: 'ビジュアルプランニング', pt: 'Planejamento Visual', tr: 'Görsel Planlama', ar: 'التخطيط المرئي', ru: 'Визуальное Планирование', hi: 'दृश्य योजना', bn: 'ভিজ্যুয়াল পরিকল্পনা', ur: 'بصری منصوبہ بندی', th: 'การวางแผนภาพ', id: 'Perencanaan Visual' },
  'nav.budgetTracker': { en: 'Budget Tracker', hu: 'Költségvetés', ro: 'Urmărire Buget', sk: 'Sledovanie Rozpočtu', hr: 'Praćenje Budžeta', de: 'Budget-Tracker', fr: 'Suivi du Budget', es: 'Seguimiento de Presupuesto', it: 'Tracciamento Budget', pl: 'Śledzenie Budżetu', cn: '预算追踪', jp: '予算トラッカー', pt: 'Rastreador de Orçamento', tr: 'Bütçe Takibi', ar: 'تتبع الميزانية', ru: 'Трекер Бюджета', hi: 'बजट ट्रैकर', bn: 'বাজেট ট্র্যাকার', ur: 'بجٹ ٹریکر', th: 'ตัวติดตามงบประมาณ', id: 'Pelacak Anggaran' },
  'nav.invoicing': { en: 'Invoicing', hu: 'Számlázó', ro: 'Facturare', sk: 'Fakturácia', hr: 'Izdavanje Računa', de: 'Rechnungsstellung', fr: 'Facturation', es: 'Facturación', it: 'Fatturazione', pl: 'Fakturowanie', cn: '发票', jp: '請求書作成', pt: 'Faturamento', tr: 'Faturalama', ar: 'الفواتير', ru: 'Выставление счетов', hi: 'चालान', bn: 'ইনভয়েসিং', ur: 'انوائسنگ', th: 'การออกใบแจ้งหนี้', id: 'Faktur' },
  'nav.pomodoroTimer': { en: 'Pomodoro Timer', hu: 'Pomodoro', ro: 'Cronometru Pomodoro', sk: 'Pomodoro Časovač', hr: 'Pomodoro Tajmer', de: 'Pomodoro-Timer', fr: 'Minuteur Pomodoro', es: 'Temporizador Pomodoro', it: 'Timer Pomodoro', pl: 'Licznik Pomodoro', cn: '番茄钟', jp: 'ポモドーロタイマー', pt: 'Temporizador Pomodoro', tr: 'Pomodoro Zamanlayıcı', ar: 'مؤقت بومودورو', ru: 'Таймер Помодоро', hi: 'पोमोडोरो टाइमर', bn: 'পোমোডোরো টাইমার', ur: 'پومودورو ٹائمر', th: 'ตัวจับเวลาโพโมโดโร', id: 'Pengatur Waktu Pomodoro' },
  'nav.statistics': { en: 'Statistics', hu: 'Statisztika', ro: 'Statistici', sk: 'Štatistiky', hr: 'Statistika', de: 'Statistiken', fr: 'Statistiques', es: 'Estadísticas', it: 'Statistiche', pl: 'Statystyki', cn: '统计', jp: '統計', pt: 'Estatísticas', tr: 'İstatistikler', ar: 'الإحصائيات', ru: 'Статистика', hi: 'आंकड़े', bn: 'পরিসংখ্যান', ur: 'اعداد و شمار', th: 'สถิติ', id: 'Statistik' },
  'nav.integrations': { en: 'Integrations', hu: 'Integrációk', ro: 'Integrări', sk: 'Integrácie', hr: 'Integracije', de: 'Integrationen', fr: 'Intégrations', es: 'Integraciones', it: 'Integrazioni', pl: 'Integracje', cn: '集成', jp: '統合', pt: 'Integrações', tr: 'Entegrasyonlar', ar: 'التكامل', ru: 'Интеграции', hi: 'एकीकरण', bn: 'ঐক্যবদ্ধতা', ur: 'انضمام', th: 'การรวมเข้าด้วยกัน', id: 'Integrasi' },
  'nav.navigation': { en: 'Navigation', hu: 'Navigáció', ro: 'Navigare', sk: 'Navigácia', hr: 'Navigacija', de: 'Navigation', fr: 'Navigation', es: 'Navegación', it: 'Navigazione', pl: 'Nawigacja', cn: '导航', jp: 'ナビゲーション', pt: 'Navegação', tr: 'Navigasyon', ar: 'التنقل', ru: 'Навигация', hi: 'नेविगेशन', bn: 'নেভিগেশন', ur: 'نیویگیشن', th: 'การนำทาง', id: 'Navigasi' },

  // Settings
  'settings.title': { en: 'Settings', hu: 'Beállítások', ro: 'Setări', sk: 'Nastavenia', hr: 'Postavke', de: 'Einstellungen', fr: 'Paramètres', es: 'Configuración', it: 'Impostazioni', pl: 'Ustawienia', cn: '设置', jp: '設定', pt: 'Configurações', tr: 'Ayarlar', ar: 'الإعدادات', ru: 'Настройки', hi: 'सेटिंग्स', bn: 'সেটিংস', ur: 'ترتیبات', th: 'การตั้งค่า', id: 'Pengaturan' },
  'settings.subtitle': { en: 'Manage preferences', hu: 'Személyre szabás', ro: 'Gestionează preferințele', sk: 'Spravovať predvoľby', hr: 'Upravljanje postavkama', de: 'Einstellungen verwalten', fr: 'Gérer les préférences', es: 'Gestionar preferencias', it: 'Gestisci preferenze', pl: 'Zarządzaj preferencjami', cn: '管理首选项', jp: '設定を管理', pt: 'Gerenciar preferências', tr: 'Tercihleri Yönet', ar: 'إدارة التفضيلات', ru: 'Управление настройками', hi: 'प्राथमिकताओं को प्रबंधित करें', bn: 'পছন্দগুলি পরিচালনা করুন', ur: 'ترجیحات کا انتظام', th: 'จัดการการตั้งค่า', id: 'Kelola preferensi' },
  'settings.language': { en: 'Language', hu: 'Nyelv', ro: 'Limbă', sk: 'Jazyk', hr: 'Jezik', de: 'Sprache', fr: 'Langue', es: 'Idioma', it: 'Lingua', pl: 'Język', cn: '语言', jp: '言語', pt: 'Idioma', tr: 'Dil', ar: 'اللغة', ru: 'Язык', hi: 'भाषा', bn: 'ভাষা', ur: 'زبان', th: 'ภาษา', id: 'Bahasa' },
  'settings.general': { en: 'General', hu: 'Általános', ro: 'General', sk: 'Všeobecné', hr: 'Općenito', de: 'Allgemein', fr: 'Général', es: 'General', it: 'Generale', pl: 'Ogólne', cn: '常规', jp: '一般', pt: 'Geral', tr: 'Genel', ar: 'عام', ru: 'Общее', hi: 'सामान्य', bn: 'সাধারণ', ur: 'عام', th: 'ทั่วไป', id: 'Umum' },
  'settings.budget': { en: 'Budget', hu: 'Pénzügyek', ro: 'Buget', sk: 'Rozpočet', hr: 'Proračun', de: 'Budget', fr: 'Budget', es: 'Presupuesto', it: 'Budget', pl: 'Budżet', cn: '预算', jp: '予算', pt: 'Orçamento', tr: 'Bütçe', ar: 'الميزانية', ru: 'Бюджет', hi: 'बजट', bn: 'বাজেট', ur: 'بجٹ', th: 'งบประมาณ', id: 'Anggaran' },
  'settings.notifications': { en: 'Notifications', hu: 'Értesítések', ro: 'Notificări', sk: 'Oznámenia', hr: 'Obavijesti', de: 'Benachrichtigungen', fr: 'Notifications', es: 'Notificaciones', it: 'Notifiche', pl: 'Powiadomienia', cn: '通知', jp: '通知', pt: 'Notificações', tr: 'Bildirimler', ar: 'الإشعارات', ru: 'Уведомления', hi: 'सूचनाएं', bn: 'বিজ্ঞপ্তি', ur: 'اطلاعات', th: 'การแจ้งเตือน', id: 'Pemberitahuan' },
  'settings.appearance': { en: 'Appearance', hu: 'Megjelenés', ro: 'Aspect', sk: 'Vzhľad', hr: 'Izgled', de: 'Erscheinungsbild', fr: 'Apparence', es: 'Apariencia', it: 'Aspetto', pl: 'Wygląd', cn: '外观', jp: '外観', pt: 'Aparência', tr: 'Görünüm', ar: 'المظهر', ru: 'Внешний Вид', hi: 'दिखावट', bn: 'চেহারা', ur: 'ظاہری شکل', th: 'ลักษณะ', id: 'Penampilan' },
  'settings.dataPrivacy': { en: 'Data & Privacy', hu: 'Adatvédelem', ro: 'Date și Confidențialitate', sk: 'Údaje a Súkromie', hr: 'Podaci i Privatnost', de: 'Daten & Datenschutz', fr: 'Données et Confidentialité', es: 'Datos y Privacidad', it: 'Dati e Privacy', pl: 'Dane i Prywatność', cn: '数据与隐私', jp: 'データとプライバシー', pt: 'Dados e Privacidade', tr: 'Veri ve Gizlilik', ar: 'البيانات والخصوصية', ru: 'Данные и Конфиденциальность', hi: 'डेटा और गोपनीयता', bn: 'ডেটা এবং গোপনীয়তা', ur: 'ڈیٹا اور پرائیویسی', th: 'ข้อมูลและความเป็นส่วนตัว', id: 'Data & Privasi' },
  'settings.autoSave': { en: 'Auto Save', hu: 'Auto-Mentés', ro: 'Salvare Automată', sk: 'Automatické Ukladanie', hr: 'Automatsko Spremanje', de: 'Automatisches Speichern', fr: 'Enregistrement Automatique', es: 'Guardado Automático', it: 'Salvataggio Automatico', pl: 'Autozapis', cn: '自动保存', jp: '自動保存', pt: 'Salvamento Automático', tr: 'Otomatik Kaydetme', ar: 'الحفظ التلقائي', ru: 'Автосохранение', hi: 'स्वतः सहेजें', bn: 'স্বয়ংক্রিয় সংরক্ষণ', ur: 'خودکار محفوظ', th: 'บันทึกอัตโนมัติ', id: 'Simpan Otomatis' },

  // Language Names
  'lang.english': { en: 'English', hu: 'Angol', pt: 'Inglês', tr: 'İngilizce', ar: 'إنجليزي', ru: 'Английский', hi: 'अंग्रेज़ी', bn: 'ইংরেজি', ur: 'انگریزی', th: 'อังกฤษ', id: 'Inggris', ro: 'Engleză', sk: 'Angličtina', hr: 'Engleski', de: 'Englisch', fr: 'Anglais', es: 'Inglés', it: 'Inglese', pl: 'Angielski', cn: '英语', jp: '英語' },
  'lang.hungarian': { en: 'Hungarian', hu: 'Magyar', pt: 'Húngaro', tr: 'Macarca', ar: 'مجري', ru: 'Венгерский', hi: 'हंगेरियन', bn: 'হাঙ্গেরিয়ান', ur: 'ہنگری', th: 'ฮังการี', id: 'Hongaria', ro: 'Maghiară', sk: 'Maďarčina', hr: 'Mađarski', de: 'Ungarisch', fr: 'Hongrois', es: 'Húngaro', it: 'Ungherese', pl: 'Węgierski', cn: '匈牙利语', jp: 'ハンガリー語' },
  'lang.romanian': { en: 'Romanian', hu: 'Román', ro: 'Română', pt: 'Romeno', tr: 'Rumence', ar: 'روماني', ru: 'Румынский', hi: 'रोमानियाई', bn: 'রোমানিয়ান', ur: 'رومانیہ', th: 'โรมาเนีย', id: 'Rumania', sk: 'Rumunčina', hr: 'Rumunjski', de: 'Rumänisch', fr: 'Roumain', es: 'Rumano', it: 'Rumeno', pl: 'Rumuński', cn: '罗马尼亚语', jp: 'ルーマニア語' },
  'lang.slovak': { en: 'Slovak', hu: 'Szlovák', ro: 'Slovacă', sk: 'Slovenčina', pt: 'Eslovaco', tr: 'Slovakça', ar: 'سلوفاكي', ru: 'Словацкий', hi: 'स्लोवाक', bn: 'স্লোভাক', ur: 'سلوواک', th: 'สโลวัก', id: 'Slovakia', hr: 'Slovački', de: 'Slowakisch', fr: 'Slovaque', es: 'Eslovaco', it: 'Slovacco', pl: 'Słowacki', cn: '斯洛伐克语', jp: 'スロバキア語' },
  'lang.croatian': { en: 'Croatian', hu: 'Horvát', ro: 'Croată', sk: 'Chorvátčina', hr: 'Hrvatski', pt: 'Croata', tr: 'Hırvatça', ar: 'كرواتي', ru: 'Хорватский', hi: 'क्रोएशियाई', bn: 'ক্রোয়েশিয়ান', ur: 'کروشیا', th: 'โครเอเชีย', id: 'Kroasia', de: 'Kroatisch', fr: 'Croate', es: 'Croata', it: 'Croato', pl: 'Chorwacki', cn: '克罗地亚语', jp: 'クロアチア語' },
  'lang.german': { en: 'German', hu: 'Német', ro: 'Germană', sk: 'Nemčina', hr: 'Njemački', de: 'Deutsch', pt: 'Alemão', tr: 'Almanca', ar: 'ألماني', ru: 'Немецкий', hi: 'जर्मन', bn: 'জার্মান', ur: 'جرمن', th: 'เยอรมัน', id: 'Jerman', fr: 'Allemand', es: 'Alemán', it: 'Tedesco', pl: 'Niemiecki', cn: '德语', jp: 'ドイツ語' },
  'lang.french': { en: 'French', hu: 'Francia', ro: 'Franceză', sk: 'Francúzština', hr: 'Francuski', de: 'Französisch', fr: 'Français', pt: 'Francês', tr: 'Fransızca', ar: 'فرنسي', ru: 'Французский', hi: 'फ्रेंच', bn: 'ফরাসি', ur: 'فرانسیسی', th: 'ฝรั่งเศส', id: 'Perancis', es: 'Francés', it: 'Francese', pl: 'Francuski', cn: '法语', jp: 'フランス語' },
  'lang.spanish': { en: 'Spanish', hu: 'Spanyol', ro: 'Spaniolă', sk: 'Španielčina', hr: 'Španjolski', de: 'Spanisch', fr: 'Espagnol', es: 'Español', pt: 'Espanhol', tr: 'İspanyolca', ar: 'إسباني', ru: 'Испанский', hi: 'स्पेनिश', bn: 'স্প্যানিশ', ur: 'سپینی', th: 'สเปน', id: 'Spanyol', it: 'Spagnolo', pl: 'Hiszpański', cn: '西班牙语', jp: 'スペイン語' },
  'lang.italian': { en: 'Italian', hu: 'Olasz', ro: 'Italiană', sk: 'Taliančina', hr: 'Talijanski', de: 'Italienisch', fr: 'Italien', es: 'Italiano', it: 'Italiano', pt: 'Italiano', tr: 'İtalyanca', ar: 'إيطالي', ru: 'Итальянский', hi: 'इतालवी', bn: 'ইতালীয়', ur: 'اطالوی', th: 'อิตาลี', id: 'Italia', pl: 'Włoski', cn: '意大利语', jp: 'イタリア語' },
  'lang.polish': { en: 'Polish', hu: 'Lengyel', ro: 'Poloneză', sk: 'Poľština', hr: 'Poljski', de: 'Polnisch', fr: 'Polonais', es: 'Polaco', it: 'Polacco', pl: 'Polski', pt: 'Polonês', tr: 'Lehçe', ar: 'بولندي', ru: 'Польский', hi: 'पोलिश', bn: 'পোলিশ', ur: 'پولش', th: 'โปแลนด์', id: 'Polandia', cn: '波兰语', jp: 'ポーランド語' },
  'lang.chinese': { en: 'Chinese', hu: 'Kínai', ro: 'Chineză', sk: 'Čínština', hr: 'Kineski', de: 'Chinesisch', fr: 'Chinois', es: 'Chino', it: 'Cinese', pl: 'Chiński', cn: '中文', pt: 'Chinês', tr: 'Çince', ar: 'صيني', ru: 'Китайский', hi: 'चीनी', bn: 'চীনা', ur: 'چینی', th: 'จีน', id: 'Cina', jp: '中国語' },
  'lang.japanese': { en: 'Japanese', hu: 'Japán', ro: 'Japoneză', sk: 'Japončina', hr: 'Japanski', de: 'Japanisch', fr: 'Japonais', es: 'Japonés', it: 'Giapponese', pl: 'Japoński', cn: '日语', jp: '日本語', pt: 'Japonês', tr: 'Japonca', ar: 'ياباني', ru: 'Японский', hi: 'जापानी', bn: 'জাপানি', ur: 'جاپانی', th: 'ญี่ปุ่น', id: 'Jepang' },

  // New Languages Added
  'lang.portuguese': { en: 'Portuguese', hu: 'Portugál', pt: 'Português', tr: 'Portekizce', ar: 'برتغالي', ru: 'Португальский', hi: 'पुर्तगाली', bn: 'পর্তুগিজ', ur: 'پرتگالی', th: 'โปรตุเกส', id: 'Portugis', ro: 'Portugheză', sk: 'Portugalčina', hr: 'Portugalski', de: 'Portugiesisch', fr: 'Portugais', es: 'Portugués', it: 'Portoghese', pl: 'Portugalski', cn: '葡萄牙语', jp: 'ポルトガル語' },
  'lang.turkish': { en: 'Turkish', hu: 'Török', pt: 'Turco', tr: 'Türkçe', ar: 'تركي', ru: 'Турецкий', hi: 'तुर्की', bn: 'তুর্কি', ur: 'ترکی', th: 'ตุรกี', id: 'Turki', ro: 'Turcă', sk: 'Turečtina', hr: 'Turski', de: 'Türkisch', fr: 'Turc', es: 'Turco', it: 'Turco', pl: 'Turecki', cn: '土耳其语', jp: 'トルコ語' },
  'lang.arabic': { en: 'Arabic', hu: 'Arab', pt: 'Árabe', tr: 'Arapça', ar: 'العربية', ru: 'Арабский', hi: 'अरबी', bn: 'আরবি', ur: 'عربی', th: 'อาหรับ', id: 'Arab', ro: 'Arabă', sk: 'Arabčina', hr: 'Arapski', de: 'Arabisch', fr: 'Arabe', es: 'Árabe', it: 'Arabo', pl: 'Arabski', cn: '阿拉伯语', jp: 'アラビア語' },
  'lang.russian': { en: 'Russian', hu: 'Orosz', pt: 'Russo', tr: 'Rusça', ar: 'روسي', ru: 'Русский', hi: 'रूसी', bn: 'রাশিয়ান', ur: 'रूसी', th: 'รัสเซีย', id: 'Rusia', ro: 'Rusă', sk: 'Ruština', hr: 'Ruski', de: 'Russisch', fr: 'Russe', es: 'Ruso', it: 'Russo', pl: 'Rosyjski', cn: '俄语', jp: 'ロシア語' },
  'lang.hindi': { en: 'Hindi', hu: 'Hindi', pt: 'Hindi', tr: 'Hintçe', ar: 'هندي', ru: 'Хинди', hi: 'हिन्दी', bn: 'হিন্দি', ur: 'ہندی', th: 'ฮินดี', id: 'Hindi', ro: 'Hindi', sk: 'Hindčina', hr: 'Hindski', de: 'Hindi', fr: 'Hindi', es: 'Hindi', it: 'Hindi', pl: 'Hindi', cn: '印地语', jp: 'ヒンディー語' },
  'lang.bengali': { en: 'Bengali', hu: 'Bengáli', pt: 'Bengali', tr: 'Bengalce', ar: 'بنغالي', ru: 'Бенгальский', hi: 'बंगाली', bn: 'বাংলা', ur: 'بنگالی', th: 'เบงกาลี', id: 'Benggala', ro: 'Bengaleză', sk: 'Bengálčina', hr: 'Bengalski', de: 'Bengalisch', fr: 'Bengali', es: 'Bengalí', it: 'Bengalese', pl: 'Bengalski', cn: '孟加拉语', jp: 'ベンガル語' },
  'lang.urdu': { en: 'Urdu', hu: 'Urdu', pt: 'Urdu', tr: 'Urduca', ar: 'أردي', ru: 'Урду', hi: 'उर्दू', bn: 'উর্দু', ur: 'اردو', th: 'อูรดู', id: 'Urdu', ro: 'Urdu', sk: 'Urdčina', hr: 'Urdu', de: 'Urdu', fr: 'Urdu', es: 'Urdu', it: 'Urdu', pl: 'Urdu', cn: '乌尔都语', jp: 'ウルドゥー語' },
  'lang.thai': { en: 'Thai', hu: 'Thai', pt: 'Tailandês', tr: 'Tayca', ar: 'تايلاندي', ru: 'Тайский', hi: 'थाई', bn: 'থাই', ur: 'تھائی', th: 'ไทย', id: 'Thailand', ro: 'Thailandeză', sk: 'Thajčina', hr: 'Tajlandski', de: 'Thailändisch', fr: 'Thaï', es: 'Tailandés', it: 'Tailandese', pl: 'Tajski', cn: '泰语', jp: 'タイ語' },
  'lang.indonesian': { en: 'Indonesian', hu: 'Indonéz', pt: 'Indonésio', tr: 'Endonezce', ar: 'إندونيسي', ru: 'Индонезийский', hi: 'इंडोनेशियाई', bn: 'ইন্দোনেশিয়ান', ur: 'انڈونیشیائی', th: 'อินโดนีเซีย', id: 'Bahasa Indonesia', ro: 'Indoneziană', sk: 'Indonézština', hr: 'Indonezijski', de: 'Indonesisch', fr: 'Indonésien', es: 'Indonesio', it: 'Indonesiano', pl: 'Indonezyjski', cn: '印尼语', jp: 'インドネシア語' }
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
    const validLanguages: Language[] = ['en', 'hu', 'ro', 'sk', 'hr', 'de', 'fr', 'es', 'it', 'pl', 'cn', 'jp', 'pt', 'tr', 'ar', 'ru', 'hi', 'bn', 'ur', 'th', 'id'];
    return (saved && validLanguages.includes(saved as Language)) ? (saved as Language) : 'en';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const t = (key: string): string => {
    if (!translations[key]) {
      // Fallback for missing keys in development
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