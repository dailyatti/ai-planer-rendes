import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  TrendingUp,
  Trash2,
  X,
  Repeat,
  Wallet,
  RefreshCcw,
  ArrowUpRight,
  ArrowDownRight,
  CheckSquare,
  Square,
  AlertTriangle,
  Search,
  ChevronsLeft,
  ChevronsRight,
  ChevronLeft,
  ChevronRight,
  Check,
  Loader2,
  ArrowRightLeft,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart as RechartsPieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useBudgetAnalytics } from "./useBudgetAnalytics";
import { useLanguage } from "../../contexts/LanguageContext";
import { useData } from "../../contexts/DataContext";
import { AVAILABLE_CURRENCIES } from "../../constants/currencyData";
import { CurrencyService } from "../../services/CurrencyService";
import { parseMoneyInput } from "../../utils/numberUtils";
import { Transaction, TransactionPatch, TransactionPeriod } from "../../types/planner";

/* ------------------------------------------------------------------------------------
  Design goals
  - Zero “undefined crash”: every external edge is guarded
  - Date is handled as local date-only (YYYY-MM-DD), no UTC shift
  - Currency init handles sync/async/undefined return from fetchRealTimeRates
  - Charts always have valid container sizes (min height + minWidth:0)
  - Deletion is strictly scoped (batch delete preferred)
------------------------------------------------------------------------------------ */

type CategoryKey = "software" | "marketing" | "office" | "travel" | "service" | "freelance" | "other";
type CategoryDef = { color: string; label: string };
type CategoriesMap = Record<CategoryKey, CategoryDef>;

type RectLike = { top: number; left: number; right: number; bottom: number; width: number; height: number };

const cx = (...parts: Array<string | false | undefined | null>) => parts.filter(Boolean).join(" ");

const isFiniteNumber = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);

const normalizeDigits = (s: string) => {
  const cleaned = String(s ?? "").replace(/[^\d-]/g, "");
  return cleaned.startsWith("-") ? "-" + cleaned.slice(1).replace(/-/g, "") : cleaned.replace(/-/g, "");
};

function toRectLike(el: Element | null): RectLike | null {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
}

/* ----------------------- Date-only helpers (local safe) ----------------------- */

function parseYMD(ymd: string): { y: number; m: number; d: number } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return null;
  if (m < 1 || m > 12) return null;
  if (d < 1 || d > 31) return null;
  const dt = new Date(y, m - 1, d);
  if (Number.isNaN(dt.getTime())) return null;
  // validate round-trip (e.g. 2025-02-31)
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
  return { y, m, d };
}

function formatYMD(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function toYMDLocal(date: Date): string {
  return formatYMD(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

function parseLocalDate(date: Date | string): Date | null {
  if (date instanceof Date) return Number.isNaN(date.getTime()) ? null : date;
  if (typeof date === "string") {
    const p = parseYMD(date);
    if (p) return new Date(p.y, p.m - 1, p.d);
    const dt = new Date(date);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }
  return null;
}

function daysInMonth(y: number, m: number): number {
  return new Date(y, m, 0).getDate();
}

function addDaysYMD(ymd: string, days: number): string {
  const p = parseYMD(ymd);
  if (!p) return toYMDLocal(new Date());
  const dt = new Date(p.y, p.m - 1, p.d + days);
  return toYMDLocal(dt);
}

function addWeeksYMD(ymd: string, weeks: number): string {
  return addDaysYMD(ymd, weeks * 7);
}

function addMonthsClampedYMD(ymd: string, months: number): string {
  const p = parseYMD(ymd);
  if (!p) return toYMDLocal(new Date());
  let newM = p.m + months;
  let newY = p.y + Math.floor((newM - 1) / 12);
  newM = ((newM - 1) % 12) + 1;
  if (newM <= 0) {
    newM += 12;
    newY--;
  }
  const maxD = daysInMonth(newY, newM);
  return formatYMD(newY, newM, Math.min(p.d, maxD));
}

function addYearsClampedYMD(ymd: string, years: number): string {
  const p = parseYMD(ymd);
  if (!p) return toYMDLocal(new Date());
  const newY = p.y + years;
  const maxD = daysInMonth(newY, p.m);
  return formatYMD(newY, p.m, Math.min(p.d, maxD));
}

/* ----------------------- Robust guards for external types ----------------------- */

const isTransaction = (t: any): t is Transaction =>
  !!t &&
  typeof t === "object" &&
  typeof t.id === "string" &&
  typeof t.description === "string";

/* ----------------------- UI building blocks ----------------------- */

const Chip: React.FC<{ children: React.ReactNode; tone?: "neutral" | "blue" | "red" | "green" | "purple" }> = ({
  children,
  tone = "neutral",
}) => {
  const base = "inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-bold tracking-wide uppercase border";
  const tones: Record<string, string> = {
    neutral: "bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700",
    blue: "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/50",
    red: "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800/50",
    green:
      "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50",
    purple:
      "bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/50",
  };
  return <span className={cx(base, tones[tone])}>{children}</span>;
};

const IconPill: React.FC<{ children: React.ReactNode; tone?: "blue" | "red" | "green" | "neutral" }> = ({
  children,
  tone = "neutral",
}) => {
  const tones: Record<string, string> = {
    neutral: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200",
    blue: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
    red: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300",
    green: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300",
  };
  return <div className={cx("p-2 rounded-xl", tones[tone])}>{children}</div>;
};

const SectionCard: React.FC<{ title?: React.ReactNode; right?: React.ReactNode; children: React.ReactNode }> = ({
  title,
  right,
  children,
}) => (
  <div className="rounded-3xl border border-gray-200/70 dark:border-gray-700/60 bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl shadow-xl shadow-gray-200/30 dark:shadow-none overflow-hidden">
    {(title || right) && (
      <div className="px-5 py-4 flex items-center justify-between border-b border-gray-200/60 dark:border-gray-700/50 bg-white/40 dark:bg-gray-900/10">
        <div className="text-sm font-black text-gray-900 dark:text-white">{title}</div>
        <div>{right}</div>
      </div>
    )}
    <div className="p-5">{children}</div>
  </div>
);

const Button: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger"; leftIcon?: React.ReactNode }
> = ({ variant = "secondary", leftIcon, className, ...props }) => {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-black transition active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none";
  const variants: Record<string, string> = {
    secondary:
      "bg-white/70 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white hover:bg-white dark:hover:bg-gray-900/30",
    primary:
      "bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25 hover:brightness-110 border border-transparent",
    danger:
      "bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-lg shadow-red-500/20 hover:brightness-110 border border-transparent",
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
      "w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/20 px-4 py-2.5 text-sm font-semibold text-gray-900 dark:text-white placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400",
      className
    )}
    {...props}
  />
);

const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({ className, ...props }) => (
  <select
    className={cx(
      "w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/20 px-4 py-2.5 text-sm font-extrabold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400",
      className
    )}
    {...props}
  />
);

const Divider = () => <div className="h-px bg-gray-200/60 dark:bg-gray-700/50 my-4" />;

/* ----------------------- Category badge ----------------------- */

const CategoryBadge: React.FC<{ catKey: string; CATEGORIES: CategoriesMap; getCategoryKey: (c: string) => CategoryKey }> = React.memo(
  ({ catKey, CATEGORIES, getCategoryKey }) => {
    const key = getCategoryKey(String(catKey ?? "other"));
    const cat = CATEGORIES[key] || CATEGORIES.other;
    return (
      <span
        className="px-2.5 py-0.5 rounded-lg text-[10px] uppercase font-black tracking-wider border"
        style={{ backgroundColor: `${cat.color}14`, borderColor: `${cat.color}2a`, color: cat.color }}
      >
        {cat.label}
      </span>
    );
  }
);

/* ------------------------------------------------------------------------------------
  Modals
------------------------------------------------------------------------------------ */

const ModalShell: React.FC<{
  title: React.ReactNode;
  children: React.ReactNode;
  onClose: () => void;
  footer?: React.ReactNode;
  tone?: "neutral" | "blue" | "red" | "green";
}> = ({ title, children, onClose, footer, tone = "neutral" }) => {
  const headerTone: Record<string, string> = {
    neutral: "from-gray-900 to-gray-700",
    blue: "from-blue-600 to-indigo-700",
    red: "from-red-600 to-rose-700",
    green: "from-emerald-600 to-teal-700",
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.98 }}
        className="w-full max-w-lg rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-white dark:bg-gray-900"
        role="dialog"
        aria-modal="true"
      >
        <div className={cx("px-6 py-5 bg-gradient-to-br text-white", headerTone[tone])}>
          <div className="flex items-center justify-between gap-3">
            <div className="text-lg font-black">{title}</div>
            <button
              onClick={onClose}
              className="rounded-2xl p-2 bg-white/15 hover:bg-white/25 transition"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="px-6 py-5 max-h-[75vh] overflow-y-auto">{children}</div>

        {footer && <div className="px-6 py-5 border-t border-gray-200 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-950/20">{footer}</div>}
      </motion.div>
    </div>
  );
};

