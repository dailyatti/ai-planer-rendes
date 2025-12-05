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
  // Invoicing View
  'invoicing.title': { en: 'Invoicing & Clients', hu: 'Számlázás és Ügyfelek', ro: 'Facturare și Clienți', sk: 'Fakturácia a Klienti', hr: 'Izdavanje Računa i Klijenti', de: 'Rechnungsstellung & Kunden', fr: 'Facturation et Clients', es: 'Facturación y Clientes', it: 'Fatturazione e Clienti', pl: 'Fakturowanie i Klienci', cn: '发票与客户', jp: '請求書とクライアント' },
  'invoicing.subtitle': { en: 'Manage your financials and client relationships in one place', hu: 'Kezeld pénzügyeidet és ügyfélkapcsolataidat egy helyen', ro: 'Gestionează finanțele și relațiile cu clienții', sk: 'Spravujte financie a vzťahy s klientmi', hr: 'Upravljajte financijama i odnosima s klijentima', de: 'Verwalten Sie Finanzen und Kundenbeziehungen', fr: 'Gérez vos finances et relations clients', es: 'Gestiona tus finanzas y relaciones con clientes', it: 'Gestisci finanze e relazioni con i clienti', pl: 'Zarządzaj finansami i relacjami z klientami', cn: '在一处管理您的财务和客户关系', jp: '財務とクライアント関係を一か所で管理' },
  'invoicing.dashboard': { en: 'Dashboard', hu: 'Áttekintés', ro: 'Tablou de Bord', sk: 'Nástenka', hr: 'Nadzorna Ploča', de: 'Dashboard', fr: 'Tableau de Bord', es: 'Panel', it: 'Cruscotto', pl: 'Pulpit', cn: '仪表盘', jp: 'ダッシュボード' },
  'invoicing.invoices': { en: 'Invoices', hu: 'Számlák', ro: 'Facturi', sk: 'Faktúry', hr: 'Računi', de: 'Rechnungen', fr: 'Factures', es: 'Facturas', it: 'Fatture', pl: 'Faktury', cn: '发票', jp: '請求書' },
  'invoicing.clients': { en: 'Clients', hu: 'Ügyfelek', ro: 'Clienți', sk: 'Klienti', hr: 'Klijenti', de: 'Kunden', fr: 'Clients', es: 'Clientes', it: 'Clienti', pl: 'Klienci', cn: '客户', jp: 'クライアント' },
  'invoicing.analytics': { en: 'Analytics', hu: 'Elemzések', ro: 'Analize', sk: 'Analytika', hr: 'Analitika', de: 'Analysen', fr: 'Analyses', es: 'Análisis', it: 'Analisi', pl: 'Analityka', cn: '分析', jp: '分析' },
  'invoicing.addClient': { en: 'Add Client', hu: 'Új Ügyfél', ro: 'Adaugă Client', sk: 'Pridať Klienta', hr: 'Dodaj Klijenta', de: 'Kunde Hinzufügen', fr: 'Ajouter un Client', es: 'Añadir Cliente', it: 'Aggiungi Cliente', pl: 'Dodaj Klienta', cn: '添加客户', jp: 'クライアントを追加' },
  'invoicing.createInvoice': { en: 'Create Invoice', hu: 'Új Számla', ro: 'Creează Factură', sk: 'Vytvoriť Faktúru', hr: 'Kreiraj Račun', de: 'Rechnung Erstellen', fr: 'Créer une Facture', es: 'Crear Factura', it: 'Crea Fattura', pl: 'Utwórz Fakturę', cn: '创建发票', jp: '請求書を作成' },
  'invoicing.totalRevenue': { en: 'Total Revenue', hu: 'Befolyt Bevétel', ro: 'Venit Total', sk: 'Celkový Príjem', hr: 'Ukupni Prihod', de: 'Gesamtumsatz', fr: 'Revenu Total', es: 'Ingresos Totales', it: 'Entrate Totali', pl: 'Przychody Ogółem', cn: '总收入', jp: '総収入' },
  'invoicing.pending': { en: 'Pending', hu: 'Függőben', ro: 'În Așteptare', sk: 'Čakajúce', hr: 'Na Čekanju', de: 'Ausstehend', fr: 'En Attente', es: 'Pendiente', it: 'In Sospeso', pl: 'Oczekujące', cn: '待处理', jp: '保留' },
  'invoicing.overdue': { en: 'Overdue', hu: 'Lejárt', ro: 'Restant', sk: 'Po Splatnosti', hr: 'Dospjelo', de: 'Überfällig', fr: 'En Retard', es: 'Vencido', it: 'Scaduto', pl: 'Zaległe', cn: '逾期', jp: '期限切れ' },
  'invoicing.statusDraft': { en: 'Draft', hu: 'Piszkozat', ro: 'Ciornă', sk: 'Návrh', hr: 'Nacrt', de: 'Entwurf', fr: 'Brouillon', es: 'Borrador', it: 'Bozza', pl: 'Szkic', cn: '草稿', jp: '下書き' },
  'invoicing.statusSent': { en: 'Sent', hu: 'Elküldve', ro: 'Trimis', sk: 'Odoslané', hr: 'Poslano', de: 'Gesendet', fr: 'Envoyé', es: 'Enviado', it: 'Inviato', pl: 'Wysłano', cn: '已发送', jp: '送信済み' },
  'invoicing.statusPaid': { en: 'Paid', hu: 'Fizetve', ro: 'Plătit', sk: 'Zaplatené', hr: 'Plaćeno', de: 'Bezahlt', fr: 'Payé', es: 'Pagado', it: 'Pagato', pl: 'Opłacone', cn: '已支付', jp: '支払い済み' },
  'invoicing.statusOverdue': { en: 'Overdue', hu: 'Lejárt', ro: 'Restant', sk: 'Po Splatnosti', hr: 'Dospjelo', de: 'Überfällig', fr: 'En Retard', es: 'Vencido', it: 'Scaduto', pl: 'Zaległe', cn: '逾期', jp: '期限切れ' },
  'invoicing.statusCancelled': { en: 'Cancelled', hu: 'Törölve', ro: 'Anulat', sk: 'Zrušené', hr: 'Otkazano', de: 'Storniert', fr: 'Annulé', es: 'Cancelado', it: 'Annullato', pl: 'Anulowano', cn: '已取消', jp: 'キャンセル済み' },

  // Navigation
  'nav.hourlyPlanning': { en: 'Hourly Planning', hu: 'Óránkénti Tervezés', ro: 'Planificare Orară', sk: 'Hodinové Plánovanie', hr: 'Satno Planiranje', de: 'Stundenplanung', fr: 'Planification Horaire', es: 'Planificación Horaria', it: 'Pianificazione Oraria', pl: 'Planowanie Godzinowe', cn: '每小时计划', jp: '時間ごとの計画' },
  'nav.dailyPlanning': { en: 'Daily Planning', hu: 'Napi Tervezés', ro: 'Planificare Zilnică', sk: 'Denné Plánovanie', hr: 'Dnevno Planiranje', de: 'Tagesplanung', fr: 'Planification Quotidienne', es: 'Planificación Diaria', it: 'Pianificazione Giornaliera', pl: 'Planowanie Dzienne', cn: '每日计划', jp: '日次計画' },
  'nav.weeklyPlanning': { en: 'Weekly Planning', hu: 'Heti Tervezés', ro: 'Planificare Săptămânală', sk: 'Týždenné Plánovanie', hr: 'Tjedno Planiranje', de: 'Wochenplanung', fr: 'Planification Hebdomadaire', es: 'Planificación Semanal', it: 'Pianificazione Settimanale', pl: 'Planowanie Tygodniowe', cn: '每周计划', jp: '週次計画' },
  'nav.monthlyPlanning': { en: 'Monthly Planning', hu: 'Havi Tervezés', ro: 'Planificare Lunară', sk: 'Mesačné Plánovanie', hr: 'Mjesečno Planiranje', de: 'Monatsplanung', fr: 'Planification Mensuelle', es: 'Planificación Mensual', it: 'Pianificazione Mensile', pl: 'Planowanie Miesięczne', cn: '每月计划', jp: '月次計画' },
  'nav.yearlyPlanning': { en: 'Yearly Planning', hu: 'Éves Tervezés', ro: 'Planificare Anuală', sk: 'Ročné Plánovanie', hr: 'Godišnje Planiranje', de: 'Jahresplanung', fr: 'Planification Annuelle', es: 'Planificación Anual', it: 'Pianificazione Annuale', pl: 'Planowanie Roczne', cn: '年度计划', jp: '年次計画' },
  'nav.smartNotes': { en: 'Smart Notes', hu: 'Okos Jegyzetek', ro: 'Notițe Inteligente', sk: 'Inteligentné Poznámky', hr: 'Pametne Bilješke', de: 'Intelligente Notizen', fr: 'Notes Intelligentes', es: 'Notas Inteligentes', it: 'Note Intelligenti', pl: 'Inteligentne Notatki', cn: '智能笔记', jp: 'スマートノート' },
  'nav.goals': { en: 'Goals & Milestones', hu: 'Célok és Mérföldkövek', ro: 'Obiective și Repere', sk: 'Ciele a Míľniky', hr: 'Ciljevi i Prekretnice', de: 'Ziele & Meilensteine', fr: 'Objectifs & Jalons', es: 'Objetivos y Hitos', it: 'Obiettivi e Traguardi', pl: 'Cele i Kamienie Milowe', cn: '目标与里程碑', jp: '目標とマイルストーン' },
  'nav.visualPlanning': { en: 'Visual Planning', hu: 'Vizuális Tervezés', ro: 'Planificare Vizuală', sk: 'Vizuálne Plánovanie', hr: 'Vizualno Planiranje', de: 'Visuelle Planung', fr: 'Planification Visuelle', es: 'Planificación Visual', it: 'Pianificazione Visiva', pl: 'Planowanie Wizualne', cn: '视觉规划', jp: 'ビジュアルプランニング' },
  'nav.budgetTracker': { en: 'Budget Tracker', hu: 'Költségkövető', ro: 'Urmărire Buget', sk: 'Sledovanie Rozpočtu', hr: 'Praćenje Budžeta', de: 'Budget-Tracker', fr: 'Suivi du Budget', es: 'Seguimiento de Presupuesto', it: 'Tracciamento Budget', pl: 'Śledzenie Budżetu', cn: '预算追踪', jp: '予算トラッカー' },
  'nav.invoicing': { en: 'Invoicing', hu: 'Számlázás', ro: 'Facturare', sk: 'Fakturácia', hr: 'Izdavanje Računa', de: 'Rechnungsstellung', fr: 'Facturation', es: 'Facturación', it: 'Fatturazione', pl: 'Fakturowanie', cn: '发票', jp: '請求書作成' },
  'nav.pomodoroTimer': { en: 'Pomodoro Timer', hu: 'Pomodoro Időmérő', ro: 'Cronometru Pomodoro', sk: 'Pomodoro Časovač', hr: 'Pomodoro Tajmer', de: 'Pomodoro-Timer', fr: 'Minuteur Pomodoro', es: 'Temporizador Pomodoro', it: 'Timer Pomodoro', pl: 'Licznik Pomodoro', cn: '番茄钟', jp: 'ポモドーロタイマー' },
  'nav.statistics': { en: 'Statistics', hu: 'Statisztikák', ro: 'Statistici', sk: 'Štatistiky', hr: 'Statistika', de: 'Statistiken', fr: 'Statistiques', es: 'Estadísticas', it: 'Statistiche', pl: 'Statystyki', cn: '统计', jp: '統計' },
  'nav.integrations': { en: 'Integrations', hu: 'Integrációk', ro: 'Integrări', sk: 'Integrácie', hr: 'Integracije', de: 'Integrationen', fr: 'Intégrations', es: 'Integraciones', it: 'Integrazioni', pl: 'Integracje', cn: '集成', jp: '統合' },
  'nav.navigation': { en: 'Navigation', hu: 'Navigáció', ro: 'Navigare', sk: 'Navigácia', hr: 'Navigacija', de: 'Navigation', fr: 'Navigation', es: 'Navegación', it: 'Navigazione', pl: 'Nawigacja', cn: '导航', jp: 'ナビゲーション' },

  // Header
  'header.title': { en: 'ContentPlanner Pro', hu: 'ContentPlanner Pro', ro: 'ContentPlanner Pro', sk: 'ContentPlanner Pro', hr: 'ContentPlanner Pro', de: 'ContentPlanner Pro', fr: 'ContentPlanner Pro', es: 'ContentPlanner Pro', it: 'ContentPlanner Pro', pl: 'ContentPlanner Pro', cn: '内容策划 Pro', jp: 'コンテンツプランナー Pro' },
  'header.subtitle': { en: 'Professional Planning for Content Creators', hu: 'Professzionális Tervezés Tartalomkészítőknek', ro: 'Planificare Profesională pentru Creatori de Conținut', sk: 'Profesionálne Plánovanie pre Tvorcov Obsahu', hr: 'Profesionalno Planiranje za Kreatore Sadržaja', de: 'Professionelle Planung für Content-Ersteller', fr: 'Planification Professionnelle pour Créateurs de Contenu', es: 'Planificación Profesional para Creadores de Contenido', it: 'Pianificazione Professionale per Creatori di Contenuti', pl: 'Profesjonalne Planowanie dla Twórców Treści', cn: '内容创作者的专业规划', jp: 'コンテンツクリエイターのためのプロフェッショナルな計画' },
  'header.settings': { en: 'Settings', hu: 'Beállítások', ro: 'Setări', sk: 'Nastavenia', hr: 'Postavke', de: 'Einstellungen', fr: 'Paramètres', es: 'Configuración', it: 'Impostazioni', pl: 'Ustawienia', cn: '设置', jp: '設定' },

  // Daily View
  'daily.title': { en: 'Daily Planning', hu: 'Napi Tervezés', ro: 'Planificare Zilnică', sk: 'Denné Plánovanie', hr: 'Dnevno Planiranje', de: 'Tagesplanung', fr: 'Planification Quotidienne', es: 'Planificación Diaria', it: 'Pianificazione Giornaliera', pl: 'Planowanie Dzienne', cn: '每日计划', jp: '日次計画' },
  'daily.subtitle': { en: 'Organize your day efficiently and purposefully', hu: 'Szervezd meg a napodat hatékonyan és célirányosan', ro: 'Organizează-ți ziua eficient', sk: 'Zorganizujte si deň efektívne', hr: 'Organizirajte svoj dan učinkovito', de: 'Organisiere deinen Tag effizient', fr: 'Organisez votre journée efficacement', es: 'Organiza tu día eficientemente', it: 'Organizza la tua giornata in modo efficiente', pl: 'Zorganizuj swój dzień efektywnie', cn: '高效地组织你的一天', jp: '一日を効率的に整理する' },
  'daily.newTask': { en: 'New Task', hu: 'Új Feladat', ro: 'Sarcină Nouă', sk: 'Nová Úloha', hr: 'Novi Zadatak', de: 'Neue Aufgabe', fr: 'Nouvelle Tâche', es: 'Nueva Tarea', it: 'Nuovo Compito', pl: 'Nowe Zadanie', cn: '新任务', jp: '新しいタスク' },
  'daily.selectDate': { en: 'Select Date', hu: 'Dátum Kiválasztása', ro: 'Selectează Data', sk: 'Vyberte Dátum', hr: 'Odaberi Datum', de: 'Datum Auswählen', fr: 'Sélectionner la Date', es: 'Seleccionar Fecha', it: 'Seleziona Data', pl: 'Wybierz Datę', cn: '选择日期', jp: '日付を選択' },
  'daily.completion': { en: 'Completion', hu: 'Teljesítés', ro: 'Finalizare', sk: 'Dokončenie', hr: 'Završetak', de: 'Fertigstellung', fr: 'Achèvement', es: 'Finalización', it: 'Completamento', pl: 'Ukończenie', cn: '完成度', jp: '完了' },
  'daily.tasks': { en: 'tasks', hu: 'feladat', ro: 'sarcini', sk: 'úlohy', hr: 'zadaci', de: 'aufgaben', fr: 'tâches', es: 'tareas', it: 'compiti', pl: 'zadania', cn: '任务', jp: 'タスク' },
  'daily.addTask': { en: 'Add New Task', hu: 'Új Feladat Hozzáadása', ro: 'Adaugă Sarcină Nouă', sk: 'Pridať Novú Úlohu', hr: 'Dodaj Novi Zadatak', de: 'Neue Aufgabe Hinzufügen', fr: 'Ajouter une Nouvelle Tâche', es: 'Añadir Nueva Tarea', it: 'Aggiungi Nuovo Compito', pl: 'Dodaj Nowe Zadanie', cn: '添加新任务', jp: '新しいタスクを追加' },
  'daily.editTask': { en: 'Edit Task', hu: 'Feladat Szerkesztése', ro: 'Editare Sarcină', sk: 'Upraviť Úlohu', hr: 'Uredi Zadatak', de: 'Aufgabe Bearbeiten', fr: 'Modifier la Tâche', es: 'Editar Tarea', it: 'Modifica Compito', pl: 'Edytuj Zadanie', cn: '编辑任务', jp: 'タスクを編集' },
  'daily.taskTitle': { en: 'Task Title', hu: 'Feladat Címe', ro: 'Titlu Sarcină', sk: 'Názov Úlohy', hr: 'Naslov Zadatka', de: 'Aufgabentitel', fr: 'Titre de la Tâche', es: 'Título de la Tarea', it: 'Titolo del Compito', pl: 'Tytuł Zadania', cn: '任务标题', jp: 'タスクのタイトル' },
  'daily.taskDescription': { en: 'Detailed Description', hu: 'Részletes Leírás', ro: 'Descriere Detaliată', sk: 'Podrobný Popis', hr: 'Detaljan Opis', de: 'Detaillierte Beschreibung', fr: 'Description Détaillée', es: 'Descripción Detallada', it: 'Descrizione Dettagliata', pl: 'Szczegółowy Opis', cn: '详细描述', jp: '詳細な説明' },
  'daily.priority': { en: 'Priority', hu: 'Prioritás', ro: 'Prioritate', sk: 'Priorita', hr: 'Prioritet', de: 'Priorität', fr: 'Priorité', es: 'Prioridad', it: 'Priorità', pl: 'Priorytet', cn: '优先级', jp: '優先度' },
  'daily.lowPriority': { en: 'Low Priority', hu: 'Alacsony Prioritás', ro: 'Prioritate Scăzută', sk: 'Nízka Priorita', hr: 'Nizak Prioritet', de: 'Niedrige Priorität', fr: 'Priorité Faible', es: 'Prioridad Baja', it: 'Priorità Bassa', pl: 'Niski Priorytet', cn: '低优先级', jp: '低優先度' },
  'daily.mediumPriority': { en: 'Medium Priority', hu: 'Közepes Prioritás', ro: 'Prioritate Medie', sk: 'Stredná Priorita', hr: 'Srednji Prioritet', de: 'Mittlere Priorität', fr: 'Priorité Moyenne', es: 'Prioridad Media', it: 'Priorità Media', pl: 'Średni Priorytet', cn: '中优先级', jp: '中優先度' },
  'daily.highPriority': { en: 'High Priority', hu: 'Magas Prioritás', ro: 'Prioritate Înaltă', sk: 'Vysoká Priorita', hr: 'Visoki Prioritet', de: 'Hohe Priorität', fr: 'Priorité Élevée', es: 'Prioridad Alta', it: 'Priorità Alta', pl: 'Wysoki Priorytet', cn: '高优先级', jp: '高優先度' },
  'daily.taskPlaceholder': { en: 'e.g. Video editing...', hu: 'pl. Videó szerkesztés...', ro: 'ex. Editare video...', sk: 'napr. Strih videa...', hr: 'npr. Uređivanje videa...', de: 'z.B. Videobearbeitung...', fr: 'ex. Montage vidéo...', es: 'ej. Edición de video...', it: 'es. Editing video...', pl: 'np. Edycja wideo...', cn: '例如：视频编辑...', jp: '例：動画編集...' },
  'daily.descriptionPlaceholder': { en: 'Details, links, notes...', hu: 'Részletek, linkek, jegyzetek...', ro: 'Detalii, linkuri, notițe...', sk: 'Podrobnosti, odkazy, poznámky...', hr: 'Detalji, poveznice, bilješke...', de: 'Details, Links, Notizen...', fr: 'Détails, liens, notes...', es: 'Detalles, enlaces, notas...', it: 'Dettagli, link, note...', pl: 'Szczegóły, linki, notatki...', cn: '详情，链接，笔记...', jp: '詳細、リンク、メモ...' },

  // Weekly View
  'weekly.title': { en: 'Weekly Planning', hu: 'Heti Tervezés', ro: 'Planificare Săptămânală', sk: 'Týždenné Plánovanie', hr: 'Tjedno Planiranje', de: 'Wochenplanung', fr: 'Planification Hebdomadaire', es: 'Planificación Semanal', it: 'Pianificazione Settimanale', pl: 'Planowanie Tygodniowe', cn: '每周计划', jp: '週次計画' },
  'weekly.subtitle': { en: 'Review and plan your week strategically', hu: 'Tekintsd át és tervezd meg a hetedet stratégiailag', ro: 'Analizează și planifică săptămâna', sk: 'Prezrite si a naplánujte svoj týždeň', hr: 'Pregledajte i planirajte svoj tjedan', de: 'Überprüfen und planen Sie Ihre Woche', fr: 'Examinez et planifiez votre semaine', es: 'Revisa y planifica tu semana', it: 'Rivedi e pianifica la tua settimana', pl: 'Przejrzyj i zaplanuj swój tydzień', cn: '战略性地回顾和计划你的一周', jp: '戦略的に週を確認して計画する' },
  'weekly.addTask': { en: 'Add Task', hu: 'Feladat Hozzáadása', ro: 'Adaugă Sarcină', sk: 'Pridať Úlohu', hr: 'Dodaj Zadatak', de: 'Aufgabe Hinzufügen', fr: 'Ajouter une Tâche', es: 'Añadir Tarea', it: 'Aggiungi Compito', pl: 'Dodaj Zadanie', cn: '添加任务', jp: 'タスクを追加' },

  // Budget View
  'budget.title': { en: 'Budget Tracker', hu: 'Költségkövető', ro: 'Urmărire Buget', sk: 'Sledovanie Rozpočtu', hr: 'Praćenje Budžeta', de: 'Budget-Tracker', fr: 'Suivi du Budget', es: 'Seguimiento de Presupuesto', it: 'Tracciamento Budget', pl: 'Śledzenie Budżetu', cn: '预算追踪', jp: '予算トラッカー' },
  'budget.subtitle': { en: 'Professional financial tracking', hu: 'Professzionális pénzügyi követés', ro: 'Urmărire financiară profesională', sk: 'Profesionálne sledovanie financií', hr: 'Profesionalno praćenje financija', de: 'Professionelle Finanzverfolgung', fr: 'Suivi financier professionnel', es: 'Seguimiento financiero profesional', it: 'Tracciamento finanziario professionale', pl: 'Profesjonalne śledzenie finansów', cn: '专业财务追踪', jp: 'プロフェッショナルな財務追跡' },
  'budget.addTransaction': { en: 'Add Transaction', hu: 'Tranzakció Hozzáadása', ro: 'Adaugă Tranzacție', sk: 'Pridať Transakciu', hr: 'Dodaj Transakciju', de: 'Transaktion Hinzufügen', fr: 'Ajouter une Transaction', es: 'Añadir Transacción', it: 'Aggiungi Transazione', pl: 'Dodaj Transakcję', cn: '添加交易', jp: '取引を追加' },
  'budget.balance': { en: 'Balance', hu: 'Egyenleg', ro: 'Sold', sk: 'Zostatok', hr: 'Saldo', de: 'Kontostand', fr: 'Solde', es: 'Saldo', it: 'Saldo', pl: 'Saldo', cn: '余额', jp: '残高' },
  'budget.income': { en: 'Income', hu: 'Bevétel', ro: 'Venit', sk: 'Príjem', hr: 'Prihod', de: 'Einkommen', fr: 'Revenu', es: 'Ingreso', it: 'Entrata', pl: 'Dochód', cn: '收入', jp: '収入' },
  'budget.expense': { en: 'Expense', hu: 'Kiadás', ro: 'Cheltuială', sk: 'Výdavok', hr: 'Trošak', de: 'Ausgabe', fr: 'Dépense', es: 'Gasto', it: 'Spesa', pl: 'Wydatek', cn: '支出', jp: '支出' },
  'budget.cashFlow': { en: 'Cash Flow', hu: 'Pénzforgalom', ro: 'Flux de Numerar', sk: 'Peňažný Tok', hr: 'Novčani Tok', de: 'Geldfluss', fr: 'Flux de Trésorerie', es: 'Flujo de Caja', it: 'Flusso di Cassa', pl: 'Przepływ Pieniężny', cn: '现金流', jp: 'キャッシュフロー' },
  'budget.expenseCategories': { en: 'Expense Categories', hu: 'Kiadás Kategóriák', ro: 'Categorii de Cheltuieli', sk: 'Kategórie Výdavkov', hr: 'Kategorije Troškova', de: 'Ausgabenkategorien', fr: 'Catégories de Dépenses', es: 'Categorías de Gastos', it: 'Categorie di Spesa', pl: 'Kategorie Wydatków', cn: '支出类别', jp: '経費カテゴリー' },
  'budget.transactions': { en: 'Transactions', hu: 'Tranzakciók', ro: 'Tranzacții', sk: 'Transakcie', hr: 'Transakcije', de: 'Transaktionen', fr: 'Transactions', es: 'Transacciones', it: 'Transazioni', pl: 'Transakcje', cn: '交易', jp: '取引' },
  'budget.noTransactions': { en: 'No transactions yet. Add your first one!', hu: 'Még nincs tranzakció. Add hozzá az elsőt!', ro: 'Nicio tranzacție încă. Adaugă prima!', sk: 'Zatiaľ žiadne transakcie. Pridajte svoju prvú!', hr: 'Još nema transakcija. Dodajte prvu!', de: 'Noch keine Transaktionen. Fügen Sie Ihre erste hinzu!', fr: 'Pas encore de transactions. Ajoutez la première !', es: '¡Aún no hay transacciones. Añade la primera!', it: 'Ancora nessuna transazione. Aggiungi la prima!', pl: 'Brak transakcji. Dodaj pierwszą!', cn: '暂无交易。添加您的第一笔交易！', jp: '取引はまだありません。最初の一つを追加してください！' },
  'budget.name': { en: 'Name', hu: 'Megnevezés', ro: 'Nume', sk: 'Názov', hr: 'Naziv', de: 'Name', fr: 'Nom', es: 'Nombre', it: 'Nome', pl: 'Nazwa', cn: '名称', jp: '名前' },
  'budget.amount': { en: 'Amount', hu: 'Összeg', ro: 'Sumă', sk: 'Suma', hr: 'Iznos', de: 'Betrag', fr: 'Montant', es: 'Cantidad', it: 'Importo', pl: 'Kwota', cn: '金额', jp: '金額' },
  'budget.category': { en: 'Category', hu: 'Kategória', ro: 'Categorie', sk: 'Kategória', hr: 'Kategorija', de: 'Kategorie', fr: 'Catégorie', es: 'Categoría', it: 'Categoria', pl: 'Kategoria', cn: '类别', jp: 'カテゴリー' },

  // Integrations View
  'integrations.title': { en: 'Integrations & API Keys', hu: 'Integrációk és API Kulcsok', ro: 'Integrări și Chei API', sk: 'Integrácie a API Kľúče', hr: 'Integracije i API Ključevi', de: 'Integrationen & API-Schlüssel', fr: 'Intégrations et Clés API', es: 'Integraciones y Claves API', it: 'Integrazioni e Chiavi API', pl: 'Integracje i Klucze API', cn: '集成与 API 密钥', jp: '統合と API キー' },
  'integrations.subtitle': { en: 'Manage your connections to external services', hu: 'Kezeld a külső szolgáltatásokkal való kapcsolataidat', ro: 'Gestionează conexiunile', sk: 'Spravujte pripojenia', hr: 'Upravljajte vezama', de: 'Verbindungen verwalten', fr: 'Gérer les connexions', es: 'Gestionar conexiones', it: 'Gestisci connessioni', pl: 'Zarządzaj połączeniami', cn: '管理连接', jp: '接続を管理' },
  'integrations.available': { en: 'Available', hu: 'Elérhető', ro: 'Disponibil', sk: 'Dostupné', hr: 'Dostupno', de: 'Verfügbar', fr: 'Disponible', es: 'Disponible', it: 'Disponibile', pl: 'Dostępne', cn: '可用', jp: '利用可能' },
  'integrations.connected': { en: 'Connected', hu: 'Csatlakoztatva', ro: 'Conectat', sk: 'Pripojené', hr: 'Povezano', de: 'Verbunden', fr: 'Connecté', es: 'Conectado', it: 'Connesso', pl: 'Połączono', cn: '已连接', jp: '接続済み' },
  'integrations.configure': { en: 'Configure', hu: 'Konfigurálás', ro: 'Configurare', sk: 'Konfigurovať', hr: 'Konfiguriraj', de: 'Konfigurieren', fr: 'Configurer', es: 'Configurar', it: 'Configura', pl: 'Konfiguruj', cn: '配置', jp: '設定' },
  'integrations.connect': { en: 'Connect', hu: 'Csatlakozás', ro: 'Conectare', sk: 'Pripojiť', hr: 'Poveži', de: 'Verbinden', fr: 'Connecter', es: 'Conectar', it: 'Connetti', pl: 'Połącz', cn: '连接', jp: '接続' },
  'integrations.disconnect': { en: 'Disconnect', hu: 'Leválasztás', ro: 'Deconectare', sk: 'Odpojiť', hr: 'Odspoji', de: 'Trennen', fr: 'Déconnecter', es: 'Desconectar', it: 'Disconnetti', pl: 'Rozłącz', cn: '断开连接', jp: '切断' },
  'integrations.enterKey': { en: 'Enter API Key', hu: 'API Kulcs Megadása', ro: 'Introduce Cheia API', sk: 'Zadajte API Kľúč', hr: 'Unesite API Ključ', de: 'API-Schlüssel eingeben', fr: 'Entrez la Clé API', es: 'Introducir Clave API', it: 'Inserisci Chiave API', pl: 'Wprowadź Klucz API', cn: '输入 API 密钥', jp: 'API キーを入力' },
  'integrations.getKey': { en: 'Get your API key here', hu: 'Szerezd be az API kulcsodat itt', ro: 'Obține cheia API aici', sk: 'Získajte API kľúč tu', hr: 'Nabavite svoj API ključ ovdje', de: 'Holen Sie sich Ihren API-Schlüssel hier', fr: 'Obtenez votre clé API ici', es: 'Obtén tu clave API aquí', it: 'Ottieni la tua chiave API qui', pl: 'Uzyskaj klucz API tutaj', cn: '在这里获取 API 密钥', jp: 'API キーをここで取得' },
  'integrations.testConnection': { en: 'Test Connection', hu: 'Kapcsolat Tesztelése', ro: 'Testează Conexiunea', sk: 'Testovať Pripojenie', hr: 'Testiraj Vezu', de: 'Verbindung testen', fr: 'Tester la Connexion', es: 'Probar Conexión', it: 'Testa Connessione', pl: 'Testuj Połączenie', cn: '测试连接', jp: '接続をテスト' },

  // Pomodoro
  'pomodoro.title': { en: 'Pomodoro Timer', hu: 'Pomodoro Időmérő', ro: 'Cronometru Pomodoro', sk: 'Pomodoro Časovač', hr: 'Pomodoro Tajmer', de: 'Pomodoro-Timer', fr: 'Minuteur Pomodoro', es: 'Temporizador Pomodoro', it: 'Timer Pomodoro', pl: 'Licznik Pomodoro', cn: '番茄钟', jp: 'ポモドーロタイマー' },
  'pomodoro.subtitle': { en: 'Boost your productivity with focused work sessions', hu: 'Növeld a produktivitásod fókuszált munkamenetekkel', ro: 'Crește productivitatea', sk: 'Zvýšte produktivitu', hr: 'Povećajte produktivnost', de: 'Steigern Sie die Produktivität', fr: 'Augmentez la productivité', es: 'Aumenta la productividad', it: 'Aumenta la produttività', pl: 'Zwiększ produktywność', cn: '提高生产力', jp: '生産性を向上させる' },
  'pomodoro.focusTime': { en: 'Focus Time', hu: 'Fókuszidő', ro: 'Timp de Concentrare', sk: 'Čas Sústredenia', hr: 'Vrijeme Fokusa', de: 'Fokuszeit', fr: 'Temps de Concentration', es: 'Tiempo de Enfoque', it: 'Tempo di Concentrazione', pl: 'Czas Skupienia', cn: '专注时间', jp: 'フォーカスタイム' },
  'pomodoro.shortBreak': { en: 'Short Break', hu: 'Rövid Szünet', ro: 'Pauză Scurtă', sk: 'Krátka Prestávka', hr: 'Kratka Pauza', de: 'Kurze Pause', fr: 'Courte Pause', es: 'Descanso Corto', it: 'Pausa Breve', pl: 'Krótka Przerwa', cn: '短休息', jp: '短い休憩' },
  'pomodoro.longBreak': { en: 'Long Break', hu: 'Hosszú Szünet', ro: 'Pauză Lungă', sk: 'Dlhá Prestávka', hr: 'Duga Pauza', de: 'Lange Pause', fr: 'Longue Pause', es: 'Descanso Largo', it: 'Pausa Lunga', pl: 'Długa Przerwa', cn: '长休息', jp: '長い休憩' },
  'pomodoro.start': { en: 'Start', hu: 'Indítás', ro: 'Start', sk: 'Štart', hr: 'Start', de: 'Start', fr: 'Démarrer', es: 'Iniciar', it: 'Avvia', pl: 'Start', cn: '开始', jp: '開始' },
  'pomodoro.pause': { en: 'Pause', hu: 'Szünet', ro: 'Pauză', sk: 'Pauza', hr: 'Pauza', de: 'Pause', fr: 'Pause', es: 'Pausa', it: 'Pausa', pl: 'Pauza', cn: '暂停', jp: '一時停止' },
  'pomodoro.reset': { en: 'Reset', hu: 'Visszaállítás', ro: 'Resetare', sk: 'Resetovať', hr: 'Reset', de: 'Zurücksetzen', fr: 'Réinitialiser', es: 'Reiniciar', it: 'Ripristina', pl: 'Resetuj', cn: '重置', jp: 'リセット' },

  // Common
  'common.save': { en: 'Save', hu: 'Mentés', ro: 'Salvare', sk: 'Uložiť', hr: 'Spremi', de: 'Speichern', fr: 'Enregistrer', es: 'Guardar', it: 'Salva', pl: 'Zapisz', cn: '保存', jp: '保存' },
  'common.cancel': { en: 'Cancel', hu: 'Mégse', ro: 'Anulare', sk: 'Zrušiť', hr: 'Odustani', de: 'Abbrechen', fr: 'Annuler', es: 'Cancelar', it: 'Annulla', pl: 'Anuluj', cn: '取消', jp: 'キャンセル' },
  'common.delete': { en: 'Delete', hu: 'Törlés', ro: 'Ștergere', sk: 'Vymazať', hr: 'Izbriši', de: 'Löschen', fr: 'Supprimer', es: 'Eliminar', it: 'Elimina', pl: 'Usuń', cn: '删除', jp: '削除' },
  'common.edit': { en: 'Edit', hu: 'Szerkesztés', ro: 'Editare', sk: 'Upraviť', hr: 'Uredi', de: 'Bearbeiten', fr: 'Modifier', es: 'Editar', it: 'Modifica', pl: 'Edytuj', cn: '编辑', jp: '編集' },
  'common.update': { en: 'Update', hu: 'Frissítés', ro: 'Actualizare', sk: 'Aktualizovať', hr: 'Ažuriraj', de: 'Aktualisieren', fr: 'Mettre à jour', es: 'Actualizar', it: 'Aggiorna', pl: 'Aktualizuj', cn: '更新', jp: '更新' },
  'common.success': { en: 'Success', hu: 'Sikeres', ro: 'Succes', sk: 'Úspech', hr: 'Uspjeh', de: 'Erfolg', fr: 'Succès', es: 'Éxito', it: 'Successo', pl: 'Sukces', cn: '成功', jp: '成功' },
  'common.error': { en: 'Error', hu: 'Hiba', ro: 'Eroare', sk: 'Chyba', hr: 'Greška', de: 'Fehler', fr: 'Erreur', es: 'Error', it: 'Errore', pl: 'Błąd', cn: '错误', jp: 'エラー' },

  // Settings
  'settings.appearance': { en: 'Appearance', hu: 'Megjelenés', ro: 'Aspect', sk: 'Vzhľad', hr: 'Izgled', de: 'Erscheinungsbild', fr: 'Apparence', es: 'Apariencia', it: 'Aspetto', pl: 'Wygląd', cn: '外观', jp: '外観' },
  'settings.language': { en: 'Language', hu: 'Nyelv', ro: 'Limbă', sk: 'Jazyk', hr: 'Jezik', de: 'Sprache', fr: 'Langue', es: 'Idioma', it: 'Lingua', pl: 'Język', cn: '语言', jp: '言語' },
  'settings.dataPrivacy': { en: 'Data & Privacy', hu: 'Adatok és Adatvédelem', ro: 'Date și Confidențialitate', sk: 'Údaje a Súkromie', hr: 'Podaci i Privatnost', de: 'Daten & Datenschutz', fr: 'Données et Confidentialité', es: 'Datos y Privacidad', it: 'Dati e Privacy', pl: 'Dane i Prywatność', cn: '数据与隐私', jp: 'データとプライバシー' }
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