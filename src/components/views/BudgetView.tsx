import React, { useState, useMemo } from 'react';
import {
  Wallet, Plus, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
  X, Trash2, PieChart, Repeat, Filter, BarChart3, Calendar, Check
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPieChart, Pie, Cell, Legend
} from 'recharts';
import { useLanguage } from '../../contexts/LanguageContext';

type TransactionPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'oneTime';

interface Transaction {
  id: number;
  name: string;
  date: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  period: TransactionPeriod;
  recurring?: boolean;
}

const BudgetView: React.FC = () => {
  const { t, language } = useLanguage();
  const [currency, setCurrency] = useState<'EUR' | 'HUF' | 'USD'>('HUF');
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'planning'>('overview');
  const [showAddModal, setShowAddModal] = useState(false);
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('expense');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Form state
  const [newTransaction, setNewTransaction] = useState({
    name: '',
    amount: '',
    category: 'other',
    period: 'monthly' as TransactionPeriod,
    date: new Date().toISOString().split('T')[0]
  });

  // Transactions data
  const [transactions, setTransactions] = useState<Transaction[]>([
    { id: 1, name: 'Adobe Creative Cloud', date: '2024-12-04', amount: -6500, type: 'expense', category: 'software', period: 'monthly', recurring: true },
    { id: 2, name: 'Tech Solutions Kft.', date: '2024-12-03', amount: 450000, type: 'income', category: 'service', period: 'oneTime' },
    { id: 3, name: 'Google Workspace', date: '2024-12-01', amount: -2500, type: 'expense', category: 'software', period: 'monthly', recurring: true },
    { id: 4, name: 'Upwork Project', date: '2024-11-30', amount: 125000, type: 'income', category: 'freelance', period: 'oneTime' },
    { id: 5, name: 'Iroda Bérleti Díj', date: '2024-12-01', amount: -150000, type: 'expense', category: 'office', period: 'monthly', recurring: true },
    { id: 6, name: 'Facebook Hirdetések', date: '2024-12-02', amount: -45000, type: 'expense', category: 'marketing', period: 'weekly' },
    { id: 7, name: 'Szabadúszó Munka', date: '2024-12-05', amount: 85000, type: 'income', category: 'freelance', period: 'weekly' },
  ]);

  // Categories with translated labels
  const CATEGORIES = useMemo(() => ({
    software: { color: '#4361ee', label: t('budget.software') },
    marketing: { color: '#a855f7', label: t('budget.marketing') },
    office: { color: '#06b6d4', label: t('budget.office') },
    travel: { color: '#f59e0b', label: t('budget.travel') },
    service: { color: '#10b981', label: t('budget.service') },
    freelance: { color: '#3b82f6', label: t('budget.freelance') },
    other: { color: '#9ca3af', label: t('budget.other') }
  }), [t]);

  // Calculate totals
  const { totalIncome, totalExpense, balance, recurringMonthly } = useMemo(() => {
    const income = transactions.filter(tr => tr.type === 'income').reduce((acc, tr) => acc + tr.amount, 0);
    const expense = transactions.filter(tr => tr.type === 'expense').reduce((acc, tr) => acc + Math.abs(tr.amount), 0);
    const recurring = transactions.filter(tr => tr.type === 'expense' && tr.recurring).reduce((acc, tr) => acc + Math.abs(tr.amount), 0);
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
    return new Intl.DateTimeFormat(language === 'hu' ? 'hu-HU' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(dateStr));
  };

  // Chart Data
  const categoryData = useMemo(() => {
    const expensesByCategory: Record<string, number> = {};
    transactions.filter(tr => tr.type === 'expense').forEach(tr => {
      expensesByCategory[tr.category] = (expensesByCategory[tr.category] || 0) + Math.abs(tr.amount);
    });

    return Object.entries(expensesByCategory).map(([cat, val]) => ({
      name: (CATEGORIES as any)[cat]?.label || cat,
      value: val,
      color: (CATEGORIES as any)[cat]?.color || '#9ca3af'
    }));
  }, [transactions, CATEGORIES]);

  const cashFlowData = [
    { name: t('months.january').slice(0, 3), income: 450000, expense: 320000 },
    { name: t('months.february').slice(0, 3), income: 520000, expense: 340000 },
    { name: t('months.march').slice(0, 3), income: 480000, expense: 310000 },
    { name: t('months.april').slice(0, 3), income: 610000, expense: 380000 },
    { name: t('months.may').slice(0, 3), income: 590000, expense: 360000 },
    { name: t('months.june').slice(0, 3), income: 720000, expense: 410000 },
  ];

  // Handlers
  const handleAddTransaction = () => {
    if (!newTransaction.name || !newTransaction.amount) return;

    const amount = parseFloat(newTransaction.amount);
    const newTrans: Transaction = {
      id: Date.now(),
      name: newTransaction.name,
      date: newTransaction.date,
      amount: transactionType === 'expense' ? -Math.abs(amount) : Math.abs(amount),
      type: transactionType,
      category: newTransaction.category,
      period: newTransaction.period,
      recurring: newTransaction.period !== 'oneTime'
    };

    setTransactions([newTrans, ...transactions]);
    setNewTransaction({ name: '', amount: '', category: 'other', period: 'monthly', date: new Date().toISOString().split('T')[0] });
    setShowAddModal(false);
  };

  const handleDeleteTransaction = (id: number) => {
    setTransactions(transactions.filter(tr => tr.id !== id));
  };

  const filteredTransactions = filterCategory === 'all'
    ? transactions
    : transactions.filter(tr => tr.category === filterCategory);

  const getPeriodLabel = (period: TransactionPeriod) => {
    const labels: Record<TransactionPeriod, string> = {
      daily: t('budget.daily'),
      weekly: t('budget.weekly'),
      monthly: t('budget.monthly'),
      yearly: t('budget.yearly'),
      oneTime: t('budget.oneTime')
    };
    return labels[period];
  };

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
            className="input-field w-auto font-bold text-gray-700 dark:text-gray-200 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-gray-200 dark:border-gray-700"
            value={currency}
            onChange={(e) => setCurrency(e.target.value as any)}
          >
            <option value="HUF">HUF (Ft)</option>
            <option value="EUR">EUR (€)</option>
            <option value="USD">USD ($)</option>
          </select>
          <button
            onClick={() => { setTransactionType('income'); setShowAddModal(true); }}
            className="btn-secondary flex items-center gap-2 px-4 py-2.5 bg-green-500/10 text-green-600 border-green-200 hover:bg-green-500/20"
          >
            <TrendingUp size={18} />
            <span>{t('budget.addIncome')}</span>
          </button>
          <button
            onClick={() => { setTransactionType('expense'); setShowAddModal(true); }}
            className="btn-primary flex items-center gap-2 px-4 py-2.5 shadow-lg shadow-primary-500/25"
          >
            <Plus size={18} />
            <span>{t('budget.addExpense')}</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        {(['overview', 'transactions', 'planning'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 font-medium transition-all relative ${activeTab === tab
                ? 'text-primary-600 dark:text-primary-400'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
          >
            {t(`budget.${tab}`)}
            {activeTab === tab && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500 rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in">
        {/* Balance Card */}
        <div className="card p-6 bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xl shadow-emerald-500/20 hover:shadow-2xl hover:shadow-emerald-500/30 transition-all duration-300 hover:scale-[1.02]">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm font-medium opacity-80">{t('budget.balance')}</p>
              <h3 className="text-3xl font-bold mt-1">{formatMoney(balance)}</h3>
            </div>
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm"><Wallet size={20} /></div>
          </div>
          <div className="text-sm opacity-80 flex items-center gap-1">
            {balance >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {balance >= 0 ? t('budget.profit') : t('budget.loss')}
          </div>
        </div>

        {/* Income Card */}
        <div className="card p-6 bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-xl shadow-blue-500/20 hover:shadow-2xl hover:shadow-blue-500/30 transition-all duration-300 hover:scale-[1.02]">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm font-medium opacity-80">{t('budget.income')}</p>
              <h3 className="text-3xl font-bold mt-1">{formatMoney(totalIncome)}</h3>
            </div>
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm"><TrendingUp size={20} /></div>
          </div>
        </div>

        {/* Expense Card */}
        <div className="card p-6 bg-gradient-to-br from-orange-500 to-red-500 text-white shadow-xl shadow-orange-500/20 hover:shadow-2xl hover:shadow-orange-500/30 transition-all duration-300 hover:scale-[1.02]">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm font-medium opacity-80">{t('budget.expense')}</p>
              <h3 className="text-3xl font-bold mt-1">{formatMoney(totalExpense)}</h3>
            </div>
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm"><TrendingDown size={20} /></div>
          </div>
        </div>

        {/* Recurring Card */}
        <div className="card p-6 bg-gradient-to-br from-purple-500 to-violet-600 text-white shadow-xl shadow-purple-500/20 hover:shadow-2xl hover:shadow-purple-500/30 transition-all duration-300 hover:scale-[1.02]">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm font-medium opacity-80">{t('budget.monthlyFixed')}</p>
              <h3 className="text-3xl font-bold mt-1">{formatMoney(recurringMonthly)}</h3>
            </div>
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm"><Repeat size={20} /></div>
          </div>
          <div className="text-sm opacity-80">{t('budget.recurringLabel')}</div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cash Flow Chart */}
        <div className="card lg:col-span-2 p-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <BarChart3 size={20} className="text-primary-500" />
              {t('budget.cashFlow')}
            </h3>
          </div>
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cashFlowData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} tickFormatter={(value) => value >= 1000 ? `${value / 1000}k` : value} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.2)', backdropFilter: 'blur(8px)' }} formatter={(value: number) => formatMoney(value)} />
                <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" name={t('budget.income')} />
                <Area type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorExpense)" name={t('budget.expense')} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expense Breakdown */}
        <div className="card p-6 flex flex-col bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-all duration-300">
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
            <div className="absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
              <div className="text-xs text-gray-400 uppercase tracking-wider">{t('common.total')}</div>
              <div className="font-bold text-gray-900 dark:text-white text-lg">{formatMoney(totalExpense)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div className="card p-0 overflow-hidden border border-gray-100 dark:border-gray-800 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50/50 dark:bg-gray-800/50">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('budget.transactions')}</h3>
          <div className="flex gap-2">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="input-field text-sm py-1.5 pr-8"
            >
              <option value="all">{t('budget.filter')}: {t('budget.other')}</option>
              {Object.entries(CATEGORIES).map(([key, val]) => (
                <option key={key} value={key}>{val.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {filteredTransactions.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <Wallet size={48} className="mx-auto mb-4 opacity-50" />
              <p>{t('budget.noTransactions')}</p>
            </div>
          ) : (
            filteredTransactions.map((tr) => (
              <div key={tr.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${tr.type === 'income'
                    ? 'bg-green-100 text-green-600 dark:bg-green-900/20'
                    : 'bg-red-100 text-red-600 dark:bg-red-900/20'
                    }`}>
                    {tr.type === 'income' ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white">{tr.name}</h4>
                    <div className="flex items-center gap-2 text-sm text-gray-500 flex-wrap">
                      <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider" style={{ backgroundColor: (CATEGORIES as any)[tr.category]?.color + '20', color: (CATEGORIES as any)[tr.category]?.color }}>
                        {(CATEGORIES as any)[tr.category]?.label || tr.category}
                      </span>
                      <span>• {formatDate(tr.date)}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                        {getPeriodLabel(tr.period)}
                      </span>
                      {tr.recurring && <span className="flex items-center gap-1 text-purple-600 bg-purple-50 dark:bg-purple-900/20 px-1.5 rounded"><Repeat size={10} /></span>}
                    </div>
                  </div>
                </div>
                <div className="text-right flex items-center gap-4">
                  <span className={`text-lg font-bold block ${tr.type === 'income' ? 'text-green-600' : 'text-gray-900 dark:text-white'}`}>
                    {tr.type === 'income' ? '+' : ''}{formatMoney(tr.amount)}
                  </span>
                  <button
                    onClick={() => handleDeleteTransaction(tr.id)}
                    className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Transaction Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6 m-4 animate-slide-up border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                {transactionType === 'income' ? (
                  <><TrendingUp className="text-green-500" size={24} /> {t('budget.addIncome')}</>
                ) : (
                  <><TrendingDown className="text-red-500" size={24} /> {t('budget.addExpense')}</>
                )}
              </h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('budget.transactionName')}
                </label>
                <input
                  type="text"
                  value={newTransaction.name}
                  onChange={(e) => setNewTransaction({ ...newTransaction, name: e.target.value })}
                  className="input-field w-full"
                  placeholder={transactionType === 'income' ? 'pl. Ügyfél kifizetés' : 'pl. Szoftver előfizetés'}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('budget.amount')}
                </label>
                <input
                  type="number"
                  value={newTransaction.amount}
                  onChange={(e) => setNewTransaction({ ...newTransaction, amount: e.target.value })}
                  className="input-field w-full"
                  placeholder="0"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('budget.category')}
                  </label>
                  <select
                    value={newTransaction.category}
                    onChange={(e) => setNewTransaction({ ...newTransaction, category: e.target.value })}
                    className="input-field w-full"
                  >
                    {Object.entries(CATEGORIES).map(([key, val]) => (
                      <option key={key} value={key}>{val.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('budget.period')}
                  </label>
                  <select
                    value={newTransaction.period}
                    onChange={(e) => setNewTransaction({ ...newTransaction, period: e.target.value as TransactionPeriod })}
                    className="input-field w-full"
                  >
                    <option value="daily">{t('budget.daily')}</option>
                    <option value="weekly">{t('budget.weekly')}</option>
                    <option value="monthly">{t('budget.monthly')}</option>
                    <option value="yearly">{t('budget.yearly')}</option>
                    <option value="oneTime">{t('budget.oneTime')}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('budget.date')}
                </label>
                <input
                  type="date"
                  value={newTransaction.date}
                  onChange={(e) => setNewTransaction({ ...newTransaction, date: e.target.value })}
                  className="input-field w-full"
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowAddModal(false)} className="btn-secondary flex-1">
                  {t('common.cancel')}
                </button>
                <button onClick={handleAddTransaction} className={`flex-1 flex items-center justify-center gap-2 ${transactionType === 'income' ? 'btn-primary bg-green-600 hover:bg-green-700' : 'btn-primary'}`}>
                  <Check size={18} />
                  {t('budget.saveTransaction')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BudgetView;