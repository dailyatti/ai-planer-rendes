import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Plus, TrendingUp, TrendingDown, Trash2, X, Repeat, Wallet, BarChart3, 
  Check, RefreshCcw, PieChart, ArrowUpRight, ArrowDownRight, CheckSquare, 
  Square, AlertTriangle, Search
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPieChart, Pie, Cell, Legend
} from 'recharts';

// Feltételezett importok a projekt struktúrájából
import { useLanguage } from '../../contexts/LanguageContext';
import { useData } from '../../contexts/DataContext';
import { Transaction, TransactionPeriod } from '../../types/planner';
import { AVAILABLE_CURRENCIES } from '../../constants/currencyData';
import { CurrencyService } from '../../services/CurrencyService';

const BudgetView: React.FC = () => {
  const { t, language } = useLanguage();
  const { transactions = [], addTransaction, updateTransaction, deleteTransaction } = useData();

  // --- Állapotkezelés (State) ---
  const [currency, setCurrency] = useState<string>('USD');
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'planning'>('overview');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedStat, setSelectedStat] = useState<{ title: string; breakdown: Record<string, number>; rect: DOMRect } | null>(null);
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('expense');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  
  // Konverter állapotok
  const [showConverter, setShowConverter] = useState(false);
  const [convAmount, setConvAmount] = useState('100');
  const [convFrom, setConvFrom] = useState('EUR');
  const [convTo, setConvTo] = useState('USD');
  
  // PhD Level: Multi-select törlés állapotok
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<'selected' | 'all' | 'period' | null>(null);
  const [deletePeriodFilter, setDeletePeriodFilter] = useState<TransactionPeriod | 'all'>('all');

  // Új tranzakció űrlap állapot
  const [newTransaction, setNewTransaction] = useState({
    description: '',
    amount: '',
    category: 'other',
    currency: currency,
    period: 'oneTime' as TransactionPeriod,
    date: new Date().toISOString().split('T')[0],
    recurring: false,
    interestRate: ''
  });

  // PhD Level: Azonnali egyenleg módosítás kapcsoló (Ismétlődő tételeknél)
  const [addToBalanceImmediately, setAddToBalanceImmediately] = useState(true);

  // Árfolyam forrás (System / AI / API)
  const [rateSource, setRateSource] = useState<'system' | 'ai' | 'api'>('system');

  // --- Segédfüggvények és Formázók ---

  // Biztonságos konverzió, hogy ne omoljon össze a UI hiányzó árfolyam esetén
  const safeConvert = useCallback((amount: number, fromCurrency: string, toCurrency: string): number => {
    if (!amount) return 0;
    if (fromCurrency === toCurrency) return amount;
    
    try {
      // Biztosítjuk, hogy valid kódokat kapjon a service
      const validFrom = fromCurrency || 'USD';
      const validTo = toCurrency || 'USD';
      return CurrencyService.convert(amount, validFrom, validTo);
    } catch (error) {
      console.warn(`Currency conversion warning (${fromCurrency} -> ${toCurrency}):`, error);
      return amount; // Fallback az eredeti összegre hiba esetén, hogy ne legyen NaN
    }
  }, []);

  const parsedConvAmount = useMemo(() => {
    const val = parseFloat((convAmount || '0').replace(/,/g, '.'));
    return isNaN(val) ? 0 : val;
  }, [convAmount]);

  // Árfolyamok lekérése induláskor
  useEffect(() => {
    let mounted = true;
    const initRates = async () => {
      try {
        await CurrencyService.fetchRealTimeRates();
        if (mounted) {
          setRateSource(CurrencyService.getUpdateSource());
        }
      } catch (e) {
        console.warn('Failed to fetch initial rates:', e);
      }
    };
    initRates();
    return () => { mounted = false; };
  }, []);

  // Űrlap pénznemének frissítése, ha a nézet pénzneme változik
  useEffect(() => {
    setNewTransaction(prev => {
      if (!prev.currency) {
        return { ...prev, currency: currency };
      }
      return prev;
    });
  }, [currency]);

  const formatMoney = useCallback((amount: number, currencyOverride?: string) => {
    const safeAmount = isNaN(amount) ? 0 : amount;
    return new Intl.NumberFormat(language === 'hu' ? 'hu-HU' : 'en-US', {
      style: 'currency',
      currency: currencyOverride || currency,
      maximumFractionDigits: 2
    }).format(safeAmount);
  }, [language, currency]);

  const formatDate = useCallback((date: Date | string) => {
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat(language === 'hu' ? 'hu-HU' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(d);
  }, [language]);

  const CATEGORIES = useMemo(() => ({
    software: { color: '#4361ee', label: t('budget.software') || 'Software' },
    marketing: { color: '#a855f7', label: t('budget.marketing') || 'Marketing' },
    office: { color: '#06b6d4', label: t('budget.office') || 'Office' },
    travel: { color: '#f59e0b', label: t('budget.travel') || 'Travel' },
    service: { color: '#10b981', label: t('budget.service') || 'Service' },
    freelance: { color: '#3b82f6', label: t('budget.freelance') || 'Freelance' },
    other: { color: '#9ca3af', label: t('budget.other') || 'Other' }
  }), [t]);

  // Konverzió előnézet számítás
  const conversionPreview = useMemo(() => {
    if (!newTransaction.amount || newTransaction.currency === currency) return null;
    const sanitized = newTransaction.amount.replace(/,/g, '.');
    const amount = parseFloat(sanitized);
    if (isNaN(amount)) return null;

    const converted = safeConvert(amount, newTransaction.currency, currency);
    return `≈ ${formatMoney(converted)} (${t('budget.estimated')})`;
  }, [newTransaction.amount, newTransaction.currency, currency, formatMoney, t, safeConvert]);

  // --- Budget Core Logika ---

  const toDateSafe = (d: Date | string | number) => {
    const dt = d instanceof Date ? d : new Date(d);
    return Number.isNaN(dt.getTime()) ? null : dt;
  };

  const endOfToday = () => {
    const now = new Date();
    now.setHours(23, 59, 59, 999);
    return now;
  };

  const ensureCurrency = (c?: string) => (c && c.trim() ? c : 'USD');

  const absToView = useCallback((amount: number, fromCurrency: string) => {
    const abs = Math.abs(amount);
    return safeConvert(abs, ensureCurrency(fromCurrency), currency);
  }, [currency, safeConvert]);

  // Biztonságos típusellenőrzés
  const isMaster = (tr: Transaction) => (tr as any).kind === 'master';

  const isFuture = (tr: Transaction, now: Date) => {
    const dt = toDateSafe(tr.date as any);
    if (!dt) return false;
    return dt.getTime() > now.getTime();
  };

  const sumByType = useCallback((txs: Transaction[], type: 'income' | 'expense') => {
    if (!txs || txs.length === 0) return 0;
    return txs
      .filter(tr => tr.type === type)
      .reduce((acc, tr) => {
        const from = ensureCurrency((tr as any).currency);
        return acc + absToView(tr.amount, from);
      }, 0);
  }, [absToView]);

  // Összesítések számítása (UseMemo)
  const { totalIncome, totalExpense, balance } = useMemo(() => {
    // Ha nincs tranzakció, ne számoljunk feleslegesen
    if (!transactions || transactions.length === 0) {
        return { totalIncome: 0, totalExpense: 0, balance: 0 };
    }

    const now = endOfToday();

    // 1) VOLUME: összes tranzakció, kivéve master sablonok
    const volumeTx = transactions.filter(tr => !isMaster(tr));

    const income = sumByType(volumeTx, 'income');
    const expense = sumByType(volumeTx, 'expense');

    // 2) CASH-IN-HAND: kivéve master és jövőbeli tételek
    const cashTx = transactions.filter(tr => !isMaster(tr) && !isFuture(tr, now));

    const cashIncome = sumByType(cashTx, 'income');
    const cashExpense = sumByType(cashTx, 'expense');

    return {
      totalIncome: income,
      totalExpense: expense,
      balance: cashIncome - cashExpense
    };
  }, [transactions, sumByType]); // currency benne van a sumByType-ban

  // Részletezés segéd (breakdown)
  const getTransactionAmountsByCurrency = (type: 'income' | 'expense') => {
    const result: Record<string, number> = {};
    if (!transactions) return result;
    
    transactions
      .filter(tr => tr.type === type)
      .filter(tr => !isMaster(tr))
      .forEach(tr => {
        const trCurrency = (tr as any).currency || 'USD';
        const amount = Math.abs(tr.amount);
        result[trCurrency] = (result[trCurrency] || 0) + amount;
      });
    return result;
  };

  // --- Grafikon Adatok ---

  const categoryData = useMemo(() => {
    if (!transactions) return [];
    
    const expensesByCategory: Record<string, number> = {};
    transactions
      .filter(tr => tr.type === 'expense' && !isMaster(tr))
      .forEach(tr => {
        const amount = Math.abs(tr.amount);
        const trCurrency = (tr as any).currency || 'USD';
        const converted = safeConvert(amount, trCurrency, currency);
        expensesByCategory[tr.category] = (expensesByCategory[tr.category] || 0) + converted;
      });

    return Object.entries(expensesByCategory).map(([cat, val]) => ({
      name: (CATEGORIES as any)[cat]?.label || cat,
      value: val,
      color: (CATEGORIES as any)[cat]?.color || '#9ca3af'
    }));
  }, [transactions, CATEGORIES, currency, safeConvert]);

  const cashFlowData = useMemo(() => {
    const monthNames = [
      t('months.january') || 'Jan', t('months.february') || 'Feb', t('months.march') || 'Mar',
      t('months.april') || 'Apr', t('months.may') || 'May', t('months.june') || 'Jun',
      t('months.july') || 'Jul', t('months.august') || 'Aug', t('months.september') || 'Sep',
      t('months.october') || 'Oct', t('months.november') || 'Nov', t('months.december') || 'Dec'
    ];

    const now = new Date();
    const eod = endOfToday();
    const monthsData: { name: string; income: number; expense: number }[] = [];

    // Ha nincs tranzakció, üres adatstruktúra
    if (!transactions || transactions.length === 0) return [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthIdx = date.getMonth();
      const year = date.getFullYear();
      const monthName = monthNames[monthIdx] ? monthNames[monthIdx].slice(0, 3) : `M${monthIdx + 1} `;

      let income = 0;
      let expense = 0;

      transactions.forEach(tr => {
        if (isMaster(tr)) return;
        const trDate = new Date(tr.date);

        // Csak a már megtörtént tranzakciók a CashFlow grafikonon
        if (trDate.getTime() > eod.getTime()) return;

        if (trDate.getMonth() === monthIdx && trDate.getFullYear() === year) {
          const amount = Math.abs(tr.amount);
          const trCurrency = (tr as any).currency || 'USD';
          const converted = safeConvert(amount, trCurrency, currency);

          if (tr.type === 'income') {
            income += converted;
          } else {
            expense += converted;
          }
        }
      });

      monthsData.push({ name: monthName, income, expense });
    }

    const hasData = monthsData.some(m => m.income > 0 || m.expense > 0);
    if (!hasData) return monthsData;
    return monthsData;
  }, [transactions, t, currency, safeConvert]);

  // --- Kezelők (Handlers) ---

  const handleAddTransaction = () => {
    if (!newTransaction.description || !newTransaction.amount) return;

    const sanitizedAmount = newTransaction.amount.replace(/,/g, '.');
    const amount = parseFloat(sanitizedAmount);

    if (isNaN(amount)) {
      alert("Kérlek adj meg egy érvényes számot!");
      return;
    }

    const isRecurring = newTransaction.period !== 'oneTime';
    let transactionDate = new Date(newTransaction.date);

    // Ha nem adjuk hozzá azonnal az egyenleghez (csak ismétlődőnél), eltoljuk a kezdő dátumot
    if (isRecurring && !addToBalanceImmediately && !editingTransaction) {
      switch (newTransaction.period) {
        case 'daily': transactionDate.setDate(transactionDate.getDate() + 1); break;
        case 'weekly': transactionDate.setDate(transactionDate.getDate() + 7); break;
        case 'monthly': transactionDate.setMonth(transactionDate.getMonth() + 1); break;
        case 'yearly': transactionDate.setFullYear(transactionDate.getFullYear() + 1); break;
      }
    }

    const transactionPayload = {
      description: newTransaction.description,
      amount: transactionType === 'expense' ? -Math.abs(amount) : Math.abs(amount),
      category: newTransaction.category,
      type: transactionType,
      currency: newTransaction.currency,
      date: transactionDate.toISOString().split('T')[0],
      period: newTransaction.period,
      recurring: isRecurring,
      kind: isRecurring ? 'master' as const : undefined,
      interestRate: parseFloat(newTransaction.interestRate.replace(/,/g, '.')) || undefined
    };

    if (editingTransaction) {
      updateTransaction(editingTransaction.id, transactionPayload);
    } else {
      addTransaction(transactionPayload);
    }

    try {
      setNewTransaction({
        description: '',
        amount: '',
        category: 'other',
        currency: currency,
        period: 'oneTime',
        date: new Date().toISOString().split('T')[0],
        recurring: false,
        interestRate: ''
      });
      setAddToBalanceImmediately(true);
      setEditingTransaction(null);
      setShowAddModal(false);
    } catch (e) {
      console.error('Error in handleAddTransaction reset:', e);
      alert('Hiba történt a mentés során. Kérlek próbáld újra!');
    }
  };

  // Tranzakció lista szűrése
  const filteredTransactions = (filterCategory === 'all'
    ? (transactions || [])
    : (transactions || []).filter(tr => tr.category === filterCategory))
    .filter(tr => !isMaster(tr));

  const getPeriodLabel = (period: TransactionPeriod = 'oneTime') => {
    const labels: Record<TransactionPeriod, string> = {
      daily: t('budget.daily') || 'Daily',
      weekly: t('budget.weekly') || 'Weekly',
      monthly: t('budget.monthly') || 'Monthly',
      yearly: t('budget.yearly') || 'Yearly',
      oneTime: t('budget.oneTime') || 'One-time'
    };
    return labels[period] || period;
  };

  // --- PhD Level: Multi-select helpers ---
  const toggleTransactionSelection = (id: string) => {
    setSelectedTransactions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const selectAllTransactions = () => {
    setSelectedTransactions(new Set(filteredTransactions.map(t => t.id)));
  };

  const clearSelection = () => {
    setSelectedTransactions(new Set());
  };

  // Időszak alapú statisztika törléshez
  const periodCounts = useMemo(() => {
    const visibleTx = (transactions || []).filter(tr => !isMaster(tr));
    return {
      daily: visibleTx.filter(t => t.period === 'daily').length,
      weekly: visibleTx.filter(t => t.period === 'weekly').length,
      monthly: visibleTx.filter(t => t.period === 'monthly').length,
      yearly: visibleTx.filter(t => t.period === 'yearly').length,
      oneTime: visibleTx.filter(t => t.period === 'oneTime').length,
      all: visibleTx.length
    };
  }, [transactions]);

  // Tömeges törlés kezelők
  const handleDeleteSelected = () => {
    selectedTransactions.forEach(id => deleteTransaction(id));
    setSelectedTransactions(new Set());
    setShowDeleteConfirm(null);
  };

  const handleDeleteByPeriod = (period: TransactionPeriod | 'all') => {
    const visibleTx = (transactions || []).filter(tr => !isMaster(tr));
    if (period === 'all') {
      visibleTx.forEach(t => deleteTransaction(t.id));
    } else {
      visibleTx.filter(t => t.period === period).forEach(t => deleteTransaction(t.id));
    }
    setSelectedTransactions(new Set());
    setShowDeleteConfirm(null);
  };

  // --- Renderelés (JSX) ---

  return (
    <div className="view-container max-w-7xl mx-auto space-y-8 p-6">
      {/* Fejléc */}
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

        <div className="flex flex-wrap items-center gap-3">
          <select
            className="input-field w-auto font-bold text-gray-700 dark:text-gray-200 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-gray-200 dark:border-gray-700"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          >
            {AVAILABLE_CURRENCIES.map(c => (
              <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>
            ))}
          </select>
          <button
            onClick={() => setShowConverter(true)}
            className="btn-secondary flex items-center gap-2 px-4 py-2.5 bg-blue-500/10 text-blue-600 border-blue-200 hover:bg-blue-500/20"
            title={t('budget.converter') || 'Currency Converter'}
          >
            <RefreshCcw size={18} />
            <span className="hidden sm:inline">{t('budget.converter') || 'Currency Converter'}</span>
          </button>
          <button
            onClick={() => {
              setTransactionType('income');
              setEditingTransaction(null);
              setNewTransaction({
                description: '', amount: '', category: 'other', currency: currency,
                period: 'oneTime', date: new Date().toISOString().split('T')[0], recurring: false, interestRate: ''
              });
              setShowAddModal(true);
            }}
            className="btn-secondary flex items-center gap-2 px-4 py-2.5 bg-green-500/10 text-green-600 border-green-200 hover:bg-green-500/20"
          >
            <TrendingUp size={18} />
            <span>{t('budget.addIncome')}</span>
          </button>
          <button
            onClick={() => {
              setTransactionType('expense');
              setEditingTransaction(null);
              setNewTransaction({
                description: '', amount: '', category: 'other', currency: currency,
                period: 'oneTime', date: new Date().toISOString().split('T')[0], recurring: false, interestRate: ''
              });
              setShowAddModal(true);
            }}
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

      {/* Overview kártyák (Mindig látható) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
        {/* Balance Card */}
        <div className="card p-6 bg-gradient-to-br from-emerald-500 via-teal-500 to-teal-600 text-white shadow-xl shadow-emerald-500/20 hover:shadow-2xl hover:shadow-emerald-500/30 transition-all duration-300 hover:scale-[1.02] border border-emerald-400/20">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm font-medium opacity-90">{t('budget.balance')}</p>
              <h3 className="text-4xl font-bold mt-2 tracking-tight">{formatMoney(balance)}</h3>
            </div>
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm shadow-inner border border-white/10"><Wallet size={24} /></div>
          </div>
          <div className="text-sm opacity-90 flex items-center gap-1.5 font-medium bg-black/10 w-fit px-2 py-1 rounded-lg">
            {balance >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {balance >= 0 ? t('budget.profit') : t('budget.loss')}
            <span className="opacity-60 ml-1 text-xs font-normal">(Cash-in-hand)</span>
          </div>
        </div>

        {/* Income Card */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            const rect = e.currentTarget.getBoundingClientRect();
            const breakdown = getTransactionAmountsByCurrency('income');
            setSelectedStat({ title: t('budget.income'), breakdown, rect });
          }}
          className="card p-6 bg-gradient-to-br from-blue-500 via-indigo-500 to-indigo-600 text-white shadow-xl shadow-blue-500/20 hover:shadow-2xl hover:shadow-blue-500/30 transition-all duration-300 hover:scale-[1.02] text-left w-full group border border-blue-400/20"
        >
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm font-medium opacity-90 flex items-center gap-2">
                {t('budget.income')}
                <Search size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
              </p>
              <h3 className="text-3xl font-bold mt-2 tracking-tight">{formatMoney(totalIncome)}</h3>
            </div>
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm shadow-inner border border-white/10"><TrendingUp size={24} /></div>
          </div>
        </button>

        {/* Expense Card */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            const rect = e.currentTarget.getBoundingClientRect();
            const breakdown = getTransactionAmountsByCurrency('expense');
            setSelectedStat({ title: t('budget.expense'), breakdown, rect });
          }}
          className="card p-6 bg-gradient-to-br from-orange-500 via-red-500 to-rose-600 text-white shadow-xl shadow-orange-500/20 hover:shadow-2xl hover:shadow-orange-500/30 transition-all duration-300 hover:scale-[1.02] text-left w-full group border border-orange-400/20"
        >
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm font-medium opacity-90 flex items-center gap-2">
                {t('budget.expense')}
                <Search size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
              </p>
              <h3 className="text-3xl font-bold mt-2 tracking-tight">{formatMoney(totalExpense)}</h3>
            </div>
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm shadow-inner border border-white/10"><TrendingDown size={24} /></div>
          </div>
        </button>
      </div>

      {/* Tab Tartalom */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-slide-up">
          {/* Cash Flow Chart */}
          <div className="card lg:col-span-2 p-6 bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl border border-white/20 dark:border-gray-700/50 shadow-xl hover:shadow-2xl transition-all duration-300 rounded-3xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg text-white shadow-lg shadow-indigo-500/20">
                  <BarChart3 size={18} />
                </div>
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
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} opacity={0.5} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12, fontWeight: 500 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12, fontWeight: 500 }} tickFormatter={(value) => value >= 1000 ? `${value / 1000} k` : String(value)} />
                  <Tooltip
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.2)', backdropFilter: 'blur(12px)', backgroundColor: 'rgba(255,255,255,0.9)' }}
                    itemStyle={{ color: '#374151', fontWeight: 600 }}
                    formatter={(value: number) => formatMoney(value)}
                  />
                  <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" name={t('budget.income')} />
                  <Area type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorExpense)" name={t('budget.expense')} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Expense Breakdown */}
          <div className="card p-6 flex flex-col bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl border border-white/20 dark:border-gray-700/50 shadow-xl hover:shadow-2xl transition-all duration-300 rounded-3xl">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg text-white shadow-lg shadow-purple-500/20">
                  <PieChart size={18} />
                </div>
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
      )}

      {/* Transactions List - Transactions vagy Overview tabon */}
      {(activeTab === 'transactions' || activeTab === 'overview') && (
        <div className="card p-0 overflow-hidden border border-white/20 dark:border-gray-700/50 bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl shadow-xl hover:shadow-2xl transition-all duration-300 rounded-3xl animate-slide-up">
          {/* Header with title and filters */}
          <div className="p-6 border-b border-gray-100/50 dark:border-gray-700/50 flex flex-col gap-4 bg-white/40 dark:bg-gray-800/40">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Wallet size={20} className="text-emerald-500" />
                {t('budget.transactions')}
              </h3>
              <div className="flex gap-2 flex-wrap">
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="input-field text-sm py-2 px-4 pr-10 rounded-xl bg-white/50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700 focus:ring-emerald-500/50"
                >
                  <option value="all">{t('budget.filter')}: {t('budget.other')}</option>
                  {Object.entries(CATEGORIES).map(([key, val]) => (
                    <option key={key} value={key}>{val.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* PhD Level: Selection Toolbar */}
            {filteredTransactions.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 animate-in slide-in-from-top-2 duration-300">
                {/* Select All / Clear */}
                {selectedTransactions.size > 0 ? (
                  <button
                    onClick={clearSelection}
                    className="px-3 py-1.5 text-sm font-medium rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
                  >
                    <X size={14} />
                    Mégse ({selectedTransactions.size})
                  </button>
                ) : (
                  <button
                    onClick={selectAllTransactions}
                    className="px-3 py-1.5 text-sm font-medium rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
                  >
                    <CheckSquare size={14} />
                    Összes
                  </button>
                )}

                {/* Delete Selected */}
                {selectedTransactions.size > 0 && (
                  <button
                    onClick={() => setShowDeleteConfirm('selected')}
                    className="px-3 py-1.5 text-sm font-bold rounded-xl bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-lg shadow-red-500/25 hover:shadow-xl hover:shadow-red-500/30 transition-all flex items-center gap-2"
                  >
                    <Trash2 size={14} />
                    Törlés ({selectedTransactions.size})
                  </button>
                )}

                {/* Divider */}
                <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-2" />

                {/* Period-based delete buttons */}
                <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Gyors törlés:</span>
                {(['daily', 'weekly', 'monthly', 'yearly', 'oneTime'] as TransactionPeriod[]).map(period => (
                  periodCounts[period] > 0 && (
                    <button
                      key={period}
                      onClick={() => {
                        setDeletePeriodFilter(period);
                        setShowDeleteConfirm('period');
                      }}
                      className="px-2.5 py-1 text-xs font-medium rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors"
                    >
                      {getPeriodLabel(period)} ({periodCounts[period]})
                    </button>
                  )
                ))}
                {(periodCounts.all > 0) && (
                  <button
                    onClick={() => {
                      setDeletePeriodFilter('all');
                      setShowDeleteConfirm('all');
                    }}
                    className="px-2.5 py-1 text-xs font-bold rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 hover:bg-red-100 hover:text-red-700 transition-colors ml-2"
                  >
                    ÖSSZES ({periodCounts.all})
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="divide-y divide-gray-100/50 dark:divide-gray-800/50 max-h-[600px] overflow-y-auto custom-scrollbar">
            {filteredTransactions.length === 0 ? (
              <div className="p-16 text-center text-gray-400">
                <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Wallet size={32} className="opacity-50" />
                </div>
                <p className="text-lg font-medium">{t('budget.noTransactions')}</p>
                <p className="text-sm opacity-60">Adj hozzá bevételeket vagy kiadásokat a fenti gombokkal.</p>
              </div>
            ) : (
              filteredTransactions.map((tr) => (
                <div
                  key={tr.id}
                  onClick={() => {
                    setTransactionType(tr.type as 'income' | 'expense');
                    setEditingTransaction(tr);
                    setNewTransaction({
                      description: tr.description,
                      amount: Math.abs(tr.amount).toString(),
                      category: tr.category,
                      currency: (tr as any).currency || currency,
                      period: tr.period as TransactionPeriod,
                      date: new Date(tr.date).toISOString().split('T')[0],
                      recurring: tr.recurring || false,
                      interestRate: tr.interestRate?.toString() || ''
                    });
                    setAddToBalanceImmediately(true);
                    setShowAddModal(true);
                  }}
                  className={`p-4 flex items-center justify-between hover:bg-gray-50/80 dark:hover:bg-gray-700/30 transition-all duration-200 group cursor-pointer border-l-4 ${selectedTransactions.has(tr.id)
                    ? 'bg-blue-50/50 dark:bg-blue-900/10 border-l-blue-500'
                    : 'border-l-transparent hover:border-l-indigo-300 dark:hover:border-l-indigo-700'
                    }`}
                >
                  <div className="flex items-center gap-4">
                    {/* PhD Level: Selection Checkbox */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTransactionSelection(tr.id);
                      }}
                      className={`p-2 rounded-lg transition-all ${selectedTransactions.has(tr.id)
                        ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30 scale-110'
                        : 'text-gray-300 hover:text-blue-500 scale-100 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                        }`}
                    >
                      {selectedTransactions.has(tr.id) ? <CheckSquare size={18} /> : <Square size={18} />}
                    </button>

                    <div className={`p-3 rounded-2xl shadow-sm ${tr.type === 'income'
                      ? 'bg-green-100/50 text-green-600 dark:bg-green-900/20'
                      : 'bg-red-100/50 text-red-600 dark:bg-red-900/20'
                      }`}>
                      {tr.type === 'income' ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white text-base mb-1">{tr.description}</h4>
                      <div className="flex items-center gap-2 text-sm text-gray-500 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-md text-[10px] uppercase font-bold tracking-wider shadow-sm" style={{ backgroundColor: (CATEGORIES as any)[tr.category]?.color + '15', color: (CATEGORIES as any)[tr.category]?.color }}>
                          {(CATEGORIES as any)[tr.category]?.label || tr.category}
                        </span>
                        <span className="text-gray-300">•</span>
                        <span>{formatDate(tr.date)}</span>
                        <span className="text-gray-300">•</span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] uppercase font-bold tracking-wider bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                          {getPeriodLabel(tr.period)}
                        </span>
                        {tr.recurring && <span className="flex items-center gap-1 text-purple-600 bg-purple-50 dark:bg-purple-900/20 px-1.5 rounded ml-1"><Repeat size={12} /></span>}
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-4">
                    <span className={`text-xl font-bold block ${tr.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-700 dark:text-gray-300'}`}>
                      {tr.type === 'income' ? '+' : '−'}{formatMoney(Math.abs(tr.amount), (tr as any).currency)}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteTransaction(tr.id);
                      }}
                      className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl"
                      title="Törlés"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

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
                  value={newTransaction.description}
                  onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })}
                  className="input-field w-full"
                  placeholder={transactionType === 'income' ? t('budget.exampleIncome') : t('budget.exampleExpense')}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('budget.amount')}
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={newTransaction.amount}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (/^[0-9.,]*$/.test(val)) {
                        setNewTransaction({ ...newTransaction, amount: val });
                      }
                    }}
                    className="input-field w-full"
                    placeholder="0"
                  />
                  {conversionPreview && (
                    <p className="text-xs text-blue-500 mt-1 font-medium">{conversionPreview}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Pénznem
                  </label>
                  <select
                    value={newTransaction.currency}
                    onChange={(e) => setNewTransaction({ ...newTransaction, currency: e.target.value })}
                    className="input-field w-full appearance-none"
                  >
                    {AVAILABLE_CURRENCIES.map(c => (
                      <option key={c.code} value={c.code}>
                        {c.code} ({c.symbol})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Rate Source Warning */}
              {newTransaction.currency !== currency && (
                <div className={`mt-2 p-3 rounded-lg text-sm flex items-center gap-3 ${rateSource === 'system'
                  ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 border border-red-100 dark:border-red-800'
                  : 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 border border-green-100 dark:border-green-800'
                  }`}>
                  {rateSource === 'system' ? (
                    <>
                      <div className="p-1.5 bg-red-100 dark:bg-red-900/50 rounded-full">⚠️</div>
                      <div className="flex-1">
                        <div className="font-bold">Ez nem a mai napi árfolyam!</div>
                        <div className="text-xs opacity-90">Ez egy becsült árfolyam. A pontos adatokhoz állítsd be az AI API-t a beállításokban.</div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="p-1.5 bg-green-100 dark:bg-green-900/50 rounded-full">✅</div>
                      <div className="flex-1">
                        <div className="font-bold">Mai árfolyam (AI)</div>
                        <div className="text-xs opacity-90">Frissítve: {new Date().toLocaleDateString()}</div>
                      </div>
                    </>
                  )}
                </div>
              )}

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
                    onChange={(e) => {
                      const period = e.target.value as TransactionPeriod;
                      setNewTransaction({
                        ...newTransaction,
                        period: period,
                        recurring: period !== 'oneTime'
                      });
                      setAddToBalanceImmediately(period === 'oneTime');
                    }}
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

              {/* PhD Level: Add to Balance Checkbox for Recurring Items */}
              {newTransaction.period !== 'oneTime' && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
                  <button
                    onClick={() => setAddToBalanceImmediately(!addToBalanceImmediately)}
                    className={`p-2 rounded-lg transition-all ${addToBalanceImmediately
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                      : 'bg-white dark:bg-gray-800 text-gray-400 hover:text-blue-500 border border-gray-200 dark:border-gray-700'
                      }`}
                  >
                    {addToBalanceImmediately ? <CheckSquare size={18} /> : <Square size={18} />}
                  </button>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                      Hozzáadás az egyenleghez most
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {addToBalanceImmediately
                        ? "Az első részletet azonnal levonja/hozzáadja."
                        : `Az első részlet csak egy ${getPeriodLabel(newTransaction.period).toLowerCase()} múlva lesz esedékes.`
                      }
                    </p>
                  </div>
                </div>
              )}

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

              {/* PhD: Interest Rate Row */}
              <div>
                <label className="block text-sm font-medium text-purple-600 dark:text-purple-400 mb-1 flex items-center gap-2">
                  <TrendingUp size={14} />
                  Éves kamatláb (%) — PhD Szint
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={newTransaction.interestRate}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (/^[0-9.,]*$/.test(val)) {
                      setNewTransaction({ ...newTransaction, interestRate: val });
                    }
                  }}
                  className="input-field w-full border-purple-100 dark:border-purple-900 focus:ring-purple-500"
                  placeholder="0.00"
                />
                <p className="text-[10px] text-gray-500 mt-1">
                  Ha megadsz kamatot, az AI ezzel számol az elkövetkező évekre.
                </p>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowAddModal(false)} className="btn-secondary flex-1">
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleAddTransaction}
                  className={`flex-1 flex items-center justify-center gap-2 ${transactionType === 'income'
                    ? 'btn-primary bg-green-600 hover:bg-green-700'
                    : 'btn-primary'
                    }`}
                >
                  <Check size={18} />
                  {t('budget.saveTransaction')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Breakdown Popover */}
      {selectedStat && (
        <>
          <div
            className="fixed inset-0 z-[100]"
            onClick={() => setSelectedStat(null)}
          />
          <div
            className="fixed z-[101] bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 p-4 min-w-[280px] animate-in fade-in zoom-in-95 duration-200"
            style={{
              top: selectedStat.rect.bottom + 10,
              left: Math.min(selectedStat.rect.left, window.innerWidth - 300)
            }}
          >
            <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-100 dark:border-gray-700">
              <h4 className="font-bold text-gray-900 dark:text-white">{selectedStat.title} Részletezése</h4>
              <button onClick={() => setSelectedStat(null)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3">
              {Object.entries(selectedStat.breakdown).map(([curr, amount]) => (
                <div key={curr} className="flex justify-between items-center">
                  <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">{curr}</span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    {new Intl.NumberFormat(language === 'hu' ? 'hu-HU' : 'en-US', {
                      style: 'currency',
                      currency: curr,
                      maximumFractionDigits: 0
                    }).format(amount)}
                  </span>
                </div>
              ))}
              {Object.keys(selectedStat.breakdown).length === 0 && (
                <div className="text-center text-sm text-gray-400 py-2">
                  Nincs adat.
                </div>
              )}
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-400">
                Az átváltási árfolyamokat a Beállítások menüben módosíthatod.
              </p>
            </div>
          </div>
        </>
      )}

      {/* Currency Converter Modal */}
      {showConverter && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-md shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden transform animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-blue-500/5 to-indigo-500/5">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <RefreshCcw size={20} className="text-blue-500" />
                  Valutaváltó (Any-to-Any)
                </h3>
                <button
                  onClick={() => setShowConverter(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-gray-400 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Számolj át bármilyen pénznemet bármilyenre real-time.
              </p>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Összeg</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={convAmount}
                  onChange={(e) => {
                    if (/^[0-9.,]*$/.test(e.target.value)) {
                      setConvAmount(e.target.value);
                    }
                  }}
                  className="input-field w-full text-lg font-bold"
                  placeholder="0.00"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 items-center">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Ebből</label>
                  <select
                    value={convFrom}
                    onChange={(e) => setConvFrom(e.target.value)}
                    className="input-field w-full py-3"
                  >
                    {AVAILABLE_CURRENCIES.map(c => (
                      <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-center pt-6">
                  <button
                    onClick={() => {
                      const temp = convFrom;
                      setConvFrom(convTo);
                      setConvTo(temp);
                    }}
                    className="p-3 bg-gray-100 dark:bg-gray-800 rounded-2xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all active:scale-95 text-gray-600 dark:text-gray-400"
                  >
                    <Repeat size={20} />
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Ebbe</label>
                  <select
                    value={convTo}
                    onChange={(e) => setConvTo(e.target.value)}
                    className="input-field w-full py-3"
                  >
                    {AVAILABLE_CURRENCIES.map(c => (
                      <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Result Card */}
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-6 rounded-3xl text-white shadow-xl shadow-blue-500/20">
                <div className="text-sm opacity-80 mb-1">Eredmény ({convTo}):</div>
                <div className="text-3xl font-black">
                  {new Intl.NumberFormat(language === 'hu' ? 'hu-HU' : 'en-US', {
                    style: 'currency',
                    currency: convTo,
                    maximumFractionDigits: 2
                  }).format(safeConvert(parsedConvAmount, convFrom, convTo))}
                </div>
                <div className="mt-3 flex items-center justify-between text-xs opacity-70">
                  <span>1 {convFrom} ≈ {safeConvert(1, convFrom, convTo).toFixed(4)} {convTo}</span>
                  <div className="flex items-center gap-1">
                    {rateSource === 'system' ? '⚠️ Becsült' : '✅ Friss'}
                  </div>
                </div>
              </div>

              {/* Live Update Button */}
              <div className="flex justify-center">
                <button
                  onClick={async () => {
                    const btn = document.getElementById('live-refresh-btn');
                    if (btn) {
                      btn.textContent = 'Frissítés...';
                      btn.setAttribute('disabled', 'true');
                    }

                    await CurrencyService.fetchRealTimeRates(true);
                    setRateSource(CurrencyService.getUpdateSource());

                    if (btn) {
                      btn.textContent = 'Valós idejű árfolyamok lekérése (API)';
                      btn.removeAttribute('disabled');
                    }
                  }}
                  id="live-refresh-btn"
                  className="text-xs text-blue-500 dark:text-blue-400 font-medium hover:underline flex items-center gap-1"
                >
                  <RefreshCcw size={12} />
                  Frissítés valós idejű adatokkal (API)
                </button>
              </div>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800">
              <button
                onClick={() => setShowConverter(false)}
                className="btn-primary w-full py-3 rounded-2xl"
              >
                Bezárás
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PhD Level: Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6 m-4 animate-slide-up border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-600">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Törlés megerősítése
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {showDeleteConfirm === 'selected' && `${selectedTransactions.size} kijelölt tranzakció törlése`}
                  {showDeleteConfirm === 'period' && deletePeriodFilter !== 'all' && `Összes "${getPeriodLabel(deletePeriodFilter as TransactionPeriod)}" típusú tranzakció törlése (${periodCounts[deletePeriodFilter as keyof typeof periodCounts]} db)`}
                  {(showDeleteConfirm === 'all' || (showDeleteConfirm === 'period' && deletePeriodFilter === 'all')) && `ÖSSZES tranzakció törlése (${periodCounts.all} db)`}
                </p>
              </div>
            </div>

            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl mb-6 border border-red-100 dark:border-red-800">
              <p className="text-sm text-red-700 dark:text-red-300 font-medium">
                ⚠️ Ez a művelet nem vonható vissza! A törölt tranzakciók véglegesen elvesznek.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 px-4 py-3 rounded-xl font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Mégsem
              </button>
              <button
                onClick={() => {
                  if (showDeleteConfirm === 'selected') {
                    handleDeleteSelected();
                  } else if (showDeleteConfirm === 'period') {
                    handleDeleteByPeriod(deletePeriodFilter);
                  } else if (showDeleteConfirm === 'all') {
                    handleDeleteByPeriod('all');
                  }
                }}
                className="flex-1 px-4 py-3 rounded-xl font-bold bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-lg shadow-red-500/25 hover:shadow-xl hover:shadow-red-500/30 transition-all flex items-center justify-center gap-2"
              >
                <Trash2 size={18} />
                Törlés
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BudgetView;