const DeleteConfirmModal: React.FC<{
  title: string;
  description?: string;
  onCancel: () => void;
  onConfirm: () => void;
}> = ({ title, description, onCancel, onConfirm }) => (
  <ModalShell
    title={
      <span className="inline-flex items-center gap-2">
        <AlertTriangle size={18} /> {title}
      </span>
    }
    tone="red"
    onClose={onCancel}
    footer={
      <div className="flex gap-3">
        <Button className="flex-1" onClick={onCancel}>
          Mégse
        </Button>
        <Button className="flex-1" variant="danger" onClick={onConfirm}>
          Törlés
        </Button>
      </div>
    }
  >
    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{description ?? "Biztosan folytatod? Ez nem visszavonható."}</p>
  </ModalShell>
);

const BreakdownPopover: React.FC<{
  isOpen: boolean;
  data: { title: string; breakdown: Record<string, number>; rect: RectLike } | null;
  onClose: () => void;
  CATEGORIES: CategoriesMap;
  formatMoney: (v: number) => string;
  getCategoryKey: (c: string) => CategoryKey;
}> = ({ isOpen, data, onClose, CATEGORIES, formatMoney, getCategoryKey }) => {
  if (!isOpen || !data) return null;
  if (typeof window === "undefined" || typeof document === "undefined") return null;

  // clamp to viewport
  const maxW = 360;
  const maxH = 320;
  const topPos = Math.min(data.rect.bottom + window.scrollY + 12, Math.max(12, document.documentElement.scrollHeight - maxH - 12));
  const leftPos = Math.min(Math.max(12, data.rect.left + window.scrollX - maxW * 0.25), window.innerWidth - maxW - 12);

  const entries = Object.entries(data.breakdown || {})
    .filter(([, v]) => isFiniteNumber(v))
    .sort(([, a], [, b]) => (b as number) - (a as number));

  return (
    <>
      <div className="fixed inset-0 z-[60]" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
        className="fixed z-[70] w-[360px] rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-2xl overflow-hidden"
        style={{ top: topPos, left: leftPos }}
      >
        <div className="px-4 py-3 flex items-center justify-between bg-gray-50 dark:bg-gray-950/30 border-b border-gray-200 dark:border-gray-800">
          <div className="font-black text-sm text-gray-900 dark:text-white">{data.title}</div>
          <button onClick={onClose} className="p-2 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-800 transition" aria-label="Close popover">
            <X size={16} />
          </button>
        </div>

        <div className="p-3 max-h-[320px] overflow-y-auto">
          {entries.length === 0 ? (
            <div className="p-6 text-center text-sm font-bold text-gray-500 dark:text-gray-400">Nincs adat.</div>
          ) : (
            entries.map(([rawKey, val], idx) => {
              const key = getCategoryKey(rawKey);
              const cat = CATEGORIES[key] || CATEGORIES.other;
              return (
                <div key={`${rawKey}-${idx}`} className="flex items-center justify-between p-2 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800/40 transition">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                    <span className="text-sm font-extrabold text-gray-700 dark:text-gray-200">{cat.label}</span>
                  </div>
                  <span className="text-sm font-black text-gray-900 dark:text-white">{formatMoney(val)}</span>
                </div>
              );
            })
          )}
        </div>
      </motion.div>
    </>
  );
};

const CurrencyConverterModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  language: string;
  baseCurrency: string;
  formatMoney: (n: number, c?: string) => string;
  safeConvert: (amount: number, from: string, to: string) => number;
}> = ({ isOpen, onClose, language, baseCurrency, formatMoney, safeConvert }) => {
  const [from, setFrom] = useState(baseCurrency || "USD");
  const [to, setTo] = useState("EUR");
  const [amount, setAmount] = useState("100");
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  useEffect(() => {
    if (!isOpen) return;
    setFrom(baseCurrency || "USD");
  }, [isOpen, baseCurrency]);

  const swap = () => {
    setFrom(to);
    setTo(from);
  };

  const parsedAmount = useMemo(() => {
    const n = parseMoneyInput(amount);
    return Number.isFinite(n) ? n : 0;
  }, [amount]);

  const converted = useMemo(() => safeConvert(parsedAmount, from, to), [parsedAmount, from, to, safeConvert]);

  const rate = useMemo(() => {
    const one = safeConvert(1, from, to);
    return Number.isFinite(one) ? one : 0;
  }, [from, to, safeConvert]);

  const refreshRates = async () => {
    setLoading(true);
    try {
      const maybe = CurrencyService?.fetchRealTimeRates?.();
      await Promise.resolve(maybe); // handles sync / async / undefined
      const dt = new Intl.DateTimeFormat(language === "hu" ? "hu-HU" : "en-US", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date());
      setLastUpdated(dt);
    } catch (e) {
      // do not crash the app
      console.warn("Rate refresh failed:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    // best effort auto refresh once
    refreshRates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <ModalShell
      title={
        <span className="inline-flex items-center gap-2">
          <RefreshCcw size={18} /> Valuta váltó
        </span>
      }
      tone="blue"
      onClose={onClose}
      footer={
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="text-xs font-bold text-gray-600 dark:text-gray-300">
            {lastUpdated ? <>Frissítve: <span className="font-black">{lastUpdated}</span></> : "Frissítés folyamatban / nincs timestamp"}
          </div>
          <Button onClick={refreshRates} leftIcon={loading ? <Loader2 className="animate-spin" size={16} /> : <RefreshCcw size={16} />}>
            Árfolyam frissítés
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 items-end">
          <div className="space-y-2">
            <div className="text-xs font-black uppercase tracking-wide text-gray-600 dark:text-gray-300">From</div>
            <Select value={from} onChange={(e) => setFrom(e.target.value)}>
              {AVAILABLE_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} ({c.symbol})
                </option>
              ))}
            </Select>
          </div>

          <div className="flex justify-center">
            <button
              onClick={swap}
              className="mt-6 sm:mt-0 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/20 p-3 hover:bg-white dark:hover:bg-gray-900/30 transition"
              aria-label="Swap currencies"
              title="Swap"
            >
              <ArrowRightLeft size={18} className="text-gray-800 dark:text-gray-100" />
            </button>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-black uppercase tracking-wide text-gray-600 dark:text-gray-300">To</div>
            <Select value={to} onChange={(e) => setTo(e.target.value)}>
              {AVAILABLE_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} ({c.symbol})
                </option>
              ))}
            </Select>
          </div>
        </div>

        <Divider />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-2">
            <div className="text-xs font-black uppercase tracking-wide text-gray-600 dark:text-gray-300">Összeg</div>
            <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="100" />
            <div className="text-xs font-bold text-gray-500 dark:text-gray-400">
              1 {from} ≈ <span className="font-black">{formatMoney(rate, to)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-black uppercase tracking-wide text-gray-600 dark:text-gray-300">Eredmény</div>
            <div className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-gray-50 to-white dark:from-gray-950/30 dark:to-gray-900/20 p-4">
              <div className="text-sm font-black text-gray-700 dark:text-gray-300">Converted</div>
              <div className="text-2xl font-black text-gray-900 dark:text-white tabular-nums">{formatMoney(converted, to)}</div>
              <div className="mt-1 text-xs font-bold text-gray-500 dark:text-gray-400">
                {formatMoney(parsedAmount, from)} → {formatMoney(converted, to)}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-blue-200/60 dark:border-blue-800/40 bg-blue-50/60 dark:bg-blue-950/20 p-4">
          <div className="text-sm font-black text-blue-900 dark:text-blue-200">Pro tipp</div>
          <div className="text-xs font-bold text-blue-800/80 dark:text-blue-200/80 mt-1">
            Ha a konverzió 0-t ad, az általában azt jelenti, hogy a CurrencyService-ben még nincs rate az adott devizára — nyomj “Árfolyam frissítés”-t, és ellenőrizd a service fallback logikát.
          </div>
        </div>
      </div>
    </ModalShell>
  );
};

