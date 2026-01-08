import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Plus,
  TrendingUp,
  Wallet,
  RefreshCcw,
  Search,
  X,
  Trash2,
  CheckSquare,
  Square,
  Repeat,
  CalendarClock,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRightLeft,
  AlertTriangle,
  Filter,
  Sparkles,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  Check,
  Loader2,
} from "lucide-react";

// Optional (ha nálad léteznek, hagyd így; ha nem, töröld az importot és használd a fallbackot)
import { useLanguage } from "../../contexts/LanguageContext";
import { useData } from "../../contexts/DataContext";
import { AVAILABLE_CURRENCIES } from "../../constants/currencyData";
import { CurrencyService } from "../../services/CurrencyService";
import { parseMoneyInput } from "../../utils/numberUtils";

/* -------------------------------------------------------------------------------------------------
  GOAL: Premium redesign + "Ledger-first" UX
  - Transaction always appears immediately after Save (ledger visibility is independent from balance timing)
  - Balance can be computed with mode: "realized only" vs "include scheduled"
  - Charts never crash (measure container, render only if width/height are valid)
-------------------------------------------------------------------------------------------------- */

/* -------------------------------- Types -------------------------------- */

type TransactionType = "income" | "expense";
type TransactionPeriod = "oneTime" | "daily" | "weekly" | "monthly" | "yearly";

// Ledger item: can be booked (affects balance) OR scheduled/master (visible but not counted now)
export type Transaction = {
  id: string;
  createdAtISO: string;          // for "instant visibility ordering"
  effectiveDateYMD: string;      // date that determines balance inclusion (local date-only)
  description: string;
  type: TransactionType;
  amount: number;                // signed amount: income positive, expense negative
  currency: string;
  category: CategoryKey;
  period: TransactionPeriod;
  isMaster: boolean;             // "template/master" for recurring
  notes?: string;
};

type TransactionPatch = Partial<Omit<Transaction, "id" | "createdAtISO">>;

type BalanceMode = "realizedOnly" | "includeScheduled";

type CategoryKey = "software" | "marketing" | "office" | "travel" | "service" | "freelance" | "other";
type CategoryDef = { label: string; color: string; bg: string; border: string };

type RectLike = { top: number; left: number; width: number; height: number };

/* -------------------------------- Utils -------------------------------- */

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

const uid = () => (crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

const isFiniteNumber = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);

function toRectLike(el: Element | null): RectLike | null {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

// ---- Local date-only (NO UTC drift) ----
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

function addDaysYMD(ymd: string, days: number): string {
  const dt = parseYMD(ymd) ?? new Date();
  dt.setDate(dt.getDate() + days);
  return toYMDLocal(dt);
}

function addMonthsClampedYMD(ymd: string, months: number): string {
  const dt = parseYMD(ymd) ?? new Date();
  const y = dt.getFullYear();
  const m = dt.getMonth();
  const d = dt.getDate();

  const target = new Date(y, m + months, 1);
  const daysInTarget = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(d, daysInTarget));
  return toYMDLocal(target);
}

function addYearsClampedYMD(ymd: string, years: number): string {
  const dt = parseYMD(ymd) ?? new Date();
  const y = dt.getFullYear();
  const m = dt.getMonth();
  const d = dt.getDate();

  const target = new Date(y + years, m, 1);
  const daysInTarget = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(d, daysInTarget));
  return toYMDLocal(target);
}

function nextByPeriod(ymd: string, period: TransactionPeriod): string {
  switch (period) {
    case "daily":
      return addDaysYMD(ymd, 1);
    case "weekly":
      return addDaysYMD(ymd, 7);
    case "monthly":
      return addMonthsClampedYMD(ymd, 1);
    case "yearly":
      return addYearsClampedYMD(ymd, 1);
    default:
      return ymd;
  }
}

function normalizeDigits(s: string) {
  const cleaned = String(s ?? "").replace(/[^\d-]/g, "");
  return cleaned.startsWith("-") ? "-" + cleaned.slice(1).replace(/-/g, "") : cleaned.replace(/-/g, "");
}

/* -------------------------------- UI atoms -------------------------------- */

const Chip: React.FC<{ children: React.ReactNode; tone?: "neutral" | "blue" | "green" | "red" | "purple" }> = ({
  children,
  tone = "neutral",
}) => {
  const tones: Record<string, string> = {
    neutral: "bg-white/8 text-white/80 border-white/10",
    blue: "bg-blue-500/15 text-blue-200 border-blue-400/20",
    green: "bg-emerald-500/15 text-emerald-200 border-emerald-400/20",
    red: "bg-rose-500/15 text-rose-200 border-rose-400/20",
    purple: "bg-purple-500/15 text-purple-200 border-purple-400/20",
  };
  return (
    <span className={cx("inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide border", tones[tone])}>
      {children}
    </span>
  );
};

const GlassCard: React.FC<{ title?: React.ReactNode; right?: React.ReactNode; children: React.ReactNode; className?: string }> = ({
  title,
  right,
  children,
  className,
}) => (
  <div
    className={cx(
      "rounded-[28px] border border-white/10 bg-white/[0.06] backdrop-blur-xl shadow-[0_20px_80px_-40px_rgba(0,0,0,0.9)] overflow-hidden",
      className
    )}
  >
    {(title || right) && (
      <div className="px-5 py-4 flex items-center justify-between border-b border-white/10 bg-white/[0.04]">
        <div className="text-sm font-black text-white">{title}</div>
        <div>{right}</div>
      </div>
    )}
    <div className="p-5">{children}</div>
  </div>
);

const Button: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "ghost" | "primary" | "secondary" | "danger";
    leftIcon?: React.ReactNode;
  }
> = ({ variant = "secondary", leftIcon, className, ...props }) => {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-black transition active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none";
  const variants: Record<string, string> = {
    ghost: "bg-white/0 hover:bg-white/8 text-white border border-white/10",
    secondary: "bg-white/8 hover:bg-white/12 text-white border border-white/10",
    primary:
      "bg-gradient-to-br from-blue-500 to-indigo-600 text-white border border-blue-300/20 shadow-[0_14px_40px_-18px_rgba(59,130,246,0.9)] hover:brightness-110",
    danger:
      "bg-gradient-to-br from-rose-500 to-red-600 text-white border border-rose-300/20 shadow-[0_14px_40px_-18px_rgba(244,63,94,0.85)] hover:brightness-110",
  };
  return (
    <button className={cx(base, variants[variant], className)} {...props}>
      {leftIcon}
      {props.children}
    </button>
  );
};

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ className, ...props }) => (
  <input
    className={cx(
      "w-full rounded-2xl border border-white/10 bg-[#1e293b] px-4 py-2.5 text-sm font-bold text-white placeholder:text-gray-500 outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400/40",
      className
    )}
    {...props}
  />
);

