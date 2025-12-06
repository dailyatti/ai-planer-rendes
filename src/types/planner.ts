export type ViewType = 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'notes' | 'goals' | 'drawing' | 'budget' | 'invoicing' | 'pomodoro' | 'statistics' | 'integrations' | 'settings';

export type TransactionPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'oneTime';

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  linkedPlans: string[];
  tags: string[];
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  targetDate: Date;
  progress: number;
  status: 'not-started' | 'in-progress' | 'completed' | 'paused';
  createdAt: Date;
}

export interface PlanItem {
  id: string;
  title: string;
  description: string;
  startTime?: Date;
  endTime?: Date;
  date: Date;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  linkedNotes: string[];
}

export interface Drawing {
  id: string;
  title: string;
  data: string; // base64 encoded image data
  createdAt: Date;
}

export interface Subscription {
  id: string;
  name: string;
  description: string;
  cost: number;
  currency: string;
  billingCycle: 'monthly' | 'yearly' | 'weekly' | 'daily' | 'one-time';
  nextPayment: Date;
  isActive: boolean;
  category: string;
  createdAt: Date;
}

export interface BudgetSettings {
  monthlyBudget: number;
  currency: string;
  notifications: boolean;
  warningThreshold: number; // percentage
}

export interface Transaction {
  id: string;
  subscriptionId?: string;
  amount: number;
  description: string; // Used as name
  date: Date;
  type: 'income' | 'expense' | 'subscription';
  category: string;
  period?: TransactionPeriod;
  recurring?: boolean;
}

// PhD-Level Invoice Types
export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientId: string;
  items: InvoiceItem[];
  subtotal: number;
  taxRate: number;
  tax: number;
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  issueDate: Date;
  dueDate: Date;
  paidDate?: Date;
  notes: string;
  currency: string;
  createdAt: Date;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  company?: string;
  taxId?: string;
  createdAt: Date;
}

export interface FinancialForecast {
  period: 'week' | 'month' | 'quarter' | 'year';
  expectedIncome: number;
  expectedExpenses: number;
  projectedProfit: number;
  date: Date;
}

// Integration Types
export interface Integration {
  id: string;
  type: 'google-calendar' | 'notion' | 'todoist' | 'outlook';
  name: string;
  connected: boolean;
  lastSync?: Date;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
  settings?: Record<string, any>;
}

export interface SyncEvent {
  id: string;
  integrationId: string;
  status: 'pending' | 'syncing' | 'success' | 'error';
  message?: string;
  timestamp: Date;
}