/* ------------------------------------------------------------------------------------
  Transactions list row
------------------------------------------------------------------------------------ */

const TransactionRow: React.FC<{
  tr: Transaction;
  selected: boolean;
  onToggle: (id: string) => void;
  onOpen: (tr: Transaction) => void;
  onDelete: (id: string) => void;
  CATEGORIES: CategoriesMap;
  getCategoryKey: (c: string) => CategoryKey;
  formatDate: (d: Date | string) => string;
  formatMoney: (v: number, c?: string) => string;
  getTrCurrency: (tr: Transaction) => string;
  getPeriodLabel: (p: TransactionPeriod) => string;
}> = React.memo(
  ({ tr, selected, onToggle, onOpen, onDelete, CATEGORIES, getCategoryKey, formatDate, formatMoney, getTrCurrency, getPeriodLabel }) => {
    const isIncome = tr.type === "income";
    const amountAbs = isFiniteNumber(tr.amount) ? Math.abs(tr.amount) : 0;

    return (
      <div
        className={cx(
          "group flex items-center justify-between gap-3 px-4 py-4 border-l-4 transition cursor-pointer",
          "hover:bg-gray-50/70 dark:hover:bg-gray-800/40",
          selected ? "bg-blue-50/50 dark:bg-blue-950/15 border-l-blue-500" : "border-l-transparent hover:border-l-indigo-300 dark:hover:border-l-indigo-700"
        )}
        role="button"
        tabIndex={0}
        onClick={() => onOpen(tr)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onOpen(tr);
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle(tr.id);
            }}
            className={cx(
              "p-2 rounded-2xl border transition",
              selected
                ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/25"
                : "bg-white/60 dark:bg-gray-900/20 text-gray-400 hover:text-blue-600 border-gray-200 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-950/20"
            )}
            aria-label={selected ? "Deselect transaction" : "Select transaction"}
          >
            {selected ? <CheckSquare size={18} /> : <Square size={18} />}
          </button>

          <IconPill tone={isIncome ? "green" : "red"}>
            {isIncome ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
          </IconPill>

          <div className="min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="font-black text-gray-900 dark:text-white truncate">{tr.description || "—"}</div>
              {tr.recurring && (
                <Chip tone="purple">
                  <Repeat size={12} /> sablon
                </Chip>
              )}
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-bold text-gray-600 dark:text-gray-300">
              <CategoryBadge catKey={String(tr.category ?? "other")} CATEGORIES={CATEGORIES} getCategoryKey={getCategoryKey} />
              <span className="text-gray-300 dark:text-gray-600">•</span>
              <span>{formatDate(tr.date)}</span>
              <span className="text-gray-300 dark:text-gray-600">•</span>
              <Chip>{getPeriodLabel((tr.period as TransactionPeriod) ?? "oneTime")}</Chip>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className={cx("text-right font-black tabular-nums", isIncome ? "text-emerald-600 dark:text-emerald-400" : "text-gray-900 dark:text-white")}>
            {isIncome ? "+" : "−"}
            {formatMoney(amountAbs, getTrCurrency(tr))}
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(tr.id);
            }}
            className={cx(
              "p-2 rounded-2xl border border-transparent transition opacity-0 group-hover:opacity-100",
              "hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 text-gray-400"
            )}
            aria-label="Delete transaction"
            title="Törlés"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
    );
  }
);

/* ------------------------------------------------------------------------------------
  Main Controller (PhD-grade guards + stable memo + safe deletes)
------------------------------------------------------------------------------------ */

type DeleteConfirmKind = "selected" | "all" | "period" | null;

