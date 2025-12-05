import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'hu' | 'de' | 'fr' | 'es' | 'it';

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
    de: 'Stundenplanung',
    fr: 'Planification Horaire',
    es: 'Planificación Horaria',
    it: 'Pianificazione Oraria'
  },
  'nav.dailyPlanning': {
    en: 'Daily Planning',
    hu: 'Napi Tervezés',
    de: 'Tagesplanung',
    fr: 'Planification Quotidienne',
    es: 'Planificación Diaria',
    it: 'Pianificazione Giornaliera'
  },
  'nav.weeklyPlanning': {
    en: 'Weekly Planning',
    hu: 'Heti Tervezés',
    de: 'Wochenplanung',
    fr: 'Planification Hebdomadaire',
    es: 'Planificación Semanal',
    it: 'Pianificazione Settimanale'
  },
  'nav.monthlyPlanning': {
    en: 'Monthly Planning',
    hu: 'Havi Tervezés',
    de: 'Monatsplanung',
    fr: 'Planification Mensuelle',
    es: 'Planificación Mensual',
    it: 'Pianificazione Mensile'
  },
  'nav.yearlyPlanning': {
    en: 'Yearly Planning',
    hu: 'Éves Tervezés',
    de: 'Jahresplanung',
    fr: 'Planification Annuelle',
    es: 'Planificación Anual',
    it: 'Pianificazione Annuale'
  },
  'nav.smartNotes': {
    en: 'Smart Notes',
    hu: 'Okos Jegyzetek',
    de: 'Intelligente Notizen',
    fr: 'Notes Intelligentes',
    es: 'Notas Inteligentes',
    it: 'Note Intelligenti'
  },
  'nav.goals': {
    en: 'Goals & Milestones',
    hu: 'Célok és Mérföldkövek',
    de: 'Ziele & Meilensteine',
    fr: 'Objectifs & Jalons',
    es: 'Objetivos y Hitos',
    it: 'Obiettivi e Traguardi'
  },
  'nav.visualPlanning': {
    en: 'Visual Planning',
    hu: 'Vizuális Tervezés',
    de: 'Visuelle Planung',
    fr: 'Planification Visuelle',
    es: 'Planificación Visual',
    it: 'Pianificazione Visiva'
  },
  'nav.budgetTracker': {
    en: 'Budget Tracker',
    hu: 'Költségkövető',
    de: 'Budget-Tracker',
    fr: 'Suivi du Budget',
    es: 'Seguimiento de Presupuesto',
    it: 'Tracciamento Budget'
  },
  'nav.pomodoroTimer': {
    en: 'Pomodoro Timer',
    hu: 'Pomodoro Időmérő',
    de: 'Pomodoro-Timer',
    fr: 'Minuteur Pomodoro',
    es: 'Temporizador Pomodoro',
    it: 'Timer Pomodoro'
  },
  'nav.statistics': {
    en: 'Statistics',
    hu: 'Statisztikák',
    de: 'Statistiken',
    fr: 'Statistiques',
    es: 'Estadísticas',
    it: 'Statistiche'
  },

  // Header
  'header.lightTheme': {
    en: 'Light Theme',
    hu: 'Világos Téma',
    de: 'Helles Thema',
    fr: 'Thème Clair',
    es: 'Tema Claro',
    it: 'Tema Chiaro'
  },
  'header.darkTheme': {
    en: 'Dark Theme',
    hu: 'Sötét Téma',
    de: 'Dunkles Thema',
    fr: 'Thème Sombre',
    es: 'Tema Oscuro',
    it: 'Tema Scuro'
  },
  'header.importExport': {
    en: 'Import/Export',
    hu: 'Importálás/Exportálás',
    de: 'Import/Export',
    fr: 'Importer/Exporter',
    es: 'Importar/Exportar',
    it: 'Importa/Esporta'
  },
  'header.settings': {
    en: 'Settings',
    hu: 'Beállítások',
    de: 'Einstellungen',
    fr: 'Paramètres',
    es: 'Configuración',
    it: 'Impostazioni'
  },

  // Pomodoro Timer
  'pomodoro.title': {
    en: 'Pomodoro Timer',
    hu: 'Pomodoro Időmérő',
    de: 'Pomodoro-Timer',
    fr: 'Minuteur Pomodoro',
    es: 'Temporizador Pomodoro',
    it: 'Timer Pomodoro'
  },
  'pomodoro.subtitle': {
    en: 'Boost your productivity with focused work sessions',
    hu: 'Növeld a produktivitásod fókuszált munkamenetekkel',
    de: 'Steigern Sie Ihre Produktivität mit fokussierten Arbeitssitzungen',
    fr: 'Augmentez votre productivité avec des sessions de travail ciblées',
    es: 'Aumenta tu productividad con sesiones de trabajo enfocadas',
    it: 'Aumenta la tua produttività con sessioni di lavoro mirate'
  },
  'pomodoro.focusTime': {
    en: 'Focus Time',
    hu: 'Fókuszidő',
    de: 'Fokuszeit',
    fr: 'Temps de Concentration',
    es: 'Tiempo de Enfoque',
    it: 'Tempo di Concentrazione'
  },
  'pomodoro.shortBreak': {
    en: 'Short Break',
    hu: 'Rövid Szünet',
    de: 'Kurze Pause',
    fr: 'Courte Pause',
    es: 'Descanso Corto',
    it: 'Pausa Breve'
  },
  'pomodoro.longBreak': {
    en: 'Long Break',
    hu: 'Hosszú Szünet',
    de: 'Lange Pause',
    fr: 'Longue Pause',
    es: 'Descanso Largo',
    it: 'Pausa Lunga'
  },
  'pomodoro.session': {
    en: 'Session',
    hu: 'Munkamenet',
    de: 'Sitzung',
    fr: 'Session',
    es: 'Sesión',
    it: 'Sessione'
  },
  'pomodoro.start': {
    en: 'Start',
    hu: 'Indítás',
    de: 'Start',
    fr: 'Démarrer',
    es: 'Iniciar',
    it: 'Avvia'
  },
  'pomodoro.pause': {
    en: 'Pause',
    hu: 'Szünet',
    de: 'Pause',
    fr: 'Pause',
    es: 'Pausa',
    it: 'Pausa'
  },
  'pomodoro.reset': {
    en: 'Reset',
    hu: 'Visszaállítás',
    de: 'Zurücksetzen',
    fr: 'Réinitialiser',
    es: 'Reiniciar',
    it: 'Ripristina'
  },
  'pomodoro.completed': {
    en: 'Completed',
    hu: 'Befejezett',
    de: 'Abgeschlossen',
    fr: 'Terminé',
    es: 'Completado',
    it: 'Completato'
  },
  'pomodoro.pomodoros': {
    en: 'Pomodoros',
    hu: 'Pomodoro',
    de: 'Pomodoros',
    fr: 'Pomodoros',
    es: 'Pomodoros',
    it: 'Pomodori'
  },
  'pomodoro.tip1': {
    en: 'Click Start to begin a 25-minute focus session',
    hu: 'Kattints az Indításra egy 25 perces fókusz munkamenet kezdéséhez',
    de: 'Klicken Sie auf Start, um eine 25-minütige Fokussitzung zu beginnen',
    fr: 'Cliquez sur Démarrer pour commencer une session de concentration de 25 minutes',
    es: 'Haz clic en Iniciar para comenzar una sesión de enfoque de 25 minutos',
    it: 'Fai clic su Avvia per iniziare una sessione di concentrazione di 25 minuti'
  },
  'pomodoro.tip2': {
    en: 'Work with full concentration until the timer rings',
    hu: 'Dolgozz teljes koncentrációval, amíg az időmérő csörög',
    de: 'Arbeiten Sie mit voller Konzentration, bis der Timer klingelt',
    fr: 'Travaillez avec une concentration totale jusqu\'à ce que la minuterie sonne',
    es: 'Trabaja con total concentración hasta que suene el temporizador',
    it: 'Lavora con piena concentrazione finché il timer non suona'
  },
  'pomodoro.tip3': {
    en: 'Take a 5-minute break after each session',
    hu: 'Tarts 5 perces szünetet minden munkamenet után',
    de: 'Machen Sie nach jeder Sitzung eine 5-minütige Pause',
    fr: 'Prenez une pause de 5 minutes après chaque session',
    es: 'Toma un descanso de 5 minutos después de cada sesión',
    it: 'Fai una pausa di 5 minuti dopo ogni sessione'
  },
  'pomodoro.tip4': {
    en: 'After 4 pomodoros, take a longer 15-minute break',
    hu: '4 pomodoro után tarts egy hosszabb, 15 perces szünetet',
    de: 'Machen Sie nach 4 Pomodoros eine längere 15-minütige Pause',
    fr: 'Après 4 pomodoros, prenez une pause plus longue de 15 minutes',
    es: 'Después de 4 pomodoros, toma un descanso más largo de 15 minutos',
    it: 'Dopo 4 pomodori, fai una pausa più lunga di 15 minuti'
  },
  'pomodoro.tip5': {
    en: 'Eliminate all distractions during work time',
    hu: 'Küszöbölj ki minden zavaró tényezőt munkaidő alatt',
    de: 'Beseitigen Sie alle Ablenkungen während der Arbeitszeit',
    fr: 'Éliminez toutes les distractions pendant le temps de travail',
    es: 'Elimina todas las distracciones durante el tiempo de trabajo',
    it: 'Elimina tutte le distrazioni durante il tempo di lavoro'
  },
  'pomodoro.tip6': {
    en: 'Use the Pause button if you need to step away temporarily',
    hu: 'Használd a Szünet gombot, ha ideiglenesen el kell távolodnod',
    de: 'Verwenden Sie die Pause-Taste, wenn Sie sich vorübergehend entfernen müssen',
    fr: 'Utilisez le bouton Pause si vous devez vous éloigner temporairement',
    es: 'Usa el botón Pausa si necesitas alejarte temporalmente',
    it: 'Usa il pulsante Pausa se devi allontanarti temporaneamente'
  },
  'pomodoro.tip7': {
    en: 'Click Reset to restart the current timer',
    hu: 'Kattints a Visszaállításra az aktuális időmérő újraindításához',
    de: 'Klicken Sie auf Zurücksetzen, um den aktuellen Timer neu zu starten',
    fr: 'Cliquez sur Réinitialiser pour redémarrer la minuterie actuelle',
    es: 'Haz clic en Reiniciar para reiniciar el temporizador actual',
    it: 'Fai clic su Ripristina per riavviare il timer corrente'
  },
  'pomodoro.tip8': {
    en: 'Track your daily progress with the statistics cards above',
    hu: 'Kövesd a napi előrehaladásod a fenti statisztikai kártyákon',
    de: 'Verfolgen Sie Ihren täglichen Fortschritt mit den Statistikkarten oben',
    fr: 'Suivez vos progrès quotidiens avec les cartes statistiques ci-dessus',
    es: 'Rastrea tu progreso diario con las tarjetas de estadísticas de arriba',
    it: 'Traccia i tuoi progressi giornalieri con le schede statistiche sopra'
  },
  'pomodoro.howToUse': {
    en: 'How to Use Pomodoro Timer',
    hu: 'Hogyan Használd a Pomodoro Időmérőt',
    de: 'So verwenden Sie den Pomodoro-Timer',
    fr: 'Comment Utiliser le Minuteur Pomodoro',
    es: 'Cómo Usar el Temporizador Pomodoro',
    it: 'Come Usare il Timer Pomodoro'
  },
  'nav.navigation': {
    en: 'Navigation',
    hu: 'Navigáció',
    de: 'Navigation',
    fr: 'Navigation',
    es: 'Navegación',
    it: 'Navigazione'
  },
  
  // Header
  'header.title': {
    en: 'ContentPlanner Pro',
    hu: 'ContentPlanner Pro',
    de: 'ContentPlanner Pro',
    fr: 'ContentPlanner Pro',
    es: 'ContentPlanner Pro',
    it: 'ContentPlanner Pro'
  },
  'header.subtitle': {
    en: 'Professional Planning for Content Creators',
    hu: 'Professzionális Tervezés Tartalomkészítőknek',
    de: 'Professionelle Planung für Content-Ersteller',
    fr: 'Planification Professionnelle pour Créateurs de Contenu',
    es: 'Planificación Profesional para Creadores de Contenido',
    it: 'Pianificazione Professionale per Creatori di Contenuti'
  },
  
  // Common buttons and actions
  'common.save': {
    en: 'Save',
    hu: 'Mentés',
    de: 'Speichern',
    fr: 'Enregistrer',
    es: 'Guardar',
    it: 'Salva'
  },
  'common.cancel': {
    en: 'Cancel',
    hu: 'Mégse',
    de: 'Abbrechen',
    fr: 'Annuler',
    es: 'Cancelar',
    it: 'Annulla'
  },
  'common.delete': {
    en: 'Delete',
    hu: 'Törlés',
    de: 'Löschen',
    fr: 'Supprimer',
    es: 'Eliminar',
    it: 'Elimina'
  },
  'common.edit': {
    en: 'Edit',
    hu: 'Szerkesztés',
    de: 'Bearbeiten',
    fr: 'Modifier',
    es: 'Editar',
    it: 'Modifica'
  },
  'common.add': {
    en: 'Add',
    hu: 'Hozzáadás',
    de: 'Hinzufügen',
    fr: 'Ajouter',
    es: 'Añadir',
    it: 'Aggiungi'
  },
  'common.update': {
    en: 'Update',
    hu: 'Frissítés',
    de: 'Aktualisieren',
    fr: 'Mettre à jour',
    es: 'Actualizar',
    it: 'Aggiorna'
  },
  'common.create': {
    en: 'Create',
    hu: 'Létrehozás',
    de: 'Erstellen',
    fr: 'Créer',
    es: 'Crear',
    it: 'Crea'
  },
  'common.close': {
    en: 'Close',
    hu: 'Bezárás',
    de: 'Schließen',
    fr: 'Fermer',
    es: 'Cerrar',
    it: 'Chiudi'
  },
  'common.search': {
    en: 'Search',
    hu: 'Keresés',
    de: 'Suchen',
    fr: 'Rechercher',
    es: 'Buscar',
    it: 'Cerca'
  },
  'common.filter': {
    en: 'Filter',
    hu: 'Szűrés',
    de: 'Filtern',
    fr: 'Filtrer',
    es: 'Filtrar',
    it: 'Filtra'
  },
  'common.all': {
    en: 'All',
    hu: 'Összes',
    de: 'Alle',
    fr: 'Tous',
    es: 'Todos',
    it: 'Tutti'
  },
  'common.none': {
    en: 'None',
    hu: 'Nincs',
    de: 'Keine',
    fr: 'Aucun',
    es: 'Ninguno',
    it: 'Nessuno'
  },
  'common.loading': {
    en: 'Loading...',
    hu: 'Betöltés...',
    de: 'Laden...',
    fr: 'Chargement...',
    es: 'Cargando...',
    it: 'Caricamento...'
  },
  'common.error': {
    en: 'Error',
    hu: 'Hiba',
    de: 'Fehler',
    fr: 'Erreur',
    es: 'Error',
    it: 'Errore'
  },
  'common.success': {
    en: 'Success',
    hu: 'Sikeres',
    de: 'Erfolgreich',
    fr: 'Succès',
    es: 'Éxito',
    it: 'Successo'
  },
  'common.warning': {
    en: 'Warning',
    hu: 'Figyelmeztetés',
    de: 'Warnung',
    fr: 'Avertissement',
    es: 'Advertencia',
    it: 'Avviso'
  },
  'common.info': {
    en: 'Information',
    hu: 'Információ',
    de: 'Information',
    fr: 'Information',
    es: 'Información',
    it: 'Informazione'
  },
  
  // Daily View
  'daily.title': {
    en: 'Daily Planning',
    hu: 'Napi Tervezés',
    de: 'Tagesplanung',
    fr: 'Planification Quotidienne',
    es: 'Planificación Diaria',
    it: 'Pianificazione Giornaliera'
  },
  'daily.subtitle': {
    en: 'Organize your day efficiently and purposefully',
    hu: 'Szervezd meg a napodat hatékonyan és célirányosan',
    de: 'Organisiere deinen Tag effizient und zielgerichtet',
    fr: 'Organisez votre journée efficacement et avec un but',
    es: 'Organiza tu día de manera eficiente y con propósito',
    it: 'Organizza la tua giornata in modo efficiente e mirato'
  },
  'daily.newTask': {
    en: 'New Task',
    hu: 'Új Feladat',
    de: 'Neue Aufgabe',
    fr: 'Nouvelle Tâche',
    es: 'Nueva Tarea',
    it: 'Nuovo Compito'
  },
  'daily.selectDate': {
    en: 'Select Date',
    hu: 'Dátum Kiválasztása',
    de: 'Datum Auswählen',
    fr: 'Sélectionner la Date',
    es: 'Seleccionar Fecha',
    it: 'Seleziona Data'
  },
  'daily.completion': {
    en: 'Completion',
    hu: 'Teljesítés',
    de: 'Fertigstellung',
    fr: 'Achèvement',
    es: 'Finalización',
    it: 'Completamento'
  },
  'daily.tasks': {
    en: 'tasks',
    hu: 'feladat',
    de: 'Aufgaben',
    fr: 'tâches',
    es: 'tareas',
    it: 'compiti'
  },
  'daily.addTask': {
    en: 'Add New Task',
    hu: 'Új Feladat Hozzáadása',
    de: 'Neue Aufgabe Hinzufügen',
    fr: 'Ajouter une Nouvelle Tâche',
    es: 'Añadir Nueva Tarea',
    it: 'Aggiungi Nuovo Compito'
  },
  'daily.editTask': {
    en: 'Edit Task',
    hu: 'Feladat Szerkesztése',
    de: 'Aufgabe Bearbeiten',
    fr: 'Modifier la Tâche',
    es: 'Editar Tarea',
    it: 'Modifica Compito'
  },
  'daily.taskTitle': {
    en: 'Task Title',
    hu: 'Feladat Címe',
    de: 'Aufgabentitel',
    fr: 'Titre de la Tâche',
    es: 'Título de la Tarea',
    it: 'Titolo del Compito'
  },
  'daily.taskDescription': {
    en: 'Detailed Description',
    hu: 'Részletes Leírás',
    de: 'Detaillierte Beschreibung',
    fr: 'Description Détaillée',
    es: 'Descripción Detallada',
    it: 'Descrizione Dettagliata'
  },
  'daily.priority': {
    en: 'Priority',
    hu: 'Prioritás',
    de: 'Priorität',
    fr: 'Priorité',
    es: 'Prioridad',
    it: 'Priorità'
  },
  'daily.lowPriority': {
    en: 'Low Priority',
    hu: 'Alacsony Prioritás',
    de: 'Niedrige Priorität',
    fr: 'Priorité Faible',
    es: 'Prioridad Baja',
    it: 'Priorità Bassa'
  },
  'daily.mediumPriority': {
    en: 'Medium Priority',
    hu: 'Közepes Prioritás',
    de: 'Mittlere Priorität',
    fr: 'Priorité Moyenne',
    es: 'Prioridad Media',
    it: 'Priorità Media'
  },
  'daily.highPriority': {
    en: 'High Priority',
    hu: 'Magas Prioritás',
    de: 'Hohe Priorität',
    fr: 'Priorité Élevée',
    es: 'Prioridad Alta',
    it: 'Priorità Alta'
  },
  'daily.taskPlaceholder': {
    en: 'e.g. Video editing, blog post writing...',
    hu: 'pl. Videó szerkesztés, blog bejegyzés írása...',
    de: 'z.B. Videobearbeitung, Blog-Artikel schreiben...',
    fr: 'ex. Montage vidéo, rédaction d\'article de blog...',
    es: 'ej. Edición de video, escritura de artículo de blog...',
    it: 'es. Editing video, scrittura articolo blog...'
  },
  'daily.descriptionPlaceholder': {
    en: 'Details, links, notes...',
    hu: 'Részletek, linkek, jegyzetek...',
    de: 'Details, Links, Notizen...',
    fr: 'Détails, liens, notes...',
    es: 'Detalles, enlaces, notas...',
    it: 'Dettagli, link, note...'
  },
  
  // Budget View
  'budget.title': {
    en: 'Budget Tracker',
    hu: 'Költségkövető',
    de: 'Budget-Tracker',
    fr: 'Suivi du Budget',
    es: 'Seguimiento de Presupuesto',
    it: 'Tracciamento Budget'
  },
  'budget.subtitle': {
    en: 'PhD-level financial planning and subscription management',
    hu: 'PhD szintű pénzügyi tervezés és előfizetés kezelés',
    de: 'Finanzplanung und Abonnement-Management auf PhD-Niveau',
    fr: 'Planification financière et gestion des abonnements de niveau PhD',
    es: 'Planificación financiera y gestión de suscripciones de nivel PhD',
    it: 'Pianificazione finanziaria e gestione abbonamenti di livello PhD'
  },
  'budget.remainingBudget': {
    en: 'Remaining Budget',
    hu: 'Fennmaradó Költségvetés',
    de: 'Verbleibendes Budget',
    fr: 'Budget Restant',
    es: 'Presupuesto Restante',
    it: 'Budget Rimanente'
  },
  'budget.monthlySubscriptions': {
    en: 'Monthly Subscriptions',
    hu: 'Havi Előfizetések',
    de: 'Monatliche Abonnements',
    fr: 'Abonnements Mensuels',
    es: 'Suscripciones Mensuales',
    it: 'Abbonamenti Mensili'
  },
  'budget.otherExpenses': {
    en: 'Other Expenses',
    hu: 'Egyéb Kiadások',
    de: 'Sonstige Ausgaben',
    fr: 'Autres Dépenses',
    es: 'Otros Gastos',
    it: 'Altre Spese'
  },
  'budget.activeSubscriptions': {
    en: 'Active Subscriptions',
    hu: 'Aktív Előfizetések',
    de: 'Aktive Abonnements',
    fr: 'Abonnements Actifs',
    es: 'Suscripciones Activas',
    it: 'Abbonamenti Attivi'
  },
  'budget.overview': {
    en: 'Overview',
    hu: 'Áttekintés',
    de: 'Übersicht',
    fr: 'Aperçu',
    es: 'Resumen',
    it: 'Panoramica'
  },
  'budget.subscriptions': {
    en: 'Subscriptions',
    hu: 'Előfizetések',
    de: 'Abonnements',
    fr: 'Abonnements',
    es: 'Suscripciones',
    it: 'Abbonamenti'
  },
  'budget.transactions': {
    en: 'Transactions',
    hu: 'Tranzakciók',
    de: 'Transaktionen',
    fr: 'Transactions',
    es: 'Transacciones',
    it: 'Transazioni'
  },
  'budget.addSubscription': {
    en: 'Add New Subscription',
    hu: 'Új Előfizetés Hozzáadása',
    de: 'Neues Abonnement Hinzufügen',
    fr: 'Ajouter un Nouvel Abonnement',
    es: 'Añadir Nueva Suscripción',
    it: 'Aggiungi Nuovo Abbonamento'
  },
  'budget.editSubscription': {
    en: 'Edit Subscription',
    hu: 'Előfizetés Szerkesztése',
    de: 'Abonnement Bearbeiten',
    fr: 'Modifier l\'Abonnement',
    es: 'Editar Suscripción',
    it: 'Modifica Abbonamento'
  },
  'budget.serviceName': {
    en: 'Service Name',
    hu: 'Szolgáltatás Neve',
    de: 'Dienstname',
    fr: 'Nom du Service',
    es: 'Nombre del Servicio',
    it: 'Nome del Servizio'
  },
  'budget.description': {
    en: 'Description',
    hu: 'Leírás',
    de: 'Beschreibung',
    fr: 'Description',
    es: 'Descripción',
    it: 'Descrizione'
  },
  'budget.cost': {
    en: 'Cost',
    hu: 'Költség',
    de: 'Kosten',
    fr: 'Coût',
    es: 'Costo',
    it: 'Costo'
  },
  'budget.currency': {
    en: 'Currency',
    hu: 'Valuta',
    de: 'Währung',
    fr: 'Devise',
    es: 'Moneda',
    it: 'Valuta'
  },
  'budget.billingCycle': {
    en: 'Billing Cycle',
    hu: 'Számlázási Ciklus',
    de: 'Abrechnungszyklus',
    fr: 'Cycle de Facturation',
    es: 'Ciclo de Facturación',
    it: 'Ciclo di Fatturazione'
  },
  'budget.category': {
    en: 'Category',
    hu: 'Kategória',
    de: 'Kategorie',
    fr: 'Catégorie',
    es: 'Categoría',
    it: 'Categoria'
  },
  'budget.nextPayment': {
    en: 'Next Payment Date',
    hu: 'Következő Fizetés Dátuma',
    de: 'Nächstes Zahlungsdatum',
    fr: 'Date du Prochain Paiement',
    es: 'Fecha del Próximo Pago',
    it: 'Data del Prossimo Pagamento'
  },
  'budget.activeSubscription': {
    en: 'Active subscription',
    hu: 'Aktív előfizetés',
    de: 'Aktives Abonnement',
    fr: 'Abonnement actif',
    es: 'Suscripción activa',
    it: 'Abbonamento attivo'
  },
  'budget.monthly': {
    en: 'Monthly',
    hu: 'Havi',
    de: 'Monatlich',
    fr: 'Mensuel',
    es: 'Mensual',
    it: 'Mensile'
  },
  'budget.yearly': {
    en: 'Yearly',
    hu: 'Éves',
    de: 'Jährlich',
    fr: 'Annuel',
    es: 'Anual',
    it: 'Annuale'
  },
  'budget.weekly': {
    en: 'Weekly',
    hu: 'Heti',
    de: 'Wöchentlich',
    fr: 'Hebdomadaire',
    es: 'Semanal',
    it: 'Settimanale'
  },
  'budget.daily': {
    en: 'Daily',
    hu: 'Napi',
    de: 'Täglich',
    fr: 'Quotidien',
    es: 'Diario',
    it: 'Giornaliero'
  },
  'budget.oneTime': {
    en: 'One-time',
    hu: 'Egyszeri',
    de: 'Einmalig',
    fr: 'Unique',
    es: 'Una vez',
    it: 'Una tantum'
  },
  'budget.addTransaction': {
    en: 'Add New Transaction',
    hu: 'Új Tranzakció Hozzáadása',
    de: 'Neue Transaktion Hinzufügen',
    fr: 'Ajouter une Nouvelle Transaction',
    es: 'Añadir Nueva Transacción',
    it: 'Aggiungi Nuova Transazione'
  },
  'budget.amount': {
    en: 'Amount',
    hu: 'Összeg',
    de: 'Betrag',
    fr: 'Montant',
    es: 'Cantidad',
    it: 'Importo'
  },
  'budget.type': {
    en: 'Type',
    hu: 'Típus',
    de: 'Typ',
    fr: 'Type',
    es: 'Tipo',
    it: 'Tipo'
  },
  'budget.expense': {
    en: 'Expense',
    hu: 'Kiadás',
    de: 'Ausgabe',
    fr: 'Dépense',
    es: 'Gasto',
    it: 'Spesa'
  },
  'budget.income': {
    en: 'Income',
    hu: 'Bevétel',
    de: 'Einkommen',
    fr: 'Revenu',
    es: 'Ingreso',
    it: 'Entrata'
  },
  'budget.date': {
    en: 'Date',
    hu: 'Dátum',
    de: 'Datum',
    fr: 'Date',
    es: 'Fecha',
    it: 'Data'
  },
  'budget.status': {
    en: 'Status',
    hu: 'Állapot',
    de: 'Status',
    fr: 'Statut',
    es: 'Estado',
    it: 'Stato'
  },
  'budget.active': {
    en: 'Active',
    hu: 'Aktív',
    de: 'Aktiv',
    fr: 'Actif',
    es: 'Activo',
    it: 'Attivo'
  },
  'budget.inactive': {
    en: 'Inactive',
    hu: 'Inaktív',
    de: 'Inaktiv',
    fr: 'Inactif',
    es: 'Inactivo',
    it: 'Inattivo'
  },
  'budget.budgetProgress': {
    en: 'Monthly Budget Progress',
    hu: 'Havi Költségvetés Előrehaladása',
    de: 'Monatlicher Budget-Fortschritt',
    fr: 'Progression du Budget Mensuel',
    es: 'Progreso del Presupuesto Mensual',
    it: 'Progresso del Budget Mensile'
  },
  'budget.used': {
    en: 'Used',
    hu: 'Felhasznált',
    de: 'Verwendet',
    fr: 'Utilisé',
    es: 'Usado',
    it: 'Utilizzato'
  },
  'budget.upcomingPayments': {
    en: 'Upcoming Payments (Next 30 Days)',
    hu: 'Közelgő Fizetések (Következő 30 Nap)',
    de: 'Anstehende Zahlungen (Nächste 30 Tage)',
    fr: 'Paiements à Venir (30 Prochains Jours)',
    es: 'Pagos Próximos (Próximos 30 Días)',
    it: 'Pagamenti Imminenti (Prossimi 30 Giorni)'
  },
  'budget.budgetExceeded': {
    en: 'Budget Exceeded!',
    hu: 'Költségvetés Túllépve!',
    de: 'Budget Überschritten!',
    fr: 'Budget Dépassé!',
    es: '¡Presupuesto Excedido!',
    it: 'Budget Superato!'
  },
  'budget.budgetWarning': {
    en: 'Budget Warning!',
    hu: 'Költségvetési Figyelmeztetés!',
    de: 'Budget-Warnung!',
    fr: 'Avertissement Budget!',
    es: '¡Advertencia de Presupuesto!',
    it: 'Avviso Budget!'
  },
  'budget.noSubscriptions': {
    en: 'No subscriptions added yet',
    hu: 'Még nincsenek előfizetések hozzáadva',
    de: 'Noch keine Abonnements hinzugefügt',
    fr: 'Aucun abonnement ajouté pour le moment',
    es: 'Aún no se han añadido suscripciones',
    it: 'Nessun abbonamento aggiunto ancora'
  },
  'budget.addFirstSubscription': {
    en: 'Add First Subscription',
    hu: 'Első Előfizetés Hozzáadása',
    de: 'Erstes Abonnement Hinzufügen',
    fr: 'Ajouter le Premier Abonnement',
    es: 'Añadir Primera Suscripción',
    it: 'Aggiungi Primo Abbonamento'
  },
  'budget.noTransactions': {
    en: 'No transactions recorded yet',
    hu: 'Még nincsenek tranzakciók rögzítve',
    de: 'Noch keine Transaktionen aufgezeichnet',
    fr: 'Aucune transaction enregistrée pour le moment',
    es: 'Aún no se han registrado transacciones',
    it: 'Nessuna transazione registrata ancora'
  },
  'budget.addFirstTransaction': {
    en: 'Add First Transaction',
    hu: 'Első Tranzakció Hozzáadása',
    de: 'Erste Transaktion Hinzufügen',
    fr: 'Ajouter la Première Transaction',
    es: 'Añadir Primera Transacción',
    it: 'Aggiungi Prima Transazione'
  },
  'budget.servicePlaceholder': {
    en: 'e.g. Netflix, Spotify, Adobe...',
    hu: 'pl. Netflix, Spotify, Adobe...',
    de: 'z.B. Netflix, Spotify, Adobe...',
    fr: 'ex. Netflix, Spotify, Adobe...',
    es: 'ej. Netflix, Spotify, Adobe...',
    it: 'es. Netflix, Spotify, Adobe...'
  },
  'budget.descriptionPlaceholder': {
    en: 'Optional description...',
    hu: 'Opcionális leírás...',
    de: 'Optionale Beschreibung...',
    fr: 'Description optionnelle...',
    es: 'Descripción opcional...',
    it: 'Descrizione opzionale...'
  },
  'budget.transactionPlaceholder': {
    en: 'e.g. Grocery shopping, Freelance payment...',
    hu: 'pl. Bevásárlás, Szabadúszó fizetés...',
    de: 'z.B. Lebensmitteleinkauf, Freelancer-Zahlung...',
    fr: 'ex. Courses, Paiement freelance...',
    es: 'ej. Compras de comestibles, Pago freelance...',
    it: 'es. Spesa alimentare, Pagamento freelance...'
  },
  
  // Settings
  'settings.title': {
    en: 'Settings & Preferences',
    hu: 'Beállítások és Preferenciák',
    de: 'Einstellungen & Präferenzen',
    fr: 'Paramètres et Préférences',
    es: 'Configuración y Preferencias',
    it: 'Impostazioni e Preferenze'
  },
  'settings.subtitle': {
    en: 'Customize your ContentPlanner Pro experience',
    hu: 'Szabd testre a ContentPlanner Pro élményedet',
    de: 'Passe deine ContentPlanner Pro Erfahrung an',
    fr: 'Personnalisez votre expérience ContentPlanner Pro',
    es: 'Personaliza tu experiencia de ContentPlanner Pro',
    it: 'Personalizza la tua esperienza ContentPlanner Pro'
  },
  'settings.general': {
    en: 'General',
    hu: 'Általános',
    de: 'Allgemein',
    fr: 'Général',
    es: 'General',
    it: 'Generale'
  },
  'settings.budget': {
    en: 'Budget',
    hu: 'Költségvetés',
    de: 'Budget',
    fr: 'Budget',
    es: 'Presupuesto',
    it: 'Budget'
  },
  'settings.appearance': {
    en: 'Appearance',
    hu: 'Megjelenés',
    de: 'Erscheinungsbild',
    fr: 'Apparence',
    es: 'Apariencia',
    it: 'Aspetto'
  },
  'settings.notifications': {
    en: 'Notifications',
    hu: 'Értesítések',
    de: 'Benachrichtigungen',
    fr: 'Notifications',
    es: 'Notificaciones',
    it: 'Notifiche'
  },
  'settings.dataPrivacy': {
    en: 'Data & Privacy',
    hu: 'Adatok és Adatvédelem',
    de: 'Daten & Datenschutz',
    fr: 'Données et Confidentialité',
    es: 'Datos y Privacidad',
    it: 'Dati e Privacy'
  },
  'settings.language': {
    en: 'Language',
    hu: 'Nyelv',
    de: 'Sprache',
    fr: 'Langue',
    es: 'Idioma',
    it: 'Lingua'
  },
  'settings.timeZone': {
    en: 'Time Zone',
    hu: 'Időzóna',
    de: 'Zeitzone',
    fr: 'Fuseau Horaire',
    es: 'Zona Horaria',
    it: 'Fuso Orario'
  },
  'settings.dateFormat': {
    en: 'Date Format',
    hu: 'Dátum Formátum',
    de: 'Datumsformat',
    fr: 'Format de Date',
    es: 'Formato de Fecha',
    it: 'Formato Data'
  },
  'settings.autoSave': {
    en: 'Auto-save',
    hu: 'Automatikus mentés',
    de: 'Automatisches Speichern',
    fr: 'Sauvegarde automatique',
    es: 'Guardado automático',
    it: 'Salvataggio automatico'
  },
  'settings.autoSaveDesc': {
    en: 'Automatically save changes as you type',
    hu: 'Automatikusan menti a változásokat gépelés közben',
    de: 'Änderungen automatisch beim Tippen speichern',
    fr: 'Enregistrer automatiquement les modifications lors de la saisie',
    es: 'Guardar automáticamente los cambios mientras escribes',
    it: 'Salva automaticamente le modifiche mentre digiti'
  },
  'settings.monthlyBudget': {
    en: 'Monthly Budget',
    hu: 'Havi Költségvetés',
    de: 'Monatliches Budget',
    fr: 'Budget Mensuel',
    es: 'Presupuesto Mensual',
    it: 'Budget Mensile'
  },
  'settings.defaultCurrency': {
    en: 'Default Currency',
    hu: 'Alapértelmezett Valuta',
    de: 'Standardwährung',
    fr: 'Devise par Défaut',
    es: 'Moneda Predeterminada',
    it: 'Valuta Predefinita'
  },
  'settings.warningThreshold': {
    en: 'Budget Warning Threshold',
    hu: 'Költségvetési Figyelmeztetési Küszöb',
    de: 'Budget-Warnschwelle',
    fr: 'Seuil d\'Avertissement du Budget',
    es: 'Umbral de Advertencia del Presupuesto',
    it: 'Soglia di Avviso del Budget'
  },
  'settings.budgetNotifications': {
    en: 'Budget Notifications',
    hu: 'Költségvetési Értesítések',
    de: 'Budget-Benachrichtigungen',
    fr: 'Notifications de Budget',
    es: 'Notificaciones de Presupuesto',
    it: 'Notifiche Budget'
  },
  'settings.budgetNotificationsDesc': {
    en: 'Get notified when approaching budget limits',
    hu: 'Értesítést kapsz, amikor közeledik a költségvetési limit',
    de: 'Benachrichtigung bei Annäherung an Budgetgrenzen',
    fr: 'Être notifié lors de l\'approche des limites budgétaires',
    es: 'Recibir notificaciones al acercarse a los límites del presupuesto',
    it: 'Ricevi notifiche quando ti avvicini ai limiti del budget'
  },
  'settings.saveBudgetSettings': {
    en: 'Save Budget Settings',
    hu: 'Költségvetési Beállítások Mentése',
    de: 'Budget-Einstellungen Speichern',
    fr: 'Enregistrer les Paramètres de Budget',
    es: 'Guardar Configuración de Presupuesto',
    it: 'Salva Impostazioni Budget'
  },
  'settings.theme': {
    en: 'Theme',
    hu: 'Téma',
    de: 'Design',
    fr: 'Thème',
    es: 'Tema',
    it: 'Tema'
  },
  'settings.lightTheme': {
    en: 'Light Theme',
    hu: 'Világos Téma',
    de: 'Helles Design',
    fr: 'Thème Clair',
    es: 'Tema Claro',
    it: 'Tema Chiaro'
  },
  'settings.lightThemeDesc': {
    en: 'Clean and bright interface',
    hu: 'Tiszta és világos felület',
    de: 'Saubere und helle Oberfläche',
    fr: 'Interface propre et lumineuse',
    es: 'Interfaz limpia y brillante',
    it: 'Interfaccia pulita e luminosa'
  },
  'settings.darkTheme': {
    en: 'Dark Theme',
    hu: 'Sötét Téma',
    de: 'Dunkles Design',
    fr: 'Thème Sombre',
    es: 'Tema Oscuro',
    it: 'Tema Scuro'
  },
  'settings.darkThemeDesc': {
    en: 'Easy on the eyes',
    hu: 'Kíméletes a szemnek',
    de: 'Schonend für die Augen',
    fr: 'Doux pour les yeux',
    es: 'Suave para los ojos',
    it: 'Delicato per gli occhi'
  },
  'settings.sidebarPosition': {
    en: 'Sidebar Position',
    hu: 'Oldalsáv Pozíciója',
    de: 'Seitenleisten-Position',
    fr: 'Position de la Barre Latérale',
    es: 'Posición de la Barra Lateral',
    it: 'Posizione Barra Laterale'
  },
  'settings.leftSide': {
    en: 'Left Side',
    hu: 'Bal Oldal',
    de: 'Linke Seite',
    fr: 'Côté Gauche',
    es: 'Lado Izquierdo',
    it: 'Lato Sinistro'
  },
  'settings.rightSide': {
    en: 'Right Side',
    hu: 'Jobb Oldal',
    de: 'Rechte Seite',
    fr: 'Côté Droit',
    es: 'Lado Derecho',
    it: 'Lato Destro'
  },
  'settings.compactMode': {
    en: 'Compact Mode',
    hu: 'Kompakt Mód',
    de: 'Kompakter Modus',
    fr: 'Mode Compact',
    es: 'Modo Compacto',
    it: 'Modalità Compatta'
  },
  'settings.compactModeDesc': {
    en: 'Reduce spacing for more content',
    hu: 'Csökkentett térköz több tartalomért',
    de: 'Abstände reduzieren für mehr Inhalt',
    fr: 'Réduire l\'espacement pour plus de contenu',
    es: 'Reducir espaciado para más contenido',
    it: 'Riduci spaziatura per più contenuto'
  },
  'settings.animations': {
    en: 'Animations',
    hu: 'Animációk',
    de: 'Animationen',
    fr: 'Animations',
    es: 'Animaciones',
    it: 'Animazioni'
  },
  'settings.animationsDesc': {
    en: 'Enable smooth transitions and animations',
    hu: 'Sima átmenetek és animációk engedélyezése',
    de: 'Sanfte Übergänge und Animationen aktivieren',
    fr: 'Activer les transitions fluides et animations',
    es: 'Habilitar transiciones suaves y animaciones',
    it: 'Abilita transizioni fluide e animazioni'
  },
  'settings.notificationSettings': {
    en: 'Notification Settings',
    hu: 'Értesítési Beállítások',
    de: 'Benachrichtigungseinstellungen',
    fr: 'Paramètres de Notification',
    es: 'Configuración de Notificaciones',
    it: 'Impostazioni Notifiche'
  },
  'settings.taskReminders': {
    en: 'Task Reminders',
    hu: 'Feladat Emlékeztetők',
    de: 'Aufgaben-Erinnerungen',
    fr: 'Rappels de Tâches',
    es: 'Recordatorios de Tareas',
    it: 'Promemoria Attività'
  },
  'settings.taskRemindersDesc': {
    en: 'Get notified about upcoming tasks',
    hu: 'Értesítést kapsz a közelgő feladatokról',
    de: 'Benachrichtigung über anstehende Aufgaben',
    fr: 'Être notifié des tâches à venir',
    es: 'Recibir notificaciones sobre tareas próximas',
    it: 'Ricevi notifiche per le attività imminenti'
  },
  'settings.goalMilestones': {
    en: 'Goal Milestones',
    hu: 'Cél Mérföldkövek',
    de: 'Ziel-Meilensteine',
    fr: 'Jalons d\'Objectifs',
    es: 'Hitos de Objetivos',
    it: 'Traguardi Obiettivi'
  },
  'settings.goalMilestonesDesc': {
    en: 'Celebrate when you reach goal milestones',
    hu: 'Ünnepelj, amikor eléred a cél mérföldköveket',
    de: 'Feiern Sie das Erreichen von Ziel-Meilensteinen',
    fr: 'Célébrer l\'atteinte des jalons d\'objectifs',
    es: 'Celebrar cuando alcances hitos de objetivos',
    it: 'Celebra quando raggiungi i traguardi degli obiettivi'
  },
  'settings.subscriptionPayments': {
    en: 'Subscription Payments',
    hu: 'Előfizetési Fizetések',
    de: 'Abonnement-Zahlungen',
    fr: 'Paiements d\'Abonnement',
    es: 'Pagos de Suscripción',
    it: 'Pagamenti Abbonamento'
  },
  'settings.subscriptionPaymentsDesc': {
    en: 'Remind about upcoming subscription payments',
    hu: 'Emlékeztetés a közelgő előfizetési fizetésekről',
    de: 'Erinnerung an anstehende Abonnement-Zahlungen',
    fr: 'Rappeler les paiements d\'abonnement à venir',
    es: 'Recordar sobre pagos de suscripción próximos',
    it: 'Ricorda i pagamenti di abbonamento imminenti'
  },
  'settings.weeklySummary': {
    en: 'Weekly Summary',
    hu: 'Heti Összefoglaló',
    de: 'Wöchentliche Zusammenfassung',
    fr: 'Résumé Hebdomadaire',
    es: 'Resumen Semanal',
    it: 'Riassunto Settimanale'
  },
  'settings.weeklySummaryDesc': {
    en: 'Get a weekly summary of your progress',
    hu: 'Heti összefoglalót kapsz az előrehaladásodról',
    de: 'Wöchentliche Zusammenfassung Ihres Fortschritts',
    fr: 'Recevoir un résumé hebdomadaire de vos progrès',
    es: 'Recibir un resumen semanal de tu progreso',
    it: 'Ricevi un riassunto settimanale dei tuoi progressi'
  },
  'settings.notificationTime': {
    en: 'Notification Time',
    hu: 'Értesítési Idő',
    de: 'Benachrichtigungszeit',
    fr: 'Heure de Notification',
    es: 'Hora de Notificación',
    it: 'Orario Notifiche'
  },
  'settings.privacyMatters': {
    en: 'Your Privacy Matters',
    hu: 'Az Adatvédelem Fontos',
    de: 'Ihr Datenschutz ist Wichtig',
    fr: 'Votre Confidentialité Compte',
    es: 'Tu Privacidad Importa',
    it: 'La Tua Privacy Conta'
  },
  'settings.privacyDesc': {
    en: 'All your data is stored locally in your browser. We don\'t collect or store any personal information on our servers.',
    hu: 'Minden adatod helyileg tárolódik a böngésződben. Nem gyűjtünk vagy tárolunk személyes információkat a szervereinkn.',
    de: 'Alle Ihre Daten werden lokal in Ihrem Browser gespeichert. Wir sammeln oder speichern keine persönlichen Informationen auf unseren Servern.',
    fr: 'Toutes vos données sont stockées localement dans votre navigateur. Nous ne collectons ni ne stockons d\'informations personnelles sur nos serveurs.',
    es: 'Todos tus datos se almacenan localmente en tu navegador. No recopilamos ni almacenamos información personal en nuestros servidores.',
    it: 'Tutti i tuoi dati sono memorizzati localmente nel tuo browser. Non raccogliamo o memorizziamo informazioni personali sui nostri server.'
  },
  'settings.analytics': {
    en: 'Analytics',
    hu: 'Analitika',
    de: 'Analytik',
    fr: 'Analytique',
    es: 'Analíticas',
    it: 'Analitiche'
  },
  'settings.analyticsDesc': {
    en: 'Help improve the app with anonymous usage data',
    hu: 'Segíts fejleszteni az alkalmazást névtelen használati adatokkal',
    de: 'Helfen Sie bei der Verbesserung der App mit anonymen Nutzungsdaten',
    fr: 'Aidez à améliorer l\'application avec des données d\'utilisation anonymes',
    es: 'Ayuda a mejorar la aplicación con datos de uso anónimos',
    it: 'Aiuta a migliorare l\'app con dati di utilizzo anonimi'
  },
  'settings.crashReports': {
    en: 'Crash Reports',
    hu: 'Hibajelentések',
    de: 'Absturzberichte',
    fr: 'Rapports de Plantage',
    es: 'Informes de Fallos',
    it: 'Rapporti di Crash'
  },
  'settings.crashReportsDesc': {
    en: 'Automatically send crash reports to help fix bugs',
    hu: 'Automatikusan küldi a hibajelentéseket a hibák javításához',
    de: 'Absturzberichte automatisch senden, um Fehler zu beheben',
    fr: 'Envoyer automatiquement les rapports de plantage pour corriger les bugs',
    es: 'Enviar automáticamente informes de fallos para ayudar a corregir errores',
    it: 'Invia automaticamente rapporti di crash per aiutare a correggere i bug'
  },
  'settings.dataManagement': {
    en: 'Data Management',
    hu: 'Adatkezelés',
    de: 'Datenmanagement',
    fr: 'Gestion des Données',
    es: 'Gestión de Datos',
    it: 'Gestione Dati'
  },
  'settings.exportAllData': {
    en: 'Export All Data',
    hu: 'Összes Adat Exportálása',
    de: 'Alle Daten Exportieren',
    fr: 'Exporter Toutes les Données',
    es: 'Exportar Todos los Datos',
    it: 'Esporta Tutti i Dati'
  },
  'settings.importData': {
    en: 'Import Data',
    hu: 'Adatok Importálása',
    de: 'Daten Importieren',
    fr: 'Importer des Données',
    es: 'Importar Datos',
    it: 'Importa Dati'
  },
  'settings.dangerZone': {
    en: 'Danger Zone',
    hu: 'Veszélyes Zóna',
    de: 'Gefahrenzone',
    fr: 'Zone de Danger',
    es: 'Zona de Peligro',
    it: 'Zona Pericolosa'
  },
  'settings.dangerZoneDesc': {
    en: 'These actions cannot be undone. Please be careful.',
    hu: 'Ezek a műveletek nem vonhatók vissza. Kérlek légy óvatos.',
    de: 'Diese Aktionen können nicht rückgängig gemacht werden. Bitte seien Sie vorsichtig.',
    fr: 'Ces actions ne peuvent pas être annulées. Veuillez être prudent.',
    es: 'Estas acciones no se pueden deshacer. Por favor, ten cuidado.',
    it: 'Queste azioni non possono essere annullate. Si prega di fare attenzione.'
  },
  'settings.clearAllData': {
    en: 'Clear All Data',
    hu: 'Összes Adat Törlése',
    de: 'Alle Daten Löschen',
    fr: 'Effacer Toutes les Données',
    es: 'Borrar Todos los Datos',
    it: 'Cancella Tutti i Dati'
  },
  
  // Languages
  'lang.english': {
    en: 'English',
    hu: 'Angol',
    de: 'Englisch',
    fr: 'Anglais',
    es: 'Inglés',
    it: 'Inglese'
  },
  'lang.hungarian': {
    en: 'Hungarian',
    hu: 'Magyar',
    de: 'Ungarisch',
    fr: 'Hongrois',
    es: 'Húngaro',
    it: 'Ungherese'
  },
  'lang.german': {
    en: 'German',
    hu: 'Német',
    de: 'Deutsch',
    fr: 'Allemand',
    es: 'Alemán',
    it: 'Tedesco'
  },
  'lang.french': {
    en: 'French',
    hu: 'Francia',
    de: 'Französisch',
    fr: 'Français',
    es: 'Francés',
    it: 'Francese'
  },
  'lang.spanish': {
    en: 'Spanish',
    hu: 'Spanyol',
    de: 'Spanisch',
    fr: 'Espagnol',
    es: 'Español',
    it: 'Spagnolo'
  },
  'lang.italian': {
    en: 'Italian',
    hu: 'Olasz',
    de: 'Italienisch',
    fr: 'Italien',
    es: 'Italiano',
    it: 'Italiano'
  },

  // Import/Export
  'import.title': {
    en: 'Import / Export Data',
    hu: 'Adatok Importálása / Exportálása',
    de: 'Daten Importieren / Exportieren',
    fr: 'Importer / Exporter des Données',
    es: 'Importar / Exportar Datos',
    it: 'Importa / Esporta Dati'
  },
  'import.exportData': {
    en: 'Export Data',
    hu: 'Adatok Exportálása',
    de: 'Daten Exportieren',
    fr: 'Exporter les Données',
    es: 'Exportar Datos',
    it: 'Esporta Dati'
  },
  'import.importData': {
    en: 'Import Data',
    hu: 'Adatok Importálása',
    de: 'Daten Importieren',
    fr: 'Importer les Données',
    es: 'Importar Datos',
    it: 'Importa Dati'
  },
  'import.exportTitle': {
    en: 'Export Your Data',
    hu: 'Adatok Exportálása',
    de: 'Ihre Daten Exportieren',
    fr: 'Exporter Vos Données',
    es: 'Exportar Tus Datos',
    it: 'Esporta i Tuoi Dati'
  },
  'import.exportDesc': {
    en: 'Download all your notes, goals, plans, and drawings as a JSON file. Share it with others or keep it as a backup.',
    hu: 'Töltsd le az összes jegyzetedet, céljaidat, terveidet és rajzaidat JSON fájlként. Oszd meg másokkal vagy tartsd meg biztonsági másolatként.',
    de: 'Laden Sie alle Ihre Notizen, Ziele, Pläne und Zeichnungen als JSON-Datei herunter. Teilen Sie sie mit anderen oder bewahren Sie sie als Backup auf.',
    fr: 'Téléchargez toutes vos notes, objectifs, plans et dessins sous forme de fichier JSON. Partagez-le avec d\'autres ou gardez-le comme sauvegarde.',
    es: 'Descarga todas tus notas, objetivos, planes y dibujos como un archivo JSON. Compártelo con otros o guárdalo como respaldo.',
    it: 'Scarica tutte le tue note, obiettivi, piani e disegni come file JSON. Condividilo con altri o tienilo come backup.'
  },
  'import.whatToExport': {
    en: 'What to Export',
    hu: 'Mit Exportálj',
    de: 'Was Exportieren',
    fr: 'Quoi Exporter',
    es: 'Qué Exportar',
    it: 'Cosa Esportare'
  },
  'import.everything': {
    en: 'Everything',
    hu: 'Minden',
    de: 'Alles',
    fr: 'Tout',
    es: 'Todo',
    it: 'Tutto'
  },
  'import.everythingDesc': {
    en: 'All data including budget',
    hu: 'Minden adat beleértve a költségvetést',
    de: 'Alle Daten einschließlich Budget',
    fr: 'Toutes les données y compris le budget',
    es: 'Todos los datos incluyendo presupuesto',
    it: 'Tutti i dati incluso il budget'
  },
  'import.tasksOnly': {
    en: 'Tasks Only',
    hu: 'Csak Feladatok',
    de: 'Nur Aufgaben',
    fr: 'Tâches Seulement',
    es: 'Solo Tareas',
    it: 'Solo Attività'
  },
  'import.tasksOnlyDesc': {
    en: 'Notes, goals, plans, drawings',
    hu: 'Jegyzetek, célok, tervek, rajzok',
    de: 'Notizen, Ziele, Pläne, Zeichnungen',
    fr: 'Notes, objectifs, plans, dessins',
    es: 'Notas, objetivos, planes, dibujos',
    it: 'Note, obiettivi, piani, disegni'
  },
  'import.budgetOnly': {
    en: 'Budget Only',
    hu: 'Csak Költségvetés',
    de: 'Nur Budget',
    fr: 'Budget Seulement',
    es: 'Solo Presupuesto',
    it: 'Solo Budget'
  },
  'import.budgetOnlyDesc': {
    en: 'Subscriptions & transactions',
    hu: 'Előfizetések és tranzakciók',
    de: 'Abonnements & Transaktionen',
    fr: 'Abonnements et transactions',
    es: 'Suscripciones y transacciones',
    it: 'Abbonamenti e transazioni'
  },
  'import.notes': {
    en: 'Notes',
    hu: 'Jegyzetek',
    de: 'Notizen',
    fr: 'Notes',
    es: 'Notas',
    it: 'Note'
  },
  'import.goals': {
    en: 'Goals',
    hu: 'Célok',
    de: 'Ziele',
    fr: 'Objectifs',
    es: 'Objetivos',
    it: 'Obiettivi'
  },
  'import.plans': {
    en: 'Plans',
    hu: 'Tervek',
    de: 'Pläne',
    fr: 'Plans',
    es: 'Planes',
    it: 'Piani'
  },
  'import.drawings': {
    en: 'Drawings',
    hu: 'Rajzok',
    de: 'Zeichnungen',
    fr: 'Dessins',
    es: 'Dibujos',
    it: 'Disegni'
  },
  'import.subscriptions': {
    en: 'Subscriptions',
    hu: 'Előfizetések',
    de: 'Abonnements',
    fr: 'Abonnements',
    es: 'Suscripciones',
    it: 'Abbonamenti'
  },
  'import.transactions': {
    en: 'Transactions',
    hu: 'Tranzakciók',
    de: 'Transaktionen',
    fr: 'Transactions',
    es: 'Transacciones',
    it: 'Transazioni'
  },
  'import.exportAllData': {
    en: 'Export All Data',
    hu: 'Összes Adat Exportálása',
    de: 'Alle Daten Exportieren',
    fr: 'Exporter Toutes les Données',
    es: 'Exportar Todos los Datos',
    it: 'Esporta Tutti i Dati'
  },
  'import.exportTasks': {
    en: 'Export Tasks',
    hu: 'Feladatok Exportálása',
    de: 'Aufgaben Exportieren',
    fr: 'Exporter les Tâches',
    es: 'Exportar Tareas',
    it: 'Esporta Attività'
  },
  'import.exportBudgetData': {
    en: 'Export Budget Data',
    hu: 'Költségvetési Adatok Exportálása',
    de: 'Budget-Daten Exportieren',
    fr: 'Exporter les Données de Budget',
    es: 'Exportar Datos de Presupuesto',
    it: 'Esporta Dati Budget'
  },
  'import.importMode': {
    en: 'Import Mode',
    hu: 'Importálási Mód',
    de: 'Import-Modus',
    fr: 'Mode d\'Importation',
    es: 'Modo de Importación',
    it: 'Modalità Importazione'
  },
  'import.addToExisting': {
    en: 'Add to Existing',
    hu: 'Hozzáadás a Meglévőhöz',
    de: 'Zu Vorhandenen Hinzufügen',
    fr: 'Ajouter à l\'Existant',
    es: 'Añadir a Existente',
    it: 'Aggiungi a Esistente'
  },
  'import.addToExistingDesc': {
    en: 'Keep current data and add new items',
    hu: 'Megtartja a jelenlegi adatokat és új elemeket ad hozzá',
    de: 'Aktuelle Daten behalten und neue Elemente hinzufügen',
    fr: 'Garder les données actuelles et ajouter de nouveaux éléments',
    es: 'Mantener datos actuales y añadir nuevos elementos',
    it: 'Mantieni i dati attuali e aggiungi nuovi elementi'
  },
  'import.replaceAll': {
    en: 'Replace All',
    hu: 'Összes Cseréje',
    de: 'Alles Ersetzen',
    fr: 'Remplacer Tout',
    es: 'Reemplazar Todo',
    it: 'Sostituisci Tutto'
  },
  'import.replaceAllDesc': {
    en: 'Clear existing data and import new',
    hu: 'Törli a meglévő adatokat és importálja az újakat',
    de: 'Vorhandene Daten löschen und neue importieren',
    fr: 'Effacer les données existantes et importer de nouvelles',
    es: 'Borrar datos existentes e importar nuevos',
    it: 'Cancella i dati esistenti e importa nuovi'
  },
  'import.uploadJsonFile': {
    en: 'Upload JSON File',
    hu: 'JSON Fájl Feltöltése',
    de: 'JSON-Datei Hochladen',
    fr: 'Télécharger un Fichier JSON',
    es: 'Subir Archivo JSON',
    it: 'Carica File JSON'
  },
  'import.pasteJsonData': {
    en: 'Or Paste JSON Data',
    hu: 'Vagy Illeszd Be a JSON Adatokat',
    de: 'Oder JSON-Daten Einfügen',
    fr: 'Ou Coller les Données JSON',
    es: 'O Pegar Datos JSON',
    it: 'O Incolla Dati JSON'
  },
  'import.pasteJsonPlaceholder': {
    en: 'Paste your JSON data here...',
    hu: 'Illeszd be ide a JSON adatokat...',
    de: 'JSON-Daten hier einfügen...',
    fr: 'Collez vos données JSON ici...',
    es: 'Pega tus datos JSON aquí...',
    it: 'Incolla i tuoi dati JSON qui...'
  },
  'import.importSuccessful': {
    en: 'Import Successful!',
    hu: 'Sikeres Importálás!',
    de: 'Import Erfolgreich!',
    fr: 'Importation Réussie!',
    es: '¡Importación Exitosa!',
    it: 'Importazione Riuscita!'
  },
  'import.importFailed': {
    en: 'Import Failed',
    hu: 'Importálás Sikertelen',
    de: 'Import Fehlgeschlagen',
    fr: 'Échec de l\'Importation',
    es: 'Importación Fallida',
    it: 'Importazione Fallita'
  },
  'import.warningTitle': {
    en: 'Warning!',
    hu: 'Figyelmeztetés!',
    de: 'Warnung!',
    fr: 'Attention!',
    es: '¡Advertencia!',
    it: 'Attenzione!'
  },
  'import.replaceWarning': {
    en: 'This will permanently delete all your existing data and replace it with the imported data.',
    hu: 'Ez véglegesen törli az összes meglévő adatodat és lecseréli az importált adatokra.',
    de: 'Dies wird alle Ihre vorhandenen Daten dauerhaft löschen und durch die importierten Daten ersetzen.',
    fr: 'Cela supprimera définitivement toutes vos données existantes et les remplacera par les données importées.',
    es: 'Esto eliminará permanentemente todos tus datos existentes y los reemplazará con los datos importados.',
    it: 'Questo cancellerà permanentemente tutti i tuoi dati esistenti e li sostituirà con i dati importati.'
  },
  'import.importDataButton': {
    en: 'Import Data',
    hu: 'Adatok Importálása',
    de: 'Daten Importieren',
    fr: 'Importer les Données',
    es: 'Importar Datos',
    it: 'Importa Dati'
  },
  'import.addToExistingButton': {
    en: 'Add to Existing',
    hu: 'Hozzáadás a Meglévőhöz',
    de: 'Zu Vorhandenen Hinzufügen',
    fr: 'Ajouter à l\'Existant',
    es: 'Añadir a Existente',
    it: 'Aggiungi a Esistente'
  },
  'import.replaceAllButton': {
    en: 'Replace All',
    hu: 'Összes Cseréje',
    de: 'Alles Ersetzen',
    fr: 'Remplacer Tout',
    es: 'Reemplazar Todo',
    it: 'Sostituisci Tutto'
  },

  // Date formats
  'date.today': {
    en: 'Today',
    hu: 'Ma',
    de: 'Heute',
    fr: 'Aujourd\'hui',
    es: 'Hoy',
    it: 'Oggi'
  },
  'date.yesterday': {
    en: 'Yesterday',
    hu: 'Tegnap',
    de: 'Gestern',
    fr: 'Hier',
    es: 'Ayer',
    it: 'Ieri'
  },
  'date.tomorrow': {
    en: 'Tomorrow',
    hu: 'Holnap',
    de: 'Morgen',
    fr: 'Demain',
    es: 'Mañana',
    it: 'Domani'
  },

  // Categories
  'category.software': {
    en: 'Software',
    hu: 'Szoftver',
    de: 'Software',
    fr: 'Logiciel',
    es: 'Software',
    it: 'Software'
  },
  'category.entertainment': {
    en: 'Entertainment',
    hu: 'Szórakozás',
    de: 'Unterhaltung',
    fr: 'Divertissement',
    es: 'Entretenimiento',
    it: 'Intrattenimento'
  },
  'category.utilities': {
    en: 'Utilities',
    hu: 'Közművek',
    de: 'Versorgung',
    fr: 'Services Publics',
    es: 'Servicios Públicos',
    it: 'Servizi'
  },
  'category.food': {
    en: 'Food',
    hu: 'Étel',
    de: 'Essen',
    fr: 'Nourriture',
    es: 'Comida',
    it: 'Cibo'
  },
  'category.transport': {
    en: 'Transport',
    hu: 'Közlekedés',
    de: 'Transport',
    fr: 'Transport',
    es: 'Transporte',
    it: 'Trasporto'
  },
  'category.health': {
    en: 'Health',
    hu: 'Egészség',
    de: 'Gesundheit',
    fr: 'Santé',
    es: 'Salud',
    it: 'Salute'
  },
  'category.education': {
    en: 'Education',
    hu: 'Oktatás',
    de: 'Bildung',
    fr: 'Éducation',
    es: 'Educación',
    it: 'Educazione'
  },
  'category.other': {
    en: 'Other',
    hu: 'Egyéb',
    de: 'Sonstige',
    fr: 'Autre',
    es: 'Otro',
    it: 'Altro'
  }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('contentplanner-language');
    return (saved as Language) || 'en';
  });

  useEffect(() => {
    localStorage.setItem('contentplanner-language', language);
  }, [language]);

  const t = (key: string): string => {
    return translations[key]?.[language] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};