import React, { createContext, useContext, useState, useEffect } from 'react';
import { Note, Goal, PlanItem, Drawing, Subscription, BudgetSettings, Transaction, Invoice, Client, CompanyProfile } from '../types/planner';

interface DataContextType {
  notes: Note[];
  goals: Goal[];
  plans: PlanItem[];
  drawings: Drawing[];
  subscriptions: Subscription[];
  budgetSettings: BudgetSettings;
  transactions: Transaction[];
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
  invoices: Invoice[];
  clients: Client[];
  addInvoice: (invoice: Invoice) => void;
  updateInvoice: (id: string, updates: Partial<Invoice>) => void;
  deleteInvoice: (id: string) => void;
  addClient: (client: Client) => void;
  updateClient: (id: string, updates: Partial<Client>) => void;
  deleteClient: (id: string) => void;
  companyProfiles: CompanyProfile[];
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

  const [isInitialized, setIsInitialized] = useState(false);

  // Load data from localStorage on mount
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

        if (savedNotes) {
          const parsedNotes = JSON.parse(savedNotes);
          setNotes(parsedNotes.map((note: any) => ({
            ...note,
            createdAt: new Date(note.createdAt)
          })));
        }

        if (savedGoals) {
          const parsedGoals = JSON.parse(savedGoals);
          setGoals(parsedGoals.map((goal: any) => ({
            ...goal,
            targetDate: new Date(goal.targetDate),
            createdAt: new Date(goal.createdAt)
          })));
        }

        if (savedPlans) {
          const parsedPlans = JSON.parse(savedPlans);
          setPlans(parsedPlans.map((plan: any) => ({
            ...plan,
            date: new Date(plan.date),
            startTime: plan.startTime ? new Date(plan.startTime) : undefined,
            endTime: plan.endTime ? new Date(plan.endTime) : undefined
          })));
        }

        if (savedDrawings) {
          const parsedDrawings = JSON.parse(savedDrawings);
          setDrawings(parsedDrawings.map((drawing: any) => ({
            ...drawing,
            createdAt: new Date(drawing.createdAt)
          })));
        }

        if (savedSubscriptions) {
          const parsedSubscriptions = JSON.parse(savedSubscriptions);
          setSubscriptions(parsedSubscriptions.map((sub: any) => ({
            ...sub,
            nextPayment: new Date(sub.nextPayment),
            createdAt: new Date(sub.createdAt)
          })));
        }

        if (savedTransactions) {
          const parsedTransactions = JSON.parse(savedTransactions);
          setTransactions(parsedTransactions.map((transaction: any) => ({
            ...transaction,
            date: new Date(transaction.date)
          })));
        }

        if (savedInvoices) {
          const parsedInvoices = JSON.parse(savedInvoices);
          setInvoices(parsedInvoices.map((inv: any) => ({
            ...inv,
            issueDate: new Date(inv.issueDate),
            dueDate: new Date(inv.dueDate),
            createdAt: new Date(inv.createdAt)
          })));
        }

        if (savedClients) {
          const parsedClients = JSON.parse(savedClients);
          setClients(parsedClients.map((client: any) => ({
            ...client,
            createdAt: new Date(client.createdAt)
          })));
        }

        if (savedBudgetSettings) {
          setBudgetSettings(JSON.parse(savedBudgetSettings));
        }

