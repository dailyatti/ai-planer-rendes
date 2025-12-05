import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Timer, Coffee, Target } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNotifications } from '../../hooks/useNotifications';

type PomodoroMode = 'work' | 'shortBreak' | 'longBreak';

const PomodoroView: React.FC = () => {
  const { t } = useLanguage();
  const { permission, requestPermission, showNotification } = useNotifications();
  
  const [mode, setMode] = useState<PomodoroMode>('work');
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes in seconds
  const [isRunning, setIsRunning] = useState(false);
  const [completedPomodoros, setCompletedPomodoros] = useState(0);
  const [todayPomodoros, setTodayPomodoros] = useState(0);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const durations = {
    work: 25 * 60,
    shortBreak: 5 * 60,
    longBreak: 15 * 60,
  };

  // Load today's pomodoros from localStorage
  useEffect(() => {
    const today = new Date().toDateString();
    const savedData = localStorage.getItem('pomodoro-stats');
    if (savedData) {
      const stats = JSON.parse(savedData);
      if (stats.date === today) {
        setTodayPomodoros(stats.count || 0);
      } else {
        // New day, reset
        localStorage.setItem('pomodoro-stats', JSON.stringify({ date: today, count: 0 }));
      }
    }
  }, []);

  // Request notification permission on mount
  useEffect(() => {
    if (permission === 'default') {
      requestPermission();
    }
  }, [permission, requestPermission]);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      handleTimerComplete();
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, timeLeft]);

  const handleTimerComplete = () => {
    setIsRunning(false);
    
    // Play sound
    playSound();
    
    // Show notification
    if (mode === 'work') {
      showNotification({
        title: '🎉 Pomodoro Complete!',
        body: 'Great work! Time for a break.',
        requireInteraction: true,
      });
      
      // Update stats
      const newCount = todayPomodoros + 1;
      setTodayPomodoros(newCount);
      setCompletedPomodoros(completedPomodoros + 1);
      
      const today = new Date().toDateString();
      localStorage.setItem('pomodoro-stats', JSON.stringify({ date: today, count: newCount }));
      
      // Auto-switch to break
      if ((completedPomodoros + 1) % 4 === 0) {
        switchMode('longBreak');
      } else {
        switchMode('shortBreak');
      }
    } else {
      showNotification({
        title: '☕ Break Complete!',
        body: 'Ready to start another pomodoro?',
        requireInteraction: true,
      });
      switchMode('work');
    }
  };

  const playSound = () => {
    // Create a simple beep sound using Web Audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  };

  const switchMode = (newMode: PomodoroMode) => {
    setMode(newMode);
    setTimeLeft(durations[newMode]);
    setIsRunning(false);
  };

  const toggleTimer = () => {
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(durations[mode]);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = ((durations[mode] - timeLeft) / durations[mode]) * 100;

  const getModeLabel = () => {
    if (mode === 'work') return t('pomodoro.focusTime');
    if (mode === 'shortBreak') return t('pomodoro.shortBreak');
    return t('pomodoro.longBreak');
  };

  return (
    <div className="p-3 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-4 md:mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Timer className="text-red-500" size={28} />
          {t('pomodoro.title')}
        </h1>
        <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mt-1 md:mt-2">
          {t('pomodoro.subtitle')}
        </p>
      </div>

      {/* Stats - Responsive Grid */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 mb-4 md:mb-6">
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg md:rounded-xl p-3 md:p-5 text-white">
          <div className="flex items-center gap-1 md:gap-2 mb-1 md:mb-2">
            <Target size={16} className="md:w-5 md:h-5" />
            <span className="text-xs md:text-sm opacity-90">{t('pomodoro.today')}</span>
          </div>
          <div className="text-2xl md:text-3xl font-bold">{todayPomodoros}</div>
          <div className="text-xs md:text-sm opacity-90">{t('pomodoro.pomodoros')}</div>
        </div>
        
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg md:rounded-xl p-3 md:p-5 text-white">
          <div className="flex items-center gap-1 md:gap-2 mb-1 md:mb-2">
            <Coffee size={16} className="md:w-5 md:h-5" />
            <span className="text-xs md:text-sm opacity-90">{t('pomodoro.session')}</span>
          </div>
          <div className="text-2xl md:text-3xl font-bold">{completedPomodoros}</div>
          <div className="text-xs md:text-sm opacity-90">{t('pomodoro.completed')}</div>
        </div>
      </div>

      {/* Mode Selector - Responsive */}
      <div className="bg-white dark:bg-gray-800 rounded-lg md:rounded-xl shadow-lg p-2 md:p-4 mb-4 md:mb-6">
        <div className="flex gap-1 md:gap-2">
          <button
            onClick={() => switchMode('work')}
            className={`flex-1 py-2 md:py-3 px-2 md:px-4 rounded-md md:rounded-lg text-xs md:text-base font-medium transition-all ${
              mode === 'work'
                ? 'bg-red-500 text-white shadow-md'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {t('pomodoro.work')}
          </button>
          <button
            onClick={() => switchMode('shortBreak')}
            className={`flex-1 py-2 md:py-3 px-2 md:px-4 rounded-md md:rounded-lg text-xs md:text-base font-medium transition-all ${
              mode === 'shortBreak'
                ? 'bg-green-500 text-white shadow-md'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {t('pomodoro.shortBreak')}
          </button>
          <button
            onClick={() => switchMode('longBreak')}
            className={`flex-1 py-2 md:py-3 px-2 md:px-4 rounded-md md:rounded-lg text-xs md:text-base font-medium transition-all ${
              mode === 'longBreak'
                ? 'bg-blue-500 text-white shadow-md'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {t('pomodoro.longBreak')}
          </button>
        </div>
      </div>

      {/* Timer Display - Optimized for Mobile and Desktop */}
      <div className="bg-white dark:bg-gray-800 rounded-lg md:rounded-xl shadow-lg p-4 md:p-8 mb-4 md:mb-6">
        <div className="relative max-w-sm mx-auto">
          {/* Progress Circle - Responsive */}
          <svg className="w-full h-auto" viewBox="0 0 200 200" style={{ maxWidth: '400px', margin: '0 auto' }}>
            <circle
              cx="100"
              cy="100"
              r="90"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-gray-200 dark:text-gray-700"
            />
            <circle
              cx="100"
              cy="100"
              r="90"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              strokeLinecap="round"
              className={`${
                mode === 'work'
                  ? 'text-red-500'
                  : mode === 'shortBreak'
                  ? 'text-green-500'
                  : 'text-blue-500'
              }`}
              strokeDasharray={`${2 * Math.PI * 90}`}
              strokeDashoffset={`${2 * Math.PI * 90 * (1 - progress / 100)}`}
              transform="rotate(-90 100 100)"
              style={{ transition: 'stroke-dashoffset 1s linear' }}
            />
          </svg>
          
          {/* Time Display - Responsive Text */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-1 md:mb-2">
                {formatTime(timeLeft)}
              </div>
              <div className="text-sm md:text-lg text-gray-600 dark:text-gray-400">
                {getModeLabel()}
              </div>
            </div>
          </div>
        </div>

        {/* Controls - Responsive Buttons */}
        <div className="flex justify-center gap-2 md:gap-4 mt-6 md:mt-8">
          <button
            onClick={toggleTimer}
            className={`flex items-center gap-1 md:gap-2 px-4 md:px-8 py-3 md:py-4 rounded-lg md:rounded-xl text-sm md:text-base font-medium text-white shadow-lg transition-all hover:scale-105 active:scale-95 ${
              mode === 'work'
                ? 'bg-red-500 hover:bg-red-600'
                : mode === 'shortBreak'
                ? 'bg-green-500 hover:bg-green-600'
                : 'bg-blue-500 hover:bg-blue-600'
            }`}
          >
            {isRunning ? (
              <>
                <Pause size={20} className="md:w-6 md:h-6" />
                <span className="hidden sm:inline">{t('pomodoro.pause')}</span>
              </>
            ) : (
              <>
                <Play size={20} className="md:w-6 md:h-6" />
                <span className="hidden sm:inline">{t('pomodoro.start')}</span>
              </>
            )}
          </button>
          
          <button
            onClick={resetTimer}
            className="flex items-center gap-1 md:gap-2 px-4 md:px-6 py-3 md:py-4 rounded-lg md:rounded-xl text-sm md:text-base font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-all active:scale-95"
          >
            <RotateCcw size={18} className="md:w-5 md:h-5" />
            <span className="hidden sm:inline">{t('pomodoro.reset')}</span>
          </button>
        </div>
      </div>

      {/* Instructions - Responsive */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg md:rounded-xl p-4 md:p-6 border border-blue-200 dark:border-blue-800">
        <h3 className="text-base md:text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3 md:mb-4">
          {t('pomodoro.tipsTitle')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
          <div className="flex items-start gap-2 text-xs md:text-sm text-blue-800 dark:text-blue-200">
            <span className="font-bold text-blue-600 dark:text-blue-400 mt-0.5">•</span>
            <span>{t('pomodoro.tip1')}</span>
          </div>
          <div className="flex items-start gap-2 text-xs md:text-sm text-blue-800 dark:text-blue-200">
            <span className="font-bold text-blue-600 dark:text-blue-400 mt-0.5">•</span>
            <span>{t('pomodoro.tip2')}</span>
          </div>
          <div className="flex items-start gap-2 text-xs md:text-sm text-blue-800 dark:text-blue-200">
            <span className="font-bold text-blue-600 dark:text-blue-400 mt-0.5">•</span>
            <span>{t('pomodoro.tip3')}</span>
          </div>
          <div className="flex items-start gap-2 text-xs md:text-sm text-blue-800 dark:text-blue-200">
            <span className="font-bold text-blue-600 dark:text-blue-400 mt-0.5">•</span>
            <span>{t('pomodoro.tip4')}</span>
          </div>
          <div className="flex items-start gap-2 text-xs md:text-sm text-blue-800 dark:text-blue-200">
            <span className="font-bold text-blue-600 dark:text-blue-400 mt-0.5">•</span>
            <span>{t('pomodoro.tip5')}</span>
          </div>
          <div className="flex items-start gap-2 text-xs md:text-sm text-blue-800 dark:text-blue-200">
            <span className="font-bold text-blue-600 dark:text-blue-400 mt-0.5">•</span>
            <span>{t('pomodoro.tip6')}</span>
          </div>
          <div className="flex items-start gap-2 text-xs md:text-sm text-blue-800 dark:text-blue-200">
            <span className="font-bold text-blue-600 dark:text-blue-400 mt-0.5">•</span>
            <span>{t('pomodoro.tip7')}</span>
          </div>
          <div className="flex items-start gap-2 text-xs md:text-sm text-blue-800 dark:text-blue-200">
            <span className="font-bold text-blue-600 dark:text-blue-400 mt-0.5">•</span>
            <span>{t('pomodoro.tip8')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PomodoroView;

