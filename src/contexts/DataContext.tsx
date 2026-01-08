// DataContext.tsx – provides application-wide state and financial calculations
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Note, Goal, PlanItem, Drawing, Subscription, BudgetSettings, Transaction, TransactionPatch, Invoice, Client, CompanyProfile } from '../types/planner';
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
  updateTransaction: (id: string, updates: TransactionPatch) => void;
  deleteTransaction: (id: string) => void;
  deleteTransactions: (ids: string[]) => void;
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

  // Helper functions within DataProvider context
  const endOfToday = () => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d;
  };

  // Prevent date drift for monthly (Jan 31 -> Feb 28/29)
  const addMonthsClamped = (d: Date, months: number) => {
    const date = new Date(d);
    const day = date.getDate();
    date.setMonth(date.getMonth() + months);
    if (date.getDate() !== day) {
      date.setDate(0);
    }
    return date;
  };

  const advanceByPeriod = (d: Date, period: Transaction['period']) => {
    const next = new Date(d);
    switch (period) {
      case 'daily': next.setDate(next.getDate() + 1); break;
      case 'weekly': next.setDate(next.getDate() + 7); break;
      case 'monthly': {
        const m = addMonthsClamped(next, 1);
        next.setTime(m.getTime());
        break;
      }
      case 'yearly': next.setFullYear(next.getFullYear() + 1); break;
      default: next.setDate(next.getDate() + 1); break;
    }
    return next;
  };

  const isMasterTx = (t: Transaction) => (t as any).kind === 'master';

  // Load persisted data
  useEffect(() => {
    const loadData = () => {
      try {
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
        if (savedTransactions) {
          setTransactions(savedTransactions.map(t => ({
            ...t,
            date: new Date(t.date),
            // Consistency Fix: Ensure all recurring transactions have kind='master'
            kind: (t.recurring && t.period !== 'oneTime' && !t.kind) ? 'master' : t.kind
          })));
        }

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
          savedSettings = {
            ...(savedSettings || { monthlyBudget: 0, notifications: true, warningThreshold: 80 }),
            currency: 'USD'
          };
          localStorage.setItem(MIGRATION_KEY, 'true');
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

  // Recurring Processing Effect
  useEffect(() => {
    if (!isInitialized) return;
    if (processingRecurringRef.current) return;

    processingRecurringRef.current = true;

    try {
      setTransactions(prev => {
        if (!prev || prev.length === 0) return prev;

        const now = endOfToday();
        // quick lookup existing ids to avoid O(n^2)
        const existingIds = new Set(prev.map(t => t.id));

        let changed = false;
        const newHistory: Transaction[] = [];

        const updated = prev.map(tr => {
          // only recurring masters should be processed
          if (!tr.recurring || tr.period === 'oneTime') return tr;

          // ensure master kind
          const master: Transaction = { ...tr, kind: 'master' as const };

          const trDate = new Date(master.date);
          if (Number.isNaN(trDate.getTime())) return master;

          // If master next date is in the future -> nothing to catch up
          if (trDate.getTime() > now.getTime()) return master;

          // Safety brake depending on period (daily can be many)
          const MAX_CATCHUP =
            master.period === 'daily' ? 3660 : // ~10 years daily
              master.period === 'weekly' ? 1040 : // ~20 years weekly
                master.period === 'monthly' ? 600 : // 50 years
                  200; // yearly etc

          let currentDate = new Date(trDate);
          let nextDate = new Date(trDate);
          let iterations = 0;

          // Catch-up: create history for each occurrence up to today
          while (currentDate.getTime() <= now.getTime() && iterations < MAX_CATCHUP) {
            const dayKey = new Date(currentDate).toISOString().slice(0, 10);
            const historyId = `${master.id}_${dayKey}`;

            if (!existingIds.has(historyId)) {
              existingIds.add(historyId);
              newHistory.push({
                ...master,
                id: historyId,
                originId: master.id,
                kind: 'history',
                date: new Date(currentDate),
                recurring: false,
              });
              changed = true;
            }

            const next = advanceByPeriod(nextDate, master.period);
            nextDate = new Date(next);
            currentDate = new Date(nextDate);
            iterations++;
          }

          // IMPORTANT FIX: master.date must advance even if no new history was created
          if (new Date(master.date).getTime() !== new Date(nextDate).getTime()) {
            changed = true;
          }

          return { ...master, date: new Date(nextDate) };
        });

        if (!changed) return prev;
        return [...updated, ...newHistory];
      });
    } finally {
      processingRecurringRef.current = false;
    }
  }, [isInitialized, transactions]); // Reactive: runs when transactions change, relies on logic convergence to stop loops

  // Financial helper functions
  const computeProjection = (months: number) => {
    // Return array of projected balances for next N months
    const baseCurrency = budgetSettings.currency || 'USD';
    const report = FinancialEngine.getFinancialReport(transactions, baseCurrency);

    // We can reuse the logic from FinancialEngine to generate month-by-month array
    // Since getFinancialReport gives snapshots, we'll manually generate the array for the chart
    const currentBalance = report.currentBalance;
    const monthlyNet = report.monthlyNet;
    const rate = report.avgInterestRate;

    const projectionArr = [];
    for (let i = 1; i <= months; i++) {
      projectionArr.push(FinancialEngine.calculateFutureBalance(currentBalance, monthlyNet, i, rate));
    }
    return projectionArr;
  };

  const computeRunway = (): number | null => {
    const baseCurrency = budgetSettings.currency || 'USD';
    const report = FinancialEngine.getFinancialReport(transactions, baseCurrency);
    return report.runway;
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

  const addTransaction = (tx: Omit<Transaction, 'id'>) => {
    setTransactions(prev => {
      const id = Math.random().toString(36).substr(2, 9);
      const isRecurring = (tx as any).recurring && (tx as any).period !== 'oneTime';
      // Auto-set kind='master' if recurring
      const kind = isRecurring ? ('master' as const) : (tx as any).kind;
      return [...prev, { ...tx, id, kind }];
    });
  };

  const updateTransaction = (id: string, updates: TransactionPatch) => {
    setTransactions(prev =>
      prev.map(t => {
        if (t.id !== id) return t;

        // Merge logic with explicit key deletion for nulls
        const merged = { ...t, ...updates };

        // 1. Handle 'kind' deletion
        if ('kind' in updates && (updates.kind === null || updates.kind === undefined)) {
          delete (merged as any).kind;
        } else if (isMasterTx(t) && updates.kind === undefined) {
          // If kind wasn't sent but it WAS a master, preserve it (standard merge behavior)
          (merged as any).kind = 'master';
        }

        // 2. Handle 'interestRate' deletion
        if ('interestRate' in updates && (updates.interestRate === null || updates.interestRate === undefined)) {
          delete (merged as any).interestRate; // Cleanly remove empty rates
        }

        return merged as Transaction;
      })
    );
  };

  const deleteTransaction = (id: string) => {
    setTransactions(prev => {
      // Defensive guard
      if (!prev || !Array.isArray(prev)) return [];

      const target = prev.find(t => t.id === id);
      if (!target) return prev;

      if (isMasterTx(target)) {
        // delete master + all history generated from it
        return prev.filter(t => t.id !== id && (t as any).originId !== id);
      }

      // delete single/history
      return prev.filter(t => t.id !== id);
    });
  };

  const deleteTransactions = (ids: string[]) => {
    if (!ids || !Array.isArray(ids) || ids.length === 0) return;

    setTransactions(prev => {
      // Defensive guard
      if (!prev || !Array.isArray(prev)) return [];

      const idsSet = new Set(ids);
      // Identify masters to delete children efficiently
      const mastersToDelete = new Set(
        prev.filter(t => t && idsSet.has(t.id) && isMasterTx(t)).map(t => t.id)
      );

      return prev.filter(t => {
        if (!t) return false;
        // Drop if ID is in list
        if (idsSet.has(t.id)) return false;
        // Drop if it's a child of a deleted master
        if ((t as any).originId && mastersToDelete.has((t as any).originId)) return false;
        return true;
      });
    });
  };

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
        deleteTransactions,
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