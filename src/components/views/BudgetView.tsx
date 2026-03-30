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
  ShoppingBag as ShoppingBagIcon,
  ChevronDown,
  ChevronUp
} from "lucide-react";

// Context imports
import { useLanguage } from "../../contexts/LanguageContext";
import { useData } from "../../contexts/DataContext";
import { AVAILABLE_CURRENCIES } from "../../constants/currencyData";
import { CurrencyService } from "../../services/CurrencyService";
import { useBudgetAnalytics } from "./useBudgetAnalytics";
import CurrencyConverterModal from "./CurrencyConverterModal";
import { Transaction, TransactionPatch as PlannerTransactionPatch } from "../../types/planner";

const EMPTY_ARRAY: Transaction[] = [];

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
  originId?: string;
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
  occurrenceCount?: number;
  sourceIds?: string[];
};

type TransactionPatch = PlannerTransactionPatch;
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
const MAX_BUDGET_NOTIFICATIONS = 20;
const VALIDATION_NOTIFICATION_PATTERNS = [
  /validation error/i,
  /validacios hiba/i,
  /validációs hiba/i,
  /please fill all required fields/i,
  /kot[eé]lez[oő] mez[oő]ket/i,
];

const isValidationNoiseNotification = (notification: Pick<Notification, "title" | "message">) => {
  const haystack = `${notification.title} ${notification.message}`.trim();
  return VALIDATION_NOTIFICATION_PATTERNS.some(pattern => pattern.test(haystack));
};