        const savedCompanyProfiles = localStorage.getItem('planner-company-profiles');
        if (savedCompanyProfiles) {
          const parsedProfiles = JSON.parse(savedCompanyProfiles);
          setCompanyProfiles(parsedProfiles.map((p: any) => ({
            ...p,
            createdAt: new Date(p.createdAt)
          })));
        }
      } catch (error) {
        console.error('Error loading data from localStorage:', error);
      } finally {
        setIsInitialized(true);
      }
    };

    loadData();
  }, []);

  // Helper for safe storage
  const saveToStorage = (key: string, data: any) => {
    if (!isInitialized) return;
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      if (error instanceof DOMException &&
        (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
        console.error('Storage quota exceeded. Cannot save data for:', key);
        // Optional: Dispatch an event or set a global error state here
      } else {
        console.error('Error saving to localStorage:', error);
      }
    }
  };

  // Save data to localStorage whenever state changes
  useEffect(() => { saveToStorage('planner-notes', notes); }, [notes]);
  useEffect(() => { saveToStorage('planner-goals', goals); }, [goals]);
  useEffect(() => { saveToStorage('planner-plans', plans); }, [plans]);
  useEffect(() => { saveToStorage('planner-drawings', drawings); }, [drawings]);
  useEffect(() => { saveToStorage('planner-subscriptions', subscriptions); }, [subscriptions]);
  useEffect(() => { saveToStorage('planner-transactions', transactions); }, [transactions]);
  useEffect(() => { saveToStorage('planner-invoices', invoices); }, [invoices]);
  useEffect(() => { saveToStorage('planner-clients', clients); }, [clients]);
  useEffect(() => { saveToStorage('planner-budget-settings', budgetSettings); }, [budgetSettings]);
  useEffect(() => { saveToStorage('planner-company-profiles', companyProfiles); }, [companyProfiles]);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const addNote = (noteData: Omit<Note, 'id' | 'createdAt'>) => {
    const newNote: Note = {
      ...noteData,
      id: generateId(),
      createdAt: new Date(),
    };
    setNotes(prev => [...prev, newNote]);
  };

  const updateNote = (id: string, updates: Partial<Note>) => {
    setNotes(prev => prev.map(note =>
      note.id === id ? { ...note, ...updates } : note
    ));
  };

  const deleteNote = (id: string) => {
    setNotes(prev => prev.filter(note => note.id !== id));
  };

  const addGoal = (goalData: Omit<Goal, 'id' | 'createdAt'>) => {
    const newGoal: Goal = {
      ...goalData,
      id: generateId(),
      createdAt: new Date(),
    };
    setGoals(prev => [...prev, newGoal]);
  };

  const updateGoal = (id: string, updates: Partial<Goal>) => {
    setGoals(prev => prev.map(goal =>
      goal.id === id ? { ...goal, ...updates } : goal
    ));
  };

  const deleteGoal = (id: string) => {
    setGoals(prev => prev.filter(goal => goal.id !== id));
  };

  const addPlan = (planData: Omit<PlanItem, 'id'>) => {
    const newPlan: PlanItem = {
      ...planData,
      id: generateId(),
    };
    setPlans(prev => [...prev, newPlan]);
  };

  const updatePlan = (id: string, updates: Partial<PlanItem>) => {
    setPlans(prev => prev.map(plan =>
      plan.id === id ? { ...plan, ...updates } : plan
    ));
  };

  const deletePlan = (id: string) => {
    setPlans(prev => prev.filter(plan => plan.id !== id));
  };

  const addDrawing = (drawingData: Omit<Drawing, 'id' | 'createdAt'>) => {
    const newDrawing: Drawing = {
      ...drawingData,
      id: generateId(),
      createdAt: new Date(),
    };
    setDrawings(prev => [...prev, newDrawing]);
  };

  const deleteDrawing = (id: string) => {
    setDrawings(prev => prev.filter(drawing => drawing.id !== id));
  };

  const addSubscription = (subscriptionData: Omit<Subscription, 'id' | 'createdAt'>) => {
    const newSubscription: Subscription = {
      ...subscriptionData,
      id: generateId(),
      createdAt: new Date(),
    };
    setSubscriptions(prev => [...prev, newSubscription]);
  };

  const updateSubscription = (id: string, updates: Partial<Subscription>) => {
    setSubscriptions(prev => prev.map(sub =>
      sub.id === id ? { ...sub, ...updates } : sub
    ));
  };

  const deleteSubscription = (id: string) => {
    setSubscriptions(prev => prev.filter(sub => sub.id !== id));
  };

  const updateBudgetSettings = (settings: Partial<BudgetSettings>) => {
    setBudgetSettings(prev => ({ ...prev, ...settings }));
  };

  const addTransaction = (transactionData: Omit<Transaction, 'id'>) => {
    const newTransaction: Transaction = {
      ...transactionData,
      id: generateId(),
    };
    setTransactions(prev => [...prev, newTransaction]);
  };

  const deleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(tr => tr.id !== id));
  };

  const addInvoice = (invoice: Invoice) => {
    setInvoices(prev => [...prev, invoice]);
  };

  const updateInvoice = (id: string, updates: Partial<Invoice>) => {
    setInvoices(prev => prev.map(inv =>
      inv.id === id ? { ...inv, ...updates } : inv
    ));
  };

  const deleteInvoice = (id: string) => {
    setInvoices(prev => prev.filter(inv => inv.id !== id));
  };

  const addClient = (client: Client) => {
    setClients(prev => [...prev, client]);
  };

  const updateClient = (id: string, updates: Partial<Client>) => {
    setClients(prev => prev.map(c =>
      c.id === id ? { ...c, ...updates } : c
    ));
  };

  const deleteClient = (id: string) => {
    setClients(prev => prev.filter(c => c.id !== id));
  };

  const addCompanyProfile = (profileData: Omit<CompanyProfile, 'id' | 'createdAt'>) => {
    const newProfile: CompanyProfile = {
      ...profileData,
      id: generateId(),
      createdAt: new Date(),
    };
    setCompanyProfiles(prev => [...prev, newProfile]);
  };

  const updateCompanyProfile = (id: string, updates: Partial<CompanyProfile>) => {
    setCompanyProfiles(prev => prev.map(p =>
      p.id === id ? { ...p, ...updates } : p
    ));
  };

  const deleteCompanyProfile = (id: string) => {
    setCompanyProfiles(prev => prev.filter(p => p.id !== id));
  };

  const clearAllData = () => {
    setNotes([]);
    setGoals([]);
    setPlans([]);
    setDrawings([]);
    setSubscriptions([]);
    setSubscriptions([]);
    setTransactions([]);
    setInvoices([]);
    setClients([]);
    setCompanyProfiles([]);
    setBudgetSettings({
      monthlyBudget: 0,
      currency: 'USD',
      notifications: true,
      warningThreshold: 80,
    });
    localStorage.removeItem('planner-notes');
    localStorage.removeItem('planner-goals');
    localStorage.removeItem('planner-plans');
    localStorage.removeItem('planner-drawings');
    localStorage.removeItem('planner-subscriptions');
    localStorage.removeItem('planner-transactions');
    localStorage.removeItem('planner-invoices');
    localStorage.removeItem('planner-clients');
    localStorage.removeItem('planner-company-profiles');
    localStorage.removeItem('planner-budget-settings');
  };

  return (
    <DataContext.Provider value={{
      notes,
      goals,
      plans,
      drawings,
      subscriptions,
      budgetSettings,
      transactions,
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
      invoices,
      clients,
      addInvoice,
      updateInvoice,
      deleteInvoice,
      addClient,
      updateClient,
      deleteClient,
      companyProfiles,
      addCompanyProfile,
      updateCompanyProfile,
      deleteCompanyProfile,
      clearAllData,
    }}>
      {children}
    </DataContext.Provider>
  );
};