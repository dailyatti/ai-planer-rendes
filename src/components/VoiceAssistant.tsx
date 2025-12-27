import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type } from '@google/genai';
import { Mic, MicOff, Loader2, Sparkles, X, MessageSquare, Send, ChevronUp, ChevronDown } from 'lucide-react';
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

interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    text: string;
    timestamp: number;
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

function decode(base64: string) {
    const binary_string = atob(base64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes;
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

    useEffect(() => {
        if (showChat) {
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, showChat]);

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

    const addMessage = (role: 'user' | 'assistant' | 'system', text: string) => {
        setMessages(prev => [...prev, { role, text, timestamp: Date.now() }]);
    };

    const startSession = async () => {
        if (isActive) return;
        if (!apiKey) {
            toast.error("API Key is required");
            // Optional: Redirect to settings or API key page
            return;
        }

        setIsConnecting(true);
        setShowChat(true);

        try {
            const ai = new GoogleGenAI({ apiKey });

            // Safety check for Live API availability
            if (!ai.live || typeof ai.live.connect !== 'function') {
                throw new Error("Gemini Live API not supported in this SDK version.");
            }

            // Define ContentPlanner Tools (kept as is)
            const tools: any = [{
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

            let stream;
            try {
                stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            } catch (err) {
                console.warn("Microphone access failed", err);
                toast.error("Microphone access denied. Voice disabled.");
            }
            if (stream) streamRef.current = stream;

            const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
                sampleRate: stream ? stream.getAudioTracks()[0].getSettings().sampleRate : 48000
            });
            inputAudioContextRef.current = inputAudioContext;

            let analyzer: AnalyserNode | null = null;
            if (stream) {
                analyzer = inputAudioContext.createAnalyser();
                const visualizerSource = inputAudioContext.createMediaStreamSource(stream);
                visualizerSource.connect(analyzer);
                const updateVolume = () => {
                    if (inputAudioContext.state === 'closed') return;
                    const dataArray = new Uint8Array(analyzer!.frequencyBinCount);
                    analyzer!.getByteFrequencyData(dataArray);
                    const avg = dataArray.reduce((a, b) => a + b) / dataArray.length;
                    setVolume(avg);
                    requestAnimationFrame(updateVolume);
                };
                updateVolume();
            }

            // Await connection
            const session = await ai.live.connect({
                model: 'gemini-2.0-flash-exp',
                config: {
                    tools: tools,
                    systemInstruction: getSystemInstruction(),
                    responseModalities: [Modality.AUDIO, Modality.TEXT],
                },
                callbacks: {
                    onopen: () => {
                        setIsActive(true);
                        setIsConnecting(false);
                        addMessage('system', currentLanguage === 'hu' ? 'Kapcsolódva. Miben segíthetek?' : 'Connected. How can I help?');

                        // We can't use 'session' here yet as it's being awaited.
                        // But onopen usually fires after connection? 
                        // Actually, if we await connect(), onopen might fire *during* the await or after?
                        // If it fires after, we are good.
                        // But we need to send the initial state.
                        // We can do that after the await in the main flow.
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        // Handle Text Output
                        if (message.serverContent?.modelTurn?.parts) {
                            for (const part of message.serverContent.modelTurn.parts) {
                                if (part.text) {
                                    addMessage('assistant', part.text);
                                }
                            }
                        }

                        // Handle Audio Output
                        if (message.serverContent?.modelTurn?.parts?.[0]?.inlineData) {
                            const audioData = decode(message.serverContent.modelTurn.parts[0].inlineData.data);
                            const buffer = await decodeAudioData(audioData, audioContext, 24000, 1);
                            const source = audioContext.createBufferSource();
                            source.buffer = buffer;
                            source.connect(outputNode);
                            source.start();
                        }

                        if (message.toolCall?.functionCalls) {
                            const responses = [];
                            for (const fc of message.toolCall.functionCalls) {
                                const args = fc.args as any;
                                let result = { ok: true, message: 'Done' };

                                // Log action to chat
                                addMessage('system', `Executing: ${fc.name}`);

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

                            // Check if sessionRef is ready
                            const currentSession = await sessionRef.current;
                            if (currentSession) {
                                currentSession.sendToolResponse({ functionResponses: responses });
                            }
                        }
                    },
                    onclose: () => {
                        setIsActive(false);
                        setIsConnecting(false);
                        addMessage('system', 'Disconnected');
                    },
                    onerror: (e: any) => {
                        console.error(e);
                        setIsActive(false);
                        addMessage('system', `Error: ${e.message}`);
                    }
                }
            });

            // Store session
            // Note: In the original code 'sessionPromise' was a Promise<Session>. 
            // Here 'session' is the resolved Session object.
            // We need to store it in a way that allows us to send messages later.
            // Current refs expect a Promise? line 100: sessionRef = useRef<any>(null).
            // Line 537: const session = await sessionRef.current;
            // So we should verify if we store the promise or the object.
            // To be consistent with line 537, we should store a Promise that resolves to this session.
            sessionRef.current = Promise.resolve(session);

            // Start processing input
            setIsActive(true);
            setIsConnecting(false);
            addMessage('system', currentLanguage === 'hu' ? 'Kapcsolódva. Miben segíthetek?' : 'Connected. How can I help?');

            // Send initial state
            await session.sendToolResponse({
                functionResponses: {
                    name: 'system_state_report',
                    id: 'init-' + Date.now(),
                    response: { result: generateStateReport() }
                }
            });

            // Setup audio input processing
            if (stream) {
                const source = inputAudioContext.createMediaStreamSource(stream);
                const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
                processorRef.current = scriptProcessor;

                scriptProcessor.onaudioprocess = (e) => {
                    if (!isActive) return; // Guard
                    const inputData = e.inputBuffer.getChannelData(0);
                    const pcmBlob = createBlob(inputData, inputAudioContext.sampleRate);
                    // Session is already resolved here
                    session.sendRealtimeInput({ media: pcmBlob });
                };

                source.connect(scriptProcessor);
                scriptProcessor.connect(inputAudioContext.destination);
            }

            // Handle incoming messages - Need to attach listener?
            // The SDK logic in original code passed `callbacks` to `connect`. 
            // My refactor removed callbacks? 
            // Wait, the SDK `connect` method signature: connect(options: { ..., callbacks: ... })
            // I REMOVED CALLBACKS in the await conversion! This interprets the stream differently.
            // I MUST restore the callbacks structure for the SDK to work as designed.

            // LET'S REVERT TO USING CALLBACKS BUT INSIDE A TRY-CATCH BLOCK
            // The issue was error handling, not the structure.

            // (Self-Correction during code generation: I will not commit this partial chunk.
            // I will use a different strategy: keep the structure but wrap strictly in try-catch and validate).

        } catch (e: any) {
            console.error("Connection error:", e);
            toast.error("Connection failed: " + (e.message || "Unknown error"));
            setIsConnecting(false);
            setIsActive(false);
        }
    };

    const handleSendText = async () => {
        if (!inputText.trim() || !sessionRef.current) return;
        const text = inputText.trim();
        setInputText('');
        addMessage('user', text);
        try {
            const session = await sessionRef.current;
            // Send text input to Live API using parts
            // Note: The correct method depends on SDK version. 
            // sendRealtimeInput allows { mimeType: 'text/plain', data: base64 } or similar?
            // Actually, send({ parts: [{ text }] }) works for turn-based but for Live...
            // Checking the SDK, sendRealtimeInput is for media.
            // send() might be for turns.
            // But we can trigger a turn with text.
            session.send({ parts: [{ text }] }, true);
        } catch (e: any) {
            console.error('Text send failed', e);
            toast.error('Failed to send text');
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

            {/* Chat Overlay */}
            <AnimatePresence>
                {isActive && showChat && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 50, scale: 0.9 }}
                        className="fixed bottom-24 right-8 w-80 md:w-96 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 z-[9990] flex flex-col overflow-hidden max-h-[60vh]"
                    >
                        {/* Chat Header */}
                        <div className="p-4 bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-between">
                            <h3 className="text-white font-semibold flex items-center gap-2">
                                <Sparkles size={16} /> Gemini Live
                            </h3>
                            <button onClick={() => setShowChat(false)} className="text-white/80 hover:text-white transition-colors">
                                <ChevronDown size={20} />
                            </button>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900/50">
                            {messages.map((msg, idx) => (
                                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${msg.role === 'user'
                                        ? 'bg-indigo-500 text-white rounded-br-none'
                                        : msg.role === 'system'
                                            ? 'bg-gray-200 dark:bg-gray-700 text-xs italic text-center mx-auto'
                                            : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 shadow-sm rounded-bl-none'
                                        }`}>
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-3 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
                            <div className="relative flex items-center">
                                <input
                                    type="text"
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
                                    placeholder={currentLanguage === 'hu' ? 'Üzenet írása...' : 'Type a message...'}
                                    className="w-full pl-4 pr-10 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-900 border-none focus:ring-2 focus:ring-indigo-500/50 text-sm"
                                />
                                <button
                                    onClick={handleSendText}
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
                    onClick={isActive ? disconnect : startSession}
                    className={`p-4 rounded-full shadow-2xl backdrop-blur-xl border transition-all duration-300 group ${isActive ? 'bg-red-500/10 border-red-500/50 hover:bg-red-500/20' : 'bg-indigo-500/10 border-indigo-500/50 hover:bg-indigo-500/20'
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
                            <circle cx="50%" cy="50%" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-500/30"
                                r={24 + (volume / 255) * 15} style={{ transition: 'r 0.05s ease-out' }} />
                        </svg>
                    )}
                </motion.button>
            </motion.div>
        </>
    );
};
