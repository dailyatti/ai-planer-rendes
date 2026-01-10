// ProjectWorkflowLabPro.tsx
// ✅ ONE-FILE DROP-IN (PhD-grade) – Mind-map / workflow editor with:
// - Templates (Whop launch default)
// - Pan/Zoom (cursor-centered) + Fit + Reset
// - Drag nodes (commit-on-drop) + Connector-drag edges + Click-to-link mode
// - Undo/Redo (Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y)
// - Soft delete + Trash restore + Purge
// - Export/Import JSON (schemaVersion=1) + sanitize on import
// - Minimap
// - Auto-layout (simple DAG-ish)
// - Multi-language node titles/descriptions (HU/EN/DE + any)
// - Works standalone via localStorage (NO DataContext edits needed)
//
// If you DO have a DataContext you want to use later, you can replace the localStorage section easily.
// -------------------------------------------------------------------

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
    Plus,
    Trash2,
    Download,
    Upload,
    Search,
    RotateCcw,
    RotateCw,
    Link2,
    LayoutGrid,
    FolderPlus,
    CheckCircle2,
    AlertTriangle,
    Undo2,
    CheckSquare,
    Flag,
    GitBranch,
    Globe,
    Video,
    Megaphone,
    StickyNote,
} from "lucide-react";

// Optional: if you have this context, keep it.
// If not, remove these two lines and the useLanguage usage below,
// and replace t(...) with the fallbackT(...) helper.
import { useLanguage } from "../../contexts/LanguageContext";
import styles from "./WorkflowCanvas.module.css";

/* =========================
   Types
========================= */

type LangCode = "hu" | "en" | "de" | (string & {});
type WorkflowStatus = "todo" | "doing" | "blocked" | "done";
type WorkflowPriority = "low" | "medium" | "high";
type WorkflowNodeType = 'task' | 'step' | 'milestone' | 'decision' | 'platform' | 'media' | 'promotion' | 'note' | 'resource';
type I18nText = Record<string, string>;

type WorkflowChecklistItem = { id: string; text: string; done: boolean };
type WorkflowLink = { id: string; label: string; url: string };

type WorkflowNode = {
    id: string;
    type: WorkflowNodeType;
    position: { x: number; y: number };

    title: I18nText;
    description?: I18nText;

    status: WorkflowStatus;
    priority: WorkflowPriority;

    dueDateISO?: string;
    tags?: string[];

    checklist?: WorkflowChecklistItem[];
    links?: WorkflowLink[];

    createdAt: number;
    updatedAt: number;

    isDeleted?: boolean;
    deletedAt?: number;

    // Nesting / Grouping (n8n style)
    parentId?: string;
    isGroup?: boolean;
    groupW?: number;
    groupH?: number;
    collapsed?: boolean;
    groupColor?: string;
};

type WorkflowEdge = {
    id: string;
    from: string;
    to: string;
    label?: I18nText;
    createdAt: number;
    updatedAt?: number;
};

type ProjectWorkflow = {
    id: string;
    name: string;
    description?: string;
    language: LangCode;
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
    createdAt: number;
    updatedAt: number;
    templateId?: string;
    meta?: Record<string, unknown>;
};

type WorkflowTemplateCategory = "product" | "content" | "affiliate" | "saas" | "custom";

type WorkflowTemplate = {
    id: string;
    name: I18nText;
    description?: I18nText;
    category: WorkflowTemplateCategory;
    version: number;

    nodes: Array<Omit<WorkflowNode, "id" | "createdAt" | "updatedAt">>;
    edges: Array<{ fromIndex: number; toIndex: number; label?: I18nText }>;

    createdAt: number;
    updatedAt: number;
};

type WorkflowExportPayloadV1 = {
    schemaVersion: 1;
    exportedAt: number;
    projectWorkflows: ProjectWorkflow[];
    workflowTemplates: WorkflowTemplate[];
};

type Viewport = { x: number; y: number; zoom: number };

/* =========================
   Constants / Helpers
========================= */

const WORKFLOW_SCHEMA_VERSION = 1 as const;

const LS_KEY_WF = "planner_projectWorkflows_v1";
const LS_KEY_TPL = "planner_workflowTemplates_v1";

const NODE_W = 192; // 12rem
const NODE_H = 56;  // 3.5rem

const uid = () => Math.random().toString(36).slice(2, 10) + "_" + Date.now().toString(36);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

function safeText(map: I18nText | undefined, lang: LangCode, fallback = ""): string {
    if (!map) return fallback;
    return map[lang] ?? map["en"] ?? map["hu"] ?? Object.values(map)[0] ?? fallback;
}
function setLangText(prev: I18nText | undefined, lang: LangCode, value: string): I18nText {
    return { ...(prev ?? {}), [lang]: value };
}

function fallbackT(key: string, fallback: string) {
    return fallback;
}

// debounced callback
function useDebouncedCallback<T extends (...args: any[]) => void>(fn: T, delay = 280) {
    const timer = useRef<number | null>(null);
    const latest = useRef(fn);
    latest.current = fn;

    return useCallback(
        (...args: Parameters<T>) => {
            if (timer.current) window.clearTimeout(timer.current);
            timer.current = window.setTimeout(() => latest.current(...args), delay);
        },
        [delay]
    );
}

function worldToScreen(p: { x: number; y: number }, vp: Viewport) {
    return { x: vp.x + p.x * vp.zoom, y: vp.y + p.y * vp.zoom };
}
function screenToWorld(p: { x: number; y: number }, rect: DOMRect, vp: Viewport) {
    return {
        x: (p.x - rect.left - vp.x) / vp.zoom,
        y: (p.y - rect.top - vp.y) / vp.zoom,
    };
}
function edgePath(from: { x: number; y: number }, to: { x: number; y: number }) {
    const dx = Math.max(80, Math.abs(to.x - from.x) * 0.5);
    const c1 = { x: from.x + dx, y: from.y };
    const c2 = { x: to.x - dx, y: to.y };
    return `M ${from.x} ${from.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${to.x} ${to.y}`;
}
function nodeAnchorRight(n: WorkflowNode) {
    return { x: n.position.x + NODE_W, y: n.position.y + NODE_H / 2 };
}
function nodeAnchorLeft(n: WorkflowNode) {
    return { x: n.position.x, y: n.position.y + NODE_H / 2 };
}
function computeBounds(nodes: WorkflowNode[]) {
    if (!nodes.length) return { minX: 0, minY: 0, maxX: 1000, maxY: 600 };
    let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;
    for (const n of nodes) {
        minX = Math.min(minX, n.position.x);
        minY = Math.min(minY, n.position.y);
        maxX = Math.max(maxX, n.position.x + NODE_W);
        maxY = Math.max(maxY, n.position.y + NODE_H);
    }
    return { minX, minY, maxX, maxY };
}

function cloneWorkflow(wf: ProjectWorkflow): ProjectWorkflow {
    return {
        ...wf,
        nodes: wf.nodes.map((n) => ({
            ...n,
            position: { ...n.position },
            title: { ...n.title },
            description: n.description ? { ...n.description } : undefined,
            checklist: n.checklist?.map((c) => ({ ...c })) ?? undefined,
            links: n.links?.map((l) => ({ ...l })) ?? undefined,
            tags: n.tags ? [...n.tags] : undefined,
        })),
        edges: wf.edges.map((e) => ({ ...e, label: e.label ? { ...e.label } : undefined })),
    };
}

/* =========================
   Default Templates
========================= */

