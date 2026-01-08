import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Plus, TrendingUp, Trash2, X, Repeat, Wallet,
  RefreshCcw, ArrowUpRight, ArrowDownRight, CheckSquare,
  Square, AlertTriangle, Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPieChart, Pie, Cell
} from 'recharts';
import { useBudgetAnalytics } from './useBudgetAnalytics';
import { useLanguage } from '../../contexts/LanguageContext';
import { useData } from '../../contexts/DataContext';
import { Transaction, TransactionPeriod, TransactionPatch } from '../../types/planner';
import { AVAILABLE_CURRENCIES } from '../../constants/currencyData';
import { CurrencyService } from '../../services/CurrencyService';
import { parseMoneyInput } from '../../utils/numberUtils';

const normalizeDigits = (s: string) => {
  const cleaned = s.replace(/[^\d-]/g, '');
  // Only allow minus at start, remove others
  return cleaned.startsWith('-')
    ? '-' + cleaned.slice(1).replace(/-/g, '')
    : cleaned.replace(/-/g, '');
};

// --- Types & Constants ---

type RectLike = { top: number; left: number; right: number; bottom: number; width: number; height: number };

type CategoryKey = 'software' | 'marketing' | 'office' | 'travel' | 'service' | 'freelance' | 'other';

type CategoryDef = { color: string; label: string };
type CategoriesMap = Record<CategoryKey, CategoryDef>;

function toRectLike(el: Element | null): RectLike | null {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
}

// --- Timezone-safe Date Helpers ---

function parseYMD(ymd: string): { y: number; m: number; d: number } {
  const [y, m, d] = ymd.split('-').map(Number);
  return { y, m, d };
}

