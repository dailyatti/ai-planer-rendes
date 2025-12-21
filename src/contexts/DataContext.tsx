// DataContext.tsx – provides application-wide state and financial calculations
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Note, Goal, PlanItem, Drawing, Subscription, BudgetSettings, Transaction, Invoice, Client, CompanyProfile } from '../types/planner';
import { FinancialMathService } from '../utils/financialMath';

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

  // Load persisted data
  useEffect(() => {
    const loadData = () => {
      try {
        const savedNotes = localStorage.getItem('planner-notes');
        const savedGoals = localStorage.getItem('planner-goals');
        const savedPlans = localStorage.getItem('planner-plans');
        const savedDrawings = localStorage.getItem('planner-drawings');
        const savedSubscriptions = localStorage.getItem('planner-subscriptions');
        const savedTransactions = localStorage.getItem('planner-transactions');
        const savedInvoices = localStorage.getItem('planner-invoices');
        const savedClients = localStorage.getItem('planner-clients');
        const savedBudgetSettings = localStorage.getItem('planner-budget-settings');
        const savedCompanyProfiles = localStorage.getItem('planner-company-profiles');

        if (savedNotes) {
          const parsed = JSON.parse(savedNotes);
          setNotes(parsed.map((n: any) => ({ ...n, createdAt: new Date(n.createdAt) })));
        }
        if (savedGoals) {
          const parsed = JSON.parse(savedGoals);
          setGoals(parsed.map((g: any) => ({ ...g, targetDate: new Date(g.targetDate), createdAt: new Date(g.createdAt) })));
        }
        if (savedPlans) {
          const parsed = JSON.parse(savedPlans);
          setPlans(parsed.map((p: any) => ({ ...p, date: new Date(p.date), startTime: p.startTime ? new Date(p.startTime) : undefined, endTime: p.endTime ? new Date(p.endTime) : undefined })));
        }
        if (savedDrawings) {
          const parsed = JSON.parse(savedDrawings);
          setDrawings(parsed.map((d: any) => ({ ...d, createdAt: new Date(d.createdAt) })));
        }
        if (savedSubscriptions) {
          const parsed = JSON.parse(savedSubscriptions);
          setSubscriptions(parsed.map((s: any) => ({ ...s, nextPayment: new Date(s.nextPayment), createdAt: new Date(s.createdAt) })));
        }
        if (savedTransactions) {
          const parsed = JSON.parse(savedTransactions);
          setTransactions(parsed.map((t: any) => ({ ...t, date: new Date(t.date) })));
        }
        if (savedInvoices) {
          const parsed = JSON.parse(savedInvoices);
          setInvoices(parsed.map((i: any) => ({ ...i, issueDate: new Date(i.issueDate), dueDate: new Date(i.dueDate), createdAt: new Date(i.createdAt) })));
        }
        if (savedClients) {
          const parsed = JSON.parse(savedClients);
          setClients(parsed.map((c: any) => ({ ...c, createdAt: new Date(c.createdAt) })));
        }
        if (savedBudgetSettings) {
          setBudgetSettings(JSON.parse(savedBudgetSettings));
        }
        if (savedCompanyProfiles) {
          const parsed = JSON.parse(savedCompanyProfiles);
          setCompanyProfiles(parsed.map((p: any) => ({ ...p, createdAt: new Date(p.createdAt) })));
        }
      } catch (e) {
        console.error('Error loading data from localStorage:', e);
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
    const processRecurring = () => {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const newTx: Transaction[] = [];
      let updatedTx = [...transactions];
      const toProcess = transactions.filter(tr => tr.recurring && tr.period !== 'oneTime');
      toProcess.forEach(tr => {
        const trDate = new Date(tr.date);
        let nextDue: Date | null = null;
        switch (tr.period) {
          case 'daily':
            if (trDate < today) nextDue = new Date(today);
            break;
          // other periods could be added here
        }
        if (nextDue && nextDue.getTime() !== trDate.getTime()) {
          // create new instance if not existing
          const exists = transactions.some(t => t.description === tr.description && t.amount === tr.amount && new Date(t.date).toDateString() === nextDue!.toDateString());
          if (!exists) {
            newTx.push({ ...tr, id: Math.random().toString(36).substr(2, 9), date: nextDue });
          }
          // update original transaction date
          updatedTx = updatedTx.map(t => (t.id === tr.id ? { ...t, date: nextDue } : t));
        }
      });
      if (newTx.length) {
        setTransactions(updatedTx.concat(newTx));
      } else if (updatedTx.length !== transactions.length) {
        setTransactions(updatedTx);
      }
    };
    // Run once and then daily check via localStorage flag
    const last = localStorage.getItem('planner-recurring-last-processed');
    const todayStr = new Date().toDateString();
    if (last !== todayStr) {
      processRecurring();
      localStorage.setItem('planner-recurring-last-processed', todayStr);
    }
  }, [isInitialized, transactions]);

  // Financial helper functions
  const computeProjection = (months: number): number[] => {
    const monthsArr = Array.from({ length: months }, (_, i) => i + 1);
    const netFlows = monthsArr.map(m => {
      const monthTx = transactions.filter(t => new Date(t.date).getMonth() === m - 1);
      const income = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const expense = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      return income - expense;
    });
    const reg = FinancialMathService.linearRegression(monthsArr, netFlows);
    return monthsArr.map(m => reg.predict(m));
  };

  const computeRunway = (): number | null => {
    const balance = transactions.reduce((s, t) => s + (t.type === 'income' ? t.amount : t.type === 'expense' ? -t.amount : 0), 0);
    const cashFlowTx = transactions.filter(t => t.type === 'income' || t.type === 'expense').map(t => ({ amount: t.amount, type: t.type as 'income' | 'expense' }));
    const avgBurn = FinancialMathService.burnRate(cashFlowTx, 12);
    return avgBurn === 0 ? null : FinancialMathService.runway(balance, avgBurn);
  };

  // CRUD implementations (simplified)
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
    localStorage.clear();
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
        invoices,
        clients,
        companyProfiles,
        financialStats,
        computeProjection,
        computeRunway,
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
        addTransaction,
        deleteTransaction,
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