const normalizeNotifications = (items: Notification[]) => {
  const seen = new Set<string>();

  return [...items]
    .filter(item => !isValidationNoiseNotification(item))
    .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
    .filter(item => {
      const key = `${item.type}|${item.title}|${item.message}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
  .slice(0, MAX_BUDGET_NOTIFICATIONS);
};

const BUDGET_NOTIFICATION_FALLBACKS: Record<string, Record<string, string>> = {
  'notifications.title': {
    en: 'Notifications', hu: 'Értesítések', ro: 'Notificari', sk: 'Upozornenia', hr: 'Obavijesti', de: 'Benachrichtigungen',
    fr: 'Notifications', es: 'Notificaciones', it: 'Notifiche', pl: 'Powiadomienia', cn: '通知', jp: '通知', pt: 'Notificacoes',
    tr: 'Bildirimler', ar: 'الإشعارات', ru: 'Уведомления', hi: 'सूचनाएं', bn: 'বিজ্ঞপ্তি', ur: 'نوٹیفکیشنز', th: 'การแจ้งเตือน',
    id: 'Notifikasi', ko: '알림',
  },
  'notifications.clearAll': {
    en: 'Clear All', hu: 'Összes törlése', ro: 'Sterge tot', sk: 'Vymazat vsetko', hr: 'Obrisi sve', de: 'Alle loschen',
    fr: 'Tout effacer', es: 'Borrar todo', it: 'Cancella tutto', pl: 'Wyczysc wszystko', cn: '全部清除', jp: 'すべてクリア',
    pt: 'Limpar tudo', tr: 'Tumunu temizle', ar: 'مسح الكل', ru: 'Очистить все', hi: 'सभी साफ करें', bn: 'সব মুছুন',
    ur: 'سب صاف کریں', th: 'ล้างทั้งหมด', id: 'Hapus semua', ko: '모두 지우기',
  },
  'notifications.recurringIncome': {
    en: 'Recurring income scheduled', hu: 'Ismétlődő bevétel ütemezve', ro: 'Venit recurent programat', sk: 'Opakovany prijem naplanovany',
    hr: 'Ponavljajuci prihod zakazan', de: 'Wiederkehrende Einnahme geplant', fr: 'Revenu recurrent planifie', es: 'Ingreso recurrente programado',
    it: 'Entrata ricorrente pianificata', pl: 'Zaplanowano cykliczny przychod', cn: '已安排经常性收入', jp: '定期収入を設定しました',
    pt: 'Receita recorrente agendada', tr: 'Tekrarlanan gelir planlandi', ar: 'تمت جدولة دخل متكرر', ru: 'Запланирован регулярный доход',
    hi: 'आवर्ती आय निर्धारित', bn: 'পুনরাবৃত্ত আয় নির্ধারিত', ur: 'بار بار آمدنی شیڈول ہوگئی', th: 'ตั้งรายรับประจำแล้ว',
    id: 'Pemasukan berulang dijadwalkan', ko: '반복 수입이 예약되었습니다',
  },
  'notifications.recurringExpense': {
    en: 'Recurring expense scheduled', hu: 'Ismétlődő kiadás ütemezve', ro: 'Cheltuiala recurenta programata', sk: 'Opakovany vydaj naplanovany',
    hr: 'Ponavljajuci trosak zakazan', de: 'Wiederkehrende Ausgabe geplant', fr: 'Depense recurrente planifiee', es: 'Gasto recurrente programado',
    it: 'Spesa ricorrente pianificata', pl: 'Zaplanowano cykliczny wydatek', cn: '已安排经常性支出', jp: '定期支出を設定しました',
    pt: 'Despesa recorrente agendada', tr: 'Tekrarlanan gider planlandi', ar: 'تمت جدولة مصروف متكرر', ru: 'Запланирован регулярный расход',
    hi: 'आवर्ती खर्च निर्धारित', bn: 'পুনরাবৃত্ত ব্যয় নির্ধারিত', ur: 'بار بار خرچ شیڈول ہوگیا', th: 'ตั้งรายจ่ายประจำแล้ว',
    id: 'Pengeluaran berulang dijadwalkan', ko: '반복 지출이 예약되었습니다',
  },
  'notifications.scheduledTransaction': {
    en: 'Scheduled transaction added', hu: 'Ütemezett tranzakció hozzáadva', ro: 'Tranzactie programata adaugata', sk: 'Naplanovana transakcia pridana',
    hr: 'Zakazana transakcija dodana', de: 'Geplante Transaktion hinzugefugt', fr: 'Transaction planifiee ajoutee', es: 'Transaccion programada agregada',
    it: 'Transazione pianificata aggiunta', pl: 'Dodano zaplanowana transakcje', cn: '已添加计划交易', jp: '予定済み取引を追加しました',
    pt: 'Transacao agendada adicionada', tr: 'Planlanan islem eklendi', ar: 'تمت إضافة معاملة مجدولة', ru: 'Добавлена запланированная транзакция',
    hi: 'अनुसूचित लेनदेन जोड़ा गया', bn: 'নির্ধারিত লেনদেন যোগ হয়েছে', ur: 'شیڈول ٹرانزیکشن شامل ہوگئی', th: 'เพิ่มธุรกรรมที่กำหนดเวลาไว้แล้ว',
    id: 'Transaksi terjadwal ditambahkan', ko: '예약된 거래가 추가되었습니다',
  },
  'notifications.largeTransaction': {
    en: 'Large transaction added', hu: 'Nagy összegű tranzakció', ro: 'Tranzactie mare adaugata', sk: 'Pridana velka transakcia',
    hr: 'Velika transakcija dodana', de: 'Grosse Transaktion hinzugefugt', fr: 'Grande transaction ajoutee', es: 'Transaccion grande agregada',
    it: 'Grande transazione aggiunta', pl: 'Dodano duza transakcje', cn: '已添加大额交易', jp: '高額取引を追加しました',
    pt: 'Transacao grande adicionada', tr: 'Buyuk islem eklendi', ar: 'تمت إضافة معاملة كبيرة', ru: 'Добавлена крупная транзакция',
    hi: 'बड़ा लेनदेन जोड़ा गया', bn: 'বড় লেনদেন যোগ হয়েছে', ur: 'بڑی ٹرانزیکشن شامل ہوگئی', th: 'เพิ่มธุรกรรมมูลค่าสูงแล้ว',
    id: 'Transaksi besar ditambahkan', ko: '큰 거래가 추가되었습니다',
  },
  'notifications.transactionUpdated': {
    en: 'Transaction updated', hu: 'Tranzakció frissítve', ro: 'Tranzactie actualizata', sk: 'Transakcia aktualizovana', hr: 'Transakcija azurirana',
    de: 'Transaktion aktualisiert', fr: 'Transaction mise a jour', es: 'Transaccion actualizada', it: 'Transazione aggiornata', pl: 'Transakcja zaktualizowana',
    cn: '交易已更新', jp: '取引を更新しました', pt: 'Transacao atualizada', tr: 'Islem guncellendi', ar: 'تم تحديث المعاملة',
    ru: 'Транзакция обновлена', hi: 'लेनदेन अपडेट किया गया', bn: 'লেনদেন আপডেট হয়েছে', ur: 'ٹرانزیکشن اپڈیٹ ہوگئی', th: 'อัปเดตธุรกรรมแล้ว',
    id: 'Transaksi diperbarui', ko: '거래가 업데이트되었습니다',
  },
  'notifications.transactionDeleted': {
    en: 'Transaction removed', hu: 'Tranzakció törölve', ro: 'Tranzactie stearsa', sk: 'Transakcia odstranena', hr: 'Transakcija obrisana',
    de: 'Transaktion entfernt', fr: 'Transaction supprimee', es: 'Transaccion eliminada', it: 'Transazione rimossa', pl: 'Transakcja usunieta',
    cn: '交易已删除', jp: '取引を削除しました', pt: 'Transacao removida', tr: 'Islem silindi', ar: 'تم حذف المعاملة', ru: 'Транзакция удалена',
    hi: 'लेनदेन हटाया गया', bn: 'লেনদেন মুছে ফেলা হয়েছে', ur: 'ٹرانزیکشن حذف ہوگئی', th: 'ลบธุรกรรมแล้ว', id: 'Transaksi dihapus', ko: '거래가 삭제되었습니다',
  },
  'notifications.transactionsDeleted': {
    en: 'Transactions removed', hu: 'Tranzakciók törölve', ro: 'Tranzactii sterse', sk: 'Transakcie odstranene', hr: 'Transakcije obrisane',
    de: 'Transaktionen entfernt', fr: 'Transactions supprimees', es: 'Transacciones eliminadas', it: 'Transazioni rimosse', pl: 'Transakcje usuniete',
    cn: '交易已删除', jp: '取引を削除しました', pt: 'Transacoes removidas', tr: 'Islemler silindi', ar: 'تم حذف المعاملات', ru: 'Транзакции удалены',
    hi: 'लेनदेन हटाए गए', bn: 'লেনদেনগুলো মুছে ফেলা হয়েছে', ur: 'ٹرانزیکشنز حذف ہوگئیں', th: 'ลบธุรกรรมแล้ว', id: 'Transaksi dihapus', ko: '거래가 삭제되었습니다',
  },
  'notifications.transactionsDeletedMessage': {
    en: '{count} transactions deleted', hu: '{count} tranzakció törölve', ro: '{count} tranzactii sterse', sk: '{count} transakcii odstranene',
    hr: '{count} transakcija obrisano', de: '{count} Transaktionen geloscht', fr: '{count} transactions supprimees', es: 'Se eliminaron {count} transacciones',
    it: '{count} transazioni eliminate', pl: 'Usunieto {count} transakcji', cn: '已删除 {count} 笔交易', jp: '{count}件の取引を削除しました',
    pt: '{count} transacoes removidas', tr: '{count} islem silindi', ar: 'تم حذف {count} معاملة', ru: 'Удалено транзакций: {count}',
    hi: '{count} लेनदेन हटाए गए', bn: '{count} টি লেনদেন মুছে ফেলা হয়েছে', ur: '{count} ٹرانزیکشنز حذف ہوئیں', th: 'ลบธุรกรรมแล้ว {count} รายการ',
    id: '{count} transaksi dihapus', ko: '{count}개의 거래를 삭제했습니다',
  },
  'notifications.empty': {
    en: 'No notifications', hu: 'Nincsenek értesítések', ro: 'Fara notificari', sk: 'Ziadne upozornenia', hr: 'Nema obavijesti', de: 'Keine Benachrichtigungen',
    fr: 'Aucune notification', es: 'No hay notificaciones', it: 'Nessuna notifica', pl: 'Brak powiadomien', cn: '无通知', jp: '通知なし',
    pt: 'Sem notificacoes', tr: 'Bildirim yok', ar: 'لا توجد إشعارات', ru: 'Нет уведомлений', hi: 'कोई सूचना नहीं', bn: 'কোন বিজ্ঞপ্তি নেই',
    ur: 'کوئی نوٹیفکیشن نہیں', th: 'ไม่มีการแจ้งเตือน', id: 'Tidak ada notifikasi', ko: '알림이 없습니다',
  },
  'notifications.pleaseCheckFields': {
    en: 'Please fill all required fields', hu: 'Kérlek töltsd ki a kötelező mezőket', ro: 'Va rugam completati toate campurile obligatorii',
    sk: 'Vyplnte vsetky povinne polia', hr: 'Molimo ispunite sva obavezna polja', de: 'Bitte alle Pflichtfelder ausfullen', fr: 'Veuillez remplir tous les champs obligatoires',
    es: 'Por favor completa todos los campos obligatorios', it: 'Compila tutti i campi obbligatori', pl: 'Wypelnij wszystkie wymagane pola', cn: '请填写所有必填字段',
    jp: '必須項目をすべて入力してください', pt: 'Preencha todos os campos obrigatorios', tr: 'Lutfen tum zorunlu alanlari doldurun', ar: 'يرجى ملء جميع الحقول المطلوبة',
    ru: 'Пожалуйста, заполните все обязательные поля', hi: 'कृपया सभी आवश्यक फ़ील्ड भरें', bn: 'অনুগ্রহ করে সব প্রয়োজনীয় ঘর পূরণ করুন',
    ur: 'براہ کرم تمام ضروری خانے بھریں', th: 'กรุณากรอกข้อมูลที่จำเป็นทั้งหมด', id: 'Harap isi semua bidang wajib', ko: '필수 항목을 모두 입력해 주세요',
  },
  'import.success': {
    en: 'Import completed', hu: 'Import befejezve', ro: 'Import finalizat', sk: 'Import dokonceny', hr: 'Uvoz dovrsen', de: 'Import abgeschlossen',
    fr: 'Import termine', es: 'Importacion completada', it: 'Importazione completata', pl: 'Import zakonczony', cn: '导入完成', jp: 'インポートが完了しました',
    pt: 'Importacao concluida', tr: 'Ice aktarma tamamlandi', ar: 'اكتمل الاستيراد', ru: 'Импорт завершен', hi: 'आयात पूरा हुआ', bn: 'ইমপোর্ট সম্পন্ন হয়েছে',
    ur: 'درآمد مکمل ہوئی', th: 'นำเข้าเสร็จสิ้น', id: 'Impor selesai', ko: '가져오기가 완료되었습니다',
  },
  'import.imported': {
    en: 'Imported transactions', hu: 'Importált tranzakciók', ro: 'Tranzactii importate', sk: 'Importovane transakcie', hr: 'Uvezene transakcije',
    de: 'Importierte Transaktionen', fr: 'Transactions importees', es: 'Transacciones importadas', it: 'Transazioni importate', pl: 'Zaimportowane transakcje',
    cn: '已导入交易', jp: 'インポート済みの取引', pt: 'Transacoes importadas', tr: 'Ice aktarilan islemler', ar: 'المعاملات المستوردة', ru: 'Импортированные транзакции',
    hi: 'आयातित लेनदेन', bn: 'ইমপোর্ট করা লেনদেন', ur: 'درآمد شدہ ٹرانزیکشنز', th: 'ธุรกรรมที่นำเข้าแล้ว', id: 'Transaksi yang diimpor', ko: '가져온 거래',
  },
};

const getBudgetLocalizedText = (key: string, language: string, fallback: string, replacements?: Record<string, string | number>) => {
  const template = BUDGET_NOTIFICATION_FALLBACKS[key]?.[language] ?? BUDGET_NOTIFICATION_FALLBACKS[key]?.en ?? fallback;
  if (!replacements) return template;
  return Object.entries(replacements).reduce(
    (text, [token, value]) => text.replace(new RegExp(`\\{${token}\\}`, "g"), String(value)),
    template
  );
};

const findBudgetNotificationKey = (text: string) => {
  if (!text) return null;
  return Object.entries(BUDGET_NOTIFICATION_FALLBACKS).find(([key, variants]) => {
    const tail = key.split('.').pop() || key;
    return text === key || text === tail || Object.values(variants).includes(text);
  })?.[0] ?? null;
};

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



function formatDate(ymd: string, locale: string): string {
  const date = parseYMD(ymd);
  if (!date) return ymd || "-";
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
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
      "rounded-[var(--radius-3xl)] border border-[rgba(var(--border-primary))] bg-[var(--glass-bg)] backdrop-blur-xl",
      "shadow-[var(--glass-shadow)]",
      gradient && "bg-gradient-to-br from-[rgb(var(--color-primary-500))]/10 to-[rgb(var(--color-secondary-500))]/10",
      hoverEffect && "hover:shadow-[var(--shadow-premium)] hover:border-[rgba(var(--text-primary))]/20 hover:-translate-y-1 transition-all duration-[var(--transition-premium)]",
      className
    )}
    style={{
      backgroundColor: 'var(--glass-bg)',
    }}
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
  style,
  ...props
}) => {
    const base = "inline-flex items-center justify-center gap-2 rounded-[var(--radius-xl)] font-bold transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none";

    const variants = {
      primary: gradient
        ? "text-white shadow-[var(--glow-primary)] hover:shadow-[0_12px_48px_rgba(67,97,238,0.48)] border-none"
        : "bg-[rgb(var(--color-primary-600))] text-white shadow-lg hover:bg-[rgb(var(--color-primary-700))]",
      secondary: "bg-[rgb(var(--surface-tertiary))] text-[rgb(var(--text-primary))] border border-[rgb(var(--border-primary))] hover:bg-[rgb(var(--surface-elevated))] hover:border-[rgba(var(--color-primary-500))]/30",
      danger: "text-white shadow-[0_8px_32px_rgba(244,63,94,0.32)]",
      success: "text-white shadow-[var(--glow-success)]",
      ghost: "bg-transparent text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] hover:bg-[rgb(var(--surface-tertiary))]",
    };

    // Map gradient variants to their CSS background values
    const gradientStyles: Record<string, React.CSSProperties> = {
      primary: gradient ? { background: 'var(--gradient-primary)' } : {},
      danger: { background: 'var(--gradient-danger)' },
      success: { background: 'var(--gradient-success)' },
    };

    const sizes = {
      sm: "px-3 py-2 text-sm",
      md: "px-5 py-3 text-sm",
      lg: "px-6 py-4 text-base",
    };

    return (
      <button
        className={cx(base, variants[variant], sizes[size], fullWidth && "w-full", className)}
        style={{ ...gradientStyles[variant], ...style }}
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
      <label className="block mb-2 text-sm font-bold text-[rgb(var(--text-secondary))]">
        {label}
      </label>
    )}
    <input
      className={cx(
        "w-full rounded-[var(--radius-xl)] border-2 px-4 py-3 bg-[rgb(var(--surface-elevated))] text-[rgb(var(--text-primary))] font-semibold",
        "placeholder:text-[rgb(var(--text-tertiary))] outline-none transition-all duration-200",
        "focus:border-[rgb(var(--color-primary-400))]/60 focus:ring-2 focus:ring-[rgb(var(--color-primary-400))]/30",
        error ? "border-rose-400/50" : success ? "border-emerald-400/50" : "border-[rgb(var(--border-primary))]",
        className
      )}
      {...props}
    />
    {error && (
      <motion.p
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-2 text-xs text-rose-500 font-medium"
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
  // Ideally we map color to our theme palette, but for now we keep dynamic color support with opacity
  <span
    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold"
    style={{
      backgroundColor: `${color}20`,
      color: color, // Use the color directly for text for better visibility in light mode
      border: `1px solid ${color}40`,
      // Add a tiny shadow for pop
      boxShadow: `0 2px 4px ${color}15`
    }}
  >
    {label}
    {removable && (
      <button
        type="button"
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
  change?: string;
  icon: React.ReactNode;
  color: "blue" | "green" | "red" | "purple" | "yellow";
  trend?: "up" | "down" | "neutral";
}> = ({ title, value, change, icon, color, trend }) => {
  const colors = {
    blue: { bg: "from-blue-500/20 to-blue-600/20", text: "text-blue-500", glow: "shadow-[0_0_20px_rgba(59,130,246,0.3)]", border: "border-blue-500/30" },
    green: { bg: "from-emerald-500/20 to-emerald-600/20", text: "text-emerald-500", glow: "shadow-[0_0_20px_rgba(16,185,129,0.3)]", border: "border-emerald-500/30" },
    red: { bg: "from-rose-500/20 to-rose-600/20", text: "text-rose-500", glow: "shadow-[0_0_20px_rgba(244,63,94,0.3)]", border: "border-rose-500/30" },
    purple: { bg: "from-purple-500/20 to-purple-600/20", text: "text-purple-500", glow: "shadow-[0_0_20px_rgba(168,85,247,0.3)]", border: "border-purple-500/30" },
    yellow: { bg: "from-amber-500/20 to-amber-600/20", text: "text-amber-500", glow: "shadow-[0_0_20px_rgba(245,158,11,0.3)]", border: "border-amber-500/30" },
  };

  const style = colors[color];

  return (
    <GlassCard className={`relative overflow-hidden group border-2`}>
      <div className={`absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 bg-gradient-to-br ${style.bg} blur-3xl opacity-20 group-hover:opacity-40 transition-opacity`} />
      <div className="p-6 relative z-10">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-black uppercase tracking-wider text-[rgb(var(--text-tertiary))]">{title}</p>
            <h3 className="text-3xl font-black text-[rgb(var(--text-primary))] tracking-tight">{value}</h3>
            {change && (
              <div className="flex items-center gap-1.5 pt-1">
                <span className={`flex items-center justify-center w-5 h-5 rounded-full ${trend === 'up' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'}`}>
                  {trend === 'up' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                </span>
                <span className={`text-xs font-bold ${trend === 'up' ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {change}
                </span>
              </div>
            )}
          </div>
          <div className={`p-4 rounded-3xl bg-gradient-to-br ${style.bg} ${style.border} border-2 ${style.glow} transition-transform group-hover:scale-110 duration-300`}>
            <div className={style.text}>
              {icon}
            </div>
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
        <div className="px-6 pt-5 pb-3 border-b border-[rgba(var(--border-primary))]">
          <h3 className="text-lg font-black text-[rgb(var(--text-primary))]">{title}</h3>
        </div>
      )}
      <div ref={ref} style={{ height }} className="relative overflow-hidden">
        {dimensions.width > 0 && dimensions.height > 0 ? (
          children(dimensions)
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-[rgb(var(--text-tertiary))]">
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
  payload?: unknown;
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
      <div className="bg-[rgb(var(--surface-elevated))]/95 backdrop-blur-sm border border-[rgb(var(--border-primary))] rounded-[var(--radius-xl)] p-4 shadow-2xl z-50">
        <p className="text-sm font-bold text-[rgb(var(--text-secondary))] mb-2">{label}</p>
        {payload.map((entry: TooltipPayload, index: number) => (
          <div key={index} className="flex items-center justify-between gap-4 mb-1 last:mb-0">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm font-medium text-[rgb(var(--text-secondary))]">
                {entry.name || entry.dataKey}
              </span>
            </div>
            <span className="text-sm font-bold text-[rgb(var(--text-primary))]">
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

  const resolveBudgetText = useCallback((key: string, fallback: string, replacements?: Record<string, string | number>) => {
    const value = t?.(key);
    const tail = key.split('.').pop() || key;
    if (value && value !== key && value !== tail) {
      return replacements
        ? Object.entries(replacements).reduce(
          (text, [token, replacement]) => text.replace(new RegExp(`\\{${token}\\}`, "g"), String(replacement)),
          value
        )
        : value;
    }
    return getBudgetLocalizedText(key, language, fallback, replacements);
  }, [language, t]);

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
      return saved ? normalizeNotifications(JSON.parse(saved) as Notification[]) : [];
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
      title: resolveBudgetText('notifications.welcome', "Welcome to Budget Pro!"),
      message: resolveBudgetText('notifications.getStarted', "Start by adding your first transaction"),
      type: "info",
      timestamp: new Date().toISOString(),
      read: false,
    }]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolveBudgetText]);

  // Persist notifications
  useEffect(() => {
    localStorage.setItem('budget_notifications', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    setNotifications(prev => {
      const next = normalizeNotifications(prev);
      return JSON.stringify(prev) === JSON.stringify(next) ? prev : next;
    });
  }, []);

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
  // Fix: Memoize transactions to prevent unstable reference warning
  const transactions = useMemo(() => dataContext?.transactions || EMPTY_ARRAY, [dataContext]);

  const getPeriodLabel = useCallback((period: TransactionPeriod) => {
    switch (period) {
      case "daily":
        return resolveBudgetText('period.daily', 'Daily');
      case "weekly":
        return resolveBudgetText('period.weekly', 'Weekly');
      case "monthly":
        return resolveBudgetText('period.monthly', 'Monthly');
      case "yearly":
        return resolveBudgetText('period.yearly', 'Yearly');
      default:
        return resolveBudgetText('period.oneTime', 'One-time');
    }
  }, [resolveBudgetText]);

  // Filter/transform for UI consumption (safe dates & type mapping)

  const safeCategory = useCallback((c: unknown): CategoryKey =>
    (c && typeof c === "string" && c in categories ? c : "other") as CategoryKey, [categories]);

  const safeYMD = useCallback((s: unknown): string => {
    if (typeof s === "string") {
      const ymd = s.slice(0, 10);
      return parseYMD(ymd) ? ymd : todayYMD;
    }

    if (s instanceof Date && !Number.isNaN(s.getTime())) {
      return toYMDLocal(s);
    }

    // Support if Date was serialized to object with toISOString
    if (s && typeof s === "object" && "toISOString" in s && typeof (s as { toISOString: () => string }).toISOString === "function") {
      const iso = (s as { toISOString: () => string }).toISOString();
      const ymd = String(iso).slice(0, 10);
      return parseYMD(ymd) ? ymd : todayYMD;
    }

    return todayYMD;
  }, [todayYMD]);

  // Robust Normalization for UI
  const uiTransactions = useMemo(() => {
    return (transactions ?? []).map((t: unknown) => {
      const tx = t as Record<string, unknown>;
      const effectiveDateYMD = safeYMD(tx.effectiveDateYMD ?? tx.date);
      return {
        id: String(tx.id ?? tmpId()),
        originId: typeof tx.originId === "string" ? tx.originId : undefined,
        createdAtISO: String(tx.createdAtISO ?? new Date().toISOString()),
        effectiveDateYMD,
        description: String(tx.description ?? ""),
        type: tx.type === "income" ? "income" : "expense",
        amount: Number(tx.amount ?? 0),
        currency: String(tx.currency ?? "USD"),
        category: safeCategory(tx.category),
        period: (tx.period ?? "oneTime") as TransactionPeriod,
        isMaster: tx.kind === "master",
        time: tx.time as string | undefined,
        notes: tx.notes as string | undefined,
        tags: Array.isArray(tx.tags) ? tx.tags as string[] : [],
        status: (tx.status ?? "completed") as TransactionStatus,
        priority: (tx.priority ?? "medium") as PriorityLevel,
        attachmentUrl: tx.attachmentUrl as string | undefined,
        location: tx.location as string | undefined,
        reminderId: tx.reminderId as string | undefined,
        // Compat fields
        date: (tx.date ?? effectiveDateYMD) as Date | string,
        kind: tx.kind as 'master' | 'history' | undefined,
        recurring: Boolean(tx.recurring),
      } as BudgetTransaction;
    });
  }, [transactions, safeCategory, safeYMD]);

  // Active transactions (cancelled entries never contribute to forecasting or aggregates)
  const activeTransactions = useMemo(
    () => uiTransactions.filter(tx => tx.status !== "cancelled"),
    [uiTransactions]
  );

  // Transactions exposed by selected balance mode for UI lists/cards
  const visibleTransactions = useMemo(() => {
    const today = parseYMD(todayYMD)?.getTime() ?? Date.now();

    if (balanceMode === "includeScheduled") {
      return activeTransactions;
    }

    return activeTransactions.filter(tx => {
      const dt = parseYMD(tx.effectiveDateYMD)?.getTime() ?? today;
      return dt <= today && tx.status !== "pending";
    });
  }, [activeTransactions, balanceMode, todayYMD]);

  const displayTransactions = useMemo(() => {
    const mastersById = new Map(
      activeTransactions
        .filter(tx => tx.kind === "master")
        .map(tx => [tx.id, tx] as const)
    );

    const toMillis = (tx: BudgetTransaction) => {
      const d = parseYMD(tx.effectiveDateYMD) ?? new Date(0);
      if (tx.time && /^\d{2}:\d{2}$/.test(tx.time)) {
        const [hh, mm] = tx.time.split(':').map(Number);
        d.setHours(hh, mm, 0, 0);
      } else {
        d.setHours(0, 0, 0, 0);
      }
      return d.getTime();
    };

    const groups = new Map<string, BudgetTransaction[]>();
    for (const tx of visibleTransactions) {
      // Recurring masters are placeholders for next due occurrence; they must not inflate realized totals/counts.
      if (tx.kind === "master" && tx.recurring && tx.period !== "oneTime") {
        continue;
      }
      const groupKey = tx.kind === "history" && tx.originId ? tx.originId : tx.id;
      const arr = groups.get(groupKey) ?? [];
      arr.push(tx);
      groups.set(groupKey, arr);
    }

    if (balanceMode === "includeScheduled") {
      for (const [masterId, master] of mastersById) {
        if (!groups.has(masterId)) {
          groups.set(masterId, [master]);
        }
      }
    }

    const aggregated: BudgetTransaction[] = [];
    for (const [seriesId, items] of groups) {
      const master = mastersById.get(seriesId);
      const sortedItems = [...items].sort((a, b) => toMillis(b) - toMillis(a));
      const latest = sortedItems[0];

      const isRecurringSeries = Boolean(master) || (items.length > 1 && items.some(item => item.originId === seriesId));
      if (!isRecurringSeries) {
        aggregated.push({
          ...latest,
          occurrenceCount: 1,
          sourceIds: [latest.id],
        });
        continue;
      }

      const totalAbs = items.reduce((sum, item) => sum + Math.abs(item.amount), 0);
      const sourceIds = new Set<string>(items.map(item => item.id));
      if (master) sourceIds.add(master.id);

      aggregated.push({
        ...(master || latest),
        id: master?.id || seriesId,
        effectiveDateYMD: latest.effectiveDateYMD,
        time: latest.time,
        amount: latest.type === "income" ? totalAbs : -totalAbs,
        occurrenceCount: items.length,
        sourceIds: Array.from(sourceIds),
        kind: "master",
        recurring: true,
      });
    }

    return aggregated.sort((a, b) => toMillis(b) - toMillis(a));
  }, [activeTransactions, balanceMode, visibleTransactions]);

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
    activeTransactions as Transaction[],
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
    for (const h of cashFlowData) {
      const yStr = String(h.year).slice(2);
      result.push({
        month: `${monthNames[h.monthIndex]} '${yStr}`,
        balance: h.balance ?? 0,
        income: h.income,
        expense: h.expense
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
  }, [projectionData, cashFlowData, monthNames]);

  const toViewAbsAmount = useCallback((tx: Pick<BudgetTransaction, "amount" | "currency">) => {
    return CurrencyService.convert(Math.abs(tx.amount), tx.currency || "USD", currency);
  }, [currency]);

  const backtestSummary = useMemo(() => {
    const today = parseYMD(todayYMD)?.getTime() ?? Date.now();

    const realizedTransactions = activeTransactions.filter(tx => {
      const dt = parseYMD(tx.effectiveDateYMD)?.getTime();
      if (dt == null) return false;
      // Recurring masters are templates/placeholders, not realized cash events.
      if (tx.kind === "master") return false;
      return dt <= today && tx.status !== "pending";
    });

    const realizedIncome = realizedTransactions
      .filter(tx => tx.type === "income")
      .reduce((sum, tx) => sum + toViewAbsAmount(tx), 0);

    const realizedExpense = realizedTransactions
      .filter(tx => tx.type === "expense")
      .reduce((sum, tx) => sum + toViewAbsAmount(tx), 0);

    const realizedNet = realizedIncome - realizedExpense;
    const trackedMonths = Math.max(new Set(realizedTransactions.map(tx => tx.effectiveDateYMD.slice(0, 7))).size, 1);

    const firstEntryYMD = realizedTransactions.reduce<string | null>((min, tx) => {
      if (!min) return tx.effectiveDateYMD;
      return tx.effectiveDateYMD < min ? tx.effectiveDateYMD : min;
    }, null);

    const averageMonthlyNet = realizedTransactions.length > 0 ? realizedNet / trackedMonths : 0;
    const historyNetSixMonths = cashFlowData.reduce((acc, month) => acc + (month.income - month.expense), 0);

    return {
      transactionCount: realizedTransactions.length,
      trackedMonths,
      firstEntryYMD,
      realizedIncome,
      realizedExpense,
      realizedNet,
      averageMonthlyNet,
      historyNetSixMonths,
    };
  }, [activeTransactions, cashFlowData, todayYMD, toViewAbsAmount]);

  const forecastSummary = useMemo(() => {
    const expectedIncome = projectionData.reduce((sum, point) => sum + point.income, 0);
    const expectedExpense = projectionData.reduce((sum, point) => sum + point.expense, 0);
    const expectedNet = expectedIncome - expectedExpense;

    const projectedBalance = projectionData.length > 0
      ? projectionData[projectionData.length - 1].balance
      : balance;

    const firstNegativePoint = projectionData.find(point => point.balance < 0);
    const firstNegativePeriod = firstNegativePoint
      ? (firstNegativePoint.monthIndex !== null && firstNegativePoint.monthIndex !== undefined
        ? (monthNames[firstNegativePoint.monthIndex] + " " + firstNegativePoint.year)
        : String(firstNegativePoint.year))
      : null;

    const today = parseYMD(todayYMD)?.getTime() ?? Date.now();
    const upcomingTransactions = activeTransactions.filter(tx => {
      const dt = parseYMD(tx.effectiveDateYMD)?.getTime();
      return dt != null && dt > today;
    });

    return {
      horizonMonths: projectionData.length,
      expectedIncome,
      expectedExpense,
      expectedNet,
      projectedBalance,
      nextMonthNet: projectionData.length > 0 ? projectionData[0].income - projectionData[0].expense : 0,
      upcomingCount: upcomingTransactions.length,
      upcomingIncomeCount: upcomingTransactions.filter(tx => tx.type === "income").length,
      upcomingExpenseCount: upcomingTransactions.filter(tx => tx.type === "expense").length,
      firstNegativePeriod,
    };
  }, [activeTransactions, balance, monthNames, projectionData, todayYMD]);

  const analytics = useMemo(() => {
    const mappedCategories = {} as Record<CategoryKey, { total: number; count: number }>;
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
      trends: {
        income: (() => {
          const last = cashFlowData[cashFlowData.length - 2] || { income: 0 };
          const curr = cashFlowData[cashFlowData.length - 1] || { income: 0 };
          const diff = curr.income - last.income;
          const pct = last.income > 0 ? (diff / last.income) * 100 : 0;
          return { change: `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`, trend: pct >= 0 ? 'up' as const : 'down' as const };
        })(),
        expense: (() => {
          const last = cashFlowData[cashFlowData.length - 2] || { expense: 0 };
          const curr = cashFlowData[cashFlowData.length - 1] || { expense: 0 };
          const diff = curr.expense - last.expense;
          const pct = last.expense > 0 ? (diff / last.expense) * 100 : 0;
          return { change: `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`, trend: pct >= 0 ? 'down' as const : 'up' as const }; // Up is bad for expense? No, "up" = growth.
        })(),
        balance: (() => {
          const last = cashFlowData[cashFlowData.length - 2] || { balance: 0 };
          const curr = cashFlowData[cashFlowData.length - 1] || { balance: 0 };
          const diff = curr.balance - last.balance;
          const pct = Math.abs(last.balance) > 0 ? (diff / Math.abs(last.balance)) * 100 : 0;
          return { change: `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`, trend: pct >= 0 ? 'up' as const : 'down' as const };
        })()
      },
      topTransactions: [...displayTransactions]
        .sort((a, b) => {
          const dateA = a.effectiveDateYMD ? parseYMD(a.effectiveDateYMD) : new Date(0);
          const dateB = b.effectiveDateYMD ? parseYMD(b.effectiveDateYMD) : new Date(0);
          return (dateB?.getTime() || 0) - (dateA?.getTime() || 0);
        }),
      totalSavings: totalIncome - totalExpense,
      savingsRate: totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0,
      avgTransactionValue: displayTransactions.length > 0 ? (totalIncome + totalExpense) / displayTransactions.length : 0,
      transactionCount: displayTransactions.length
    };
  }, [categoryTotals, totalIncome, totalExpense, categories, displayTransactions, cashFlowData, cashFlowProjection]);

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
  }, [uiTransactions, analytics, balanceStats]);



  // Add notification
  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const timestamp = new Date().toISOString();
    const newNotification: Notification = {
      timestamp,
      read: false,
      ...notification,
      id: tmpId(),
    };
    setNotifications(prev => {
      const base = notification.title !== resolveBudgetText('notifications.welcome', "Welcome to Budget Pro!")
        ? prev.filter(item => !item.id.startsWith("welcome-"))
        : prev;

      const duplicateIndex = base.findIndex(item =>
        item.title === newNotification.title &&
        item.message === newNotification.message &&
        item.type === newNotification.type
      );

      const next = [...base];
      if (duplicateIndex >= 0) {
        next.splice(duplicateIndex, 1);
      }

      return normalizeNotifications([newNotification, ...next]);
    });
  }, [resolveBudgetText]);

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
  const importData = useCallback((jsonData: unknown) => {
    try {
      const data = jsonData as { transactions: unknown[] };
      if (!data || !data.transactions || !Array.isArray(data.transactions)) {
        addNotification({
          title: resolveBudgetText('import.error', 'Import failed'),
          message: resolveBudgetText('import.invalidFormat', 'Invalid import format'),
          type: "error"
        });
        return;
      }

      // Safe import loop
      let importedCount = 0;
      for (const raw of data.transactions) {
        const rawTx = (raw ?? {}) as Partial<Transaction> & Record<string, unknown>;
        const amount = Number(rawTx.amount ?? 0);
        const type = rawTx.type === 'income' ? 'income' : 'expense';
        const effectiveDateYMD = safeYMD(rawTx.effectiveDateYMD ?? rawTx.date ?? todayYMD);
        const period = (rawTx.period ?? 'oneTime') as TransactionPeriod;
        const recurring = period !== 'oneTime';

        const importedTx: Omit<Transaction, 'id'> = {
          amount: Number.isFinite(amount) ? amount : 0,
          description: String(rawTx.description ?? ''),
          date: effectiveDateYMD,
          type,
          category: safeCategory(rawTx.category),
          period,
          recurring,
          currency: String(rawTx.currency ?? currency),
          kind: recurring ? 'master' : 'history',
          effectiveDateYMD,
          time: typeof rawTx.time === 'string' ? rawTx.time : undefined,
          tags: Array.isArray(rawTx.tags) ? rawTx.tags.map(tag => String(tag)).filter(Boolean) : [],
          status: rawTx.status === 'pending' || rawTx.status === 'cancelled' ? rawTx.status : 'completed',
          priority: rawTx.priority === 'low' || rawTx.priority === 'high' ? rawTx.priority : 'medium',
          notes: typeof rawTx.notes === 'string' ? rawTx.notes : undefined,
          attachmentUrl: typeof rawTx.attachmentUrl === 'string' ? rawTx.attachmentUrl : undefined,
          location: typeof rawTx.location === 'string' ? rawTx.location : undefined,
          reminderId: typeof rawTx.reminderId === 'string' ? rawTx.reminderId : undefined,
          createdAtISO: new Date().toISOString(),
        };

        if (dataContext?.addTransaction) {
          dataContext.addTransaction(importedTx);
          importedCount++;
        }
      }

      if (importedCount > 0) {
        addNotification({
          title: resolveBudgetText('import.success', 'Import completed'),
          message: `${resolveBudgetText('import.imported', 'Imported transactions')}: ${importedCount}`,
          type: "success"
        });
      }
    } catch (error) {
      console.error("Import failed", error);
    }
  }, [dataContext, t, addNotification, safeCategory, safeYMD, todayYMD, currency]);

  // Add transaction
  const addTransaction = useCallback((transaction: Omit<Transaction, 'id'>) => {
    const effectiveDateYMD = safeYMD(transaction.effectiveDateYMD ?? transaction.date);
    const period = transaction.period ?? 'oneTime';
    const recurring = period !== 'oneTime';

    const payload: Omit<Transaction, 'id'> = {
      amount: transaction.amount,
      description: transaction.description,
      date: effectiveDateYMD,
      type: transaction.type,
      category: transaction.category,
      period,
      recurring,
      currency: transaction.currency,
      kind: transaction.kind ?? (recurring ? 'master' : 'history'),
      effectiveDateYMD,
      time: transaction.time,
      tags: transaction.tags,
      status: transaction.status,
      priority: transaction.priority,
      notes: transaction.notes,
      attachmentUrl: transaction.attachmentUrl,
      location: transaction.location,
      reminderId: transaction.reminderId,
      createdAtISO: new Date().toISOString(),
    };

    if (dataContext?.addTransaction) {
      dataContext.addTransaction(payload);
    }

    if (recurring) {
      addNotification({
        title: transaction.type === "income"
          ? resolveBudgetText('notifications.recurringIncome', 'Recurring income scheduled')
          : resolveBudgetText('notifications.recurringExpense', 'Recurring expense scheduled'),
        message: `${transaction.description} • ${getPeriodLabel(period)}`,
        type: transaction.type === "income" ? "success" : "warning",
      });
      return;
    }

    if (effectiveDateYMD > todayYMD) {
      addNotification({
        title: resolveBudgetText('notifications.scheduledTransaction', 'Scheduled transaction added'),
        message: `${transaction.description} • ${formatDate(effectiveDateYMD, language === "hu" ? "hu-HU" : "en-US")}`,
        type: transaction.type === "income" ? "info" : "warning",
      });
      return;
    }

    if (Math.abs(transaction.amount) > 5000) {
      addNotification({
        title: resolveBudgetText('notifications.largeTransaction', "Large transaction added"),
        message: `${transaction.description} - ${formatCurrency(Math.abs(transaction.amount), transaction.currency || currency, language || 'en')}`,
        type: transaction.amount > 0 ? "success" : "warning",
      });
    }
  }, [addNotification, resolveBudgetText, getPeriodLabel, language, dataContext, safeYMD, todayYMD]);

  // Update transaction
  const updateTransaction = useCallback((id: string, updates: PlannerTransactionPatch) => {
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
    transactions: uiTransactions,
    uiTransactions,
    visibleTransactions: displayTransactions,
    categories,
    todayYMD,

    // Stats
    balanceStats,
    analytics,
    cashFlowProjection,
    backtestSummary,
    forecastSummary,

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
      if (!date) return "-";
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
  const { t, categories, todayYMD, language } = engine;
  const [showMetaPanel, setShowMetaPanel] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Standardized closing
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  const resolveModalText = useCallback((key: string, fallback: string) => {
    const value = t(key);
    const tail = (key.split('.').pop() as string) || key;
    return value && value !== key && value !== tail
      ? value
      : getBudgetLocalizedText(key, language, fallback);
  }, [language, t]);

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
      });
      setShowMetaPanel(Boolean(transaction.tags?.length) || Boolean(transaction.notes?.trim()));
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
      setShowMetaPanel(false);
    }
    setTagInput("");
    setFormError(null);
  }, [mode, transaction, engine.currency, todayYMD, presetType, isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const handleSubmit = () => {
    const amount = parseFloat(form.amount);
    if (!form.description.trim() || isNaN(amount) || amount <= 0) {
      setFormError(resolveModalText('notifications.pleaseCheckFields', 'Please fill all required fields.'));
      return;
    }

    setFormError(null);
    const isRecurring = form.period !== "oneTime";
    const transactionLabel = form.description.trim();

    if (mode === "edit" && transaction) {
      const patch: PlannerTransactionPatch = {
        description: form.description.trim(),
        amount: form.type === "income" ? Math.abs(amount) : -Math.abs(amount),
        currency: form.currency,
        category: form.category,
        effectiveDateYMD: form.date,
        time: form.time,
        type: form.type,
        tags: form.tags,
        notes: form.notes.trim() || undefined,
        priority: form.priority,
        status: "completed" as TransactionStatus,
      };

      if (transaction.period !== form.period) {
        patch.period = form.period;
        patch.recurring = isRecurring;
        patch.kind = isRecurring ? 'master' : 'history';
      }
      if (transaction.effectiveDateYMD !== form.date) {
        patch.date = form.date;
      }

      engine.updateTransaction(transaction.id, patch);
      engine.addNotification({
        title: resolveModalText('notifications.transactionUpdated', 'Transaction updated'),
        message: transactionLabel,
        type: "info",
      });
    } else {
      const transactionData: Omit<Transaction, 'id'> = {
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
        status: "completed" as TransactionStatus,
        date: form.date,
        kind: isRecurring ? 'master' : 'history',
        recurring: isRecurring,
      };
      engine.addTransaction(transactionData);
    }

    localStorage.removeItem('budget-transaction-draft');
    onClose();
  };

  const addTag = () => {
    const nextTags = tagInput
      .split(",")
      .map(tag => tag.trim().replace(/\s+/g, " "))
      .filter(Boolean);

    if (nextTags.length === 0) return;

    setForm(prev => {
      const existing = new Set(prev.tags.map(tag => tag.toLocaleLowerCase()));
      const uniqueTags = nextTags.filter(tag => !existing.has(tag.toLocaleLowerCase()));
      if (uniqueTags.length === 0) return prev;
      return { ...prev, tags: [...prev.tags, ...uniqueTags] };
    });
    setTagInput("");
    setShowMetaPanel(true);
  };

  const removeTag = (tag: string) => {
    setForm(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl rounded-[2rem] bg-slate-950/95 border border-slate-700/80 shadow-2xl shadow-black/50 overflow-hidden"
      >
        <div className="p-6 border-b border-slate-700/80 bg-slate-900/60">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">
              {mode === "edit"
                ? t('transactions.editTransaction') || 'Edit Transaction'
                : t('transactions.newTransaction') || 'Uj tranzakcio'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-slate-800 transition-colors"
            >
              <X size={20} className="text-slate-300" />
            </button>
          </div>
        </div>

        <div className="p-8 max-h-[75vh] overflow-y-auto">
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-400 mb-2">
                {t('transactions.description') || 'Leiras'}
              </label>
              <AnimatedInput
                value={form.description}
                onChange={(e) => {
                  setForm(prev => ({ ...prev, description: e.target.value }));
                  if (formError) setFormError(null);
                }}
                placeholder={t('transactions.descriptionPlaceholder') || 'Pl.: ugyfel fizetes'}
                error={!form.description.trim() && formError ? formError : undefined}
                className="bg-slate-900/80 border-slate-700/80 rounded-full text-white px-5 shadow-none placeholder:text-slate-400 focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-white mb-2">
                {t('transactions.amount') || 'Osszeg'}
              </label>
              <div className="flex gap-4">
                <AnimatedInput
                  type="number"
                  value={form.amount}
                  onChange={(e) => {
                    setForm(prev => ({ ...prev, amount: e.target.value }));
                    if (formError) setFormError(null);
                  }}
                  placeholder="0.00"
                  error={(isNaN(parseFloat(form.amount)) || parseFloat(form.amount) <= 0) && formError ? formError : undefined}
                  className="flex-1 bg-slate-900/80 border-slate-700/80 rounded-full text-white px-5 shadow-none placeholder:text-slate-400 focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-500/20"
                />
                <div className="relative">
                  <select
                    value={form.currency}
                    onChange={(e) => setForm(prev => ({ ...prev, currency: e.target.value }))}
                    className="appearance-none pl-6 pr-10 py-3 rounded-full border border-slate-700/80 bg-slate-900/80 text-white font-bold outline-none cursor-pointer hover:border-slate-500 transition-colors focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-500/20"
                  >
                    {AVAILABLE_CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>{c.code}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 px-2 min-w-0">
            <div className="space-y-4">
              <label className="block text-xs font-bold tracking-widest text-gray-400 uppercase">
                {t('transactions.dateTime') || 'Datum es ido'}
              </label>
              <div className="flex gap-3">
                <AnimatedInput
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm(prev => ({ ...prev, date: e.target.value }))}
                  className="flex-1 bg-slate-900/80 border-slate-700/80 rounded-full text-white px-5 shadow-none placeholder:text-slate-400 focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-500/20"
                />
                <AnimatedInput
                  type="time"
                  value={form.time}
                  onChange={(e) => setForm(prev => ({ ...prev, time: e.target.value }))}
                  className="w-28 bg-slate-900/80 border-slate-700/80 rounded-full text-white px-5 text-center shadow-none focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>
          </div>

          <div className="mt-6 px-2">
            <div className="rounded-[1.5rem] border border-slate-700/80 bg-slate-900/55 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowMetaPanel(prev => !prev)}
                className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left hover:bg-slate-800/50 transition-colors"
              >
                <div>
                  <p className="text-xs font-bold tracking-widest text-slate-400 uppercase">
                    {resolveModalText('transactions.meta', 'Tags and notes')}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-200">
                    {form.tags.length > 0
                      ? `${form.tags.length} ${resolveModalText('transactions.tags', 'tags').toLowerCase()}`
                      : resolveModalText('transactions.noTags', 'No tags yet')}
                    {' • '}
                    {form.notes.trim()
                      ? resolveModalText('transactions.notesSaved', 'Notes saved')
                      : resolveModalText('transactions.noNotes', 'No notes yet')}
                  </p>
                </div>
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-700/80 bg-slate-950/70 text-slate-300">
                  {showMetaPanel ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </span>
              </button>

              <AnimatePresence initial={false}>
                {showMetaPanel && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className="overflow-hidden border-t border-slate-700/70"
                  >
                    <div className="p-5 space-y-5">
                      <div className="space-y-4">
                        <label className="block text-xs font-bold tracking-widest text-gray-400 uppercase">
                          {t('transactions.tags') || 'Cimkek'}
                        </label>
                        <div className="flex gap-3">
                          <AnimatedInput
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addTag();
                              }
                            }}
                            placeholder={t('transactions.addTag') || 'Cimke hozzaadasa...'}
                            className="flex-1 bg-slate-950/80 border-slate-700/80 rounded-full text-white px-5 shadow-none placeholder:text-slate-400 focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-500/20"
                          />
                          <button
                            type="button"
                            onClick={addTag}
                            className="h-[46px] w-[46px] rounded-full border border-slate-700/80 bg-transparent flex items-center justify-center shrink-0 hover:bg-slate-800 text-slate-300 transition-colors"
                            aria-label={t('transactions.addTag') || 'Cimke hozzaadasa'}
                          >
                            <Plus size={18} />
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2 min-h-[32px]">
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

                      <div>
                        <label className="block text-xs font-bold tracking-widest text-gray-400 uppercase mb-2">
                          {t('transactions.notes') || 'Leiras (opcionalis)'}
                        </label>
                        <textarea
                          value={form.notes}
                          onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                          placeholder={t('transactions.notesPlaceholder') || 'Tovabbi informaciok...'}
                          className="w-full h-24 px-5 py-4 rounded-[1.5rem] border border-slate-700/80 bg-slate-950/80 text-white font-bold placeholder:text-slate-400 outline-none focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-500/20 resize-none transition-colors"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="mt-6 px-2">
            <label className="block text-xs font-bold tracking-widest text-gray-400 uppercase mb-3">
              {t('transactions.type') || 'Tipus'}
            </label>
            <div className="flex gap-4 max-w-md">
              <button
                onClick={() => setForm(prev => ({ ...prev, type: "income" }))}
                className={`flex-1 py-3 px-6 rounded-full border-2 transition-all flex items-center justify-center gap-2 font-bold text-sm ${form.type === "income"
                  ? 'border-[#10b981] bg-[#10b981] text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                  : 'border-[#10b981] bg-transparent text-[#10b981] hover:bg-[#10b981]/10'
                  }`}
              >
                <TrendingUp size={18} className="shrink-0" />
                <span>{t('transactions.income') || 'Bevetel'}</span>
              </button>
              <button
                onClick={() => setForm(prev => ({ ...prev, type: "expense" }))}
                className={`flex-1 py-3 px-6 rounded-full border-2 transition-all flex items-center justify-center gap-2 font-bold text-sm ${form.type === "expense"
                  ? 'border-[#ef4444] bg-[#ef4444] text-white shadow-[0_0_15px_rgba(239,68,68,0.3)]'
                  : 'border-[#ef4444] bg-transparent text-[#ef4444] hover:bg-[#ef4444]/10'
                  }`}
              >
                <TrendingDown size={18} className="shrink-0" />
                <span>{t('transactions.expense') || 'Kiadas'}</span>
              </button>
            </div>
          </div>

          <div className="mt-8 px-2">
            <label className="block text-xs font-bold tracking-widest text-gray-400 uppercase mb-4">
              {t('transactions.category') || 'KATEGORIA'}
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 gap-3">
              {Object.entries(categories).map(([key, cat]) => (
                <button
                  key={key}
                  onClick={() => setForm(prev => ({ ...prev, category: key as CategoryKey }))}
                  className={`py-4 px-2 rounded-[1.5rem] border transition-all flex flex-col items-center justify-center gap-2 group/cat ${form.category === key
                    ? 'border-[#4f46e5] bg-[#4f46e5] shadow-lg shadow-indigo-500/20'
                    : 'border-slate-700/70 bg-slate-900/40 hover:border-slate-500 hover:bg-slate-800/70'
                    }`}
                  title={cat.label}
                >
                  <div
                    className={`transition-transform group-hover/cat:scale-110 ${form.category === key ? 'text-white' : ''}`}
                    style={{ color: form.category === key ? 'white' : cat.color }}
                  >
                    {React.cloneElement(cat.icon as React.ReactElement, { size: 20 })}
                  </div>
                  <span className={`text-[12px] font-bold truncate w-full text-center ${form.category === key ? 'text-white' : 'text-gray-400'}`}>
                    {cat.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-8 px-2 pb-6">
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold tracking-widest text-gray-400 uppercase mb-2">
                    {t('transactions.period') || 'Gyakorisag'}
                  </label>
                  <label className="block text-xs font-bold tracking-widest text-gray-400 uppercase mb-2">
                    {t('transactions.priority') || 'Prioritas'}
                  </label>
                  <div className="relative">
                    <select
                      value={form.priority}
                      onChange={(e) => setForm(prev => ({ ...prev, priority: e.target.value as PriorityLevel }))}
                      className="w-full pl-5 pr-10 py-3 rounded-full border border-slate-700/80 bg-slate-900/80 text-white font-bold outline-none cursor-pointer hover:border-slate-500 transition-colors appearance-none focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-500/20"
                    >
                      <option value="low">{t('priority.low') || 'Alacsony'}</option>
                      <option value="medium">{t('priority.medium') || 'Kozepes'}</option>
                      <option value="high">{t('priority.high') || 'Magas'}</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-700/80 bg-slate-900/50">
          {formError && (
            <p className="mb-4 rounded-[var(--radius-xl)] border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-300">
              {formError}
            </p>
          )}
          <div className="flex gap-6">
            <button
              onClick={onClose}
              className="flex-1 py-4 rounded-full border border-slate-600 text-slate-300 font-bold text-sm tracking-widest uppercase hover:bg-slate-800 hover:text-white transition-colors"
            >
              {t('common.cancel') || 'MEGSEM'}
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 py-4 rounded-full bg-[#10b981] text-white font-bold text-sm tracking-widest uppercase flex items-center justify-center gap-2 hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-500/20"
            >
              <Check size={20} />
              {mode === 'edit' ? (t('transactions.actions.update') || 'MODOSITAS') : (t('transactions.actions.save') || 'MENTES')}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

/* -------------------------------- Main Enhanced Component -------------------------------- */

const EnhancedBudgetView: React.FC = () => {
  const engine = useEnhancedBudgetEngine();
  const { t, balanceStats, analytics, cashFlowProjection, notifications, currency, language, backtestSummary, forecastSummary, visibleTransactions, deleteTransactions, addNotification } = engine;

  const [activeTab, setActiveTab] = useState<"dashboard" | "transactions" | "analytics" | "goals" | "settings">("dashboard");
  const [searchQuery, setSearchQuery] = useState("");


  // ... inside component ...

  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showConverterModal, setShowConverterModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<BudgetTransaction | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showForecastDetails, setShowForecastDetails] = useState(false);

  const unreadNotifications = useMemo(
    () => notifications.filter(n => !n.read).length,
    [notifications]
  );

  const analyticsCategoryRadarData = useMemo(() => {
    return Object.entries(analytics.categoryBreakdown)
      .filter(([, value]) => value.total > 0)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 6)
      .map(([key, value]) => ({
        subject: engine.categories[key as CategoryKey]?.label || key,
        value: value.total,
      }));
  }, [analytics.categoryBreakdown, engine.categories]);

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

  const resolveText = useCallback((key: string, fallback: string) => {
    const value = t(key);
    const tail = (key.split('.').pop() as string) || key;
    if (!value || value === key || value === tail) {
      return getBudgetLocalizedText(key, language, fallback);
    }
    return value;
  }, [language, t]);

  const filteredTransactions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const sorted = [...visibleTransactions].sort((a, b) => {
      const keyA = a.effectiveDateYMD + 'T' + (a.time || '00:00');
      const keyB = b.effectiveDateYMD + 'T' + (b.time || '00:00');
      return keyB.localeCompare(keyA);
    });

    if (!query) return sorted;

    return sorted.filter(tx => {
      const haystack = [
        tx.description,
        tx.category,
        tx.notes || '',
        ...(tx.tags || []),
      ].join(' ').toLowerCase();

      return haystack.includes(query);
    });
  }, [visibleTransactions, searchQuery]);

  const handleDeleteAllVisible = useCallback(() => {
    if (filteredTransactions.length === 0) return;

    const fallbackMessage = 'Delete ' + filteredTransactions.length + ' transactions? This action cannot be undone.';
    const translated = resolveText('budget.delete.confirmAll', fallbackMessage);
    const message = translated === fallbackMessage
      ? fallbackMessage
      : translated + ' (' + filteredTransactions.length + ')';

    if (!window.confirm(message)) return;

    const ids = Array.from(new Set(
      filteredTransactions.flatMap(tx =>
        tx.sourceIds && tx.sourceIds.length > 0 ? tx.sourceIds : [tx.id]
      )
    ));
    deleteTransactions(ids);
    addNotification({
      title: resolveText('notifications.transactionsDeleted', 'Transactions removed'),
      message: getBudgetLocalizedText('notifications.transactionsDeletedMessage', language, `${ids.length} transactions deleted`, { count: ids.length }),
      type: "warning",
    });
  }, [addNotification, deleteTransactions, filteredTransactions, language, resolveText]);

  return (
    <div className="budget-container flex flex-col min-h-screen bg-[rgb(var(--surface-primary))] text-[rgb(var(--text-primary))] transition-colors duration-[var(--transition-normal)] overflow-x-hidden">
      {/* Premium Background Effects */}
      <div className="premium-glow top-0 left-0" />
      <div className="premium-glow-secondary bottom-0 right-0" />
      <div className="premium-glow top-1/2 left-1/3 opacity-30" />

      <div className="relative z-10 w-full px-6 py-8">
        {/* Header */}
        <header className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-[var(--radius-xl)] bg-[var(--gradient-primary)] shadow-[var(--glow-primary)]">
                <Wallet size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-black bg-[var(--gradient-primary)] bg-clip-text text-transparent">
                  {t('app.title') || "Budget Pro"}
                </h1>
                <p className="text-[rgb(var(--text-secondary))] font-medium">
                  {t('app.subtitle') || "Advanced financial management"}
                </p>
              </div>
              <div className="hidden md:flex items-center gap-2">
                <span className="px-3 py-1.5 rounded-full bg-[rgb(var(--color-primary-500))]/10 border border-[rgb(var(--color-primary-500))]/20 text-[rgb(var(--color-primary-600))] dark:text-[rgb(var(--color-primary-400))] text-sm font-bold">
                  PREMIUM
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Currency Selector */}
              <select
                value={engine.currency}
                onChange={(e) => engine.setCurrency(e.target.value)}
                className="px-4 py-2.5 rounded-[var(--radius-xl)] border border-[rgb(var(--border-primary))] bg-[rgb(var(--surface-elevated))] text-[rgb(var(--text-primary))] font-bold outline-none cursor-pointer"
              >
                {AVAILABLE_CURRENCIES.map(c => (
                  <option key={c.code} value={c.code} className="bg-[rgb(var(--surface-elevated))] text-[rgb(var(--text-primary))]">{c.code}</option>
                ))}
              </select>

              {/* Currency Converter */}
              <button
                onClick={() => setShowConverterModal(true)}
                className="p-2.5 rounded-[var(--radius-xl)] border border-[rgb(var(--border-primary))] bg-[rgb(var(--surface-elevated))] hover:bg-[rgb(var(--surface-tertiary))] transition-colors group"
                title="Currency Converter"
              >
                <RefreshCcw size={20} className="text-[rgb(var(--text-secondary))] group-hover:text-[rgb(var(--text-primary))]" />
              </button>

              {/* Notifications */}
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2.5 rounded-[var(--radius-xl)] border border-[rgb(var(--border-primary))] bg-[rgb(var(--surface-elevated))] hover:bg-[rgb(var(--surface-tertiary))] transition-colors group"
              >
                <Bell size={20} className="text-[rgb(var(--text-secondary))] group-hover:text-[rgb(var(--text-primary))]" />
                {unreadNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[var(--gradient-danger)] text-white text-xs font-bold flex items-center justify-center shadow-md">
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
          <nav className="flex flex-wrap gap-2 border-b border-[rgb(var(--border-primary))] pb-2">
            {[
              { id: "dashboard", label: t('tabs.dashboard') || 'Dashboard', icon: <BarChart3 size={16} /> },
              { id: "transactions", label: t('tabs.transactions') || 'Transactions', icon: <FileText size={16} /> },
              { id: "analytics", label: t('tabs.analytics') || 'Analytics', icon: <PieChartIcon size={16} /> },
              { id: "goals", label: t('tabs.goals') || 'Goals', icon: <Target size={16} /> },
              { id: "settings", label: t('tabs.settings') || 'Settings', icon: <Settings size={16} /> },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as "dashboard" | "transactions" | "analytics" | "goals" | "settings")}
                className={`flex items-center gap-2 px-4 py-3 rounded-[var(--radius-xl)] font-bold transition-all ${activeTab === tab.id
                  ? 'bg-[rgb(var(--color-primary-500))]/10 text-[rgb(var(--color-primary-600))] dark:text-[rgb(var(--color-primary-400))] border border-[rgb(var(--color-primary-500))]/20'
                  : 'text-[rgb(var(--text-tertiary))] hover:text-[rgb(var(--text-primary))] hover:bg-[rgb(var(--surface-tertiary))]'
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
                  change={analytics.trends.balance.change}
                  trend={analytics.trends.balance.trend}
                  icon={<Wallet size={24} />}
                  color="blue"
                />
                <StatCard
                  title={t('stats.income')}
                  value={engine.formatCurrency(balanceStats.income)}
                  change={analytics.trends.income.change}
                  trend={analytics.trends.income.trend}
                  icon={<TrendingUp size={24} />}
                  color="green"
                />
                <StatCard
                  title={t('stats.expenses')}
                  value={engine.formatCurrency(balanceStats.expense)}
                  change={analytics.trends.expense.change}
                  trend={analytics.trends.expense.trend}
                  icon={<TrendingDown size={24} />}
                  color="red"
                />
                <StatCard
                  title={t('stats.savings')}
                  value={engine.formatCurrency(analytics.totalSavings)}
                  change={`${analytics.savingsRate?.toFixed(1) || '0.0'}% Rate`}
                  trend={(analytics.savingsRate || 0) >= 20 ? "up" : "neutral"}
                  icon={<Star size={24} />}
                  color="purple"
                />
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <GlassCard>
                  <div className="p-5 space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-base font-black text-[rgb(var(--text-primary))]">
                        {resolveText('analytics.backtestTitle', 'Backtest (Realized)')}
                      </h3>
                      <span className="text-xs font-bold text-[rgb(var(--text-tertiary))] text-right">
                        {backtestSummary.firstEntryYMD
                          ? (engine.formatDate(backtestSummary.firstEntryYMD) + ' - ' + engine.formatDate(engine.todayYMD))
                          : engine.formatDate(engine.todayYMD)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-[var(--radius-xl)] border border-emerald-500/20 bg-emerald-500/10 p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-400">{resolveText('stats.income', 'Income')}</p>
                        <p className="text-sm font-black text-emerald-300">{engine.formatCurrency(backtestSummary.realizedIncome)}</p>
                      </div>
                      <div className="rounded-[var(--radius-xl)] border border-rose-500/20 bg-rose-500/10 p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-rose-400">{resolveText('stats.expenses', 'Expenses')}</p>
                        <p className="text-sm font-black text-rose-300">{engine.formatCurrency(backtestSummary.realizedExpense)}</p>
                      </div>
                      <div className="rounded-[var(--radius-xl)] border border-[rgb(var(--border-primary))] bg-[rgb(var(--surface-tertiary))] p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-[rgb(var(--text-tertiary))]">{resolveText('stats.balance', 'Net')}</p>
                        <p className="text-sm font-black text-[rgb(var(--text-primary))]">{engine.formatCurrency(backtestSummary.realizedNet)}</p>
                      </div>
                      <div className="rounded-[var(--radius-xl)] border border-[rgb(var(--border-primary))] bg-[rgb(var(--surface-tertiary))] p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-[rgb(var(--text-tertiary))]">{resolveText('analytics.avgMonthlyNet', 'Avg Monthly Net')}</p>
                        <p className="text-sm font-black text-[rgb(var(--text-primary))]">{engine.formatCurrency(backtestSummary.averageMonthlyNet)}</p>
                      </div>
                    </div>
                    <p className="text-xs font-medium text-[rgb(var(--text-tertiary))]">
                      {resolveText('analytics.backtestTracked', 'Tracked realized transactions')}: {backtestSummary.transactionCount} | {resolveText('analytics.months', 'months')}: {backtestSummary.trackedMonths}
                    </p>
                  </div>
                </GlassCard>

                <GlassCard>
                  <div className="p-5 space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-base font-black text-[rgb(var(--text-primary))]">
                          {resolveText('analytics.forecastTitle', 'Forecast')}
                        </h3>
                        <p className="text-xs font-medium text-[rgb(var(--text-tertiary))] mt-1">
                          {forecastSummary.horizonMonths} {resolveText('analytics.months', 'months')}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowForecastDetails(prev => !prev)}
                        className="inline-flex items-center gap-2 rounded-full border border-[rgb(var(--border-primary))] bg-[rgb(var(--surface-tertiary))] px-3 py-2 text-xs font-bold text-[rgb(var(--text-secondary))] hover:border-[rgb(var(--border-secondary))] hover:text-[rgb(var(--text-primary))] transition-colors"
                      >
                        {showForecastDetails
                          ? (resolveText('common.hide', 'Hide'))
                          : (resolveText('common.details', 'Details'))}
                        {showForecastDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-[var(--radius-xl)] border border-[rgb(var(--border-primary))] bg-[rgb(var(--surface-tertiary))] p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-[rgb(var(--text-tertiary))]">{resolveText('stats.balance', 'Projected Balance')}</p>
                        <p className="text-sm font-black text-[rgb(var(--text-primary))]">{engine.formatCurrency(forecastSummary.projectedBalance)}</p>
                      </div>
                      <div className="rounded-[var(--radius-xl)] border border-[rgb(var(--border-primary))] bg-[rgb(var(--surface-tertiary))] p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-[rgb(var(--text-tertiary))]">{resolveText('analytics.nextMonthNet', 'Next Month Net')}</p>
                        <p className="text-sm font-black text-[rgb(var(--text-primary))]">{engine.formatCurrency(forecastSummary.nextMonthNet)}</p>
                      </div>
                    </div>
                    <AnimatePresence initial={false}>
                      {showForecastDetails && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.18, ease: "easeOut" }}
                          className="overflow-hidden space-y-4"
                        >
                          <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-[var(--radius-xl)] border border-emerald-500/20 bg-emerald-500/10 p-3">
                              <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-400">{resolveText('stats.income', 'Income')}</p>
                              <p className="text-sm font-black text-emerald-300">{engine.formatCurrency(forecastSummary.expectedIncome)}</p>
                            </div>
                            <div className="rounded-[var(--radius-xl)] border border-rose-500/20 bg-rose-500/10 p-3">
                              <p className="text-[10px] font-bold uppercase tracking-wide text-rose-400">{resolveText('stats.expenses', 'Expenses')}</p>
                              <p className="text-sm font-black text-rose-300">{engine.formatCurrency(forecastSummary.expectedExpense)}</p>
                            </div>
                          </div>
                          <p className="text-xs font-medium text-[rgb(var(--text-tertiary))]">
                            {resolveText('analytics.upcomingTransactions', 'Upcoming transactions')}: {forecastSummary.upcomingCount} ({forecastSummary.upcomingIncomeCount}/{forecastSummary.upcomingExpenseCount})
                          </p>
                          <p className="text-xs font-medium text-[rgb(var(--text-tertiary))]">
                            {forecastSummary.firstNegativePeriod
                              ? (resolveText('analytics.firstNegative', 'First negative balance period') + ': ' + forecastSummary.firstNegativePeriod)
                              : resolveText('analytics.noNegative', 'No negative balance in the forecast window.')}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </GlassCard>
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
                            <stop offset="5%" stopColor="rgb(var(--color-primary-500))" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="rgb(var(--color-primary-500))" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.4} />
                          </linearGradient>
                          <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f87171" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#f87171" stopOpacity={0.4} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(var(--text-tertiary), 0.05)" vertical={false} />
                        <XAxis
                          dataKey="month"
                          stroke="rgb(var(--text-tertiary))"
                          tick={{ fill: 'rgb(var(--text-tertiary))', fontSize: 11, fontWeight: 600 }}
                          tickLine={false}
                          axisLine={false}
                          dy={10}
                        />
                        <YAxis
                          stroke="rgb(var(--text-tertiary))"
                          tick={{ fill: 'rgb(var(--text-tertiary))', fontSize: 11, fontWeight: 600 }}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(value) => `${value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}`}
                        />
                        <RechartsTooltip
                          content={<CustomTooltip currency={engine.currency} language={engine.language} />}
                          cursor={{ stroke: 'rgba(var(--color-primary-500), 0.2)', strokeWidth: 20 }}
                        />
                        <Legend
                          verticalAlign="top"
                          height={36}
                          iconType="circle"
                          formatter={(value) => <span className="text-xs font-bold text-[rgb(var(--text-secondary))] px-2">{value}</span>}
                        />

                        <Bar dataKey="income" name={t('stats.income')} fill="url(#colorIncome)" radius={[6, 6, 0, 0]} barSize={12} />
                        <Bar dataKey="expense" name={t('stats.expenses')} fill="url(#colorExpense)" radius={[6, 6, 0, 0]} barSize={12} />

                        <Area
                          type="monotone"
                          dataKey="balance"
                          name={t('stats.balance')}
                          stroke="rgb(var(--color-primary-500))"
                          strokeWidth={4}
                          fill="url(#colorBalance)"
                          animationDuration={1500}
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
                      .filter(([, value]) => value.total > 0)
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
                        <p className="text-[rgb(var(--text-tertiary))] text-sm font-medium">No data available</p>
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
                    <h3 className="text-lg font-black text-[rgb(var(--text-primary))] mb-4">{t('quickActions.title')}</h3>
                    <div className="space-y-3">
                      {quickActions.map((action, index) => {
                        const colorMap: Record<string, { bg: string, border: string, text: string }> = {
                          rose: { bg: 'bg-rose-500/10', border: 'border-rose-400/20', text: 'text-rose-500' },
                          emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-400/20', text: 'text-emerald-500' },
                          purple: { bg: 'bg-purple-500/10', border: 'border-purple-400/20', text: 'text-purple-500' },
                          blue: { bg: 'bg-blue-500/10', border: 'border-blue-400/20', text: 'text-blue-500' },
                        };
                        const style = colorMap[action.color] || colorMap.blue;

                        return (
                          <button
                            key={index}
                            onClick={action.action}
                            className="w-full flex items-center gap-3 p-3 rounded-[var(--radius-xl)] border border-[rgb(var(--border-primary))] hover:border-[rgb(var(--border-secondary))] hover:bg-[rgb(var(--surface-elevated))] transition-all group"
                          >
                            <div className={`p-2 rounded-[var(--radius-lg)] ${style.bg} border ${style.border} group-hover:scale-110 transition-transform`}>
                              <div className={style.text}>
                                {action.icon}
                              </div>
                            </div>
                            <span className="font-bold text-[rgb(var(--text-secondary))] group-hover:text-[rgb(var(--text-primary))]">
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
                      <h3 className="text-lg font-black text-[rgb(var(--text-primary))]">{t('transactions.recent')}</h3>
                      <button
                        onClick={() => setActiveTab("transactions")}
                        className="text-sm font-bold text-[rgb(var(--color-primary-500))] hover:text-[rgb(var(--color-primary-600))]"
                      >
                        {t('transactions.viewAll') || "View All"}
                      </button>
                    </div>
                    <div className="space-y-3">
                      {analytics.topTransactions.slice(0, 5).map((tx) => (
                        <div
                          key={tx.id}
                          className="flex items-center justify-between p-3 rounded-[var(--radius-xl)] border border-[rgb(var(--border-primary))] hover:border-[rgb(var(--border-secondary))] hover:bg-[rgb(var(--surface-elevated))] transition-all cursor-pointer"
                          onClick={() => {
                            const editable = engine.transactions.find(candidate => candidate.id === tx.id) || tx;
                            setEditingTransaction(editable);
                            setShowTransactionModal(true);
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-[var(--radius-lg)] ${tx.type === "income"
                              ? "bg-emerald-500/10 border border-emerald-400/20"
                              : "bg-rose-500/10 border border-rose-400/20"
                              }`}>
                              {tx.type === "income" ?
                                <TrendingUp size={16} className="text-emerald-500" /> :
                                <TrendingDown size={16} className="text-rose-500" />
                              }
                            </div>
                            <div>
                              <p className="font-bold text-[rgb(var(--text-primary))]">
                                {tx.description}
                                {(tx.occurrenceCount || 1) > 1 && (
                                  <span className="ml-2 text-xs font-semibold text-[rgb(var(--text-tertiary))]">
                                    ({tx.occurrenceCount})
                                  </span>
                                )}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <Tag
                                  label={engine.categories[tx.category as CategoryKey]?.label || engine.categories.other.label}
                                  color={engine.categories[tx.category as CategoryKey]?.color || engine.categories.other.color}
                                />
                                <span className="text-xs text-[rgb(var(--text-tertiary))]">{engine.formatDate(tx.effectiveDateYMD || "")}</span>
                              </div>
                            </div>
                          </div>
                          <div className={`font-black ${tx.type === "income" ? "text-emerald-500" : "text-rose-500"
                            }`}>
                            {tx.type === "income" ? "+" : "-"}{engine.formatCurrency(Math.abs(tx.amount), tx.currency)}
                          </div>
                        </div>
                      ))}
                      {analytics.topTransactions.length === 0 && (
                        <div className="text-center py-8 text-[rgb(var(--text-tertiary))]">
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
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgb(var(--text-tertiary))]" size={16} />
                    <input
                      type="text"
                      placeholder={t('transactions.searchPlaceholder') || "Search transactions..."}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-[rgb(var(--surface-elevated))] border border-[rgb(var(--border-primary))] rounded-[var(--radius-xl)] py-2.5 pl-10 pr-4 text-[rgb(var(--text-primary))] font-medium outline-none focus:border-[rgb(var(--color-primary-500))]/50 transition-colors"
                    />
                  </div>
                  <div className="flex items-center gap-2 w-full md:w-auto">
                    <button
                      onClick={handleDeleteAllVisible}
                      disabled={filteredTransactions.length === 0}
                      className="px-4 py-2.5 rounded-[var(--radius-xl)] border border-rose-500/30 text-rose-400 font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-rose-500/10 transition-colors"
                    >
                      {resolveText('budget.delete.deleteAll', 'Delete All')}
                    </button>
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
                {filteredTransactions.map(tx => (
                    <GlassCard key={tx.id} className="hover:border-[rgb(var(--border-secondary))] transition-colors group cursor-pointer">
                      <div className="p-4 flex items-center justify-between" onClick={() => {
                        const editable = engine.transactions.find(candidate => candidate.id === tx.id) || tx;
                        setEditingTransaction(editable);
                        setShowTransactionModal(true);
                      }}>
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-[var(--radius-xl)] ${tx.type === 'income' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                            {engine.categories[tx.category as CategoryKey]?.icon || <TagIcon size={20} />}
                          </div>
                          <div>
                            <h4 className="font-bold text-[rgb(var(--text-primary))] text-lg">
                              {tx.description}
                              {(tx.occurrenceCount || 1) > 1 && (
                                <span className="ml-2 text-xs font-semibold text-[rgb(var(--text-tertiary))]">
                                  ({tx.occurrenceCount})
                                </span>
                              )}
                            </h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-xs font-bold px-2 py-0.5 rounded border bg-[rgb(var(--surface-tertiary))] border-[rgb(var(--border-primary))] text-[rgb(var(--text-secondary))]`}>
                                {engine.categories[tx.category as CategoryKey]?.label || tx.category}
                              </span>
                              <span className="text-xs text-[rgb(var(--text-tertiary))] font-medium">
                                {engine.formatDate(tx.effectiveDateYMD)} {tx.time ? (' | ' + tx.time) : ''}
                              </span>
                              {tx.status === 'pending' && (
                                <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-500">
                                  {(t('invoicing.pending') || "PENDING").toUpperCase()}
                                </span>
                              )}
                            </div>
                            {tx.notes && (
                              <p className="mt-2 max-w-[32rem] text-xs font-medium text-[rgb(var(--text-tertiary))] break-words">
                                {tx.notes}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <span className={`block font-black text-xl ${tx.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                              {tx.type === 'income' ? '+' : '-'}{engine.formatCurrency(Math.abs(tx.amount), tx.currency)}
                            </span>
                            {tx.tags && tx.tags.length > 0 && (
                              <div className="flex gap-1 justify-end mt-1 flex-wrap max-w-[14rem]">
                                {tx.tags.slice(0, 3).map(tag => (
                                  <span key={tag} className="text-[10px] bg-[rgb(var(--surface-tertiary))] px-1.5 py-0.5 rounded text-[rgb(var(--text-tertiary))]">#{tag}</span>
                                ))}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const confirmMessage = resolveText('budget.delete.confirmOne', 'Delete this transaction?');
                              if (window.confirm(confirmMessage)) {
                                engine.deleteTransaction(tx.id);
                                engine.addNotification({
                                  title: resolveText('notifications.transactionDeleted', 'Transaction removed'),
                                  message: tx.description,
                                  type: "warning",
                                });
                              }
                            }}
                            className="p-2 hover:bg-rose-500/20 rounded-[var(--radius-lg)] text-[rgb(var(--text-tertiary))] hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </GlassCard>
                  ))}

                {filteredTransactions.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-[rgb(var(--text-tertiary))] font-medium">
                      {visibleTransactions.length === 0
                        ? resolveText('budget.noTransactions', 'No transactions yet')
                        : resolveText('transactions.noResults', 'No transactions match your search')}
                    </p>
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
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(var(--border-primary), 0.3)" />
                        <XAxis dataKey="month" stroke="rgb(var(--text-tertiary))" tick={{ fill: 'rgb(var(--text-secondary))' }} />
                        <YAxis stroke="rgb(var(--text-tertiary))" tick={{ fill: 'rgb(var(--text-secondary))' }} />
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
                    analyticsCategoryRadarData.length > 0 ? (
                      <ResponsiveContainer width={width} height={height}>
                        <RadarChart data={analyticsCategoryRadarData}>
                          <PolarGrid stroke="rgba(var(--border-primary), 0.3)" />
                          <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgb(var(--text-secondary))', fontSize: 12 }} />
                          <PolarRadiusAxis tick={false} axisLine={false} />
                          <Radar name={t('stats.expenses') || "Expenses"} dataKey="value" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                          <RechartsTooltip content={<CustomTooltip currency={currency} language={language} />} />
                        </RadarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-[rgb(var(--text-tertiary))] text-sm font-medium">
                          {t('common.noData') || "No data available"}
                        </p>
                      </div>
                    )
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
                      <div className={`p-3 rounded-[var(--radius-xl)] bg-purple-500/10 text-purple-500`}>
                        {engine.categories[goal.category as CategoryKey]?.icon || <Target size={20} />}
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-[rgb(var(--text-tertiary))] font-bold uppercase tracking-wider">{t('goals.target') || "Target"}</p>
                        <p className="text-lg font-black text-[rgb(var(--text-primary))]">{engine.formatCurrency(goal.targetAmount)}</p>
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-[rgb(var(--text-primary))] mb-1">{goal.name}</h3>
                    <span className="text-sm text-[rgb(var(--text-tertiary))] mb-4">{t('tabs.goals')} | {engine.categories[goal.category as CategoryKey]?.label}</span>
                    <div className="relative h-2 bg-[rgb(var(--surface-tertiary))] rounded-full overflow-hidden mb-2">
                      <div
                        className="absolute left-0 top-0 h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-1000"
                        style={{ width: `${Math.min((goal.currentAmount / goal.targetAmount) * 100, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs font-medium text-[rgb(var(--text-tertiary))]">
                      <span>{Math.round((goal.currentAmount / goal.targetAmount) * 100)}%</span>
                      <span>{engine.formatCurrency(goal.currentAmount)}</span>
                    </div>
                  </div>
                </GlassCard>
              )) : (
                <div className="col-span-full py-12 text-center border-2 border-dashed border-[rgb(var(--border-primary))] rounded-[var(--radius-3xl)]">
                  <Target size={48} className="mx-auto text-[rgb(var(--text-tertiary))] mb-4" />
                  <h3 className="text-xl font-bold text-[rgb(var(--text-primary))] mb-2">{t('goals.noGoals') || "No goals set"}</h3>
                  <p className="text-[rgb(var(--text-secondary))] mb-6">{t('goals.subtitle') || "Set financial goals to track your progress."}</p>
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
                <h2 className="text-2xl font-black text-[rgb(var(--text-primary))] mb-6">{t('tabs.settings')}</h2>

                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <label className="block text-sm font-bold text-[rgb(var(--text-secondary))] mb-2 uppercase tracking-wider">{t('settings.startCalculation') || "Start Calculation From"}</label>
                      <div className="flex gap-2 p-1 bg-[rgb(var(--surface-tertiary))] rounded-[var(--radius-xl)] border border-[rgb(var(--border-primary))]">
                        <button
                          onClick={() => engine.setBalanceMode('realizedOnly')}
                          className={`flex-1 py-2 rounded-[var(--radius-lg)] text-sm font-bold transition-all ${engine.balanceMode === 'realizedOnly' ? 'bg-blue-600 text-white shadow-lg' : 'text-[rgb(var(--text-tertiary))] hover:text-[rgb(var(--text-primary))]'}`}
                        >
                          {t('settings.realizedOnly') || "Realized Only"}
                        </button>
                        <button
                          onClick={() => engine.setBalanceMode('includeScheduled')}
                          className={`flex-1 py-2 rounded-[var(--radius-lg)] text-sm font-bold transition-all ${engine.balanceMode === 'includeScheduled' ? 'bg-purple-600 text-white shadow-lg' : 'text-[rgb(var(--text-tertiary))] hover:text-[rgb(var(--text-primary))]'}`}
                        >
                          {t('settings.includeScheduled') || "Include Scheduled"}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-[rgb(var(--text-secondary))] mb-2 uppercase tracking-wider">{t('settings.currency') || "Currency"}</label>
                      <select
                        value={engine.currency}
                        onChange={(e) => engine.setCurrency(e.target.value)}
                        className="w-full px-4 py-3 rounded-[var(--radius-xl)] border border-[rgb(var(--border-primary))] bg-[rgb(var(--surface-elevated))] text-[rgb(var(--text-primary))] font-bold outline-none focus:border-[rgb(var(--color-primary-500))]/50"
                      >
                        {AVAILABLE_CURRENCIES.map(c => (
                          <option key={c.code} value={c.code} className="bg-[rgb(var(--surface-elevated))] text-[rgb(var(--text-primary))]">{c.code} - {c.symbol}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="pt-8 border-t border-[rgb(var(--border-primary))]">
                    <h3 className="text-lg font-bold text-[rgb(var(--text-primary))] mb-4">{t('settings.dataManagement') || "Data Management"}</h3>
                    <div className="flex gap-4">
                      <button
                        onClick={() => engine.exportData('json')}
                        className="flex items-center gap-2 px-6 py-3 rounded-[var(--radius-xl)] border border-[rgb(var(--border-primary))] hover:bg-[rgb(var(--surface-tertiary))] font-bold text-[rgb(var(--text-primary))] transition-colors"
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
              className="fixed right-6 top-20 w-96 max-h-[80vh] bg-[rgb(var(--surface-elevated))] rounded-[var(--radius-3xl)] border border-[rgb(var(--border-primary))] shadow-2xl overflow-hidden z-50 backdrop-blur-xl"
            >
              <div className="p-4 border-b border-[rgb(var(--border-primary))]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="p-2 rounded-[var(--radius-xl)] bg-[rgb(var(--surface-tertiary))] hover:bg-[rgb(var(--surface-secondary))] transition-colors text-[rgb(var(--text-primary))]"
                    >
                      <Bell size={18} />
                    </button>
                    <h3 className="font-black text-[rgb(var(--text-primary))]">
                      {resolveText('notifications.title', 'Notifications')}
                    </h3>
                  </div>
                  <button
                    onClick={() => engine.clearNotifications()}
                    disabled={notifications.length === 0}
                    className="text-sm font-bold text-rose-500 hover:text-rose-400 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {resolveText('notifications.clearAll', 'Clear All')}
                  </button>
                </div>
              </div>
              <div className="max-h-[60vh] overflow-y-auto">
                {notifications.map(notif => (
                  <div
                    key={notif.id}
                    className={`p-4 border-b border-[rgb(var(--border-primary))] hover:bg-[rgb(var(--surface-tertiary))] transition-colors cursor-pointer ${!notif.read ? "bg-[rgb(var(--color-primary-500))]/5" : ""
                      }`}
                    onClick={() => engine.markAsRead(notif.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-[var(--radius-xl)] ${notif.type === "success" ? "bg-emerald-500/10" :
                        notif.type === "warning" ? "bg-amber-500/10" :
                          notif.type === "error" ? "bg-rose-500/10" :
                            "bg-[rgb(var(--color-primary-500))]/10"
                        }`}>
                        <BellRing size={16} className={
                          notif.type === "success" ? "text-emerald-500" :
                            notif.type === "warning" ? "text-amber-500" :
                              notif.type === "error" ? "text-rose-500" :
                                "text-[rgb(var(--color-primary-500))]"
                        } />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-[rgb(var(--text-primary))]">
                            {(() => {
                              const key = findBudgetNotificationKey(notif.title);
                              return key ? getBudgetLocalizedText(key, language, notif.title) : notif.title;
                            })()}
                          </p>
                          <span className="text-xs text-[rgb(var(--text-tertiary))]">
                            {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-sm text-[rgb(var(--text-secondary))] mt-1">{notif.message}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {notifications.length === 0 && (
                  <div className="p-8 text-center">
                    <Bell size={24} className="text-[rgb(var(--text-tertiary))] mx-auto mb-2" />
                    <p className="text-[rgb(var(--text-tertiary))] text-sm">
                      {resolveText('notifications.empty', 'No notifications')}
                    </p>
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





