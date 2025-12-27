import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type } from '@google/genai';
import { Mic, MicOff, Loader2, Sparkles, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast, Toaster } from 'react-hot-toast';
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

// Audio Decoding for Gemini Live (PCM 16le -> AudioBuffer)
async function decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
}

// Helper to encode base64
function encode(bytes: Uint8Array) {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

// Create PCM Blob for sending to API with DYNAMIC Sample Rate
function createBlob(data: Float32Array, sampleRate: number): { data: string; mimeType: string } {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
        int16[i] = data[i] * 32768;
    }
    return {
        data: encode(new Uint8Array(int16.buffer)),
        mimeType: `audio/pcm;rate=${sampleRate}`,
    };
}

// DOM Element detection and analysis
interface ViewportElement {
    type: 'button' | 'input' | 'text' | 'card' | 'section';
    id?: string;
    text?: string;
    visible: boolean;
    rect: DOMRect;
    attributes?: Record<string, string>;
}

export const VoiceAssistant: React.FC<VoiceAssistantProps> = ({
    apiKey,
    onCommand,
    currentLanguage,
    currentView
}) => {
    const { t } = useLanguage();
    const { transactions } = useData();
    const [isActive, setIsActive] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [volume, setVolume] = useState(0);
    const [scrollPosition, setScrollPosition] = useState({ top: 0, percent: 0 });
    const [viewportElements, setViewportElements] = useState<ViewportElement[]>([]);
    const [showVisualAssist, setShowVisualAssist] = useState(false);

    // Refs
    const audioContextRef = useRef<AudioContext | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const sessionRef = useRef<any>(null);
    const onCommandRef = useRef(onCommand);

    useEffect(() => {
        onCommandRef.current = onCommand;
    }, [onCommand]);

    // Enhanced Scroll Position Tracking
    useEffect(() => {
        const handleScroll = () => {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
            const percent = scrollHeight > 0 ? Math.round((scrollTop / scrollHeight) * 100) : 0;

            setScrollPosition({ top: scrollTop, percent });

            if (isActive) {
                analyzeViewport();
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [isActive]);

    // Analyze viewport elements
    const analyzeViewport = useCallback(() => {
        const elements: ViewportElement[] = [];
        const viewportHeight = window.innerHeight;

        // Detect buttons
        document.querySelectorAll('button, [role="button"], a').forEach((el) => {
            const rect = el.getBoundingClientRect();
            if (rect.top < viewportHeight && rect.bottom > 0 && rect.width > 0 && rect.height > 0) {
                elements.push({
                    type: 'button',
                    id: el.id || undefined,
                    text: el.textContent?.substring(0, 50).trim() || undefined,
                    visible: true,
                    rect,
                    attributes: {
                        'aria-label': el.getAttribute('aria-label') || undefined
                    }
                });
            }
        });

        // Detect inputs
        document.querySelectorAll('input, textarea, select').forEach((el) => {
            const rect = el.getBoundingClientRect();
            if (rect.top < viewportHeight && rect.bottom > 0) {
                elements.push({
                    type: 'input',
                    id: el.id || undefined,
                    visible: true,
                    rect,
                    attributes: {
                        'placeholder': el.getAttribute('placeholder') || undefined,
                        'value': (el as HTMLInputElement).value?.substring(0, 50) || undefined,
                        'type': el.getAttribute('type') || 'text'
                    }
                });
            }
        });

        setViewportElements(elements.slice(0, 50)); // Limit to avoid context overflow
    }, []);

    const generateStateReport = useCallback(() => {
        const baseCurrency = CurrencyService.getBaseCurrency();
        const report = FinancialEngine.getFinancialReport(transactions, baseCurrency);

        return `
[SYSTEM STATE SNAPSHOT]
Language: ${currentLanguage}
Current View: ${currentView}
Scroll: ${scrollPosition.percent}%

FINANCIAL STATUS:
Balance: ${Math.round(report.currentBalance)} ${baseCurrency}
Monthly Net: ${Math.round(report.monthlyNet)}
Runway: ${report.runway ? report.runway + ' months' : 'N/A'}

VIEWPORT (${viewportElements.length} items):
${viewportElements.slice(0, 20).map(el => `- ${el.type}: "${el.text || el.attributes?.placeholder || 'unnamed'}"`).join('\n')}
...
        `.trim();
    }, [currentLanguage, currentView, scrollPosition, viewportElements, transactions]);

    const getSystemInstruction = useCallback(() => {
        const isHu = currentLanguage === 'hu';

        return `
You are the Voice Interface of 'ContentPlanner Pro', an advanced financial application.
You have COMPLETE control over the interface and data. Speak professional ${isHu ? 'Hungarian' : 'English'}.

CAPABILITIES:
1. SCREEN AWARENESS: You see buttons, inputs, and text (system state).
2. NAVIGATION: You can scroll and switch views immediately.
3. DATA MANAGEMENT: Create tasks, transactions, goals, notes instantly.
4. INVOICE MANAGEMENT: Schedule pending invoices, link invoices.

IMPORTANT RULES:
- When user asks to "Create task", "Record expense", "Open settings" -> CALL THE CORRESPONDING TOOL IMMEDIATELY.
- When user asks "What can you see?" -> Call analyze_viewport first, then answer.
- When user asks "Scroll down" -> Call control_scroll.
- Be concise and professional.

SPECIFIC COMMANDS (ContentPlanner):
- "Schedule pending invoices" -> Call manage_invoices(action='SCHEDULE_PENDING')
- "Add 5000 HUF lunch expense" -> Call create_transaction(amount=5000, currency='HUF', category='Food', type='expense')
- "New task for tomorrow" -> Call create_task(title='...', date='YYYY-MM-DD')
- "Pomodoro start" -> navigate_view('pomodoro')

SHUTDOWN:
- If user says "Stop" or "Exit", call disconnect_assistant().
        `;
    }, [currentLanguage]);

    const startSession = async () => {
        if (isActive) return;
        if (!apiKey) {
            toast.error("API Key is required");
            return;
        }

        setIsConnecting(true);

        try {
            const ai = new GoogleGenAI({ apiKey });

            // Define ContentPlanner Tools
            const tools = [{
                functionDeclarations: [
                    {
                        name: 'get_system_state',
                        description: 'Returns UI state and financial summary.',
                        parameters: { type: Type.OBJECT, properties: {} }
                    },
                    {
                        name: 'control_scroll',
                        description: 'Scrolls the page.',
                        parameters: {
                            type: Type.OBJECT,
                            properties: {
                                direction: { type: Type.STRING, enum: ['UP', 'DOWN'] },
                                intensity: { type: Type.STRING, enum: ['NORMAL', 'LARGE'] }
                            }
                        }
                    },
                    {
                        name: 'navigate_view',
                        description: 'Navigates to a specific app view.',
                        parameters: {
                            type: Type.OBJECT,
                            properties: {
                                target: { type: Type.STRING, enum: ['daily', 'weekly', 'monthly', 'budget', 'invoicing', 'stats', 'settings', 'goals', 'notes', 'pomodoro'] }
                            },
                            required: ['target']
                        }
                    },
                    {
                        name: 'create_task',
                        description: 'Creates a new planner task.',
                        parameters: {
                            type: Type.OBJECT,
                            properties: {
                                title: { type: Type.STRING },
                                date: { type: Type.STRING, description: 'YYYY-MM-DD' },
                                priority: { type: Type.STRING },
                                description: { type: Type.STRING }
                            },
                            required: ['title', 'date']
                        }
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
                                description: { type: Type.STRING }
                            },
                            required: ['amount', 'type']
                        }
                    },
                    {
                        name: 'create_goal',
                        description: 'Creates a goal.',
                        parameters: {
                            type: Type.OBJECT,
                            properties: {
                                title: { type: Type.STRING },
                                targetDate: { type: Type.STRING },
                                description: { type: Type.STRING }
                            }
                        }
                    },
                    {
                        name: 'create_note',
                        description: 'Creates a note.',
                        parameters: {
                            type: Type.OBJECT,
                            properties: {
                                title: { type: Type.STRING },
                                content: { type: Type.STRING }
                            }
                        }
                    },
                    {
                        name: 'manage_invoices',
                        description: 'Manage invoices like scheduling pending ones.',
                        parameters: {
                            type: Type.OBJECT,
                            properties: {
                                action: { type: Type.STRING, enum: ['SCHEDULE_PENDING', 'LINK'] },
                                invoiceId: { type: Type.STRING }
                            },
                            required: ['action']
                        }
                    },
                    {
                        name: 'toggle_theme',
                        description: 'Toggles dark/light mode.',
                        parameters: {
                            type: Type.OBJECT,
                            properties: {
                                theme: { type: Type.STRING, enum: ['dark', 'light', 'toggle'] }
                            }
                        }
                    },
                    {
                        name: 'analyze_viewport',
                        description: 'Re-analyzes screen elements.',
                        parameters: { type: Type.OBJECT, properties: {} }
                    },
                    {
                        name: 'toggle_visual_assist',
                        description: 'Toggles the visual overlay showing what the assistant sees.',
                        parameters: { type: Type.OBJECT, properties: {} }
                    },
                    {
                        name: 'disconnect_assistant',
                        description: 'Stops the voice session.',
                        parameters: { type: Type.OBJECT, properties: {} }
                    }
                ]
            }];

            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            audioContextRef.current = audioContext;
            const outputNode = audioContext.createGain();
            outputNode.connect(audioContext.destination);

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            const streamSettings = stream.getAudioTracks()[0].getSettings();
            const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: streamSettings.sampleRate || 48000 });
            inputAudioContextRef.current = inputAudioContext;

            const analyzer = inputAudioContext.createAnalyser();
            const visualizerSource = inputAudioContext.createMediaStreamSource(stream);
            visualizerSource.connect(analyzer);

            const updateVolume = () => {
                if (inputAudioContext.state === 'closed') return;
                const dataArray = new Uint8Array(analyzer.frequencyBinCount);
                analyzer.getByteFrequencyData(dataArray);
                const avg = dataArray.reduce((a, b) => a + b) / dataArray.length;
                setVolume(avg);
                requestAnimationFrame(updateVolume);
            };
            updateVolume();

            const sessionPromise = ai.live.connect({
                model: 'gemini-2.0-flash-exp',
                config: {
                    tools: tools,
                    systemInstruction: getSystemInstruction(),
                    responseModalities: [Modality.AUDIO],
                },
                callbacks: {
                    onopen: () => {
                        setIsActive(true);
                        setIsConnecting(false);
                        toast.success(currentLanguage === 'hu' ? 'Hangasszisztens aktív' : 'Voice Assistant Active');
                        sessionPromise.then(s => s.sendToolResponse({
                            functionResponses: {
                                name: 'system_state_report',
                                id: 'init-' + Date.now(),
                                response: { result: generateStateReport() }
                            }
                        }));
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        if (message.serverContent?.modelTurn?.parts?.[0]?.inlineData) {
                            const audioData = decode(message.serverContent.modelTurn.parts[0].inlineData.data);
                            const buffer = await decodeAudioData(audioData, audioContext, 24000, 1);
                            const source = audioContext.createBufferSource();
                            source.buffer = buffer;
                            source.connect(outputNode);
                            source.start();
                        }

                        if (message.toolCall) {
                            const responses = [];
                            for (const fc of message.toolCall.functionCalls) {
                                const args = fc.args as any;
                                let result = { ok: true, message: 'Done' };

                                if (fc.name === 'get_system_state') {
                                    result = { ok: true, message: generateStateReport() };
                                } else if (fc.name === 'control_scroll') {
                                    window.scrollBy({ top: args.direction === 'UP' ? -300 : 300, behavior: 'smooth' });
                                } else if (fc.name === 'navigate_view') {
                                    if (onCommandRef.current) onCommandRef.current({ type: 'navigation', target: args.target });
                                    result = { ok: true, message: `Navigated to ${args.target}` };
                                } else if (fc.name === 'create_task') {
                                    if (onCommandRef.current) onCommandRef.current({ type: 'create_task', data: args });
                                    result = { ok: true, message: 'Task created' };
                                } else if (fc.name === 'create_transaction') {
                                    if (onCommandRef.current) onCommandRef.current({ type: 'create_transaction', data: args });
                                    result = { ok: true, message: 'Transaction recorded' };
                                } else if (fc.name === 'create_goal') {
                                    if (onCommandRef.current) onCommandRef.current({ type: 'create_goal', data: args });
                                } else if (fc.name === 'create_note') {
                                    if (onCommandRef.current) onCommandRef.current({ type: 'create_note', data: args });
                                } else if (fc.name === 'toggle_theme') {
                                    if (onCommandRef.current) onCommandRef.current({ type: 'toggle_theme', target: args.theme });
                                } else if (fc.name === 'manage_invoices') {
                                    if (args.action === 'SCHEDULE_PENDING') {
                                        if (onCommandRef.current) onCommandRef.current({ type: 'schedule_pending' });
                                    } else if (args.action === 'LINK') {
                                        if (onCommandRef.current) onCommandRef.current({ type: 'link_invoice', invoiceId: args.invoiceId });
                                    }
                                } else if (fc.name === 'analyze_viewport') {
                                    analyzeViewport();
                                    result = { ok: true, message: `Found ${viewportElements.length} elements.` };
                                } else if (fc.name === 'toggle_visual_assist') {
                                    setShowVisualAssist(prev => !prev);
                                    result = { ok: true, message: 'Toggled visual assist' };
                                } else if (fc.name === 'disconnect_assistant') {
                                    disconnect();
                                }

                                responses.push({ name: fc.name, id: fc.id, response: { result } });
                            }
                            sessionPromise.then(s => s.sendToolResponse({ functionResponses: responses }));
                        }
                    },
                    onclose: () => {
                        setIsActive(false);
                        setIsConnecting(false);
                        toast(currentLanguage === 'hu' ? 'Kapcsolat bontva' : 'Disconnected', { icon: '👋' });
                    },
                    onError: (e) => {
                        console.error(e);
                        setIsActive(false);
                        toast.error("Connection error");
                    }
                }
            });

            const source = inputAudioContext.createMediaStreamSource(stream);
            const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
            processorRef.current = scriptProcessor;

            scriptProcessor.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                const pcmBlob = createBlob(inputData, inputAudioContext.sampleRate);
                sessionPromise.then(s => s.sendRealtimeInput({ media: pcmBlob }));
            };

            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContext.destination);
            sessionRef.current = sessionPromise;

        } catch (e) {
            console.error(e);
            toast.error("Failed to acquire microphone");
            setIsConnecting(false);
        }
    };

    const disconnect = useCallback(async () => {
        streamRef.current?.getTracks().forEach(t => t.stop());
        inputAudioContextRef.current?.close();
        audioContextRef.current?.close();
        setIsActive(false);
    }, []);

    const VisualAssistOverlay = () => {
        if (!showVisualAssist) return null;
        return (
            <div className="fixed inset-0 z-[10000] pointer-events-none data-[state=visible]">
                {viewportElements.map((el, i) => (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        key={i}
                        style={{
                            position: 'absolute', left: el.rect.left, top: el.rect.top, width: el.rect.width, height: el.rect.height,
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
            <Toaster position="top-right" toastOptions={{
                className: 'dark:bg-gray-800 dark:text-white',
                style: { background: '#1e293b', color: '#fff' }
            }} />
            <VisualAssistOverlay />
            <motion.button
                onClick={isActive ? disconnect : startSession}
                className={`fixed bottom-8 right-8 z-[9999] p-4 rounded-full shadow-2xl backdrop-blur-xl border transition-all duration-300 group ${isActive ? 'bg-red-500/10 border-red-500/50 hover:bg-red-500/20' : 'bg-indigo-500/10 border-indigo-500/50 hover:bg-indigo-500/20'
                    }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
            >
                <div className="relative">
                    {isConnecting ? <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" /> :
                        isActive ? (
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
                        <circle cx="50%" cy="50%" r="24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-500/30"
                            style={{ r: 24 + (volume / 255) * 15, transition: 'r 0.05s ease-out' }} />
                    </svg>
                )}
            </motion.button>
        </>
    );
};
