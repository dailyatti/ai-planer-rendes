import React, { createContext, useContext, useState, useEffect } from 'react';
import { Note, Goal, PlanItem, Drawing, Subscription, BudgetSettings, Transaction } from '../types/planner';

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
  const [budgetSettings, setBudgetSettings] = useState<BudgetSettings>({
    monthlyBudget: 0,
    currency: 'USD',
    notifications: true,
    warningThreshold: 80,
  });

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
        
        if (savedBudgetSettings) {
          setBudgetSettings(JSON.parse(savedBudgetSettings));
        }
      } catch (error) {
        console.error('Error loading data from localStorage:', error);
      }
    };

    loadData();
  }, []);

  // Save data to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem('planner-notes', JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    localStorage.setItem('planner-goals', JSON.stringify(goals));
  }, [goals]);

  useEffect(() => {
    localStorage.setItem('planner-plans', JSON.stringify(plans));
  }, [plans]);

  useEffect(() => {
    localStorage.setItem('planner-drawings', JSON.stringify(drawings));
  }, [drawings]);

  useEffect(() => {
    localStorage.setItem('planner-subscriptions', JSON.stringify(subscriptions));
  }, [subscriptions]);

  useEffect(() => {
    localStorage.setItem('planner-transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('planner-budget-settings', JSON.stringify(budgetSettings));
  }, [budgetSettings]);
  
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

  const clearAllData = () => {
    setNotes([]);
    setGoals([]);
    setPlans([]);
    setDrawings([]);
    setSubscriptions([]);
    setTransactions([]);
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
      clearAllData,
    }}>
      {children}
    </DataContext.Provider>
  );
};