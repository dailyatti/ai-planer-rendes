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

  // Hourly View
  'hourly.title': { en: 'Hourly Time Blocking', hu: 'Óránkénti Időblokkolás', ro: 'Blocare Orară', sk: 'Hodinové Blokovanie', hr: 'Satno Blokiranje', de: 'Stundenblockierung', fr: 'Blocage Horaire', es: 'Bloqueo Horario', it: 'Blocco Orario', pl: 'Blokowanie Godzinowe', cn: '每小时时间块', jp: '毎時の時間ブロック' },
  'hourly.subtitle': { en: 'Detailed hourly scheduling for maximum productivity', hu: 'Részletes óránkénti ütemezés a maximális termelékenységért', ro: 'Programare orară detaliată pentru productivitate maximă', sk: 'Podrobné hodinové plánovanie pre maximálnu produktivitu', hr: 'Detaljno satno planiranje za maksimalnu produktivnost', de: 'Detaillierte Stundenplanung für maximale Produktivität', fr: 'Planification horaire détaillée pour une productivité maximale', es: 'Programación horaria detallada para máxima productividad', it: 'Pianificazione oraria dettagliata per la massima produttività', pl: 'Szczegółowe planowanie godzinowe dla maksymalnej produktywności', cn: '详细的每小时安排以最大限度地提高生产力', jp: '生産性を最大化するための詳細な時間割' },
  'hourly.newTimeBlock': { en: 'New Time Block', hu: 'Új Időblokk', ro: 'Bloc Nou de Timp', sk: 'Nový Časový Blok', hr: 'Novi Vremenski Blok', de: 'Neuer Zeitblock', fr: 'Nouveau Bloc de Temps', es: 'Nuevo Bloque de Tiempo', it: 'Nuovo Blocco di Tempo', pl: 'Nowy Blok Czasu', cn: '新时间块', jp: '新しい時間ブロック' },
  'hourly.selectDate': { en: 'Select Date', hu: 'Dátum Kiválasztása', ro: 'Selectează Data', sk: 'Vybrať Dátum', hr: 'Odaberi Datum', de: 'Datum Wählen', fr: 'Sélectionner une Date', es: 'Seleccionar Fecha', it: 'Seleziona Data', pl: 'Wybierz Datę', cn: '选择日期', jp: '日付を選択' },
  'hourly.hourlySchedule': { en: 'Hourly Schedule', hu: 'Óránkénti Beosztás', ro: 'Program Orar', sk: 'Hodinový Rozvrh', hr: 'Satni Raspored', de: 'Stundenplan', fr: 'Horaire', es: 'Horario', it: 'Orario', pl: 'Harmonogram Godzinowy', cn: '每小时时间表', jp: '時間割' },
  'hourly.dailyTimeBlocks': { en: 'Daily Time Blocks', hu: 'Napi Időblokkok', ro: 'Blocuri de Timp Zilnice', sk: 'Denné Časové Bloky', hr: 'Dnevni Vremenski Blokovi', de: 'Tägliche Zeitblöcke', fr: 'Blocs de Temps Quotidiens', es: 'Bloques de Tiempo Diarios', it: 'Blocchi di Tempo Giornalieri', pl: 'Dzienne Bloki Czasu', cn: '每日时间块', jp: '日次時間ブロック' },
  'hourly.noBlocks': { en: 'No time blocks scheduled for this day', hu: 'Nincs időblokk beütemezve erre a napra', ro: 'Niciun bloc de timp programat pentru această zi', sk: 'Na tento deň nie sú naplánované žiadne časové bloky', hr: 'Nema zakazanih vremenskih blokova za ovaj dan', de: 'Keine Zeitblöcke für diesen Tag geplant', fr: 'Aucun bloc de temps prévu pour ce jour', es: 'No hay bloques de tiempo programados para este día', it: 'Nessun blocco di tempo programmato per questo giorno', pl: 'Brak bloków czasu zaplanowanych na ten dzień', cn: '今天没有安排时间块', jp: 'この日の時間ブロックの予定はありません' },
  'hourly.addFirstBlock': { en: 'Add First Time Block', hu: 'Első Időblokk Hozzáadása', ro: 'Adaugă Primul Bloc de Timp', sk: 'Pridať Prvý Časový Blok', hr: 'Dodaj Prvi Vremenski Blok', de: 'Ersten Zeitblock Hinzufügen', fr: 'Ajouter le Premier Bloc de Temps', es: 'Añadir Primer Bloque de Tiempo', it: 'Aggiungi Primo Blocco di Tempo', pl: 'Dodaj Pierwszy Blok Czasu', cn: '添加第一个时间块', jp: '最初の時間ブロックを追加' },
  'hourly.available': { en: 'Available', hu: 'Elérhető', ro: 'Disponibil', sk: 'Dostupné', hr: 'Dostupno', de: 'Verfügbar', fr: 'Disponible', es: 'Disponible', it: 'Disponibile', pl: 'Dostępne', cn: '可用', jp: '利用可能' },
  'hourly.editBlock': { en: 'Edit Time Block', hu: 'Időblokk Szerkesztése', ro: 'Editează Blocul de Timp', sk: 'Upraviť Časový Blok', hr: 'Uredi Vremenski Blok', de: 'Zeitblock Bearbeiten', fr: 'Modifier le Bloc de Temps', es: 'Editar Bloque de Tiempo', it: 'Modifica Blocco di Tempo', pl: 'Edytuj Blok Czasu', cn: '编辑时间块', jp: '時間ブロックを編集' },
  'hourly.addBlock': { en: 'Add New Time Block', hu: 'Új Időblokk Hozzáadása', ro: 'Adaugă Bloc Nou de Timp', sk: 'Pridať Nový Časový Blok', hr: 'Dodaj Novi Vremenski Blok', de: 'Neuen Zeitblock Hinzufügen', fr: 'Ajouter un Nouveau Bloc de Temps', es: 'Añadir Nuevo Bloque de Tiempo', it: 'Aggiungi Nuovo Blocco di Tempo', pl: 'Dodaj Nowy Blok Czasu', cn: '添加新时间块', jp: '新しい時間ブロックを追加' },
  'hourly.titleLabel': { en: 'Title', hu: 'Cím', ro: 'Titlu', sk: 'Názov', hr: 'Naslov', de: 'Titel', fr: 'Titre', es: 'Título', it: 'Titolo', pl: 'Tytuł', cn: '标题', jp: 'タイトル' },
  'hourly.descriptionLabel': { en: 'Description', hu: 'Leírás', ro: 'Descriere', sk: 'Popis', hr: 'Opis', de: 'Beschreibung', fr: 'Description', es: 'Descripción', it: 'Descrizione', pl: 'Opis', cn: '描述', jp: '説明' },
  'hourly.startTimeLabel': { en: 'Start Time', hu: 'Kezdés Ideje', ro: 'Ora de Începere', sk: 'Čas Začiatku', hr: 'Vrijeme Početka', de: 'Startzeit', fr: 'Heure de Début', es: 'Hora de Inicio', it: 'Ora di Inizio', pl: 'Czas Rozpoczęcia', cn: '开始时间', jp: '開始時間' },
  'hourly.endTimeLabel': { en: 'End Time', hu: 'Befejezés Ideje', ro: 'Ora de Încheiere', sk: 'Čas Konca', hr: 'Vrijeme Završetka', de: 'Endzeit', fr: 'Heure de Fin', es: 'Hora de Finalización', it: 'Ora di Fine', pl: 'Czas Zakończenia', cn: '結束时间', jp: '終了時間' },
  'hourly.priorityLabel': { en: 'Priority', hu: 'Prioritás', ro: 'Prioritate', sk: 'Priorita', hr: 'Prioritet', de: 'Priorität', fr: 'Priorité', es: 'Prioridad', it: 'Priorità', pl: 'Priorytet', cn: '优先级', jp: '優先順位' },
  'hourly.highPriority': { en: 'High Priority', hu: 'Magas Prioritás', ro: 'Prioritate Înaltă', sk: 'Vysoká Priorita', hr: 'Visoki Prioritet', de: 'Hohe Priorität', fr: 'Haute Priorité', es: 'Alta Prioridad', it: 'Alta Priorità', pl: 'Wysoki Priorytet', cn: '高优先级', jp: '高優先度' },
  'hourly.mediumPriority': { en: 'Medium Priority', hu: 'Közepes Prioritás', ro: 'Prioritate Medie', sk: 'Stredná Priorita', hr: 'Srednji Prioritet', de: 'Mittlere Priorität', fr: 'Priorité Moyenne', es: 'Prioridad Media', it: 'Media Priorità', pl: 'Średni Priorytet', cn: '中优先级', jp: '中優先度' },
  'hourly.lowPriority': { en: 'Low Priority', hu: 'Alacsony Prioritás', ro: 'Prioritate Scăzută', sk: 'Nízka Priorita', hr: 'Niski Prioritet', de: 'Niedrige Priorität', fr: 'Basse Priorité', es: 'Baja Prioridad', it: 'Bassa Priorità', pl: 'Niski Priorytet', cn: '低优先级', jp: '低優先度' },

  // Goals View
  'goals.title': { en: 'Goals & Milestones', hu: 'Célok és Mérföldkövek', ro: 'Obiective și Repere', sk: 'Ciele a Míľniky', hr: 'Ciljevi i Prekretnice', de: 'Ziele & Meilensteine', fr: 'Objectifs & Étapes', es: 'Metas e Hitos', it: 'Obiettivi e Traguardi', pl: 'Cele i Kamienie Milowe', cn: '目标与里程碑', jp: '目標とマイルストーン' },
  'goals.subtitle': { en: 'Track and achieve your ambitious goals', hu: 'Kövesse nyomon és érje el ambiciózus céljait', ro: 'Urmărește și atinge obiectivele tale ambițioase', sk: 'Sledujte a dosahujte svoje ambiciózne ciele', hr: 'Pratite i ostvarite svoje ambiciozne ciljeve', de: 'Verfolge und erreiche deine ehrgeizigen Ziele', fr: 'Suivez et atteignez vos objectifs ambitieux', es: 'Rastrea y alcanza tus objetivos ambiciosos', it: 'Traccia e raggiungi i tuoi obiettivi ambiziosi', pl: 'Śledź i osiągaj swoje ambitne cele', cn: '跟踪并实现您的宏伟目标', jp: '野心的な目標を追跡して達成する' },
  'goals.newGoal': { en: 'New Goal', hu: 'Új Cél', ro: 'Obiectiv Nou', sk: 'Nový Cieľ', hr: 'Novi Cilj', de: 'Neues Ziel', fr: 'Nouvel Objectif', es: 'Nueva Meta', it: 'Nuovo Obiettivo', pl: 'Nowy Cel', cn: '新目标', jp: '新しい目標' },
  'goals.totalGoals': { en: 'Total Goals', hu: 'Összes Cél', ro: 'Total Obiective', sk: 'Celkom Cieľov', hr: 'Ukupno Ciljeva', de: 'Gesamtziele', fr: 'Total des Objectifs', es: 'Total de Metas', it: 'Totale Obiettivi', pl: 'Wszystkie Cele', cn: '总目标', jp: '総目標' },
  'goals.completionRate': { en: 'Completion Rate', hu: 'Teljesítési Arány', ro: 'Rata de Finalizare', sk: 'Miera Dokončenia', hr: 'Stopa Završetka', de: 'Abschlussrate', fr: 'Taux d\'Achèvement', es: 'Tasa de Finalización', it: 'Tasso di Completamento', pl: 'Wskaźnik Ukończenia', cn: '完成率', jp: '完了率' },
  'goals.active': { en: 'Active', hu: 'Aktív', ro: 'Activ', sk: 'Aktívne', hr: 'Aktivno', de: 'Aktiv', fr: 'Actif', es: 'Activo', it: 'Attivo', pl: 'Aktywne', cn: '活跃', jp: 'アクティブ' },
  'goals.achieved': { en: 'Achieved', hu: 'Elért', ro: 'Realizat', sk: 'Dosiahnuté', hr: 'Postignuto', de: 'Erreicht', fr: 'Atteint', es: 'Logrado', it: 'Raggiunto', pl: 'Osiągnięte', cn: '已实现', jp: '達成済み' },
  'goals.filterAll': { en: 'All Goals', hu: 'Minden Cél', ro: 'Toate Obiectivele', sk: 'Všetky Ciele', hr: 'Svi Ciljevi', de: 'Alle Ziele', fr: 'Tous les Objectifs', es: 'Todas las Metas', it: 'Tutti gli Obiettivi', pl: 'Wszystkie Cele', cn: '所有目标', jp: 'すべての目标' },
  'goals.filterNotStarted': { en: 'Not Started', hu: 'Nincs Elkezdve', ro: 'Neînceput', sk: 'Nezačaté', hr: 'Nije Započeto', de: 'Nicht Begonnen', fr: 'Pas Commencé', es: 'No Iniciado', it: 'Non Iniziato', pl: 'Nierozpoczęte', cn: '未开始', jp: '未開始' },
  'goals.filterInProgress': { en: 'In Progress', hu: 'Folyamatban', ro: 'În Desfășurare', sk: 'Prebieha', hr: 'U Tijeku', de: 'In Bearbeitung', fr: 'En Cours', es: 'En Progreso', it: 'In Corso', pl: 'W Toku', cn: '进行中', jp: '進行中' },
  'goals.filterPaused': { en: 'Paused', hu: 'Szüneteltetve', ro: 'Pauză', sk: 'Pozastavené', hr: 'Pauzirano', de: 'Pausiert', fr: 'En Pause', es: 'Pausado', it: 'In Pausa', pl: 'Wstrzymane', cn: '已暂停', jp: '一時停止' },
  'goals.filterCompleted': { en: 'Completed', hu: 'Teljesítve', ro: 'Finalizat', sk: 'Dokončené', hr: 'Završeno', de: 'Abgeschlossen', fr: 'Terminé', es: 'Completado', it: 'Completato', pl: 'Ukończone', cn: '已完成', jp: '完了' },
  'goals.createGoal': { en: 'Create New Goal', hu: 'Új Cél Létrehozása', ro: 'Creează Obiectiv Nou', sk: 'Vytvoriť Nový Cieľ', hr: 'Kreiraj Novi Cilj', de: 'Neues Ziel Erstellen', fr: 'Créer un Nouvel Objectif', es: 'Crear Nueva Meta', it: 'Crea Nuovo Obiettivo', pl: 'Utwórz Nowy Cel', cn: '创建新目标', jp: '新しい目標を作成' },
  'goals.editGoal': { en: 'Edit Goal', hu: 'Cél Szerkesztése', ro: 'Editează Obiectiv', sk: 'Upraviť Cieľ', hr: 'Uredi Cilj', de: 'Ziel Bearbeiten', fr: 'Modifier l\'Objectif', es: 'Editar Meta', it: 'Modifica Obiettivo', pl: 'Edytuj Cel', cn: '编辑目标', jp: '目標を編集' },
  'goals.goalTitle': { en: 'Goal Title', hu: 'Cél Címe', ro: 'Titlu Obiectiv', sk: 'Názov Cieľa', hr: 'Naslov Cilja', de: 'Ziel Titel', fr: 'Titre de l\'Objectif', es: 'Título de la Meta', it: 'Titolo Obiettivo', pl: 'Tytuł Celu', cn: '目标标题', jp: '目標タイトル' },
  'goals.goalDescription': { en: 'Detailed Description', hu: 'Részletes Leírás', ro: 'Descriere Detaliată', sk: 'Podrobný Popis', hr: 'Detaljan Opis', de: 'Detaillierte Beschreibung', fr: 'Description Détaillée', es: 'Descripción Detallada', it: 'Descrizione Dettagliata', pl: 'Szczegółowy Opis', cn: '详细描述', jp: '詳細な説明' },
  'goals.targetDate': { en: 'Target Date', hu: 'Céldátum', ro: 'Data Țintă', sk: 'Cieľový Dátum', hr: 'Ciljni Datum', de: 'Zieldatum', fr: 'Date Cible', es: 'Fecha Objetivo', it: 'Data Obiettivo', pl: 'Data Docelowa', cn: '目标日期', jp: '目標日' },
  'goals.progress': { en: 'Progress', hu: 'Haladás', ro: 'Progres', sk: 'Pokrok', hr: 'Napredak', de: 'Fortschritt', fr: 'Progrès', es: 'Progreso', it: 'Progresso', pl: 'Postęp', cn: '进度', jp: '進捗' },
  'goals.status': { en: 'Status', hu: 'Állapot', ro: 'Stare', sk: 'Stav', hr: 'Status', de: 'Status', fr: 'Statut', es: 'Estado', it: 'Stato', pl: 'Status', cn: '状态', jp: 'ステータス' },
  'goals.noGoalsDefined': { en: 'No goals defined yet', hu: 'Még nincsenek célok meghatározva', ro: 'Încă nu sunt definite obiective', sk: 'Zatiaľ nie sú definované žiadne ciele', hr: 'Još nema definiranih ciljeva', de: 'Noch keine Ziele definiert', fr: 'Aucun objectif défini pour le moment', es: 'Aún no hay metas definidas', it: 'Nessun obiettivo ancora definito', pl: 'Nie zdefiniowano jeszcze celów', cn: '尚未定义目标', jp: '目標はまだ定義されていません' },
  'goals.noGoalsStatus': { en: 'No goals with this status', hu: 'Nincs cél ilyen állapottal', ro: 'Nu există obiective cu această stare', sk: 'Žiadne ciele s týmto stavom', hr: 'Nema ciljeva s ovim statusom', de: 'Keine Ziele mit diesem Status', fr: 'Aucun objectif avec ce statut', es: 'No hay metas con este estado', it: 'Nessun obiettivo con questo stato', pl: 'Brak celów o tym statusie', cn: '没有此状态的目标', jp: 'このステータスの目標はありません' },
  'goals.defineFirstGoal': { en: 'Define First Goal', hu: 'Első Cél Meghatározása', ro: 'Definește Primul Obiectiv', sk: 'Definovať Prvý Cieľ', hr: 'Definiraj Prvi Cilj', de: 'Erstes Ziel Definieren', fr: 'Définir le Premier Objectif', es: 'Definir Primera Meta', it: 'Definisci Primo Obiettivo', pl: 'Zdefiniuj Pierwszy Cel', cn: '定义第一个目标', jp: '最初の目標を定義' },
  'goals.daysLeft': { en: 'days left', hu: 'nap van hátra', ro: 'zile rămase', sk: 'dní zostáva', hr: 'dana preostalo', de: 'Tage übrig', fr: 'jours restants', es: 'días restantes', it: 'giorni rimasti', pl: 'dni pozostało', cn: '天剩余', jp: '日残り' },
  'goals.dueToday': { en: 'Due today!', hu: 'Ma esedékes!', ro: 'Scadent astăzi!', sk: 'Splatné dnes!', hr: 'Dospijeva danas!', de: 'Heute fällig!', fr: 'Dû aujourd\'hui !', es: '¡Vence hoy!', it: 'Scade oggi!', pl: 'Termin dzisiaj!', cn: '今天截止！', jp: '今日が期限！' },
  'goals.overdue': { en: 'days overdue', hu: 'napja lejárt', ro: 'zile întârziere', sk: 'dní po splatnosti', hr: 'dana kašnjenja', de: 'Tage überfällig', fr: 'jours de retard', es: 'días de retraso', it: 'giorni di ritardo', pl: 'dni opóźnienia', cn: '天逾期', jp: '日遅れ' },

  // Notes View
  'notes.title': { en: 'Smart Notes', hu: 'Okos Jegyzetek', ro: 'Notițe Inteligente', sk: 'Inteligentné Poznámky', hr: 'Pametne Bilješke', de: 'Intelligente Notizen', fr: 'Notes Intelligentes', es: 'Notas Inteligentes', it: 'Note Intelligenti', pl: 'Inteligentne Notatki', cn: '智能笔记', jp: 'スマートノート' },
  'notes.subtitle': { en: 'Ideas, references and inspiration organized', hu: 'Ötletek, hivatkozások és inspiráció rendszerezve', ro: 'Idei, referințe și inspirație organizate', sk: 'Organizované nápady, odkazy a inšpirácia', hr: 'Ideje, reference i inspiracija organizirani', de: 'Ideen, Referenzen und Inspiration organisiert', fr: 'Idées, références et inspiration organisées', es: 'Ideas, referencias e inspiración organizadas', it: 'Idee, riferimenti e ispirazione organizzati', pl: 'Uporządkowane pomysły, referencje i inspiracje', cn: '组织好的想法、参考资料和灵感', jp: 'アイデア、参考文献、インスピレーションを整理' },
  'notes.newNote': { en: 'New Note', hu: 'Új Jegyzet', ro: 'Notiță Nouă', sk: 'Nová Poznámka', hr: 'Nova Bilješka', de: 'Neue Notiz', fr: 'Nouvelle Note', es: 'Nueva Nota', it: 'Nuova Nota', pl: 'Nowa Notatka', cn: '新笔记', jp: '新しいノート' },
  'notes.searchPlaceholder': { en: 'Search in notes...', hu: 'Keresés a jegyzetekben...', ro: 'Caută în notițe...', sk: 'Hľadať v poznámkach...', hr: 'Pretraži bilješke...', de: 'In Notizen suchen...', fr: 'Rechercher dans les notes...', es: 'Buscar en notas...', it: 'Cerca nelle note...', pl: 'Szukaj w notatkach...', cn: '搜索笔记...', jp: 'ノートを検索...' },
  'notes.allTags': { en: 'All Tags', hu: 'Minden Címke', ro: 'Toate Etichetele', sk: 'Všetky Značky', hr: 'Svi Tagovi', de: 'Alle Tags', fr: 'Toutes les Étiquettes', es: 'Todas las Etiquetas', it: 'Tutti i Tag', pl: 'Wszystkie Tagi', cn: '所有标签', jp: 'すべてのタグ' },
  'notes.editNote': { en: 'Edit Note', hu: 'Jegyzet Szerkesztése', ro: 'Editează Notița', sk: 'Upraviť Poznámku', hr: 'Uredi Bilješku', de: 'Notiz Bearbeiten', fr: 'Modifier la Note', es: 'Editar Nota', it: 'Modifica Nota', pl: 'Edytuj Notatkę', cn: '编辑笔记', jp: 'ノートを編集' },
  'notes.createNote': { en: 'Create New Note', hu: 'Új Jegyzet Létrehozása', ro: 'Creează Notiță Nouă', sk: 'Vytvoriť Novú Poznámku', hr: 'Kreiraj Novu Bilješku', de: 'Neue Notiz Erstellen', fr: 'Créer une Nouvelle Note', es: 'Crear Nueva Nota', it: 'Crea Nuova Nota', pl: 'Utwórz Nową Notatkę', cn: '创建新笔记', jp: '新しいノートを作成' },
  'notes.titleLabel': { en: 'Title', hu: 'Cím', ro: 'Titlu', sk: 'Názov', hr: 'Naslov', de: 'Titel', fr: 'Titre', es: 'Título', it: 'Titolo', pl: 'Tytuł', cn: '标题', jp: 'タイトル' },
  'notes.contentLabel': { en: 'Content', hu: 'Tartalom', ro: 'Conținut', sk: 'Obsah', hr: 'Sadržaj', de: 'Inhalt', fr: 'Contenu', es: 'Contenido', it: 'Contenuto', pl: 'Treść', cn: '内容', jp: '内容' },
  'notes.contentPlaceholder': { en: 'Write anything here... Links will be automatically detected!', hu: 'Írjon ide bármit... A linkek automatikusan felismerésre kerülnek!', ro: 'Scrie orice aici... Link-urile vor fi detectate automat!', sk: 'Napíšte sem čokoľvek... Odkazy budú automaticky zistené!', hr: 'Napišite bilo što ovdje... Linkovi će biti automatski prepoznati!', de: 'Schreiben Sie hier etwas... Links werden automatisch erkannt!', fr: 'Écrivez n\'importe quoi ici... Les liens seront détectés automatiquement !', es: '¡Escribe cualquier cosa aquí... Los enlaces se detectarán automáticamente!', it: 'Scrivi qualsiasi cosa qui... I link verranno rilevati automaticamente!', pl: 'Napisz cokolwiek tutaj... Linki zostaną wykryte automatycznie!', cn: '在这里写任何东西... 链接将被自动检测！', jp: 'ここに何か書いてください... リンクは自動的に検出されます！' },
  'notes.tagsLabel': { en: 'Tags (comma separated)', hu: 'Címkék (vesszővel elválasztva)', ro: 'Etichete (separate prin virgulă)', sk: 'Značky (oddelené čiarkou)', hr: 'Tagovi (odvojeni zarezom)', de: 'Tags (durch Komma getrennt)', fr: 'Étiquettes (séparées par des virgules)', es: 'Etiquetas (separadas por comas)', it: 'Tag (separati da virgola)', pl: 'Tagi (oddzielone przecinkiem)', cn: '标签（逗号分隔）', jp: 'タグ（カンマ区切り）' },
  'notes.tagsPlaceholder': { en: 'idea, project, important...', hu: 'ötlet, projekt, fontos...', ro: 'idee, proiect, important...', sk: 'nápad, projekt, dôležité...', hr: 'ideja, projekt, važno...', de: 'Idee, Projekt, Wichtig...', fr: 'idée, projet, important...', es: 'idea, proyecto, importante...', it: 'idea, progetto, importante...', pl: 'idea, projekt, ważne...', cn: '想法，项目，重要...', jp: 'アイデア、プロジェクト、重要...' },
  'notes.noResults': { en: 'No results found for your search criteria', hu: 'Nincs találat a keresési feltételekre', ro: 'Niciun rezultat găsit pentru criteriile de căutare', sk: 'Žiadne výsledky pre vaše kritériá vyhľadávania', hr: 'Nema rezultata za vaše kriterije pretraživanja', de: 'Keine Ergebnisse für Ihre Suchkriterien gefunden', fr: 'Aucun résultat trouvé pour vos critères de recherche', es: 'No se encontraron resultados para sus criterios de búsqueda', it: 'Nessun risultato trovato per i tuoi criteri di ricerca', pl: 'Nie znaleziono wyników dla Twoich kryteriów wyszukiwania', cn: '未找到符合您搜索条件的结果', jp: '検索条件に一致する結果は見つかりませんでした' },
  'notes.noNotes': { en: 'No notes yet', hu: 'Még nincsenek jegyzetek', ro: 'Încă nu sunt notițe', sk: 'Zatiaľ žiadne poznámky', hr: 'Još nema bilješki', de: 'Noch keine Notizen', fr: 'Pas encore de notes', es: 'Aún no hay notas', it: 'Ancora nessuna nota', pl: 'Brak notatek', cn: '暂无笔记', jp: 'まだノートはありません' },
  'notes.createFirstNote': { en: 'Create First Note', hu: 'Első Jegyzet Létrehozása', ro: 'Creează Prima Notiță', sk: 'Vytvoriť Prvú Poznámku', hr: 'Kreiraj Prvu Bilješku', de: 'Erste Notiz Espellen', fr: 'Créer la Première Note', es: 'Crear Primera Nota', it: 'Crea Prima Nota', pl: 'Utwórz Pierwszą Notatkę', cn: '创建第一个笔记', jp: '最初のノートを作成' },
  'notes.linked': { en: 'linked', hu: 'csatolva', ro: 'legat', sk: 'prepojené', hr: 'povezano', de: 'verknüpft', fr: 'lié', es: 'vinculado', it: 'collegato', pl: 'połączone', cn: '已链接', jp: 'リンク済み' },

  // Pomodoro View
  'pomodoro.title': { en: 'Pomodoro Timer', hu: 'Pomodoro Időzítő', ro: 'Cronometru Pomodoro', sk: 'Pomodoro Časovač', hr: 'Pomodoro Tajmer', de: 'Pomodoro Timer', fr: 'Minuteur Pomodoro', es: 'Temporizador Pomodoro', it: 'Timer Pomodoro', pl: 'Zegar Pomodoro', cn: '番茄钟', jp: 'ポモドーロタイマー' },
  'pomodoro.subtitle': { en: 'Boost productivity with focus sessions', hu: 'Növelje termelékenységét fókuszált munkamenetekkel', ro: 'Crește productivitatea cu sesiuni de concentrare', sk: 'Zvýšte produktivitu s reláciami sústredenia', hr: 'Povećajte produktivnost s fokus sesijama', de: 'Steigern Sie die Produktivität mit Fokus-Sitzungen', fr: 'Boostez votre productivité avec des sessions de concentration', es: 'Aumenta la productividad con sesiones de enfoque', it: 'Aumenta la produttività con sessioni di concentrazione', pl: 'Zwiększ produktywność dzięki sesjom skupienia', cn: '通过专注会话提高生产力', jp: '集中セッションで生産性を向上' },
  'pomodoro.today': { en: 'Today', hu: 'Ma', ro: 'Astăzi', sk: 'Dnes', hr: 'Danas', de: 'Heute', fr: 'Aujourd\'hui', es: 'Hoy', it: 'Oggi', pl: 'Dzisiaj', cn: '今天', jp: '今日' },
  'pomodoro.pomodoros': { en: 'Pomodoros', hu: 'Pomodorok', ro: 'Pomodoro-uri', sk: 'Pomodora', hr: 'Pomodora', de: 'Pomodoros', fr: 'Pomodoros', es: 'Pomodoros', it: 'Pomodori', pl: 'Pomodory', cn: '番茄', jp: 'ポモドーロ' },
  'pomodoro.session': { en: 'Session', hu: 'Munkamenet', ro: 'Sesiune', sk: 'Relácia', hr: 'Sesija', de: 'Sitzung', fr: 'Session', es: 'Sesión', it: 'Sessione', pl: 'Sesja', cn: '会话', jp: 'セッション' },
  'pomodoro.completed': { en: 'Completed', hu: 'Befejezve', ro: 'Finalizat', sk: 'Dokončené', hr: 'Završeno', de: 'Abgeschlossen', fr: 'Terminé', es: 'Completado', it: 'Completato', pl: 'Ukończone', cn: '已完成', jp: '完了' },
  'pomodoro.work': { en: 'Work', hu: 'Munka', ro: 'Muncă', sk: 'Práca', hr: 'Rad', de: 'Arbeit', fr: 'Travail', es: 'Trabajo', it: 'Lavoro', pl: 'Praca', cn: '工作', jp: '仕事' },
  'pomodoro.shortBreak': { en: 'Short Break', hu: 'Rövid Szünet', ro: 'Pauză Scurtă', sk: 'Krátka Prestávka', hr: 'Kratka Pauza', de: 'Kurze Pause', fr: 'Courte Pause', es: 'Descanso Corto', it: 'Pausa Breve', pl: 'Krótka Przerwa', cn: '短休息', jp: '短い休憩' },
  'pomodoro.longBreak': { en: 'Long Break', hu: 'Hosszú Szünet', ro: 'Pauză Lungă', sk: 'Dlhá Prestávka', hr: 'Duga Pauza', de: 'Lange Pause', fr: 'Longue Pause', es: 'Descanso Largo', it: 'Pausa Lunga', pl: 'Długa Przerwa', cn: '长休息', jp: '長い休憩' },
  'pomodoro.start': { en: 'Start', hu: 'Indítás', ro: 'Start', sk: 'Štart', hr: 'Start', de: 'Start', fr: 'Démarrer', es: 'Iniciar', it: 'Avvia', pl: 'Start', cn: '开始', jp: '開始' },
  'pomodoro.pause': { en: 'Pause', hu: 'Szünet', ro: 'Pauză', sk: 'Pauza', hr: 'Pauza', de: 'Pause', fr: 'Pause', es: 'Pausa', it: 'Pausa', pl: 'Pauza', cn: '暂停', jp: '一時停止' },
  'pomodoro.reset': { en: 'Reset', hu: 'Visszaállítás', ro: 'Resetare', sk: 'Resetovať', hr: 'Resetiraj', de: 'Zurücksetzen', fr: 'Réinitialiser', es: 'Reiniciar', it: 'Reimposta', pl: 'Resetuj', cn: '重置', jp: 'リセット' },
  'pomodoro.focusTime': { en: 'Focus Time', hu: 'Fókusz Idő', ro: 'Timp de Concentrare', sk: 'Čas Sústredenia', hr: 'Vrijeme Fokusa', de: 'Fokuszeit', fr: 'Temps de Concentration', es: 'Tiempo de Enfoque', it: 'Tempo di Concentrazione', pl: 'Czas Skupienia', cn: '专注时间', jp: '集中時間' },
  'pomodoro.tipsTitle': { en: 'Productivity Tips', hu: 'Termelékenységi Tippek', ro: 'Sfaturi de Productivitate', sk: 'Tipy na Produktivitu', hr: 'Savjeti za Produktivnost', de: 'Produktivitätstipps', fr: 'Conseils de Productivité', es: 'Consejos de Productividad', it: 'Suggerimenti per la Produttività', pl: 'Wskazówki Dotyczące Produktywności', cn: '生产力提示', jp: '生産性のヒント' },
  'pomodoro.tip1': { en: 'Focus on one task at a time', hu: 'Egyszerre csak egy feladatra koncentráljon', ro: 'Concentrează-te pe o singură sarcină', sk: 'Sústreďte sa na jednu úlohu naraz', hr: 'Fokusirajte se na jedan zadatak', de: 'Konzentrieren Sie sich auf eine Aufgabe', fr: 'Concentrez-vous sur une tâche à la fois', es: 'Enfócate en una tarea a la vez', it: 'Concentrati su un compito alla volta', pl: 'Skup się na jednym zadaniu', cn: '一次专注于一项任务', jp: '一度に1つのタスクに集中する' },
  'pomodoro.tip2': { en: 'Take regular breaks to avoid burnout', hu: 'Tartson rendszeres szüneteket a kiégés elkerülése érdekében', ro: 'Ia pauze regulate pentru a evita epuizarea', sk: 'Robte pravidelné prestávky, aby ste predišli vyhoreniu', hr: 'Pravite redovite pauze kako biste izbjegli izgaranje', de: 'Machen Sie regelmäßig Pausen', fr: 'Prenez des pauses régulières', es: 'Toma descansos regulares', it: 'Fai pause regolari', pl: 'Rób regularne przerwy', cn: '定期休息以避免倦怠', jp: '燃え尽き症候群を防ぐために定期的に休憩を取る' },
  'pomodoro.tip3': { en: 'Eliminate distractions during focus time', hu: 'Iktassa ki a zavaró tényezőket fókusz idő alatt', ro: 'Elimină distragerile în timpul concentrării', sk: 'Eliminujte rozptýlenia počas času sústredenia', hr: 'Eliminirajte ometanja tijekom fokusa', de: 'Beseitigen Sie Ablenkungen', fr: 'Éliminez les distractions', es: 'Elimina las distracciones', it: 'Elimina le distrazioni', pl: 'Wyeliminuj rozpraszacze', cn: '专注时消除干扰', jp: '集中時間中は気を散らすものを排除する' },
  'pomodoro.tip4': { en: 'Break large tasks into smaller chunks', hu: 'Bontsa a nagy feladatokat kisebb részekre', ro: 'Împarte sarcinile mari în bucăți mai mici', sk: 'Rozdeľte veľké úlohy na menšie časti', hr: 'Podijelite velike zadatke na manje dijelove', de: 'Teilen Sie große Aufgaben in kleinere', fr: 'Divisez les grandes tâches', es: 'Divide las tareas grandes', it: 'Dividi i grandi compiti', pl: 'Podziel duże zadania', cn: '将大任务分解为小块', jp: '大きなタスクを小さな塊に分割する' },
  'pomodoro.tip5': { en: 'Stretch or walk during short breaks', hu: 'Nyújtson vagy sétáljon a rövid szünetekben', ro: 'Întinde-te sau mergi în timpul pauzelor scurte', sk: 'Počas krátkych prestávok sa ponaťahujte', hr: 'Istegnite se ili prošetajte tijekom pauza', de: 'Strecken oder gehen Sie in Pausen', fr: 'Étirez-vous ou marchez', es: 'Estírate o camina', it: 'Fai stretching o cammina', pl: 'Rozciągnij się lub przejdź', cn: '短暂休息时伸展或散步', jp: '短い休憩中にストレッチや散歩をする' },
  'pomodoro.tip6': { en: 'Use long breaks to recharge mentally', hu: 'Használja a hosszú szüneteket mentális feltöltődésre', ro: 'Folosește pauzele lungi pentru a te reîncărca mental', sk: 'Využite dlhé prestávky na mentálne načerpanie', hr: 'Iskoristite duge pauze za mentalno punjenje', de: 'Nutzen Sie lange Pausen zum Aufladen', fr: 'Utilisez les longues pauses', es: 'Usa los descansos largos', it: 'Usa le pause lunghe', pl: 'Wykorzystaj długie przerwy', cn: '利用长假进行精神充电', jp: '長い休憩を使って精神的に充電する' },
  'pomodoro.tip7': { en: 'Stay hydrated throughout the day', hu: 'Fogyasszon elegendő folyadékot egész nap', ro: 'Hidratează-te pe parcursul zilei', sk: 'Dodržiavajte pitný režim počas dňa', hr: 'Ostanite hidrirani tijekom dana', de: 'Bleiben Sie hydriert', fr: 'Restez hydraté', es: 'Mantente hidratado', it: 'Rimani idratato', pl: 'Nawadniaj się', cn: '全天保持水分', jp: '一日中水分補給をする' },
  'pomodoro.tip8': { en: 'Review what you accomplished', hu: 'Tekintse át, mit ért el', ro: 'Revizuiește ce ai realizat', sk: 'Skontrolujte, čo ste dosiahli', hr: 'Pregledajte što ste postigli', de: 'Überprüfen Sie, was Sie erreicht haben', fr: 'Passez en revue vos réalisations', es: 'Revisa lo que lograste', it: 'Rivedi ciò che hai realizzato', pl: 'Przejrzyj swoje osiągnięcia', cn: '回顾你的成就', jp: '達成したことを確認する' },

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