import React, { useState, useEffect } from 'react';
import { X, ArrowRightLeft, RefreshCw, Calculator } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CurrencyService } from '../../services/CurrencyService';
import { AVAILABLE_CURRENCIES } from '../../constants/currencyData';

interface CurrencyConverterModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const CurrencyConverterModal: React.FC<CurrencyConverterModalProps> = ({ isOpen, onClose }) => {
    const [amount, setAmount] = useState<number>(1);
    const [fromCurrency, setFromCurrency] = useState<string>('USD');
    const [toCurrency, setToCurrency] = useState<string>('HUF');
    const [useLiveRates, setUseLiveRates] = useState<boolean>(true);
    const [result, setResult] = useState<number>(0);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [rateMessage, setRateMessage] = useState<string | null>(null);

    // Recalculate when inputs change
    useEffect(() => {
        calculateConversion();
    }, [amount, fromCurrency, toCurrency, useLiveRates]);

    const calculateConversion = () => {
        // If using live rates, we rely on the stored rates in CurrencyService (which should be updated)
        // If we want to FORCE live rate fetch, user clicks "Refresh Rates"
        const converted = CurrencyService.convert(amount, fromCurrency, toCurrency);
        setResult(converted);
    };

    const handleRefreshRates = async () => {
        if (!useLiveRates) return;

        setIsLoading(true);
        setRateMessage(null);
        const result = await CurrencyService.fetchRealTimeRates(true); // Force API/AI fetch
        setIsLoading(false);

        setRateMessage(result.message);
        calculateConversion(); // Recalculate with new rates
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md rounded-3xl bg-gradient-to-b from-gray-900 to-gray-950 border border-white/10 shadow-2xl overflow-hidden"
            >
                <div className="p-6 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                            <Calculator size={20} />
                        </div>
                        <h2 className="text-xl font-bold text-white">Currency Converter</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl hover:bg-white/10 transition-colors"
                    >
                        <X size={20} className="text-white/60" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Amount Input */}
                    <div>
                        <label className="block text-sm font-bold text-white/80 mb-2">Amount</label>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                            className="w-full px-4 py-3 rounded-2xl border-2 border-white/20 bg-gray-800 text-white font-bold outline-none focus:border-blue-500/50 text-xl"
                            placeholder="0.00"
                        />
                    </div>

                    {/* Currencies */}
                    <div className="grid grid-cols-[1fr,auto,1fr] gap-4 items-center">
                        <div>
                            <label className="block text-sm font-bold text-white/60 mb-2">From</label>
                            <select
                                value={fromCurrency}
                                onChange={(e) => setFromCurrency(e.target.value)}
                                className="w-full px-3 py-3 rounded-xl border border-white/20 bg-gray-800 text-white font-bold outline-none"
                            >
                                {AVAILABLE_CURRENCIES.map(c => (
                                    <option key={c.code} value={c.code} className="bg-gray-900">{c.code}</option>
                                ))}
                            </select>
                        </div>

                        <div className="pt-6">
                            <button
                                onClick={() => {
                                    const temp = fromCurrency;
                                    setFromCurrency(toCurrency);
                                    setToCurrency(temp);
                                }}
                                className="p-3 rounded-full bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
                            >
                                <ArrowRightLeft size={16} className="text-white/60" />
                            </button>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-white/60 mb-2">To</label>
                            <select
                                value={toCurrency}
                                onChange={(e) => setToCurrency(e.target.value)}
                                className="w-full px-3 py-3 rounded-xl border border-white/20 bg-gray-800 text-white font-bold outline-none"
                            >
                                {AVAILABLE_CURRENCIES.map(c => (
                                    <option key={c.code} value={c.code} className="bg-gray-900">{c.code}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Result Display */}
                    <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-white/10 text-center">
                        <p className="text-sm text-white/60 mb-1">
                            {amount} {fromCurrency} =
                        </p>
                        <p className="text-3xl font-black text-white">
                            {new Intl.NumberFormat('en-US', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(result)} {toCurrency}
                        </p>
                        <p className="text-xs text-white/40 mt-2">
                            1 {fromCurrency} = {CurrencyService.convert(1, fromCurrency, toCurrency).toFixed(4)} {toCurrency}
                        </p>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center justify-between pt-2">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <div className={`w-12 h-6 rounded-full p-1 transition-colors ${useLiveRates ? 'bg-blue-600' : 'bg-gray-700'}`}>
                                <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${useLiveRates ? 'translate-x-6' : ''}`} />
                            </div>
                            <input
                                type="checkbox"
                                className="hidden"
                                checked={useLiveRates}
                                onChange={(e) => setUseLiveRates(e.target.checked)}
                            />
                            <span className="text-sm font-bold text-white/80">
                                {useLiveRates ? "Live Rates (API)" : "Manual Rates"}
                            </span>
                        </label>

                        {useLiveRates && (
                            <button
                                onClick={handleRefreshRates}
                                disabled={isLoading}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm font-bold text-white transition-colors disabled:opacity-50"
                            >
                                <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
                                Refresh
                            </button>
                        )}
                    </div>

                    {rateMessage && (
                        <div className="text-xs text-center text-emerald-400 font-medium bg-emerald-500/10 py-2 rounded-lg">
                            {rateMessage}
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default CurrencyConverterModal;