const DEFAULT_WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
    {
        id: "tpl_whop_launch_v1",
        name: {
            hu: "Whop Launch – Standard Funnel",
            en: "Whop Launch – Standard Funnel",
            de: "Whop Launch – Standard Funnel",
        },
        description: {
            hu: "Whop → TikTok + Facebook → videó pipeline → hirdetés + iteráció",
            en: "Whop → TikTok + Facebook → video pipeline → ads + iteration",
            de: "Whop → TikTok + Facebook → Video-Pipeline → Ads + Iteration",
        },
        category: "product",
        version: 1,
        nodes: [
            {
                type: "milestone",
                position: { x: 80, y: 120 },
                title: { hu: "Projekt cél + offer", en: "Goal + Offer", de: "Ziel + Angebot" },
                description: {
                    hu: "ICP, ígéret, pricing, upsell.",
                    en: "ICP, promise, pricing, upsell.",
                    de: "ICP, Versprechen, Preis, Upsell.",
                },
                status: "todo",
                priority: "high",
                checklist: [
                    { id: "c1", text: "ICP / célközönség", done: false },
                    { id: "c2", text: "Offer / pricing / upsell", done: false },
                ],
                links: [],
                tags: ["strategy"],
                isDeleted: false,
                deletedAt: undefined,
                dueDateISO: undefined,
            },
            {
                type: "step",
                position: { x: 440, y: 120 },
                title: { hu: "Whop termék setup", en: "Whop Product Setup", de: "Whop Produkt-Setup" },
                description: {
                    hu: "Termékoldal, copy, benefits, FAQ, checkout.",
                    en: "Page, copy, benefits, FAQ, checkout.",
                    de: "Seite, Copy, Benefits, FAQ, Checkout.",
                },
                status: "todo",
                priority: "high",
                checklist: [
                    { id: "c1", text: "Termék oldal", done: false },
                    { id: "c2", text: "Checkout / árak", done: false },
                    { id: "c3", text: "FAQ", done: false },
                ],
                links: [],
                tags: ["whop"],
                isDeleted: false,
            },
            {
                type: "step",
                position: { x: 820, y: 60 },
                title: { hu: "TikTok oldal", en: "TikTok Page", de: "TikTok Seite" },
                description: { hu: "Bio, link, brand, pinned videók.", en: "Bio, link, brand, pinned videos.", de: "Bio, Link, Brand, Pinned Videos." },
                status: "todo",
                priority: "medium",
                checklist: [{ id: "c1", text: "Bio + link", done: false }],
                links: [],
                tags: ["tiktok"],
                isDeleted: false,
            },
            {
                type: "step",
                position: { x: 820, y: 190 },
                title: { hu: "Facebook oldal", en: "Facebook Page", de: "Facebook Seite" },
                description: { hu: "Oldal + alap tracking/pixel.", en: "Page + tracking basics/pixel.", de: "Seite + Tracking Basics/Pixel." },
                status: "todo",
                priority: "medium",
                checklist: [{ id: "c1", text: "Oldal + linkek", done: false }],
                links: [],
                tags: ["facebook"],
                isDeleted: false,
            },
            {
                type: "step",
                position: { x: 1200, y: 120 },
                title: { hu: "Videó pipeline", en: "Video Pipeline", de: "Video Pipeline" },
                description: { hu: "10–20 sablon + batch gyártás + schedule.", en: "10–20 templates + batch + schedule.", de: "10–20 Vorlagen + Batch + Schedule." },
                status: "todo",
                priority: "high",
                checklist: [
                    { id: "c1", text: "10 videó sablon", done: false },
                    { id: "c2", text: "Batch render", done: false },
                    { id: "c3", text: "Feltöltési schedule", done: false },
                ],
                links: [],
                tags: ["content"],
                isDeleted: false,
            },
            {
                type: "milestone",
                position: { x: 1580, y: 120 },
                title: { hu: "Hirdetés + iteráció", en: "Ads + Iteration", de: "Ads + Iteration" },
                description: { hu: "Teszt, CTR/CPA, kreatív rotáció, skálázás.", en: "Test, CTR/CPA, creative rotation, scale.", de: "Test, CTR/CPA, Creative Rotation, Scale." },
                status: "todo",
                priority: "high",
                checklist: [
                    { id: "c1", text: "Kreatív 3-5 variáns", done: false },
                    { id: "c2", text: "Teszt budget", done: false },
                    { id: "c3", text: "Iteráció", done: false },
                ],
                links: [],
                tags: ["ads"],
                isDeleted: false,
            },
        ],
        edges: [
            { fromIndex: 0, toIndex: 1 },
            { fromIndex: 1, toIndex: 2 },
            { fromIndex: 1, toIndex: 3 },
            { fromIndex: 2, toIndex: 4 },
            { fromIndex: 3, toIndex: 4 },
            { fromIndex: 4, toIndex: 5 },
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
    },
];

/* =========================
   Import/Export + Sanitizers
========================= */

function isObj(x: unknown): x is Record<string, any> {
    return typeof x === "object" && x !== null;
}
function asString(x: any, fallback = ""): string {
    return typeof x === "string" ? x : fallback;
}
function asNumber(x: any, fallback = 0): number {
    return typeof x === "number" && Number.isFinite(x) ? x : fallback;
}
function asBool(x: any, fallback = false): boolean {
    return typeof x === "boolean" ? x : fallback;
}
function asI18nText(x: any, fallback: I18nText): I18nText {
    if (!isObj(x)) return fallback;
    const out: I18nText = {};
    for (const [k, v] of Object.entries(x)) {
        if (typeof v === "string" && v.trim().length) out[k] = v;
    }
    return Object.keys(out).length ? out : fallback;
}
function dedupeById<T extends { id: string }>(arr: T[]): T[] {
    const map = new Map<string, T>();
    for (const item of arr) map.set(item.id, item);
    return Array.from(map.values());
}

function sanitizeNode(raw: any): WorkflowNode | null {
    if (!isObj(raw)) return null;
    const id = asString(raw.id);
    if (!id) return null;

    const type: WorkflowNodeType = (["step", "milestone", "resource"] as const).includes(raw.type) ? raw.type : "step";
    const px = isObj(raw.position) ? asNumber(raw.position.x, 0) : 0;
    const py = isObj(raw.position) ? asNumber(raw.position.y, 0) : 0;

    const title = asI18nText(raw.title, { en: "Untitled" });
    const status: WorkflowStatus = (["todo", "doing", "blocked", "done"] as const).includes(raw.status) ? raw.status : "todo";
    const priority: WorkflowPriority = (["low", "medium", "high"] as const).includes(raw.priority) ? raw.priority : "medium";

    const checklist = Array.isArray(raw.checklist)
        ? raw.checklist
            .filter(isObj)
            .map((c: any) => ({ id: asString(c.id) || uid(), text: asString(c.text, ""), done: asBool(c.done, false) }))
            .filter((c: any) => c.text.trim().length > 0)
        : undefined;

    const links = Array.isArray(raw.links)
        ? raw.links
            .filter(isObj)
            .map((l: any) => ({ id: asString(l.id) || uid(), label: asString(l.label, "link"), url: asString(l.url, "") }))
            .filter((l: any) => l.url.trim().length > 0)
        : undefined;

    return {
        id,
        type,
        position: { x: px, y: py },
        title,
        description: isObj(raw.description) ? asI18nText(raw.description, {}) : undefined,
        status,
        priority,
        dueDateISO: typeof raw.dueDateISO === "string" ? raw.dueDateISO : undefined,
        tags: Array.isArray(raw.tags) ? raw.tags.filter((t: any) => typeof t === "string") : undefined,
        checklist,
        links,
        createdAt: asNumber(raw.createdAt, Date.now()),
        updatedAt: asNumber(raw.updatedAt, Date.now()),
        isDeleted: asBool(raw.isDeleted, false),
        deletedAt: raw.deletedAt ? asNumber(raw.deletedAt, undefined as any) : undefined,
    };
}

function sanitizeEdge(raw: any): WorkflowEdge | null {
    if (!isObj(raw)) return null;
    const id = asString(raw.id);
    const from = asString(raw.from);
    const to = asString(raw.to);
    if (!id || !from || !to || from === to) return null;

    return {
        id,
        from,
        to,
        label: isObj(raw.label) ? asI18nText(raw.label, {}) : undefined,
        createdAt: asNumber(raw.createdAt, Date.now()),
        updatedAt: raw.updatedAt ? asNumber(raw.updatedAt, Date.now()) : undefined,
    };
}

function sanitizeWorkflow(raw: any): ProjectWorkflow | null {
    if (!isObj(raw)) return null;
    const id = asString(raw.id);
    if (!id) return null;

    const nodes = Array.isArray(raw.nodes) ? (raw.nodes.map(sanitizeNode).filter(Boolean) as WorkflowNode[]) : [];
    const edges = Array.isArray(raw.edges) ? (raw.edges.map(sanitizeEdge).filter(Boolean) as WorkflowEdge[]) : [];

    const nodeIds = new Set(nodes.map((n) => n.id));
    const cleanedEdges = edges.filter((e) => nodeIds.has(e.from) && nodeIds.has(e.to));

    return {
        id,
        name: asString(raw.name, "Project"),
        description: typeof raw.description === "string" ? raw.description : undefined,
        language: asString(raw.language, "en") as LangCode,
        nodes: dedupeById(nodes),
        edges: dedupeById(cleanedEdges),
        createdAt: asNumber(raw.createdAt, Date.now()),
        updatedAt: asNumber(raw.updatedAt, Date.now()),
        templateId: typeof raw.templateId === "string" ? raw.templateId : undefined,
        meta: isObj(raw.meta) ? raw.meta : undefined,
    };
}

