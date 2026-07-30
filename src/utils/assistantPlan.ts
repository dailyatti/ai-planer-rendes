import { AssistantAction, AssistantPlan } from '../types/assistant';
import { ViewType } from '../types/planner';

const NAV_TARGETS: Array<{ target: ViewType | 'stats'; aliases: string[] }> = [
  { target: 'daily', aliases: ['daily', 'napi', 'today'] },
  { target: 'weekly', aliases: ['weekly', 'heti'] },
  { target: 'monthly', aliases: ['monthly', 'havi'] },
  { target: 'yearly', aliases: ['yearly', 'eves', 'annual'] },
  { target: 'notes', aliases: ['notes', 'note', 'jegyzet'] },
  { target: 'goals', aliases: ['goals', 'goal', 'cel'] },
  { target: 'budget', aliases: ['budget', 'koltsegvetes'] },
  { target: 'invoicing', aliases: ['invoicing', 'invoice', 'szamla', 'szamlazas'] },
  { target: 'statistics', aliases: ['statistics', 'stats', 'statisztika'] },
  { target: 'habits', aliases: ['habits', 'habit', 'szokas'] },
  { target: 'integrations', aliases: ['integrations', 'integration', 'integraciok'] },
  { target: 'settings', aliases: ['settings', 'setting', 'beallitas'] },
  { target: 'pomodoro', aliases: ['pomodoro', 'focus timer'] },
];

const TASK_TRIGGERS = [
  'ird be',
  'ird fel',
  'jegyezd fel',
  'jegyezd be',
  'add hozza',
  'hozz letre feladatot',
  'hozz letre egy feladatot',
  'create task',
  'add task',
  'schedule',
  'remind me',
  'reminder',
];

const NOTE_TRIGGERS = ['jegyzet', 'note', 'keszits jegyzetet', 'hozz letre jegyzetet'];
const GOAL_TRIGGERS = ['goal', 'cel', 'hozz letre celt', 'uj cel'];
const EXPENSE_TRIGGERS = ['expense', 'kiadas', 'koltes', 'elkoltottem', 'paid'];
const INCOME_TRIGGERS = ['income', 'bevetel', 'kerestem', 'received'];

type DetectedAction = {
  action: AssistantAction;
  index: number;
};

const normalizeText = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const pad2 = (value: number): string => String(value).padStart(2, '0');

const toLocalIso = (date: Date): string =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;

const hasTrigger = (normalizedText: string, triggers: string[]): boolean =>
  triggers.some((trigger) => normalizedText.includes(trigger));

const getFirstTriggerIndex = (normalizedText: string, triggers: string[]): number => {
  const indexes = triggers
    .map((trigger) => normalizedText.indexOf(trigger))
    .filter((index) => index >= 0);
  return indexes.length > 0 ? Math.min(...indexes) : -1;
};

const parseTime = (normalizedText: string): { hours: number; minutes: number } | null => {
  const explicit = normalizedText.match(/\b(\d{1,2})[:.](\d{2})\b/);
  if (explicit) {
    return {
      hours: Number(explicit[1]),
      minutes: Number(explicit[2]),
    };
  }

  const hourly = normalizedText.match(/\b(\d{1,2})\s*(?:orara|orakor|ora|h)\b/);
  if (!hourly) return null;

  let hours = Number(hourly[1]);
  if ((normalizedText.includes('delutan') || normalizedText.includes('afternoon') || normalizedText.includes('evening')) && hours < 12) {
    hours += 12;
  }
  if (normalizedText.includes('ejjel') && hours < 12) {
    hours = (hours + 12) % 24;
  }

  return { hours, minutes: 0 };
};

