import React, { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Area,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ComposedChart,
} from "recharts";
import {
  Plus,
  TrendingUp,
  Wallet,
  RefreshCcw,
  Search,
  X,
  Trash2,
  ArrowRightLeft,
  Sparkles,
  Check,
  Loader2,
  Download,
  BarChart3,
  Calendar,
  Target,
  Bell,
  Settings,
  MoreVertical,
  Tag as TagIcon,
  TrendingDown,
  Zap,
  Star,
  History,
  FileText,
  BellRing,
  PieChart as PieChartIcon,
  ShoppingBag as ShoppingBagIcon
} from "lucide-react";

// Context imports
import { useLanguage } from "../../contexts/LanguageContext";
import { useData } from "../../contexts/DataContext";
import { AVAILABLE_CURRENCIES } from "../../constants/currencyData";
import { CurrencyService } from "../../services/CurrencyService";
import { useBudgetAnalytics } from "./useBudgetAnalytics";
import CurrencyConverterModal from "./CurrencyConverterModal";

/* -------------------------------------------------------------------------------------------------
  ENHANCED PREMIUM REDESIGN WITH NEW FEATURES:
  1. Advanced Analytics Dashboard
  2. Transaction Tags & Labels
  3. Budget Goals & Targets
  4. Export/Import Functionality
  5. Dark/Light Theme Support
  6. Quick Actions Panel
  7. Notification Center
  8. Recurring Transaction Manager
  9. Performance Optimizations
  10. Responsive Design Improvements
-------------------------------------------------------------------------------------------------- */

/* -------------------------------- Enhanced Types -------------------------------- */

type TransactionType = "income" | "expense";
type TransactionPeriod = "oneTime" | "daily" | "weekly" | "monthly" | "yearly";
type TransactionStatus = "pending" | "completed" | "cancelled";
type PriorityLevel = "low" | "medium" | "high";

export type BudgetTransaction = {
  id: string;
  createdAtISO: string;
  effectiveDateYMD: string;
  description: string;
  type: TransactionType;
  amount: number;
  currency: string;
  category: CategoryKey;
  period: TransactionPeriod;
  isMaster: boolean;
  time?: string;
  notes?: string;
  tags: string[];
  status: TransactionStatus;
  priority: PriorityLevel;
  attachmentUrl?: string;
  location?: string;
  reminderId?: string;
  // Compatibility fields for useBudgetAnalytics
  date: Date | string;
  kind?: 'master' | 'history';
  recurring?: boolean;
};

type TransactionPatch = Partial<Omit<BudgetTransaction, "id" | "createdAtISO">>;
type BalanceMode = "realizedOnly" | "includeScheduled";
type ViewMode = "cards" | "list" | "compact";
type ChartType = "area" | "bar" | "radar";

type CategoryKey =
  | "software" | "marketing" | "office" | "travel" | "service"
  | "freelance" | "other" | "food" | "transport" | "entertainment"
  | "health" | "education" | "shopping" | "investment";

type CategoryDef = {
  label: string;
  color: string;
  bg: string;
  border: string;
  icon: ReactNode;
};

type BudgetGoal = {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadlineYMD: string;
  category: CategoryKey;
  currency: string;
  isCompleted: boolean;
};

type Notification = {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "success" | "error";
  timestamp: string;
  read: boolean;
  action?: () => void;
};

/* -------------------------------- Enhanced Utils -------------------------------- */

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

const tmpId = () => `tmp-${Date.now()}-${Math.random().toString(16).slice(2)}`;

// Date utilities
const pad2 = (n: number) => String(n).padStart(2, "0");

function toYMDLocal(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function parseYMD(ymd: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  if (Number.isNaN(dt.getTime())) return null;
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
  return dt;
}

// Formatting utilities
function formatCurrency(amount: number, currency: string, language: string): string {
  const formatter = new Intl.NumberFormat(language === "hu" ? "hu-HU" : "en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return formatter.format(amount);
}

function getContrastColor(hexColor: string): string {
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128 ? "#000000" : "#ffffff";
}

/* -------------------------------- Premium UI Components -------------------------------- */

const GlassCard: React.FC<{
  children: React.ReactNode;
  className?: string;
  hoverEffect?: boolean;
  gradient?: boolean;
}> = ({ children, className, hoverEffect = true, gradient = false }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className={cx(
      "rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl",
      "shadow-[0_8px_32px_rgba(0,0,0,0.36)]",
      gradient && "bg-gradient-to-br from-blue-500/10 to-purple-500/10",
      hoverEffect && "hover:shadow-[0_16px_64px_rgba(0,0,0,0.48)] hover:border-white/20 transition-all duration-300",
      className
    )}
  >
    {children}
  </motion.div>
);

const GradientButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary" | "danger" | "success" | "ghost";
    size?: "sm" | "md" | "lg";
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    fullWidth?: boolean;
    gradient?: boolean;
  }
> = ({
  variant = "primary",
  size = "md",
  leftIcon,
  rightIcon,
  fullWidth = false,
  gradient = true,
  className,
  children,
  ...props
}) => {
    const base = "inline-flex items-center justify-center gap-2 rounded-2xl font-bold transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none";

    const variants = {
      primary: gradient
        ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-[0_8px_32px_rgba(59,130,246,0.32)] hover:shadow-[0_12px_48px_rgba(59,130,246,0.48)]"
        : "bg-blue-600 text-white shadow-lg hover:bg-blue-700",
      secondary: "bg-white/10 text-white border border-white/20 hover:bg-white/20",
      danger: "bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-[0_8px_32px_rgba(244,63,94,0.32)]",
      success: "bg-gradient-to-r from-emerald-600 to-green-600 text-white",
      ghost: "bg-transparent text-white/80 hover:text-white hover:bg-white/10",
    };

    const sizes = {
      sm: "px-3 py-2 text-sm",
      md: "px-5 py-3 text-sm",
      lg: "px-6 py-4 text-base",
    };

    return (
      <button
        className={cx(base, variants[variant], sizes[size], fullWidth && "w-full", className)}
        {...props}
      >
        {leftIcon}
        {children}
        {rightIcon}
      </button>
    );
  };

const AnimatedInput: React.FC<
  React.InputHTMLAttributes<HTMLInputElement> & {
    label?: string;
    error?: string;
    success?: boolean;
  }
> = ({ label, error, success, className, ...props }) => (
  <div className="relative">
    {label && (
      <label className="block mb-2 text-sm font-bold text-white/80">
        {label}
      </label>
    )}
    <input
      className={cx(
        "w-full rounded-2xl border-2 px-4 py-3 bg-white/[0.06] text-white font-semibold",
        "placeholder:text-white/40 outline-none transition-all duration-200",
        "focus:border-blue-400/60 focus:ring-2 focus:ring-blue-400/30",
        error ? "border-rose-400/50" : success ? "border-emerald-400/50" : "border-white/20",
        className
      )}
      {...props}
    />
    {error && (
      <motion.p
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-2 text-xs text-rose-300 font-medium"
      >
        {error}
      </motion.p>
    )}
  </div>
);

const Tag: React.FC<{
  label: string;
  color?: string;
  removable?: boolean;
  onRemove?: () => void;
}> = ({ label, color = "#3b82f6", removable = false, onRemove }) => (
  <span
    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold"
    style={{
      backgroundColor: `${color}20`,
      color: getContrastColor(color),
      border: `1px solid ${color}40`
    }}
  >
    {label}
    {removable && (
      <button
        onClick={onRemove}
        className="ml-1 hover:opacity-70 transition-opacity"
      >
        <X size={12} />
      </button>
    )}
  </span>
);

const StatCard: React.FC<{
  title: string;
  value: string;
  change?: number;
  icon: React.ReactNode;
  color: "blue" | "green" | "red" | "purple" | "yellow";
  trend?: "up" | "down" | "neutral";
}> = ({ title, value, icon, color }) => {
  const colors = {
    blue: "from-blue-500/20 to-blue-600/20",
    green: "from-emerald-500/20 to-emerald-600/20",
    red: "from-rose-500/20 to-rose-600/20",
    purple: "from-purple-500/20 to-purple-600/20",
    yellow: "from-amber-500/20 to-amber-600/20",
  };

  return (
    <GlassCard>
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-bold text-white/60 mb-2">{title}</p>
            <p className="text-2xl font-black text-white">{value}</p>

          </div>
          <div className={`p-3 rounded-2xl bg-gradient-to-br ${colors[color]}`}>
            {icon}
          </div>
        </div>
      </div>
    </GlassCard>
  );
};

/* -------------------------------- Enhanced Chart Components -------------------------------- */

const EnhancedChartFrame: React.FC<{
  children: (dimensions: { width: number; height: number }) => ReactNode;
  height?: number;
  title?: string;
  className?: string;
}> = ({ children, height = 320, title, className }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height });

  useEffect(() => {
    if (!ref.current) return;

    let rafId: number;
    const observer = new ResizeObserver(() => {
      // Debounce with requestAnimationFrame to prevent "ResizeObserver loop limit exceeded"
      // and ensure dimensions are non-zero (or at least safe)
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        setDimensions({
          width: Math.max(320, Math.floor(rect.width)), // Minimum width to prevent Recharts -1 error
          height: Math.max(220, Math.floor(rect.height)), // Minimum height
        });
      });
    });

    observer.observe(ref.current);

    // Initial measure
    rafId = requestAnimationFrame(() => {
      if (ref.current) {
        const rect = ref.current.getBoundingClientRect();
        setDimensions({
          width: Math.max(320, Math.floor(rect.width)),
          height: Math.max(220, Math.floor(rect.height)),
        });
      }
    });

    return () => {
      observer.disconnect();
      cancelAnimationFrame(rafId);
    };
  }, [height]);

  return (
    <GlassCard className={className}>
      {title && (
        <div className="px-6 pt-5 pb-3 border-b border-white/10">
          <h3 className="text-lg font-black text-white">{title}</h3>
        </div>
      )}
      <div ref={ref} style={{ height }} className="relative overflow-hidden">
        {dimensions.width > 0 && dimensions.height > 0 ? (
          children(dimensions)
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-white/40">
              <Loader2 className="animate-spin mx-auto mb-2" size={24} />
              <p className="text-sm font-medium">Chart loading...</p>
            </div>
          </div>
        )}
      </div>
    </GlassCard>
  );
};