const useBudgetController = () => {
  const { t, language } = useLanguage();
  const data = useData();

  const rawTransactions = (data as any)?.transactions;
  const addTransaction = (data as any)?.addTransaction;
  const updateTransaction = (data as any)?.updateTransaction;
  const deleteTransaction = (data as any)?.deleteTransaction;
  const deleteTransactions = (data as any)?.deleteTransactions;

  const transactions = useMemo<Transaction[]>(() => {
    if (!Array.isArray(rawTransactions)) return [];
    // Clone to avoid stale memo in analytics
    return rawTransactions.filter(isTransaction).map((x: Transaction) => ({ ...x }));
  }, [rawTransactions]);

  // Safe APIs
  const safeAdd = useCallback(
    (payload: any) => {
      if (typeof addTransaction === "function") return addTransaction(payload);
      console.warn("addTransaction missing");
    },
    [addTransaction]
  );

  const safeUpdate = useCallback(
    (id: string, patch: TransactionPatch) => {
      if (!id) return;
      if (typeof updateTransaction === "function") return updateTransaction(id, patch);
      console.warn("updateTransaction missing");
    },
    [updateTransaction]
  );

  const safeDeleteOne = useCallback(
    (id: string) => {
      if (!id) return;
      // Prefer batch delete for single id to avoid “delete all” class of bugs
      if (typeof deleteTransactions === "function") return deleteTransactions([id]);
      if (typeof deleteTransaction === "function") return deleteTransaction(id);
      console.warn("No delete function available");
    },
    [deleteTransactions, deleteTransaction]
  );

  const safeDeleteMany = useCallback(
    (ids: string[]) => {
      const clean = (ids || []).filter(Boolean);
      if (clean.length === 0) return;
      if (typeof deleteTransactions === "function") return deleteTransactions(clean);
      clean.forEach(safeDeleteOne);
    },
    [deleteTransactions, safeDeleteOne]
  );

  /* ----------------------- state ----------------------- */

  const [currency, setCurrency] = useState<string>("USD");
  const [activeTab, setActiveTab] = useState<"overview" | "transactions" | "planning">("overview");

  const [showMasters, setShowMasters] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmKind>(null);
  const [deletePeriodFilter, setDeletePeriodFilter] = useState<TransactionPeriod | "all">("all");

  const [selectedStat, setSelectedStat] = useState<{ title: string; breakdown: Record<string, number>; rect: RectLike } | null>(null);

  const [showConverter, setShowConverter] = useState(false);

  const [showTxModal, setShowTxModal] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [txType, setTxType] = useState<"income" | "expense">("expense");
  const [addToBalanceImmediately, setAddToBalanceImmediately] = useState(true);

  const ITEMS_PER_PAGE = 50;
  const [page, setPage] = useState(1);
  const [projectionYears, setProjectionYears] = useState(1);

  const isCategoryKey = (v: string): v is CategoryKey =>
    ["software", "marketing", "office", "travel", "service", "freelance", "other"].includes(v);

  const getCategoryKey = useCallback((cat: string): CategoryKey => (isCategoryKey(cat) ? cat : "other"), []);

  const CATEGORIES = useMemo<CategoriesMap>(
    () => ({
      software: { color: "#4361ee", label: t("budget.software") || "Software" },
      marketing: { color: "#a855f7", label: t("budget.marketing") || "Marketing" },
      office: { color: "#06b6d4", label: t("budget.office") || "Office" },
      travel: { color: "#f59e0b", label: t("budget.travel") || "Travel" },
      service: { color: "#10b981", label: t("budget.service") || "Service" },
      freelance: { color: "#3b82f6", label: t("budget.freelance") || "Freelance" },
      other: { color: "#9ca3af", label: t("budget.other") || "Other" },
    }),
    [t, language]
  );

  // Intl formatter cache
  const fmtCache = useRef<Map<string, Intl.NumberFormat>>(new Map());
  useEffect(() => {
    fmtCache.current.clear();
  }, [language]);

  const getFormatter = useCallback(
    (currencyCode: string) => {
      const loc = language === "hu" ? "hu-HU" : "en-US";
      const key = `${loc}-${currencyCode}`;
      if (!fmtCache.current.has(key)) {
        fmtCache.current.set(
          key,
          new Intl.NumberFormat(loc, {
            style: "currency",
            currency: currencyCode,
            maximumFractionDigits: 2,
          })
        );
      }
      return fmtCache.current.get(key)!;
    },
    [language]
  );

  const formatMoney = useCallback(
    (amount: number, currencyOverride?: string) => {
      const safe = Number.isFinite(amount) ? amount : 0;
      return getFormatter(currencyOverride || currency).format(safe);
    },
    [currency, getFormatter]
  );

  const formatDate = useCallback(
    (date: Date | string) => {
      const d = parseLocalDate(date);
      if (!d) return "—";
      const loc = language === "hu" ? "hu-HU" : "en-US";
      return new Intl.DateTimeFormat(loc, { year: "numeric", month: "short", day: "numeric" }).format(d);
    },
    [language]
  );

  const getTrCurrency = useCallback(
    (tr: Transaction) => (tr?.currency && typeof tr.currency === "string" ? tr.currency : currency),
    [currency]
  );

  const safeConvert = useCallback((amount: number, from: string, to: string) => {
    if (!Number.isFinite(amount) || amount === 0) return 0;
    if (!from || !to || from === to) return amount;
    try {
      const v = CurrencyService.convert(amount, from, to);
      return Number.isFinite(v) ? v : 0;
    } catch (e) {
      console.warn("Conversion error:", e);
      return 0;
    }
  }, []);

  // Init rates (best effort, never crash)
  useEffect(() => {
    try {
      const maybe = CurrencyService?.fetchRealTimeRates?.();
      Promise.resolve(maybe).catch((e) => console.warn("Currency init failed:", e));
    } catch (e) {
      console.warn("Currency init crashed:", e);
    }
  }, []);

  const dateToMs = useCallback((x: Date | string) => {
    const d = parseLocalDate(x);
    return d ? d.getTime() : 0;
  }, []);

  const visibleTransactions = useMemo(() => {
    return showMasters ? transactions : transactions.filter((tr: any) => tr?.kind !== "master");
  }, [transactions, showMasters]);

  const sortedTransactions = useMemo(() => {
    return [...visibleTransactions].sort((a, b) => dateToMs(b.date) - dateToMs(a.date));
  }, [visibleTransactions, dateToMs]);

  const filteredTransactions = useMemo(() => {
    let list = sortedTransactions;

    const st = searchTerm.trim();
    if (st) {
      const lower = st.toLowerCase();
      const needleNum = normalizeDigits(st);
      const hasDigits = /\d/.test(needleNum);

      list = list.filter((tr) => {
        const desc = String(tr.description ?? "").toLowerCase();
        const amt = normalizeDigits(String(tr.amount ?? ""));
        return desc.includes(lower) || (hasDigits && amt.includes(needleNum));
      });
    }

    if (filterCategory !== "all") {
      list = list.filter((tr) => String(tr.category ?? "other") === filterCategory);
    }

    return list;
  }, [sortedTransactions, searchTerm, filterCategory]);

  useEffect(() => {
    setPage(1);
    setSelected(new Set());
  }, [searchTerm, filterCategory, showMasters]);

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE));
  const paginated = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return filteredTransactions.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredTransactions, page]);

  const selectAllPage = useCallback(() => {
    setSelected(new Set(paginated.map((t) => t.id)));
  }, [paginated]);

  const clearSelection = useCallback(() => setSelected(new Set()), []);

  const toggleSelection = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  /* ----------------------- Transaction modal state ----------------------- */

  const emptyDraft = useMemo(
    () => ({
      description: "",
      amount: "",
      category: "other",
      currency: currency,
      period: "oneTime" as TransactionPeriod,
      date: toYMDLocal(new Date()),
      recurring: false,
      interestRate: "",
    }),
    [currency]
  );

  const [draft, setDraft] = useState(() => emptyDraft);

  useEffect(() => {
    if (editing) return;
    if (showTxModal) return;
    setDraft((d) => ({ ...d, currency }));
  }, [currency, editing, showTxModal]);

  const openCreate = useCallback(
    (type: "income" | "expense") => {
      setTxType(type);
      setEditing(null);
      setDraft({ ...emptyDraft, currency, date: toYMDLocal(new Date()) });
      setAddToBalanceImmediately(true);
      setShowTxModal(true);
    },
    [currency, emptyDraft]
  );

  const openEdit = useCallback(
    (tr: Transaction) => {
      // if there is active selection, clicking should toggle selection (handled in UI)
      setTxType((tr.type as any) === "income" ? "income" : "expense");
      setEditing(tr);

      const dateStr =
        typeof tr.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(tr.date)
          ? tr.date
          : (() => {
            const d = parseLocalDate(tr.date);
            return d ? toYMDLocal(d) : toYMDLocal(new Date());
          })();

      setDraft({
        description: String(tr.description ?? ""),
        amount: isFiniteNumber(tr.amount) ? String(Math.abs(tr.amount)) : "",
        category: String(tr.category ?? "other"),
        currency: getTrCurrency(tr) ?? currency,
        period: ((tr.period as TransactionPeriod) ?? "oneTime") as TransactionPeriod,
        date: dateStr,
        recurring: !!tr.recurring,
        interestRate: tr.interestRate != null ? String(tr.interestRate) : "",
      });

      setAddToBalanceImmediately(true);
      setShowTxModal(true);
    },
    [currency, getTrCurrency]
  );

  const getPeriodLabel = useCallback(
    (p: TransactionPeriod) => {
      const labels: Record<TransactionPeriod, string> = {
        daily: t("budget.daily") || "Daily",
        weekly: t("budget.weekly") || "Weekly",
        monthly: t("budget.monthly") || "Monthly",
        yearly: t("budget.yearly") || "Yearly",
        oneTime: t("budget.oneTime") || "One-time",
      };
      return labels[p] || labels.oneTime;
    },
    [t]
  );

  const closeTxModal = useCallback(() => {
    setShowTxModal(false);
    setEditing(null);
  }, []);

  const validateDraft = useCallback((): { ok: true; amount: number; date: string } | { ok: false; reason: string } => {
    const desc = draft.description.trim();
    if (!desc) return { ok: false, reason: "Adj meg leírást!" };

    const amt = parseMoneyInput(draft.amount);
    if (!Number.isFinite(amt) || amt === 0) return { ok: false, reason: "Érvénytelen összeg!" };

    const p = parseYMD(draft.date);
    if (!p) return { ok: false, reason: "Érvénytelen dátum!" };

    return { ok: true, amount: amt, date: draft.date };
  }, [draft.amount, draft.date, draft.description]);

  const saveDraft = useCallback(() => {
    const v = validateDraft();
    if (!v.ok) {
      alert(v.reason);
      return;
    }

    const isRecurring = draft.period !== "oneTime";
    const interestParsed = draft.interestRate.trim() !== "" ? parseMoneyInput(draft.interestRate) : null;
    const interest = Number.isFinite(interestParsed as number) ? (interestParsed as number) : null;

    const baseProps = {
      description: draft.description.trim(),
      category: String(draft.category ?? "other"),
      type: txType,
      currency: draft.currency || currency,
      amount: txType === "expense" ? -Math.abs(v.amount) : Math.abs(v.amount),
    };

    if (editing) {
      const patch: TransactionPatch = {
        ...baseProps,
        date: v.date,
        period: draft.period,
        recurring: isRecurring,
        kind: isRecurring ? "master" : null, // null -> remove field
        interestRate: interest, // null -> remove field
      };
      safeUpdate(editing.id, patch);
    } else {
      const createPayload: any = {
        ...baseProps,
        date: v.date,
        period: draft.period,
        recurring: isRecurring,
        kind: isRecurring ? "master" : undefined,
        interestRate: interest ?? undefined,
      };

      if (isRecurring && addToBalanceImmediately) {
        // 1) add first occurrence now (oneTime)
        safeAdd({ ...createPayload, period: "oneTime", recurring: false, kind: undefined });

        // 2) add master for future occurrences
        let nextDate = v.date;
        switch (draft.period) {
          case "daily":
            nextDate = addDaysYMD(v.date, 1);
            break;
          case "weekly":
            nextDate = addWeeksYMD(v.date, 1);
            break;
          case "monthly":
            nextDate = addMonthsClampedYMD(v.date, 1);
            break;
          case "yearly":
            nextDate = addYearsClampedYMD(v.date, 1);
            break;
          default:
            nextDate = v.date;
        }

        safeAdd({ ...createPayload, date: nextDate, recurring: true, kind: "master" });
      } else {
        safeAdd(createPayload);
      }
    }

    setDraft({ ...emptyDraft, currency, date: toYMDLocal(new Date()) });
    setAddToBalanceImmediately(true);
    setEditing(null);
    setShowTxModal(false);
  }, [addToBalanceImmediately, currency, draft, editing, emptyDraft, safeAdd, safeUpdate, txType, validateDraft]);

  /* ----------------------- delete flows ----------------------- */

  const deleteSelected = useCallback(() => {
    safeDeleteMany(Array.from(selected));
    setSelected(new Set());
    setSelectedStat(null);
    setSearchTerm("");
    setFilterCategory("all");
    setShowTxModal(false);
    setEditing(null);
  }, [safeDeleteMany, selected]);

  const deleteByPeriod = useCallback(
    (period: TransactionPeriod | "all") => {
      // delete ALL should delete everything, including hidden masters
      const base = period === "all" ? transactions : visibleTransactions;
      const ids = period === "all" ? base.map((t) => t.id) : base.filter((t) => t.period === period).map((t) => t.id);
      safeDeleteMany(ids);

      setSelected(new Set());
      setSelectedStat(null);
      setSearchTerm("");
      setFilterCategory("all");
      setShowTxModal(false);
      setEditing(null);
    },
    [safeDeleteMany, transactions, visibleTransactions]
  );

  /* ----------------------- analytics ----------------------- */

  const analyticsTransactions = useMemo(() => {
    // Analytics should match the UI visibility (masters toggle)
    return showMasters ? transactions : transactions.filter((t: any) => t?.kind !== "master");
  }, [transactions, showMasters]);

  const analytics = useBudgetAnalytics(analyticsTransactions, currency, safeConvert, projectionYears);

  return {
    t,
    language,
    currency,
    setCurrency,
    activeTab,
    setActiveTab,

    CATEGORIES,
    getCategoryKey,
    formatMoney,
    formatDate,
    getTrCurrency,
    getPeriodLabel,

    transactions,
    visibleTransactions,
    filteredTransactions,
    paginated,
    ITEMS_PER_PAGE,
    page,
    setPage,
    totalPages,

    searchTerm,
    setSearchTerm,
    filterCategory,
    setFilterCategory,
    showMasters,
    setShowMasters,

    selected,
    toggleSelection,
    selectAllPage,
    clearSelection,

    deleteConfirm,
    setDeleteConfirm,
    deletePeriodFilter,
    setDeletePeriodFilter,
    deleteSelected,
    deleteByPeriod,
    safeDeleteOne,

    selectedStat,
    setSelectedStat,

    showConverter,
    setShowConverter,
    safeConvert,

    showTxModal,
    setShowTxModal,
    editing,
    txType,
    openCreate,
    openEdit,
    closeTxModal,
    draft,
    setDraft,
    addToBalanceImmediately,
    setAddToBalanceImmediately,
    saveDraft,

    projectionYears,
    setProjectionYears,

    ...analytics,
  };
};