function sanitizeTemplate(raw: any): WorkflowTemplate | null {
    if (!isObj(raw)) return null;
    const id = asString(raw.id);
    if (!id) return null;

    const category: WorkflowTemplateCategory = (["product", "content", "affiliate", "saas", "custom"] as const).includes(raw.category)
        ? raw.category
        : "custom";

    const version = asNumber(raw.version, 1);

    const nodes = Array.isArray(raw.nodes)
        ? raw.nodes
            .filter(isObj)
            .map((n: any) => ({
                type: (["step", "milestone", "resource"] as const).includes(n.type) ? n.type : "step",
                position: isObj(n.position) ? { x: asNumber(n.position.x, 0), y: asNumber(n.position.y, 0) } : { x: 0, y: 0 },
                title: asI18nText(n.title, { en: "Untitled" }),
                description: isObj(n.description) ? asI18nText(n.description, {}) : undefined,
                status: (["todo", "doing", "blocked", "done"] as const).includes(n.status) ? n.status : "todo",
                priority: (["low", "medium", "high"] as const).includes(n.priority) ? n.priority : "medium",
                dueDateISO: typeof n.dueDateISO === "string" ? n.dueDateISO : undefined,
                tags: Array.isArray(n.tags) ? n.tags.filter((t: any) => typeof t === "string") : undefined,
                checklist: Array.isArray(n.checklist)
                    ? n.checklist.filter(isObj).map((c: any) => ({
                        id: asString(c.id) || uid(),
                        text: asString(c.text, ""),
                        done: asBool(c.done, false),
                    }))
                    : undefined,
                links: Array.isArray(n.links)
                    ? n.links.filter(isObj).map((l: any) => ({
                        id: asString(l.id) || uid(),
                        label: asString(l.label, "link"),
                        url: asString(l.url, ""),
                    }))
                    : undefined,
                isDeleted: false,
                deletedAt: undefined,
            }))
        : [];

    const edges = Array.isArray(raw.edges)
        ? raw.edges
            .filter(isObj)
            .map((e: any) => ({
                fromIndex: asNumber(e.fromIndex, 0),
                toIndex: asNumber(e.toIndex, 0),
                label: isObj(e.label) ? asI18nText(e.label, {}) : undefined,
            }))
            .filter((e) => e.fromIndex >= 0 && e.toIndex >= 0 && e.fromIndex !== e.toIndex)
        : [];

    return {
        id,
        name: asI18nText(raw.name, { en: "Template" }),
        description: isObj(raw.description) ? asI18nText(raw.description, {}) : undefined,
        category,
        version,
        nodes,
        edges,
        createdAt: asNumber(raw.createdAt, Date.now()),
        updatedAt: asNumber(raw.updatedAt, Date.now()),
    };
}

function exportPayloadV1(projectWorkflows: ProjectWorkflow[], workflowTemplates: WorkflowTemplate[]): WorkflowExportPayloadV1 {
    return {
        schemaVersion: WORKFLOW_SCHEMA_VERSION,
        exportedAt: Date.now(),
        projectWorkflows,
        workflowTemplates,
    };
}

function importPayloadAny(
    raw: any,
    existing: { projectWorkflows: ProjectWorkflow[]; workflowTemplates: WorkflowTemplate[] }
): { projectWorkflows: ProjectWorkflow[]; workflowTemplates: WorkflowTemplate[] } {
    if (isObj(raw) && raw.schemaVersion === 1) {
        const importedWf = Array.isArray(raw.projectWorkflows) ? (raw.projectWorkflows.map(sanitizeWorkflow).filter(Boolean) as ProjectWorkflow[]) : [];
        const importedTpl = Array.isArray(raw.workflowTemplates) ? (raw.workflowTemplates.map(sanitizeTemplate).filter(Boolean) as WorkflowTemplate[]) : [];

        const wfMap = new Map(existing.projectWorkflows.map((x) => [x.id, x] as const));
        for (const wf of importedWf) wfMap.set(wf.id, wf);

        const tplMap = new Map(existing.workflowTemplates.map((x) => [x.id, x] as const));
        for (const tpl of importedTpl) tplMap.set(tpl.id, tpl);

        return { projectWorkflows: Array.from(wfMap.values()), workflowTemplates: Array.from(tplMap.values()) };
    }

    const importedWf = Array.isArray(raw?.projectWorkflows) ? (raw.projectWorkflows.map(sanitizeWorkflow).filter(Boolean) as ProjectWorkflow[]) : [];
    const importedTpl = Array.isArray(raw?.workflowTemplates) ? (raw.workflowTemplates.map(sanitizeTemplate).filter(Boolean) as WorkflowTemplate[]) : [];

    return {
        projectWorkflows: importedWf.length ? importedWf : existing.projectWorkflows,
        workflowTemplates: importedTpl.length ? importedTpl : existing.workflowTemplates,
    };
}

/* =========================
   Create from template + Auto-layout
========================= */

function createWorkflowFromTemplate(tpl: WorkflowTemplate, lang: LangCode): ProjectWorkflow {
    const now = Date.now();
    const ids = tpl.nodes.map(() => uid());

    const nodes: WorkflowNode[] = tpl.nodes.map((n, idx) => ({
        ...n,
        id: ids[idx],
        createdAt: now,
        updatedAt: now,
        isDeleted: false,
    }));

    const edges: WorkflowEdge[] = tpl.edges.map((e) => ({
        id: uid(),
        from: ids[e.fromIndex],
        to: ids[e.toIndex],
        label: e.label,
        createdAt: now,
        updatedAt: now,
    }));

    return {
        id: uid(),
        name: safeText(tpl.name, lang, "New Project"),
        description: safeText(tpl.description, lang, ""),
        language: lang,
        nodes,
        edges,
        createdAt: now,
        updatedAt: now,
        templateId: tpl.id,
    };
}

function autoLayout(workflow: ProjectWorkflow): ProjectWorkflow {
    const now = Date.now();
    const nodes = workflow.nodes.filter((n) => !n.isDeleted);
    const edges = workflow.edges;

    const incoming = new Map<string, number>();
    const outgoing = new Map<string, string[]>();

    for (const n of nodes) {
        incoming.set(n.id, 0);
        outgoing.set(n.id, []);
    }

    for (const e of edges) {
        if (!incoming.has(e.to) || !outgoing.has(e.from)) continue;
        incoming.set(e.to, (incoming.get(e.to) ?? 0) + 1);
        outgoing.get(e.from)!.push(e.to);
    }

    // Kahn
    const q: string[] = [];
    for (const [id, deg] of incoming.entries()) if (deg === 0) q.push(id);

    const layers: string[][] = [];
    const layerIndex = new Map<string, number>();
    let current = q;
    let depth = 0;

    while (current.length) {
        layers.push(current);
        for (const id of current) layerIndex.set(id, depth);

        const next: string[] = [];
        for (const id of current) {
            for (const to of outgoing.get(id) ?? []) {
                incoming.set(to, (incoming.get(to) ?? 0) - 1);
                if ((incoming.get(to) ?? 0) === 0) next.push(to);
            }
        }
        current = next;
        depth++;
        if (depth > 2000) break;
    }

    const unplaced = nodes.map((n) => n.id).filter((id) => !layerIndex.has(id));
    if (unplaced.length) layers.push(unplaced);

    const colGap = 360;
    const rowGap = 120;
    const baseX = 80;
    const baseY = 90;

    const posMap = new Map<string, { x: number; y: number }>();
    for (let col = 0; col < layers.length; col++) {
        const ids = layers[col];
        for (let row = 0; row < ids.length; row++) {
            posMap.set(ids[row], { x: baseX + col * colGap, y: baseY + row * rowGap });
        }
    }

    const nextNodes = workflow.nodes.map((n) => {
        const p = posMap.get(n.id);
        if (!p) return n;
        return { ...n, position: p, updatedAt: now };
    });

    return { ...workflow, nodes: nextNodes, updatedAt: now };
}

/* =========================
   LocalStorage Store (Standalone)
========================= */

function loadJSON<T>(key: string, fallback: T): T {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return fallback;
        return JSON.parse(raw) as T;
    } catch {
        return fallback;
    }
}
function saveJSON(key: string, value: any) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // ignore
    }
}

/* =========================
   UI meta
========================= */

const STATUS_META: Record<WorkflowStatus, { key: string; badge: string; ring: string; gradient: string; glow: string }> = {
    todo: {
        key: "workflow.status.todo",
        badge: "bg-gradient-to-r from-gray-600/20 to-gray-500/20 text-gray-300",
        ring: "ring-gray-400/20",
        gradient: "from-gray-900/60 via-gray-800/40 to-gray-900/60",
        glow: "shadow-gray-900/50"
    },
    doing: {
        key: "workflow.status.doing",
        badge: "bg-gradient-to-r from-blue-500/30 to-cyan-500/30 text-blue-200",
        ring: "ring-blue-400/40",
        gradient: "from-blue-900/60 via-blue-800/40 to-cyan-900/60",
        glow: "shadow-blue-500/30"
    },
    blocked: {
        key: "workflow.status.blocked",
        badge: "bg-gradient-to-r from-amber-500/30 to-orange-500/30 text-amber-200",
        ring: "ring-amber-400/40",
        gradient: "from-amber-900/60 via-orange-800/40 to-amber-900/60",
        glow: "shadow-amber-500/30"
    },
    done: {
        key: "workflow.status.done",
        badge: "bg-gradient-to-r from-emerald-500/30 to-green-500/30 text-emerald-200",
        ring: "ring-emerald-400/40",
        gradient: "from-emerald-900/60 via-green-800/40 to-emerald-900/60",
        glow: "shadow-emerald-500/30"
    },
};

const PRIORITY_META: Record<WorkflowPriority, { key: string }> = {
    low: { key: "workflow.priority.low" },
    medium: { key: "workflow.priority.medium" },
    high: { key: "workflow.priority.high" },
};