const parseDate = (normalizedText: string, now: Date): Date | null => {
  const fullDate = normalizedText.match(/\b(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})\b/);
  if (fullDate) {
    return new Date(
      Number(fullDate[1]),
      Number(fullDate[2]) - 1,
      Number(fullDate[3]),
      9,
      0,
      0,
      0,
    );
  }

  const shortDate = normalizedText.match(/\b(\d{1,2})[.\-/](\d{1,2})(?:[.\-/](\d{4}))?\b/);
  if (shortDate) {
    const day = Number(shortDate[1]);
    const month = Number(shortDate[2]) - 1;
    const year = shortDate[3] ? Number(shortDate[3]) : now.getFullYear();
    if (day <= 31 && month >= 0 && month < 12) {
      return new Date(year, month, day, 9, 0, 0, 0);
    }
  }

  if (normalizedText.includes('holnap') || normalizedText.includes('tomorrow')) {
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    return tomorrow;
  }

  if (
    normalizedText === 'ma'
    || normalizedText.includes('ma ')
    || normalizedText.includes('today')
    || Boolean(parseTime(normalizedText))
  ) {
    const today = new Date(now);
    today.setHours(9, 0, 0, 0);
    return today;
  }

  return null;
};

const withParsedTime = (date: Date | null, normalizedText: string, now: Date): Date | null => {
  const base = date ? new Date(date) : null;
  const time = parseTime(normalizedText);

  if (!base && !time) return null;

  const result = base ?? new Date(now);
  if (time) {
    result.setHours(time.hours, time.minutes, 0, 0);
  }

  return result;
};

const cleanTitle = (value: string): string =>
  value
    .replace(/^[\s:,-]+/, '')
    .replace(/[.?!]+$/, '')
    .trim();

const extractTaskTitle = (rawText: string): string => {
  const normalizedText = normalizeText(rawText);
  const howMatch = normalizedText.match(/\bhogy\s+(.+)$/);
  if (howMatch) {
    const start = normalizedText.indexOf(howMatch[1]);
    return cleanTitle(rawText.slice(start));
  }

  const rawTriggerMatch = rawText.match(
    /\b(?:írd be|ird be|írd fel|ird fel|jegyezd fel|jegyezd be|add hozzá|add hozza|hozz létre feladatot|hozz letre feladatot|create task|add task|schedule|remind me(?: to)?)\b(.+)$/i,
  );
  if (rawTriggerMatch) {
    return cleanTitle(rawTriggerMatch[1]);
  }

  return stripCommandPrefixes(rawText, [
    /\b(?:írd be|ird be|írd fel|ird fel|jegyezd fel|jegyezd be|add hozzá|add hozza)\b/gi,
    /hozz\s+l[ée]tre\s+feladatot/gi,
    /\b(?:create task|add task|schedule|remind me(?: to)?)\b/gi,
  ]);
};

const stripCommandPrefixes = (rawText: string, patterns: RegExp[]): string => {
  let cleaned = rawText;
  patterns.forEach((pattern) => {
    cleaned = cleaned.replace(pattern, '');
  });
  return cleanTitle(cleaned);
};

const parseAmount = (normalizedText: string): { amount: number; currency: string } | null => {
  const explicitAfter = normalizedText.match(/(\d+(?:[.,]\d{1,2})?)\s*(huf|ft|forint|eur|euro|usd|dollar|gbp|pound|ron|lei|€|\$)\b/);
  const explicitBefore = normalizedText.match(/(€|\$)\s*(\d+(?:[.,]\d{1,2})?)/);

  const getCurrency = (token: string): string => {
    if (/(huf|ft|forint)/.test(token)) return 'HUF';
    if (/(eur|euro|€)/.test(token)) return 'EUR';
    if (/(usd|dollar|\$)/.test(token)) return 'USD';
    if (/(gbp|pound)/.test(token)) return 'GBP';
    if (/(ron|lei)/.test(token)) return 'RON';
    return 'USD';
  };

  if (explicitAfter) {
    const amount = Number(explicitAfter[1].replace(',', '.'));
    if (Number.isFinite(amount)) {
      return { amount, currency: getCurrency(explicitAfter[2]) };
    }
  }

  if (explicitBefore) {
    const amount = Number(explicitBefore[2].replace(',', '.'));
    if (Number.isFinite(amount)) {
      return { amount, currency: getCurrency(explicitBefore[1]) };
    }
  }

  const numbers = Array.from(normalizedText.matchAll(/\d+(?:[.,]\d{1,2})?/g))
    .map((match) => Number(match[0].replace(',', '.')))
    .filter((value) => Number.isFinite(value));

  if (numbers.length === 0) return null;
  return { amount: numbers[numbers.length - 1], currency: 'USD' };
};

