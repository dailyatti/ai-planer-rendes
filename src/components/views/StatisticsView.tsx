import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';

import {
  BarChart3, TrendingUp, TrendingDown,
  Activity, Target, ArrowUpRight, ArrowDownRight,
  Download, X, Wallet, Clock
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart as RePieChart, Pie, Cell, Legend
} from 'recharts';
import { useLanguage } from '../../contexts/LanguageContext';

const StatisticsView: React.FC = () => {
  const { t } = useLanguage();
  const [timeRange, setTimeRange] = useState('month');
  const [showFinancialModal, setShowFinancialModal] = useState(false);
  const [projectionMonths, setProjectionMonths] = useState(6);

  // Mock Data for PhD-Level Charts
  const productivityData = [
    { name: t('days.short.monday'), completed: 8, planned: 10, focus: 85 },
    { name: t('days.short.tuesday'), completed: 12, planned: 12, focus: 92 },
    { name: t('days.short.wednesday'), completed: 7, planned: 9, focus: 78 },
    { name: t('days.short.thursday'), completed: 10, planned: 11, focus: 88 },
    { name: t('days.short.friday'), completed: 9, planned: 10, focus: 82 },
    { name: t('days.short.saturday'), completed: 5, planned: 6, focus: 75 },
    { name: t('days.short.sunday'), completed: 4, planned: 4, focus: 90 },
  ];

  const categoryData = [
    { name: t('statistics.categories.contentCreation'), value: 35, color: '#4361ee' },
    { name: t('statistics.categories.planning'), value: 20, color: '#a855f7' },
    { name: t('statistics.categories.meetings'), value: 15, color: '#06b6d4' },
    { name: t('statistics.categories.admin'), value: 10, color: '#f59e0b' },
    { name: t('statistics.categories.learning'), value: 20, color: '#10b981' },
  ];

  const focusTrendData = [
    { time: '09:00', score: 95 },
    { time: '11:00', score: 88 },
    { time: '13:00', score: 75 },
    { time: '15:00', score: 82 },
    { time: '17:00', score: 90 },
  ];

  // Use financial helpers from DataContext
  const { computeProjection, computeRunway } = useData();

  return (
    <div className="view-container">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="view-title flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 shadow-lg shadow-indigo-500/30">
              <BarChart3 size={24} className="text-white" />
            </div>
            {t('statistics.title')}
          </h1>
          <p className="view-subtitle">
            {t('statistics.subtitle')}
          </p>
        </div>
        {/* Financial Model Button */}
        <button
          className="btn-primary px-4 py-2"
          onClick={() => setShowFinancialModal(true)}
        >
          {t('statistics.financialModelButton') || 'Financial Model'}
        </button>

        <div className="flex items-center gap-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="input-field max-w-[140px] py-2"
          >
            <option value="week">{t('statistics.thisWeek')}</option>
            <option value="month">{t('statistics.thisMonth')}</option>
            <option value="year">{t('statistics.thisYear')}</option>
          </select>
          <button className="btn-secondary p-2.5">
            <Download size={20} />
          </button>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="stat-card stat-card-primary">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium opacity-90">{t('statistics.productivityScore')}</span>
              <Activity size={20} className="opacity-80" />
            </div>
            <div className="text-3xl font-bold">87%</div>
            <div className="text-sm opacity-80 mt-1 flex items-center gap-1">
              <ArrowUpRight size={14} /> +5% {t('statistics.vsLastWeek')}
            </div>
          </div>
        </div>

        <div className="stat-card stat-card-success">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium opacity-90">{t('statistics.tasksCompleted')}</span>
              <Target size={20} className="opacity-80" />
            </div>
            <div className="text-3xl font-bold">45</div>
            <div className="text-sm opacity-80 mt-1 flex items-center gap-1">
              <ArrowUpRight size={14} /> 12 {t('statistics.moreThanPlanned')}
            </div>
          </div>
        </div>

        <div className="stat-card stat-card-accent">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium opacity-90">{t('statistics.focusTime')}</span>
              <TrendingUp size={20} className="opacity-80" />
            </div>
            <div className="text-3xl font-bold">32h</div>
            <div className="text-sm opacity-80 mt-1">{t('statistics.avgPerDay')} 6.4h</div>
          </div>
        </div>

        <div className="stat-card stat-card-warning">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium opacity-90">{t('statistics.interruptions')}</span>
              <TrendingDown size={20} className="opacity-80" />
            </div>
            <div className="text-3xl font-bold">12</div>
            <div className="text-sm opacity-80 mt-1 flex items-center gap-1">
              <ArrowDownRight size={14} /> -3 {t('statistics.vsLastWeek')}
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Productivity Trend */}
        <div className="card">
          <h3 className="section-title mb-6">{t('statistics.productivityTrend')}</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={productivityData}>
                <defs>
                  <linearGradient id="colorFocus" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4361ee" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#4361ee" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    borderRadius: '12px',
                    border: 'none',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="focus"
                  stroke="#4361ee"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorFocus)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Task Completion */}
        <div className="card">
          <h3 className="section-title mb-6">{t('statistics.plannedVsCompleted')}</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={productivityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280' }} />
                <Tooltip
                  cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    borderRadius: '12px',
                    border: 'none',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Legend iconType="circle" />
                <Bar dataKey="planned" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
                <Bar dataKey="completed" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Time Distribution */}
        <div className="card">
          <h3 className="section-title mb-6">{t('statistics.timeDistribution')}</h3>
          <div className="h-[300px] w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="middle" align="right" layout="vertical" />
              </RePieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Focus Quality */}
        <div className="card">
          <h3 className="section-title mb-6">{t('statistics.dailyFocusQuality')}</h3>
          <div className="space-y-4">
            {focusTrendData.map((item, index) => (
              <div key={index} className="flex items-center gap-4">
                <span className="text-sm font-medium text-gray-500 w-12">{item.time}</span>
                <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full"
                    style={{ width: `${item.score}%` }}
                  />
                </div>
                <span className="text-sm font-bold text-gray-700">{item.score}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Financial Model Modal - Professionally Redesigned */}
      {showFinancialModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowFinancialModal(false)}
        >
          <div
            className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl">
                    <Wallet size={24} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      {t('statistics.financialModel') || 'Pénzügyi Modell'}
                    </h2>
                    <p className="text-white/80 text-sm">
                      {t('statistics.financialModelDesc') || 'Cash-flow előrejelzés és kifutópálya'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowFinancialModal(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X size={20} className="text-white" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(85vh-100px)]">
              {/* Projection Controls */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('statistics.projectionMonths') || 'Előrejelzés időtartama (hónap)'}
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="1"
                    max="24"
                    value={projectionMonths}
                    onChange={e => setProjectionMonths(parseInt(e.target.value))}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <span className="w-12 text-center font-bold text-indigo-600 text-lg">
                    {projectionMonths}
                  </span>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {/* Runway Card */}
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30 rounded-xl p-5 border border-emerald-200 dark:border-emerald-800">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-emerald-500 rounded-lg">
                      <Clock size={18} className="text-white" />
                    </div>
                    <span className="font-medium text-emerald-800 dark:text-emerald-200">
                      {t('statistics.runway') || 'Kifutópálya'}
                    </span>
                  </div>
                  <div className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">
                    {computeRunway() !== null ? `${computeRunway()} ${t('statistics.months') || 'hónap'}` : 'N/A'}
                  </div>
                  <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-1">
                    {t('statistics.runwayDesc') || 'Jelenlegi égetési rátával'}
                  </p>
                </div>

                {/* Trend Card */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-xl p-5 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-blue-500 rounded-lg">
                      <TrendingUp size={18} className="text-white" />
                    </div>
                    <span className="font-medium text-blue-800 dark:text-blue-200">
                      {t('statistics.cashFlowTrend') || 'Cash-flow Trend'}
                    </span>
                  </div>
                  <div className="text-3xl font-bold text-blue-700 dark:text-blue-300">
                    {(() => {
                      const proj = computeProjection(projectionMonths);
                      const lastVal = proj[proj.length - 1] || 0;
                      return lastVal >= 0 ? `+${Math.round(lastVal).toLocaleString()}` : Math.round(lastVal).toLocaleString();
                    })()}
                  </div>
                  <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                    {t('statistics.projectedBalance') || `Előrejelzett egyenleg ${projectionMonths} hónap múlva`}
                  </p>
                </div>
              </div>

              {/* Projection Chart */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                  {t('statistics.cashFlowProjection') || 'Cash-flow Előrejelzés'}
                </h3>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={computeProjection(projectionMonths).map((val, idx) => ({ month: idx + 1, value: Math.round(val) }))}>
                      <defs>
                        <linearGradient id="colorProjection" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                      <XAxis
                        dataKey="month"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#6b7280', fontSize: 12 }}
                        tickFormatter={(val) => `${val}. hó`}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#6b7280', fontSize: 12 }}
                        tickFormatter={(val) => val.toLocaleString()}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          borderRadius: '12px',
                          border: 'none',
                          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
                        }}
                        formatter={(value: number) => [value.toLocaleString(), 'Előrejelzés']}
                        labelFormatter={(label) => `${label}. hónap`}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#6366f1"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorProjection)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Info Text */}
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 text-center">
                {t('statistics.projectionDisclaimer') || 'Az előrejelzés a múltbeli tranzakciók lineáris regresszióján alapul.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatisticsView;
