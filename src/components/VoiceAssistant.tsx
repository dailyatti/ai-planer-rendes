// VoiceAssistant.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type } from '@google/genai';
import { Mic, MicOff, Loader2, Sparkles, MessageSquare, Send, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import { useLanguage } from '../contexts/LanguageContext';
import { useData } from '../contexts/DataContext';
import { FinancialEngine } from '../utils/FinancialEngine';
import { CurrencyService } from '../services/CurrencyService';

interface VoiceAssistantProps {
    apiKey: string;
    onCommand?: (command: any) => void;
    currentLanguage: string;
    currentView: string;
}

interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    text: string;
    timestamp: number;
}

interface ViewportElement {
    type: 'button' | 'input' | 'text' | 'card' | 'section';
    id?: string;
    text?: string;
    visible: boolean;
    rect: DOMRect;
    attributes?: Record<string, string>;
}

// ===== Audio decode: PCM16LE => AudioBuffer =====
async function decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = Math.floor(dataInt16.length / numChannels);
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
}

// ===== base64 helpers =====
function encode(bytes: Uint8Array) {
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
}

function decode(base64: string) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
}

// ===== Float32 => PCM16 base64 =====
function createPcmBlob(data: Float32Array, sampleRate: number): { data: string; mimeType: string } {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
        const s = Math.max(-1, Math.min(1, data[i]));
        int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return {
        data: encode(new Uint8Array(int16.buffer)),
        mimeType: `audio/pcm;rate=${sampleRate}`,
    };
}