function formatYMD(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function daysInMonth(y: number, m: number): number {
  return new Date(y, m, 0).getDate();
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

// Fixed: Local date conversion to avoid UTC shifts
const toYMDLocal = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const parseLocalDate = (date: Date | string): Date | null => {
  if (date instanceof Date) return date;
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [y, m, d] = date.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

// --- Sub-Components ---

const CategoryBadge: React.FC<{
  catKey: string;
  CATEGORIES: CategoriesMap;
  getCategoryKey: (c: string) => CategoryKey;
}> = React.memo(({ catKey, CATEGORIES, getCategoryKey }) => {
  const key = getCategoryKey(String(catKey ?? 'other'));
  const cat = CATEGORIES[key] || CATEGORIES.other;
  return (
    <span className="px-2.5 py-0.5 rounded-md text-[10px] uppercase font-bold tracking-wider shadow-sm" style={{
      backgroundColor: `${cat.color}15`,
      color: cat.color
    }}>
      {cat.label}
    </span>
  );
});

const StatCard: React.FC<{
  title: string;
  value: string;
  trend: string;
  icon: React.ReactNode;
  color: string;
  onClick?: (e: React.MouseEvent) => void;
}> = React.memo(({ title, value, trend, icon, color, onClick }) => (
  <motion.div
    whileHover={{ y: -5 }}
    onClick={onClick}
    className={`bg-white dark:bg-gray-800 p-6 rounded-[2rem] shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-700 flex flex-col justify-between group cursor-pointer relative overflow-hidden`}
  >
    <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${color} opacity-[0.03] rounded-bl-full`} />
    <div className="flex justify-between items-start mb-4 relative">
      <div className={`p-3 rounded-2xl bg-gradient-to-br ${color} bg-opacity-10 text-white shadow-lg`}>
        {icon}
      </div>
      <div className="text-right">
        <p className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">{title}</p>
        <h3 className="text-2xl font-black text-gray-900 dark:text-white tabular-nums tracking-tight">{value}</h3>
      </div>
    </div>
    <div className="flex items-center gap-2 pt-4 border-t border-gray-50 dark:border-gray-700/50">
      <span className={`flex items-center text-xs font-black px-2 py-1 rounded-lg ${trend.startsWith('+') ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' : 'bg-gray-100 text-gray-500 dark:bg-gray-800'}`}>
        {trend}
      </span>
      <span className="text-[10px] font-bold text-gray-300 dark:text-gray-600 uppercase tracking-wider">vs előző időszak</span>
    </div>
  </motion.div>
));

const BreakdownPopover: React.FC<{
  isOpen: boolean;
  data: { title: string; breakdown: Record<string, number>; rect: RectLike } | null;
  onClose: () => void;
  CATEGORIES: CategoriesMap;
  formatMoney: (v: number) => string;
  getCategoryKey: (c: string) => CategoryKey;
}> = ({ isOpen, data, onClose, CATEGORIES, formatMoney, getCategoryKey }) => {
  if (!isOpen || !data) return null;

  // Fix: SSR Guard to prevent crash during server rendering
  if (typeof window === 'undefined' || typeof document === 'undefined') return null;

  // Fix: Clamp top position to avoid overflow
  const topPos = Math.min(data.rect.bottom + window.scrollY + 10, document.body.scrollHeight - 300);
  const leftPos = Math.min(Math.max(10, data.rect.left + window.scrollX - 100), window.innerWidth - 320);

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="fixed z-50 w-80 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden"
        style={{ top: topPos, left: leftPos }}
      >
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex justify-between items-center">
          <h4 className="font-bold text-gray-900 dark:text-white">{data.title}</h4>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full">
            <X size={14} />
          </button>
        </div>
        <div className="p-2 max-h-64 overflow-y-auto custom-scrollbar">
          {Object.entries(data.breakdown)
            .sort(([, a], [, b]) => b - a)
            .map(([catKeyRaw, val], idx) => {
              // Critical Fix: Use Category labels instead of currency formatting keys
              const key = getCategoryKey(catKeyRaw);
              const cat = CATEGORIES[key] || CATEGORIES.other;
              return (
                <div key={`${key}-${idx}`} className="flex justify-between items-center p-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{cat.label}</span>
                  </span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">
                    {formatMoney(val)}
                  </span>
                </div>
              );
            })}
        </div>
      </motion.div>
    </>
  );
};

const BudgetHeader: React.FC<{
  t: (k: string) => string;
  currency: string;
  availableCurrencies: typeof AVAILABLE_CURRENCIES;
  onCurrencyChange: (c: string) => void;
  onOpenConverter: () => void;
  onAddIncome: () => void;
  onAddExpense: () => void;
}> = ({ t, currency, availableCurrencies, onCurrencyChange, onOpenConverter, onAddIncome, onAddExpense }) => (
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
        onChange={(e) => onCurrencyChange(e.target.value)}
      >
        {availableCurrencies.map(c => (
          <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>
        ))}
      </select>
      <button
        onClick={onOpenConverter}
        className="btn-secondary flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-500/10 text-blue-600 border-blue-200 hover:bg-blue-500/20"
        title={t('budget.converter') || 'Currency Converter'}
      >
        <RefreshCcw size={14} />
        <span className="hidden sm:inline">{t('budget.converter') || 'Currency Converter'}</span>
      </button>
      <button
        onClick={onAddIncome}
        className="btn-secondary flex items-center gap-2 px-3 py-1.5 text-sm bg-green-500/10 text-green-600 border-green-200 hover:bg-green-500/20"
      >
        <TrendingUp size={14} />
        <span>{t('budget.addIncome')}</span>
      </button>
      <button
        onClick={onAddExpense}
        className="btn-primary flex items-center gap-2 px-3 py-1.5 text-sm shadow-lg shadow-primary-500/25"
      >
        <Plus size={14} />
        <span>{t('budget.addExpense')}</span>
      </button>
    </div>
  </div>
);

const TransactionRow: React.FC<{
  tr: Transaction;
  selected: boolean;
  onSelect: (id: string) => void;
  onClick: (tr: Transaction) => void;
  onDelete: (id: string) => void;
  CATEGORIES: CategoriesMap;
  getCategoryKey: (c: string) => CategoryKey;
  formatDate: (d: Date | string) => string;
  formatMoney: (v: number, c?: string) => string;
  getTrCurrency: (tr: Transaction) => string;
  getPeriodLabel: (p: TransactionPeriod) => string;
}> = React.memo(({ tr, selected, onSelect, onClick, onDelete, CATEGORIES, getCategoryKey, formatDate, formatMoney, getTrCurrency, getPeriodLabel }) => {
  return (
    <div
      onClick={() => onClick(tr)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(tr); }}
      className={`p-4 flex items-center justify-between hover:bg-gray-50/80 dark:hover:bg-gray-700/30 transition-all duration-200 group cursor-pointer border-l-4 ${selected
        ? 'bg-blue-50/50 dark:bg-blue-900/10 border-l-blue-500'
        : 'border-l-transparent hover:border-l-indigo-300 dark:hover:border-l-indigo-700'
        }`}
    >
      <div className="flex items-center gap-4">
        <button
          onClick={(e) => { e.stopPropagation(); onSelect(tr.id); }}
          className={`p-2 rounded-lg transition-all ${selected ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30 scale-110' : 'text-gray-300 hover:text-blue-500 scale-100 hover:bg-blue-50 dark:hover:bg-blue-900/20'}`}
          aria-label={selected ? "Deselect transaction" : "Select transaction"}
        >
          {selected ? <CheckSquare size={18} /> : <Square size={18} />}
        </button>

        <div className={`p-3 rounded-2xl shadow-sm ${tr.type === 'income' ? 'bg-green-100/50 text-green-600 dark:bg-green-900/20' : 'bg-red-100/50 text-red-600 dark:bg-red-900/20'}`}>
          {tr.type === 'income' ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
        </div>
        <div>
          <h4 className="font-bold text-gray-900 dark:text-white text-base mb-1">{tr.description}</h4>
          <div className="flex items-center gap-2 text-sm text-gray-500 flex-wrap">
            <CategoryBadge catKey={tr.category} CATEGORIES={CATEGORIES} getCategoryKey={getCategoryKey} />
            <span className="text-gray-300">•</span>
            <span>{formatDate(tr.date)}</span>
            <span className="text-gray-300">•</span>
            <span className="px-2 py-0.5 rounded-md text-[10px] uppercase font-bold tracking-wider bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
              {getPeriodLabel(tr.period as TransactionPeriod)}
            </span>
            {tr.recurring && <span className="flex items-center gap-1 text-purple-600 bg-purple-50 dark:bg-purple-900/20 px-1.5 rounded ml-1"><Repeat size={12} /></span>}
          </div>
        </div>
      </div>
      <div className="text-right flex items-center gap-4">
        <span className={`text-xl font-bold block ${tr.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-700 dark:text-gray-300'}`}>
          {tr.type === 'income' ? '+' : '−'}{formatMoney(Math.abs((typeof tr.amount === 'number' && Number.isFinite(tr.amount)) ? tr.amount : 0), getTrCurrency(tr))}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(tr.id); }}
          className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl"
          title="Törlés"
          aria-label="Delete transaction"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
});

// --- Controller Hook ---

const useBudgetController = () => {
  const { t, language } = useLanguage();
  const { transactions: rawTransactions, addTransaction, updateTransaction, deleteTransaction, deleteTransactions } = useData();
  // Critical Fix: Force new reference to prevent stale memoization in analytics
  const transactions = useMemo(() => (Array.isArray(rawTransactions) ? rawTransactions.map(t => ({ ...t })) : []),
    [rawTransactions]);

  // API Guard: Ensure functions exist
  const safeAdd = addTransaction ?? ((_: any) => console.warn('addTransaction missing'));
  const safeUpdate = updateTransaction ?? ((_: any, __: any) => console.warn('updateTransaction missing'));
  const safeDelete = deleteTransaction ?? ((_: any) => console.warn('deleteTransaction missing'));

  // State
  const [currency, setCurrency] = useState<string>('USD');
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'planning'>('overview');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedStat, setSelectedStat] = useState<{ title: string; breakdown: Record<string, number>; rect: RectLike } | null>(null);
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('expense');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Converter
  const [showConverter, setShowConverter] = useState(false);

  // Selection & Deletion
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<'selected' | 'all' | 'period' | null>(null);
  const [deletePeriodFilter, setDeletePeriodFilter] = useState<TransactionPeriod | 'all'>('all');

  // Show Masters
  const [showMasters, setShowMasters] = useState(false);

  // New Transaction Form
  const [newTransaction, setNewTransaction] = useState({
    description: '',
    amount: '',
    category: 'other',
    currency: currency,
    period: 'oneTime' as TransactionPeriod,
    date: toYMDLocal(new Date()), // Fix: Init with timezone-safe local date
    recurring: false,
    interestRate: ''
  });
  const [addToBalanceImmediately, setAddToBalanceImmediately] = useState(true);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 50;

  const [projectionYears, setProjectionYears] = useState(1);

  // Helpers
  const isCategoryKey = (v: string): v is CategoryKey =>
    ['software', 'marketing', 'office', 'travel', 'service', 'freelance', 'other'].includes(v);

  const getCategoryKey = useCallback((cat: string): CategoryKey => {
    return isCategoryKey(cat) ? cat : 'other';
  }, []);

  const getTrCurrency = useCallback((tr: Transaction): string => {
    return tr.currency && typeof tr.currency === 'string' ? tr.currency : currency;
  }, [currency]);

  // CATEGORIES
  const CATEGORIES = useMemo((): CategoriesMap => ({
    software: { color: '#4361ee', label: t('budget.software') || 'Software' },
    marketing: { color: '#a855f7', label: t('budget.marketing') || 'Marketing' },
    office: { color: '#06b6d4', label: t('budget.office') || 'Office' },
    travel: { color: '#f59e0b', label: t('budget.travel') || 'Travel' },
    service: { color: '#10b981', label: t('budget.service') || 'Service' },
    freelance: { color: '#3b82f6', label: t('budget.freelance') || 'Freelance' },
    other: { color: '#9ca3af', label: t('budget.other') || 'Other' }
  }), [language, t]);

  // Formatter Cache - useRef for StrictMode stability
  const formatterCacheRef = React.useRef<Map<string, Intl.NumberFormat>>(new Map());

  const getFormatter = useCallback((currencyCode: string): Intl.NumberFormat => {
    const key = `${language}-${currencyCode}`;
    if (!formatterCacheRef.current.has(key)) {
      formatterCacheRef.current.set(key, new Intl.NumberFormat(language === 'hu' ? 'hu-HU' : 'en-US', {
        style: 'currency',
        currency: currencyCode,
        maximumFractionDigits: 2
      }));
    }
    return formatterCacheRef.current.get(key)!;
  }, [language]);

  // Cleanup cache on language change
  useEffect(() => {
    formatterCacheRef.current.clear();
  }, [language]);


  const formatMoney = useCallback((amount: number, currencyOverride?: string) => {
    const safeAmount = isNaN(amount) ? 0 : amount;
    return getFormatter(currencyOverride || currency).format(safeAmount);
  }, [currency, getFormatter]);

  const formatDate = useCallback((date: Date | string) => {
    const d = parseLocalDate(date);
    if (!d) return '—';
    return new Intl.DateTimeFormat(language === 'hu' ? 'hu-HU' : 'en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    }).format(d);
  }, [language]);

  const safeConvert = useCallback((amount: number, fromCurrency: string, toCurrency: string): number => {
    if (!amount) return 0;
    if (fromCurrency === toCurrency) return amount;
    try {
      return CurrencyService.convert(amount, fromCurrency || 'USD', toCurrency || 'USD');
    } catch (error) {
      console.warn(`Conversion error: ${error}`);
      return 0;
    }
  }, []);

  // Update form currency when global currency changes
  useEffect(() => {
    if (editingTransaction) return;
    if (showAddModal) return; // Don't override if user is actively creating
    setNewTransaction(prev => ({ ...prev, currency }));
  }, [currency, editingTransaction, showAddModal]);

  // Init rates
  useEffect(() => {
    // Defensive Service Call
    if (CurrencyService && typeof CurrencyService.fetchRealTimeRates === 'function') {
      try {
        const result = CurrencyService.fetchRealTimeRates();
        if (result && typeof result.catch === 'function') {
          result.catch(console.warn);
        }
      } catch (e) {
        console.warn('Currency service init failed', e);
      }
    }
  }, []);

  // Budget Logic
  // Analytics should follow the same visibility rules as the UI (masters ON/OFF)
  const analyticsTransactions = useMemo(() => {
    return showMasters ? transactions : transactions.filter(t => t.kind !== 'master');
  }, [transactions, showMasters]);

  const { totalIncome, totalExpense, balance, categoryTotals, cashFlowData, projectionData } =
    useBudgetAnalytics(analyticsTransactions, currency, safeConvert, projectionYears);

  // Sorting and Filtering
  const dateToMs = useCallback((x: Date | string) => {
    const d = parseLocalDate(x);
    return d ? d.getTime() : 0;
  }, []);

  const sortedTransactions = useMemo(() => {
    // Standardized check for masters
    const base = showMasters ? transactions : transactions.filter(tr => tr.kind !== 'master');
    return [...base].sort((a, b) => dateToMs(b.date) - dateToMs(a.date));
  }, [transactions, showMasters, dateToMs]);



  const filteredTransactions = useMemo(() => {
    let filtered = sortedTransactions;
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      const needleNum = normalizeDigits(searchTerm);
      const hasDigits = /\d/.test(needleNum);

      filtered = filtered.filter(tr => {
        const desc = (tr.description || '').toLowerCase();
        const amt = normalizeDigits(String(tr.amount ?? ''));
        return desc.includes(lower) || (hasDigits && amt.includes(needleNum));
      });
    }
    if (filterCategory !== 'all') {
      filtered = filtered.filter(tr => String(tr.category ?? 'other') === filterCategory);
    }
    return filtered;
  }, [sortedTransactions, searchTerm, filterCategory]);

  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredTransactions.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredTransactions, currentPage]);

  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedTransactions(new Set()); // UX: Clear selection on filter change
  }, [searchTerm, filterCategory, showMasters]);

  // Handlers
  const handleAddTransaction = () => {
    if (!newTransaction.description || !newTransaction.amount) return;

    // Validate date safely with strict regex
    if (!/^\d{4}-\d{2}-\d{2}$/.test(newTransaction.date)) {
      alert("Érvénytelen dátum formátum!");
      return;
    }
    const { y, m, d } = parseYMD(newTransaction.date);
    const dateCheck = new Date(y, m - 1, d);
    if (Number.isNaN(dateCheck.getTime())) {
      alert("Érvénytelen dátum formátum!");
      return;
    }

    const amount = parseMoneyInput(newTransaction.amount);
    if (!Number.isFinite(amount)) { // Requirement 5
      alert("Érvénytelen összeg!");
      return;
    }

    const isRecurring = newTransaction.period !== 'oneTime';
    const rawDateString = newTransaction.date;

    const interestRateParsed = newTransaction.interestRate !== ''
      ? parseMoneyInput(newTransaction.interestRate)
      : null;

    // Common payload parts
    const basePayloadProps = {
      description: newTransaction.description,
      amount: transactionType === 'expense' ? -Math.abs(amount) : Math.abs(amount),
      category: newTransaction.category,
      type: transactionType,
      currency: newTransaction.currency,
    };

    if (editingTransaction) {
      // UPDATE: Use TransactionPatch (allows null to trigger delete)
      const patch: TransactionPatch = {
        ...basePayloadProps,
        date: rawDateString,
        period: newTransaction.period,
        recurring: isRecurring,
        kind: isRecurring ? 'master' : null, // null => delete
        interestRate: interestRateParsed     // null => delete
      };
      safeUpdate(editingTransaction.id, patch);
    } else {
      // CREATE: Use strict Transaction type (requires undefined, not null)
      const createPayload = {
        ...basePayloadProps,
        interestRate: interestRateParsed ?? undefined, // null => undefined
      };

      if (isRecurring && addToBalanceImmediately) {
        safeAdd({ ...createPayload, date: rawDateString, period: 'oneTime', recurring: false });

        let nextDateStr: string;
        switch (newTransaction.period) {
          case 'daily': nextDateStr = addDaysYMD(rawDateString, 1); break;
          case 'weekly': nextDateStr = addWeeksYMD(rawDateString, 1); break;
          case 'monthly': nextDateStr = addMonthsClampedYMD(rawDateString, 1); break;
          case 'yearly': nextDateStr = addYearsClampedYMD(rawDateString, 1); break;
          default: nextDateStr = rawDateString;
        }

        safeAdd({ ...createPayload, date: nextDateStr, period: newTransaction.period, recurring: true, kind: 'master' });
      } else {
        safeAdd({ ...createPayload, date: rawDateString, period: newTransaction.period, recurring: isRecurring, kind: isRecurring ? 'master' : undefined });
      }
    }

    // Reset with safe date
    setNewTransaction({
      description: '', amount: '', category: 'other', currency: currency, period: 'oneTime',
      date: toYMDLocal(new Date()),
      recurring: false, interestRate: ''
    });
    setAddToBalanceImmediately(true);
    setEditingTransaction(null);
    setShowAddModal(false);
  };

  const openAddModal = (type: 'income' | 'expense') => {
    setTransactionType(type);
    setEditingTransaction(null);
    setNewTransaction({
      description: '', amount: '', category: 'other', currency: currency, period: 'oneTime',
      date: toYMDLocal(new Date()),
      recurring: false, interestRate: ''
    });
    setShowAddModal(true);
  };

  const openEditModal = (tr: Transaction) => {
    setTransactionType(tr.type as 'income' | 'expense');
    setEditingTransaction(tr);
    setNewTransaction({
      description: tr.description ?? '',
      amount: Number.isFinite(tr.amount) ? Math.abs(tr.amount).toString() : '',
      category: String(tr.category ?? 'other'),
      currency: getTrCurrency(tr) ?? currency,
      period: (tr.period as TransactionPeriod) ?? 'oneTime',
      date: typeof tr.date === 'string' ? tr.date : toYMDLocal(new Date(tr.date)),
      recurring: !!tr.recurring,
      interestRate: tr.interestRate != null ? String(tr.interestRate) : ''
    });
    setAddToBalanceImmediately(true);
    setShowAddModal(true);
  };

  const toggleTransactionSelection = (id: string) => {

    setSelectedTransactions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
      return newSet;
    });
  };

  const handleDeleteSelected = () => {
    if (deleteTransactions) deleteTransactions(Array.from(selectedTransactions));
    else if (safeDelete) selectedTransactions.forEach(id => safeDelete(id));

    // UX Resets
    setEditingTransaction(null);
    setShowAddModal(false);
    setSearchTerm('');
    setFilterCategory('all');
    setSelectedTransactions(new Set());
    setSelectedStat(null); // Reset popover to prevent stale data
  };

  const handleDeleteByPeriod = (period: TransactionPeriod | 'all') => {
    // FIX: 'Delete All' should delete EVERYTHING, even hidden masters
    const base = period === 'all'
      ? transactions // ✅ Always delete all
      : (showMasters ? transactions : transactions.filter(t => t.kind !== 'master'));

    const ids = period === 'all'
      ? base.map(t => t.id)
      : base.filter(t => t.period === period).map(t => t.id);

    if (deleteTransactions) {
      deleteTransactions(ids);
    } else {
      ids.forEach(id => safeDelete(id));
    }

    // UX Resets
    setEditingTransaction(null);
    setShowAddModal(false);
    setSearchTerm('');
    setFilterCategory('all');
    setSelectedTransactions(new Set());
    setSelectedStat(null); // Reset popover to prevent stale data
  };

  return {
    t, language, currency, setCurrency, activeTab, setActiveTab, showAddModal, setShowAddModal,
    selectedStat, setSelectedStat, transactionType, newTransaction, setNewTransaction,
    editingTransaction, showConverter, setShowConverter, addToBalanceImmediately, setAddToBalanceImmediately,
    selectedTransactions, showDeleteConfirm, setShowDeleteConfirm, deletePeriodFilter, setDeletePeriodFilter,
    showMasters, setShowMasters, currentPage, setCurrentPage, ITEMS_PER_PAGE, totalPages, projectionYears, setProjectionYears,
    transactions, sortedTransactions, filteredTransactions, paginatedTransactions, totalIncome, totalExpense, balance,
    categoryTotals, cashFlowData, projectionData, searchTerm, setSearchTerm, filterCategory, setFilterCategory,
    CATEGORIES, formatMoney, formatDate, getCategoryKey, getTrCurrency, safeConvert,
    handleAddTransaction, openAddModal, openEditModal, toggleTransactionSelection, handleDeleteSelected, handleDeleteByPeriod,
    deleteTransaction: safeDelete,
    selectAllTransactions: () => setSelectedTransactions(new Set(paginatedTransactions.map(t => t.id))),
    clearSelection: () => setSelectedTransactions(new Set()),
    getPeriodLabel: (p: TransactionPeriod) => {
      const labels: Record<TransactionPeriod, string> = {
        daily: t('budget.daily') || 'Daily',
        weekly: t('budget.weekly') || 'Weekly',
        monthly: t('budget.monthly') || 'Monthly',
        yearly: t('budget.yearly') || 'Yearly',
        oneTime: t('budget.oneTime') || 'One-time',
      };
      return labels[p] || labels.oneTime;
    }
  };
};