/* ------------------------------------------------------------------------------------
  Header + tabs
------------------------------------------------------------------------------------ */

const BudgetHeader: React.FC<{
  title: string;
  subtitle: string;
  currency: string;
  onCurrencyChange: (c: string) => void;
  onOpenConverter: () => void;
  onAddIncome: () => void;
  onAddExpense: () => void;
}> = ({ title, subtitle, currency, onCurrencyChange, onOpenConverter, onAddIncome, onAddExpense }) => (
  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
    <div>
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20">
          <Wallet size={18} className="text-white" />
        </div>
        <div>
          <div className="text-2xl font-black text-gray-900 dark:text-white">{title}</div>
          <div className="text-sm font-bold text-gray-600 dark:text-gray-400">{subtitle}</div>
        </div>
        <Chip tone="blue">PRO</Chip>
      </div>
    </div>

    <div className="flex flex-wrap items-center gap-2">
      <Select className="w-auto" value={currency} onChange={(e) => onCurrencyChange(e.target.value)}>
        {AVAILABLE_CURRENCIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.code} ({c.symbol})
          </option>
        ))}
      </Select>

      <Button variant="secondary" onClick={onOpenConverter} leftIcon={<RefreshCcw size={16} />}>
        Valuta váltó
      </Button>

      <Button variant="secondary" onClick={onAddIncome} leftIcon={<TrendingUp size={16} />}>
        Bevétel
      </Button>

      <Button variant="primary" onClick={onAddExpense} leftIcon={<Plus size={16} />}>
        Kiadás
      </Button>
    </div>
  </div>
);