const detectNavigation = (normalizedText: string): DetectedAction | null => {
  const navigationIntent = ['open', 'go to', 'navigate', 'show', 'switch to', 'nyisd', 'menj', 'valts', 'mutasd']
    .some((trigger) => normalizedText.includes(trigger));
  if (!navigationIntent) return null;

  const match = NAV_TARGETS.find((entry) => entry.aliases.some((alias) => normalizedText.includes(alias)));
  if (!match) return null;

  return {
    index: getFirstTriggerIndex(normalizedText, ['open', 'go to', 'navigate', 'show', 'switch to', 'nyisd', 'menj', 'valts', 'mutasd']),
    action: {
      type: 'navigation',
      target: match.target,
    },
  };
};

const detectTransaction = (rawText: string): DetectedAction | null => {
  const normalizedText = normalizeText(rawText);
  const looksFinancial = hasTrigger(normalizedText, EXPENSE_TRIGGERS) || hasTrigger(normalizedText, INCOME_TRIGGERS);
  if (!looksFinancial) return null;

  const parsedAmount = parseAmount(normalizedText);
  if (!parsedAmount) return null;

  const type = hasTrigger(normalizedText, INCOME_TRIGGERS) ? 'income' : 'expense';
  const cleaned = stripCommandPrefixes(
    rawText
      .replace(/\d+(?:[.,]\d{1,2})?/g, '')
      .replace(/[€$]/g, ''),
    [
      /\b(?:expense|income|kiadas|koltes|elkoltottem|bevetel|paid|received)\b/gi,
      /\b(?:huf|ft|forint|eur|euro|usd|dollar|gbp|pound|ron|lei)\b/gi,
    ],
  );

  return {
    index: getFirstTriggerIndex(normalizedText, [...EXPENSE_TRIGGERS, ...INCOME_TRIGGERS]),
    action: {
      type: 'create_transaction',
      data: {
        amount: parsedAmount.amount,
        currency: parsedAmount.currency,
        type,
        description: cleaned || (type === 'income' ? 'Assistant income entry' : 'Assistant expense entry'),
        category: type === 'income' ? 'Income' : 'General',
      },
    },
  };
};

const detectNote = (rawText: string): DetectedAction | null => {
  const normalizedText = normalizeText(rawText);
  if (!hasTrigger(normalizedText, NOTE_TRIGGERS)) return null;

  const content = stripCommandPrefixes(
    rawText,
    [
      /\b(?:jegyzet|note)\b/gi,
      /k[ée]sz[íi]ts\s+jegyzetet/gi,
      /hozz\s+l[ée]tre\s+jegyzetet/gi,
    ],
  );
  if (!content) return null;

  return {
    index: getFirstTriggerIndex(normalizedText, NOTE_TRIGGERS),
    action: {
      type: 'create_note',
      data: {
        title: content.length > 48 ? `${content.slice(0, 45).trim()}...` : content,
        content,
      },
    },
  };
};

const detectGoal = (rawText: string): DetectedAction | null => {
  const normalizedText = normalizeText(rawText);
  if (!hasTrigger(normalizedText, GOAL_TRIGGERS)) return null;

  const title = stripCommandPrefixes(
    rawText,
    [
      /\b(?:goal|c[ée]l|cel)\b/gi,
      /hozz\s+l[ée]tre\s+c[ée]lt/gi,
      /[úu]j\s+c[ée]l/gi,
    ],
  );
  if (!title) return null;

  return {
    index: getFirstTriggerIndex(normalizedText, GOAL_TRIGGERS),
    action: {
      type: 'create_goal',
      data: {
        title,
        description: '',
        priority: 'medium',
      },
    },
  };
};

