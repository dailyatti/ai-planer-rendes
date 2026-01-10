// DataContext.tsx – provides application-wide state and financial calculations
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
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
  const [recurringTick, setRecurringTick] = useState(0);
  const [skips, setSkips] = useState<Set<string>>(new Set());

  // Mirror ref for skips to allow recurring engine access without dependency spam
  const skipsRef = useRef<Set<string>>(new Set());

  // Helper to keep skips and skipsRef strictly in sync
  const setSkipsAndRef = (value: Set<string> | ((prev: Set<string>) => Set<string>)) => {
    setSkips(prev => {
      const next = typeof value === 'function' ? value(prev) : value;
      skipsRef.current = next;
      return next;
    });
  };

  const triggerRecurring = () => setRecurringTick(t => t + 1);

  // Helper for local YMD parsing (drift-proof)
  const parseYMDLocal = (ymd: string): Date => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd);
    if (!m) return new Date(ymd); // Fallback to standard
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const d = Number(m[3]);
    // Set to noon to avoid drift to previous/next day during zone transitions
    return new Date(y, mo, d, 12, 0, 0, 0);
  };

  const isYMD = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);

  // Robust date normalizer that respects strict YMD but falls back safely
  const normalizeDate = (raw: any): Date => {
    if (raw instanceof Date) return raw;
    if (typeof raw === 'string') return isYMD(raw) ? parseYMDLocal(raw) : new Date(raw);
    return new Date(raw);
  };

  // FIX #4: Guard ref to prevent infinite loops when transactions is in dependency
  const processingRecurringRef = useRef(false);

  // FIX #5: Ref Queue for side effects from inside state updaters
  // This allows us to strictly identify what was deleted in the updater (prev state)
  // and schedule side effects (skips, triggers) for the effect phase, avoiding stale state or race conditions.
  const pendingDeletionsRef = useRef<{ skips: Set<string>, trigger: boolean }>({ skips: new Set(), trigger: false });

  // Bank-Grade ID Generator (avoid substr and collisions)
  const newId = () => {
    const c = globalThis.crypto as Crypto | undefined;
    if (c && 'randomUUID' in c) return (c as any).randomUUID();
    return Math.random().toString(36).slice(2, 11);
  };

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
          date: normalizeDate(p.date), // Strict YMD enforce
          startTime: p.startTime ? new Date(p.startTime) : undefined,
          endTime: p.endTime ? new Date(p.endTime) : undefined
        })));

        const savedDrawings = StorageService.get<Drawing[]>('drawings', []);
        if (savedDrawings) setDrawings(savedDrawings.map(d => ({ ...d, createdAt: new Date(d.createdAt) })));

        const savedSubscriptions = StorageService.get<Subscription[]>('subscriptions', []);
        if (savedSubscriptions) setSubscriptions(savedSubscriptions.map(s => ({ ...s, nextPayment: new Date(s.nextPayment), createdAt: new Date(s.createdAt) })));

        const savedTransactions = StorageService.get<Transaction[]>('transactions', []);
        if (savedTransactions) {
          setTransactions(savedTransactions.map(t => {
            const date = normalizeDate((t as any).date);
            return {
              ...t,
              date,
              // Consistency Fix: Ensure all recurring transactions have kind='master'
              kind: (t.recurring && t.period !== 'oneTime' && !t.kind) ? 'master' : t.kind
            } as Transaction;
          }));
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

        const savedSkips = StorageService.get<string[]>('recurring-skips', []);
        if (savedSkips) {
          const s = new Set(savedSkips);
          setSkips(s);
          skipsRef.current = s;
        }

      } catch (e) {
        console.error('Error loading data from StorageService:', e);
      } finally {
        setIsInitialized(true);
      }
    };
    loadData();
  }, []);

  // Update financial stats when relevant data changes
  // FIX: Added dependency on budgetSettings.currency so stats update on currency change
  // Note: computeProjection/Runway are still created every render below, but we will fix that next.
  // Actually, we will fix computeProjection memoization now too.

  // Financial helper functions - Memoized to prevent consumer re-renders
  const computeProjection = useCallback((months: number) => {
    // Return array of projected balances for next N months
    const baseCurrency = budgetSettings.currency || 'USD';
    const report = FinancialEngine.getFinancialReport(transactions, baseCurrency);

    const currentBalance = report.currentBalance;
    const monthlyNet = report.monthlyNet;
    const rate = report.avgInterestRate;

    const projectionArr = [];
    for (let i = 1; i <= months; i++) {
      projectionArr.push(FinancialEngine.calculateFutureBalance(currentBalance, monthlyNet, i, rate));
    }
    return projectionArr;
  }, [transactions, budgetSettings.currency]);

  const computeRunway = useCallback((): number | null => {
    const baseCurrency = budgetSettings.currency || 'USD';
    const report = FinancialEngine.getFinancialReport(transactions, baseCurrency);
    return report.runway;
  }, [transactions, budgetSettings.currency]);

  const getFinancialSummary = useCallback((targetCurrency: string = 'USD') => {
    const revenue = FinancialEngine.calculateTotalRevenue(invoices, targetCurrency);
    const paid = FinancialEngine.calculatePaid(invoices, targetCurrency);

    const pending = invoices
      .filter(i => i.status === 'sent')
      .reduce((sum, i) => sum + FinancialEngine.convert(i.total, i.currency || 'USD', targetCurrency), 0);

    const overdue = invoices
      .filter(i => i.status === 'overdue')
      .reduce((sum, i) => sum + FinancialEngine.convert(i.total, i.currency || 'USD', targetCurrency), 0);

    return { revenue, paid, pending, overdue };
  }, [invoices]);

  // Effect to update the 'financialStats' state for consumers who use it directly
  useEffect(() => {
    if (!isInitialized) return;
    const projection = computeProjection(12);
    const runway = computeRunway();
    setFinancialStats({ projection, runway });
  }, [computeProjection, computeRunway, isInitialized]);


  // Recurring Processing Effect
  // OPTIMIZATION: Removed 'skips' from dependency, uses 'skipsRef' to prevent double-firing.
  useEffect(() => {
    if (!isInitialized) return;
    if (processingRecurringRef.current) return;

    processingRecurringRef.current = true;

    // Helper for local YMD (consistent with engine)
    const toYMDLocal = (d: Date) => {
      const pad2 = (n: number) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    };

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
            // FIX: Use LOCAL YMD for history ID to avoid UTC drift duplicity
            const dayKey = toYMDLocal(currentDate);
            const historyId = `${master.id}_${dayKey}`;

            // Check if exists (using set for O(1)) and NOT skipped (from REF)
            // Using skipsRef.current ensures we see latest skips without triggering effect re-run
            if (!existingIds.has(historyId) && !skipsRef.current.has(historyId)) {
              existingIds.add(historyId); // <--- Add immediately to prevent duplicate generation in same loop
              newHistory.push({
                ...master,
                id: historyId,
                originId: master.id,
                kind: 'history',
                date: new Date(currentDate),
                effectiveDateYMD: dayKey, // Explicit sync for engine alignment
                recurring: false,
                createdAtISO: new Date().toISOString(),
              });
              changed = true;
            }

            const next = advanceByPeriod(nextDate, master.period);
            nextDate = new Date(next);
            currentDate = new Date(nextDate);
            iterations++;
          }

          // advance master.date to next future occurrence
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
  }, [isInitialized, recurringTick]); // Triggered ONLY by tick or init, NOT by skips change


  // Side Effect Processor for Deletions
  useEffect(() => {
    const pending = pendingDeletionsRef.current;
    if (!pending.trigger && pending.skips.size === 0) return;

    // Reset EARLY (very important for re-entrancy / Concurrent Mode)
    pendingDeletionsRef.current = { skips: new Set(), trigger: false };

    // Apply skips if any
    if (pending.skips.size > 0) {
      setSkipsAndRef(prev => {
        const next = new Set(prev);
        pending.skips.forEach(id => next.add(id));
        return next;
      });
    }

    // Trigger recurring if needed
    if (pending.trigger) {
      triggerRecurring();
    }
  }, [transactions]); // Safe to depend on transactions as queue is populated by deletion updaters


  // Persist Data Effects (unchanged)
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
  useEffect(() => { if (isInitialized) StorageService.set('recurring-skips', Array.from(skips)); }, [skips, isInitialized]);

  const addNote = (note: Omit<Note, 'id' | 'createdAt'>) => setNotes(prev => [...prev, { ...note, id: newId(), createdAt: new Date() }]);
  const updateNote = (id: string, updates: Partial<Note>) => setNotes(prev => prev.map(n => (n.id === id ? { ...n, ...updates } : n)));
  const deleteNote = (id: string) => setNotes(prev => prev.filter(n => n.id !== id));

  const addGoal = (goal: Omit<Goal, 'id' | 'createdAt'>) => setGoals(prev => [...prev, { ...goal, id: newId(), createdAt: new Date() }]);
  const updateGoal = (id: string, updates: Partial<Goal>) => setGoals(prev => prev.map(g => (g.id === id ? { ...g, ...updates } : g)));
  const deleteGoal = (id: string) => setGoals(prev => prev.filter(g => g.id !== id));

  const addPlan = (plan: Omit<PlanItem, 'id'>) => setPlans(prev => [...prev, { ...plan, id: newId() }]);
  const updatePlan = (id: string, updates: Partial<PlanItem>) => setPlans(prev => prev.map(p => (p.id === id ? { ...p, ...updates } : p)));
  const deletePlan = (id: string) => setPlans(prev => prev.filter(p => p.id !== id));

  const addDrawing = (drawing: Omit<Drawing, 'id' | 'createdAt'>) => setDrawings(prev => [...prev, { ...drawing, id: newId(), createdAt: new Date() }]);
  const deleteDrawing = (id: string) => setDrawings(prev => prev.filter(d => d.id !== id));

  const addSubscription = (sub: Omit<Subscription, 'id' | 'createdAt'>) => setSubscriptions(prev => [...prev, { ...sub, id: newId(), createdAt: new Date() }]);
  const updateSubscription = (id: string, updates: Partial<Subscription>) => setSubscriptions(prev => prev.map(s => (s.id === id ? { ...s, ...updates } : s)));
  const deleteSubscription = (id: string) => setSubscriptions(prev => prev.filter(s => s.id !== id));

  const updateBudgetSettings = (settings: Partial<BudgetSettings>) => setBudgetSettings(prev => ({ ...prev, ...settings }));

  const addTransaction = (tx: Omit<Transaction, 'id'>) => {
    let shouldTrigger = false;
    setTransactions(prev => {
      const id = newId();

      const date = normalizeDate((tx as any).date);

      const isRecurring = (tx as any).recurring && (tx as any).period !== 'oneTime';
      // Auto-set kind='master' if recurring
      const kind = isRecurring ? ('master' as const) : (tx as any).kind;

      if (isRecurring) shouldTrigger = true;
      return [...prev, { ...tx, id, kind, date } as Transaction];
    });
    if (shouldTrigger) triggerRecurring();
  };

  const updateTransaction = (id: string, updates: TransactionPatch) => {
    let shouldTrigger = false;

    setTransactions(prev =>
      prev.map(t => {
        if (t.id !== id) return t;

        const wasMaster = isMasterTx(t);
        const merged = { ...t, ...updates };

        // Normalize date on update if provided
        if ('date' in updates) {
          const raw: any = (updates as any).date;
          if (raw) {
            (merged as any).date = normalizeDate(raw);
          }
        }

        // 1. Handle 'kind' deletion
        if ('kind' in updates && (updates.kind === null || updates.kind === undefined)) {
          delete (merged as any).kind;
        } else if (wasMaster && updates.kind === undefined) {
          (merged as any).kind = 'master';
        }

        // 2. Handle 'interestRate' deletion
        if ('interestRate' in updates && (updates.interestRate === null || updates.interestRate === undefined)) {
          delete (merged as any).interestRate; // Cleanly remove empty rates
        }

        // trigger only if it impacts recurring logic
        const impactsRecurring =
          wasMaster ||
          ('recurring' in updates) ||
          ('period' in updates) ||
          ('date' in updates) ||
          ('kind' in updates);

        if (impactsRecurring) shouldTrigger = true;

        return merged as Transaction;
      })
    );
    if (shouldTrigger) triggerRecurring();
  };

  const deleteTransaction = (id: string) => {
    setTransactions(prev => {
      // Defensive guard
      if (!prev || !Array.isArray(prev)) return [];

      const target = prev.find(t => t.id === id);
      if (!target) return prev;

      // Side Effect Queueing (Strictly Safe)
      if (isMasterTx(target)) {
        pendingDeletionsRef.current.trigger = true;
        // delete master + all history generated from it
        return prev.filter(t => t.id !== id && (t as any).originId !== id);
      }

      // If deleting a history item, queue it for skipping
      if ((target as any).kind === 'history') {
        pendingDeletionsRef.current.skips.add(target.id);
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
      // Identify masters inside the updater for strict accuracy
      const mastersToDelete = new Set(
        prev.filter(t => t && idsSet.has(t.id) && isMasterTx(t)).map(t => t.id)
      );

      if (mastersToDelete.size > 0) {
        pendingDeletionsRef.current.trigger = true;
      }

      // Identify history items being deleted
      const historyItems = prev.filter(t => t && idsSet.has(t.id) && (t as any).kind === 'history');
      if (historyItems.length > 0) {
        historyItems.forEach(h => pendingDeletionsRef.current.skips.add(h.id));
      }

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

  const addCompanyProfile = (profile: Omit<CompanyProfile, 'id' | 'createdAt'>) => setCompanyProfiles(prev => [...prev, { ...profile, id: newId(), createdAt: new Date() }]);
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

    setSkipsAndRef(new Set());
    setRecurringTick(0);
    pendingDeletionsRef.current = { skips: new Set(), trigger: false };

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