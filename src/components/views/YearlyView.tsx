import React, { useState } from 'react';
import { Plus, CalendarCheck, ChevronLeft, ChevronRight, TrendingUp, Target, CheckCircle, Calendar } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useLanguage } from '../../contexts/LanguageContext';

const YearlyView: React.FC = () => {
  const { plans, goals } = useData();
  const { t } = useLanguage();
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const navigateYear = (direction: 'prev' | 'next') => {
    setCurrentYear(prev => prev + (direction === 'next' ? 1 : -1));
    setSelectedMonth(null); // Reset selection when changing year
  };

  const getMonthData = (monthIndex: number) => {
    const monthPlans = plans.filter(plan => {
      const planDate = new Date(plan.date);
      return planDate.getFullYear() === currentYear && planDate.getMonth() === monthIndex;
    });

    const completed = monthPlans.filter(plan => plan.completed).length;
    const total = monthPlans.length;
    const completionRate = total > 0 ? (completed / total) * 100 : 0;

    return { total, completed, completionRate, plans: monthPlans };
  };

  const handleMonthClick = (monthIndex: number) => {
    setSelectedMonth(selectedMonth === monthIndex ? null : monthIndex);
  };

  const yearlyGoals = goals.filter(goal => {
    const targetYear = new Date(goal.targetDate).getFullYear();
    return targetYear === currentYear;
  });

  const yearlyStats = {
    totalPlans: plans.filter(plan => new Date(plan.date).getFullYear() === currentYear).length,
    completedPlans: plans.filter(plan => 
      new Date(plan.date).getFullYear() === currentYear && plan.completed
    ).length,
    activeGoals: yearlyGoals.filter(goal => goal.status === 'in-progress').length,
    completedGoals: yearlyGoals.filter(goal => goal.status === 'completed').length,
  };

  const yearlyCompletionRate = yearlyStats.totalPlans > 0 
    ? (yearlyStats.completedPlans / yearlyStats.totalPlans) * 100 
    : 0;

  return (
    <div className="view-container">
      {/* Header Section */}
      <div className="mb-6 md:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 md:mb-6">
          <div>
            <h1 className="view-title flex items-center gap-2 md:gap-3">
              <CalendarCheck className="text-red-500 w-6 h-6 md:w-8 md:h-8" />
              Yearly Overview
            </h1>
            <p className="view-subtitle">
              Long-term strategic planning and goal tracking analysis
            </p>
          </div>

          {/* Year Navigation */}
          <div className="flex items-center gap-3 md:gap-4">
            <button
              onClick={() => navigateYear('prev')}
              className="touch-target p-2 md:p-3 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-200 active-scale focus-ring"
              aria-label="Previous year"
            >
              <ChevronLeft size={20} className="md:w-6 md:h-6" />
            </button>
            
            <div className="text-center min-w-20 md:min-w-24">
              <div className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                {currentYear}
              </div>
            </div>

            <button
              onClick={() => navigateYear('next')}
              className="touch-target p-2 md:p-3 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-200 active-scale focus-ring"
              aria-label="Next year"
            >
              <ChevronRight size={20} className="md:w-6 md:h-6" />
            </button>
          </div>
        </div>

        {/* Yearly Statistics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <div className="card-compact bg-gradient-to-r from-blue-500 to-purple-500 text-white border-none">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xl md:text-2xl font-bold">{yearlyStats.totalPlans}</div>
                <div className="text-xs md:text-sm opacity-90 mt-1">Total Plans</div>
              </div>
              <CalendarCheck size={20} className="opacity-80 md:w-6 md:h-6" />
            </div>
          </div>

          <div className="card-compact bg-gradient-to-r from-green-500 to-teal-500 text-white border-none">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xl md:text-2xl font-bold">{Math.round(yearlyCompletionRate)}%</div>
                <div className="text-xs md:text-sm opacity-90 mt-1">Completion</div>
              </div>
              <TrendingUp size={20} className="opacity-80 md:w-6 md:h-6" />
            </div>
          </div>

          <div className="card-compact bg-gradient-to-r from-orange-500 to-red-500 text-white border-none">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xl md:text-2xl font-bold">{yearlyStats.activeGoals}</div>
                <div className="text-xs md:text-sm opacity-90 mt-1">Active Goals</div>
              </div>
              <Target size={20} className="opacity-80 md:w-6 md:h-6" />
            </div>
          </div>

          <div className="card-compact bg-gradient-to-r from-purple-500 to-pink-500 text-white border-none">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xl md:text-2xl font-bold">{yearlyStats.completedGoals}</div>
                <div className="text-xs md:text-sm opacity-90 mt-1">Achieved</div>
              </div>
              <CheckCircle size={20} className="opacity-80 md:w-6 md:h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Grid - Interactive */}
      <div className="card mb-6 md:mb-8">
        <h3 className="section-title mb-4 md:mb-6">
          Monthly Performance Overview
        </h3>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 md:gap-4">
          {months.map((month, index) => {
            const monthData = getMonthData(index);
            const isCurrentMonth = new Date().getFullYear() === currentYear && new Date().getMonth() === index;
            const isSelected = selectedMonth === index;
            
            return (
              <button
                key={month}
                onClick={() => handleMonthClick(index)}
                className={`
                  p-3 md:p-4 rounded-lg border-2 transition-all duration-200 
                  text-left w-full
                  min-h-[120px] md:min-h-[140px]
                  active-scale focus-ring
                  ${isSelected 
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20 shadow-lg scale-105' 
                    : isCurrentMonth 
                      ? 'border-red-400 bg-red-50/50 dark:bg-red-900/10 shadow-md' 
                      : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 hover:border-red-300 hover:shadow-md hover-lift'
                  }
                `}
                aria-pressed={isSelected}
                aria-label={`${month} - ${monthData.total} plans, ${Math.round(monthData.completionRate)}% complete`}
              >
                <div className="text-center mb-2 md:mb-3">
                  <div className={`text-sm md:text-lg font-bold ${
                    isSelected || isCurrentMonth ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'
                  }`}>
                    {month.substring(0, 3)}
                  </div>
                  <div className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {monthData.total} {monthData.total === 1 ? 'plan' : 'plans'}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-2">
                  <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                    <span>Progress</span>
                    <span className="font-medium">{Math.round(monthData.completionRate)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5 md:h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-red-500 to-orange-500 h-full rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${monthData.completionRate}%` }}
                    />
                  </div>
                </div>

                {/* Completion Stats */}
                <div className="text-center">
                  <div className="text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300">
                    {monthData.completed}/{monthData.total}
                  </div>
                </div>

                {/* Selection Indicator */}
                {isSelected && (
                  <div className="mt-2 flex justify-center">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Selected Month Details */}
        {selectedMonth !== null && (
          <div className="mt-6 p-4 md:p-6 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/10 dark:to-orange-900/10 rounded-lg border-2 border-red-200 dark:border-red-800 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Calendar className="text-red-500 w-5 h-5 md:w-6 md:h-6" />
                {months[selectedMonth]} {currentYear}
              </h4>
              <button
                onClick={() => setSelectedMonth(null)}
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Close
              </button>
            </div>

            {getMonthData(selectedMonth).plans.length > 0 ? (
              <div className="space-y-2">
                {getMonthData(selectedMonth).plans.slice(0, 5).map((plan) => (
                  <div
                    key={plan.id}
                    className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                  >
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      plan.completed ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm md:text-base font-medium truncate ${
                        plan.completed ? 'text-gray-500 dark:text-gray-400 line-through' : 'text-gray-900 dark:text-white'
                      }`}>
                        {plan.title}
                      </div>
                    </div>
                    <div className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ${
                      plan.priority === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' :
                      plan.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                      'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                    }`}>
                      {plan.priority}
                    </div>
                  </div>
                ))}
                {getMonthData(selectedMonth).plans.length > 5 && (
                  <div className="text-center text-sm text-gray-500 dark:text-gray-400 pt-2">
                    +{getMonthData(selectedMonth).plans.length - 5} more plans
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No plans for this month</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Goals Overview */}
      {yearlyGoals.length > 0 && (
        <div className="card">
          <h3 className="section-title mb-4 md:mb-6 flex items-center gap-2">
            <Target className="text-red-500 w-5 h-5 md:w-6 md:h-6" />
            {currentYear} Goals
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {yearlyGoals.map((goal) => (
              <div
                key={goal.id}
                className="card-compact hover:shadow-lg hover-lift transition-all duration-200"
              >
                <h4 className="font-semibold text-sm md:text-base text-gray-900 dark:text-white mb-2 line-clamp-2">
                  {goal.title}
                </h4>
                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                  {goal.description}
                </p>
                
                {/* Progress Bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                    <span>Progress</span>
                    <span className="font-medium">{goal.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5 md:h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-red-500 to-orange-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${goal.progress}%` }}
                    />
                  </div>
                </div>

                {/* Status and Date */}
                <div className="flex justify-between items-center text-xs">
                  <span className={`px-2 py-1 rounded-full font-medium ${
                    goal.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                    goal.status === 'in-progress' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' :
                    goal.status === 'paused' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                    'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                  }`}>
                    {goal.status === 'completed' ? 'Completed' :
                     goal.status === 'in-progress' ? 'In Progress' :
                     goal.status === 'paused' ? 'Paused' : 'Not Started'}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400">
                    {new Date(goal.targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default YearlyView;

