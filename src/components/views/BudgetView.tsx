import React, { useState } from 'react';
import {
  DollarSign, TrendingUp, TrendingDown,
  Wallet, Plus, ArrowUpRight, ArrowDownRight, X, Trash2
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { useLanguage } from '../../contexts/LanguageContext';

interface Transaction {
  id: number;
  name: string;
  date: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
}

const BudgetView: React.FC = () => {
  const { t } = useLanguage();

  // State for transactions
  const [transactions, setTransactions] = useState<Transaction[]>([
    { id: 1, name: 'Adobe Creative Cloud', date: '2024-12-04', amount: -54.99, type: 'expense', category: 'Software' },
    { id: 2, name: 'Client Payment - Tech Corp', date: '2024-12-03', amount: 1250.00, type: 'income', category: 'Service' },
    { id: 3, name: 'Google Workspace', date: '2024-12-01', amount: -12.00, type: 'expense', category: 'Software' },
    { id: 4, name: 'Upwork Earnings', date: '2024-11-30', amount: 850.00, type: 'income', category: 'Freelance' },
  ]);

  // Add Transaction Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTransaction, setNewTransaction] = useState({
    name: '',
    amount: '',
    type: 'expense' as 'income' | 'expense',
    category: 'Software',
  });

  // Calculate totals
  const totalBalance = transactions.reduce((acc, t) => acc + t.amount, 0);
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + Math.abs(t.amount), 0);

  // Chart Data
  const cashFlowData = [
    { name: 'Jan', income: 4500, expense: 3200 },
    { name: 'Feb', income: 5200, expense: 3400 },
    { name: 'Mar', income: 4800, expense: 3100 },
    { name: 'Apr', income: 6100, expense: 3800 },
    { name: 'May', income: 5900, expense: 3600 },
    { name: 'Jun', income: 7200, expense: 4100 },
  ];

  const expenseCategories = [
    { name: 'Software', value: 35, color: '#4361ee' },
    { name: 'Marketing', value: 25, color: '#a855f7' },
    { name: 'Office', value: 15, color: '#06b6d4' },
    { name: 'Travel', value: 10, color: '#f59e0b' },
    { name: 'Misc', value: 15, color: '#10b981' },
  ];

  const categories = ['Software', 'Marketing', 'Office', 'Travel', 'Service', 'Freelance', 'Food', 'Transport', 'Utilities', 'Other'];

  const handleAddTransaction = () => {
    if (!newTransaction.name || !newTransaction.amount) return;

    const amount = parseFloat(newTransaction.amount);
    const transaction: Transaction = {
      id: Date.now(),
      name: newTransaction.name,
      date: new Date().toISOString().split('T')[0],
      amount: newTransaction.type === 'expense' ? -Math.abs(amount) : Math.abs(amount),
      type: newTransaction.type,
      category: newTransaction.category,
    };

    setTransactions([transaction, ...transactions]);
    setNewTransaction({ name: '', amount: '', type: 'expense', category: 'Software' });
    setShowAddModal(false);
  };

  const handleDeleteTransaction = (id: number) => {
    setTransactions(transactions.filter(t => t.id !== id));
  };

  return (
    <div className="view-container">
      {/* Header */}
      <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="view-title flex items-center gap-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg shadow-emerald-500/30">
              <DollarSign size={20} className="text-white" />
            </div>
            {t('nav.budgetTracker')}
          </h1>
          <p className="view-subtitle">{t('budget.subtitle')}</p>
        </div>

        <button onClick={() => setShowAddModal(true)} className="btn-primary">
          <Plus size={16} />
          {t('budget.addTransaction')}
        </button>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div className="stat-card stat-card-success">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium opacity-90">{t('budget.balance')}</span>
              <Wallet size={16} className="opacity-80" />
            </div>
            <div className="text-2xl font-bold">€{totalBalance.toFixed(2)}</div>
          </div>
        </div>

        <div className="stat-card stat-card-primary">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium opacity-90">{t('budget.income')}</span>
              <TrendingUp size={16} className="opacity-80" />
            </div>
            <div className="text-2xl font-bold">€{totalIncome.toFixed(2)}</div>
          </div>
        </div>

        <div className="stat-card stat-card-warning">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium opacity-90">{t('budget.expense')}</span>
              <TrendingDown size={16} className="opacity-80" />
            </div>
            <div className="text-2xl font-bold">€{totalExpense.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Cash Flow Chart */}
        <div className="card lg:col-span-2">
          <h3 className="section-title mb-3">{t('budget.cashFlow')}</h3>
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cashFlowData}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                <Legend />
                <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorIncome)" />
                <Area type="monotone" dataKey="expense" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorExpense)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expense Breakdown */}
        <div className="card">
          <h3 className="section-title mb-3">{t('budget.expenseCategories')}</h3>
          <div className="h-[220px] w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={expenseCategories} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                  {expenseCategories.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={30} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="section-title mb-0">{t('budget.transactions')}</h3>
          <span className="text-xs text-gray-500">{transactions.length} db</span>
        </div>

        <div className="space-y-2">
          {transactions.map((transaction) => (
            <div
              key={transaction.id}
              className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${transaction.type === 'income'
                  ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                  {transaction.type === 'income' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                </div>
                <div>
                  <p className="font-medium text-sm text-gray-900 dark:text-white">{transaction.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{transaction.category} • {transaction.date}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`font-bold text-sm ${transaction.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-white'}`}>
                  {transaction.type === 'income' ? '+' : ''}€{Math.abs(transaction.amount).toFixed(2)}
                </span>
                <button
                  onClick={() => handleDeleteTransaction(transaction.id)}
                  className="p-1.5 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-red-50"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}

          {transactions.length === 0 && (
            <div className="text-center py-6 text-gray-500 text-sm">
              {t('budget.noTransactions')}
            </div>
          )}
        </div>
      </div>

      {/* Add Transaction Modal */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal-panel p-5 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('budget.addTransaction')}</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <X size={18} className="text-gray-500" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Type Selection */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setNewTransaction({ ...newTransaction, type: 'expense' })}
                  className={`flex-1 p-2.5 rounded-xl font-medium text-sm transition-all ${newTransaction.type === 'expense'
                    ? 'bg-red-100 text-red-600 border-2 border-red-500'
                    : 'bg-gray-100 text-gray-600 border-2 border-transparent'
                    }`}
                >
                  <ArrowDownRight size={16} className="inline mr-1" />
                  {t('budget.expense')}
                </button>
                <button
                  type="button"
                  onClick={() => setNewTransaction({ ...newTransaction, type: 'income' })}
                  className={`flex-1 p-2.5 rounded-xl font-medium text-sm transition-all ${newTransaction.type === 'income'
                    ? 'bg-green-100 text-green-600 border-2 border-green-500'
                    : 'bg-gray-100 text-gray-600 border-2 border-transparent'
                    }`}
                >
                  <ArrowUpRight size={16} className="inline mr-1" />
                  {t('budget.income')}
                </button>
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('budget.name')}</label>
                <input
                  type="text"
                  value={newTransaction.name}
                  onChange={(e) => setNewTransaction({ ...newTransaction, name: e.target.value })}
                  placeholder="pl. Adobe előfizetés"
                  className="input-field text-sm"
                />
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('budget.amount')}</label>
                <input
                  type="number"
                  step="0.01"
                  value={newTransaction.amount}
                  onChange={(e) => setNewTransaction({ ...newTransaction, amount: e.target.value })}
                  placeholder="0.00"
                  className="input-field text-sm"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('budget.category')}</label>
                <select
                  value={newTransaction.category}
                  onChange={(e) => setNewTransaction({ ...newTransaction, category: e.target.value })}
                  className="input-field text-sm"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowAddModal(false)} className="btn-ghost flex-1 text-sm">{t('common.cancel')}</button>
              <button onClick={handleAddTransaction} className="btn-success flex-1 text-sm">
                <Plus size={16} />
                {t('budget.addTransaction')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BudgetView;