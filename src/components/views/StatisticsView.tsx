import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';

import {
  BarChart3, TrendingUp, TrendingDown,
  Activity, Target, ArrowUpRight, ArrowDownRight,
  Download
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
      {/* Financial Guide Modal */}
      {showFinancialModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-11/12 md:w-2/3 lg:w-1/2 max-h-[90vh] overflow-y-auto shadow-lg">
            <h2 className="text-xl font-bold mb-4">Financial Model</h2>
            <button
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
              onClick={() => setShowFinancialModal(false)}
            >
              ✕
            </button>
            <div className="mb-4">
              <label className="block mb-1 font-medium">Projection months:</label>
              <input
                type="number"
                min="1"
                value={projectionMonths}
                onChange={e => setProjectionMonths(parseInt(e.target.value) || 1)}
                className="border rounded px-2 py-1 w-20"
              />
            </div>
            <div className="mb-4">
              <h3 className="font-semibold mb-2">Cash‑flow projection</h3>
              <pre className="bg-gray-100 p-2 rounded">{JSON.stringify(computeProjection(projectionMonths), null, 2)}</pre>
            </div>
            <div className="mb-4">
              <h3 className="font-semibold mb-2">Runway (months)</h3>
              <p>{computeRunway() ?? 'N/A'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatisticsView;