// --- Main Shell Component ---

const BudgetView: React.FC = () => {
  const ctrl = useBudgetController();
  const { t } = ctrl;

  // Render Helpers (Chart Mappers)
  const categoryData = useMemo(() => Object.entries(ctrl.categoryTotals || {}).map(([key, value]) => ({
    name: ctrl.CATEGORIES[ctrl.getCategoryKey(key)]?.label ?? key,
    value,
    color: ctrl.CATEGORIES[ctrl.getCategoryKey(key)]?.color ?? '#9ca3af',
  })), [ctrl.categoryTotals, ctrl.CATEGORIES, ctrl.getCategoryKey]);

  const monthNames = [t('months.january'), t('months.february'), t('months.march'), t('months.april'), t('months.may'), t('months.june'), t('months.july'), t('months.august'), t('months.september'), t('months.october'), t('months.november'), t('months.december')];

  const cashFlowChartData = useMemo(() => (ctrl.cashFlowData || []).map(d => ({
    name: monthNames[d.monthIndex]?.slice(0, 3) || `M${d.monthIndex + 1}`,
    income: d.income, expense: d.expense
  })), [ctrl.cashFlowData, monthNames]);

  return (
    <div className="view-container max-w-7xl mx-auto space-y-4 p-3">
      <BudgetHeader
        t={t} currency={ctrl.currency} availableCurrencies={AVAILABLE_CURRENCIES}
        onCurrencyChange={ctrl.setCurrency} onOpenConverter={() => ctrl.setShowConverter(true)}
        onAddIncome={() => ctrl.openAddModal('income')} onAddExpense={() => ctrl.openAddModal('expense')}
      />

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        {(['overview', 'transactions', 'planning'] as const).map(tab => (
          <button key={tab} onClick={() => ctrl.setActiveTab(tab)}
            className={`px-6 py-3 font-medium transition-all relative ${ctrl.activeTab === tab ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
            {t(`budget.${tab}`)}
            {ctrl.activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500 rounded-full" />}
          </button>
        ))}
      </div>

      {/* Overview */}
      {ctrl.activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 animate-slide-up">
          <div className="card p-4 flex flex-col justify-between bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20 rounded-2xl group relative overflow-hidden">
            <div className="flex justify-between items-start z-10">
              <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm"><Wallet size={16} className="text-white" /></div>
              <div className="text-emerald-100 text-[10px] font-medium px-1.5 py-0.5 bg-white/10 rounded-md backdrop-blur-sm uppercase tracking-wide">Egyenleg</div>
            </div>
            <div className="mt-2 z-10"><h3 className="text-2xl font-bold tracking-tight">{ctrl.formatMoney(ctrl.balance)}</h3></div>
          </div>

          <StatCard title={t('budget.income')} value={ctrl.formatMoney(ctrl.totalIncome)} trend="+12%" icon={<ArrowUpRight size={20} />} color="from-blue-500 to-indigo-600" />

          <StatCard title={t('budget.expense')} value={ctrl.formatMoney(ctrl.totalExpense)} trend="-5%" icon={<ArrowDownRight size={20} />} color="from-red-500 to-rose-600"
            onClick={(e) => {
              const rect = toRectLike(e.currentTarget as Element);
              if (rect) ctrl.setSelectedStat({ title: t('budget.expenseCategories') || 'Kiadások', breakdown: ctrl.categoryTotals, rect });
            }}
          />

          <div className="lg:col-span-2 card p-4 flex flex-col bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl border border-white/20 dark:border-gray-700/50 shadow-xl rounded-2xl">
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">{t('budget.cashFlow')}</h3>
            <div className="h-[220px] w-full" style={{ minHeight: '220px' }}>
              {cashFlowChartData && cashFlowChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%" minHeight={200}>
                  <AreaChart data={cashFlowChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.5} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="income" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
                    <Area type="monotone" dataKey="expense" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">—</div>
              )}
            </div>
          </div>

          <div className="card p-4 flex flex-col bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl border border-white/20 dark:border-gray-700/50 shadow-xl rounded-2xl">
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">{t('budget.expenseCategories')}</h3>
            <div className="h-[220px]" style={{ minHeight: '220px' }}>
              {categoryData && categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%" minHeight={200}>
                  <RechartsPieChart>
                    <Pie data={categoryData} cx="50%" cy="45%" innerRadius={70} outerRadius={90} paddingAngle={5} dataKey="value">
                      {categoryData.map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">—</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Transactions List */}
      {(ctrl.activeTab === 'transactions' || ctrl.activeTab === 'planning') && (
        <div className="card p-4 bg-white/50 dark:bg-gray-800/50 backdrop-blur-xl border border-white/20 dark:border-gray-700/50 shadow-xl rounded-2xl animate-slide-up">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-6">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input type="text" placeholder={t('budget.search') + "..."} className="pl-10 input-field w-full" value={ctrl.searchTerm} onChange={(e) => ctrl.setSearchTerm(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <select className="input-field py-2" value={ctrl.filterCategory} onChange={(e) => ctrl.setFilterCategory(e.target.value)}>
                <option value="all">{t('budget.allCategories')}</option>
                {Object.entries(ctrl.CATEGORIES).map(([key, cat]) => <option key={key} value={key}>{cat.label}</option>)}
              </select>
              <button onClick={() => ctrl.setShowMasters(!ctrl.showMasters)} className={`btn-secondary text-xs ${ctrl.showMasters ? 'bg-blue-100 text-blue-700' : 'opacity-70'}`}>
                Sablonok: {ctrl.showMasters ? 'BE' : 'KI'}
              </button>
            </div>
          </div>

          {ctrl.selectedTransactions.size > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl flex justify-between items-center mb-4">
              <span className="text-sm font-bold text-blue-700 dark:text-blue-300">{ctrl.selectedTransactions.size} kiválasztva</span>
              <div className="flex gap-2">
                <button onClick={ctrl.selectAllTransactions} className="text-xs text-blue-600 hover:underline">{t('budget.selectAllPage')}</button>
                <button onClick={() => ctrl.setShowDeleteConfirm('selected')} className="text-xs bg-red-100 text-red-600 px-3 py-1 rounded-lg hover:bg-red-200">Törlés</button>
              </div>
            </div>
          )}

          <div className="divide-y divide-gray-100/50 dark:divide-gray-800/50 max-h-[600px] overflow-y-auto custom-scrollbar">
            {ctrl.filteredTransactions.length === 0 ? (
              <div className="p-16 text-center text-gray-400">Nincs megjeleníthető tranzakció.</div>
            ) : (
              ctrl.paginatedTransactions.map(tr => (
                <TransactionRow
                  key={tr.id} tr={tr} selected={ctrl.selectedTransactions.has(tr.id)}
                  onSelect={ctrl.toggleTransactionSelection}
                  onClick={(tr) => { if (ctrl.selectedTransactions.size > 0) ctrl.toggleTransactionSelection(tr.id); else ctrl.openEditModal(tr); }}
                  onDelete={ctrl.deleteTransaction}
                  CATEGORIES={ctrl.CATEGORIES} getCategoryKey={ctrl.getCategoryKey} formatDate={ctrl.formatDate} formatMoney={ctrl.formatMoney} getTrCurrency={ctrl.getTrCurrency} getPeriodLabel={ctrl.getPeriodLabel}
                />
              ))
            )}
          </div>
          {ctrl.totalPages > 1 && (
            <div className="p-4 flex justify-between border-t border-gray-100 dark:border-gray-800">
              <p className="text-xs text-gray-500">Oldal {ctrl.currentPage} / {ctrl.totalPages}</p>
              <div className="flex gap-2">
                <button disabled={ctrl.currentPage === 1} onClick={() => ctrl.setCurrentPage(p => p - 1)} className="px-3 py-1 border rounded disabled:opacity-30">Előző</button>
                <button disabled={ctrl.currentPage === ctrl.totalPages} onClick={() => ctrl.setCurrentPage(p => p + 1)} className="px-3 py-1 border rounded disabled:opacity-30">Következő</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Absolute Components */}
      <BreakdownPopover isOpen={!!ctrl.selectedStat} data={ctrl.selectedStat} onClose={() => ctrl.setSelectedStat(null)} CATEGORIES={ctrl.CATEGORIES} formatMoney={ctrl.formatMoney} getCategoryKey={ctrl.getCategoryKey} />

      <AnimatePresence>
        {ctrl.showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className={`p-6 text-white bg-gradient-to-br ${ctrl.transactionType === 'income' ? 'from-emerald-500 to-teal-600' : 'from-red-500 to-rose-600'}`}>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    {ctrl.editingTransaction ? (ctrl.transactionType === 'income' ? 'Bevétel szerkesztése' : 'Kiadás szerkesztése') : (ctrl.transactionType === 'income' ? t('budget.addIncome') : t('budget.addExpense'))}
                  </h2>
                  <button onClick={() => ctrl.setShowAddModal(false)} className="bg-white/20 p-2 rounded-full hover:bg-white/30"><X size={20} /></button>
                </div>
                <div className="relative">
                  <input type="text" inputMode="decimal" placeholder="0" className="w-full bg-transparent text-5xl font-bold text-white placeholder-white/50 outline-none text-center"
                    value={ctrl.newTransaction.amount} onChange={(e) => ctrl.setNewTransaction({ ...ctrl.newTransaction, amount: e.target.value })} autoFocus
                  />
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-white/20 rounded-lg px-2 py-1">
                    <select className="bg-transparent text-sm font-bold outline-none" value={ctrl.newTransaction.currency} onChange={(e) => ctrl.setNewTransaction({ ...ctrl.newTransaction, currency: e.target.value })}>
                      {AVAILABLE_CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div className="p-6 space-y-4 overflow-y-auto">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('budget.description')}</label>
                  <input type="text" className="input-field w-full" value={ctrl.newTransaction.description} onChange={(e) => ctrl.setNewTransaction({ ...ctrl.newTransaction, description: e.target.value })} placeholder="Pl. Bevásárlás" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('budget.category')}</label>
                    <select className="input-field w-full" value={ctrl.newTransaction.category} onChange={(e) => ctrl.setNewTransaction({ ...ctrl.newTransaction, category: e.target.value })}>
                      {Object.entries(ctrl.CATEGORIES).map(([key, cat]) => <option key={key} value={key}>{cat.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('budget.date')}</label>
                    <input type="date" className="input-field w-full" value={ctrl.newTransaction.date} onChange={(e) => ctrl.setNewTransaction({ ...ctrl.newTransaction, date: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Gyakoriság</label>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {(['oneTime', 'daily', 'weekly', 'monthly', 'yearly'] as const).map(p => (
                      <button key={p} onClick={() => ctrl.setNewTransaction({ ...ctrl.newTransaction, period: p, recurring: p !== 'oneTime' })}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap border ${ctrl.newTransaction.period === p ? 'bg-primary-50 border-primary-500 text-primary-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                        {ctrl.getPeriodLabel(p)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <button onClick={ctrl.handleAddTransaction} className="btn-primary w-full py-3 text-lg shadow-xl shadow-primary-500/20">{ctrl.editingTransaction ? t('common.save') : t('budget.addTransaction')}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Modal */}
      <AnimatePresence>
        {ctrl.showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-gray-800 p-6 rounded-2xl w-full max-w-sm shadow-2xl">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full flex items-center justify-center mb-4"><AlertTriangle size={24} /></div>
              <h3 className="text-xl font-bold mb-2">Biztosan törlöd?</h3>
              <div className="flex gap-3">
                <button onClick={() => ctrl.setShowDeleteConfirm(null)} className="btn-secondary flex-1">Mégse</button>
                <button onClick={() => {
                  if (ctrl.showDeleteConfirm === 'selected') ctrl.handleDeleteSelected();
                  else if (ctrl.showDeleteConfirm === 'period') ctrl.handleDeleteByPeriod(ctrl.deletePeriodFilter);
                  else if (ctrl.showDeleteConfirm === 'all') ctrl.handleDeleteByPeriod('all');
                  ctrl.setShowDeleteConfirm(null);
                }} className="btn-primary bg-red-600 hover:bg-red-700 border-transparent text-white flex-1">Törlés</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BudgetView;