import React, { useState, useMemo } from 'react';
import {
  DollarSign, TrendingUp, TrendingDown,
  Wallet, Plus, ArrowUpRight, ArrowDownRight, X, Trash2,
  PieChart, Target, Repeat, Filter, Calendar
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPieChart, Pie, Cell, Legend, BarChart, Bar, ReferenceLine
} from 'recharts';
import { useLanguage } from '../../contexts/LanguageContext';

interface Transaction {
  id: number;
  name: string;
  date: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  recurring?: boolean;
}

const BudgetView: React.FC = () => {
  const { t, language } = useLanguage();
  const [currency, setCurrency] = useState<'EUR' | 'HUF' | 'USD'>('HUF');
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'planning'>('overview');

  // Enhanced Mock Data
  const [transactions, setTransactions] = useState<Transaction[]>([
    { id: 1, name: 'Adobe Creative Cloud', date: '2024-12-04', amount: -6500, type: 'expense', category: 'software', recurring: true },
    { id: 2, name: 'Tech Solutions Kft.', date: '2024-12-03', amount: 450000, type: 'income', category: 'service', recurring: false },
    { id: 3, name: 'Google Workspace', date: '2024-12-01', amount: -2500, type: 'expense', category: 'software', recurring: true },
    { id: 4, name: 'Upwork Project', date: '2024-11-30', amount: 125000, type: 'income', category: 'freelance', recurring: false },
    { id: 5, name: 'Office Rent', date: '2024-12-01', amount: -150000, type: 'expense', category: 'office', recurring: true },
    { id: 6, name: 'Facebook Ads', date: '2024-12-02', amount: -45000, type: 'expense', category: 'marketing', recurring: false },
  ]);

  // Categories with colors
  const CATEGORIES = {
    software: { color: '#4361ee', label: 'Software' },
    marketing: { color: '#a855f7', label: 'Marketing' },
    office: { color: '#06b6d4', label: 'Office' },
    travel: { color: '#f59e0b', label: 'Travel' },
    service: { color: '#10b981', label: 'Client Service' },
    freelance: { color: '#3b82f6', label: 'Freelance' },
    other: { color: '#9ca3af', label: 'Other' }
  };

  // Calculate totals
  const { totalIncome, totalExpense, balance, recurringMonthly } = useMemo(() => {
    const income = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + Math.abs(t.amount), 0);
    const recurring = transactions.filter(t => t.type === 'expense' && t.recurring).reduce((acc, t) => acc + Math.abs(t.amount), 0);
    return { totalIncome: income, totalExpense: expense, balance: income - expense, recurringMonthly: recurring };
  }, [transactions]);

  // Formatters
  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat(language === 'hu' ? 'hu-HU' : 'en-US', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Intl.DateTimeFormat(language === 'hu' ? 'hu-HU' : 'en-US').format(new Date(dateStr));
  };

  // Chart Data Preparation
  const categoryData = useMemo(() => {
    const expensesByCategory: Record<string, number> = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
      expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + Math.abs(t.amount);
    });

    return Object.entries(expensesByCategory).map(([cat, val]) => ({
      name: (CATEGORIES as any)[cat]?.label || cat,
      value: val,
      color: (CATEGORIES as any)[cat]?.color || '#9ca3af'
    }));
  }, [transactions]);

  // Mock Cash Flow Data
  const cashFlowData = [
    { name: 'Jan', income: 450000, expense: 320000 },
    { name: 'Feb', income: 520000, expense: 340000 },
    { name: 'Mar', income: 480000, expense: 310000 },
    { name: 'Apr', income: 610000, expense: 380000 },
    { name: 'May', income: 590000, expense: 360000 },
    { name: 'Jun', income: 720000, expense: 410000 },
  ];

  return (
    <div className="view-container max-w-7xl mx-auto space-y-8 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-xl shadow-emerald-500/20">
              <Wallet size={28} className="text-white" />
            </div>
            {t('budget.title')}
          </h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400 text-lg">{t('budget.subtitle')}</p>
        </div>

        <div className="flex items-center gap-3">
          <select
            className="input-field w-auto font-bold text-gray-700"
            value={currency}
            onChange={(e) => setCurrency(e.target.value as any)}
          >
            <option value="HUF">HUF (Ft)</option>
            <option value="EUR">EUR (€)</option>
            <option value="USD">USD ($)</option>
          </select>
          <button className="btn-primary flex items-center gap-2 px-4 py-2.5 shadow-lg shadow-primary-500/25">
            <Plus size={18} />
            <span>{t('budget.addTransaction')}</span>
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in">
        <div className="card stat-card-success p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm font-medium opacity-80">{t('budget.balance')}</p>
              <h3 className="text-3xl font-bold mt-1">{formatMoney(balance)}</h3>
            </div>
            <div className="p-2 bg-white/20 rounded-lg"><Wallet size={20} /></div>
          </div>
          <div className="text-sm opacity-80 flex items-center gap-1">
            <TrendingUp size={14} /> +12% {t('invoicing.fromLastMonth')}
          </div>
        </div>

        <div className="card stat-card-primary p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm font-medium opacity-80">{t('budget.income')}</p>
              <h3 className="text-3xl font-bold mt-1">{formatMoney(totalIncome)}</h3>
            </div>
            <div className="p-2 bg-white/20 rounded-lg"><TrendingUp size={20} /></div>
          </div>
        </div>

        <div className="card stat-card-warning p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm font-medium opacity-80">{t('budget.expense')}</p>
              <h3 className="text-3xl font-bold mt-1">{formatMoney(totalExpense)}</h3>
            </div>
            <div className="p-2 bg-white/20 rounded-lg"><TrendingDown size={20} /></div>
          </div>
        </div>

        <div className="card bg-purple-500 text-white p-6 shadow-lg shadow-purple-500/20">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm font-medium opacity-80">{t('invoicing.subscriptionsRecurring')}</p>
              <h3 className="text-3xl font-bold mt-1">{formatMoney(recurringMonthly)}</h3>
            </div>
            <div className="p-2 bg-white/20 rounded-lg"><Repeat size={20} /></div>
          </div>
          <div className="text-sm opacity-80">
            {t('budget.monthlyFixed')}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cash Flow Chart */}
        <div className="card lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <BarChart size={20} className="text-primary-500" />
              {t('budget.cashFlow')}
            </h3>
          </div>
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cashFlowData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} tickFormatter={(value) => value >= 1000 ? `${value / 1000}k` : value} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                  formatter={(value: number) => formatMoney(value)}
                />
                <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" />
                <Area type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorExpense)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expense Breakdown */}
        <div className="card p-6 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <PieChart size={20} className="text-purple-500" />
              {t('budget.expenseCategories')}
            </h3>
          </div>
          <div className="h-[300px] relative flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="45%"
                  innerRadius={70}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatMoney(value)} />
                <Legend
                  verticalAlign="bottom"
                  height={80}
                  content={(props) => {
                    const { payload } = props;
                    return (
                      <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-4 text-xs">
                        {payload?.map((entry: any, index: number) => (
                          <div key={`item-${index}`} className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                            <span className="truncate text-gray-600 dark:text-gray-300">{entry.value}</span>
                          </div>
                        ))}
                      </div>
                    );
                  }}
                />
              </RechartsPieChart>
            </ResponsiveContainer>
            {/* Center Text */}
            <div className="absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
              <div className="text-xs text-gray-400 uppercase tracking-wider">Total</div>
              <div className="font-bold text-gray-900 dark:text-white text-lg">{formatMoney(totalExpense)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div className="card p-0 overflow-hidden border border-gray-100 dark:border-gray-800">
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('budget.transactions')}</h3>
          <div className="flex gap-2">
            <button className="btn-secondary text-sm py-1.5"><Filter size={14} className="mr-1" /> Filter</button>
          </div>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {transactions.map((t) => (
            <div key={t.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${t.type === 'income'
                  ? 'bg-green-100 text-green-600 dark:bg-green-900/20'
                  : 'bg-red-100 text-red-600 dark:bg-red-900/20'
                  }`}>
                  {t.type === 'income' ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white">{t.name}</h4>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${(CATEGORIES as any)[t.category]?.color ? '' : 'bg-gray-100'} `} style={{ backgroundColor: (CATEGORIES as any)[t.category]?.color + '20', color: (CATEGORIES as any)[t.category]?.color }}>
                      {(CATEGORIES as any)[t.category]?.label || t.category}
                    </span>
                    <span>• {formatDate(t.date)}</span>
                    {t.recurring && <span className="flex items-center gap-1 text-purple-600 bg-purple-50 px-1.5 rounded"><Repeat size={10} /> Recur</span>}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className={`text-lg font-bold block ${t.type === 'income' ? 'text-green-600' : 'text-gray-900 dark:text-white'}`}>
                  {t.type === 'income' ? '+' : ''}{formatMoney(t.amount)}
                </span>
                <button className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all text-xs flex items-center gap-1 ml-auto mt-1">
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BudgetView;