const detectTask = (rawText: string, now: Date): DetectedAction | null => {
  const normalizedText = normalizeText(rawText);
  if (!hasTrigger(normalizedText, TASK_TRIGGERS)) return null;

  const title = extractTaskTitle(rawText);
  if (!title) return null;

  const scheduledDate = withParsedTime(parseDate(normalizedText, now), normalizedText, now);
  return {
    index: getFirstTriggerIndex(normalizedText, TASK_TRIGGERS),
    action: {
      type: 'create_task',
      data: {
        title,
        description: '',
        date: scheduledDate ? toLocalIso(scheduledDate) : undefined,
        priority: 'medium',
      },
    },
  };
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const coerceAction = (value: unknown): AssistantAction | null => {
  if (!isPlainObject(value) || typeof value.type !== 'string') return null;

  if (value.type === 'schedule_pending') {
    return { type: 'schedule_pending' };
  }

  if (value.type === 'navigation' && typeof value.target === 'string') {
    return { type: 'navigation', target: value.target as ViewType | 'stats' };
  }

  if (value.type === 'toggle_theme') {
    const target = value.target === 'light' || value.target === 'dark' ? value.target : undefined;
    return { type: 'toggle_theme', target };
  }

  if (value.type === 'pomodoro') {
    return {
      type: 'pomodoro',
      target: typeof value.target === 'string' ? value.target : undefined,
    };
  }

  if (!isPlainObject(value.data)) return null;

  if (value.type === 'create_task' && typeof value.data.title === 'string') {
    return {
      type: 'create_task',
      data: {
        title: value.data.title,
        description: typeof value.data.description === 'string' ? value.data.description : undefined,
        date: typeof value.data.date === 'string' ? value.data.date : undefined,
        priority: value.data.priority === 'low' || value.data.priority === 'medium' || value.data.priority === 'high'
          ? value.data.priority
          : undefined,
      },
    };
  }

  if (value.type === 'create_note') {
    const title = typeof value.data.title === 'string' ? value.data.title : 'Assistant note';
    const content = typeof value.data.content === 'string' ? value.data.content : '';
    if (!content.trim()) return null;
    return {
      type: 'create_note',
      data: {
        title,
        content,
      },
    };
  }

  if (value.type === 'create_goal' && typeof value.data.title === 'string') {
    return {
      type: 'create_goal',
      data: {
        title: value.data.title,
        description: typeof value.data.description === 'string' ? value.data.description : undefined,
        targetDate: typeof value.data.targetDate === 'string' ? value.data.targetDate : undefined,
        priority: value.data.priority === 'low' || value.data.priority === 'medium' || value.data.priority === 'high'
          ? value.data.priority
          : undefined,
      },
    };
  }

  if (value.type === 'create_transaction') {
    const amount = typeof value.data.amount === 'number'
      ? value.data.amount
      : typeof value.data.amount === 'string'
        ? Number(value.data.amount)
        : Number.NaN;

    if (!Number.isFinite(amount)) return null;

    return {
      type: 'create_transaction',
      data: {
        amount,
        currency: typeof value.data.currency === 'string' ? value.data.currency : undefined,
        category: typeof value.data.category === 'string' ? value.data.category : undefined,
        description: typeof value.data.description === 'string' ? value.data.description : undefined,
        type: value.data.type === 'income' || value.data.type === 'expense' ? value.data.type : undefined,
      },
    };
  }

  if (value.type === 'create_payable' && typeof value.data.description === 'string') {
    const amount = typeof value.data.amount === 'number'
      ? value.data.amount
      : typeof value.data.amount === 'string'
        ? Number(value.data.amount)
        : Number.NaN;
    if (!Number.isFinite(amount) || (value.data.kind !== 'bill' && value.data.kind !== 'subscription')) return null;

    return {
      type: 'create_payable',
      data: {
        description: value.data.description,
        amount,
        currency: typeof value.data.currency === 'string' ? value.data.currency : undefined,
        category: typeof value.data.category === 'string' ? value.data.category : undefined,
        payee: typeof value.data.payee === 'string' ? value.data.payee : undefined,
        dueDate: typeof value.data.dueDate === 'string' ? value.data.dueDate : undefined,
        kind: value.data.kind,
        autoPay: typeof value.data.autoPay === 'boolean' ? value.data.autoPay : undefined,
        period: value.data.period === 'daily'
          || value.data.period === 'weekly'
          || value.data.period === 'monthly'
          || value.data.period === 'yearly'
          ? value.data.period
          : undefined,
      },
    };
  }

  if (value.type === 'complete_task' && typeof value.data.title === 'string') {
    return { type: 'complete_task', data: { title: value.data.title } };
  }

  if (value.type === 'update_goal_progress' && typeof value.data.title === 'string') {
    const progress = typeof value.data.progress === 'number'
      ? value.data.progress
      : Number(value.data.progress);
    if (!Number.isFinite(progress)) return null;
    return {
      type: 'update_goal_progress',
      data: { title: value.data.title, progress: Math.max(0, Math.min(100, progress)) },
    };
  }

  if (value.type === 'mark_payable_paid' && typeof value.data.description === 'string') {
    return { type: 'mark_payable_paid', data: { description: value.data.description } };
  }

  return null;
};

export const buildAssistantPlanningPrompt = ({
  currentLanguage,
  currentView,
  now,
  snapshot,
}: {
  currentLanguage: string;
  currentView: string;
  now: Date;
  snapshot: string;
}): string => `You are an action planner for a productivity app.
Current UI language: ${currentLanguage}
Current app view: ${currentView}
Current local datetime: ${toLocalIso(now)}

Your job is to convert the user's latest message into STRICT JSON only.
Do not use markdown.
Do not use code fences.
Do not include citations, references, or source markers.
Do not invent completed actions unless they are in the actions array.

Supported actions:
- navigation -> target: daily|weekly|monthly|yearly|notes|goals|drawing|budget|invoicing|statistics|habits|integrations|settings|pomodoro|stats
- create_task -> data: { title, description?, date?, priority? } where date is local ISO like 2026-04-04T13:00
- create_note -> data: { title, content }
- create_goal -> data: { title, description?, targetDate?, priority? }
- create_transaction -> data: { amount, currency?, category?, description?, type? }
- create_payable -> data: { description, amount, kind: bill|subscription, currency?, category?, payee?, dueDate?, autoPay?, period? }
- complete_task -> data: { title } (match a task from the snapshot)
- update_goal_progress -> data: { title, progress } where progress is 0..100
- mark_payable_paid -> data: { description } (match an unpaid bill or subscription from the snapshot)
- schedule_pending
- toggle_theme -> target: light|dark
- pomodoro -> target?: start|pause|resume|stop

If the user asks for multiple operations, include multiple actions in order.
If the user is just chatting or asking for analysis, return actions as [].
If the request is too ambiguous to execute safely, ask one short clarification in reply and return actions as [].
Never create, update, or mark an item unless the user explicitly asks for that change.
For updates, copy the existing title or description exactly from the snapshot.

Return exactly this JSON shape:
{
  "reply": "short user-facing answer in the same language as the user",
  "actions": []
}

Live snapshot:
${snapshot}`;

export const extractAssistantPlan = (rawText: string): AssistantPlan | null => {
  const trimmed = rawText.trim();
  const withoutFence = trimmed.replace(/^```json\s*|^```\s*|```$/gim, '').trim();
  const start = withoutFence.indexOf('{');
  const end = withoutFence.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;

  try {
    const parsed = JSON.parse(withoutFence.slice(start, end + 1)) as unknown;
    if (!isPlainObject(parsed)) return null;

    const actions = Array.isArray(parsed.actions)
      ? parsed.actions.map(coerceAction).filter((action): action is AssistantAction => action !== null)
      : [];

    return {
      reply: typeof parsed.reply === 'string' ? parsed.reply.trim() : '',
      actions,
    };
  } catch {
    return null;
  }
};

export const inferLocalAssistantPlan = (rawText: string, now: Date): AssistantPlan | null => {
  const normalizedText = normalizeText(rawText);
  if (!normalizedText) return null;

  const detected: DetectedAction[] = [
    detectNavigation(normalizedText),
    detectTask(rawText, now),
    detectNote(rawText),
    detectGoal(rawText),
    detectTransaction(rawText),
  ].filter((item): item is DetectedAction => item !== null);

  if (detected.length === 0) return null;

  const uniqueActions = detected
    .sort((left, right) => left.index - right.index)
    .filter((item, index, array) =>
      array.findIndex((candidate) => JSON.stringify(candidate.action) === JSON.stringify(item.action)) === index,
    )
    .map((item) => item.action);

  return {
    reply: '',
    actions: uniqueActions,
  };
};
