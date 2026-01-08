import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  Plus, TrendingUp, Trash2, X, Repeat, Wallet,
  RefreshCcw, ArrowUpRight, ArrowDownRight, CheckSquare,
  Square, AlertTriangle, Search, Filter, Download, Upload,
  PieChart, BarChart3, Calendar, Clock, TrendingDown,
  ChevronDown, ChevronUp, CreditCard, Building, Globe,
  Lock, Unlock, Eye, EyeOff, Calculator, History
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPieChart, Pie, Cell, BarChart, Bar,
  LineChart, Line, Legend
} from 'recharts';
import { useBudgetAnalytics } from './useBudgetAnalytics';
import { useLanguage } from '../../contexts/LanguageContext';
import { useData } from '../../contexts/DataContext';
import { Transaction, TransactionPeriod, TransactionPatch } from '../../types/planner';
import { AVAILABLE_CURRENCIES, CURRENCY_SYMBOLS } from '../../constants/currencyData';
import { CurrencyService } from '../../services/CurrencyService';
import { parseMoneyInput, formatNumber, validateCurrency } from '../../utils/numberUtils';
import './BudgetView.css';

// ==================== TYPE DEFINITIONS ====================
type RectLike = {
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

type CategoryKey = 'software' | 'marketing' | 'office' | 'travel' | 'service' | 'freelance' | 'other';

type CategoryDef = {
  color: string;
  label: string;
  icon: React.ReactNode;
};

type CategoriesMap = Record<CategoryKey, CategoryDef>;

type CurrencyRate = {
  code: string;
  rate: number;
  lastUpdated: Date;
  trend: 'up' | 'down' | 'stable';
};

type ConverterState = {
  fromCurrency: string;
  toCurrency: string;
  fromAmount: string;
  toAmount: string;
  rate: number;
  lastUpdate: Date | null;
  isLoading: boolean;
};

type FinancialInsight = {
  id: string;
  type: 'warning' | 'info' | 'success' | 'critical';
  title: string;
  message: string;
  action?: () => void;
};

// ==================== HELPER FUNCTIONS ====================
const normalizeDigits = (s: string): string => {
  if (!s) return '';
  const cleaned = s.replace(/[^\d.,-]/g, '');
  if (cleaned.startsWith('-')) {
    return '-' + cleaned.slice(1).replace(/-/g, '');
  }
  return cleaned.replace(/-/g, '');
};

const toRectLike = (el: Element | null): RectLike | null => {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return {
    top: r.top,
    left: r.left,
    right: r.right,
    bottom: r.bottom,
    width: r.width,
    height: r.height
  };
};

// ==================== DATE UTILITIES ====================
const parseYMD = (ymd: string): { y: number; m: number; d: number } => {
  const [y, m, d] = ymd.split('-').map(Number);
  return { y, m: m || 1, d: d || 1 };
};

const formatYMD = (y: number, m: number, d: number): string => {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
};

const daysInMonth = (y: number, m: number): number => {
  return new Date(y, m, 0).getDate();
};

const addDaysYMD = (ymd: string, days: number): string => {
  const { y, m, d } = parseYMD(ymd);
  const dt = new Date(y, m - 1, d + days);
  return formatYMD(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
};

const addMonthsClampedYMD = (ymd: string, months: number): string => {
  const { y, m, d } = parseYMD(ymd);
  let newM = m + months;
  let newY = y + Math.floor((newM - 1) / 12);
  newM = ((newM - 1) % 12) + 1;
  if (newM <= 0) { newM += 12; newY--; }
  const maxD = daysInMonth(newY, newM);
  return formatYMD(newY, newM, Math.min(d, maxD));
};

const toYMDLocal = (d: Date): string => {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// ==================== SUB-COMPONENTS ====================
const CategoryBadge: React.FC<{
  catKey: string;
  CATEGORIES: CategoriesMap;
  getCategoryKey: (c: string) => CategoryKey;
  size?: 'sm' | 'md' | 'lg';
}> = React.memo(({ catKey, CATEGORIES, getCategoryKey, size = 'md' }) => {
  const key = getCategoryKey(String(catKey ?? 'other'));
  const cat = CATEGORIES[key] || CATEGORIES.other;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base'
  };

  return (
    <span className={`
      inline-flex items-center gap-1.5 rounded-full font-medium
      ${sizeClasses[size]}
    `} style={{
        backgroundColor: `${cat.color}15`,
        color: cat.color,
        border: `1px solid ${cat.color}30`
      }}>
      {cat.icon}
      {cat.label}
    </span>
  );
});

const StatCard: React.FC<{
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
  trend?: { value: number; label: string };
  onClick?: () => void;
  loading?: boolean;
}> = React.memo(({ title, value, subtitle, icon, color, trend, onClick, loading = false }) => (
  <motion.div
    whileHover={{ y: -4, scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className={`
      relative overflow-hidden rounded-2xl p-6
      bg-gradient-to-br from-white to-white/80 dark:from-gray-800 dark:to-gray-900
      border border-gray-100/50 dark:border-gray-700/50
      shadow-lg shadow-gray-200/30 dark:shadow-gray-900/30
      backdrop-blur-sm
      ${onClick ? 'cursor-pointer' : ''}
      transition-all duration-300
    `}
  >
    {/* Gradient Background */}
    <div className={`
      absolute -top-12 -right-12 w-32 h-32 rounded-full
      bg-gradient-to-br ${color} opacity-[0.08]
      blur-xl
    `} />

    <div className="relative z-10">
      <div className="flex items-start justify-between mb-4">
        <div className={`
          p-3 rounded-xl
          bg-gradient-to-br ${color}
          shadow-lg shadow-current/20
        `}>
          {icon}
        </div>
        {trend && (
          <div className={`
            px-3 py-1 rounded-full text-xs font-bold
            flex items-center gap-1
            ${trend.value >= 0
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
              : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
            }
          `}>
            {trend.value >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {trend.label}
          </div>
        )}
      </div>

      <div className="space-y-1">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          {title}
        </p>
        {loading ? (
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
        ) : (
          <>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">
              {value}
            </h3>
            {subtitle && (
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {subtitle}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  </motion.div>
));

const CurrencyConverter: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  baseCurrency: string;
  onCurrencyChange: (currency: string) => void;
}> = ({ isOpen, onClose, baseCurrency, onCurrencyChange }) => {
  const { t } = useLanguage();
  const [converter, setConverter] = useState<ConverterState>({
    fromCurrency: baseCurrency,
    toCurrency: 'EUR',
    fromAmount: '100',
    toAmount: '',
    rate: 0,
    lastUpdate: null,
    isLoading: false
  });

  const [recentConversions, setRecentConversions] = useState<
    Array<{ from: string; to: string; amount: number; result: number; date: Date }>
  >([]);

  const calculateConversion = useCallback(async () => {
    if (!converter.fromAmount || parseFloat(converter.fromAmount) <= 0) {
      setConverter(prev => ({ ...prev, toAmount: '', rate: 0 }));
      return;
    }

    setConverter(prev => ({ ...prev, isLoading: true }));

    try {
      const amount = parseFloat(converter.fromAmount);
      const rate = await CurrencyService.getRate(
        converter.fromCurrency,
        converter.toCurrency
      );

      const result = amount * rate;

      setConverter(prev => ({
        ...prev,
        toAmount: formatNumber(result, 2),
        rate,
        lastUpdate: new Date(),
        isLoading: false
      }));

      // Save to recent conversions
      setRecentConversions(prev => [
        {
          from: converter.fromCurrency,
          to: converter.toCurrency,
          amount,
          result,
          date: new Date()
        },
        ...prev.slice(0, 4)
      ]);
    } catch (error) {
      console.error('Conversion error:', error);
      setConverter(prev => ({ ...prev, isLoading: false }));
    }
  }, [converter.fromAmount, converter.fromCurrency, converter.toCurrency]);

  const swapCurrencies = () => {
    setConverter(prev => ({
      ...prev,
      fromCurrency: prev.toCurrency,
      toCurrency: prev.fromCurrency,
      fromAmount: prev.toAmount,
      toAmount: prev.fromAmount
    }));
  };

  useEffect(() => {
    if (isOpen) {
      calculateConversion();
    }
  }, [isOpen, calculateConversion]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="relative w-full max-w-2xl bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-3xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-blue-500/5 to-purple-500/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600">
                  <RefreshCcw size={24} className="text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {t('budget.converter')}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Valós idejű árfolyamok
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
              >
                <X size={24} />
              </button>
            </div>
          </div>

          {/* Converter Body */}
          <div className="p-6 space-y-6">
            {/* From Currency */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Összeg
              </label>
              <div className="flex gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={converter.fromAmount}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9.,]/g, '');
                      setConverter(prev => ({ ...prev, fromAmount: val }));
                    }}
                    onBlur={calculateConversion}
                    className="w-full px-4 py-3 text-2xl font-bold bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    placeholder="0.00"
                  />
                </div>
                <div className="w-48">
                  <select
                    value={converter.fromCurrency}
                    onChange={(e) => setConverter(prev => ({ ...prev, fromCurrency: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none appearance-none"
                  >
                    {AVAILABLE_CURRENCIES.map(currency => (
                      <option key={currency.code} value={currency.code}>
                        {currency.code} - {currency.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Swap Button */}
            <div className="flex justify-center">
              <button
                onClick={swapCurrencies}
                className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full hover:shadow-lg hover:shadow-blue-500/25 transition-all"
              >
                <RefreshCcw size={20} />
              </button>
            </div>

            {/* To Currency */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Átváltott összeg
              </label>
              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="w-full px-4 py-3 text-2xl font-bold bg-gray-50/50 dark:bg-gray-800/50 border-2 border-gray-200 dark:border-gray-700 rounded-xl">
                    {converter.isLoading ? (
                      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    ) : (
                      converter.toAmount || '0.00'
                    )}
                  </div>
                </div>
                <div className="w-48">
                  <select
                    value={converter.toCurrency}
                    onChange={(e) => setConverter(prev => ({ ...prev, toCurrency: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none appearance-none"
                  >
                    {AVAILABLE_CURRENCIES.map(currency => (
                      <option key={currency.code} value={currency.code}>
                        {currency.code} - {currency.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Rate Display */}
            {converter.rate > 0 && (
              <div className="p-4 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-xl border border-emerald-500/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Aktuális árfolyam
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      1 {converter.fromCurrency} = {formatNumber(converter.rate, 6)} {converter.toCurrency}
                    </p>
                  </div>
                  {converter.lastUpdate && (
                    <div className="text-right">
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        Utoljára frissítve
                      </p>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {converter.lastUpdate.toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Recent Conversions */}
            {recentConversions.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Legutóbbi váltások
                </h3>
                <div className="space-y-2">
                  {recentConversions.map((conv, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50/50 dark:bg-gray-800/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                          <Calculator size={16} className="text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {formatNumber(conv.amount, 2)} {conv.from} → {formatNumber(conv.result, 2)} {conv.to}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500">
                            {conv.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setConverter(prev => ({
                            ...prev,
                            fromCurrency: conv.from,
                            toCurrency: conv.to,
                            fromAmount: conv.amount.toString()
                          }));
                        }}
                        className="px-3 py-1 text-sm bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-500/20 transition-colors"
                      >
                        Újra használ
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gradient-to-r from-gray-50/50 to-white/50 dark:from-gray-800/50 dark:to-gray-900/50">
            <div className="flex justify-between items-center">
              <button
                onClick={() => onCurrencyChange(converter.toCurrency)}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all"
              >
                Fő pénznem beállítása erre
              </button>
              <button
                onClick={calculateConversion}
                disabled={converter.isLoading}
                className="px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                {converter.isLoading ? 'Frissítés...' : 'Frissítés'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

const FinancialInsightCard: React.FC<{
  insight: FinancialInsight;
}> = ({ insight }) => {
  const bgColor = {
    warning: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
    info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    success: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800',
    critical: 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800'
  };

  const iconColor = {
    warning: 'text-amber-600 dark:text-amber-400',
    info: 'text-blue-600 dark:text-blue-400',
    success: 'text-emerald-600 dark:text-emerald-400',
    critical: 'text-rose-600 dark:text-rose-400'
  };

  const icon = {
    warning: <AlertTriangle size={20} />,
    info: <Globe size={20} />,
    success: <TrendingUp size={20} />,
    critical: <AlertTriangle size={20} />
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`p-4 rounded-xl border ${bgColor[insight.type]} transition-all hover:shadow-md`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${iconColor[insight.type]}`}>
          {icon[insight.type]}
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
            {insight.title}
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            {insight.message}
          </p>
          {insight.action && (
            <button
              onClick={insight.action}
              className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
            >
              Megtekintés →
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const TransactionRow: React.FC<{
  transaction: Transaction;
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
  isMaster?: boolean;
}> = React.memo(({
  transaction,
  selected,
  onSelect,
  onClick,
  onDelete,
  CATEGORIES,
  getCategoryKey,
  formatDate,
  formatMoney,
  getTrCurrency,
  getPeriodLabel,
  isMaster = false
}) => {
  const isIncome = transaction.type === 'income';
  const currency = getTrCurrency(transaction);
  const amount = Math.abs(typeof transaction.amount === 'number' ? transaction.amount : 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={`
        group relative p-4 flex items-center gap-4
        bg-gradient-to-r from-white/50 to-white/30 dark:from-gray-800/50 dark:to-gray-900/30
        border border-gray-100/50 dark:border-gray-700/50
        rounded-xl hover:border-gray-200 dark:hover:border-gray-600
        hover:shadow-md transition-all duration-300
        ${isMaster ? 'border-l-4 border-l-purple-500' : ''}
        ${selected ? 'bg-blue-50/50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700' : ''}
      `}
    >
      {/* Selection Checkbox */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onSelect(transaction.id);
        }}
        className={`
          flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center
          transition-all duration-200
          ${selected
            ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/30'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20'
          }
        `}
      >
        {selected ? <CheckSquare size={18} /> : <Square size={18} />}
      </button>

      {/* Type Icon */}
      <div className={`
        flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center
        ${isIncome
          ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
          : 'bg-gradient-to-br from-rose-500 to-pink-600'
        }
        shadow-lg ${isIncome ? 'shadow-emerald-500/30' : 'shadow-rose-500/30'}
      `}>
        {isIncome ? (
          <ArrowUpRight size={24} className="text-white" />
        ) : (
          <ArrowDownRight size={24} className="text-white" />
        )}
      </div>

      {/* Content */}
      <div
        className="flex-1 min-w-0 cursor-pointer"
        onClick={() => onClick(transaction)}
      >
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold text-gray-900 dark:text-white truncate">
            {transaction.description}
          </h4>
          <span className={`
            text-lg font-bold tabular-nums ml-2
            ${isIncome
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-gray-900 dark:text-gray-100'
            }
          `}>
            {isIncome ? '+' : '−'}{formatMoney(amount, currency)}
          </span>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <CategoryBadge
            catKey={transaction.category}
            CATEGORIES={CATEGORIES}
            getCategoryKey={getCategoryKey}
            size="sm"
          />

          <span className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
            <Calendar size={14} />
            {formatDate(transaction.date)}
          </span>

          {transaction.period !== 'oneTime' && (
            <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs font-medium">
              <Repeat size={12} />
              {getPeriodLabel(transaction.period)}
            </span>
          )}

          {isMaster && (
            <span className="px-2 py-1 rounded-full bg-gradient-to-r from-purple-500/10 to-pink-500/10 text-purple-700 dark:text-purple-400 text-xs font-medium border border-purple-200 dark:border-purple-800">
              Sablon
            </span>
          )}

          {transaction.interestRate && transaction.interestRate > 0 && (
            <span className="px-2 py-1 rounded-full bg-gradient-to-r from-amber-500/10 to-orange-500/10 text-amber-700 dark:text-amber-400 text-xs font-medium border border-amber-200 dark:border-amber-800">
              {transaction.interestRate}% kamat
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClick(transaction);
          }}
          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
          title="Szerkesztés"
        >
          <Square size={18} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(transaction.id);
          }}
          className="p-2 text-gray-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
          title="Törlés"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </motion.div>
  );
});

// ==================== MAIN CONTROLLER HOOK ====================
const useBudgetController = () => {
  const { t, language } = useLanguage();
  const { transactions: rawTransactions, addTransaction, updateTransaction, deleteTransactions } = useData();

  // State
  const [currency, setCurrency] = useState<string>('USD');
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'analytics' | 'planning'>('overview');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showConverter, setShowConverter] = useState(false);
  const [showInsights, setShowInsights] = useState(true);
  const [selectedStat, setSelectedStat] = useState<{
    title: string;
    breakdown: Record<string, number>;
    rect: RectLike
  } | null>(null);

  // Form State
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('expense');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [newTransaction, setNewTransaction] = useState({
    description: '',
    amount: '',
    category: 'other' as CategoryKey,
    currency: 'USD',
    period: 'oneTime' as TransactionPeriod,
    date: toYMDLocal(new Date()),
    recurring: false,
    interestRate: ''
  });
  const [addToBalanceImmediately, setAddToBalanceImmediately] = useState(true);

  // Filter State
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showMasters, setShowMasters] = useState(false);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: toYMDLocal(new Date(new Date().getFullYear(), new Date().getMonth(), 1)),
    end: toYMDLocal(new Date(new Date().getFullYear(), 11, 31))
  });

  // Selection & Bulk Actions
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<false | 'selected' | 'all' | 'period'>(false);

  // Analytics
  const [projectionYears, setProjectionYears] = useState(1);
  const [viewCurrency, setViewCurrency] = useState<string>('USD');

  // Cache formatters
  const formatterCache = useRef<Map<string, Intl.NumberFormat>>(new Map());

  // Process transactions
  const transactions = useMemo(() => {
    if (!Array.isArray(rawTransactions)) return [];
    return rawTransactions
      .filter(t => t && typeof t === 'object' && t.id)
      .map(t => ({ ...t }));
  }, [rawTransactions]);

  // Get formatter
  const getFormatter = useCallback((currencyCode: string): Intl.NumberFormat => {
    const key = `${language}-${currencyCode}`;
    if (!formatterCache.current.has(key)) {
      formatterCache.current.set(key, new Intl.NumberFormat(
        language === 'hu' ? 'hu-HU' : 'en-US',
        {
          style: 'currency',
          currency: currencyCode,
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }
      ));
    }
    return formatterCache.current.get(key)!;
  }, [language]);

  // Format money
  const formatMoney = useCallback((amount: number, currencyOverride?: string): string => {
    const safeAmount = Number.isFinite(amount) ? amount : 0;
    const targetCurrency = validateCurrency(currencyOverride || currency);
    return getFormatter(targetCurrency).format(safeAmount);
  }, [currency, getFormatter]);

  // Format date
  const formatDate = useCallback((date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '—';

    return new Intl.DateTimeFormat(
      language === 'hu' ? 'hu-HU' : 'en-US',
      {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        weekday: 'short'
      }
    ).format(d);
  }, [language]);

  // Safe convert
  const safeConvert = useCallback((amount: number, fromCurrency: string, toCurrency: string): number => {
    if (!amount || fromCurrency === toCurrency) return amount;

    try {
      return CurrencyService.convert(amount, fromCurrency, toCurrency);
    } catch (error) {
      console.warn('Conversion failed:', error);
      return amount; // Fallback to original amount
    }
  }, []);

  // Get category key
  // Get category key
  const isCategoryKey = (v: string): v is CategoryKey =>
    ['software', 'marketing', 'office', 'travel', 'service', 'freelance', 'other'].includes(v);

  const getCategoryKey = useCallback((cat: string): CategoryKey => {
    return isCategoryKey(cat) ? cat : 'other';
  }, []);

  // Initialize Currency Service safely
  useEffect(() => {
    const initCurrency = async () => {
      try {
        if (CurrencyService && typeof CurrencyService.fetchRealTimeRates === 'function') {
          const promise = CurrencyService.fetchRealTimeRates();
          if (promise && typeof promise.then === 'function') {
            await promise.catch(e => console.warn('Currency init warning:', e));
          }
        }
      } catch (e) {
        console.warn('Currency init failed:', e);
      }
    };
    initCurrency();
  }, []);

  // Get transaction currency
  const getTrCurrency = useCallback((tr: Transaction): string => {
    return (tr.currency && typeof tr.currency === 'string') ? tr.currency : currency;
  }, [currency]);

  // Categories with icons
  const CATEGORIES = useMemo((): CategoriesMap => ({
    software: {
      color: '#3b82f6',
      label: t('budget.software') || 'Software',
      icon: <CreditCard size={14} />
    },
    marketing: {
      color: '#8b5cf6',
      label: t('budget.marketing') || 'Marketing',
      icon: <TrendingUp size={14} />
    },
    office: {
      color: '#06b6d4',
      label: t('budget.office') || 'Office',
      icon: <Building size={14} />
    },
    travel: {
      color: '#f59e0b',
      label: t('budget.travel') || 'Travel',
      icon: <Globe size={14} />
    },
    service: {
      color: '#10b981',
      label: t('budget.service') || 'Service',
      icon: <RefreshCcw size={14} />
    },
    freelance: {
      color: '#6366f1',
      label: t('budget.freelance') || 'Freelance',
      icon: <User size={14} />
    },
    other: {
      color: '#9ca3af',
      label: t('budget.other') || 'Other',
      icon: <Square size={14} />
    }
  }), [t, language]);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    let filtered = showMasters
      ? transactions
      : transactions.filter(t => t.kind !== 'master');

    // Apply category filter
    if (filterCategory !== 'all') {
      filtered = filtered.filter(t => t.category === filterCategory);
    }

    // Apply search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(t =>
        t.description?.toLowerCase().includes(term) ||
        t.category?.toLowerCase().includes(term) ||
        String(t.amount).includes(term)
      );
    }

    // Apply date range
    filtered = filtered.filter(t => {
      const date = new Date(t.date);
      const start = new Date(dateRange.start);
      const end = new Date(dateRange.end);
      return date >= start && date <= end;
    });

    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, showMasters, filterCategory, searchTerm, dateRange]);

  // Get period label
  const getPeriodLabel = useCallback((p: TransactionPeriod): string => {
    const labels: Record<TransactionPeriod, string> = {
      daily: t('budget.daily') || 'Daily',
      weekly: t('budget.weekly') || 'Weekly',
      monthly: t('budget.monthly') || 'Monthly',
      yearly: t('budget.yearly') || 'Yearly',
      oneTime: t('budget.oneTime') || 'One-time',
    };
    return labels[p] || labels.oneTime;
  }, [t]);

  // Analytics using custom hook
  const analyticsTransactions = useMemo(() => {
    return showMasters ? transactions : transactions.filter(t => t.kind !== 'master');
  }, [transactions, showMasters]);

  const analytics = useBudgetAnalytics(
    analyticsTransactions,
    viewCurrency,
    safeConvert,
    projectionYears
  );

  // Generate financial insights
  const financialInsights = useMemo<FinancialInsight[]>(() => {
    const insights: FinancialInsight[] = [];

    // Check for high expenses
    if (analytics.totalExpense > analytics.totalIncome * 0.8) {
      insights.push({
        id: 'high-expense',
        type: 'warning',
        title: 'Magas kiadások',
        message: 'A kiadásaid meghaladják a bevételeid 80%-át. Fontold meg a költségcsökkentést.',
        action: () => setActiveTab('analytics')
      });
    }

    // Check for upcoming recurring payments
    const upcomingRecurring = transactions.filter(t =>
      t.recurring &&
      new Date(t.date) > new Date() &&
      new Date(t.date) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    );

    if (upcomingRecurring.length > 0) {
      insights.push({
        id: 'upcoming-recurring',
        type: 'info',
        title: 'Közelgő ismétlődő tranzakciók',
        message: `${upcomingRecurring.length} tranzakció jön létre a következő 7 napban.`,
        action: () => {
          setActiveTab('transactions');
          setFilterCategory('all');
          setShowMasters(true); // Reveal hidden recurring templates
        }
      });
    }

    // Check for savings opportunity
    if (analytics.balance > analytics.totalIncome * 0.3) {
      insights.push({
        id: 'savings-opportunity',
        type: 'success',
        title: 'Megtakarítási lehetőség',
        message: 'Jelenlegi egyenleged lehetővé teszi a megtakarításokat. Fontold meg a befektetési lehetőségeket.',
        action: () => setActiveTab('planning')
      });
    }

    return insights;
  }, [analytics, transactions]);

  // Handlers
  const handleAddTransaction = async () => {
    if (!newTransaction.description.trim() || !newTransaction.amount) {
      return;
    }

    const amount = parseMoneyInput(newTransaction.amount);
    if (!Number.isFinite(amount)) {
      alert(t('budget.invalidAmount') || 'Invalid amount');
      return;
    }

    const transactionData = {
      description: newTransaction.description.trim(),
      amount: transactionType === 'income' ? Math.abs(amount) : -Math.abs(amount),
      category: newTransaction.category,
      currency: newTransaction.currency,
      date: newTransaction.date,
      period: newTransaction.period,
      recurring: newTransaction.period !== 'oneTime',
      type: transactionType,
      interestRate: newTransaction.interestRate ? parseFloat(newTransaction.interestRate) : undefined
    };

    try {
      if (editingTransaction) {
        await updateTransaction(editingTransaction.id, transactionData);
      } else {
        await addTransaction(transactionData);

        // Auto-expand date range if needed
        const newDate = new Date(transactionData.date);
        const currentEnd = new Date(dateRange.end);
        const currentStart = new Date(dateRange.start);

        if (newDate > currentEnd) {
          setDateRange(prev => ({ ...prev, end: transactionData.date }));
        } else if (newDate < currentStart) {
          setDateRange(prev => ({ ...prev, start: transactionData.date }));
        }

        // Ensure we are on transactions tab
        setActiveTab('transactions');
      }

      // Reset form
      setNewTransaction({
        description: '',
        amount: '',
        category: 'other',
        currency: currency,
        period: 'oneTime',
        date: toYMDLocal(new Date()),
        recurring: false,
        interestRate: ''
      });
      setEditingTransaction(null);
      setShowAddModal(false);
    } catch (error) {
      console.error('Failed to save transaction:', error);
      // alert(t('budget.saveError') || 'Failed to save transaction');
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedTransactions.size === 0) return;

    try {
      await deleteTransactions(Array.from(selectedTransactions));
      setSelectedTransactions(new Set());
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Failed to delete transactions:', error);
      alert(t('budget.deleteError') || 'Failed to delete transactions');
    }
  };

  const openAddModal = (type: 'income' | 'expense') => {
    setTransactionType(type);
    setEditingTransaction(null);
    setNewTransaction({
      description: '',
      amount: '',
      category: 'other',
      currency: currency,
      period: 'oneTime',
      date: toYMDLocal(new Date()),
      recurring: false,
      interestRate: ''
    });
    setShowAddModal(true);
  };

  const openEditModal = (transaction: Transaction) => {
    setTransactionType(transaction.type as 'income' | 'expense');
    setEditingTransaction(transaction);
    setNewTransaction({
      description: transaction.description || '',
      amount: Math.abs(transaction.amount || 0).toString(),
      category: getCategoryKey(transaction.category || 'other'),
      currency: getTrCurrency(transaction),
      period: transaction.period || 'oneTime',
      date: typeof transaction.date === 'string'
        ? transaction.date
        : toYMDLocal(new Date(transaction.date)),
      recurring: !!transaction.recurring,
      interestRate: transaction.interestRate?.toString() || ''
    });
    setShowAddModal(true);
  };

  // Export data
  const exportData = () => {
    const dataStr = JSON.stringify(filteredTransactions, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const exportFileDefaultName = `budget-export-${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  return {
    // State
    t,
    currency,
    setCurrency,
    activeTab,
    setActiveTab,
    showAddModal,
    setShowAddModal,
    showConverter,
    setShowConverter,
    showInsights,
    setShowInsights,
    selectedStat,
    setSelectedStat,
    transactionType,
    newTransaction,
    setNewTransaction,
    editingTransaction,
    addToBalanceImmediately,
    setAddToBalanceImmediately,
    filterCategory,
    setFilterCategory,
    searchTerm,
    setSearchTerm,
    showMasters,
    setShowMasters,
    dateRange,
    setDateRange,
    selectedTransactions,
    setSelectedTransactions,
    showDeleteConfirm,
    setShowDeleteConfirm,
    projectionYears,
    setProjectionYears,
    viewCurrency,
    setViewCurrency,

    // Data
    transactions: filteredTransactions,
    analytics,
    financialInsights,
    CATEGORIES,

    // Functions
    formatMoney,
    formatDate,
    getCategoryKey,
    getTrCurrency,
    getPeriodLabel,
    handleAddTransaction,
    openAddModal,
    openEditModal,
    handleDeleteSelected,
    exportData,

    // Selection helpers
    selectAll: () => {
      setSelectedTransactions(new Set(filteredTransactions.map(t => t.id)));
    },
    clearSelection: () => {
      setSelectedTransactions(new Set());
    }
  };
};

// ==================== MAIN COMPONENT ====================
const BudgetView: React.FC = () => {
  const ctrl = useBudgetController();
  const { t } = ctrl;

  // Chart data
  const categoryChartData = useMemo(() => {
    return Object.entries(ctrl.analytics.categoryTotals || {}).map(([key, value]) => ({
      name: ctrl.CATEGORIES[ctrl.getCategoryKey(key)]?.label || key,
      value: Math.abs(Number(value) || 0),
      color: ctrl.CATEGORIES[ctrl.getCategoryKey(key)]?.color || '#9ca3af',
      fill: `${ctrl.CATEGORIES[ctrl.getCategoryKey(key)]?.color}30`
    }));
  }, [ctrl.analytics.categoryTotals, ctrl.CATEGORIES, ctrl.getCategoryKey]);

  const cashFlowChartData = useMemo(() => {
    return (ctrl.analytics.cashFlowData || []).map((item: any) => ({
      name: item.month,
      income: Number(item.income) || 0,
      expense: Math.abs(Number(item.expense) || 0),
      balance: Number(item.balance) || 0
    }));
  }, [ctrl.analytics.cashFlowData]);

  const projectionChartData = useMemo(() => {
    return (ctrl.analytics.projectionData || []).map((item: any) => ({
      name: item.month,
      projected: Number(item.projected) || 0,
      optimistic: Number(item.optimistic) || 0,
      pessimistic: Number(item.pessimistic) || 0
    }));
  }, [ctrl.analytics.projectionData]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 p-4 md:p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/30">
                <Wallet size={28} className="text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {t('budget.title')}
                </h1>
                <p className="text-gray-500 dark:text-gray-400">
                  {t('budget.subtitle')}
                </p>
              </div>
            </div>

            {/* Currency Selector */}
            <div className="flex items-center gap-3 mt-4">
              <div className="relative group">
                <select
                  value={ctrl.currency}
                  onChange={(e) => ctrl.setCurrency(e.target.value)}
                  className="pl-10 pr-8 py-2 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none appearance-none cursor-pointer"
                >
                  {AVAILABLE_CURRENCIES.map(c => (
                    <option key={c.code} value={c.code}>
                      {c.code} ({c.symbol}) - {c.name}
                    </option>
                  ))}
                </select>
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              </div>

              <button
                onClick={() => ctrl.setShowConverter(true)}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all flex items-center gap-2"
              >
                <RefreshCcw size={18} />
                {t('budget.converter')}
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => ctrl.openAddModal('income')}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-emerald-500/25 transition-all flex items-center gap-2"
                >
                  <TrendingUp size={18} />
                  {t('budget.addIncome')}
                </button>
                <button
                  onClick={() => ctrl.openAddModal('expense')}
                  className="px-4 py-2 bg-gradient-to-r from-rose-500 to-pink-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-rose-500/25 transition-all flex items-center gap-2"
                >
                  <TrendingDown size={18} />
                  {t('budget.addExpense')}
                </button>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {ctrl.formatMoney(ctrl.analytics.totalIncome)}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {t('budget.income')}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                {ctrl.formatMoney(ctrl.analytics.totalExpense)}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {t('budget.expense')}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {ctrl.formatMoney(ctrl.analytics.balance)}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {t('budget.balance')}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl p-1 border border-gray-200/50 dark:border-gray-700/50">
          {(['overview', 'transactions', 'analytics', 'planning'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => ctrl.setActiveTab(tab)}
              className={`
                flex-1 px-6 py-3 rounded-xl font-semibold transition-all
                ${ctrl.activeTab === tab
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700/50'
                }
              `}
            >
              {t(`budget.${tab}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto">
        {/* Financial Insights */}
        {ctrl.showInsights && ctrl.financialInsights.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Finanszírozási bepillantások
              </h3>
              <button
                onClick={() => ctrl.setShowInsights(false)}
                className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ctrl.financialInsights.map(insight => (
                <FinancialInsightCard key={insight.id} insight={insight} />
              ))}
            </div>
          </motion.div>
        )}

        {/* Overview Tab */}
        {ctrl.activeTab === 'overview' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* Main Stats */}
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
              <StatCard
                title="Havi cash flow"
                value={ctrl.formatMoney(ctrl.analytics.monthlyCashFlow)}
                icon={<TrendingUp size={24} />}
                color="from-blue-500 to-cyan-500"
                trend={{ value: 12, label: '+12%' }}
              />
              <StatCard
                title="Átlagos havi kiadás"
                value={ctrl.formatMoney(ctrl.analytics.averageMonthlyExpense)}
                icon={<TrendingDown size={24} />}
                color="from-rose-500 to-pink-500"
                trend={{ value: -5, label: '-5%' }}
              />
              <StatCard
                title="Megtakarítási ráta"
                value={`${Number.isFinite(ctrl.analytics.savingsRate) ? Math.round(ctrl.analytics.savingsRate) : 0}%`}
                subtitle="Bevételeid százaléka"
                icon={<Wallet size={24} />}
                color="from-emerald-500 to-teal-500"
              />
              <StatCard
                title="Tartalékok (hónapok)"
                value={Number.isFinite(ctrl.analytics.runwayMonths) ? Math.round(ctrl.analytics.runwayMonths).toString() : '0'}
                subtitle="Hónapok a jelenlegi ütemezéssel"
                icon={<Calendar size={24} />}
                color="from-amber-500 to-orange-500"
              />
            </div>

            {/* Category Breakdown */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Kiadások kategóriánként
              </h3>
              <div className="space-y-4">
                {categoryChartData
                  .sort((a, b) => b.value - a.value)
                  .slice(0, 5)
                  .map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {item.name}
                        </span>
                      </div>
                      <span className="font-bold text-gray-900 dark:text-white">
                        {ctrl.formatMoney(item.value)}
                      </span>
                    </div>
                  ))}
              </div>
              <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={categoryChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {categoryChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => ctrl.formatMoney(Number(value))}
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            <div className="lg:col-span-3 bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl overflow-hidden">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                Cash Flow Kimutatás
              </h3>
              <div className="h-80 min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={cashFlowChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                    <XAxis
                      dataKey="name"
                      stroke="#9ca3af"
                      fontSize={12}
                    />
                    <YAxis
                      stroke="#9ca3af"
                      fontSize={12}
                      tickFormatter={(value) => ctrl.formatMoney(value).replace(/\s/g, '')}
                    />
                    <Tooltip
                      formatter={(value) => [ctrl.formatMoney(Number(value)), '']}
                      labelFormatter={(label) => `Hónap: ${label}`}
                    />
                    <Area
                      type="monotone"
                      dataKey="income"
                      stackId="1"
                      stroke="#10b981"
                      fill="#10b981"
                      fillOpacity={0.3}
                      name="Bevételek"
                    />
                    <Area
                      type="monotone"
                      dataKey="expense"
                      stackId="1"
                      stroke="#ef4444"
                      fill="#ef4444"
                      fillOpacity={0.3}
                      name="Kiadások"
                    />
                    <Line
                      type="monotone"
                      dataKey="balance"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={false}
                      name="Egyenleg"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            {/* Recent Transactions List */}
            <div className="lg:col-span-3 bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Legutóbbi tranzakciók
                </h3>
                <button
                  onClick={() => ctrl.setActiveTab('transactions')}
                  className="text-sm text-blue-600 dark:text-blue-400 font-medium hover:underline"
                >
                  Összes megtekintése →
                </button>
              </div>
              <div className="space-y-3">
                {ctrl.transactions.slice(0, 5).map(transaction => (
                  <TransactionRow
                    key={transaction.id}
                    transaction={transaction}
                    selected={false}
                    onSelect={() => { }}
                    onClick={() => ctrl.openEditModal(transaction)}
                    onDelete={() => { }} // Read-only in overview
                    CATEGORIES={ctrl.CATEGORIES}
                    getCategoryKey={ctrl.getCategoryKey}
                    formatDate={ctrl.formatDate}
                    formatMoney={ctrl.formatMoney}
                    getTrCurrency={ctrl.getTrCurrency}
                    getPeriodLabel={ctrl.getPeriodLabel}
                    isMaster={transaction.kind === 'master'}
                  />
                ))}
                {ctrl.transactions.length === 0 && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    Nincsenek tranzakciók ebben az időszakban.
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Transactions Tab */}
        {ctrl.activeTab === 'transactions' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl">
              <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="Keresés tranzakciókban..."
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                    value={ctrl.searchTerm}
                    onChange={(e) => ctrl.setSearchTerm(e.target.value)}
                  />
                </div>

                {/* Filter Group */}
                <div className="flex flex-wrap gap-3">
                  <select
                    className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                    value={ctrl.filterCategory}
                    onChange={(e) => ctrl.setFilterCategory(e.target.value)}
                  >
                    <option value="all">Összes kategória</option>
                    {Object.entries(ctrl.CATEGORIES).map(([key, cat]) => (
                      <option key={key} value={key}>{cat.label}</option>
                    ))}
                  </select>

                  <button
                    onClick={() => ctrl.setShowMasters(!ctrl.showMasters)}
                    className={`px-4 py-3 rounded-xl border transition-all ${ctrl.showMasters
                      ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white border-transparent'
                      : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                  >
                    {ctrl.showMasters ? 'Sablonok mutatása' : 'Sablonok elrejtése'}
                  </button>

                  <button
                    onClick={ctrl.exportData}
                    className="px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl hover:shadow-lg hover:shadow-emerald-500/25 transition-all flex items-center gap-2"
                  >
                    <Download size={18} />
                    Export
                  </button>
                </div>
              </div>

              {/* Date Range */}
              <div className="flex gap-4 mt-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Dátumtartomány
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      className="flex-1 px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl"
                      value={ctrl.dateRange.start}
                      onChange={(e) => ctrl.setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    />
                    <input
                      type="date"
                      className="flex-1 px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl"
                      value={ctrl.dateRange.end}
                      onChange={(e) => ctrl.setDateRange(prev => ({ ...prev, end: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Bulk Actions */}
                {ctrl.selectedTransactions.size > 0 && (
                  <div className="flex items-end">
                    <div className="flex gap-2">
                      <button
                        onClick={() => ctrl.setShowDeleteConfirm('selected')}
                        className="px-4 py-2 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-xl hover:shadow-lg hover:shadow-rose-500/25 transition-all"
                      >
                        Törlés ({ctrl.selectedTransactions.size})
                      </button>
                      <button
                        onClick={ctrl.clearSelection}
                        className="px-4 py-2 bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
                      >
                        Kijelölés törlése
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Transactions List */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
              {ctrl.transactions.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
                    <Search size={24} className="text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Nincs tranzakció
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-6">
                    Kezdj el hozzáadni tranzakciókat a fenti gombokkal
                  </p>
                  <button
                    onClick={() => ctrl.openAddModal('expense')}
                    className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all"
                  >
                    Első tranzakció hozzáadása
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {ctrl.transactions.map(transaction => (
                    <TransactionRow
                      key={transaction.id}
                      transaction={transaction}
                      selected={ctrl.selectedTransactions.has(transaction.id)}
                      onSelect={ctrl.setSelectedTransactions}
                      onClick={ctrl.openEditModal}
                      onDelete={() => {
                        ctrl.setSelectedTransactions(new Set([transaction.id]));
                        ctrl.setShowDeleteConfirm('selected');
                      }}
                      CATEGORIES={ctrl.CATEGORIES}
                      getCategoryKey={ctrl.getCategoryKey}
                      formatDate={ctrl.formatDate}
                      formatMoney={ctrl.formatMoney}
                      getTrCurrency={ctrl.getTrCurrency}
                      getPeriodLabel={ctrl.getPeriodLabel}
                      isMaster={transaction.kind === 'master'}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Analytics Tab */}
        {ctrl.activeTab === 'analytics' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            {/* Spending Trends */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                Kiadási trendek
              </h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cashFlowChartData.slice(-6)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                    <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                    <YAxis
                      stroke="#9ca3af"
                      fontSize={12}
                      tickFormatter={(value) => ctrl.formatMoney(value).replace(/\s/g, '')}
                    />
                    <Tooltip
                      formatter={(value) => [ctrl.formatMoney(Number(value)), '']}
                    />
                    <Bar dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Category Distribution */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                Kategória eloszlás
              </h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={categoryChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      innerRadius={40}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {categoryChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => ctrl.formatMoney(Number(value))}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Monthly Comparison */}
            <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                Havi összehasonlítás
              </h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={cashFlowChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                    <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                    <YAxis
                      stroke="#9ca3af"
                      fontSize={12}
                      tickFormatter={(value) => ctrl.formatMoney(value).replace(/\s/g, '')}
                    />
                    <Tooltip
                      formatter={(value) => [ctrl.formatMoney(Number(value)), '']}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="income"
                      stroke="#10b981"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="expense"
                      stroke="#ef4444"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="balance"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      strokeDasharray="5 5"
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </motion.div>
        )}

        {/* Planning Tab */}
        {ctrl.activeTab === 'planning' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {/* Projection Settings */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Pénzügyi előrejelzés
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    Projekció a jövőbeli cash flow-ra
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Projekció hossza:
                    </span>
                    <select
                      className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl"
                      value={ctrl.projectionYears}
                      onChange={(e) => ctrl.setProjectionYears(Number(e.target.value))}
                    >
                      {[1, 2, 3, 5].map(year => (
                        <option key={year} value={year}>
                          {year} év
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Nézet pénzneme:
                    </span>
                    <select
                      className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl"
                      value={ctrl.viewCurrency}
                      onChange={(e) => ctrl.setViewCurrency(e.target.value)}
                    >
                      {AVAILABLE_CURRENCIES.map(c => (
                        <option key={c.code} value={c.code}>
                          {c.code}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Projection Chart */}
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={projectionChartData}>
                    <defs>
                      <linearGradient id="colorProjected" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorOptimistic" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorPessimistic" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                    <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                    <YAxis
                      stroke="#9ca3af"
                      fontSize={12}
                      tickFormatter={(value) => ctrl.formatMoney(Number(value)).replace(/\s/g, '')}
                    />
                    <Tooltip
                      formatter={(value) => [ctrl.formatMoney(Number(value)), '']}
                      labelFormatter={(label) => `Hónap: ${label}`}
                    />
                    <Area
                      type="monotone"
                      dataKey="pessimistic"
                      stroke="#ef4444"
                      fillOpacity={1}
                      fill="url(#colorPessimistic)"
                      name="Pesszimista"
                    />
                    <Area
                      type="monotone"
                      dataKey="projected"
                      stroke="#3b82f6"
                      fillOpacity={1}
                      fill="url(#colorProjected)"
                      name="Várható"
                    />
                    <Area
                      type="monotone"
                      dataKey="optimistic"
                      stroke="#10b981"
                      fillOpacity={1}
                      fill="url(#colorOptimistic)"
                      name="Optimista"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Projection Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="p-4 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-xl border border-emerald-500/20">
                  <div className="text-sm text-emerald-600 dark:text-emerald-400 font-semibold mb-1">
                    Optimista forgatókönyv
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {ctrl.formatMoney(projectionChartData[projectionChartData.length - 1]?.optimistic || 0)}
                  </div>
                </div>
                <div className="p-4 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-xl border border-blue-500/20">
                  <div className="text-sm text-blue-600 dark:text-blue-400 font-semibold mb-1">
                    Várható forgatókönyv
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {ctrl.formatMoney(projectionChartData[projectionChartData.length - 1]?.projected || 0)}
                  </div>
                </div>
                <div className="p-4 bg-gradient-to-r from-rose-500/10 to-pink-500/10 rounded-xl border border-rose-500/20">
                  <div className="text-sm text-rose-600 dark:text-rose-400 font-semibold mb-1">
                    Pesszimista forgatókönyv
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {ctrl.formatMoney(projectionChartData[projectionChartData.length - 1]?.pessimistic || 0)}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Currency Converter Modal */}
      <CurrencyConverter
        isOpen={ctrl.showConverter}
        onClose={() => ctrl.setShowConverter(false)}
        baseCurrency={ctrl.currency}
        onCurrencyChange={ctrl.setCurrency}
      />

      {/* Add/Edit Transaction Modal */}
      <AnimatePresence>
        {ctrl.showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-lg bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-3xl shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className={`p-6 ${ctrl.transactionType === 'income'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600'
                : 'bg-gradient-to-r from-rose-500 to-pink-600'
                }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-white/20">
                      {ctrl.transactionType === 'income' ?
                        <TrendingUp size={24} className="text-white" /> :
                        <TrendingDown size={24} className="text-white" />
                      }
                    </div>
                    <h2 className="text-2xl font-bold text-white">
                      {ctrl.editingTransaction
                        ? (ctrl.transactionType === 'income' ? 'Bevétel szerkesztése' : 'Kiadás szerkesztése')
                        : (ctrl.transactionType === 'income' ? 'Új bevétel' : 'Új kiadás')
                      }
                    </h2>
                  </div>
                  <button
                    onClick={() => ctrl.setShowAddModal(false)}
                    className="p-2 hover:bg-white/20 rounded-xl transition-colors"
                  >
                    <X size={24} className="text-white" />
                  </button>
                </div>
              </div>

              {/* Form */}
              <div className="p-6 space-y-6">
                {/* Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Összeg
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={ctrl.newTransaction.amount}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9.,]/g, '');
                        ctrl.setNewTransaction(prev => ({ ...prev, amount: val }));
                      }}
                      className="w-full px-4 py-3 text-2xl font-bold bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                      placeholder="0.00"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <select
                        value={ctrl.newTransaction.currency}
                        onChange={(e) => ctrl.setNewTransaction(prev => ({ ...prev, currency: e.target.value }))}
                        className="px-3 py-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium outline-none"
                      >
                        {AVAILABLE_CURRENCIES.map(c => (
                          <option key={c.code} value={c.code}>
                            {c.code}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Leírás
                  </label>
                  <input
                    type="text"
                    value={ctrl.newTransaction.description}
                    onChange={(e) => ctrl.setNewTransaction(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    placeholder="Pl. Áruház vásárlás"
                  />
                </div>

                {/* Category & Date */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Kategória
                    </label>
                    <select
                      value={ctrl.newTransaction.category}
                      onChange={(e) => ctrl.setNewTransaction(prev => ({ ...prev, category: e.target.value as CategoryKey }))}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    >
                      {Object.entries(ctrl.CATEGORIES).map(([key, cat]) => (
                        <option key={key} value={key}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Dátum
                    </label>
                    <input
                      type="date"
                      value={ctrl.newTransaction.date}
                      onChange={(e) => ctrl.setNewTransaction(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Frequency */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Gyakoriság
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['oneTime', 'monthly', 'yearly'] as const).map(period => (
                      <button
                        key={period}
                        type="button"
                        onClick={() => ctrl.setNewTransaction(prev => ({
                          ...prev,
                          period,
                          recurring: period !== 'oneTime'
                        }))}
                        className={`px-4 py-3 rounded-xl border transition-all ${ctrl.newTransaction.period === period
                          ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white border-transparent'
                          : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                          }`}
                      >
                        {ctrl.getPeriodLabel(period)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Interest Rate (for recurring) */}
                {ctrl.newTransaction.recurring && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Éves kamatláb (%)
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={ctrl.newTransaction.interestRate}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9.,]/g, '');
                        ctrl.setNewTransaction(prev => ({ ...prev, interestRate: val }));
                      }}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                      placeholder="0.00"
                    />
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gradient-to-r from-gray-50/50 to-white/50 dark:from-gray-800/50 dark:to-gray-900/50">
                <div className="flex justify-between">
                  <button
                    onClick={() => ctrl.setShowAddModal(false)}
                    className="px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    Mégse
                  </button>
                  <button
                    onClick={ctrl.handleAddTransaction}
                    className={`px-6 py-3 font-semibold rounded-xl hover:shadow-lg transition-all ${ctrl.transactionType === 'income'
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:shadow-emerald-500/25'
                      : 'bg-gradient-to-r from-rose-500 to-pink-600 text-white hover:shadow-rose-500/25'
                      }`}
                  >
                    {ctrl.editingTransaction ? 'Mentés' : 'Hozzáadás'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {ctrl.showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
                  <AlertTriangle size={32} className="text-rose-600 dark:text-rose-400" />
                </div>
                <h3 className="text-xl font-bold text-center text-gray-900 dark:text-white mb-2">
                  Biztosan törlöd?
                </h3>
                <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
                  {ctrl.showDeleteConfirm === 'selected'
                    ? `${ctrl.selectedTransactions.size} tranzakció törlődik. Ez a művelet nem vonható vissza.`
                    : 'Minden tranzakció törlődik. Ez a művelet nem vonható vissza.'}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => ctrl.setShowDeleteConfirm(false)}
                    className="flex-1 px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    Mégse
                  </button>
                  <button
                    onClick={ctrl.handleDeleteSelected}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-rose-500 to-pink-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-rose-500/25 transition-all"
                  >
                    Törlés
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Helper component for User icon
const User: React.FC<{ size: number }> = ({ size }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

export default BudgetView;