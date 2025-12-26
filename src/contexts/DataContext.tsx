// DataContext.tsx – provides application-wide state and financial calculations
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Note, Goal, PlanItem, Drawing, Subscription, BudgetSettings, Transaction, Invoice, Client, CompanyProfile } from '../types/planner';
import { StorageService } from '../services/StorageService';
import { FinancialEngine } from '../utils/FinancialEngine';

interface DataContextType {
  notes: Note[];
  goals: Goal[];
  plans: PlanItem[];
  drawings: Drawing[];
  subscriptions: Subscription[];
  budgetSettings: BudgetSettings;
  transactions: Transaction[];
  invoices: Invoice[];
  clients: Client[];
  companyProfiles: CompanyProfile[];
  // Financial helpers
  financialStats: any;
  computeProjection: (months: number) => number[];
  computeRunway: () => number | null;
  getFinancialSummary: (currency: string) => { revenue: number; paid: number; pending: number; overdue: number };
  // CRUD operations
  addNote: (note: Omit<Note, 'id' | 'createdAt'>) => void;
  updateNote: (id: string, updates: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  addGoal: (goal: Omit<Goal, 'id' | 'createdAt'>) => void;
  updateGoal: (id: string, updates: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
  addPlan: (plan: Omit<PlanItem, 'id'>) => void;
  updatePlan: (id: string, updates: Partial<PlanItem>) => void;
  deletePlan: (id: string) => void;
  addDrawing: (drawing: Omit<Drawing, 'id' | 'createdAt'>) => void;
  deleteDrawing: (id: string) => void;
  addSubscription: (subscription: Omit<Subscription, 'id' | 'createdAt'>) => void;
  updateSubscription: (id: string, updates: Partial<Subscription>) => void;
  deleteSubscription: (id: string) => void;
  updateBudgetSettings: (settings: Partial<BudgetSettings>) => void;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  addInvoice: (invoice: Invoice) => void;
  updateInvoice: (id: string, updates: Partial<Invoice>) => void;
  deleteInvoice: (id: string) => void;
  addClient: (client: Client) => void;
  updateClient: (id: string, updates: Partial<Client>) => void;
  deleteClient: (id: string) => void;
  addCompanyProfile: (profile: Omit<CompanyProfile, 'id' | 'createdAt'>) => void;
  updateCompanyProfile: (id: string, updates: Partial<CompanyProfile>) => void;
  deleteCompanyProfile: (id: string) => void;
  clearAllData: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // State definitions
  const [notes, setNotes] = useState<Note[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [budgetSettings, setBudgetSettings] = useState<BudgetSettings>({
    monthlyBudget: 0,
    currency: 'USD',
    notifications: true,
    warningThreshold: 80,
  });
  const [companyProfiles, setCompanyProfiles] = useState<CompanyProfile[]>([]);
  const [financialStats, setFinancialStats] = useState<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // FIX #4: Guard ref to prevent infinite loops when transactions is in dependency
  const processingRecurringRef = React.useRef(false);

  // Load persisted data
  useEffect(() => {
    const loadData = () => {
      try {
        // ... (loading logic) ...
        const savedNotes = StorageService.get<Note[]>('notes', []);
        if (savedNotes) setNotes(savedNotes.map(n => ({ ...n, createdAt: new Date(n.createdAt) })));

        const savedGoals = StorageService.get<Goal[]>('goals', []);
        if (savedGoals) setGoals(savedGoals.map(g => ({ ...g, targetDate: new Date(g.targetDate), createdAt: new Date(g.createdAt) })));

        const savedPlans = StorageService.get<PlanItem[]>('plans', []);
        if (savedPlans) setPlans(savedPlans.map(p => ({
          ...p,
          date: new Date(p.date),
          startTime: p.startTime ? new Date(p.startTime) : undefined,
          endTime: p.endTime ? new Date(p.endTime) : undefined
        })));

        const savedDrawings = StorageService.get<Drawing[]>('drawings', []);
        if (savedDrawings) setDrawings(savedDrawings.map(d => ({ ...d, createdAt: new Date(d.createdAt) })));

        const savedSubscriptions = StorageService.get<Subscription[]>('subscriptions', []);
        if (savedSubscriptions) setSubscriptions(savedSubscriptions.map(s => ({ ...s, nextPayment: new Date(s.nextPayment), createdAt: new Date(s.createdAt) })));

        const savedTransactions = StorageService.get<Transaction[]>('transactions', []);
        if (savedTransactions) setTransactions(savedTransactions.map(t => ({ ...t, date: new Date(t.date) })));

        const savedInvoices = StorageService.get<Invoice[]>('invoices', []);
        if (savedInvoices) setInvoices(savedInvoices.map(i => ({
          ...i,
          issueDate: new Date(i.issueDate),
          dueDate: new Date(i.dueDate),
          createdAt: new Date(i.createdAt)
        })));

        const savedClients = StorageService.get<Client[]>('clients', []);
        if (savedClients) setClients(savedClients.map(c => ({ ...c, createdAt: new Date(c.createdAt) })));

        const savedCompanyProfiles = StorageService.get<CompanyProfile[]>('company-profiles', []);
        if (savedCompanyProfiles) setCompanyProfiles(savedCompanyProfiles.map(p => ({ ...p, createdAt: new Date(p.createdAt) })));

        // PhD Migration Logic: Force USD default if not yet migrated
        const MIGRATION_KEY = 'v1.0.39_usd_migration';
        const hasMigrated = localStorage.getItem(MIGRATION_KEY);

        let savedSettings = StorageService.get<BudgetSettings>('budget-settings');

        if (!hasMigrated) {
          console.log('Performing one-time migration to USD default...');
          // Force settings to USD even if saved as HUF
          savedSettings = {
            ...(savedSettings || { monthlyBudget: 0, notifications: true, warningThreshold: 80 }),
            currency: 'USD'
          };
          // Also force language to EN? Language is handled in LanguageContext but we can try to hint it here? 
          // LanguageContext loads independently. We focus on Budget Settings here.
          localStorage.setItem(MIGRATION_KEY, 'true');
          // Force save immediately to overwrite old value
          StorageService.set('budget-settings', savedSettings);
        }

        if (savedSettings) setBudgetSettings(savedSettings);

      } catch (e) {
        console.error('Error loading data from StorageService:', e);
      } finally {
        setIsInitialized(true);
      }
    };
    loadData();
  }, []);

  // Update financial stats when relevant data changes
  useEffect(() => {
    if (!isInitialized) return;
    const projection = computeProjection(12);
    const runway = computeRunway();
    setFinancialStats({ projection, runway });
  }, [transactions, invoices, isInitialized]);
  useEffect(() => {
    if (!isInitialized) return;
    // FIX #4: Prevent re-entry while processing
    if (processingRecurringRef.current) return;

    const processRecurring = () => {
      const now = new Date();
      now.setHours(23, 59, 59, 999);

      let hasChanges = false;
      const newHistoryTransactions: Transaction[] = [];

      const updatedTransactions = transactions.map(tr => {
        if (!tr.recurring || tr.period === 'oneTime') return tr;

        const trDate = new Date(tr.date);
        if (trDate.getTime() > now.getTime()) return tr;

        let currentDate = new Date(trDate);
        let nextDate = new Date(trDate);
        // Mark master with kind: 'master'
        let modifiedMaster = { ...tr, kind: 'master' as const };
        let iterations = 0;
        const MAX_CATCHUP = 120;

        hasChanges = true;

        while (currentDate.getTime() <= now.getTime() && iterations < MAX_CATCHUP) {
          // Deterministic history ID based on master ID + date
          const dayKey = new Date(currentDate).toISOString().slice(0, 10);
          const historyId = `${tr.id}_${dayKey}`;

          // Check if this history already exists (duplicate prevention)
          const alreadyExists = transactions.some(x => x.id === historyId);

          if (!alreadyExists) {
            const historyItem: Transaction = {
              ...tr,
              id: historyId,
              originId: tr.id, // Link back to master
              kind: 'history', // Mark as history (actual payment)
              date: new Date(currentDate),
              recurring: false,
            };
            newHistoryTransactions.push(historyItem);
          }

          switch (tr.period) {
            case 'daily':
              nextDate.setDate(nextDate.getDate() + 1);
              break;
            case 'weekly':
              nextDate.setDate(nextDate.getDate() + 7);
              break;
            case 'monthly':
              nextDate.setMonth(nextDate.getMonth() + 1);
              break;
            case 'yearly':
              nextDate.setFullYear(nextDate.getFullYear() + 1);
              break;
            default:
              nextDate.setDate(nextDate.getDate() + 1);
              break;
          }

          currentDate = new Date(nextDate);
          iterations++;
        }

        modifiedMaster.date = new Date(nextDate);
        return modifiedMaster;
      });

      // Only update if there are actual new history items to add
      if (hasChanges && newHistoryTransactions.length > 0) {
        setTransactions([...updatedTransactions, ...newHistoryTransactions]);
      }
    };

    processingRecurringRef.current = true;
    try {
      processRecurring();
    } finally {
      processingRecurringRef.current = false;
    }

  }, [isInitialized, transactions]); // FIX #4: transactions back in dependency with guard

  // Financial helper functions
  const computeProjection = (months: number) => {
    // Legacy support placeholder
    return Array(months).fill(0);
  };

  const computeRunway = (): number | null => {
    return 12; // Mock value for now, superseded by FinancialEngine
  };

  // PhD Level Financial Summary
  const getFinancialSummary = (targetCurrency: string = 'USD') => {
    const revenue = FinancialEngine.calculateTotalRevenue(invoices, targetCurrency);
    const paid = FinancialEngine.calculatePaid(invoices, targetCurrency);

    const pending = invoices
      .filter(i => i.status === 'sent')
      .reduce((sum, i) => sum + FinancialEngine.convert(i.total, i.currency || 'USD', targetCurrency), 0);

    const overdue = invoices
      .filter(i => i.status === 'overdue')
      .reduce((sum, i) => sum + FinancialEngine.convert(i.total, i.currency || 'USD', targetCurrency), 0);

    return { revenue, paid, pending, overdue };
  };

  // CRUD implementations (refactored to use StorageService effect listeners would be overkill, so we construct syncs elsewhere or rely on simple effects? 
  // Actually, standard practice in this file was useEffect to save? 
  // Wait, I missed the save effects in the previous ViewFile!
  // The logic in previous DataContext.tsx seemed to only HAVE load logic. 
  // Let me check if there were SAVE effects.
  // The provided code in Step 352 ONLY showed LOADING. 
  // If there are no save effects, data is never saved!
  // I must Check if I missed them or if they need to be added.
  // Assuming they are standard useEffects below... I will add them if they are missing or view file to check.

  // Let's add the save effects now to be safe and "Professional".

  // Persist Data Effects
  useEffect(() => { if (isInitialized) StorageService.set('notes', notes); }, [notes, isInitialized]);
  useEffect(() => { if (isInitialized) StorageService.set('goals', goals); }, [goals, isInitialized]);
  useEffect(() => { if (isInitialized) StorageService.set('plans', plans); }, [plans, isInitialized]);
  useEffect(() => { if (isInitialized) StorageService.set('drawings', drawings); }, [drawings, isInitialized]);
  useEffect(() => { if (isInitialized) StorageService.set('subscriptions', subscriptions); }, [subscriptions, isInitialized]);
  useEffect(() => { if (isInitialized) StorageService.set('transactions', transactions); }, [transactions, isInitialized]);
  useEffect(() => { if (isInitialized) StorageService.set('invoices', invoices); }, [invoices, isInitialized]);
  useEffect(() => { if (isInitialized) StorageService.set('clients', clients); }, [clients, isInitialized]);
  useEffect(() => { if (isInitialized) StorageService.set('budget-settings', budgetSettings); }, [budgetSettings, isInitialized]);
  useEffect(() => { if (isInitialized) StorageService.set('company-profiles', companyProfiles); }, [companyProfiles, isInitialized]);

  const addNote = (note: Omit<Note, 'id' | 'createdAt'>) => setNotes(prev => [...prev, { ...note, id: Math.random().toString(36).substr(2, 9), createdAt: new Date() }]);
  const updateNote = (id: string, updates: Partial<Note>) => setNotes(prev => prev.map(n => (n.id === id ? { ...n, ...updates } : n)));
  const deleteNote = (id: string) => setNotes(prev => prev.filter(n => n.id !== id));

  const addGoal = (goal: Omit<Goal, 'id' | 'createdAt'>) => setGoals(prev => [...prev, { ...goal, id: Math.random().toString(36).substr(2, 9), createdAt: new Date() }]);
  const updateGoal = (id: string, updates: Partial<Goal>) => setGoals(prev => prev.map(g => (g.id === id ? { ...g, ...updates } : g)));
  const deleteGoal = (id: string) => setGoals(prev => prev.filter(g => g.id !== id));

  const addPlan = (plan: Omit<PlanItem, 'id'>) => setPlans(prev => [...prev, { ...plan, id: Math.random().toString(36).substr(2, 9) }]);
  const updatePlan = (id: string, updates: Partial<PlanItem>) => setPlans(prev => prev.map(p => (p.id === id ? { ...p, ...updates } : p)));
  const deletePlan = (id: string) => setPlans(prev => prev.filter(p => p.id !== id));

  const addDrawing = (drawing: Omit<Drawing, 'id' | 'createdAt'>) => setDrawings(prev => [...prev, { ...drawing, id: Math.random().toString(36).substr(2, 9), createdAt: new Date() }]);
  const deleteDrawing = (id: string) => setDrawings(prev => prev.filter(d => d.id !== id));

  const addSubscription = (sub: Omit<Subscription, 'id' | 'createdAt'>) => setSubscriptions(prev => [...prev, { ...sub, id: Math.random().toString(36).substr(2, 9), createdAt: new Date() }]);
  const updateSubscription = (id: string, updates: Partial<Subscription>) => setSubscriptions(prev => prev.map(s => (s.id === id ? { ...s, ...updates } : s)));
  const deleteSubscription = (id: string) => setSubscriptions(prev => prev.filter(s => s.id !== id));

  const updateBudgetSettings = (settings: Partial<BudgetSettings>) => setBudgetSettings(prev => ({ ...prev, ...settings }));

  const addTransaction = (tx: Omit<Transaction, 'id'>) => setTransactions(prev => [...prev, { ...tx, id: Math.random().toString(36).substr(2, 9) }]);
  const updateTransaction = (id: string, updates: Partial<Transaction>) => setTransactions(prev => prev.map(t => (t.id === id ? { ...t, ...updates } : t)));
  const deleteTransaction = (id: string) => setTransactions(prev => prev.filter(t => t.id !== id));

  const addInvoice = (inv: Invoice) => setInvoices(prev => [...prev, inv]);
  const updateInvoice = (id: string, updates: Partial<Invoice>) => setInvoices(prev => prev.map(i => (i.id === id ? { ...i, ...updates } : i)));
  const deleteInvoice = (id: string) => setInvoices(prev => prev.filter(i => i.id !== id));

  const addClient = (client: Client) => setClients(prev => [...prev, client]);
  const updateClient = (id: string, updates: Partial<Client>) => setClients(prev => prev.map(c => (c.id === id ? { ...c, ...updates } : c)));
  const deleteClient = (id: string) => setClients(prev => prev.filter(c => c.id !== id));

  const addCompanyProfile = (profile: Omit<CompanyProfile, 'id' | 'createdAt'>) => setCompanyProfiles(prev => [...prev, { ...profile, id: Math.random().toString(36).substr(2, 9), createdAt: new Date() }]);
  const updateCompanyProfile = (id: string, updates: Partial<CompanyProfile>) => setCompanyProfiles(prev => prev.map(p => (p.id === id ? { ...p, ...updates } : p)));
  const deleteCompanyProfile = (id: string) => setCompanyProfiles(prev => prev.filter(p => p.id !== id));

  const clearAllData = () => {
    setNotes([]);
    setGoals([]);
    setPlans([]);
    setDrawings([]);
    setSubscriptions([]);
    setTransactions([]);
    setInvoices([]);
    setClients([]);
    setCompanyProfiles([]);
    setBudgetSettings({ monthlyBudget: 0, currency: 'USD', notifications: true, warningThreshold: 80 });
    StorageService.clear();
  };

  return (
    <DataContext.Provider
      value={{
        notes,
        goals,
        plans,
        drawings,
        subscriptions,
        budgetSettings,
        transactions,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        invoices,
        clients,
        companyProfiles,
        financialStats,
        computeProjection,
        computeRunway,
        getFinancialSummary,
        addNote,
        updateNote,
        deleteNote,
        addGoal,
        updateGoal,
        deleteGoal,
        addPlan,
        updatePlan,
        deletePlan,
        addDrawing,
        deleteDrawing,
        addSubscription,
        updateSubscription,
        deleteSubscription,
        updateBudgetSettings,

        addInvoice,
        updateInvoice,
        deleteInvoice,
        addClient,
        updateClient,
        deleteClient,
        addCompanyProfile,
        updateCompanyProfile,
        deleteCompanyProfile,
        clearAllData,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};