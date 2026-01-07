import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Plus, TrendingUp, TrendingDown, Trash2, X, Repeat, Wallet, BarChart3,
  Check, RefreshCcw, PieChart, ArrowUpRight, ArrowDownRight, CheckSquare,
  Square, AlertTriangle, Search, Zap, CalendarRange
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPieChart, Pie, Cell, Legend
} from 'recharts';
import { useBudgetAnalytics } from './useBudgetAnalytics';

// Feltételezett importok a projekt struktúrájából
import { useLanguage } from '../../contexts/LanguageContext';
import { useData } from '../../contexts/DataContext';
import { Transaction, TransactionPeriod } from '../../types/planner';
import { AVAILABLE_CURRENCIES } from '../../constants/currencyData';
import { CurrencyService } from '../../services/CurrencyService';
import { parseMoneyInput } from '../../utils/numberUtils';

// (A) RectLike: Serializable replacement for DOMRect in React state
type RectLike = { top: number; left: number; right: number; bottom: number; width: number; height: number };

function toRectLike(el: Element | null): RectLike | null {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
}

// (C) Timezone-safe date helpers using YYYY-MM-DD strings only
function parseYMD(ymd: string): { y: number; m: number; d: number } {
  const [y, m, d] = ymd.split('-').map(Number);
  return { y, m, d }; // m is 1-12
}
function formatYMD(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
function daysInMonth(y: number, m: number): number {
  return new Date(y, m, 0).getDate(); // m is 1-12
}
function addDaysYMD(ymd: string, days: number): string {
  const { y, m, d } = parseYMD(ymd);
  const dt = new Date(y, m - 1, d + days);
  return formatYMD(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
}
function addWeeksYMD(ymd: string, weeks: number): string {
  return addDaysYMD(ymd, weeks * 7);
}
function addMonthsClampedYMD(ymd: string, months: number): string {
  const { y, m, d } = parseYMD(ymd);
  let newM = m + months;
  let newY = y + Math.floor((newM - 1) / 12);
  newM = ((newM - 1) % 12) + 1;
  if (newM <= 0) { newM += 12; newY--; }
  const maxD = daysInMonth(newY, newM);
  return formatYMD(newY, newM, Math.min(d, maxD));
}
function addYearsClampedYMD(ymd: string, years: number): string {
  const { y, m, d } = parseYMD(ymd);
  const newY = y + years;
  const maxD = daysInMonth(newY, m);
  return formatYMD(newY, m, Math.min(d, maxD));
}

const BudgetView: React.FC = () => {
  const { t, language } = useLanguage();
  const { transactions = [], addTransaction, updateTransaction, deleteTransaction, deleteTransactions } = useData();

  // (3) Type Safety: CategoryKey type
  type CategoryKey = 'software' | 'marketing' | 'office' | 'travel' | 'service' | 'freelance' | 'other';
  const isCategoryKey = (v: string): v is CategoryKey =>
    ['software', 'marketing', 'office', 'travel', 'service', 'freelance', 'other'].includes(v);

  // (2) Performance: Formatter cache for different currencies
  const formatterCache = useMemo(() => new Map<string, Intl.NumberFormat>(), []);
  const getFormatter = useCallback((currencyCode: string): Intl.NumberFormat => {
    const key = `${language}-${currencyCode}`;
    if (!formatterCache.has(key)) {
      formatterCache.set(key, new Intl.NumberFormat(language === 'hu' ? 'hu-HU' : 'en-US', {
        style: 'currency',
        currency: currencyCode,
        maximumFractionDigits: 2
      }));
    }
    return formatterCache.get(key)!;
  }, [language, formatterCache]);

  // --- Állapotkezelés (State) ---
  const [currency, setCurrency] = useState<string>('USD');
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'planning'>('overview');
  const [showAddModal, setShowAddModal] = useState(false);
  // (A) Use RectLike instead of DOMRect for serializable state
  const [selectedStat, setSelectedStat] = useState<{ title: string; breakdown: Record<string, number>; rect: RectLike } | null>(null);
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('expense');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
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

  // (B) Show Masters toggle - controls visibility of master templates in the list
  const [showMasters, setShowMasters] = useState(false);
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
  const [isRefreshingRates, setIsRefreshingRates] = useState(false);

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
      return 0; // PhD Fix: Return 0 instead of original amount to prevent massive value distortions (e.g. 100 HUF != 100 USD)
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
    // BUG FIX (A): Prevent overwriting transaction currency if we are editing!
    if (editingTransaction) return;

    setNewTransaction(prev => {
      if (!prev.currency) {
        return { ...prev, currency: currency };
      }
      return prev;
    });
  }, [currency, editingTransaction]);

  // (2) Performance: Use cached formatter
  const formatMoney = useCallback((amount: number, currencyOverride?: string) => {
    const safeAmount = isNaN(amount) ? 0 : amount;
    const currCode = currencyOverride || currency;
    return getFormatter(currCode).format(safeAmount);
  }, [currency, getFormatter]);

  // (1) Timezone-safe date parsing: "YYYY-MM-DD" strings should not shift
  const parseLocalDate = useCallback((date: Date | string): Date | null => {
    if (date instanceof Date) return date;
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const [y, m, d] = date.split('-').map(Number);
      return new Date(y, m - 1, d); // Local time, no UTC shift
    }
    const parsed = new Date(date);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }, []);

  const formatDate = useCallback((date: Date | string) => {
    const d = parseLocalDate(date);
    if (!d) return '—';
    return new Intl.DateTimeFormat(language === 'hu' ? 'hu-HU' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(d);
  }, [language, parseLocalDate]);

  const CATEGORIES = useMemo(() => ({
    software: { color: '#4361ee', label: t('budget.software') || 'Software' },
    marketing: { color: '#a855f7', label: t('budget.marketing') || 'Marketing' },
    office: { color: '#06b6d4', label: t('budget.office') || 'Office' },
    travel: { color: '#f59e0b', label: t('budget.travel') || 'Travel' },
    service: { color: '#10b981', label: t('budget.service') || 'Service' },
    freelance: { color: '#3b82f6', label: t('budget.freelance') || 'Freelance' },
    other: { color: '#9ca3af', label: t('budget.other') || 'Other' }
  }), [language, t]);

  // Konverzió előnézet számítás
  const conversionPreview = useMemo(() => {
    if (!newTransaction.amount || newTransaction.currency === currency) return null;
    const sanitized = newTransaction.amount.replace(/,/g, '.');
    const amount = parseFloat(sanitized);
    if (isNaN(amount)) return null;

    const converted = safeConvert(amount, newTransaction.currency, currency);
    return `≈ ${formatMoney(converted)} (${t('budget.estimated')})`;
  }, [newTransaction.amount, newTransaction.currency, currency, formatMoney, t, safeConvert]);

  const [projectionYears, setProjectionYears] = useState(1);

  // --- Budget Core Logic (E) Pure Hook Call ---
  const {
    totalIncome,
    totalExpense,
    balance,
    categoryTotals,
    cashFlowData: rawCashFlowData,
    projectionData: rawProjectionData
  } = useBudgetAnalytics(transactions, currency, safeConvert, projectionYears);

  // (E) Map categoryTotals to UI-ready categoryData with translated labels/colors
  const categoryData = useMemo(() => {
    return Object.entries(categoryTotals).map(([key, value]) => {
      const catKey = key as keyof typeof CATEGORIES;
      return {
        name: CATEGORIES[catKey]?.label ?? key,
        value,
        color: CATEGORIES[catKey]?.color ?? '#9ca3af',
      };
    });
  }, [categoryTotals, CATEGORIES]);

  // (E) Map raw cashFlowData to UI-ready format with translated month names
  const monthNames = useMemo(() => [
    t('months.january') || 'Jan', t('months.february') || 'Feb', t('months.march') || 'Mar',
    t('months.april') || 'Apr', t('months.may') || 'May', t('months.june') || 'Jun',
    t('months.july') || 'Jul', t('months.august') || 'Aug', t('months.september') || 'Sep',
    t('months.october') || 'Oct', t('months.november') || 'Nov', t('months.december') || 'Dec',
  ], [t]);

  const cashFlowData = useMemo(() => {
    return rawCashFlowData.map(d => ({
      name: monthNames[d.monthIndex]?.slice(0, 3) || `M${d.monthIndex + 1}`,
      income: d.income,
      expense: d.expense,
    }));
  }, [rawCashFlowData, monthNames]);

  const projectionData = useMemo(() => {
    return rawProjectionData.map(d => ({
      name: d.monthIndex !== null
        ? `${monthNames[d.monthIndex]?.slice(0, 3)} '${String(d.year).slice(2)}`
        : `${d.year}`,
      balance: d.balance,
      income: d.income,
      expense: d.expense,
    }));
  }, [rawProjectionData, monthNames]);

  // --- Kezelők (Handlers) ---

  const handleAddTransaction = () => {
    if (!newTransaction.description || !newTransaction.amount) return;

    // Dátum validáció (JAVÍTÁS: Critical Crash Fix)
    if (!newTransaction.date) {
      alert("Kérlek válassz dátumot!");
      return;
    }
    const dateCheck = new Date(newTransaction.date);
    if (isNaN(dateCheck.getTime())) {
      alert("Érvénytelen dátum formátum!");
      return;
    }

    const amount = parseMoneyInput(newTransaction.amount);

    if (amount === 0 && newTransaction.amount?.trim() !== '' && newTransaction.amount !== '0' && newTransaction.amount !== '0,00' && newTransaction.amount !== '0.00') {
      alert("Kérlek adj meg egy érvényes számot!");
      return;
    }

    const isRecurring = newTransaction.period !== 'oneTime';

    // JAVÍTÁS: Dátum kezelés időzóna elcsúszás nélkül
    // A stringet (pl "2023-01-01") közvetlenül használjuk
    const rawDateString = newTransaction.date;

    // Common payload props
    const basePayload = {
      description: newTransaction.description,
      amount: transactionType === 'expense' ? -Math.abs(amount) : Math.abs(amount),
      category: newTransaction.category,
      type: transactionType,
      currency: newTransaction.currency,
      interestRate: newTransaction.interestRate !== '' ? parseMoneyInput(newTransaction.interestRate) : undefined,
    };

    // Handling Logic
    if (editingTransaction) {
      updateTransaction(editingTransaction.id, {
        ...basePayload,
        date: rawDateString,
        period: newTransaction.period,
        recurring: isRecurring,
        kind: isRecurring ? 'master' : undefined
      });
    } else {
      // Create Mode
      if (isRecurring && addToBalanceImmediately) {
        // 1. Realized One-Time Transaction
        addTransaction({
          ...basePayload,
          description: `${basePayload.description}`,
          date: rawDateString,
          period: 'oneTime',
          recurring: false,
          kind: undefined
        });

        // 2. Master Template for Future Projections - (C) Using timezone-safe date helpers
        let nextDateStr: string;
        switch (newTransaction.period) {
          case 'daily': nextDateStr = addDaysYMD(rawDateString, 1); break;
          case 'weekly': nextDateStr = addWeeksYMD(rawDateString, 1); break;
          case 'monthly': nextDateStr = addMonthsClampedYMD(rawDateString, 1); break;
          case 'yearly': nextDateStr = addYearsClampedYMD(rawDateString, 1); break;
          default: nextDateStr = rawDateString;
        }

        addTransaction({
          ...basePayload,
          date: nextDateStr,
          period: newTransaction.period,
          recurring: true,
          kind: 'master'
        });

      } else if (isRecurring && !addToBalanceImmediately) {
        // Master starts NOW (Projected only)
        addTransaction({
          ...basePayload,
          date: rawDateString,
          period: newTransaction.period,
          recurring: true,
          kind: 'master'
        });
      } else {
        // Standard One-Time
        addTransaction({
          ...basePayload,
          date: rawDateString,
          period: 'oneTime',
          recurring: false,
          kind: undefined
        });
      }
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

  // (D) Optimized sorting: Only re-sort when transactions or showMasters changes
  const sortedTransactions = useMemo(() => {
    // (B) Respect showMasters: by default, hide master templates
    const base = showMasters
      ? (transactions || [])
      : (transactions || []).filter(tr => tr.kind !== 'master');
    return [...base].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, showMasters]);

  // (D) Filter on top of sorted list - no re-sorting on search/filter changes
  const filteredTransactions = useMemo(() => {
    let filtered = sortedTransactions;

    // Search
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter(tr => {
        const desc = (tr.description || '').toLowerCase();
        const amt = String(tr.amount || '');
        return desc.includes(lower) || amt.includes(lower);
      });
    }

    // Category filter
    if (filterCategory !== 'all') {
      filtered = filtered.filter(tr => tr.category === filterCategory);
    }

    return filtered;
  }, [sortedTransactions, searchTerm, filterCategory]);



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

  // (B) periodCounts respects showMasters visibility
  const periodCounts = useMemo(() => {
    const visibleTx = showMasters
      ? (transactions || [])
      : (transactions || []).filter(tr => tr.kind !== 'master');

    const counts = {
      daily: 0,
      weekly: 0,
      monthly: 0,
      yearly: 0,
      oneTime: 0,
      all: visibleTx.length
    };

    return visibleTx.reduce((acc, t) => {
      const p = t.period || 'oneTime';
      if (acc[p] !== undefined) {
        acc[p]++;
      }
      return acc;
    }, counts);
  }, [transactions, showMasters]);

  // Tömeges törlés kezelők (PhD Fix: Use Bulk Delete)
  const handleDeleteSelected = () => {
    if (deleteTransactions) {
      deleteTransactions(Array.from(selectedTransactions));
    } else {
      // Fallback if provider not ready
      selectedTransactions.forEach(id => deleteTransaction(id));
    }
    setSelectedTransactions(new Set());
    setShowDeleteConfirm(null);
  };

  // (B) handleDeleteByPeriod respects showMasters visibility
  const handleDeleteByPeriod = (period: TransactionPeriod | 'all') => {
    const allTx = transactions || [];
    // Only delete from visible set (respecting showMasters toggle)
    const visibleTx = showMasters ? allTx : allTx.filter(t => t.kind !== 'master');
    let idsToDelete: string[] = [];

    if (period === 'all') {
      idsToDelete = visibleTx.map(t => t.id);
    } else {
      idsToDelete = visibleTx.filter(t => t.period === period).map(t => t.id);
    }

    if (deleteTransactions) {
      deleteTransactions(idsToDelete);
    } else {
      idsToDelete.forEach(id => deleteTransaction(id));
    }

    setSelectedTransactions(new Set());
    setShowDeleteConfirm(null);
  };
  // --- Renderelés (JSX) ---

  return (
    <div className="view-container max-w-7xl mx-auto space-y-4 p-3">
      {/* Fejléc */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20">
              <Wallet size={20} className="text-white" />
            </div>
            {t('budget.title')}
            <span className="text-xs font-medium px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full border border-blue-200 dark:border-blue-800">
              PRO
            </span>
          </h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400 text-sm">{t('budget.subtitle')}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            className="input-field py-1.5 px-2 text-sm w-auto font-bold text-gray-700 dark:text-gray-200 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-gray-200 dark:border-gray-700"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          >
            {AVAILABLE_CURRENCIES.map(c => (
              <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>
            ))}
          </select>
          <button
            onClick={() => setShowConverter(true)}
            className="btn-secondary flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-500/10 text-blue-600 border-blue-200 hover:bg-blue-500/20"
            title={t('budget.converter') || 'Currency Converter'}
          >
            <RefreshCcw size={14} />
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
            className="btn-secondary flex items-center gap-2 px-3 py-1.5 text-sm bg-green-500/10 text-green-600 border-green-200 hover:bg-green-500/20"
          >
            <TrendingUp size={14} />
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
            className="btn-primary flex items-center gap-2 px-3 py-1.5 text-sm shadow-lg shadow-primary-500/25"
          >
            <Plus size={14} />
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
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 animate-slide-up">
          {/* Balance Card - Ultra Compact */}
          <div className="card p-4 flex flex-col justify-between bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20 hover:shadow-xl hover:shadow-emerald-500/30 transition-all duration-300 rounded-2xl group relative overflow-hidden">
            <div className="flex justify-between items-start z-10">
              <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                <Wallet size={16} className="text-white" />
              </div>
              <div className="text-emerald-100 text-[10px] font-medium px-1.5 py-0.5 bg-white/10 rounded-md backdrop-blur-sm uppercase tracking-wide">
                Egyenleg
              </div>
            </div>
            <div className="mt-2 z-10">
              <h3 className="text-2xl font-bold tracking-tight">
                {formatMoney(balance)}
              </h3>
              <div className="flex items-center gap-1 mt-0.5 text-emerald-100 text-xs font-medium">
                <TrendingUp size={12} />
                <span>Nyereség</span>
                <span className="opacity-60 font-normal ml-1 text-[10px]">(Cash-in-hand)</span>
              </div>
            </div>
            {/* Background Decorations */}
            <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-3 translate-y-3 group-hover:scale-110 transition-transform duration-500">
              <Wallet size={80} />
            </div>
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -mr-12 -mt-12 pointer-events-none" />
          </div>

          {/* Income Card - Ultra Compact */}
          <div className="card p-4 flex flex-col justify-between bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-300 rounded-2xl group relative overflow-hidden">
            <div className="flex justify-between items-start z-10">
              <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                <ArrowUpRight size={16} className="text-white" />
              </div>
              <div className="text-blue-100 text-[10px] font-medium px-1.5 py-0.5 bg-white/10 rounded-md backdrop-blur-sm uppercase tracking-wide">
                {t('budget.income')} ({projectionYears === 1 ? '1 Év' : `${projectionYears} Év`})
              </div>
            </div>
            <div className="mt-2 z-10">
              <h3 className="text-2xl font-bold tracking-tight">
                {formatMoney(totalIncome)}
              </h3>
              <div className="flex items-center gap-1 mt-0.5 text-blue-100 text-xs font-medium">
                <TrendingUp size={12} />
                <span>Tervezett bevétel</span>
              </div>
            </div>
            <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-3 translate-y-3 group-hover:scale-110 transition-transform duration-500">
              <ArrowUpRight size={80} />
            </div>
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -mr-12 -mt-12 pointer-events-none" />
          </div>

          {/* Expense Card - Ultra Compact */}
          <div className="card p-4 flex flex-col justify-between bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-lg shadow-red-500/20 hover:shadow-xl hover:shadow-red-500/30 transition-all duration-300 rounded-2xl group relative overflow-hidden">
            <div className="flex justify-between items-start z-10">
              <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                <ArrowDownRight size={16} className="text-white" />
              </div>
              <div className="text-red-100 text-[10px] font-medium px-1.5 py-0.5 bg-white/10 rounded-md backdrop-blur-sm uppercase tracking-wide">
                {t('budget.expense')} ({projectionYears === 1 ? '1 Év' : `${projectionYears} Év`})
              </div>
            </div>
            <div className="mt-2 z-10">
              <h3 className="text-2xl font-bold tracking-tight">
                {formatMoney(totalExpense)}
              </h3>
              <div className="flex items-center gap-1 mt-0.5 text-red-100 text-xs font-medium">
                <TrendingDown size={12} />
                <span>Tervezett kiadás</span>
              </div>
            </div>
            <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-3 translate-y-3 group-hover:scale-110 transition-transform duration-500">
              <ArrowDownRight size={80} />
            </div>
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -mr-12 -mt-12 pointer-events-none" />
          </div>

          {/* Charts Row - Ultra Compact */}
          <div className="lg:col-span-2 card p-4 flex flex-col bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl border border-white/20 dark:border-gray-700/50 shadow-xl hover:shadow-2xl transition-all duration-300 rounded-2xl">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <div className="p-1.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-md text-white shadow-lg shadow-blue-500/20">
                  <BarChart3 size={14} />
                </div>
                {t('budget.cashFlow')}
              </h3>
              <span className="text-[10px] font-medium px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-md">
                Csak lezárt múltbeli adatok
              </span>
            </div>
            <div className="h-[220px] w-full">
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

          {/* Expense Breakdown - Ultra Compact */}
          <div className="card p-4 flex flex-col bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl border border-white/20 dark:border-gray-700/50 shadow-xl hover:shadow-2xl transition-all duration-300 rounded-2xl">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <div className="p-1.5 bg-gradient-to-br from-purple-500 to-pink-600 rounded-md text-white shadow-lg shadow-purple-500/20">
                  <PieChart size={14} />
                </div>
                {t('budget.expenseCategories')}
              </h3>
            </div>
            <div className="h-[220px] relative flex-1 min-h-[220px]">
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

          {/* PhD Level: Projection Chart with Year Selector */}
          <div className="card lg:col-span-3 p-4 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white backdrop-blur-xl border border-indigo-500/20 shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500 rounded-2xl relative overflow-hidden">
            {/* Background glow effects */}
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl" />

            <div className="relative z-10">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                <div>
                  <h3 className="text-xl font-bold flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg shadow-indigo-500/30">
                      <TrendingUp size={22} />
                    </div>
                    {t('budget.projection') || 'Előrejelzés'}
                  </h3>
                  <p className="text-sm text-indigo-200/70 mt-1">
                    Pénzügyi helyzeted alakulása a következő {projectionYears} évben
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex bg-indigo-900/50 rounded-xl p-1 border border-indigo-500/30">
                    {[1, 5, 10, 20, 50].map(y => (
                      <button
                        key={y}
                        onClick={() => setProjectionYears(y)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${projectionYears === y
                          ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/40'
                          : 'text-indigo-300 hover:bg-indigo-800/50'}`}
                      >
                        {y} év
                      </button>
                    ))}
                  </div>

                  <div className="text-right hidden sm:block">
                    <div className="text-xs text-indigo-300/60 uppercase tracking-wider">Végső egyenleg</div>
                    <div className={`text-2xl font-bold ${(projectionData[projectionData.length - 1]?.balance || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {formatMoney(projectionData[projectionData.length - 1]?.balance || balance)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={projectionData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="projectionGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#818cf8" stopOpacity={0.4} />
                        <stop offset="50%" stopColor="#6366f1" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="projectionStroke" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#a5b4fc" />
                        <stop offset="50%" stopColor="#818cf8" />
                        <stop offset="100%" stopColor="#c084fc" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} vertical={false} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#a5b4fc', fontSize: 11, fontWeight: 500 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#a5b4fc', fontSize: 11, fontWeight: 500 }} tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(0)}k` : String(value)} />
                    <Tooltip
                      contentStyle={{ borderRadius: '16px', border: '1px solid rgba(99, 102, 241, 0.3)', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.5)', backdropFilter: 'blur(12px)', backgroundColor: 'rgba(30, 27, 75, 0.95)', color: '#fff' }}
                      labelStyle={{ color: '#a5b4fc', fontWeight: 600 }}
                      formatter={(value: number, name: string) => [formatMoney(value), name === 'balance' ? 'Egyenleg' : name === 'income' ? 'Bevétel' : 'Kiadás']}
                    />
                    <Area type="monotone" dataKey="balance" stroke="url(#projectionStroke)" strokeWidth={3} fillOpacity={1} fill="url(#projectionGradient)" name="balance" dot={{ fill: '#818cf8', strokeWidth: 0, r: 4 }} activeDot={{ fill: '#c084fc', strokeWidth: 0, r: 6 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* PhD Level: Insight Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
                  <div className="text-xs text-indigo-300/60 uppercase tracking-wider">Mai egyenleg</div>
                  <div className={`text-lg font-bold ${balance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatMoney(balance)}</div>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
                  <div className="text-xs text-indigo-300/60 uppercase tracking-wider">{projectionYears} év múlva</div>
                  <div className={`text-lg font-bold ${(projectionData[projectionData.length - 1]?.balance || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {formatMoney(projectionData[projectionData.length - 1]?.balance || balance)}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
                  <div className="text-xs text-indigo-300/60 uppercase tracking-wider">Változás</div>
                  <div className={`text-lg font-bold ${((projectionData[projectionData.length - 1]?.balance || balance) - balance) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {((projectionData[projectionData.length - 1]?.balance || balance) - balance) >= 0 ? '+' : ''}{formatMoney((projectionData[projectionData.length - 1]?.balance || balance) - balance)}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
                  <div className="text-xs text-indigo-300/60 uppercase tracking-wider">Trend</div>
                  <div className={`text-lg font-bold flex items-center gap-1 ${((projectionData[projectionData.length - 1]?.balance || balance) - balance) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {((projectionData[projectionData.length - 1]?.balance || balance) - balance) >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                    {((projectionData[projectionData.length - 1]?.balance || balance) - balance) >= 0 ? 'Növ' : 'Csökk'}
                  </div>
                </div>
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
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={t('budget.search') || 'Keresés...'}
                    className="input-field text-sm py-2 pl-10 pr-4 rounded-xl bg-white/50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700 focus:ring-emerald-500/50 w-full sm:w-64"
                  />
                </div>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="input-field text-sm py-2 px-4 pr-10 rounded-xl bg-white/50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700 focus:ring-emerald-500/50"
                >
                  <option value="all">{t('budget.filter')}: {t('budget.allCategories') || 'Összes'}</option>
                  {Object.entries(CATEGORIES).map(([key, val]) => (
                    <option key={key} value={key}>{val.label}</option>
                  ))}
                </select>
                {/* (B) Show Masters Toggle */}
                <button
                  onClick={() => setShowMasters(!showMasters)}
                  className={`px-3 py-2 text-sm font-medium rounded-xl border transition-colors flex items-center gap-2
                      ${showMasters
                      ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700'
                      : 'bg-white/50 dark:bg-gray-900/50 text-gray-500 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                  title={showMasters ? 'Sablonok elrejtése' : 'Sablonok mutatása'}
                >
                  <Repeat size={14} />
                  <span className="hidden sm:inline">{showMasters ? 'Sablonok: BE' : 'Sablonok: KI'}</span>
                </button>
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
                    // Conflict Fix: If selection mode is active, toggle selection instead of opening modal
                    if (selectedTransactions.size > 0) {
                      toggleTransactionSelection(tr.id);
                      return;
                    }

                    setTransactionType(tr.type as 'income' | 'expense');
                    setEditingTransaction(tr);
                    setNewTransaction({
                      description: tr.description,
                      amount: Math.abs(tr.amount).toString(),
                      category: tr.category,
                      currency: (tr as any).currency || currency,
                      period: tr.period as TransactionPeriod,
                      date: typeof tr.date === 'string' ? tr.date : new Date(tr.date).toISOString().split('T')[0], // PhD Fix: Timezone safe date
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md px-4 py-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-2xl w-full max-w-lg flex flex-col border border-white/20 dark:border-gray-700/50 max-h-[90vh] overflow-hidden"
          >
            {/* Modal Header - Sticky */}
            <div className="px-8 py-6 border-b border-gray-100/50 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-800">
              <div>
                <h2 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                  {transactionType === 'income' ? (
                    <div className="p-2 rounded-xl bg-green-500/10 text-green-600 dark:bg-green-500/20"><TrendingUp size={24} /></div>
                  ) : (
                    <div className="p-2 rounded-xl bg-red-500/10 text-red-600 dark:bg-red-500/20"><TrendingDown size={24} /></div>
                  )}
                  {editingTransaction ? t('common.edit') : (transactionType === 'income' ? t('budget.addIncome') : t('budget.addExpense'))}
                </h2>
                <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest font-bold">
                  {transactionType === 'income' ? t('budget.income') : t('budget.expense')}
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-2xl transition-all text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-500 dark:text-gray-400 flex items-center gap-2 px-1">
                  {t('budget.transactionName')}
                </label>
                <input
                  type="text"
                  value={newTransaction.description}
                  onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })}
                  className="input-field w-full text-lg py-4 px-6 rounded-2xl border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 focus:ring-2 focus:ring-primary-500"
                  placeholder={transactionType === 'income' ? t('budget.exampleIncome') : t('budget.exampleExpense')}
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-500 dark:text-gray-400 flex items-center gap-2 px-1">
                    {t('budget.amount')}
                  </label>
                  <div className="relative group">
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
                      className="input-field w-full py-4 pl-6 pr-12 text-xl font-black rounded-2xl border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 focus:ring-2"
                      placeholder="0"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">
                      {AVAILABLE_CURRENCIES.find(c => c.code === newTransaction.currency)?.symbol || '$'}
                    </div>
                  </div>
                  {conversionPreview && (
                    <div className="flex items-center gap-2 px-2 py-1.5 bg-blue-500/5 dark:bg-blue-500/10 rounded-lg border border-blue-500/10 text-[11px] text-blue-500 font-bold">
                      <RefreshCcw size={10} /> {conversionPreview}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-500 dark:text-gray-400 px-1">
                    Pénznem
                  </label>
                  <select
                    value={newTransaction.currency}
                    onChange={(e) => setNewTransaction({ ...newTransaction, currency: e.target.value })}
                    className="input-field w-full py-4 px-6 rounded-2xl border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 focus:ring-2 font-bold cursor-pointer"
                  >
                    {AVAILABLE_CURRENCIES.map(c => (
                      <option key={c.code} value={c.code}>
                        {c.code} ({c.symbol}) — {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Rate Source Warning - PhD Design Upgrade */}
              {newTransaction.currency !== currency && (
                <div className={`p-4 rounded-[1.5rem] border ${rateSource === 'system'
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400'
                  : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                  } flex items-start gap-4 transition-all`}>
                  <div className={`mt-1 p-2 rounded-xl ${rateSource === 'system' ? 'bg-amber-500 text-white' : 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'}`}>
                    {rateSource === 'system' ? <AlertTriangle size={16} /> : <Check size={16} />}
                  </div>
                  <div>
                    <div className="font-bold text-sm">
                      {rateSource === 'system' ? 'Becsült árfolyam (System)' : 'Élő piaci árfolyam (API)'}
                    </div>
                    <div className="text-[11px] leading-relaxed opacity-80 mt-0.5">
                      {rateSource === 'system'
                        ? 'A rendszer beépített, becsült árfolyamokat használ. A pontos váltáshoz frissíts az API gombbal.'
                        : `A deviza átváltása valós idejű piaci adatok alapján történik. Utolsó frissítés: ${new Date().toLocaleDateString()}`
                      }
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-500 dark:text-gray-400 px-1">
                    {t('budget.category')}
                  </label>
                  <select
                    value={newTransaction.category}
                    onChange={(e) => setNewTransaction({ ...newTransaction, category: e.target.value })}
                    className="input-field w-full py-4 px-6 rounded-2xl border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 cursor-pointer"
                  >
                    {Object.entries(CATEGORIES).map(([key, val]) => (
                      <option key={key} value={key}>{val.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-500 dark:text-gray-400 px-1">
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

                      // BUG FIX (B): Simplified Logic
                      if (period === 'oneTime') {
                        setAddToBalanceImmediately(true);
                      }
                    }}
                    className="input-field w-full py-4 px-6 rounded-2xl border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 cursor-pointer"
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
                <div className="group relative overflow-hidden flex items-center gap-3 p-3 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 border border-indigo-500/20 hover:border-indigo-500/40 transition-all">
                  <button
                    onClick={() => setAddToBalanceImmediately(!addToBalanceImmediately)}
                    className={`shrink-0 p-2 rounded-xl transition-all ${addToBalanceImmediately
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                      : 'bg-white dark:bg-gray-800 text-gray-400 border border-gray-200 dark:border-gray-700 hover:text-indigo-500'
                      }`}
                  >
                    {addToBalanceImmediately ? <CheckSquare size={18} /> : <Square size={18} />}
                  </button>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-indigo-900 dark:text-indigo-100">
                      Hozzáadás az egyenleghez most
                    </p>
                    <p className="text-[11px] text-indigo-600/70 dark:text-indigo-400/70 mt-0.5 leading-relaxed font-medium">
                      {addToBalanceImmediately
                        ? "Az első részletet azonnal levonja/hozzáadja az aktuális tőkédhez."
                        : "A tőke akkor változik, amikor a dátumnál aktiválódik."
                      }
                    </p>
                  </div>
                  {/* Subtle background decoration */}
                  <div className="absolute right-0 bottom-0 opacity-5 pointer-events-none transform translate-x-1/2 translate-y-1/2">
                    <Zap size={60} className="text-indigo-500" />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-2">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-500 dark:text-gray-400 flex items-center gap-2 px-1">
                    <CalendarRange size={14} /> {t('budget.date')}
                  </label>
                  <input
                    type="date"
                    value={newTransaction.date}
                    onChange={(e) => setNewTransaction({ ...newTransaction, date: e.target.value })}
                    className="input-field w-full py-4 px-6 rounded-2xl border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 cursor-pointer"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-purple-600 dark:text-purple-400 flex items-center gap-2 px-1 uppercase tracking-wider">
                    <TrendingUp size={14} className="animate-bounce-slow" /> Éves kamatláb
                  </label>
                  <div className="relative">
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
                      className="input-field w-full py-4 pl-6 pr-12 text-lg font-bold rounded-2xl border-purple-100 dark:border-purple-900 bg-purple-50/50 dark:bg-purple-900/10 focus:ring-2 focus:ring-purple-500"
                      placeholder="0.00"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-purple-400 font-bold">%</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer - Sticky */}
            <div className="p-8 border-t border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-900/80 flex gap-4">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-[0.4] py-4 rounded-2xl font-bold bg-white dark:bg-gray-800 text-gray-500 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-gray-700 transition-all hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 shadow-sm"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleAddTransaction}
                className={`flex-1 py-4 rounded-2xl font-black text-white shadow-xl transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3
                  ${transactionType === 'income'
                    ? 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/20'
                    : 'bg-gradient-to-br from-indigo-500 to-primary-600 shadow-indigo-500/20'
                  }`}
              >
                <Check size={20} />
                {editingTransaction ? t('common.save') : t('budget.saveTransaction')}
              </button>
            </div>
          </motion.div>
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
              // (1) Clamp TOP and LEFT to prevent overflow
              top: Math.min(
                selectedStat.rect.bottom + 10,
                (typeof window !== 'undefined' ? window.innerHeight : 800) - 250
              ),
              left: Math.min(
                selectedStat.rect.left,
                (typeof window !== 'undefined' ? window.innerWidth : 1000) - 300
              )
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
                    setIsRefreshingRates(true);
                    try {
                      await CurrencyService.fetchRealTimeRates(true);
                      setRateSource(CurrencyService.getUpdateSource());
                    } finally {
                      setIsRefreshingRates(false);
                    }
                  }}
                  disabled={isRefreshingRates}
                  className={`text-xs text-blue-500 dark:text-blue-400 font-medium hover:underline flex items-center gap-1 ${isRefreshingRates ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <RefreshCcw size={12} className={isRefreshingRates ? "animate-spin" : ""} />
                  {isRefreshingRates ? 'Frissítés folyamatban...' : 'Frissítés valós idejű adatokkal (API)'}
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