import React, { useMemo } from 'react';
import { TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useLanguage } from '../../../../contexts/LanguageContext';
import { Invoice } from '../../../../types/planner';
import { FinancialEngine } from '../../../../utils/FinancialEngine';

interface AnalyticsViewProps {
    invoices: Invoice[];
    currency: string;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ invoices, currency = 'USD' }) => {
    const { t } = useLanguage();

    const forecast = useMemo(() => FinancialEngine.generateForecast(invoices, currency, 6), [invoices, currency]);

    const chartData = useMemo(() => forecast.labels.map((label, i) => ({
        name: label,
        actual: forecast.actual[i],
        predicted: forecast.predicted[i]
    })), [forecast]);

    const metrics = useMemo(() => {
        const pastActual = forecast.actual.filter(v => v > 0);
        const futurePredicted = forecast.predicted.filter(v => v > 0);

        const pastAvg = pastActual.length ? pastActual.reduce((a, b) => a + b, 0) / pastActual.length : 0;
        const futureSum = futurePredicted.slice(0, 3).reduce((a, b) => a + b, 0); // Next 3 months total? Or average? Original said "expected" sum? Check label.
        // Step 2590 line 919: reduced sum of slice(0,3).
        const futureAvg = futurePredicted.length ? futurePredicted.reduce((a, b) => a + b, 0) / futurePredicted.length : 0;

        const diff = futureAvg - pastAvg;
        const trendPct = pastAvg ? ((diff / pastAvg) * 100).toFixed(1) : '0';
        const trendLabel = diff >= 0 ? `+${trendPct}% ↗` : `${trendPct}% ↘`;

        return { pastAvg, futureSum, trendLabel };
    }, [forecast]);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="card p-6 border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800 rounded-xl">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <TrendingUp className="text-primary-600" />
                        {t('invoicing.revenueForcast')}
                    </h3>
                    <span className="text-sm text-gray-500">
                        {t('invoicing.linearRegression') || 'Linear Regression Forecast'}
                    </span>
                </div>

                <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                            <XAxis dataKey="name" tick={{ fill: '#9CA3AF' }} />
                            <YAxis tick={{ fill: '#9CA3AF' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                                itemStyle={{ color: '#fff' }}
                                labelStyle={{ color: '#fff', marginBottom: '4px' }}
                                formatter={(value: number) => [`${value.toLocaleString()}`, '']}
                            />
                            <Legend />
                            <Bar dataKey="actual" name={t('invoicing.actual') || "Actual"} fill="#10B981" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="predicted" name={t('invoicing.forecast') || "Forecast"} fill="#6366F1" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                        <div className="text-sm text-emerald-600 dark:text-emerald-400 mb-1">{t('invoicing.pastAvg') || "Past 3 Months Avg"}</div>
                        <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                            ${metrics.pastAvg.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                        </div>
                    </div>
                    <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
                        <div className="text-sm text-indigo-600 dark:text-indigo-400 mb-1">{t('invoicing.futureExpected') || "Next 3 Months Expected"}</div>
                        <div className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">
                            ${metrics.futureSum.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                        </div>
                    </div>
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                        <div className="text-sm text-amber-600 dark:text-amber-400 mb-1">{t('invoicing.trend')}</div>
                        <div className="text-2xl font-bold text-amber-700 dark:text-amber-300 flex items-center gap-2">
                            {metrics.trendLabel}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