const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({ className, ...props }) => (
  <select
    className={cx(
      "w-full rounded-2xl border border-white/10 bg-[#1e293b] px-4 py-2.5 text-sm font-extrabold text-white outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400/40",
      className
    )}
    {...props}
  />
);

const Divider = () => <div className="h-px bg-white/10 my-4" />;

/* -------------------------------- Chart Frame (fix width(-1)/height(-1)) -------------------------------- */

const ChartFrame: React.FC<{ height?: number; children: (size: { w: number; h: number }) => React.ReactNode }> = ({
  height = 280,
  children,
}) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ w: 0, h: height });

  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;

    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setSize({ w: Math.max(0, Math.floor(r.width)), h: Math.max(0, Math.floor(r.height)) });
    });
    ro.observe(el);

    // first measurement
    const r = el.getBoundingClientRect();
    setSize({ w: Math.max(0, Math.floor(r.width)), h: Math.max(0, Math.floor(r.height)) });

    return () => ro.disconnect();
  }, []);

  return (
    <div ref={ref} className="w-full min-w-0" style={{ minHeight: height, height }}>
      {size.w > 0 && size.h > 0 ? children(size) : <div className="h-full grid place-items-center text-white/45 text-sm font-bold">Chart betöltés…</div>}
    </div>
  );
};

/* -------------------------------- Modals -------------------------------- */

const ModalShell: React.FC<{
  title: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}> = ({ title, onClose, children, footer }) => (
  <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.98 }}
      className="w-full max-w-xl rounded-[28px] overflow-hidden border border-white/10 bg-[#0b1220] shadow-[0_30px_120px_-60px_rgba(0,0,0,1)]"
    >
      <div className="px-6 py-5 flex items-center justify-between border-b border-white/10 bg-white/4">
        <div className="text-lg font-black text-white">{title}</div>
        <button onClick={onClose} className="p-2 rounded-2xl border border-white/10 bg-white/6 hover:bg-white/10 transition">
          <X size={18} className="text-white" />
        </button>
      </div>
      <div className="px-6 py-5 max-h-[72vh] overflow-y-auto">{children}</div>
      {footer && <div className="px-6 py-5 border-t border-white/10 bg-white/4">{footer}</div>}
    </motion.div>
  </div>
);

const ConfirmModal: React.FC<{
  title: string;
  description: string;
  confirmText?: string;
  onCancel: () => void;
  onConfirm: () => void;
}> = ({ title, description, confirmText = "Törlés", onCancel, onConfirm }) => (
  <ModalShell
    title={
      <span className="inline-flex items-center gap-2">
        <AlertTriangle size={18} className="text-rose-300" /> {title}
      </span>
    }
    onClose={onCancel}
    footer={
      <div className="flex gap-3">
        <Button className="flex-1" onClick={onCancel} variant="secondary">
          Mégse
        </Button>
        <Button className="flex-1" onClick={onConfirm} variant="danger">
          {confirmText}
        </Button>
      </div>
    }
  >
    <div className="text-sm font-bold text-white/75">{description}</div>
  </ModalShell>
);

/* -------------------------------- Categories -------------------------------- */

const useCategories = (t: (k: string) => string) => {
  // High contrast palette: visible on dark backgrounds
  const CATEGORIES: Record<CategoryKey, CategoryDef> = useMemo(
    () => ({
      software: { label: t("budget.software") || "Software", color: "#60a5fa", bg: "rgba(96,165,250,0.14)", border: "rgba(96,165,250,0.25)" },
      marketing: { label: t("budget.marketing") || "Marketing", color: "#c084fc", bg: "rgba(192,132,252,0.14)", border: "rgba(192,132,252,0.25)" },
      office: { label: t("budget.office") || "Office", color: "#22d3ee", bg: "rgba(34,211,238,0.12)", border: "rgba(34,211,238,0.22)" },
      travel: { label: t("budget.travel") || "Travel", color: "#fbbf24", bg: "rgba(251,191,36,0.12)", border: "rgba(251,191,36,0.22)" },
      service: { label: t("budget.service") || "Service", color: "#34d399", bg: "rgba(52,211,153,0.12)", border: "rgba(52,211,153,0.22)" },
      freelance: { label: t("budget.freelance") || "Freelance", color: "#38bdf8", bg: "rgba(56,189,248,0.12)", border: "rgba(56,189,248,0.22)" },
      other: { label: t("budget.other") || "Other", color: "#a8b3cf", bg: "rgba(168,179,207,0.10)", border: "rgba(168,179,207,0.20)" },
    }),
    [t]
  );
  return CATEGORIES;
};

/* -------------------------------- Currency + formatting -------------------------------- */