const Tabs: React.FC<{ active: string; onChange: (t: any) => void; labels: Array<{ key: any; label: string }> }> = ({
  active,
  onChange,
  labels,
}) => (
  <div className="flex items-center gap-2 border-b border-gray-200/70 dark:border-gray-700/50">
    {labels.map((tab) => {
      const isActive = active === tab.key;
      return (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={cx(
            "relative px-4 py-3 text-sm font-black transition",
            isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
          )}
        >
          {tab.label}
          {isActive && <div className="absolute left-0 right-0 -bottom-[1px] h-[3px] bg-blue-500 rounded-t-full" />}
        </button>
      );
    })}
  </div>
);

/* ------------------------------------------------------------------------------------
  Transaction modal
------------------------------------------------------------------------------------ */

const TransactionModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  t: (k: string) => string;
  type: "income" | "expense";
  editing: boolean;
  draft: any;
  setDraft: (v: any) => void;
  CATEGORIES: CategoriesMap;
  periodLabel: (p: TransactionPeriod) => string;
  addToBalanceImmediately: boolean;
  setAddToBalanceImmediately: (v: boolean) => void;
  onSave: () => void;
}> = ({
  isOpen,
  onClose,
  t,
  type,
  editing,
  draft,
  setDraft,
  CATEGORIES,
  periodLabel,
  addToBalanceImmediately,
  setAddToBalanceImmediately,
  onSave,
}) => {
    if (!isOpen) return null;

    const tone = type === "income" ? "green" : "red";
    const title = editing ? (type === "income" ? "Bevétel szerkesztése" : "Kiadás szerkesztése") : type === "income" ? t("budget.addIncome") : t("budget.addExpense");

    const periods: TransactionPeriod[] = ["oneTime", "daily", "weekly", "monthly", "yearly"];
    const isRecurring = draft.period !== "oneTime";

    return (
      <ModalShell
        title={title}
        tone={tone}
        onClose={onClose}
        footer={
          <div className="flex flex-col gap-3">
            {isRecurring && !editing && (
              <label className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={addToBalanceImmediately}
                  onChange={(e) => setAddToBalanceImmediately(e.target.checked)}
                />
                Első alkalom azonnal kerüljön hozzáadásra (és legyen külön sablon a jövőre)
              </label>
            )}
            <Button variant={type === "income" ? "primary" : "danger"} className="w-full py-3" onClick={onSave}>
              {editing ? (t("common.save") || "Mentés") : (t("budget.addTransaction") || "Hozzáadás")}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="rounded-3xl border border-white/10 bg-white/10 p-4">
            <div className="text-xs font-black uppercase tracking-wide text-white/80">Összeg</div>
            <div className="mt-2 flex items-center gap-2">
              <input
                className="w-full bg-transparent text-4xl font-black text-white placeholder:text-white/50 outline-none"
                inputMode="decimal"
                placeholder="0"
                value={draft.amount}
                onChange={(e) => setDraft({ ...draft, amount: e.target.value })}
                autoFocus
              />
              <Select className="w-auto bg-white/15 text-white border-white/20" value={draft.currency} onChange={(e) => setDraft({ ...draft, currency: e.target.value })}>
                {AVAILABLE_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-black uppercase tracking-wide text-gray-600 dark:text-gray-300">{t("budget.description") || "Leírás"}</div>
            <Input value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Pl. Hosting / Ads / Ügyfél munka..." />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <div className="text-xs font-black uppercase tracking-wide text-gray-600 dark:text-gray-300">{t("budget.category") || "Kategória"}</div>
              <Select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>
                {Object.entries(CATEGORIES).map(([key, cat]) => (
                  <option key={key} value={key}>
                    {cat.label}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-black uppercase tracking-wide text-gray-600 dark:text-gray-300">{t("budget.date") || "Dátum"}</div>
              <Input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-black uppercase tracking-wide text-gray-600 dark:text-gray-300">Gyakoriság</div>
            <div className="flex flex-wrap gap-2">
              {periods.map((p) => {
                const active = draft.period === p;
                return (
                  <button
                    key={p}
                    onClick={() => setDraft({ ...draft, period: p, recurring: p !== "oneTime" })}
                    className={cx(
                      "px-3 py-2 rounded-2xl border text-sm font-black transition",
                      active
                        ? "bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 border-blue-300/60 dark:border-blue-800/40"
                        : "bg-white/60 dark:bg-gray-900/20 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-900/30"
                    )}
                  >
                    {periodLabel(p)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-black uppercase tracking-wide text-gray-600 dark:text-gray-300">Kamat / Hozam (opcionális)</div>
            <Input
              inputMode="decimal"
              value={draft.interestRate}
              onChange={(e) => setDraft({ ...draft, interestRate: e.target.value })}
              placeholder="pl. 5 (ha százalékot használsz a rendszerben) vagy 0.05 (ha arányt)"
            />
            <div className="text-xs font-bold text-gray-500 dark:text-gray-400">
              Ha a backended % vagy arány szerint várja, igazítsd a Currency/Analytics oldalon. Itt csak “szám”-ként tároljuk.
            </div>
          </div>

          {isRecurring && (
            <div className="rounded-3xl border border-purple-200/60 dark:border-purple-800/40 bg-purple-50/60 dark:bg-purple-950/20 p-4">
              <div className="text-sm font-black text-purple-900 dark:text-purple-200 flex items-center gap-2">
                <Repeat size={16} /> Ismétlődő tétel
              </div>
              <div className="text-xs font-bold text-purple-800/80 dark:text-purple-200/80 mt-1">
                Az ismétlődő tételeket “master/sablon” jelöléssel kezeli a rendszer (masters toggle).
              </div>
            </div>
          )}
        </div>
      </ModalShell>
    );
  };

/* ------------------------------------------------------------------------------------
  Main View
------------------------------------------------------------------------------------ */

const BudgetView: React.FC = () => {
  const ctrl = useBudgetController();
  const { t } = ctrl;

  const monthNames = useMemo(() => {
    const fallback = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const arr = [
      t("months.january"),
      t("months.february"),
      t("months.march"),
      t("months.april"),
      t("months.may"),
      t("months.june"),
      t("months.july"),
      t("months.august"),
      t("months.september"),
      t("months.october"),
      t("months.november"),
      t("months.december"),
    ];
    return arr.map((x, i) => (x ? String(x) : fallback[i]));
  }, [t]);

  const cashFlowChartData = useMemo(() => {
    const raw = Array.isArray(ctrl.cashFlowData) ? ctrl.cashFlowData : [];
    return raw
      .filter((d: any) => d && Number.isFinite(d.monthIndex))
      .map((d: any) => ({
        name: monthNames?.[d.monthIndex] ? String(monthNames[d.monthIndex]).slice(0, 3) : `M${d.monthIndex + 1}`,
        income: Number(d.income) || 0,
        expense: Number(d.expense) || 0,
      }));
  }, [ctrl.cashFlowData, monthNames]);

  const categoryData = useMemo(() => {
    const safeTotals = ctrl.categoryTotals && typeof ctrl.categoryTotals === "object" ? (ctrl.categoryTotals as any) : {};
    return Object.entries(safeTotals)
      .map(([key, value]) => ({
        name: ctrl.CATEGORIES[ctrl.getCategoryKey(key)]?.label ?? key,
        value: Number(value) || 0,
        color: ctrl.CATEGORIES[ctrl.getCategoryKey(key)]?.color ?? "#9ca3af",
      }))
      .filter((x) => Number.isFinite(x.value))
      .sort((a, b) => b.value - a.value);
  }, [ctrl.categoryTotals, ctrl.CATEGORIES, ctrl.getCategoryKey]);

  const onStatBreakdown = useCallback(
    (e: React.MouseEvent, title: string, breakdown: Record<string, number>) => {
      const rect = toRectLike(e.currentTarget as Element);
      if (rect) ctrl.setSelectedStat({ title, breakdown, rect });
    },
    [ctrl]
  );

  const showBulkBar = ctrl.selected.size > 0;

  return (
    <div className="max-w-7xl mx-auto p-3 space-y-4">
      <BudgetHeader
        title={t("budget.title") || "Budget"}
        subtitle={t("budget.subtitle") || "Tranzakciók, kategóriák, cashflow, projekciók."}
        currency={ctrl.currency}
        onCurrencyChange={ctrl.setCurrency}
        onOpenConverter={() => ctrl.setShowConverter(true)}
        onAddIncome={() => ctrl.openCreate("income")}
        onAddExpense={() => ctrl.openCreate("expense")}
      />

      <Tabs
        active={ctrl.activeTab}
        onChange={ctrl.setActiveTab}
        labels={[
          { key: "overview", label: t("budget.overview") || "Áttekintés" },
          { key: "transactions", label: t("budget.transactions") || "Tranzakciók" },
          { key: "planning", label: t("budget.planning") || "Tervezés" },
        ]}
      />

      {/* OVERVIEW */}
      {ctrl.activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <SectionCard>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="text-xs font-black uppercase tracking-wide text-gray-500 dark:text-gray-400">Egyenleg</div>
                <div className="text-3xl font-black text-gray-900 dark:text-white tabular-nums">{ctrl.formatMoney(ctrl.balance)}</div>
              </div>
              <div className="p-3 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20">
                <Wallet size={20} className="text-white" />
              </div>
            </div>
            <Divider />
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-3xl border border-emerald-200/60 dark:border-emerald-800/40 bg-emerald-50/60 dark:bg-emerald-950/20 p-4">
                <div className="text-xs font-black uppercase tracking-wide text-emerald-800/80 dark:text-emerald-200/80">Bevétel</div>
                <div className="text-xl font-black text-emerald-700 dark:text-emerald-300 tabular-nums">{ctrl.formatMoney(ctrl.totalIncome)}</div>
              </div>
              <button
                onClick={(e) => onStatBreakdown(e, t("budget.expenseCategories") || "Kiadások bontása", ctrl.categoryTotals as any)}
                className="text-left rounded-3xl border border-red-200/60 dark:border-red-800/40 bg-red-50/60 dark:bg-red-950/20 p-4 hover:brightness-[0.99] transition"
              >
                <div className="text-xs font-black uppercase tracking-wide text-red-800/80 dark:text-red-200/80">Kiadás</div>
                <div className="text-xl font-black text-red-700 dark:text-red-300 tabular-nums">{ctrl.formatMoney(ctrl.totalExpense)}</div>
                <div className="mt-2 text-[11px] font-black text-red-700/70 dark:text-red-300/70 inline-flex items-center gap-1">
                  részletek <ChevronRight size={14} />
                </div>
              </button>
            </div>
          </SectionCard>

          <SectionCard title={t("budget.cashFlow") || "Cashflow"}>
            <div className="min-h-[260px] w-full min-w-0">
              {cashFlowChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260} className="min-w-0">
                  <AreaChart data={cashFlowChartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.45} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="income" stroke="#10b981" fill="#10b981" fillOpacity={0.22} />
                    <Area type="monotone" dataKey="expense" stroke="#ef4444" fill="#ef4444" fillOpacity={0.18} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="min-h-[260px] flex items-center justify-center text-sm font-bold text-gray-500 dark:text-gray-400">Nincs adat.</div>
              )}
            </div>
          </SectionCard>

          <SectionCard title={t("budget.expenseCategories") || "Kategóriák"}>
            <div className="min-h-[260px] w-full min-w-0">
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260} className="min-w-0">
                  <RechartsPieChart>
                    <Pie data={categoryData} cx="50%" cy="48%" innerRadius={70} outerRadius={96} paddingAngle={4} dataKey="value">
                      {categoryData.map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              ) : (
                <div className="min-h-[260px] flex items-center justify-center text-sm font-bold text-gray-500 dark:text-gray-400">Nincs adat.</div>
              )}
            </div>

            {categoryData.length > 0 && (
              <div className="mt-4 grid grid-cols-1 gap-2">
                {categoryData.slice(0, 5).map((c) => (
                  <div key={c.name} className="flex items-center justify-between rounded-2xl p-2 border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-900/20">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                      <div className="text-xs font-black text-gray-700 dark:text-gray-200">{c.name}</div>
                    </div>
                    <div className="text-xs font-black text-gray-900 dark:text-white">{ctrl.formatMoney(c.value)}</div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      )}

      {/* TRANSACTIONS + PLANNING SHARE LIST UI */}
      {(ctrl.activeTab === "transactions" || ctrl.activeTab === "planning") && (
        <SectionCard
          title={ctrl.activeTab === "planning" ? "Tranzakciók (tervezéshez)" : "Tranzakciók"}
          right={
            <div className="flex items-center gap-2">
              <Chip tone={ctrl.showMasters ? "blue" : "neutral"}>Sablonok: {ctrl.showMasters ? "BE" : "KI"}</Chip>
              <Button
                variant="secondary"
                onClick={() => ctrl.setShowMasters(!ctrl.showMasters)}
                leftIcon={ctrl.showMasters ? <Check size={16} /> : undefined}
              >
                Toggle
              </Button>
            </div>
          }
        >
          <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-sm">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <Input
                className="pl-11"
                placeholder={(t("budget.search") || "Keresés") + "..."}
                value={ctrl.searchTerm}
                onChange={(e) => ctrl.setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-end">
              <Select className="sm:w-64" value={ctrl.filterCategory} onChange={(e) => ctrl.setFilterCategory(e.target.value)}>
                <option value="all">{t("budget.allCategories") || "Összes kategória"}</option>
                {Object.entries(ctrl.CATEGORIES).map(([key, cat]) => (
                  <option key={key} value={key}>
                    {cat.label}
                  </option>
                ))}
              </Select>

              <Button variant="secondary" onClick={() => ctrl.setShowConverter(true)} leftIcon={<RefreshCcw size={16} />}>
                Váltó
              </Button>

              <Button
                variant="danger"
                onClick={() => ctrl.setDeleteConfirm("all")}
                leftIcon={<Trash2 size={16} />}
                className="sm:w-auto"
              >
                Mind törlése
              </Button>
            </div>
          </div>

          {/* Planning controls */}
          {ctrl.activeTab === "planning" && (
            <div className="mt-4 rounded-3xl border border-indigo-200/60 dark:border-indigo-800/40 bg-indigo-50/60 dark:bg-indigo-950/20 p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-black text-indigo-900 dark:text-indigo-200">Projekció</div>
                  <div className="text-xs font-bold text-indigo-800/80 dark:text-indigo-200/80">Állítsd be hány évre számoljon előre.</div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" onClick={() => ctrl.setProjectionYears((p) => Math.max(1, p - 1))} leftIcon={<ChevronLeft size={16} />}>
                    -
                  </Button>
                  <Chip tone="blue">{ctrl.projectionYears} év</Chip>
                  <Button variant="secondary" onClick={() => ctrl.setProjectionYears((p) => Math.min(10, p + 1))} leftIcon={<ChevronRight size={16} />}>
                    +
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Bulk bar */}
          {showBulkBar && (
            <div className="mt-4 rounded-3xl border border-blue-200/60 dark:border-blue-800/40 bg-blue-50/60 dark:bg-blue-950/20 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-sm font-black text-blue-900 dark:text-blue-200">{ctrl.selected.size} kiválasztva</div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={ctrl.selectAllPage}>
                  Oldal kijelölése
                </Button>
                <Button variant="secondary" onClick={ctrl.clearSelection}>
                  Kijelölés törlése
                </Button>
                <Button variant="danger" onClick={() => ctrl.setDeleteConfirm("selected")} leftIcon={<Trash2 size={16} />}>
                  Törlés
                </Button>
              </div>
            </div>
          )}

          <div className="mt-4 rounded-3xl border border-gray-200/70 dark:border-gray-700/60 overflow-hidden">
            <div className="max-h-[640px] overflow-y-auto">
              {ctrl.filteredTransactions.length === 0 ? (
                <div className="p-12 text-center text-sm font-bold text-gray-500 dark:text-gray-400">Nincs megjeleníthető tranzakció.</div>
              ) : (
                ctrl.paginated.map((tr) => (
                  <TransactionRow
                    key={tr.id}
                    tr={tr}
                    selected={ctrl.selected.has(tr.id)}
                    onToggle={ctrl.toggleSelection}
                    onOpen={(tx) => {
                      // Selection-first UX: if user already started selecting, click toggles selection
                      if (ctrl.selected.size > 0) ctrl.toggleSelection(tx.id);
                      else ctrl.openEdit(tx);
                    }}
                    onDelete={(id) => ctrl.safeDeleteOne(id)}
                    CATEGORIES={ctrl.CATEGORIES}
                    getCategoryKey={ctrl.getCategoryKey}
                    formatDate={ctrl.formatDate}
                    formatMoney={ctrl.formatMoney}
                    getTrCurrency={ctrl.getTrCurrency}
                    getPeriodLabel={ctrl.getPeriodLabel}
                  />
                ))
              )}
            </div>

            {/* Pagination */}
            {ctrl.totalPages > 1 && (
              <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-gray-200/70 dark:border-gray-700/60 bg-white/40 dark:bg-gray-950/20">
                <div className="text-xs font-black text-gray-600 dark:text-gray-300">
                  Oldal {ctrl.page} / {ctrl.totalPages} — összesen {ctrl.filteredTransactions.length}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={() => ctrl.setPage(1)} disabled={ctrl.page === 1} leftIcon={<ChevronsLeft size={16} />}>
                    Első
                  </Button>
                  <Button variant="secondary" onClick={() => ctrl.setPage((p) => Math.max(1, p - 1))} disabled={ctrl.page === 1} leftIcon={<ChevronLeft size={16} />}>
                    Előző
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => ctrl.setPage((p) => Math.min(ctrl.totalPages, p + 1))}
                    disabled={ctrl.page === ctrl.totalPages}
                    leftIcon={<ChevronRight size={16} />}
                  >
                    Következő
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => ctrl.setPage(ctrl.totalPages)}
                    disabled={ctrl.page === ctrl.totalPages}
                    leftIcon={<ChevronsRight size={16} />}
                  >
                    Utolsó
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Quick delete by period */}
          <div className="mt-4 rounded-3xl border border-gray-200/70 dark:border-gray-700/60 bg-white/50 dark:bg-gray-900/20 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-sm font-black text-gray-900 dark:text-white">Törlés szűrővel</div>
                <div className="text-xs font-bold text-gray-600 dark:text-gray-400">Gyorsan törölj adott gyakoriság szerint (a látható adatokból).</div>
              </div>
              <div className="flex items-center gap-2">
                <Select className="w-56" value={ctrl.deletePeriodFilter} onChange={(e) => ctrl.setDeletePeriodFilter(e.target.value as any)}>
                  <option value="all">Összes (minden)</option>
                  <option value="oneTime">One-time</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </Select>
                <Button variant="danger" onClick={() => ctrl.setDeleteConfirm(ctrl.deletePeriodFilter === "all" ? "all" : "period")} leftIcon={<Trash2 size={16} />}>
                  Törlés
                </Button>
              </div>
            </div>
          </div>
        </SectionCard>
      )}

      {/* Popover */}
      <BreakdownPopover
        isOpen={!!ctrl.selectedStat}
        data={ctrl.selectedStat}
        onClose={() => ctrl.setSelectedStat(null)}
        CATEGORIES={ctrl.CATEGORIES}
        formatMoney={ctrl.formatMoney}
        getCategoryKey={ctrl.getCategoryKey}
      />

      {/* Currency Converter */}
      <AnimatePresence>
        {ctrl.showConverter && (
          <CurrencyConverterModal
            isOpen={ctrl.showConverter}
            onClose={() => ctrl.setShowConverter(false)}
            language={ctrl.language}
            baseCurrency={ctrl.currency}
            formatMoney={ctrl.formatMoney}
            safeConvert={ctrl.safeConvert}
          />
        )}
      </AnimatePresence>

      {/* Transaction modal */}
      <AnimatePresence>
        {ctrl.showTxModal && (
          <TransactionModal
            isOpen={ctrl.showTxModal}
            onClose={ctrl.closeTxModal}
            t={t}
            type={ctrl.txType}
            editing={!!ctrl.editing}
            draft={ctrl.draft}
            setDraft={ctrl.setDraft}
            CATEGORIES={ctrl.CATEGORIES}
            periodLabel={ctrl.getPeriodLabel}
            addToBalanceImmediately={ctrl.addToBalanceImmediately}
            setAddToBalanceImmediately={ctrl.setAddToBalanceImmediately}
            onSave={ctrl.saveDraft}
          />
        )}
      </AnimatePresence>

      {/* Delete confirm */}
      <AnimatePresence>
        {ctrl.deleteConfirm && (
          <DeleteConfirmModal
            title="Biztosan törlöd?"
            description={
              ctrl.deleteConfirm === "selected"
                ? `Biztosan törlöd a kiválasztott ${ctrl.selected.size} tételt?`
                : ctrl.deleteConfirm === "period"
                  ? `Biztosan törlöd a(z) ${ctrl.deletePeriodFilter} gyakoriságú tételeket?`
                  : "Biztosan törlöd az ÖSSZES tételt? (beleértve a sablonokat is)"
            }
            onCancel={() => ctrl.setDeleteConfirm(null)}
            onConfirm={() => {
              if (ctrl.deleteConfirm === "selected") ctrl.deleteSelected();
              if (ctrl.deleteConfirm === "period") ctrl.deleteByPeriod(ctrl.deletePeriodFilter);
              if (ctrl.deleteConfirm === "all") ctrl.deleteByPeriod("all");
              ctrl.setDeleteConfirm(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default BudgetView;
