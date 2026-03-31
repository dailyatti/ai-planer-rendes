/**
 * AIService - Egységes AI Szolgáltatás
 * 
 * PhD-szintű implementáció: Egy API kulcs = minden funkció
 * Ha OpenAI be van állítva → OpenAI végez mindent
 * Ha Gemini be van állítva → Gemini végez mindent
 * Egyszerre csak egy API lehet aktív
 */

export type AIProvider = 'openai' | 'gemini' | 'manus' | null;

interface AIConfig {
    provider: AIProvider;
    apiKey: string;
    model?: string;
    baseUrl?: string;
}

interface TextGenerationOptions {
    prompt: string;
    maxTokens?: number;
    temperature?: number;
    systemPrompt?: string;
    model?: string;
}

interface TextGenerationResult {
    text: string;
    provider: AIProvider;
}

class AIServiceClass {
    private config: AIConfig = { provider: null, apiKey: '', model: '', baseUrl: '' };

    /**
     * Beállítja az aktív AI szolgáltatót
     * Automatikusan törli a másikat
     */
    setProvider(provider: AIProvider, apiKey: string, model?: string, baseUrl?: string): void {
        this.config = { provider, apiKey, model: model || '', baseUrl: baseUrl || '' };
        this.saveConfig();
    }

    /**
     * Törli az aktív szolgáltatót
     */
    clearProvider(): void {
        this.config = { provider: null, apiKey: '', model: '', baseUrl: '' };
        this.saveConfig();
    }

    /**
     * Visszaadja az aktív szolgáltatót
     */
    getActiveProvider(): AIProvider {
        return this.config.provider;
    }

    /**
     * Visszaadja az API kulcsot
     */
    getApiKey(): string {
        return this.config.apiKey;
    }

    /**
     * Ellenőrzi, hogy van-e aktív szolgáltató
     */
    isConfigured(): boolean {
        return this.config.provider !== null && this.config.apiKey.length > 0;
    }

    /**
     * Betölti a konfigurációt localStorage-ből
     */
    loadConfig(): void {
        try {
            const saved = localStorage.getItem('digitalplanner_ai_config');
            if (saved) {
                const parsed = JSON.parse(saved);
                this.config = {
                    provider: parsed.provider || null,
                    apiKey: parsed.apiKey || '',
                    model: parsed.model || '',
                    baseUrl: parsed.baseUrl || ''
                };
            }
        } catch (e) {
            console.error('AIService: Failed to load config', e);
        }
    }

    /**
     * Menti a konfigurációt localStorage-be
     */
    private saveConfig(): void {
        try {
            localStorage.setItem('digitalplanner_ai_config', JSON.stringify(this.config));
            // Régi kulcsok törlése a konzisztencia érdekében
            localStorage.removeItem('contentplanner_ai_config');
        } catch (e) {
            console.error('AIService: Failed to save config', e);
        }
    }

    /**
     * Szöveg generálás - mindkét provider támogatja
     */
    async generateText(options: TextGenerationOptions): Promise<TextGenerationResult> {
        if (!this.isConfigured()) {
            throw new Error('Nincs AI szolgáltató beállítva. Menj az Integrációk menübe.');
        }

        if (this.config.provider === 'openai') {
            return this.generateTextOpenAI(options);
        } else if (this.config.provider === 'manus') {
            return this.generateTextManus(options);
        } else {
            return this.generateTextGemini(options);
        }
    }

    /**
     * OpenAI szöveg generálás
     */
    private async generateTextOpenAI(options: TextGenerationOptions): Promise<TextGenerationResult> {
        const url = this.config.baseUrl || 'https://api.openai.com/v1/chat/completions';
        const modelName = this.config.model || 'gpt-4o'; // Legújabb alapértelmezett

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.config.apiKey}`
            },
            body: JSON.stringify({
                model: modelName,
                messages: [
                    ...(options.systemPrompt ? [{ role: 'system', content: options.systemPrompt }] : []),
                    { role: 'user', content: options.prompt }
                ],
                max_tokens: options.maxTokens || 1000,
                temperature: options.temperature || 0.7
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'OpenAI API hiba');
        }

        const data = await response.json();
        return {
            text: data.choices[0]?.message?.content || '',
            provider: 'openai'
        };
    }

    /**
     * Manus AI szöveg generálás - Alapértelmezetten OpenAI kompatibilis struktúrát használ (például proxy esetén)
     */
    private async generateTextManus(options: TextGenerationOptions): Promise<TextGenerationResult> {
        const url = this.config.baseUrl || 'https://api.manus.ai/v1/chat/completions';
        const modelName = this.config.model || 'manus-1.6';

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.config.apiKey}`
            },
            body: JSON.stringify({
                model: modelName,
                messages: [
                    ...(options.systemPrompt ? [{ role: 'system', content: options.systemPrompt }] : []),
                    { role: 'user', content: options.prompt }
                ],
                max_tokens: options.maxTokens || 1000,
                temperature: options.temperature || 0.7
            })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error?.message || `Manus API hiba: ${response.statusText}`);
        }

        const data = await response.json();
        return {
            text: data.choices?.[0]?.message?.content || '',
            provider: 'manus'
        };
    }

    /**
     * Gemini szöveg generálás
     */
    private async generateTextGemini(options: TextGenerationOptions): Promise<TextGenerationResult> {
        // PhD-Level: allow custom model, default to 2.5-pro
        const modelName = this.config.model || 'gemini-2.5-pro';
        
        // Ensure standard gemini api endpoint logic
        let url = this.config.baseUrl;
        if (!url) {
            url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${this.config.apiKey}`;
        } else {
            // Seemingly custom proxy for gemini
            // If baseUrl is just custom domain, we should format as google implies:
            if (!url.includes('?key=')) url = `${url}?key=${this.config.apiKey}`;
        }

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: options.systemPrompt ? `${options.systemPrompt}\n\n${options.prompt}` : options.prompt }]
                    }],
                    generationConfig: {
                        maxOutputTokens: options.maxTokens || 1000,
                        temperature: options.temperature || 0.7
                    }
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || `Gemini API Error (${response.status})`);
            }

            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!text) {
                throw new Error('Üres választ küldött az AI.');
            }

            return {
                text: text,
                provider: 'gemini'
            };
        } catch (error: unknown) {
            console.error('Gemini API Error:', error);
            if (error instanceof Error) throw error;
            throw new Error('Unknown Gemini error');
        }
    }

    /**
     * API tesztelése
     */
    async testConnection(): Promise<{ success: boolean; message: string }> {
        if (!this.isConfigured()) {
            return { success: false, message: 'Nincs API kulcs beállítva' };
        }

        try {
            await this.generateText({
                prompt: 'Válaszolj egyetlen szóval: működik',
                maxTokens: 10
            });
            return {
                success: true,
                message: `${this.config.provider === 'openai' ? 'OpenAI' : this.config.provider === 'manus' ? 'Manus AI' : 'Gemini'} sikeresen csatlakoztatva!`
            };
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Ismeretlen hiba'
            };
        }
    }

    /**
     * Hang transzkripció beállítása
     */
    getVoiceConfig(): { provider: AIProvider; apiKey: string, model?: string, baseUrl?: string } {
        return { ...this.config };
    }
}

// Singleton instance
export const AIService = new AIServiceClass();

// Betöltés induláskor
if (typeof window !== 'undefined') {
    AIService.loadConfig();
}

export default AIService;