function fallbackMoneyParse(s: string): number {
  // if parseMoneyInput doesn't exist
  const n = Number(String(s).replace(",", ".").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function safeParseMoney(s: string): number {
  try {
    // use existing util if present
    if (typeof parseMoneyInput === "function") {
      const v = parseMoneyInput(s);
      return Number.isFinite(v) ? v : 0;
    }
  } catch { }
  return fallbackMoneyParse(s);
}

/* -------------------------------- Data adapter (useData optional) -------------------------------- */

type DataAPI = {
  transactions: Transaction[];
  addTransaction?: (t: any) => any;
  updateTransaction?: (id: string, patch: any) => any;
  deleteTransaction?: (id: string) => any;
  deleteTransactions?: (ids: string[]) => any;
};

function useDataApi(): DataAPI {
  try {
    const ctx = useData() as any;
    if (ctx && Array.isArray(ctx.transactions)) return ctx;
  } catch { }
  return { transactions: [] };
}

/* -------------------------------- Main Hook: ledger-first engine -------------------------------- */

function useBudgetEngine() {
  // language/t fallback (if your context missing, default HU)
  let t = (k: string) => k;
  let language = "hu";
  try {
    const L = useLanguage() as any;
    if (L?.t) t = L.t;
    if (L?.language) language = L.language;
  } catch { }

  const dataApi = useDataApi();
  const CATEGORIES = useCategories(t);

  const [localTx, setLocalTx] = useState<Transaction[]>([]);
  const [currency, setCurrency] = useState<string>("USD");
  const [balanceMode, setBalanceMode] = useState<BalanceMode>("realizedOnly");

  // Merge: if dataApi has tx use it, else local
  const sourceTx = Array.isArray(dataApi.transactions) && dataApi.transactions.length > 0 ? dataApi.transactions : localTx;

  // Ensure currency rates load but never crash
  useEffect(() => {
    try {
      const maybe = CurrencyService?.fetchRealTimeRates?.();
      Promise.resolve(maybe).catch(() => { });
    } catch { }
  }, []);

  // Intl format cache
  const fmtCache = useRef<Map<string, Intl.NumberFormat>>(new Map());
  useEffect(() => {
    fmtCache.current.clear();
  }, [language]);

  const getFormatter = useCallback(
    (ccy: string) => {
      const loc = language === "hu" ? "hu-HU" : "en-US";
      const key = `${loc}-${ccy}`;
      if (!fmtCache.current.has(key)) {
        fmtCache.current.set(
          key,
          new Intl.NumberFormat(loc, {
            style: "currency",
            currency: ccy,
            maximumFractionDigits: 2,
          })
        );
      }
      return fmtCache.current.get(key)!;
    },
    [language]
  );

  const formatMoney = useCallback(
    (amount: number, ccy?: string) => getFormatter(ccy || currency).format(Number.isFinite(amount) ? amount : 0),
    [currency, getFormatter]
  );

  const formatDate = useCallback(
    (ymd: string) => {
      const dt = parseYMD(ymd);
      if (!dt) return "—";
      const loc = language === "hu" ? "hu-HU" : "en-US";
      return new Intl.DateTimeFormat(loc, { year: "numeric", month: "short", day: "numeric" }).format(dt);
    },
    [language]
  );

  const safeConvert = useCallback((amount: number, from: string, to: string) => {
    if (!Number.isFinite(amount) || amount === 0) return 0;
    if (!from || !to || from === to) return amount;
    try {
      const v = CurrencyService.convert(amount, from, to);
      return Number.isFinite(v) ? v : 0;
    } catch {
      return 0;
    }
  }, []);

  // --------- Ledger sorting: createdAt first (instant visibility) ----------
  const ledger = useMemo(() => {
    return [...sourceTx].sort((a, b) => b.createdAtISO.localeCompare(a.createdAtISO));
  }, [sourceTx]);

  // --------- Balance inclusion logic ----------
  const todayYMD = toYMDLocal(new Date());

  const affectsBalanceNow = useCallback(
    (tx: Transaction) => {
      if (balanceMode === "includeScheduled") return !tx.isMaster; // include future occurrences too if you create them; masters never
      // realizedOnly: only effectiveDate <= today and not master
      if (tx.isMaster) return false;
      return tx.effectiveDateYMD <= todayYMD;
    },
    [balanceMode, todayYMD]
  );

  const balanceStats = useMemo(() => {
    let income = 0;
    let expense = 0;
    let balance = 0;

    for (const tx of sourceTx) {
      if (!affectsBalanceNow(tx)) continue;
      const v = tx.currency === currency ? tx.amount : safeConvert(tx.amount, tx.currency, currency);
      balance += v;
      if (v >= 0) income += v;
      else expense += Math.abs(v);
    }
    return { income, expense, balance };
  }, [sourceTx, affectsBalanceNow, currency, safeConvert]);

  // --------- Monthly cashflow chart (realized vs scheduled) ----------
  const cashFlowData = useMemo(() => {
    const now = new Date();
    const buckets: Array<{ monthIndex: number; name: string; income: number; expense: number }> = [];
    const months: Array<{ y: number; m: number }> = [];

    // Window: Realized (-11..0), Scheduled (-2..+9)
    const startOffset = balanceMode === "includeScheduled" ? -2 : -11;

    for (let i = 0; i < 12; i++) {
      const offset = startOffset + i;
      const dt = new Date(now.getFullYear(), now.getMonth() + offset, 1);
      months.push({ y: dt.getFullYear(), m: dt.getMonth() });
    }

    const labelsHU = ["Jan", "Feb", "Már", "Ápr", "Máj", "Jún", "Júl", "Aug", "Sze", "Okt", "Nov", "Dec"];
    const labelsEN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const labels = language === "hu" ? labelsHU : labelsEN;

    for (let i = 0; i < 12; i++) buckets.push({ monthIndex: i, name: labels[months[i].m], income: 0, expense: 0 });

    for (const tx of sourceTx) {
      if (tx.isMaster) continue;

      // realizedOnly: strict date filter. includeScheduled: allows all non-masters from source
      if (balanceMode === 'realizedOnly' && tx.effectiveDateYMD > todayYMD) continue;

      const dt = parseYMD(tx.effectiveDateYMD);
      if (!dt) continue;

      const idx = months.findIndex((mm) => mm.y === dt.getFullYear() && mm.m === dt.getMonth());

      if (idx !== -1) {
        const v = tx.currency === currency ? tx.amount : safeConvert(tx.amount, tx.currency, currency);
        if (v >= 0) buckets[idx].income += v;
        else buckets[idx].expense += Math.abs(v);
      }
    }

    return buckets;
  }, [sourceTx, currency, language, safeConvert, todayYMD, balanceMode]);

  // --------- Category totals (realized now) ----------
  const categoryTotals = useMemo(() => {
    const totals: Record<CategoryKey, number> = {
      software: 0,
      marketing: 0,
      office: 0,
      travel: 0,
      service: 0,
      freelance: 0,
      other: 0,
    };

    for (const tx of sourceTx) {
      if (!affectsBalanceNow(tx)) continue;
      if (tx.amount >= 0) continue; // expenses only
      const v = tx.currency === currency ? Math.abs(tx.amount) : Math.abs(safeConvert(tx.amount, tx.currency, currency));
      totals[tx.category] = (totals[tx.category] || 0) + v;
    }
    return totals;
  }, [sourceTx, affectsBalanceNow, currency, safeConvert]);

  // --------- API wrappers: optimistic + safe ----------
  const addTx = useCallback(
    (tx: Transaction) => {
      // optimistic UI
      setLocalTx((prev) => [tx, ...prev]);

      // push to external store if exists
      try {
        if (typeof dataApi.addTransaction === "function") dataApi.addTransaction(tx);
      } catch { }
    },
    [dataApi]
  );

  const updateTx = useCallback(
    (id: string, patch: TransactionPatch) => {
      setLocalTx((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
      try {
        if (typeof dataApi.updateTransaction === "function") dataApi.updateTransaction(id, patch);
      } catch { }
    },
    [dataApi]
  );

  const deleteOne = useCallback(
    (id: string) => {
      setLocalTx((prev) => prev.filter((t) => t.id !== id));
      try {
        if (typeof dataApi.deleteTransactions === "function") dataApi.deleteTransactions([id]);
        else if (typeof dataApi.deleteTransaction === "function") dataApi.deleteTransaction(id);
      } catch { }
    },
    [dataApi]
  );

  const deleteMany = useCallback(
    (ids: string[]) => {
      const set = new Set(ids);
      setLocalTx((prev) => prev.filter((t) => !set.has(t.id)));
      try {
        if (typeof dataApi.deleteTransactions === "function") dataApi.deleteTransactions(ids);
        else if (typeof dataApi.deleteTransaction === "function") ids.forEach((id) => dataApi.deleteTransaction?.(id));
      } catch { }
    },
    [dataApi]
  );

  return {
    t,
    language,
    CATEGORIES,
    currency,
    setCurrency,
    balanceMode,
    setBalanceMode,
    formatMoney,
    formatDate,
    safeConvert,
    ledger,
    sourceTx,
    balanceStats,
    cashFlowData,
    categoryTotals,
    addTx,
    updateTx,
    deleteOne,
    deleteMany,
    todayYMD,
  };
}

/* -------------------------------- Transaction Modal -------------------------------- */

function periodLabel(p: TransactionPeriod) {
  const m: Record<TransactionPeriod, string> = {
    oneTime: "Egyszeri",
    daily: "Napi",
    weekly: "Heti",
    monthly: "Havi",
    yearly: "Éves",
  };
  return m[p] ?? "Egyszeri";
}

const TransactionModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  txType: TransactionType;
  engine: ReturnType<typeof useBudgetEngine>;
  editingTx?: Transaction | null;
}> = ({ isOpen, onClose, mode, txType, engine, editingTx }) => {
  const { CATEGORIES } = engine;
  const today = toYMDLocal(new Date());

  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [ccy, setCcy] = useState(engine.currency);
  const [cat, setCat] = useState<CategoryKey>("other");
  const [dateYMD, setDateYMD] = useState(today);
  const [period, setPeriod] = useState<TransactionPeriod>("oneTime");
  const [notes, setNotes] = useState("");
  const [addFirstOccurrenceNow, setAddFirstOccurrenceNow] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    if (mode === "edit" && editingTx) {
      setDesc(editingTx.description);
      setAmount(String(Math.abs(editingTx.amount)));
      setCcy(editingTx.currency);
      setCat(editingTx.category);
      setDateYMD(editingTx.effectiveDateYMD);
      setPeriod(editingTx.period);
      setNotes(editingTx.notes ?? "");
      setAddFirstOccurrenceNow(true);
    } else {
      setDesc("");
      setAmount("");
      setCcy(engine.currency);
      setCat("other");
      setDateYMD(today);
      setPeriod("oneTime");
      setNotes("");
      setAddFirstOccurrenceNow(true);
    }
  }, [isOpen, mode, editingTx, today, engine.currency]);

  const title =
    mode === "edit"
      ? txType === "income"
        ? "Bevétel szerkesztése"
        : "Kiadás szerkesztése"
      : txType === "income"
        ? "Új bevétel"
        : "Új kiadás";

  const save = () => {
    const a = safeParseMoney(amount);
    if (!desc.trim()) return alert("Írj leírást!");
    if (!Number.isFinite(a) || a <= 0) return alert("Adj meg érvényes összeget!");
    if (!parseYMD(dateYMD)) return alert("Érvénytelen dátum!");

    const signed = txType === "income" ? Math.abs(a) : -Math.abs(a);
    const nowISO = new Date().toISOString();

    if (mode === "edit" && editingTx) {
      engine.updateTx(editingTx.id, {
        description: desc.trim(),
        amount: signed,
        currency: ccy,
        category: cat,
        effectiveDateYMD: dateYMD,
        period,
        isMaster: editingTx.isMaster,
        notes: notes.trim() || undefined,
      });
      onClose();
      return;
    }

    const isRecurring = period !== "oneTime";

    if (!isRecurring) {
      const tx: Transaction = {
        id: uid(),
        createdAtISO: nowISO,
        effectiveDateYMD: dateYMD,
        description: desc.trim(),
        type: txType,
        amount: signed,
        currency: ccy,
        category: cat,
        period,
        isMaster: false,
        notes: notes.trim() || undefined,
      };
      engine.addTx(tx);
      onClose();
      return;
    }

    // Recurring creation logic:
    // - ALWAYS visible immediately: create a Master (isMaster=true)
    // - Optionally also add a first booked occurrence NOW (isMaster=false) so balance changes instantly if desired
    const master: Transaction = {
      id: uid(),
      createdAtISO: nowISO,
      effectiveDateYMD: dateYMD, // "rule start"
      description: desc.trim(),
      type: txType,
      amount: signed,
      currency: ccy,
      category: cat,
      period,
      isMaster: true,
      notes: notes.trim() || undefined,
    };
    engine.addTx(master);

    if (addFirstOccurrenceNow) {
      const occurrence: Transaction = {
        id: uid(),
        createdAtISO: new Date(Date.now() + 1).toISOString(), // keep it just after master in ordering
        effectiveDateYMD: dateYMD,
        description: `${desc.trim()} (1. alkalom)`,
        type: txType,
        amount: signed,
        currency: ccy,
        category: cat,
        period: "oneTime",
        isMaster: false,
        notes: notes.trim() || undefined,
      };
      engine.addTx(occurrence);
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <ModalShell
      title={
        <span className="inline-flex items-center gap-2">
          {txType === "income" ? <TrendingUp size={18} className="text-emerald-300" /> : <Plus size={18} className="text-blue-200" />}
          {title}
        </span>
      }
      onClose={onClose}
      footer={
        <div className="flex flex-col gap-3">
          {period !== "oneTime" && mode === "create" && (
            <label className="flex items-center gap-2 text-sm font-bold text-white/75">
              <input type="checkbox" checked={addFirstOccurrenceNow} onChange={(e) => setAddFirstOccurrenceNow(e.target.checked)} />
              Első alkalom azonnal legyen “booked” tétel is (balanszba is számítson a dátum szerint)
            </label>
          )}
          <Button variant="primary" className="w-full py-3" onClick={save} leftIcon={<Check size={16} />}>
            Mentés
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="rounded-[26px] border border-white/10 bg-white/6 p-4">
          <div className="text-xs font-black uppercase tracking-wide text-white/60">Összeg</div>
          <div className="mt-2 flex items-center gap-2">
            <Input inputMode="decimal" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} className="text-lg font-black" />
            <Select className="w-40" value={ccy} onChange={(e) => setCcy(e.target.value)}>
              {AVAILABLE_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code}
                </option>
              ))}
            </Select>
          </div>
          <div className="mt-2 text-xs font-bold text-white/45">Tipp: beírhatsz “12.5”, “12,5”, “$12” – rendbe tesszük.</div>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-black uppercase tracking-wide text-white/60">Leírás</div>
          <Input placeholder="Pl. Hosting / Ads / Ügyfél munka…" value={desc} onChange={(e) => setDesc(e.target.value)} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-2">
            <div className="text-xs font-black uppercase tracking-wide text-white/60">Kategória</div>
            <Select value={cat} onChange={(e) => setCat(e.target.value as CategoryKey)}>
              {Object.entries(CATEGORIES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-black uppercase tracking-wide text-white/60">Hatás dátuma</div>
            <Input type="date" value={dateYMD} onChange={(e) => setDateYMD(e.target.value)} />
            <div className="text-[11px] font-bold text-white/45">
              Ez a dátum dönti el, hogy a balanszba mikortól számít be (Realized mód).
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-black uppercase tracking-wide text-white/60">Gyakoriság</div>
          <div className="flex flex-wrap gap-2">
            {(["oneTime", "daily", "weekly", "monthly", "yearly"] as TransactionPeriod[]).map((p) => {
              const active = period === p;
              return (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={cx(
                    "px-3 py-2 rounded-2xl border text-sm font-black transition",
                    active ? "bg-blue-500/18 border-blue-400/25 text-blue-100" : "bg-white/4 border-white/10 text-white/75 hover:bg-white/8"
                  )}
                >
                  {periodLabel(p)}
                </button>
              );
            })}
          </div>
          {period !== "oneTime" && (
            <div className="rounded-2xl border border-purple-400/20 bg-purple-500/10 p-3 text-sm font-bold text-purple-100/90 inline-flex items-center gap-2">
              <Repeat size={16} /> Ismétlődő tétel: a “Sablon” azonnal látszik a listában
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="text-xs font-black uppercase tracking-wide text-white/60">Megjegyzés (opcionális)</div>
          <Input placeholder="Pl. számla #, ügyfél, project..." value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>
    </ModalShell>
  );
};

/* -------------------------------- Currency Converter Modal -------------------------------- */

const CurrencyConverterModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  engine: ReturnType<typeof useBudgetEngine>;
}> = ({ isOpen, onClose, engine }) => {
  const [from, setFrom] = useState(engine.currency);
  const [to, setTo] = useState("EUR");
  const [amount, setAmount] = useState("100");
  const [loading, setLoading] = useState(false);
  const [stamp, setStamp] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setFrom(engine.currency);
  }, [isOpen, engine.currency]);

  const parsed = useMemo(() => safeParseMoney(amount), [amount]);
  const converted = useMemo(() => engine.safeConvert(parsed, from, to), [parsed, from, to, engine.safeConvert]);
  const rate = useMemo(() => engine.safeConvert(1, from, to), [from, to, engine.safeConvert]);

  const refresh = async () => {
    setLoading(true);
    try {
      const maybe = CurrencyService?.fetchRealTimeRates?.();
      await Promise.resolve(maybe);
      setStamp(new Date().toLocaleString(engine.language === "hu" ? "hu-HU" : "en-US"));
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <ModalShell
      title={
        <span className="inline-flex items-center gap-2">
          <RefreshCcw size={18} className="text-blue-200" /> Valuta váltó
        </span>
      }
      onClose={onClose}
      footer={
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="text-xs font-bold text-white/55">{stamp ? `Frissítve: ${stamp}` : "Frissítés… / nincs timestamp"}</div>
          <Button onClick={refresh} leftIcon={loading ? <Loader2 className="animate-spin" size={16} /> : <RefreshCcw size={16} />} variant="secondary">
            Árfolyam frissítés
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 items-end">
          <div className="space-y-2">
            <div className="text-xs font-black uppercase tracking-wide text-white/60">From</div>
            <Select value={from} onChange={(e) => setFrom(e.target.value)}>
              {AVAILABLE_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex justify-center">
            <button
              onClick={() => {
                setFrom(to);
                setTo(from);
              }}
              className="mt-6 sm:mt-0 p-3 rounded-2xl border border-white/10 bg-white/6 hover:bg-white/10 transition"
              aria-label="Swap"
              title="Swap"
            >
              <ArrowRightLeft size={18} className="text-white" />
            </button>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-black uppercase tracking-wide text-white/60">To</div>
            <Select value={to} onChange={(e) => setTo(e.target.value)}>
              {AVAILABLE_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <Divider />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-2">
            <div className="text-xs font-black uppercase tracking-wide text-white/60">Összeg</div>
            <Input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" />
            <div className="text-xs font-bold text-white/55">
              1 {from} ≈ <span className="text-white font-black">{engine.formatMoney(rate, to)}</span>
            </div>
          </div>

          <div className="rounded-[26px] border border-white/10 bg-white/6 p-4">
            <div className="text-xs font-black uppercase tracking-wide text-white/60">Eredmény</div>
            <div className="mt-2 text-2xl font-black text-white tabular-nums">{engine.formatMoney(converted, to)}</div>
            <div className="mt-1 text-xs font-bold text-white/45">
              {engine.formatMoney(parsed, from)} → {engine.formatMoney(converted, to)}
            </div>
          </div>
        </div>
      </div>
    </ModalShell>
  );
};

/* -------------------------------- Ledger Row -------------------------------- */

const CategoryBadge: React.FC<{ def: CategoryDef }> = ({ def }) => (
  <span className="px-2.5 py-1 rounded-xl text-[11px] font-extrabold border" style={{ background: def.bg, borderColor: def.border, color: def.color }}>
    {def.label}
  </span>
);

const LedgerRow: React.FC<{
  tx: Transaction;
  selected: boolean;
  onToggle: (id: string) => void;
  onEdit: (tx: Transaction) => void;
  onDelete: (id: string) => void;
  engine: ReturnType<typeof useBudgetEngine>;
}> = React.memo(({ tx, selected, onToggle, onEdit, onDelete, engine }) => {
  const isIncome = tx.type === "income";
  const amountAbs = Math.abs(tx.amount);

  const affectsNow =
    tx.isMaster ? false : (engine.balanceMode === "includeScheduled" ? true : tx.effectiveDateYMD <= engine.todayYMD);

  return (
    <div
      className={cx(
        "group flex items-center justify-between gap-3 px-4 py-4 border-l-4 transition cursor-pointer",
        selected ? "bg-blue-500/10 border-l-blue-400/60" : "border-l-transparent hover:bg-white/6 hover:border-l-white/15"
      )}
      onClick={() => onEdit(tx)}
      role="button"
      tabIndex={0}
    >
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle(tx.id);
          }}
          className={cx(
            "p-2 rounded-2xl border transition",
            selected ? "bg-blue-500/20 border-blue-400/30 text-blue-100" : "bg-white/6 border-white/10 text-white/55 hover:bg-white/10"
          )}
          aria-label="Select"
        >
          {selected ? <CheckSquare size={18} /> : <Square size={18} />}
        </button>

        <div className={cx("p-2 rounded-2xl border", isIncome ? "bg-emerald-500/10 border-emerald-400/20" : "bg-rose-500/10 border-rose-400/20")}>
          {isIncome ? <ArrowUpRight size={18} className="text-emerald-200" /> : <ArrowDownRight size={18} className="text-rose-200" />}
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <div className="font-black text-white truncate">{tx.description}</div>
            {tx.isMaster && (
              <Chip tone="purple">
                <Repeat size={12} /> Sablon
              </Chip>
            )}
            {!tx.isMaster && tx.effectiveDateYMD > engine.todayYMD && (
              <Chip tone="blue">
                <CalendarClock size={12} /> Ütemezett
              </Chip>
            )}
            {!tx.isMaster && affectsNow && (
              <Chip tone="green">
                <Sparkles size={12} /> Booked
              </Chip>
            )}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-bold text-white/60">
            <CategoryBadge def={engine.CATEGORIES[tx.category]} />
            <span className="text-white/25">•</span>
            <span>Hatás: {engine.formatDate(tx.effectiveDateYMD)}</span>
            <span className="text-white/25">•</span>
            <Chip tone="neutral">{periodLabel(tx.period)}</Chip>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className={cx("text-right font-black tabular-nums", isIncome ? "text-emerald-200" : "text-white")}>
          {isIncome ? "+" : "−"}
          {engine.formatMoney(amountAbs, tx.currency)}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(tx.id);
          }}
          className="opacity-0 group-hover:opacity-100 transition p-2 rounded-2xl border border-white/10 bg-white/6 hover:bg-rose-500/15"
          aria-label="Delete"
          title="Törlés"
        >
          <Trash2 size={18} className="text-rose-200" />
        </button>
      </div>
    </div>
  );
});