interface TooltipPayload {
  name?: string;
  dataKey?: string;
  value?: number;
  color?: string;
  payload?: any;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
  currency: string;
  language: string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label, currency, language }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1e293b]/95 backdrop-blur-sm border border-white/10 rounded-2xl p-4 shadow-2xl z-50">
        <p className="text-sm font-bold text-white/80 mb-2">{label}</p>
        {payload.map((entry: TooltipPayload, index: number) => (
          <div key={index} className="flex items-center justify-between gap-4 mb-1 last:mb-0">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm font-medium text-white/70">
                {entry.name || entry.dataKey}
              </span>
            </div>
            <span className="text-sm font-bold text-white">
              {formatCurrency(entry.value || 0, currency, language || "en-US")}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

/* -------------------------------- Enhanced Budget Engine -------------------------------- */

const useEnhancedBudgetEngine = () => {
  // Language context
  const { t, language } = useLanguage();

  // Data context
  const dataContext = useData();

  // State
  // localTransactions removed - using DataContext as source of truth
  const [currency, setCurrency] = useState("USD");
  const [balanceMode, setBalanceMode] = useState<BalanceMode>("realizedOnly");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [activeChart, setActiveChart] = useState<ChartType>("area");
  const [budgetGoals, setBudgetGoals] = useState<BudgetGoal[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = window.localStorage.getItem('budget_notifications');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Welcome notification effect to avoid t dependency on init
  useEffect(() => {
    if (notifications.length > 0) return;
    const welcomeId = `welcome-${Date.now()}`;
    setNotifications([{
      id: welcomeId,
      title: t?.('notifications.welcome') || "Welcome to Budget Pro!",
      message: t?.('notifications.getStarted') || "Start by adding your first transaction",
      type: "info",
      timestamp: new Date().toISOString(),
      read: false,
    }]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  // Persist notifications
  useEffect(() => {
    localStorage.setItem('budget_notifications', JSON.stringify(notifications));
  }, [notifications]);

  // Today's date (Moved up to fix use before declaration)
  const todayYMD = useMemo(() => toYMDLocal(new Date()), []);

  // Categories with enhanced data
  const categories = useMemo<Record<CategoryKey, CategoryDef>>(() => ({
    software: {
      label: t?.('categories.software') || "Software",
      color: "#60a5fa",
      bg: "rgba(96,165,250,0.15)",
      border: "rgba(96,165,250,0.3)",
      icon: <Zap size={16} />
    },
    marketing: {
      label: t?.('categories.marketing') || "Marketing",
      color: "#c084fc",
      bg: "rgba(192,132,252,0.15)",
      border: "rgba(192,132,252,0.3)",
      icon: <Target size={16} />
    },
    office: {
      label: t?.('categories.office') || "Office",
      color: "#22d3ee",
      bg: "rgba(34,211,238,0.15)",
      border: "rgba(34,211,238,0.3)",
      icon: <FileText size={16} />
    },
    travel: {
      label: t?.('categories.travel') || "Travel",
      color: "#fbbf24",
      bg: "rgba(251,191,36,0.15)",
      border: "rgba(251,191,36,0.3)",
      icon: <Calendar size={16} />
    },
    service: {
      label: t?.('categories.service') || "Service",
      color: "#34d399",
      bg: "rgba(52,211,153,0.15)",
      border: "rgba(52,211,153,0.3)",
      icon: <Settings size={16} />
    },
    freelance: {
      label: t?.('categories.freelance') || "Freelance",
      color: "#38bdf8",
      bg: "rgba(56,189,248,0.15)",
      border: "rgba(56,189,248,0.3)",
      icon: <TrendingUp size={16} />
    },
    food: {
      label: t?.('categories.food') || "Food",
      color: "#fb7185",
      bg: "rgba(251,113,133,0.15)",
      border: "rgba(251,113,133,0.3)",
      icon: <TagIcon size={16} />
    },
    transport: {
      label: t?.('categories.transport') || "Transport",
      color: "#f97316",
      bg: "rgba(249,115,22,0.15)",
      border: "rgba(249,115,22,0.3)",
      icon: <ArrowRightLeft size={16} />
    },
    entertainment: {
      label: t?.('categories.entertainment') || "Entertainment",
      color: "#8b5cf6",
      bg: "rgba(139,92,246,0.15)",
      border: "rgba(139,92,246,0.3)",
      icon: <Sparkles size={16} />
    },
    health: {
      label: t?.('categories.health') || "Health",
      color: "#10b981",
      bg: "rgba(16,185,129,0.15)",
      border: "rgba(16,185,129,0.3)",
      icon: <Bell size={16} />
    },
    education: {
      label: t?.('categories.education') || "Education",
      color: "#6366f1",
      bg: "rgba(99,102,241,0.15)",
      border: "rgba(99,102,241,0.3)",
      icon: <History size={16} />
    },
    shopping: {
      label: t?.('categories.shopping') || "Shopping",
      color: "#ec4899",
      bg: "rgba(236,72,153,0.15)",
      border: "rgba(236,72,153,0.3)",
      icon: <ShoppingBagIcon size={16} />
    },
    investment: {
      label: t?.('categories.investment') || "Investment",
      color: "#14b8a6",
      bg: "rgba(20,184,166,0.15)",
      border: "rgba(20,184,166,0.3)",
      icon: <TrendingUp size={16} />
    },
    other: {
      label: t?.('categories.other') || "Other",
      color: "#94a3b8",
      bg: "rgba(148,163,184,0.15)",
      border: "rgba(148,163,184,0.3)",
      icon: <MoreVertical size={16} />
    },
  }), [t]);

  // Merge transactions from context and local state
  // FIX: Using DataContext as single source of truth
  const transactions = dataContext?.transactions || [];

  // Filter/transform for UI consumption (safe dates & type mapping)

  const safeCategory = useCallback((c: any): CategoryKey =>
    (c && typeof c === "string" && c in categories ? c : "other") as CategoryKey, [categories]);

  const safeYMD = useCallback((s: any): string => {
    if (typeof s === "string") {
      const ymd = s.slice(0, 10);
      return parseYMD(ymd) ? ymd : todayYMD;
    }

    if (s instanceof Date && !Number.isNaN(s.getTime())) {
      return toYMDLocal(s);
    }

    // Support if Date was serialized to object with toISOString
    if (s && typeof s === "object" && typeof (s as any).toISOString === "function") {
      const iso = (s as any).toISOString();
      const ymd = String(iso).slice(0, 10);
      return parseYMD(ymd) ? ymd : todayYMD;
    }

    return todayYMD;
  }, [todayYMD]);

  // Robust Normalization for UI
  const uiTransactions = useMemo(() => {
    return (transactions ?? []).map((t: any) => {
      const effectiveDateYMD = safeYMD(t.effectiveDateYMD ?? t.date);
      return {
        id: String(t.id ?? tmpId()),
        createdAtISO: String(t.createdAtISO ?? new Date().toISOString()),
        effectiveDateYMD,
        description: String(t.description ?? ""),
        type: t.type === "income" ? "income" : "expense",
        amount: Number(t.amount ?? 0),
        currency: String(t.currency ?? "USD"),
        category: safeCategory(t.category),
        period: (t.period ?? "oneTime") as TransactionPeriod,
        isMaster: Boolean(t.kind === "master" || t.isMaster),
        time: t.time,
        notes: t.notes,
        tags: Array.isArray(t.tags) ? t.tags : [],
        status: (t.status ?? "completed") as TransactionStatus,
        priority: (t.priority ?? "medium") as PriorityLevel,
        attachmentUrl: t.attachmentUrl,
        location: t.location,
        reminderId: t.reminderId,
        // Compat fields
        date: t.date ?? effectiveDateYMD,
        kind: t.kind,
        recurring: Boolean(t.recurring),
      } as BudgetTransaction;
    });
  }, [transactions, safeCategory, safeYMD]);

  // Balance calculations using filtered transactions based on balanceMode
  const visibleTransactions = useMemo(() => {
    if (balanceMode === "includeScheduled") return uiTransactions;
    const today = parseYMD(todayYMD)?.getTime() ?? Date.now();
    return uiTransactions.filter(tx => {
      const dt = parseYMD(tx.effectiveDateYMD)?.getTime() ?? today;
      return dt <= today && tx.status !== "cancelled";
    });
  }, [uiTransactions, balanceMode, todayYMD]);

  // Today's date removed from here (moved up)

  // Balance calculations
  // --- INTEGRATED ANALYTICS ENGINE (PhD Refactor) ---
  const {
    totalIncome,
    totalExpense,
    balance,
    categoryTotals,
    projectionData,
    cashFlowData
  } = useBudgetAnalytics(
    visibleTransactions as any[],
    currency,
    (amount, from, to) => CurrencyService.convert(amount, from, to),
    1
  );

  // Map hook data to view requirements
  const balanceStats = useMemo(() => ({
    income: totalIncome,
    expense: totalExpense,
    balance: balance,
    pendingIncome: 0,
    pendingExpense: 0
  }), [totalIncome, totalExpense, balance]);

  const monthNames = useMemo(() => [
    t('months.january') || 'Jan', t('months.february') || 'Feb', t('months.march') || 'Mar', t('months.april') || 'Apr',
    t('months.may') || 'May', t('months.june') || 'Jun', t('months.july') || 'Jul', t('months.august') || 'Aug',
    t('months.september') || 'Sep', t('months.october') || 'Oct', t('months.november') || 'Nov', t('months.december') || 'Dec'
  ], [t]);

  // Map projection data - UNIFIED: Historical + Future
  const cashFlowProjection = useMemo(() => {
    const result: { month: string; income: number; expense: number; balance: number }[] = [];

    // PART 1: Historical data (past 6 months from cashFlowData)
    // Calculate running balance backward from current balance
    let runningBalance = balance;
    const historicalReversed = [...cashFlowData].reverse(); // Most recent first
    const historicalWithBalance: { monthIndex: number; year: number; income: number; expense: number; balance: number }[] = [];

    for (const h of historicalReversed) {
      // Balance BEFORE this month = current balance - net of this month
      historicalWithBalance.unshift({
        ...h,
        balance: runningBalance
      });
      runningBalance -= (h.income - h.expense); // Go backward in time
    }

    // Add historical months to result
    for (const h of historicalWithBalance) {
      const yStr = String(h.year).slice(2);
      result.push({
        month: `${monthNames[h.monthIndex]} '${yStr}`,
        income: h.income,
        expense: h.expense,
        balance: h.balance
      });
    }

    // PART 2: Future projection data
    for (const p of projectionData) {
      let name = "";
      if (p.monthIndex !== null && p.monthIndex !== undefined) {
        const yStr = String(p.year).slice(2);
        name = `${monthNames[p.monthIndex]} '${yStr}`;
      } else {
        name = String(p.year);
      }
      result.push({
        month: name,
        income: p.income,
        expense: p.expense,
        balance: p.balance
      });
    }

    return result;
  }, [projectionData, cashFlowData, monthNames, balance]);

  const analytics = useMemo(() => {
    const mappedCategories: Record<CategoryKey, { total: number; count: number }> = {} as any;
    Object.keys(categories).forEach(k => {
      mappedCategories[k as CategoryKey] = { total: 0, count: 0 };
    });

    if (categoryTotals) {
      Object.entries(categoryTotals).forEach(([cat, total]) => {
        const key = cat as CategoryKey;
        if (mappedCategories[key]) {
          mappedCategories[key].total = total;
          mappedCategories[key].count = 0;
        }
      });
    }

    return {
      monthlyData: cashFlowProjection, // <--- FIXED: Now using the unified projection
      categoryBreakdown: mappedCategories,
      weeklyTrend: [],
      topTransactions: [...uiTransactions]
        .sort((a, b) => {
          const dateA = a.effectiveDateYMD ? parseYMD(a.effectiveDateYMD) : new Date(0);
          const dateB = b.effectiveDateYMD ? parseYMD(b.effectiveDateYMD) : new Date(0);
          return (dateB?.getTime() || 0) - (dateA?.getTime() || 0);
        }),
      totalSavings: totalIncome - totalExpense,
      avgTransactionValue: uiTransactions.length > 0 ? (totalIncome + totalExpense) / uiTransactions.length : 0,
      transactionCount: uiTransactions.length
    };
  }, [categoryTotals, totalIncome, totalExpense, categories, uiTransactions, cashFlowProjection]);

  // Export functionality
  const exportData = useCallback((format: 'json' | 'csv' | 'pdf') => {
    // FIX: Usage of uiTransactions ensures we have safe fields and respect the current valid list.
    const data = {
      transactions: uiTransactions.map(tx => ({
        ...tx,
        // Keep numeric amount for re-import
      })),
      analytics,
      balanceStats,
      exportDate: new Date().toISOString(),
    };

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `budget-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (format === 'csv') {
      const headers = [
        "id", "createdAtISO", "effectiveDateYMD", "time", "description", "type", "amount", "currency", "category", "period", "status", "priority", "tags", "notes"
      ];

      const rows = uiTransactions.map(tx => ([
        tx.id,
        tx.createdAtISO,
        tx.effectiveDateYMD,
        tx.time ?? "",
        (tx.description ?? "").replace(/"/g, '""'),
        tx.type,
        String(tx.amount),
        tx.currency,
        tx.category,
        tx.period,
        tx.status,
        tx.priority,
        (tx.tags ?? []).join("|"),
        (tx.notes ?? "").replace(/"/g, '""'),
      ]));

      const csv = [
        headers.join(","),
        ...rows.map(r => r.map(v => `"${String(v)}"`).join(",")),
      ].join("\n");

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `budget-export-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
    // Add PDF export logic here
  }, [uiTransactions, analytics, balanceStats, language]);



  // Add notification
  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      timestamp: new Date().toISOString(),
      read: false,
      ...notification,
      id: tmpId(),
    };
    setNotifications(prev => [newNotification, ...prev]);
  }, []);

  // Mark notification as read
  const markAsRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  }, []);

  // Clear all notifications
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Import functionality - SAFE
  const importData = useCallback((jsonData: any) => {
    try {
      if (!jsonData || !jsonData.transactions || !Array.isArray(jsonData.transactions)) {
        addNotification({
          title: t('import.error'),
          message: t('import.invalidFormat'),
          type: "error"
        });
        return;
      }

      // Safe import loop
      let importedCount = 0;
      for (const raw of jsonData.transactions) {
        // Strip sensitive/system fields to prevent collisions
        const { id, createdAtISO, ...rest } = raw ?? {};

        if (dataContext?.addTransaction) {
          dataContext.addTransaction({
            ...rest,
            createdAtISO: new Date().toISOString(), // Fresh timestamp
          } as any);
          importedCount++;
        }
      }

      if (importedCount > 0) {
        addNotification({
          title: t('import.success'),
          message: `${t('import.imported')} (${importedCount})`,
          type: "success"
        });
      }
    } catch (error) {
      console.error("Import failed", error);
    }
  }, [dataContext, t, addNotification]);

  // Add transaction with enhanced features
  const addTransaction = useCallback((transaction: Omit<BudgetTransaction, 'id' | 'createdAtISO'>) => {
    const payload = {
      ...transaction,
      createdAtISO: new Date().toISOString(),
    };

    // Use DataContext instead of local state
    if (dataContext?.addTransaction) {
      dataContext.addTransaction(payload as any);
    }

    // Add notification for large transactions
    if (Math.abs(transaction.amount) > 5000) {
      addNotification({
        title: t?.('notifications.largeTransaction') || "Large Transaction Added",
        message: `${transaction.description} - ${formatCurrency(Math.abs(transaction.amount), transaction.currency, language)}`,
        type: transaction.amount > 0 ? "success" : "warning",
      });
    }
  }, [addNotification, t, language, dataContext]);

  // Update transaction
  const updateTransaction = useCallback((id: string, updates: TransactionPatch) => {
    if (dataContext?.updateTransaction) {
      dataContext.updateTransaction(id, updates);
    }
  }, [dataContext]);

  // Delete transaction
  const deleteTransaction = useCallback((id: string) => {
    if (dataContext?.deleteTransaction) {
      dataContext.deleteTransaction(id);
    }
  }, [dataContext]);

  // Bulk delete
  const deleteTransactions = useCallback((ids: string[]) => {
    if (dataContext?.deleteTransactions) {
      dataContext.deleteTransactions(ids);
    }
  }, [dataContext]);

  // Add budget goal
  const addBudgetGoal = useCallback((goal: Omit<BudgetGoal, 'id'>) => {
    const newGoal: BudgetGoal = {
      ...goal,
      id: tmpId(),
    };
    setBudgetGoals(prev => [...prev, newGoal]);
    return newGoal;
  }, []);

  // Update budget goal
  const updateBudgetGoal = useCallback((id: string, updates: Partial<BudgetGoal>) => {
    setBudgetGoals(prev =>
      prev.map(goal =>
        goal.id === id ? { ...goal, ...updates } : goal
      )
    );
  }, []);

  return {
    // State
    currency,
    setCurrency,
    balanceMode,
    setBalanceMode,
    viewMode,
    setViewMode,
    activeChart,
    setActiveChart,
    budgetGoals,
    setBudgetGoals,
    notifications,

    // Data
    transactions: uiTransactions, // Expose normalized transactions as secondary source if needed, but prefer uiTransactions
    uiTransactions,            // <--- NEW: Normalized Safe Transactions
    visibleTransactions,       // <--- NEW: Filtered by balance mode
    categories,
    todayYMD,

    // Stats
    balanceStats,
    analytics,
    cashFlowProjection,

    // Actions
    addTransaction,
    updateTransaction,
    deleteTransaction,
    deleteTransactions,
    addBudgetGoal,
    updateBudgetGoal,
    addNotification,
    markAsRead,
    clearNotifications,
    exportData,
    importData,

    // Utils
    formatCurrency: (amount: number, curr?: string) =>
      formatCurrency(amount, curr || currency, language),
    formatDate: (ymd: string) => {
      const date = parseYMD(ymd);
      if (!date) return "—";
      return new Intl.DateTimeFormat(language === "hu" ? "hu-HU" : "en-US", {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(date);
    },

    // Language
    t: t || ((key: string) => key),
    language,
  };
};

/* -------------------------------- Enhanced Modals -------------------------------- */

const EnhancedTransactionModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  transaction?: BudgetTransaction;
  engine: ReturnType<typeof useEnhancedBudgetEngine>;
  presetType?: TransactionType;
}> = ({ isOpen, onClose, mode, transaction, engine, presetType = "expense" }) => {
  const { t, categories, todayYMD } = engine;

  const [form, setForm] = useState({
    description: "",
    amount: "",
    currency: engine.currency,
    category: "other" as CategoryKey,
    date: todayYMD,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    type: presetType as TransactionType,
    period: "oneTime" as TransactionPeriod,
    tags: [] as string[],
    notes: "",
    priority: "medium" as PriorityLevel,
  });

  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    if (mode === "edit" && transaction) {
      setForm({
        description: transaction.description,
        amount: Math.abs(transaction.amount).toString(),
        currency: transaction.currency,
        category: transaction.category,
        date: transaction.effectiveDateYMD,
        time: transaction.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: transaction.type,
        period: transaction.period,
        tags: transaction.tags || [],
        notes: transaction.notes || "",
        priority: transaction.priority || "medium",
        // Force priority valid
      });
    } else {
      setForm({
        description: "",
        amount: "",
        currency: engine.currency,
        category: "other",
        date: todayYMD,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: presetType,
        period: "oneTime",
        tags: [],
        notes: "",
        priority: "medium",
      });
    }
  }, [mode, transaction, engine.currency, todayYMD, presetType, isOpen]); // Added isOpen to reset on open

  const handleSubmit = () => {
    const amount = parseFloat(form.amount);
    if (!form.description.trim() || isNaN(amount) || amount <= 0) {
      engine.addNotification({
        title: t('notifications.validationError') || 'Validation Error',
        message: t('notifications.pleaseCheckFields') || 'Please fill all required fields',
        type: "error",
      });
      return;
    }

    const transactionData = {
      description: form.description.trim(),
      amount: form.type === "income" ? Math.abs(amount) : -Math.abs(amount),
      currency: form.currency,
      category: form.category,
      effectiveDateYMD: form.date,
      time: form.time,
      type: form.type,
      period: form.period,
      tags: form.tags,
      notes: form.notes.trim() || undefined,
      priority: form.priority,
      isMaster: false,
      status: "completed" as TransactionStatus,
      // Fix for new Type requirement
      date: form.date,
      kind: 'history' as const, // Default for manual entry
      recurring: false
    };

    if (mode === "edit" && transaction) {
      engine.updateTransaction(transaction.id, transactionData);
    } else {
      engine.addTransaction(transactionData);
    }

    onClose();
  };

  const addTag = () => {
    if (tagInput.trim() && !form.tags.includes(tagInput.trim())) {
      setForm(prev => ({ ...prev, tags: [...prev.tags, tagInput.trim()] }));
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setForm(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-2xl rounded-3xl bg-gradient-to-b from-gray-900 to-gray-950 border border-white/10 shadow-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-white">
              {mode === "edit"
                ? t('transactions.editTransaction') || 'Edit Transaction'
                : t('transactions.newTransaction') || 'New Transaction'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-white/10 transition-colors"
            >
              <X size={20} className="text-white/60" />
            </button>
          </div>
        </div>

        <div className="p-6 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-white/80 mb-2">
                  {t('transactions.description') || 'Description'}
                </label>
                <AnimatedInput
                  value={form.description}
                  onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder={t('transactions.descriptionPlaceholder') || 'Example: Client Payment'}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-white/80 mb-2">
                  {t('transactions.amount')}
                </label>
                <div className="flex gap-3">
                  <AnimatedInput
                    type="number"
                    value={form.amount}
                    onChange={(e) => setForm(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="0.00"
                    className="flex-1"
                  />
                  <select
                    value={form.currency}
                    onChange={(e) => setForm(prev => ({ ...prev, currency: e.target.value }))}
                    className="px-4 py-3 rounded-2xl border-2 border-white/20 bg-white/[0.06] text-white font-bold outline-none"
                  >
                    {AVAILABLE_CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>{c.code}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-white/80 mb-2">
                  {t('transactions.category')}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(categories).slice(0, 6).map(([key, cat]) => (
                    <button
                      key={key}
                      onClick={() => setForm(prev => ({ ...prev, category: key as CategoryKey }))}
                      className={`p-3 rounded-2xl border-2 transition-all ${form.category === key
                        ? 'border-white/40 bg-white/10'
                        : 'border-white/10 hover:border-white/20'
                        }`}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <div style={{ color: cat.color }}>{cat.icon}</div>
                        <span className="text-xs font-bold text-white/80">{cat.label}</span>
                      </div>
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      // Show more categories
                    }}
                    className="p-3 rounded-2xl border-2 border-white/10 hover:border-white/20 transition-all"
                  >
                    <div className="flex flex-col items-center gap-1">
                      <MoreVertical size={16} className="text-white/60" />
                      <span className="text-xs font-bold text-white/60">More</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-white/80 mb-2">
                  {t('transactions.dateTime')}
                </label>
                <div className="flex gap-3">
                  <AnimatedInput
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm(prev => ({ ...prev, date: e.target.value }))}
                    className="flex-1"
                  />
                  <AnimatedInput
                    type="time"
                    value={form.time}
                    onChange={(e) => setForm(prev => ({ ...prev, time: e.target.value }))}
                    className="w-32"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-white/80 mb-2">
                  {t('transactions.type')}
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setForm(prev => ({ ...prev, type: "income" }))}
                    className={`flex-1 p-3 rounded-2xl border-2 transition-all ${form.type === "income"
                      ? 'border-emerald-400/50 bg-emerald-500/10 text-emerald-100'
                      : 'border-white/10 hover:border-white/20'
                      }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <TrendingUp size={16} />
                      <span className="font-bold">{t('transactions.income')}</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setForm(prev => ({ ...prev, type: "expense" }))}
                    className={`flex-1 p-3 rounded-2xl border-2 transition-all ${form.type === "expense"
                      ? 'border-rose-400/50 bg-rose-500/10 text-rose-100'
                      : 'border-white/10 hover:border-white/20'
                      }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <TrendingDown size={16} />
                      <span className="font-bold">{t('transactions.expense')}</span>
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-white/80 mb-2">
                  {t('transactions.tags')}
                </label>
                <div className="flex gap-2 mb-2">
                  <AnimatedInput
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                    placeholder={t('transactions.addTag')}
                    className="flex-1"
                  />
                  <GradientButton
                    onClick={addTag}
                    variant="secondary"
                    size="lg"
                  >
                    <Plus size={16} />
                  </GradientButton>
                </div>
                <div className="flex flex-wrap gap-2">
                  {form.tags.map(tag => (
                    <Tag
                      key={tag}
                      label={tag}
                      removable
                      onRemove={() => removeTag(tag)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Additional Fields */}
          <div className="mt-6 space-y-6">
            <div>
              <label className="block text-sm font-bold text-white/80 mb-2">
                {t('transactions.notes')}
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder={t('transactions.notesPlaceholder')}
                className="w-full h-24 px-4 py-3 rounded-2xl border-2 border-white/20 bg-gray-800 text-white font-semibold placeholder:text-white/40 outline-none focus:border-blue-400/60 resize-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-white/80 mb-2">
                  {t('transactions.period')}
                </label>
                <select
                  value={form.period}
                  onChange={(e) => setForm(prev => ({ ...prev, period: e.target.value as TransactionPeriod }))}
                  className="w-full px-4 py-3 rounded-2xl border-2 border-white/20 bg-white/[0.06] text-white font-bold outline-none"
                >
                  <option value="oneTime">{t('period.oneTime')}</option>
                  <option value="daily">{t('period.daily')}</option>
                  <option value="weekly">{t('period.weekly')}</option>
                  <option value="monthly">{t('period.monthly')}</option>
                  <option value="yearly">{t('period.yearly')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-white/80 mb-2">
                  {t('transactions.priority')}
                </label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm(prev => ({ ...prev, priority: e.target.value as PriorityLevel }))}
                  className="w-full px-4 py-3 rounded-2xl border-2 border-white/20 bg-white/[0.06] text-white font-bold outline-none"
                >
                  <option value="low">{t('priority.low')}</option>
                  <option value="medium">{t('priority.medium')}</option>
                  <option value="high">{t('priority.high')}</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-white/10">
          <div className="flex gap-3">
            <GradientButton
              onClick={onClose}
              variant="ghost"
              fullWidth
            >
              {t('common.cancel')}
            </GradientButton>
            <GradientButton
              onClick={handleSubmit}
              variant="primary"
              fullWidth
              leftIcon={<Check size={16} />}
            >
              {mode === 'edit' ? t('transactions.actions.update') : t('transactions.actions.save')}
            </GradientButton>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

/* -------------------------------- Main Enhanced Component -------------------------------- */

const EnhancedBudgetView: React.FC = () => {
  const engine = useEnhancedBudgetEngine();
  const { t, balanceStats, analytics, cashFlowProjection, notifications } = engine;

  const [activeTab, setActiveTab] = useState<"dashboard" | "transactions" | "analytics" | "goals" | "settings">("dashboard");
  const [searchQuery, setSearchQuery] = useState("");


  // ... inside component ...

  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showConverterModal, setShowConverterModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<BudgetTransaction | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);

  const unreadNotifications = useMemo(
    () => notifications.filter(n => !n.read).length,
    [notifications]
  );

  // Quick actions
  // Quick Action Handlers
  const [presetType, setPresetType] = useState<TransactionType>("expense");

  const quickActions = [
    {
      label: t('quickActions.addExpense'),
      icon: <TrendingDown size={18} />,
      color: "rose",
      action: () => {
        setPresetType("expense");
        setEditingTransaction(null);
        setShowTransactionModal(true);
      }
    },
    {
      label: t('quickActions.addIncome'),
      icon: <TrendingUp size={18} />,
      color: "emerald",
      action: () => {
        setPresetType("income");
        setEditingTransaction(null);
        setShowTransactionModal(true);
      }
    },
    {
      label: t('quickActions.export'),
      icon: <Download size={18} />,
      color: "purple",
      action: () => engine.exportData("json")
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto p-4 md:p-6">
        {/* Header */}
        <header className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-[0_8px_32px_rgba(59,130,246,0.3)]">
                <Wallet size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-black bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                  {t('app.title') || "Budget Pro"}
                </h1>
                <p className="text-white/60 font-medium">
                  {t('app.subtitle') || "Advanced financial management"}
                </p>
              </div>
              <div className="hidden md:flex items-center gap-2">
                <span className="px-3 py-1.5 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-400/30 text-sm font-bold">
                  PREMIUM
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Currency Selector */}
              <select
                value={engine.currency}
                onChange={(e) => engine.setCurrency(e.target.value)}
                className="px-4 py-2.5 rounded-2xl border border-white/20 bg-white/5 text-white font-bold outline-none"
              >
                {AVAILABLE_CURRENCIES.map(c => (
                  <option key={c.code} value={c.code} className="bg-gray-900 text-white">{c.code}</option>
                ))}
              </select>

              {/* Currency Converter */}
              <button
                onClick={() => setShowConverterModal(true)}
                className="p-2.5 rounded-2xl border border-white/20 bg-white/5 hover:bg-white/10 transition-colors"
                title="Currency Converter"
              >
                <RefreshCcw size={20} className="text-white" />
              </button>

              {/* Notifications */}
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2.5 rounded-2xl border border-white/20 bg-white/5 hover:bg-white/10 transition-colors"
              >
                <Bell size={20} className="text-white" />
                {unreadNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-xs font-bold flex items-center justify-center">
                    {unreadNotifications}
                  </span>
                )}
              </button>

              {/* Quick Add */}
              <GradientButton
                onClick={() => {
                  setPresetType("expense"); // Default to expense for quick add
                  setEditingTransaction(null);
                  setShowTransactionModal(true);
                }}
                leftIcon={<Plus size={16} />}
              >
                {t('transactions.add')}
              </GradientButton>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex flex-wrap gap-2 border-b border-white/10 pb-2">
            {[
              { id: "dashboard", label: t('tabs.dashboard') || 'Dashboard', icon: <BarChart3 size={16} /> },
              { id: "transactions", label: t('tabs.transactions') || 'Transactions', icon: <FileText size={16} /> },
              { id: "analytics", label: t('tabs.analytics') || 'Analytics', icon: <PieChartIcon size={16} /> },
              { id: "goals", label: t('tabs.goals') || 'Goals', icon: <Target size={16} /> },
              { id: "settings", label: t('tabs.settings') || 'Settings', icon: <Settings size={16} /> },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 rounded-2xl font-bold transition-all ${activeTab === tab.id
                  ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-white border border-blue-400/30'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </header>

        {/* Main Content */}
        <main>
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  title={t('stats.balance')}
                  value={engine.formatCurrency(balanceStats.balance)}
                  icon={<Wallet size={20} />}
                  color="blue"
                />
                <StatCard
                  title={t('stats.income')}
                  value={engine.formatCurrency(balanceStats.income)}
                  icon={<TrendingUp size={20} />}
                  color="green"
                />
                <StatCard
                  title={t('stats.expenses')}
                  value={engine.formatCurrency(balanceStats.expense)}
                  icon={<TrendingDown size={20} />}
                  color="red"
                />
                <StatCard
                  title={t('stats.savings')}
                  value={engine.formatCurrency(analytics.totalSavings)}
                  icon={<Star size={20} />}
                  color="purple"
                />
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Cash Flow Chart */}
                <EnhancedChartFrame
                  title={t('charts.cashFlow')}
                  height={400}
                >
                  {({ width, height }) => (
                    <ResponsiveContainer width={width} height={height}>
                      <ComposedChart data={cashFlowProjection}>
                        <defs>
                          <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis
                          dataKey="month"
                          stroke="rgba(255,255,255,0.4)"
                          tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          stroke="rgba(255,255,255,0.4)"
                          tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(value) => `${value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}`}
                        />
                        <RechartsTooltip content={<CustomTooltip currency={engine.currency} language={engine.language} />} />
                        <Legend iconType="circle" />

                        <Bar dataKey="income" name={t('stats.income')} fill="#10b981" radius={[4, 4, 0, 0]} barSize={8} fillOpacity={0.8} />
                        <Bar dataKey="expense" name={t('stats.expenses')} fill="#f87171" radius={[4, 4, 0, 0]} barSize={8} fillOpacity={0.8} />

                        <Area
                          type="monotone"
                          dataKey="balance"
                          name={t('stats.balance')}
                          stroke="#8b5cf6"
                          strokeWidth={3}
                          fill="url(#colorBalance)"
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  )}
                </EnhancedChartFrame>

                {/* Category Breakdown */}
                <EnhancedChartFrame
                  title={t('charts.categoryBreakdown')}
                  height={400}
                >
                  {({ width, height }) => {
                    const data = Object.entries(analytics.categoryBreakdown)
                      .filter(([_, value]) => value.total > 0)
                      .map(([category, value]) => {
                        const catDef = engine.categories[category as CategoryKey] || engine.categories.other;
                        return {
                          name: catDef.label,
                          value: value.total,
                          color: catDef.color,
                        };
                      })
                      .sort((a, b) => b.value - a.value)
                      .slice(0, 8);

                    return data.length > 0 ? (
                      <ResponsiveContainer width={width} height={height}>
                        <RechartsPieChart>
                          <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {data.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <RechartsTooltip content={<CustomTooltip currency={engine.currency} language={engine.language} />} />
                          <Legend />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-white/40 text-sm font-medium">No data available</p>
                      </div>
                    );
                  }}
                </EnhancedChartFrame>
              </div>

              {/* Quick Actions & Recent Transactions */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Quick Actions */}
                <GlassCard>
                  <div className="p-6">
                    <h3 className="text-lg font-black text-white mb-4">{t('quickActions.title')}</h3>
                    <div className="space-y-3">
                      {quickActions.map((action, index) => {
                        const colorMap: Record<string, { bg: string, border: string, text: string }> = {
                          rose: { bg: 'bg-rose-500/10', border: 'border-rose-400/20', text: 'text-rose-400' },
                          emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-400/20', text: 'text-emerald-400' },
                          purple: { bg: 'bg-purple-500/10', border: 'border-purple-400/20', text: 'text-purple-400' },
                          blue: { bg: 'bg-blue-500/10', border: 'border-blue-400/20', text: 'text-blue-400' },
                        };
                        const style = colorMap[action.color] || colorMap.blue;

                        return (
                          <button
                            key={index}
                            onClick={action.action}
                            className="w-full flex items-center gap-3 p-3 rounded-2xl border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all group"
                          >
                            <div className={`p-2 rounded-xl ${style.bg} border ${style.border} group-hover:scale-110 transition-transform`}>
                              <div className={style.text}>
                                {action.icon}
                              </div>
                            </div>
                            <span className="font-bold text-white/80 group-hover:text-white">
                              {action.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </GlassCard>

                {/* Recent Transactions */}
                <GlassCard className="lg:col-span-2">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-black text-white">{t('transactions.recent')}</h3>
                      <button
                        onClick={() => setActiveTab("transactions")}
                        className="text-sm font-bold text-blue-400 hover:text-blue-300"
                      >
                        {t('transactions.viewAll') || "View All"}
                      </button>
                    </div>
                    <div className="space-y-3">
                      {analytics.topTransactions.slice(0, 5).map((tx) => (
                        <div
                          key={tx.id}
                          className="flex items-center justify-between p-3 rounded-2xl border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all cursor-pointer"
                          onClick={() => {
                            setEditingTransaction(tx);
                            setShowTransactionModal(true);
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl ${tx.type === "income"
                              ? "bg-emerald-500/10 border border-emerald-400/20"
                              : "bg-rose-500/10 border border-rose-400/20"
                              }`}>
                              {tx.type === "income" ?
                                <TrendingUp size={16} className="text-emerald-300" /> :
                                <TrendingDown size={16} className="text-rose-300" />
                              }
                            </div>
                            <div>
                              <p className="font-bold text-white">{tx.description}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Tag
                                  label={engine.categories[tx.category as CategoryKey]?.label || engine.categories.other.label}
                                  color={engine.categories[tx.category as CategoryKey]?.color || engine.categories.other.color}
                                />
                                <span className="text-xs text-white/40">{engine.formatDate(tx.effectiveDateYMD || "")}</span>
                              </div>
                            </div>
                          </div>
                          <div className={`font-black ${tx.type === "income" ? "text-emerald-300" : "text-rose-300"
                            }`}>
                            {tx.type === "income" ? "+" : "-"}{engine.formatCurrency(Math.abs(tx.amount), tx.currency)}
                          </div>
                        </div>
                      ))}
                      {analytics.topTransactions.length === 0 && (
                        <div className="text-center py-8 text-white/40">
                          <p className="text-sm font-medium">{t('transactions.noTransactions') || "No transactions yet"}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </GlassCard>
              </div>
            </div>
          )}

          {activeTab === "transactions" && (
            <div className="space-y-6">
              {/* Transactions Toolbar */}
              <GlassCard>
                <div className="p-4 flex flex-col md:flex-row items-center gap-4">
                  <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={16} />
                    <input
                      type="text"
                      placeholder={t('transactions.searchPlaceholder') || "Search transactions..."}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white font-medium outline-none focus:border-blue-500/50 transition-colors"
                    />
                  </div>
                  <div className="flex items-center gap-2 w-full md:w-auto">
                    <GradientButton
                      onClick={() => { setEditingTransaction(null); setShowTransactionModal(true); }}
                      leftIcon={<Plus size={16} />}
                    >
                      {t('transactions.newTransaction')}
                    </GradientButton>
                  </div>
                </div>
              </GlassCard>

              {/* Transactions List */}
              <div className="space-y-3">
                {engine.uiTransactions
                  .filter(tx => (tx.description || "").toLowerCase().includes(searchQuery.toLowerCase()))
                  .sort((a, b) => {
                    // Safe date comparison using effectiveDateYMD string
                    const dateA = a.effectiveDateYMD ? a.effectiveDateYMD : "1970-01-01";
                    const dateB = b.effectiveDateYMD ? b.effectiveDateYMD : "1970-01-01";
                    return dateB.localeCompare(dateA);
                  })
                  .map(tx => (
                    <GlassCard key={tx.id} className="hover:border-white/20 transition-colors group cursor-pointer">
                      <div className="p-4 flex items-center justify-between" onClick={() => { setEditingTransaction(tx); setShowTransactionModal(true); }}>
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-2xl ${tx.type === 'income' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                            {engine.categories[tx.category as CategoryKey]?.icon || <TagIcon size={20} />}
                          </div>
                          <div>
                            <h4 className="font-bold text-white text-lg">{tx.description}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-xs font-bold px-2 py-0.5 rounded border bg-white/5 border-white/10 text-white/80`}>
                                {engine.categories[tx.category as CategoryKey]?.label || tx.category}
                              </span>
                              <span className="text-xs text-white/40 font-medium">
                                {engine.formatDate(tx.effectiveDateYMD)} {tx.time ? `• ${tx.time}` : ''}
                              </span>
                              {tx.status === 'pending' && (
                                <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400">
                                  {(t('invoicing.pending') || "PENDING").toUpperCase()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <span className={`block font-black text-xl ${tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {tx.type === 'income' ? '+' : '-'}{engine.formatCurrency(Math.abs(tx.amount), tx.currency)}
                            </span>
                            {tx.tags && tx.tags.length > 0 && (
                              <div className="flex gap-1 justify-end mt-1">
                                {tx.tags.slice(0, 2).map(tag => (
                                  <span key={tag} className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded text-white/40">#{tag}</span>
                                ))}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); if (confirm(t('budget.delete.confirmOne'))) engine.deleteTransaction(tx.id); }}
                            className="p-2 hover:bg-rose-500/20 rounded-lg text-white/40 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </GlassCard>
                  ))}

                {engine.uiTransactions.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-white/40 font-medium">{t('budget.noTransactions')}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "analytics" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <EnhancedChartFrame title={t('charts.cashFlow')} height={400}>
                  {({ width, height }) => (
                    <ResponsiveContainer width={width} height={height}>
                      <BarChart data={analytics.monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis dataKey="month" stroke="rgba(255,255,255,0.4)" tick={{ fill: 'rgba(255,255,255,0.6)' }} />
                        <YAxis stroke="rgba(255,255,255,0.4)" tick={{ fill: 'rgba(255,255,255,0.6)' }} />
                        <RechartsTooltip content={<CustomTooltip currency={currency} language={language} />} />
                        <Legend />
                        <Bar dataKey="income" name={t('stats.income')} fill="#10b981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="expense" name={t('stats.expenses')} fill="#f87171" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </EnhancedChartFrame>

                <EnhancedChartFrame title={t('charts.categoryBreakdown')} height={400}>
                  {({ width, height }) => (
                    <ResponsiveContainer width={width} height={height}>
                      <RadarChart data={Object.entries(analytics.categoryBreakdown).slice(0, 6).map(([k, v]) => ({ subject: engine.categories[k as CategoryKey]?.label || k, A: v.total, fullMark: 100 }))}>
                        <PolarGrid stroke="rgba(255,255,255,0.1)" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }} />
                        <PolarRadiusAxis angle={30} stroke="rgba(255,255,255,0.1)" />
                        <Radar name="Expenses" dataKey="A" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                        <RechartsTooltip />
                      </RadarChart>
                    </ResponsiveContainer>
                  )}
                </EnhancedChartFrame>
              </div>
            </div>
          )}

          {activeTab === "goals" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {engine.budgetGoals && engine.budgetGoals.length > 0 ? engine.budgetGoals.map(goal => (
                <GlassCard key={goal.id}>
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className={`p-3 rounded-xl bg-purple-500/10 text-purple-400`}>
                        {engine.categories[goal.category as CategoryKey]?.icon || <Target size={20} />}
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-white/40 font-bold uppercase tracking-wider">{t('goals.target') || "Target"}</p>
                        <p className="text-lg font-black text-white">{engine.formatCurrency(goal.targetAmount)}</p>
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-1">{goal.name}</h3>
                    <span className="text-sm text-white/60 mb-4">{t('tabs.goals')} • {engine.categories[goal.category as CategoryKey]?.label}</span>
                    <div className="relative h-2 bg-white/10 rounded-full overflow-hidden mb-2">
                      <div
                        className="absolute left-0 top-0 h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-1000"
                        style={{ width: `${Math.min((goal.currentAmount / goal.targetAmount) * 100, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs font-medium text-white/40">
                      <span>{Math.round((goal.currentAmount / goal.targetAmount) * 100)}%</span>
                      <span>{engine.formatCurrency(goal.currentAmount)}</span>
                    </div>
                  </div>
                </GlassCard>
              )) : (
                <div className="col-span-full py-12 text-center border-2 border-dashed border-white/10 rounded-3xl">
                  <Target size={48} className="mx-auto text-white/20 mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">{t('goals.noGoals') || "No goals set"}</h3>
                  <p className="text-white/60 mb-6">{t('goals.subtitle') || "Set financial goals to track your progress."}</p>
                  <GradientButton onClick={() => { /* Placeholder for add goal */ }}>
                    {t('quickActions.setGoal')}
                  </GradientButton>
                </div>
              )}
            </div>
          )}

          {activeTab === "settings" && (
            <GlassCard>
              <div className="p-8">
                <h2 className="text-2xl font-black text-white mb-6">{t('tabs.settings')}</h2>

                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <label className="block text-sm font-bold text-white/60 mb-2 uppercase tracking-wider">{t('settings.startCalculation') || "Start Calculation From"}</label>
                      <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/10">
                        <button
                          onClick={() => engine.setBalanceMode('realizedOnly')}
                          className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${engine.balanceMode === 'realizedOnly' ? 'bg-blue-500 text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
                        >
                          {t('settings.realizedOnly') || "Realized Only"}
                        </button>
                        <button
                          onClick={() => engine.setBalanceMode('includeScheduled')}
                          className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${engine.balanceMode === 'includeScheduled' ? 'bg-purple-500 text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
                        >
                          {t('settings.includeScheduled') || "Include Scheduled"}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-white/60 mb-2 uppercase tracking-wider">{t('settings.currency') || "Currency"}</label>
                      <select
                        value={engine.currency}
                        onChange={(e) => engine.setCurrency(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white font-bold outline-none focus:border-blue-500/50"
                      >
                        {AVAILABLE_CURRENCIES.map(c => (
                          <option key={c.code} value={c.code} className="bg-gray-900">{c.code} - {c.symbol}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="pt-8 border-t border-white/10">
                    <h3 className="text-lg font-bold text-white mb-4">{t('settings.dataManagement') || "Data Management"}</h3>
                    <div className="flex gap-4">
                      <button
                        onClick={() => engine.exportData('json')}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl border border-white/10 hover:bg-white/5 font-bold transition-colors"
                      >
                        <Download size={18} />
                        {t('quickActions.export') || "Export Data"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </GlassCard>
          )}
        </main>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showTransactionModal && (
          <EnhancedTransactionModal
            isOpen={showTransactionModal}
            onClose={() => {
              setShowTransactionModal(false);
              setEditingTransaction(null);
            }}
            mode={editingTransaction ? "edit" : "create"}
            transaction={editingTransaction || undefined}
            engine={engine}
            presetType={presetType}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showConverterModal && (
          <CurrencyConverterModal
            isOpen={showConverterModal}
            onClose={() => setShowConverterModal(false)}
          />
        )}
      </AnimatePresence>

      {/* Notifications Panel */}
      <AnimatePresence>
        {showNotifications && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowNotifications(false)}
            />
            <motion.div
              initial={{ opacity: 0, x: 300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 300 }}
              className="fixed right-6 top-20 w-96 max-h-[80vh] bg-gradient-to-b from-gray-900 to-gray-950 rounded-3xl border border-white/10 shadow-2xl overflow-hidden z-50"
            >
              <div className="p-4 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-white"
                    >
                      <Bell size={18} />
                    </button>
                    <h3 className="font-black text-white">{t('notifications.title') || "Notifications"}</h3>
                  </div>
                  <button
                    onClick={() => engine.clearNotifications()}
                    className="text-sm font-bold text-rose-400 hover:text-rose-300"
                  >
                    {t('notifications.clearAll') || "Clear All"}
                  </button>
                </div>
              </div>
              <div className="max-h-[60vh] overflow-y-auto">
                {notifications.map(notif => (
                  <div
                    key={notif.id}
                    className={`p-4 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer ${!notif.read ? "bg-blue-500/5" : ""
                      }`}
                    onClick={() => engine.markAsRead(notif.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-xl ${notif.type === "success" ? "bg-emerald-500/10" :
                        notif.type === "warning" ? "bg-amber-500/10" :
                          notif.type === "error" ? "bg-rose-500/10" :
                            "bg-blue-500/10"
                        }`}>
                        <BellRing size={16} className={
                          notif.type === "success" ? "text-emerald-400" :
                            notif.type === "warning" ? "text-amber-400" :
                              notif.type === "error" ? "text-rose-400" :
                                "text-blue-400"
                        } />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-white">{notif.title}</p>
                          <span className="text-xs text-white/40">
                            {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-sm text-white/60 mt-1">{notif.message}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {notifications.length === 0 && (
                  <div className="p-8 text-center">
                    <Bell size={24} className="text-white/20 mx-auto mb-2" />
                    <p className="text-white/40 text-sm">{t('notifications.empty') || "No notifications"}</p>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EnhancedBudgetView;