/* =========================
   Component
========================= */

export default function ProjectWorkflowLabPro() {
    // If you have LanguageContext, use it; otherwise fallback.
    let t = fallbackT;
    let uiLang: LangCode = "hu";

    try {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const langCtx = useLanguage();
        // wrapper that tries langCtx, falls back to the provided fallback if key is returned
        t = (key: string, fallback: string) => {
            const val = langCtx.t(key);
            // If the translation returns the key itself, assume it's missing and use our fallback
            return val === key ? fallback : val;
        };
        uiLang = (langCtx.language as LangCode) ?? "hu";
    } catch {
        // no-op: using fallbackT + hu
    }

    // Standalone store
    const [projectWorkflows, setProjectWorkflows] = useState<ProjectWorkflow[]>(() => {
        const raw = loadJSON<any[]>(LS_KEY_WF, []);
        const sanitized = Array.isArray(raw) ? (raw.map(sanitizeWorkflow).filter(Boolean) as ProjectWorkflow[]) : [];
        return sanitized;
    });

    const [workflowTemplates, setWorkflowTemplates] = useState<WorkflowTemplate[]>(() => {
        const raw = loadJSON<any[]>(LS_KEY_TPL, []);
        const sanitized = Array.isArray(raw) ? (raw.map(sanitizeTemplate).filter(Boolean) as WorkflowTemplate[]) : [];
        return sanitized.length ? sanitized : DEFAULT_WORKFLOW_TEMPLATES;
    });

    useEffect(() => saveJSON(LS_KEY_WF, projectWorkflows), [projectWorkflows]);
    useEffect(() => saveJSON(LS_KEY_TPL, workflowTemplates), [workflowTemplates]);

    const [query, setQuery] = useState("");
    const [activeId, setActiveId] = useState<string | null>(projectWorkflows[0]?.id ?? null);

    const active = useMemo(() => projectWorkflows.find((p) => p.id === activeId) ?? null, [projectWorkflows, activeId]);

    const [draft, setDraft] = useState<ProjectWorkflow | null>(active ? cloneWorkflow(active) : null);

    useEffect(() => {
        setDraft(active ? cloneWorkflow(active) : null);
    }, [activeId]);

    useEffect(() => {
        if (!active) {
            setDraft(null);
            return;
        }
        setDraft(cloneWorkflow(active));
    }, [active?.updatedAt]);

    const stageRef = useRef<HTMLDivElement | null>(null);
    const [viewport, setViewport] = useState<Viewport>({ x: 60, y: 60, zoom: 1 });

    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

    const [linkFrom, setLinkFrom] = useState<string | null>(null);
    const [dragLink, setDragLink] = useState<{ fromId: string; toWorld: { x: number; y: number } } | null>(null);

    // Undo/Redo snapshot stacks
    const undo = useRef<{ wfId: string; workflow: ProjectWorkflow }[]>([]);
    const redo = useRef<{ wfId: string; workflow: ProjectWorkflow }[]>([]);

    const pushUndo = useCallback((wf: ProjectWorkflow) => {
        undo.current = [{ wfId: wf.id, workflow: cloneWorkflow(wf) }, ...undo.current].slice(0, 40);
        redo.current = [];
    }, []);

    const debouncedPersist = useDebouncedCallback((wf: ProjectWorkflow) => {
        setProjectWorkflows((prev) => prev.map((x) => (x.id === wf.id ? { ...wf, updatedAt: Date.now() } : x)));
    }, 320);

    const persistDraft = useCallback(
        (next: ProjectWorkflow, opts?: { immediate?: boolean; recordUndo?: boolean }) => {
            const immediate = opts?.immediate ?? false;
            const recordUndo = opts?.recordUndo ?? true;

            setDraft(next);
            if (recordUndo) pushUndo(next);

            if (immediate) {
                setProjectWorkflows((prev) => prev.map((x) => (x.id === next.id ? { ...next, updatedAt: Date.now() } : x)));
            } else {
                debouncedPersist({ ...next, updatedAt: Date.now() });
            }
        },
        [debouncedPersist, pushUndo]
    );

    const filteredProjects = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return projectWorkflows;
        return projectWorkflows.filter((p) => p.name.toLowerCase().includes(q));
    }, [projectWorkflows, query]);

    const visibleNodes = useMemo(() => (draft?.nodes ?? []).filter((n) => !n.isDeleted), [draft]);
    const visibleEdges = useMemo(() => {
        if (!draft) return [];
        const ids = new Set(visibleNodes.map((n) => n.id));
        return draft.edges.filter((e) => ids.has(e.from) && ids.has(e.to));
    }, [draft, visibleNodes]);

    const selectedNode = useMemo(() => draft?.nodes.find((n) => n.id === selectedNodeId) ?? null, [draft, selectedNodeId]);
    const selectedEdge = useMemo(() => draft?.edges.find((e) => e.id === selectedEdgeId) ?? null, [draft, selectedEdgeId]);

    const progress = useMemo(() => {
        const total = visibleNodes.length;
        const done = visibleNodes.filter((n) => n.status === "done").length;
        const pct = total ? Math.round((done / total) * 100) : 0;
        return { total, done, pct };
    }, [visibleNodes]);

    const deletedNodes = useMemo(() => (draft?.nodes ?? []).filter((n) => n.isDeleted), [draft]);

    const minimap = useMemo(() => {
        const b = computeBounds(visibleNodes);
        const w = Math.max(1, b.maxX - b.minX);
        const h = Math.max(1, b.maxY - b.minY);
        return { b, w, h };
    }, [visibleNodes]);

    const addProjectWorkflow = (wf: ProjectWorkflow) => {
        setProjectWorkflows((prev) => [wf, ...prev]);
    };

    const deleteProjectWorkflow = (id: string) => {
        setProjectWorkflows((prev) => prev.filter((x) => x.id !== id));
    };

    const createEmptyProject = () => {
        const now = Date.now();
        const wf: ProjectWorkflow = {
            id: uid(),
            name: t("workflow.newProject", "Új projekt"),
            description: "",
            language: uiLang,
            nodes: [],
            edges: [],
            createdAt: now,
            updatedAt: now,
        };
        addProjectWorkflow(wf);
        setActiveId(wf.id);
        setSelectedNodeId(null);
        setSelectedEdgeId(null);
        setViewport({ x: 60, y: 60, zoom: 1 });
    };

    const createFromTemplateAction = (tpl: WorkflowTemplate) => {
        const wf = createWorkflowFromTemplate(tpl, uiLang);
        addProjectWorkflow(wf);
        setActiveId(wf.id);
        setSelectedNodeId(null);
        setSelectedEdgeId(null);
        setViewport({ x: 60, y: 60, zoom: 1 });
    };

    const setLanguage = (lang: LangCode) => {
        if (!draft) return;
        persistDraft({ ...draft, language: lang, updatedAt: Date.now() }, { immediate: true, recordUndo: true });
    };

    const addNode = () => {
        if (!draft) return;
        const now = Date.now();
        const id = uid();
        const node: WorkflowNode = {
            id,
            type: "step",
            position: { x: 220, y: 160 },
            title: { [draft.language]: t("workflow.step.new", "Új lépés") },
            description: { [draft.language]: "" },
            status: "todo",
            priority: "medium",
            checklist: [],
            links: [],
            tags: [],
            createdAt: now,
            updatedAt: now,
            isDeleted: false,
        };
        const next = { ...draft, nodes: [node, ...draft.nodes], updatedAt: now };
        persistDraft(next, { immediate: false, recordUndo: true });
        setSelectedNodeId(id);
        setSelectedEdgeId(null);
    };

    const updateNode = (id: string, patch: Partial<WorkflowNode>) => {
        if (!draft) return;
        const now = Date.now();
        const nextNodes = draft.nodes.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: now } : n));
        persistDraft({ ...draft, nodes: nextNodes, updatedAt: now }, { immediate: false, recordUndo: true });
    };

    const updateEdge = (id: string, patch: Partial<WorkflowEdge>) => {
        if (!draft) return;
        const now = Date.now();
        const nextEdges = draft.edges.map((e) => (e.id === id ? { ...e, ...patch, updatedAt: now } : e));
        persistDraft({ ...draft, edges: nextEdges, updatedAt: now }, { immediate: false, recordUndo: true });
    };

    const softDeleteNode = (id: string) => {
        if (!draft) return;
        const now = Date.now();
        const nextNodes = draft.nodes.map((n) => (n.id === id ? { ...n, isDeleted: true, deletedAt: now, updatedAt: now } : n));
        const nextEdges = draft.edges.filter((e) => e.from !== id && e.to !== id);
        persistDraft({ ...draft, nodes: nextNodes, edges: nextEdges, updatedAt: now }, { immediate: false, recordUndo: true });
        if (selectedNodeId === id) setSelectedNodeId(null);
        if (linkFrom === id) setLinkFrom(null);
    };

    const restoreNode = (id: string) => {
        if (!draft) return;
        const now = Date.now();
        const nextNodes = draft.nodes.map((n) => (n.id === id ? { ...n, isDeleted: false, deletedAt: undefined, updatedAt: now } : n));
        persistDraft({ ...draft, nodes: nextNodes, updatedAt: now }, { immediate: false, recordUndo: true });
    };

    const purgeDeleted = () => {
        if (!draft) return;
        const now = Date.now();
        const alive = draft.nodes.filter((n) => !n.isDeleted);
        const aliveIds = new Set(alive.map((n) => n.id));
        const edges = draft.edges.filter((e) => aliveIds.has(e.from) && aliveIds.has(e.to));
        persistDraft({ ...draft, nodes: alive, edges, updatedAt: now }, { immediate: true, recordUndo: true });
    };

    const createEdge = (from: string, to: string) => {
        if (!draft || from === to) return;
        if (draft.edges.some((e) => e.from === from && e.to === to)) return;
        const now = Date.now();
        const edge: WorkflowEdge = { id: uid(), from, to, createdAt: now, updatedAt: now };
        persistDraft({ ...draft, edges: [edge, ...draft.edges], updatedAt: now }, { immediate: false, recordUndo: true });
    };

    const deleteEdge = (id: string) => {
        if (!draft) return;
        const now = Date.now();
        persistDraft({ ...draft, edges: draft.edges.filter((e) => e.id !== id), updatedAt: now }, { immediate: false, recordUndo: true });
        if (selectedEdgeId === id) setSelectedEdgeId(null);
    };

    const doAutoLayout = () => {
        if (!draft) return;
        const next = autoLayout(draft);
        persistDraft(next, { immediate: true, recordUndo: true });
    };

    const resetView = () => setViewport({ x: 60, y: 60, zoom: 1 });

    const fitToView = () => {
        if (!draft || !stageRef.current) return;
        const rect = stageRef.current.getBoundingClientRect();
        const nodes = visibleNodes;
        const b = computeBounds(nodes);
        const pad = 80;
        const w = Math.max(400, b.maxX - b.minX + pad * 2);
        const h = Math.max(260, b.maxY - b.minY + pad * 2);

        const zoom = clamp(Math.min(rect.width / w, rect.height / h), 0.35, 1.6);
        const x = rect.width / 2 - (b.minX + (b.maxX - b.minX) / 2) * zoom;
        const y = rect.height / 2 - (b.minY + (b.maxY - b.minY) / 2) * zoom;

        setViewport({ x, y, zoom });
    };

    const exportJSON = () => {
        const payload = exportPayloadV1(projectWorkflows, workflowTemplates);
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "workflows_export_v1.json";
        a.click();
        URL.revokeObjectURL(url);
    };

    const importJSONFile = async (file: File) => {
        const txt = await file.text();
        const raw = JSON.parse(txt);
        const merged = importPayloadAny(raw, { projectWorkflows, workflowTemplates });

        setProjectWorkflows(merged.projectWorkflows);
        setWorkflowTemplates(merged.workflowTemplates);

        // keep current open if possible
        if (activeId && merged.projectWorkflows.some((p) => p.id === activeId)) {
            // ok
        } else {
            setActiveId(merged.projectWorkflows[0]?.id ?? null);
        }
    };

    // Zoom (cursor-centered)
    const onWheel = (e: React.WheelEvent) => {
        if (!stageRef.current) return;
        e.preventDefault();
        const rect = stageRef.current.getBoundingClientRect();

        const zoomDelta = e.deltaY > 0 ? -0.1 : 0.1;
        const nextZoom = clamp(viewport.zoom * (1 + zoomDelta), 0.35, 2.2);

        const cx = e.clientX - rect.left;
        const cy = e.clientY - rect.top;

        const wx = (cx - viewport.x) / viewport.zoom;
        const wy = (cy - viewport.y) / viewport.zoom;

        const nextX = cx - wx * nextZoom;
        const nextY = cy - wy * nextZoom;

        setViewport({ x: nextX, y: nextY, zoom: nextZoom });
    };

    // Pan
    const startPan = (e: React.PointerEvent) => {
        if ((e.target as HTMLElement).dataset.role === "node") return;
        if ((e.target as HTMLElement).dataset.role === "connector") return;

        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        const start = { sx: e.clientX, sy: e.clientY, vx: viewport.x, vy: viewport.y };

        const move = (ev: PointerEvent) => {
            setViewport((v) => ({ ...v, x: start.vx + (ev.clientX - start.sx), y: start.vy + (ev.clientY - start.sy) }));
        };
        const up = () => {
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", up);
        };
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
    };

    // Node drag
    // Node drag
    const dragState = useRef<{ id: string; start: { x: number; y: number }; orig: { x: number; y: number }; childOrigs?: Record<string, { x: number; y: number }> } | null>(null);

    const onNodePointerDown = (e: React.PointerEvent, id: string) => {
        e.stopPropagation();
        setSelectedNodeId(id);
        setSelectedEdgeId(null);

        if (!draft || !stageRef.current) return;

        // link-mode click-to-connect
        if (linkFrom && linkFrom !== id) {
            createEdge(linkFrom, id);
            setLinkFrom(null);
            return;
        }

        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

        const rect = stageRef.current.getBoundingClientRect();
        const world = screenToWorld({ x: e.clientX, y: e.clientY }, rect, viewport);
        const node = draft.nodes.find((n) => n.id === id);
        if (!node) return;

        // Capture children positions if group
        const childOrigs: Record<string, { x: number; y: number }> = {};
        if (node.isGroup) {
            draft.nodes.filter((n) => n.parentId === id).forEach((child) => {
                childOrigs[child.id] = { ...child.position };
            });
        }

        dragState.current = { id, start: world, orig: { ...node.position }, childOrigs };

        const move = (ev: PointerEvent) => {
            if (!dragState.current || !stageRef.current) return;
            const rect2 = stageRef.current.getBoundingClientRect();
            const w2 = screenToWorld({ x: ev.clientX, y: ev.clientY }, rect2, viewport);

            const dx = w2.x - dragState.current.start.x;
            const dy = w2.y - dragState.current.start.y;

            // fast local update (no undo per move)
            setDraft((prev) => {
                if (!prev) return prev;
                const nextNodes = prev.nodes.map((n) => {
                    if (n.id === id) {
                        return { ...n, position: { x: dragState.current!.orig.x + dx, y: dragState.current!.orig.y + dy } };
                    }
                    // Move child if tracked
                    if (dragState.current?.childOrigs?.[n.id]) {
                        const orig = dragState.current.childOrigs[n.id];
                        return { ...n, position: { x: orig.x + dx, y: orig.y + dy } };
                    }
                    return n;
                });
                return { ...prev, nodes: nextNodes };
            });
        };

        const up = (ev: PointerEvent) => {
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", up);

            const st = dragState.current;
            dragState.current = null;
            if (!st || !stageRef.current) return;

            // Recalculate delta
            const rect2 = stageRef.current.getBoundingClientRect();
            const w2 = screenToWorld({ x: ev.clientX, y: ev.clientY }, rect2, viewport);
            const dx = w2.x - st.start.x;
            const dy = w2.y - st.start.y;

            setDraft((prev) => {
                if (!prev) return prev;
                const now = Date.now();

                // Check for nesting (drop on another node)
                const rect = stageRef.current!.getBoundingClientRect();
                const nodeRect = {
                    x: dragState.current!.orig.x + dx,
                    y: dragState.current!.orig.y + dy,
                    w: NODE_W,
                    h: NODE_H
                };

                // Simple collision detection for nesting (center point)
                const centerX = nodeRect.x + NODE_W / 2;
                const centerY = nodeRect.y + NODE_H / 2;

                let newParentId: string | undefined = undefined;

                // Find target node (excluding self and children)
                const targetNode = prev.nodes.find(n =>
                    n.id !== st.id &&
                    centerX >= n.position.x && centerX <= n.position.x + NODE_W &&
                    centerY >= n.position.y && centerY <= n.position.y + NODE_H &&
                    n.type !== 'note' // Don't nest into notes usually, unless group
                );

                if (targetNode) {
                    newParentId = targetNode.id;
                    // Optional: Auto-convert target to group if needed
                }

                const nextNodes = prev.nodes.map((n) => {
                    if (n.id === st.id) {
                        // Update position
                        let pos = { x: dragState.current!.orig.x + dx, y: dragState.current!.orig.y + dy };

                        // If we are nesting, we might want to adjust position relative to parent?
                        // For now, keep absolute position, but logic might need to render relative.
                        // The existing renderer uses absolute coordinates.

                        return { ...n, position: pos, inputTime: now, parentId: newParentId, updatedAt: now };
                    }
                    // If target node became a group, update it?
                    if (n.id === newParentId && !n.isGroup) {
                        // return { ...n, isGroup: true }; // logic to enable group visualization
                    }
                    return n;
                });

                const committed = { ...prev, nodes: nextNodes, updatedAt: now };
                persistDraft(committed, { immediate: false, recordUndo: true });
                return committed;
            });
        };

        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
    };

    // Drag connector (node -> cursor)
    const onConnectorDown = (e: React.PointerEvent, fromId: string) => {
        e.stopPropagation();
        if (!draft || !stageRef.current) return;

        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        setSelectedNodeId(fromId);
        setSelectedEdgeId(null);

        const rect = stageRef.current.getBoundingClientRect();
        const w = screenToWorld({ x: e.clientX, y: e.clientY }, rect, viewport);
        setDragLink({ fromId, toWorld: w });

        const move = (ev: PointerEvent) => {
            if (!stageRef.current) return;
            const rect2 = stageRef.current.getBoundingClientRect();
            const w2 = screenToWorld({ x: ev.clientX, y: ev.clientY }, rect2, viewport);
            setDragLink((prev) => (prev ? { ...prev, toWorld: w2 } : prev));
        };

        const up = (ev: PointerEvent) => {
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", up);

            const rect2 = stageRef.current!.getBoundingClientRect();
            const w2 = screenToWorld({ x: ev.clientX, y: ev.clientY }, rect2, viewport);

            const target = visibleNodes.find(
                (n) =>
                    w2.x >= n.position.x &&
                    w2.x <= n.position.x + NODE_W &&
                    w2.y >= n.position.y &&
                    w2.y <= n.position.y + NODE_H
            );

            setDragLink(null);
            if (target && target.id !== fromId) createEdge(fromId, target.id);
        };

        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
    };

    const onEdgeClick = (e: React.MouseEvent, edgeId: string) => {
        e.stopPropagation();
        setSelectedEdgeId(edgeId);
        setSelectedNodeId(null);
    };

    const toggleLinkMode = () => {
        if (!selectedNodeId) return;
        setLinkFrom((prev) => (prev === selectedNodeId ? null : selectedNodeId));
    };

    // Shortcuts
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            const isMac = navigator.platform.toLowerCase().includes("mac");
            const ctrl = isMac ? e.metaKey : e.ctrlKey;

            if (ctrl && e.key.toLowerCase() === "z" && !e.shiftKey) {
                e.preventDefault();
                const snap = undo.current.shift();
                if (!snap) return;
                if (!draft || snap.wfId !== draft.id) return;

                redo.current = [{ wfId: draft.id, workflow: cloneWorkflow(draft) }, ...redo.current].slice(0, 40);
                setDraft(cloneWorkflow(snap.workflow));
                setProjectWorkflows((prev) => prev.map((x) => (x.id === snap.workflow.id ? { ...snap.workflow, updatedAt: Date.now() } : x)));
            }

            if ((ctrl && e.key.toLowerCase() === "z" && e.shiftKey) || (ctrl && e.key.toLowerCase() === "y")) {
                e.preventDefault();
                const snap = redo.current.shift();
                if (!snap) return;
                if (!draft || snap.wfId !== draft.id) return;

                undo.current = [{ wfId: draft.id, workflow: cloneWorkflow(draft) }, ...undo.current].slice(0, 40);
                setDraft(cloneWorkflow(snap.workflow));
                setProjectWorkflows((prev) => prev.map((x) => (x.id === snap.workflow.id ? { ...snap.workflow, updatedAt: Date.now() } : x)));
            }

            if (e.key === "Escape") {
                setLinkFrom(null);
                setDragLink(null);
                setSelectedEdgeId(null);
            }

            if (e.key === "Delete" || e.key === "Backspace") {
                if (selectedEdgeId) deleteEdge(selectedEdgeId);
                else if (selectedNodeId) softDeleteNode(selectedNodeId);
            }
        };

        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [draft, selectedEdgeId, selectedNodeId]);

    // If workflows list changes and activeId removed, recover
    useEffect(() => {
        if (activeId && projectWorkflows.some((p) => p.id === activeId)) return;
        setActiveId(projectWorkflows[0]?.id ?? null);
    }, [projectWorkflows, activeId]);

    // click background clears selection
    const clearSelection = () => {
        setSelectedNodeId(null);
        setSelectedEdgeId(null);
        setLinkFrom(null);
    };

    return (
        <div className="h-full w-full flex flex-col relative overflow-hidden bg-[#0a0614] text-white">
            {/* Animated Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-900/10 via-blue-900/10 to-fuchsia-900/10" />
                <div className="absolute inset-0" style={{
                    backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.03) 1px, transparent 0)`,
                    backgroundSize: '40px 40px'
                }} />
                {/* Gradient orbs */}
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
            </div>
            {/* Top bar */}
            <div className="px-4 py-3 flex items-center justify-between border-b border-white/10">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="text-lg font-semibold tracking-wide truncate">{t("workflow.title", "Project Workflow Lab Pro")}</div>
                    <div className="text-xs px-2 py-1 rounded-full bg-white/5 border border-white/10">
                        {draft ? `${progress.pct}% • ${progress.done}/${progress.total}` : t("workflow.noProject", "Nincs aktív projekt")}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => {
                            const snap = undo.current.shift();
                            if (!snap || !draft || snap.wfId !== draft.id) return;
                            redo.current = [{ wfId: draft.id, workflow: cloneWorkflow(draft) }, ...redo.current].slice(0, 40);
                            setDraft(cloneWorkflow(snap.workflow));
                            setProjectWorkflows((prev) => prev.map((x) => (x.id === snap.workflow.id ? { ...snap.workflow, updatedAt: Date.now() } : x)));
                        }}
                        className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 flex items-center gap-2"
                    >
                        <RotateCcw className="w-4 h-4" />
                        <span className="text-sm">{t("workflow.undo", "Undo")}</span>
                    </button>

                    <button
                        onClick={() => {
                            const snap = redo.current.shift();
                            if (!snap || !draft || snap.wfId !== draft.id) return;
                            undo.current = [{ wfId: draft.id, workflow: cloneWorkflow(draft) }, ...undo.current].slice(0, 40);
                            setDraft(cloneWorkflow(snap.workflow));
                            setProjectWorkflows((prev) => prev.map((x) => (x.id === snap.workflow.id ? { ...snap.workflow, updatedAt: Date.now() } : x)));
                        }}
                        className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 flex items-center gap-2"
                    >
                        <RotateCw className="w-4 h-4" />
                        <span className="text-sm">{t("workflow.redo", "Redo")}</span>
                    </button>

                    <button onClick={exportJSON} className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 flex items-center gap-2">
                        <Download className="w-4 h-4" />
                        <span className="text-sm">{t("common.export", "Export")}</span>
                    </button>

                    <label className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 flex items-center gap-2 cursor-pointer">
                        <Upload className="w-4 h-4" />
                        <span className="text-sm">{t("common.import", "Import")}</span>
                        <input
                            type="file"
                            accept="application/json"
                            className="hidden"
                            onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) importJSONFile(f);
                                e.currentTarget.value = "";
                            }}
                        />
                    </label>
                </div>
            </div>

            <div className="flex-1 min-h-0 grid grid-cols-12 relative">
                {/* Left */}
                <div className="col-span-3 border-r border-white/5 p-4 min-h-0 flex flex-col gap-4 relative z-10 bg-gradient-to-br from-white/[0.02] to-transparent backdrop-blur-sm">
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                            <Search className="w-4 h-4 absolute left-3 top-3 text-white/50" />
                            <input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder={t("common.search", "Keresés")}
                                className="w-full pl-10 pr-3 py-2.5 rounded-2xl bg-white/5 border border-white/10 outline-none focus:border-fuchsia-500/50 focus:bg-white/10 transition-all"
                            />
                        </div>
                        <button onClick={createEmptyProject} className="px-3 py-2.5 rounded-2xl bg-gradient-to-r from-fuchsia-600/20 to-purple-600/20 border border-fuchsia-500/30 hover:from-fuchsia-600/30 hover:to-purple-600/30 transition-all" title="New project">
                            <FolderPlus className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="text-xs uppercase tracking-wider text-white/60 px-1">{t("workflow.projects", "Projektek")}</div>
                    <div className="flex-1 min-h-0 overflow-auto space-y-2 pr-1">
                        {filteredProjects.map((p) => (
                            <button
                                key={p.id}
                                onClick={() => {
                                    setActiveId(p.id);
                                    setSelectedNodeId(null);
                                    setSelectedEdgeId(null);
                                    setLinkFrom(null);
                                }}
                                className={[
                                    "w-full text-left px-4 py-3 rounded-2xl border transition-all duration-200",
                                    "backdrop-blur-sm",
                                    p.id === activeId
                                        ? "bg-gradient-to-r from-fuchsia-600/20 to-purple-600/20 border-fuchsia-500/40 shadow-lg shadow-fuchsia-900/20"
                                        : "bg-white/[0.03] border-white/10 hover:bg-white/[0.06] hover:border-white/20",
                                ].join(" ")}
                            >
                                <div className="font-semibold text-sm truncate text-white">{p.name}</div>
                                <div className="text-xs text-white/50 mt-0.5">{new Date(p.updatedAt).toLocaleString()}</div>
                            </button>
                        ))}
                    </div>

                    <div className="text-xs uppercase tracking-wider text-white/60 px-1">{t("workflow.templates", "Sablonok")}</div>
                    <div className="max-h-[260px] overflow-auto space-y-2 pr-1">
                        {workflowTemplates.map((tpl) => (
                            <button
                                key={tpl.id}
                                onClick={() => createFromTemplateAction(tpl)}
                                className="w-full text-left px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10"
                            >
                                <div className="font-medium text-sm">{safeText(tpl.name, uiLang, "Template")}</div>
                                <div className="text-xs text-white/60">{safeText(tpl.description, uiLang, "")}</div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Canvas */}
                <div className="col-span-6 relative min-h-0">
                    {/* Canvas controls */}
                    <div className="absolute left-4 top-4 z-20 flex items-center gap-2">
                        <button
                            disabled={!draft}
                            onClick={addNode}
                            className="px-4 py-2.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/15 hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 shadow-xl transition-all duration-200"
                        >
                            <Plus className="w-5 h-5" />
                            <span className="text-sm font-semibold">{t("workflow.addStep", "Lépés")}</span>
                        </button>

                        <button
                            disabled={!selectedNodeId}
                            onClick={toggleLinkMode}
                            className={[
                                "px-4 py-2.5 rounded-2xl border backdrop-blur-md flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-xl transition-all duration-200",
                                linkFrom
                                    ? "bg-gradient-to-r from-blue-500/30 to-cyan-500/30 border-blue-400/40 hover:from-blue-500/40 hover:to-cyan-500/40"
                                    : "bg-white/10 border-white/20 hover:bg-white/15 hover:scale-105",
                            ].join(" ")}
                            title={t("workflow.link.hint", "Link mód: válassz node-ot, majd kattints cél node-ra")}
                        >
                            <Link2 className="w-5 h-5" />
                            <span className="text-sm font-semibold">{linkFrom ? t("workflow.link.on", "Link: ON") : t("workflow.link", "Összekötés")}</span>
                        </button>

                        <button
                            disabled={!draft}
                            onClick={doAutoLayout}
                            className="px-4 py-2.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/15 hover:scale-105 disabled:opacity-40 flex items-center gap-2 shadow-xl transition-all duration-200"
                            title={t("workflow.autolayout", "Auto-layout")}
                        >
                            <LayoutGrid className="w-5 h-5" />
                            <span className="text-sm font-semibold">{t("workflow.autolayout", "Rendezés")}</span>
                        </button>

                        <button onClick={fitToView} className="px-4 py-2.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/15 hover:scale-105 shadow-xl transition-all duration-200">
                            <span className="text-sm font-semibold">{t("workflow.fit", "Fit")}</span>
                        </button>

                        <button onClick={resetView} className="px-4 py-2.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/15 hover:scale-105 shadow-xl transition-all duration-200">
                            <span className="text-sm font-semibold">{t("workflow.resetView", "Reset")}</span>
                        </button>
                    </div>

                    {/* Stage */}
                    <div
                        ref={stageRef}
                        onWheel={onWheel}
                        onPointerDown={startPan}
                        onClick={clearSelection}
                        className="h-full w-full overflow-hidden cursor-grab active:cursor-grabbing"
                    >
                        {/* edges */}
                        <svg className="absolute inset-0">
                            <defs>
                                <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                                    <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(255,255,255,0.25)" />
                                </marker>
                            </defs>

                            {draft &&
                                visibleEdges.map((e) => {
                                    const from = visibleNodes.find((n) => n.id === e.from);
                                    const to = visibleNodes.find((n) => n.id === e.to);
                                    if (!from || !to) return null;

                                    const p1 = worldToScreen(nodeAnchorRight(from), viewport);
                                    const p2 = worldToScreen(nodeAnchorLeft(to), viewport);

                                    return (
                                        <path
                                            key={e.id}
                                            d={edgePath(p1, p2)}
                                            stroke={selectedEdgeId === e.id ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.20)"}
                                            strokeWidth={selectedEdgeId === e.id ? 3 : 2}
                                            fill="none"
                                            markerEnd="url(#arrow)"
                                            onClick={(evt) => onEdgeClick(evt, e.id)}
                                            style={{ cursor: "pointer" }}
                                        />
                                    );
                                })}

                            {/* drag connector preview */}
                            {draft &&
                                dragLink &&
                                (() => {
                                    const from = visibleNodes.find((n) => n.id === dragLink.fromId);
                                    if (!from) return null;
                                    const p1 = worldToScreen(nodeAnchorRight(from), viewport);
                                    const p2 = worldToScreen(dragLink.toWorld, viewport);
                                    return <path d={edgePath(p1, p2)} stroke="rgba(96,165,250,0.5)" strokeWidth={2.5} fill="none" markerEnd="url(#arrow)" />;
                                })()}
                        </svg>

                        {/* nodes layer (transform) */}
                        <div style={{ transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`, transformOrigin: "0 0" }} className="absolute left-0 top-0">
                            {draft &&
                                visibleNodes.map((node) => {
                                    const meta = STATUS_META[node.status];
                                    const selected = node.id === selectedNodeId;
                                    const linkFromThis = node.id === linkFrom;

                                    return (
                                        <motion.div
                                            key={node.id}
                                            data-role="node"
                                            onPointerDown={(e) => onNodePointerDown(e, node.id)}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedNodeId(node.id);
                                                setSelectedEdgeId(null);
                                            }}
                                            style={{ left: node.position.x, top: node.position.y, width: NODE_W, height: NODE_H }}
                                            className={`${styles.node} ${selected ? styles.nodeSelected : ""} ${linkFromThis ? "ring-2 ring-blue-400" : ""}`}
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: selected ? 1.05 : 1 }}
                                            transition={{ duration: 0.1 }}
                                        >
                                            {/* Left Icon */}
                                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center border border-gray-100 shadow-sm">
                                                {(() => {
                                                    switch (node.type) {
                                                        case 'milestone': return <Flag className="w-5 h-5 text-emerald-500" />;
                                                        case 'decision': return <GitBranch className="w-5 h-5 text-amber-500" />;
                                                        case 'platform': return <Globe className="w-5 h-5 text-purple-500" />;
                                                        case 'media': return <Video className="w-5 h-5 text-pink-500" />;
                                                        case 'promotion': return <Megaphone className="w-5 h-5 text-red-500" />;
                                                        case 'note': return <StickyNote className="w-5 h-5 text-gray-500" />;
                                                        default: return <CheckSquare className="w-5 h-5 text-blue-500" />;
                                                    }
                                                })()}
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0 flex flex-col justify-center overflow-hidden">
                                                <div className="text-sm font-semibold text-gray-800 truncate leading-tight">
                                                    {safeText(node.title, draft.language, "Untitled")}
                                                </div>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <div className={`w-2 h-2 rounded-full ${node.status === 'done' ? 'bg-emerald-500' :
                                                        node.status === 'doing' ? 'bg-blue-500' :
                                                            node.status === 'blocked' ? 'bg-red-500' : 'bg-gray-300'
                                                        }`} />
                                                    <div className="text-[10px] text-gray-500 truncate uppercase tracking-wide">
                                                        {t(STATUS_META[node.status]?.key ?? "status", node.status)}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Output Connector */}
                                            <div
                                                data-role="connector"
                                                onPointerDown={(e) => onConnectorDown(e, node.id)}
                                                className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border border-gray-300 bg-white hover:bg-blue-500 hover:border-blue-600 transition-colors shadow-sm cursor-crosshair z-20"
                                                title={t("workflow.connector", "Húzd ide az összekötést")}
                                            />
                                            {/* Input Connector Visual (non-interactive) */}
                                            <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border border-gray-300 bg-white shadow-sm z-10 pointer-events-none" />

                                        </motion.div>
                                    );
                                })}
                        </div>
                    </div>

                    {/* Minimap */}
                    <div className="absolute right-3 bottom-3 w-[220px] rounded-2xl bg-white/5 border border-white/10 p-2">
                        <div className="text-[11px] text-white/60 px-1 mb-1">{t("workflow.minimap", "Minimap")}</div>
                        <div className="relative w-full h-[120px] rounded-xl bg-black/20 border border-white/10 overflow-hidden">
                            {draft &&
                                visibleNodes.map((n) => {
                                    const { b, w, h } = minimap;
                                    const x = ((n.position.x - b.minX) / w) * 220;
                                    const y = ((n.position.y - b.minY) / h) * 120;
                                    return <div key={n.id} className="absolute rounded bg-white/25" style={{ left: x, top: y, width: 10, height: 6 }} />;
                                })}
                        </div>
                        <div className="text-[11px] text-white/50 mt-1 px-1">{t("workflow.hintShort", "Ctrl+Z undo • Del törlés • Esc kilépés")}</div>
                    </div>
                </div>

                {/* Inspector */}
                <div className="col-span-3 border-l border-white/10 p-3 min-h-0 flex flex-col gap-3">
                    {!draft ? (
                        <div className="text-sm text-white/70">{t("workflow.pickOrCreate", "Válassz projektet vagy hozz létre újat / sablonból.")}</div>
                    ) : (
                        <>
                            {/* Project card */}
                            <div className="rounded-2xl bg-white/5 border border-white/10 p-3">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <div className="text-xs text-white/60">{t("workflow.activeProject", "Aktív projekt")}</div>
                                        <input
                                            value={draft.name}
                                            onChange={(e) => persistDraft({ ...draft, name: e.target.value, updatedAt: Date.now() }, { immediate: false, recordUndo: true })}
                                            className="mt-1 w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 outline-none focus:border-white/20 font-semibold"
                                        />
                                    </div>

                                    <button
                                        onClick={() => {
                                            const typed = prompt(t("workflow.deleteProject.confirm", "Projekt törléséhez írd be: DELETE"));
                                            if (typed === "DELETE") {
                                                deleteProjectWorkflow(draft.id);
                                                setActiveId(projectWorkflows[0]?.id ?? null);
                                                setSelectedNodeId(null);
                                                setSelectedEdgeId(null);
                                                setLinkFrom(null);
                                            }
                                        }}
                                        className="px-3 py-2 rounded-xl bg-red-600/20 border border-red-400/20 hover:bg-red-600/30 flex items-center gap-2"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        <span className="text-sm">{t("common.delete", "Törlés")}</span>
                                    </button>
                                </div>

                                <div className="mt-2 grid grid-cols-2 gap-2">
                                    <label className="text-xs text-white/60">
                                        {t("workflow.language", "Nyelv")}
                                        <select
                                            value={draft.language}
                                            onChange={(e) => setLanguage(e.target.value as LangCode)}
                                            className="mt-1 w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10"
                                        >
                                            <option value="hu">HU</option>
                                            <option value="en">EN</option>
                                            <option value="de">DE</option>
                                        </select>
                                    </label>

                                    <div className="text-xs text-white/60">
                                        {t("workflow.stats", "Statisztika")}
                                        <div className="mt-1 w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/80">
                                            {progress.pct}% • {progress.done}/{progress.total}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Selected Edge */}
                            {selectedEdge && (
                                <div className="rounded-2xl bg-white/5 border border-white/10 p-3">
                                    <div className="flex items-center justify-between">
                                        <div className="text-sm font-semibold">{t("workflow.edge", "Kapcsolat")}</div>
                                        <button onClick={() => deleteEdge(selectedEdge.id)} className="px-3 py-2 rounded-xl bg-red-600/20 border border-red-400/20 hover:bg-red-600/30">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <div className="text-xs text-white/60 mt-2">
                                        {t("workflow.edge.from", "From")}: <span className="text-white/80">{selectedEdge.from}</span>
                                        <br />
                                        {t("workflow.edge.to", "To")}: <span className="text-white/80">{selectedEdge.to}</span>
                                    </div>

                                    <label className="block text-xs text-white/60 mt-3">
                                        {t("workflow.edge.label", "Label")}
                                        <input
                                            value={safeText(selectedEdge.label, draft.language, "")}
                                            onChange={(e) => updateEdge(selectedEdge.id, { label: setLangText(selectedEdge.label, draft.language, e.target.value) })}
                                            className="mt-1 w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10"
                                        />
                                    </label>
                                </div>
                            )}

                            {/* Selected Node */}
                            <div className="flex-1 min-h-0 rounded-2xl bg-white/5 border border-white/10 p-3 overflow-auto">
                                {!selectedNode ? (
                                    <div className="text-sm text-white/70">{t("workflow.selectStep", "Kattints egy lépésre, hogy szerkeszthesd.")}</div>
                                ) : (
                                    <>
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <div className="text-xs text-white/60">{t("workflow.step", "Lépés")}</div>
                                                <div className="text-base font-semibold truncate">{safeText(selectedNode.title, draft.language, "Untitled")}</div>
                                            </div>

                                            <button
                                                onClick={() => softDeleteNode(selectedNode.id)}
                                                className="px-3 py-2 rounded-xl bg-red-600/20 border border-red-400/20 hover:bg-red-600/30 flex items-center gap-2"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                                <span className="text-sm">{t("common.delete", "Törlés")}</span>
                                            </button>
                                        </div>

                                        <label className="block text-xs text-white/60 mt-3">
                                            {t("common.title", "Cím")}
                                            <input
                                                value={safeText(selectedNode.title, draft.language, "")}
                                                onChange={(e) => updateNode(selectedNode.id, { title: setLangText(selectedNode.title, draft.language, e.target.value) })}
                                                className="mt-1 w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10"
                                            />
                                        </label>

                                        <label className="block text-xs text-white/60 mt-3">
                                            {t("common.description", "Leírás")}
                                            <textarea
                                                value={safeText(selectedNode.description, draft.language, "")}
                                                onChange={(e) => updateNode(selectedNode.id, { description: setLangText(selectedNode.description, draft.language, e.target.value) })}
                                                className="mt-1 w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 min-h-[90px]"
                                            />
                                        </label>

                                        <div className="grid grid-cols-2 gap-2 mt-3">
                                            <label className="text-xs text-white/60">
                                                {t("workflow.status", "Státusz")}
                                                <select
                                                    value={selectedNode.status}
                                                    onChange={(e) => updateNode(selectedNode.id, { status: e.target.value as WorkflowStatus })}
                                                    className="mt-1 w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10"
                                                >
                                                    <option value="todo">{t("workflow.status.todo", "Todo")}</option>
                                                    <option value="doing">{t("workflow.status.doing", "Doing")}</option>
                                                    <option value="blocked">{t("workflow.status.blocked", "Blocked")}</option>
                                                    <option value="done">{t("workflow.status.done", "Done")}</option>
                                                </select>
                                            </label>

                                            <label className="text-xs text-white/60">
                                                {t("workflow.priority", "Prioritás")}
                                                <select
                                                    value={selectedNode.priority}
                                                    onChange={(e) => updateNode(selectedNode.id, { priority: e.target.value as WorkflowPriority })}
                                                    className="mt-1 w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10"
                                                >
                                                    <option value="low">{t("workflow.priority.low", "Low")}</option>
                                                    <option value="medium">{t("workflow.priority.medium", "Medium")}</option>
                                                    <option value="high">{t("workflow.priority.high", "High")}</option>
                                                </select>
                                            </label>
                                        </div>

                                        <label className="block text-xs text-white/60 mt-3">
                                            {t("workflow.dueDate", "Határidő")}
                                            <input
                                                type="date"
                                                value={selectedNode.dueDateISO ?? ""}
                                                onChange={(e) => updateNode(selectedNode.id, { dueDateISO: e.target.value || undefined })}
                                                className="mt-1 w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10"
                                            />
                                        </label>

                                        <div className="text-[11px] text-white/50 mt-4">
                                            {t("workflow.nodeId", "Node ID")}: {selectedNode.id}
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Trash */}
                            <div className="rounded-2xl bg-white/5 border border-white/10 p-3">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="text-sm font-semibold flex items-center gap-2">
                                        <Undo2 className="w-4 h-4" /> {t("workflow.trash", "Trash")}
                                    </div>
                                    <button
                                        disabled={!deletedNodes.length}
                                        onClick={purgeDeleted}
                                        className="px-3 py-2 rounded-xl bg-red-600/20 border border-red-400/20 hover:bg-red-600/30 disabled:opacity-40 disabled:cursor-not-allowed"
                                        title={t("workflow.trash.purge", "Végleges törlés")}
                                    >
                                        {t("workflow.trash.purge", "Purge")}
                                    </button>
                                </div>

                                <div className="mt-2 max-h-[120px] overflow-auto space-y-2">
                                    {deletedNodes.length === 0 ? (
                                        <div className="text-xs text-white/60">{t("workflow.trash.empty", "Üres")}</div>
                                    ) : (
                                        deletedNodes.slice(0, 12).map((n) => (
                                            <div key={n.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10">
                                                <div className="text-xs text-white/70 truncate">{safeText(n.title, draft.language, "Deleted")}</div>
                                                <button
                                                    onClick={() => restoreNode(n.id)}
                                                    className="px-2 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10"
                                                    title={t("workflow.trash.restore", "Visszaállítás")}
                                                >
                                                    <RotateCcw className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>

                                <div className="mt-2 rounded-xl bg-black/20 border border-white/10 p-2 text-xs text-white/60 flex gap-2">
                                    <AlertTriangle className="w-4 h-4 mt-0.5" />
                                    <div>{t("workflow.safety", "Soft-delete + restore, végleges törlés csak Purge.")}</div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <div className="px-4 py-2 text-xs text-white/50 border-t border-white/10">
                {t(
                    "workflow.footerHint",
                    "Tippek: Ctrl+Z undo, Ctrl+Shift+Z redo, Del törlés, Esc kilépés link módból. Connector ikonról húzva gyors összekötés."
                )}
            </div>
        </div>
    );
}