/* -------------------------------- Main Component -------------------------------- */

const BudgetViewPro: React.FC = () => {
  const engine = useBudgetEngine();

  const [tab, setTab] = useState<"overview" | "ledger" | "planning">("overview");
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<CategoryKey | "all">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 50;

  // modals
  const [showConverter, setShowConverter] = useState(false);
  const [showTxModal, setShowTxModal] = useState(false);
  const [txModalType, setTxModalType] = useState<TransactionType>("expense");
  const [txModalMode, setTxModalMode] = useState<"create" | "edit">("create");
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  // delete confirms
  const [confirm, setConfirm] = useState<null | { kind: "selected" | "one"; id?: string }>(null);

  const openCreate = (type: TransactionType) => {
    setTxModalType(type);
    setTxModalMode("create");
    setEditingTx(null);
    setShowTxModal(true);
  };

  const openEdit = (tx: Transaction) => {
    setTxModalType(tx.type);
    setTxModalMode("edit");
    setEditingTx(tx);
    setShowTxModal(true);
  };

  const toggleSel = (id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const clearSel = () => setSelected(new Set());

  // Filters
  const filteredLedger = useMemo(() => {
    let list = engine.ledger;

    const st = search.trim();
    if (st) {
      const lower = st.toLowerCase();
      const digits = normalizeDigits(st);
      const hasDigits = /\d/.test(digits);

      list = list.filter((tx) => {
        const d = tx.description.toLowerCase();
        const a = normalizeDigits(String(tx.amount));
        return d.includes(lower) || (hasDigits && a.includes(digits));
      });
    }

    if (catFilter !== "all") list = list.filter((tx) => tx.category === catFilter);

    return list;
  }, [engine.ledger, search, catFilter]);

  useEffect(() => {
    setPage(1);
    clearSel();
  }, [search, catFilter, tab]);

  const totalPages = Math.max(1, Math.ceil(filteredLedger.length / ITEMS_PER_PAGE));
  const paginated = useMemo(() => filteredLedger.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE), [filteredLedger, page]);

  // Overview cards
  const { balance, income, expense } = engine.balanceStats;

  const categoryData = useMemo(() => {
    const entries = Object.entries(engine.categoryTotals) as Array<[CategoryKey, number]>;
    return entries
      .map(([k, v]) => ({
        key: k,
        name: engine.CATEGORIES[k].label,
        value: Number(v) || 0,
        color: engine.CATEGORIES[k].color,
      }))
      .filter((x) => x.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [engine.categoryTotals, engine.CATEGORIES]);

  const deleteSelected = () => {
    engine.deleteMany(Array.from(selected));
    clearSel();
  };

  return (
    <div className="min-h-screen w-full bg-[#070b14] text-white">
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 opacity-70">
        <div className="absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full bg-blue-500/20 blur-[120px]" />
        <div className="absolute top-40 -right-40 w-[520px] h-[520px] rounded-full bg-purple-500/20 blur-[120px]" />
        <div className="absolute bottom-0 left-1/4 w-[720px] h-[720px] rounded-full bg-emerald-500/10 blur-[140px]" />
      </div>

      <div className="relative max-w-7xl mx-auto p-5 space-y-4">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 grid place-items-center shadow-[0_18px_60px_-30px_rgba(16,185,129,1)]">
              <Wallet size={18} className="text-white" />
            </div>
            <div>
              <div className="text-2xl font-black">Költségvetés Követő</div>
              <div className="text-sm font-bold text-white/55">Bevételek, kiadások és célok – profi ledger rendszerrel</div>
            </div>
            <Chip tone="blue">PRO</Chip>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select className="w-40" value={engine.currency} onChange={(e) => engine.setCurrency(e.target.value)}>
              {AVAILABLE_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code}
                </option>
              ))}
            </Select>

            <Button variant="secondary" onClick={() => setShowConverter(true)} leftIcon={<RefreshCcw size={16} />}>
              Valuta váltó
            </Button>

            <Button variant="secondary" onClick={() => openCreate("income")} leftIcon={<TrendingUp size={16} />}>
              Bevétel
            </Button>

            <Button variant="primary" onClick={() => openCreate("expense")} leftIcon={<Plus size={16} />}>
              Kiadás
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 border-b border-white/10">
          {[
            { key: "overview", label: "Áttekintés" },
            { key: "ledger", label: "Legutóbbi tranzakciók" },
            { key: "planning", label: "Tervezés" },
          ].map((x) => {
            const active = tab === (x.key as any);
            return (
              <button
                key={x.key}
                onClick={() => setTab(x.key as any)}
                className={cx(
                  "relative px-4 py-3 text-sm font-black transition",
                  active ? "text-blue-200" : "text-white/55 hover:text-white"
                )}
              >
                {x.label}
                {active && <div className="absolute left-0 right-0 -bottom-[1px] h-[3px] bg-blue-400 rounded-t-full" />}
              </button>
            );
          })}
        </div>

        {/* Content */}
        {tab === "overview" && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Balance card */}
              <GlassCard
                title="Egyenleg"
                right={
                  <Select
                    className="w-56 text-xs"
                    value={engine.balanceMode}
                    onChange={(e) => engine.setBalanceMode(e.target.value as BalanceMode)}
                  >
                    <option value="realizedOnly">Balansz: csak “realized”</option>
                    <option value="includeScheduled">Balansz: ütemezettet is mutasson</option>
                  </Select>
                }
              >
                <div className="text-4xl font-black tabular-nums">{engine.formatMoney(balance)}</div>
                <div className="mt-1 text-sm font-bold text-white/55">
                  Tipp: Tranzakció mindig látszik azonnal a ledgerben, a balansz pedig a beállítás szerint számol.
                </div>

                <Divider />

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-[22px] border border-emerald-400/20 bg-emerald-500/10 p-4">
                    <div className="text-xs font-black uppercase tracking-wide text-emerald-200/80">Bevétel</div>
                    <div className="mt-2 text-xl font-black text-emerald-200 tabular-nums">{engine.formatMoney(income)}</div>
                  </div>

                  <div className="rounded-[22px] border border-rose-400/20 bg-rose-500/10 p-4">
                    <div className="text-xs font-black uppercase tracking-wide text-rose-200/80">Kiadás</div>
                    <div className="mt-2 text-xl font-black text-rose-200 tabular-nums">{engine.formatMoney(expense)}</div>
                  </div>
                </div>
              </GlassCard>

              {/* Cashflow */}
              <GlassCard title={engine.balanceMode === "includeScheduled" ? "Cashflow (Múlt + Jövő)" : "Cashflow (utolsó 12 hónap)"}>
                <ChartFrame height={300}>
                  {() => (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={engine.cashFlowData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "rgba(255,255,255,0.6)" }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "rgba(255,255,255,0.6)" }} />
                        <Tooltip />
                        <Area type="monotone" dataKey="income" stroke="#34d399" fill="#34d399" fillOpacity={0.18} />
                        <Area type="monotone" dataKey="expense" stroke="#fb7185" fill="#fb7185" fillOpacity={0.14} />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </ChartFrame>
              </GlassCard>

              {/* Categories */}
              <GlassCard title="Kiadások kategóriánként">
                <ChartFrame height={300}>
                  {() =>
                    categoryData.length ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPieChart>
                          <Pie data={categoryData} cx="50%" cy="50%" innerRadius={72} outerRadius={100} paddingAngle={4} dataKey="value">
                            {categoryData.map((entry) => (
                              <Cell key={entry.key} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full grid place-items-center text-white/45 text-sm font-bold">Nincs adat.</div>
                    )
                  }
                </ChartFrame>

                {categoryData.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {categoryData.slice(0, 5).map((c) => (
                      <div key={c.key} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/4 px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ background: c.color }} />
                          <div className="text-xs font-black text-white/80">{c.name}</div>
                        </div>
                        <div className="text-xs font-black tabular-nums">{engine.formatMoney(c.value)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </GlassCard>
            </div>

            <GlassCard title="Legutóbbi tranzakciók" className="mt-4">
              <div className="rounded-[26px] border border-white/10 overflow-hidden bg-white/4">
                {engine.ledger.length === 0 ? (
                  <div className="p-10 text-center text-white/45 text-sm font-bold">Nincs tranzakció.</div>
                ) : (
                  engine.ledger.slice(0, 5).map(tx => (
                    <LedgerRow
                      key={tx.id}
                      tx={tx}
                      selected={selected.has(tx.id)}
                      onToggle={toggleSel}
                      onEdit={(x) => openEdit(x)}
                      onDelete={(id) => setConfirm({ kind: "one", id })}
                      engine={engine}
                    />
                  ))
                )}
                {engine.ledger.length > 5 && (
                  <div className="p-4 border-t border-white/10 bg-white/4 text-center">
                    <Button variant="ghost" onClick={() => setTab("ledger")} leftIcon={<ArrowRightLeft size={16} />}>
                      Összes tranzakció megtekintése
                    </Button>
                  </div>
                )}
              </div>
            </GlassCard>
          </>
        )}

        {tab === "ledger" && (
          <GlassCard
            title="Legutóbbi tranzakciók (ledger)"
            right={
              <div className="flex items-center gap-2">
                <Chip tone="neutral">Mindig azonnal látszik</Chip>
                <Chip tone="blue">Balansz: {engine.balanceMode === "realizedOnly" ? "realized" : "scheduled is"}</Chip>
              </div>
            }
          >
            {/* controls */}
            <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-sm">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                <Input className="pl-11" placeholder="Keresés (leírás / összeg)..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="w-64">
                  <Select value={catFilter} onChange={(e) => setCatFilter(e.target.value as any)}>
                    <option value="all">Összes kategória</option>
                    {Object.entries(engine.CATEGORIES).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                  </Select>
                </div>

                {selected.size > 0 && (
                  <>
                    <Chip tone="blue">{selected.size} kijelölve</Chip>
                    <Button variant="secondary" onClick={clearSel} leftIcon={<X size={16} />}>
                      Kijelölés törlése
                    </Button>
                    <Button variant="danger" onClick={() => setConfirm({ kind: "selected" })} leftIcon={<Trash2 size={16} />}>
                      Törlés
                    </Button>
                  </>
                )}

                <Button variant="ghost" onClick={() => openCreate("expense")} leftIcon={<Plus size={16} />}>
                  Új tétel
                </Button>
              </div>
            </div>

            <Divider />

            {/* list */}
            <div className="rounded-[26px] border border-white/10 overflow-hidden bg-white/4">
              <div className="max-h-[680px] overflow-y-auto">
                {paginated.length === 0 ? (
                  <div className="p-12 text-center text-white/45 text-sm font-bold">Nincs találat.</div>
                ) : (
                  paginated.map((tx) => (
                    <LedgerRow
                      key={tx.id}
                      tx={tx}
                      selected={selected.has(tx.id)}
                      onToggle={toggleSel}
                      onEdit={(x) => {
                        // ha már van kijelölés, kattintás inkább toggle (pro UX)
                        if (selected.size > 0) toggleSel(x.id);
                        else openEdit(x);
                      }}
                      onDelete={(id) => setConfirm({ kind: "one", id })}
                      engine={engine}
                    />
                  ))
                )}
              </div>

              {/* pagination */}
              {totalPages > 1 && (
                <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-white/10 bg-white/4">
                  <div className="text-xs font-black text-white/55">
                    Oldal {page} / {totalPages} — összesen {filteredLedger.length}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => setPage(1)} disabled={page === 1} leftIcon={<ChevronsLeft size={16} />}>
                      Első
                    </Button>
                    <Button variant="secondary" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} leftIcon={<ChevronLeft size={16} />}>
                      Előző
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      leftIcon={<ChevronRight size={16} />}
                    >
                      Következő
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => setPage(totalPages)}
                      disabled={page === totalPages}
                      leftIcon={<ChevronsRight size={16} />}
                    >
                      Utolsó
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </GlassCard>
        )}

        {tab === "planning" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <GlassCard title="Mit látsz itt?">
              <div className="text-sm font-bold text-white/70 leading-relaxed">
                A “Tervezés” lényege: a ledgerben azonnal látszik minden, de itt külön kiemeljük:
                <div className="mt-3 space-y-2">
                  <div className="rounded-2xl border border-white/10 bg-white/6 p-3">
                    <div className="font-black text-white">Sablon (Master)</div>
                    <div className="text-xs font-bold text-white/55">Ismétlődő tétel – nem számít a balanszba, csak szabály.</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/6 p-3">
                    <div className="font-black text-white">Ütemezett</div>
                    <div className="text-xs font-bold text-white/55">A dátuma jövőben van – látod, de Realized balanszban még nincs.</div>
                  </div>
                </div>
              </div>
            </GlassCard>

            <GlassCard title="Gyors szűrő: sablonok">
              <div className="text-sm font-bold text-white/70">
                Sablonok (Master tételek):
                <div className="mt-3 rounded-[26px] border border-white/10 bg-white/4 overflow-hidden">
                  <div className="max-h-[360px] overflow-y-auto">
                    {engine.ledger.filter((x) => x.isMaster).length === 0 ? (
                      <div className="p-10 text-center text-white/45 text-sm font-bold">Nincs sablon.</div>
                    ) : (
                      engine.ledger
                        .filter((x) => x.isMaster)
                        .slice(0, 50)
                        .map((tx) => (
                          <div
                            key={tx.id}
                            className="px-4 py-4 border-b border-white/10 hover:bg-white/6 transition cursor-pointer"
                            onClick={() => openEdit(tx)}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <div className="font-black truncate">{tx.description}</div>
                                <div className="mt-1 text-xs font-bold text-white/55 flex items-center gap-2">
                                  <CategoryBadge def={engine.CATEGORIES[tx.category]} />
                                  <Chip tone="purple">
                                    <Repeat size={12} /> {periodLabel(tx.period)}
                                  </Chip>
                                  <span className="text-white/25">•</span>
                                  <span>Kezdet: {engine.formatDate(tx.effectiveDateYMD)}</span>
                                </div>
                              </div>
                              <div className="font-black tabular-nums text-white/85">{engine.formatMoney(Math.abs(tx.amount), tx.currency)}</div>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </div>
            </GlassCard>

            <GlassCard title="Ütemezett tételek (jövő)">
              <div className="rounded-[26px] border border-white/10 bg-white/4 overflow-hidden">
                <div className="max-h-[360px] overflow-y-auto">
                  {engine.ledger.filter((x) => !x.isMaster && x.effectiveDateYMD > engine.todayYMD).length === 0 ? (
                    <div className="p-10 text-center text-white/45 text-sm font-bold">Nincs ütemezett tétel.</div>
                  ) : (
                    engine.ledger
                      .filter((x) => !x.isMaster && x.effectiveDateYMD > engine.todayYMD)
                      .slice(0, 50)
                      .map((tx) => (
                        <div key={tx.id} className="px-4 py-4 border-b border-white/10 hover:bg-white/6 transition cursor-pointer" onClick={() => openEdit(tx)}>
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-black truncate">{tx.description}</div>
                              <div className="mt-1 text-xs font-bold text-white/55 flex items-center gap-2">
                                <Chip tone="blue">
                                  <CalendarClock size={12} /> {engine.formatDate(tx.effectiveDateYMD)}
                                </Chip>
                                <CategoryBadge def={engine.CATEGORIES[tx.category]} />
                              </div>
                            </div>
                            <div className="font-black tabular-nums text-white/85">{engine.formatMoney(Math.abs(tx.amount), tx.currency)}</div>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>

              <div className="mt-3 text-xs font-bold text-white/50">
                Ha akarod, a következő körben megcsinálom a “Generate occurrences” gombot is (masterből automatikus hónapokra előregenerálás).
              </div>
            </GlassCard>
          </div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showTxModal && (
          <TransactionModal
            isOpen={showTxModal}
            onClose={() => setShowTxModal(false)}
            mode={txModalMode}
            txType={txModalType}
            engine={engine}
            editingTx={editingTx}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showConverter && <CurrencyConverterModal isOpen={showConverter} onClose={() => setShowConverter(false)} engine={engine} />}
      </AnimatePresence>

      <AnimatePresence>
        {confirm && (
          <ConfirmModal
            title="Biztosan törlöd?"
            description={
              confirm.kind === "selected"
                ? `Törlöd a kijelölt ${selected.size} tranzakciót?`
                : "Törlöd ezt a tranzakciót? Ez nem visszavonható."
            }
            onCancel={() => setConfirm(null)}
            onConfirm={() => {
              if (confirm.kind === "selected") deleteSelected();
              if (confirm.kind === "one" && confirm.id) engine.deleteOne(confirm.id);
              setConfirm(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default BudgetViewPro;