export const VoiceAssistant: React.FC<VoiceAssistantProps> = ({
    apiKey,
    onCommand,
    currentLanguage,
    currentView,
}) => {
    const { language: _lang } = useLanguage(); // language available via currentLanguage prop
    const { transactions } = useData();

    const [isActive, setIsActive] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [volume, setVolume] = useState(0);

    const [scrollPosition, setScrollPosition] = useState({ top: 0, percent: 0 });
    const [viewportElements, setViewportElements] = useState<ViewportElement[]>([]);
    const [showVisualAssist, setShowVisualAssist] = useState(false);

    const [showChat, setShowChat] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState('');

    // Refs
    const audioContextRef = useRef<AudioContext | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const sessionRef = useRef<any>(null);

    const onCommandRef = useRef(onCommand);
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        onCommandRef.current = onCommand;
    }, [onCommand]);

    const addMessage = useCallback((role: ChatMessage['role'], text: string) => {
        setMessages((prev) => [...prev, { role, text, timestamp: Date.now() }]);
    }, []);

    useEffect(() => {
        if (showChat) chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, showChat]);

    // ===== viewport analyze (returns list) =====
    const analyzeViewport = useCallback((): ViewportElement[] => {
        const elements: ViewportElement[] = [];
        const viewportHeight = window.innerHeight;

        document.querySelectorAll('button, [role="button"], a').forEach((el) => {
            const rect = (el as HTMLElement).getBoundingClientRect();
            if (rect.top < viewportHeight && rect.bottom > 0 && rect.width > 0 && rect.height > 0) {
                const text = (el as HTMLElement).textContent?.substring(0, 80).trim() || '';
                elements.push({
                    type: 'button',
                    id: (el as HTMLElement).id || undefined,
                    text: text || (el as HTMLElement).getAttribute('aria-label') || undefined,
                    visible: true,
                    rect,
                    attributes: {
                        'aria-label': (el as HTMLElement).getAttribute('aria-label') || '',
                        href: (el as HTMLAnchorElement).href || '',
                    },
                });
            }
        });

        document.querySelectorAll('input, textarea, select').forEach((el) => {
            const rect = (el as HTMLElement).getBoundingClientRect();
            if (rect.top < viewportHeight && rect.bottom > 0 && rect.width > 0 && rect.height > 0) {
                const input = el as HTMLInputElement;
                elements.push({
                    type: 'input',
                    id: (el as HTMLElement).id || undefined,
                    visible: true,
                    rect,
                    attributes: {
                        placeholder: input.getAttribute('placeholder') || '',
                        value: (input.value || '').substring(0, 80),
                        type: input.getAttribute('type') || 'text',
                        name: input.getAttribute('name') || '',
                    },
                });
            }
        });

        const trimmed = elements.slice(0, 60);
        setViewportElements(trimmed);
        return trimmed;
    }, []);

    // ===== scroll tracking =====
    useEffect(() => {
        const handleScroll = () => {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
            const percent = scrollHeight > 0 ? Math.round((scrollTop / scrollHeight) * 100) : 0;
            setScrollPosition({ top: scrollTop, percent });
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const generateStateReport = useCallback(() => {
        const baseCurrency = CurrencyService.getBaseCurrency();
        const report = FinancialEngine.getFinancialReport(transactions, baseCurrency);

        const visible = viewportElements.slice(0, 20).map((el) => {
            const label = el.text || el.attributes?.placeholder || el.id || 'unnamed';
            return `- ${el.type}: "${label}"`;
        });

        return `
[SYSTEM STATE SNAPSHOT]
Language: ${currentLanguage}
Current View: ${currentView}
Scroll: ${scrollPosition.percent}%

FINANCIAL STATUS:
Balance: ${Math.round(report.currentBalance)} ${baseCurrency}
Monthly Net: ${Math.round(report.monthlyNet)} ${baseCurrency}
Runway: ${report.runway ? report.runway + ' months' : 'N/A'}

VIEWPORT (${viewportElements.length} items):
${visible.join('\n')}
`.trim();
    }, [currentLanguage, currentView, scrollPosition.percent, transactions, viewportElements]);

    const getSystemInstruction = useCallback(() => {
        const isHu = currentLanguage === 'hu';
        return `
You are the Voice Interface of 'ContentPlanner Pro', an advanced planner + finance application.
Speak professional ${isHu ? 'Hungarian' : 'English'}.

You can:
- Navigate to any menu/view (navigate_view)
- Scroll page (control_scroll)
- Create tasks, transactions, goals, notes (create_task, create_transaction, create_goal, create_note)
- Ask for system state (get_system_state)
- Analyze screen elements (analyze_viewport)
- Toggle visual overlay (toggle_visual_assist)
- Stop session (disconnect_assistant)

Rules:
- If the user wants to open a menu: call navigate_view immediately with the target view name.
- If user wants to add a task: call create_task immediately.
- Keep outputs short and actionable.
- If you need context, call get_system_state.
`.trim();
    }, [currentLanguage]);

    // ===== disconnect =====
    const disconnect = useCallback(async () => {
        try {
            // close session (if sdk supports)
            const s = sessionRef.current;
            sessionRef.current = null;
            if (s?.close) {
                try {
                    await s.close();
                } catch {
                    // ignore
                }
            }
        } finally {
            if (processorRef.current) {
                try {
                    processorRef.current.disconnect();
                } catch { }
                processorRef.current = null;
            }

            if (streamRef.current) {
                streamRef.current.getTracks().forEach((t) => t.stop());
                streamRef.current = null;
            }

            if (inputAudioContextRef.current) {
                try {
                    await inputAudioContextRef.current.close();
                } catch { }
                inputAudioContextRef.current = null;
            }

            if (audioContextRef.current) {
                try {
                    await audioContextRef.current.close();
                } catch { }
                audioContextRef.current = null;
            }

            setIsActive(false);
            setIsConnecting(false);
            setVolume(0);
            addMessage('system', currentLanguage === 'hu' ? 'Lecsatlakozva.' : 'Disconnected.');
        }
    }, [addMessage, currentLanguage]);

    // cleanup on unmount
    useEffect(() => {
        return () => {
            void disconnect();
        };
    }, [disconnect]);

    // ===== start session =====
    const startSession = useCallback(async () => {
        if (isActive || isConnecting || sessionRef.current) return;

        if (!apiKey) {
            toast.error('API Key is required');
            return;
        }

        setIsConnecting(true);
        setShowChat(true);

        try {
            const ai = new GoogleGenAI({ apiKey });

            if (!ai.live || typeof ai.live.connect !== 'function') {
                throw new Error('Gemini Live API not supported in this SDK version.');
            }

            // tools
            const tools: any = [
                {
                    functionDeclarations: [
                        {
                            name: 'get_system_state',
                            description: 'Returns UI state and financial summary.',
                            parameters: { type: Type.OBJECT, properties: {} },
                        },
                        {
                            name: 'control_scroll',
                            description: 'Scrolls the page.',
                            parameters: {
                                type: Type.OBJECT,
                                properties: {
                                    direction: { type: Type.STRING, enum: ['UP', 'DOWN'] },
                                    intensity: { type: Type.STRING, enum: ['NORMAL', 'LARGE'] },
                                },
                                required: ['direction'],
                            },
                        },
                        {
                            name: 'navigate_view',
                            description: 'Navigates to a specific app view/menu by name.',
                            parameters: {
                                type: Type.OBJECT,
                                properties: {
                                    target: { type: Type.STRING, description: 'Any view name (e.g. daily, weekly, monthly, budget, invoicing, stats, settings...)' },
                                },
                                required: ['target'],
                            },
                        },
                        {
                            name: 'create_task',
                            description: 'Creates a new planner task.',
                            parameters: {
                                type: Type.OBJECT,
                                properties: {
                                    title: { type: Type.STRING },
                                    date: { type: Type.STRING, description: 'YYYY-MM-DD' },
                                    priority: { type: Type.STRING, description: 'low | normal | high (free text ok)' },
                                    description: { type: Type.STRING },
                                },
                                required: ['title', 'date'],
                            },
                        },
                        {
                            name: 'create_transaction',
                            description: 'Records a financial transaction.',
                            parameters: {
                                type: Type.OBJECT,
                                properties: {
                                    type: { type: Type.STRING, enum: ['income', 'expense'] },
                                    amount: { type: Type.NUMBER },
                                    currency: { type: Type.STRING },
                                    category: { type: Type.STRING },
                                    description: { type: Type.STRING },
                                },
                                required: ['amount', 'type'],
                            },
                        },
                        {
                            name: 'create_goal',
                            description: 'Creates a goal.',
                            parameters: {
                                type: Type.OBJECT,
                                properties: {
                                    title: { type: Type.STRING },
                                    targetDate: { type: Type.STRING },
                                    description: { type: Type.STRING },
                                },
                                required: ['title'],
                            },
                        },
                        {
                            name: 'create_note',
                            description: 'Creates a note.',
                            parameters: {
                                type: Type.OBJECT,
                                properties: {
                                    title: { type: Type.STRING },
                                    content: { type: Type.STRING },
                                },
                                required: ['title', 'content'],
                            },
                        },
                        {
                            name: 'manage_invoices',
                            description: 'Manage invoices (schedule pending or link).',
                            parameters: {
                                type: Type.OBJECT,
                                properties: {
                                    action: { type: Type.STRING, enum: ['SCHEDULE_PENDING', 'LINK'] },
                                    invoiceId: { type: Type.STRING },
                                },
                                required: ['action'],
                            },
                        },
                        {
                            name: 'toggle_theme',
                            description: 'Toggles dark/light mode.',
                            parameters: {
                                type: Type.OBJECT,
                                properties: {
                                    theme: { type: Type.STRING, enum: ['dark', 'light', 'toggle'] },
                                },
                            },
                        },
                        {
                            name: 'analyze_viewport',
                            description: 'Re-analyzes screen elements.',
                            parameters: { type: Type.OBJECT, properties: {} },
                        },
                        {
                            name: 'toggle_visual_assist',
                            description: 'Toggles the visual overlay showing what the assistant sees.',
                            parameters: { type: Type.OBJECT, properties: {} },
                        },
                        {
                            name: 'disconnect_assistant',
                            description: 'Stops the voice session.',
                            parameters: { type: Type.OBJECT, properties: {} },
                        },
                    ],
                },
            ];

            // output audio context
            const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            audioContextRef.current = outputCtx;
            const outputGain = outputCtx.createGain();
            outputGain.connect(outputCtx.destination);

            // mic
            let stream: MediaStream | null = null;
            try {
                stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                streamRef.current = stream;
            } catch (err) {
                stream = null;
                toast.error(currentLanguage === 'hu' ? 'Mikrofon engedély megtagadva (csak chat mód).' : 'Microphone denied (chat only).');
            }

            // input audio ctx
            const micRate = stream?.getAudioTracks()?.[0]?.getSettings()?.sampleRate;
            const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
                sampleRate: micRate || 48000,
            });
            inputAudioContextRef.current = inputCtx;

            // volume meter
            if (stream) {
                const analyser = inputCtx.createAnalyser();
                analyser.fftSize = 512;
                const src = inputCtx.createMediaStreamSource(stream);
                src.connect(analyser);

                const tick = () => {
                    if (!inputAudioContextRef.current || inputAudioContextRef.current.state === 'closed') return;
                    const arr = new Uint8Array(analyser.frequencyBinCount);
                    analyser.getByteFrequencyData(arr);
                    const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
                    setVolume(avg);
                    requestAnimationFrame(tick);
                };
                tick();
            }

            const session = await ai.live.connect({
                model: 'gemini-2.5-flash-preview-native-audio-dialog',
                config: {
                    tools,
                    systemInstruction: getSystemInstruction(),
                    responseModalities: [Modality.AUDIO, Modality.TEXT],
                },
                callbacks: {
                    onopen: async () => {
                        console.log('VoiceAssistant: Connection opened');
                    },

                    onmessage: async (message: LiveServerMessage) => {
                        try {
                            // text parts
                            const parts = message.serverContent?.modelTurn?.parts || [];
                            for (const part of parts) {
                                if (part.text) addMessage('assistant', part.text);
                            }

                            // audio parts (iterate)
                            for (const part of parts) {
                                const inline = (part as any)?.inlineData;
                                if (!inline?.data) continue;

                                const audioBytes = decode(inline.data);
                                const buffer = await decodeAudioData(audioBytes, outputCtx, 24000, 1);

                                const src = outputCtx.createBufferSource();
                                src.buffer = buffer;
                                src.connect(outputGain);
                                src.start();
                            }

                            // tool calls
                            const calls = message.toolCall?.functionCalls || [];
                            if (calls.length > 0) {
                                const functionResponses: any[] = [];

                                for (const fc of calls) {
                                    const args = (fc.args || {}) as any;

                                    addMessage('system', `Executing: ${fc.name}`);

                                    let result: any = { ok: true, message: 'Done' };

                                    switch (fc.name) {
                                        case 'get_system_state': {
                                            result = { ok: true, message: generateStateReport() };
                                            break;
                                        }

                                        case 'control_scroll': {
                                            const intensity = args.intensity === 'LARGE' ? 900 : 360;
                                            window.scrollBy({
                                                top: args.direction === 'UP' ? -intensity : intensity,
                                                behavior: 'smooth',
                                            });
                                            result = { ok: true, message: `Scrolled ${args.direction}` };
                                            break;
                                        }

                                        case 'navigate_view': {
                                            onCommandRef.current?.({ type: 'navigation', target: String(args.target || '') });
                                            result = { ok: true, message: `Navigated to ${args.target}` };
                                            break;
                                        }

                                        case 'create_task': {
                                            onCommandRef.current?.({ type: 'create_task', data: args });
                                            result = { ok: true, message: 'Task created' };
                                            break;
                                        }

                                        case 'create_transaction': {
                                            onCommandRef.current?.({ type: 'create_transaction', data: args });
                                            result = { ok: true, message: 'Transaction recorded' };
                                            break;
                                        }

                                        case 'create_goal': {
                                            onCommandRef.current?.({ type: 'create_goal', data: args });
                                            result = { ok: true, message: 'Goal created' };
                                            break;
                                        }

                                        case 'create_note': {
                                            onCommandRef.current?.({ type: 'create_note', data: args });
                                            result = { ok: true, message: 'Note created' };
                                            break;
                                        }

                                        case 'manage_invoices': {
                                            if (args.action === 'SCHEDULE_PENDING') {
                                                onCommandRef.current?.({ type: 'schedule_pending' });
                                                result = { ok: true, message: 'Scheduled pending invoices' };
                                            } else if (args.action === 'LINK') {
                                                onCommandRef.current?.({ type: 'link_invoice', invoiceId: args.invoiceId });
                                                result = { ok: true, message: `Linked invoice ${args.invoiceId}` };
                                            }
                                            break;
                                        }

                                        case 'toggle_theme': {
                                            onCommandRef.current?.({ type: 'toggle_theme', target: args.theme });
                                            result = { ok: true, message: 'Theme updated' };
                                            break;
                                        }

                                        case 'analyze_viewport': {
                                            const list = analyzeViewport();
                                            result = { ok: true, message: `Found ${list.length} visible elements.` };
                                            break;
                                        }

                                        case 'toggle_visual_assist': {
                                            setShowVisualAssist((p) => !p);
                                            result = { ok: true, message: 'Toggled visual overlay' };
                                            break;
                                        }

                                        case 'disconnect_assistant': {
                                            await disconnect();
                                            return;
                                        }

                                        default: {
                                            result = { ok: false, message: `Unknown tool: ${fc.name}` };
                                            break;
                                        }
                                    }

                                    functionResponses.push({
                                        name: fc.name,
                                        id: fc.id,
                                        response: { result },
                                    });
                                }

                                // send tool responses back
                                if (sessionRef.current && functionResponses.length > 0) {
                                    await sessionRef.current.sendToolResponse({ functionResponses });
                                }
                            }
                        } catch (err) {
                            console.error('[VoiceAssistant] onmessage error:', err);
                        }
                    },

                    onclose: (event: any) => {
                        console.error('[VoiceAssistant] onclose:', event);
                        const code = event?.code || 'unknown';
                        const reason = event?.reason || 'No reason provided';
                        setIsActive(false);
                        setIsConnecting(false);
                        sessionRef.current = null;
                        addMessage('system', currentLanguage === 'hu'
                            ? `Kapcsolat bontva. Kód: ${code}, Ok: ${reason}`
                            : `Connection closed. Code: ${code}, Reason: ${reason}`);
                    },

                    onerror: (e: any) => {
                        console.error('[VoiceAssistant] onerror:', e);
                        setIsActive(false);
                        setIsConnecting(false);
                        sessionRef.current = null;
                        addMessage('system', `Error: ${e?.message || 'Unknown'}`);
                    },
                },
            });

            // Session established - initialize state and prime context
            sessionRef.current = session;
            setIsActive(true);
            setIsConnecting(false);

            addMessage('system', currentLanguage === 'hu' ? 'Kapcsolódva. Mondjad mit csináljak.' : 'Connected. Tell me what to do.');

            // Prime context: analyze + send state as user content
            analyzeViewport();
            try {
                await session.sendClientContent({
                    turns: [
                        {
                            role: 'user',
                            parts: [{ text: generateStateReport() }],
                        },
                    ],
                    turnComplete: true,
                });
            } catch (err) {
                console.warn('Failed to send initial context:', err);
            }

            // attach mic streaming AFTER session created
            if (stream) {
                const src = inputCtx.createMediaStreamSource(stream);
                const sp = inputCtx.createScriptProcessor(4096, 1, 1);
                processorRef.current = sp;

                sp.onaudioprocess = (e) => {
                    if (!sessionRef.current) return;
                    const inputData = e.inputBuffer.getChannelData(0);
                    const pcm = createPcmBlob(inputData, inputCtx.sampleRate);
                    try {
                        session.sendRealtimeInput({ media: pcm });
                    } catch {
                        // ignore realtime transient errors
                    }
                };

                src.connect(sp);
                sp.connect(inputCtx.destination);
            }
        } catch (e: any) {
            console.error('[VoiceAssistant] Connection error:', e);
            toast.error('Connection failed: ' + (e?.message || 'Unknown error'));
            setIsConnecting(false);
            setIsActive(false);
            sessionRef.current = null;
        }
    }, [
        apiKey,
        isActive,
        isConnecting,
        currentLanguage,
        addMessage,
        analyzeViewport,
        disconnect,
        generateStateReport,
        getSystemInstruction,
    ]);

    // ===== send text to model =====
    const handleSendText = useCallback(async () => {
        const s = sessionRef.current;
        if (!s) return;

        const text = inputText.trim();
        if (!text) return;

        setInputText('');
        addMessage('user', text);

        try {
            await s.sendClientContent({
                turns: [{ role: 'user', parts: [{ text }] }],
                turnComplete: true,
            });
        } catch (e: any) {
            console.error('[VoiceAssistant] sendClientContent failed:', e);
            toast.error('Failed to send text: ' + (e?.message || 'Unknown error'));
        }
    }, [addMessage, inputText]);

    const VisualAssistOverlay = () => {
        if (!showVisualAssist) return null;
        return (
            <div className="fixed inset-0 z-[10000] pointer-events-none">
                {viewportElements.map((el, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        style={{
                            position: 'absolute',
                            left: el.rect.left,
                            top: el.rect.top,
                            width: el.rect.width,
                            height: el.rect.height,
                        }}
                        className="border-2 border-green-500/40 bg-green-500/5 rounded-md flex items-start justify-start"
                    >
                        <span className="bg-green-900/80 text-green-300 text-[10px] px-1 rounded-br-md font-mono">
                            {el.type}
                        </span>
                    </motion.div>
                ))}
            </div>
        );
    };

    return (
        <>
            <Toaster
                position="top-right"
                toastOptions={{
                    className: 'dark:bg-gray-800 dark:text-white',
                    style: { background: '#1e293b', color: '#fff' },
                }}
            />

            <VisualAssistOverlay />

            {/* Chat Overlay */}
            <AnimatePresence>
                {showChat && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 50, scale: 0.9 }}
                        className="fixed bottom-24 right-8 w-80 md:w-96 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 z-[9990] flex flex-col overflow-hidden max-h-[60vh]"
                    >
                        <div className="p-4 bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-between">
                            <h3 className="text-white font-semibold flex items-center gap-2">
                                <Sparkles size={16} /> Gemini Live
                            </h3>
                            <button
                                onClick={() => setShowChat(false)}
                                className="text-white/80 hover:text-white transition-colors"
                            >
                                <ChevronDown size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900/50">
                            {messages.map((msg, idx) => (
                                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div
                                        className={`max-w-[85%] p-3 rounded-2xl text-sm ${msg.role === 'user'
                                            ? 'bg-indigo-500 text-white rounded-br-none'
                                            : msg.role === 'system'
                                                ? 'bg-gray-200 dark:bg-gray-700 text-xs italic text-center mx-auto'
                                                : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 shadow-sm rounded-bl-none'
                                            }`}
                                    >
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                            <div ref={chatEndRef} />
                        </div>

                        <div className="p-3 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
                            <div className="relative flex items-center">
                                <input
                                    type="text"
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && void handleSendText()}
                                    placeholder={currentLanguage === 'hu' ? 'Üzenet írása...' : 'Type a message...'}
                                    className="w-full pl-4 pr-10 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-900 border-none focus:ring-2 focus:ring-indigo-500/50 text-sm"
                                />
                                <button
                                    onClick={() => void handleSendText()}
                                    disabled={!inputText.trim()}
                                    className="absolute right-2 p-1.5 rounded-lg bg-indigo-500 text-white disabled:opacity-50 hover:bg-indigo-600 transition-colors"
                                >
                                    <Send size={14} />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Toggle Button */}
            <motion.div className="fixed bottom-8 right-8 z-[9999] flex flex-col gap-4 items-center">
                {isActive && !showChat && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        onClick={() => setShowChat(true)}
                        className="p-3 rounded-full bg-white dark:bg-gray-800 shadow-lg text-gray-600 dark:text-gray-300 hover:text-indigo-500 mb-2"
                    >
                        <MessageSquare size={24} />
                    </motion.button>
                )}

                <motion.button
                    onClick={() => (isActive ? void disconnect() : void startSession())}
                    className={`p-4 rounded-full shadow-2xl backdrop-blur-xl border transition-all duration-300 group ${isActive
                        ? 'bg-red-500/10 border-red-500/50 hover:bg-red-500/20'
                        : 'bg-indigo-500/10 border-indigo-500/50 hover:bg-indigo-500/20'
                        }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    <div className="relative">
                        {isConnecting ? (
                            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                        ) : isActive ? (
                            <>
                                <span className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
                                <Mic className="w-8 h-8 text-red-500 relative z-10" />
                            </>
                        ) : (
                            <>
                                <MicOff className="w-8 h-8 text-indigo-400 group-hover:text-indigo-300 transition-colors" />
                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-indigo-500 rounded-full animate-pulse" />
                            </>
                        )}
                    </div>

                    {isActive && (
                        <svg className="absolute inset-0 -m-1 w-[calc(100%+8px)] h-[calc(100%+8px)] pointer-events-none">
                            <circle
                                cx="50%"
                                cy="50%"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                className="text-red-500/30"
                                r={24 + (volume / 255) * 15}
                                style={{ transition: 'r 0.05s ease-out' }}
                            />
                        </svg>
                    )}
                </motion.button>
            </motion.div>
        </>
    );
};
