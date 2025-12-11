import React, { useState } from 'react';
import { Download, Upload, FileText, AlertTriangle, CheckCircle, Plus, RefreshCw, DollarSign } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useLanguage } from '../../contexts/LanguageContext';
import Modal from './Modal';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ImportExportModal: React.FC<ImportExportModalProps> = ({ isOpen, onClose }) => {
  const {
    notes, goals, plans, drawings, subscriptions, transactions, budgetSettings,
    addNote, addGoal, addPlan, addDrawing, addSubscription, addTransaction, updateBudgetSettings,
    clearAllData
  } = useData();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [exportType, setExportType] = useState<'all' | 'tasks' | 'budget'>('all');
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [importData, setImportData] = useState('');
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [importMessage, setImportMessage] = useState('');

  const exportData = () => {
    let data: any = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      exportType,
      data: {},
      stats: {}
    };

    if (exportType === 'all') {
      data.data = { notes, goals, plans, drawings, subscriptions, transactions, budgetSettings };
      data.stats = {
        totalNotes: notes.length,
        totalGoals: goals.length,
        totalPlans: plans.length,
        totalDrawings: drawings.length,
        totalSubscriptions: subscriptions.length,
        totalTransactions: transactions.length
      };
    } else if (exportType === 'tasks') {
      data.data = { notes, goals, plans, drawings };
      data.stats = {
        totalNotes: notes.length,
        totalGoals: goals.length,
        totalPlans: plans.length,
        totalDrawings: drawings.length
      };
    } else if (exportType === 'budget') {
      data.data = { subscriptions, transactions, budgetSettings };
      data.stats = {
        totalSubscriptions: subscriptions.length,
        totalTransactions: transactions.length
      };
    }

    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `contentplanner-${exportType}-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    try {
      setImportStatus('idle');
      setImportMessage('');

      if (!importData.trim()) {
        setImportStatus('error');
        setImportMessage(t('import.errorEmpty'));
        return;
      }

      const parsedData = JSON.parse(importData);

      // Validate data structure
      if (!parsedData.data || typeof parsedData.data !== 'object') {
        setImportStatus('error');
        setImportMessage(t('import.errorInvalid'));
        return;
      }

      const {
        notes: importNotes = [],
        goals: importGoals = [],
        plans: importPlans = [],
        drawings: importDrawings = [],
        subscriptions: importSubscriptions = [],
        transactions: importTransactions = [],
        budgetSettings: importBudgetSettings
      } = parsedData.data;

      let importedCount = 0;

      // Replace mode - clear all existing data first
      if (importMode === 'replace') {
        clearAllData();
      }

      // Import notes
      if (Array.isArray(importNotes)) {
        importNotes.forEach((note: any) => {
          if (note.title && note.content) {
            addNote({
              title: note.title,
              content: note.content,
              tags: Array.isArray(note.tags) ? note.tags : [],
              linkedPlans: Array.isArray(note.linkedPlans) ? note.linkedPlans : []
            });
            importedCount++;
          }
        });
      }

      // Import goals
      if (Array.isArray(importGoals)) {
        importGoals.forEach((goal: any) => {
          if (goal.title && goal.targetDate) {
            addGoal({
              title: goal.title,
              description: goal.description || '',
              targetDate: new Date(goal.targetDate),
              progress: typeof goal.progress === 'number' ? goal.progress : 0,
              status: ['not-started', 'in-progress', 'completed', 'paused'].includes(goal.status) ? goal.status : 'not-started'
            });
            importedCount++;
          }
        });
      }

      // Import plans
      if (Array.isArray(importPlans)) {
        importPlans.forEach((plan: any) => {
          if (plan.title && plan.date) {
            addPlan({
              title: plan.title,
              description: plan.description || '',
              date: new Date(plan.date),
              startTime: plan.startTime ? new Date(plan.startTime) : undefined,
              endTime: plan.endTime ? new Date(plan.endTime) : undefined,
              completed: Boolean(plan.completed),
              priority: ['low', 'medium', 'high'].includes(plan.priority) ? plan.priority : 'medium',
              linkedNotes: Array.isArray(plan.linkedNotes) ? plan.linkedNotes : []
            });
            importedCount++;
          }
        });
      }

      // Import drawings
      if (Array.isArray(importDrawings)) {
        importDrawings.forEach((drawing: any) => {
          if (drawing.title && drawing.data) {
            addDrawing({
              title: drawing.title,
              data: drawing.data
            });
            importedCount++;
          }
        });
      }

      // Import subscriptions
      if (Array.isArray(importSubscriptions)) {
        importSubscriptions.forEach((subscription: any) => {
          if (subscription.name && subscription.cost && subscription.nextPayment) {
            addSubscription({
              name: subscription.name,
              description: subscription.description || '',
              cost: subscription.cost,
              currency: subscription.currency || 'USD',
              billingCycle: ['monthly', 'yearly', 'weekly', 'daily', 'one-time'].includes(subscription.billingCycle) ? subscription.billingCycle : 'monthly',
              nextPayment: new Date(subscription.nextPayment),
              isActive: Boolean(subscription.isActive),
              category: subscription.category || 'Other'
            });
            importedCount++;
          }
        });
      }

      // Import transactions
      if (Array.isArray(importTransactions)) {
        importTransactions.forEach((transaction: any) => {
          if (transaction.amount && transaction.description && transaction.date) {
            addTransaction({
              amount: transaction.amount,
              description: transaction.description,
              date: new Date(transaction.date),
              type: ['income', 'expense', 'subscription'].includes(transaction.type) ? transaction.type : 'expense',
              category: transaction.category || 'Other',
              subscriptionId: transaction.subscriptionId
            });
            importedCount++;
          }
        });
      }

      // Import budget settings
      if (importBudgetSettings && typeof importBudgetSettings === 'object') {
        updateBudgetSettings({
          monthlyBudget: importBudgetSettings.monthlyBudget || 0,
          currency: importBudgetSettings.currency || 'USD',
          notifications: Boolean(importBudgetSettings.notifications),
          warningThreshold: importBudgetSettings.warningThreshold || 80
        });
        importedCount++;
      }

      setImportStatus('success');
      setImportMessage(`${t('import.successPrefix')} ${importedCount} ${t('import.items')}! ${importMode === 'replace' ? t('import.replacedMsg') : t('import.mergedMsg')}`);
      setImportData('');

    } catch (error) {
      setImportStatus('error');
      setImportMessage(t('import.errorInvalid'));
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setImportData(content);
    };
    reader.readAsText(file);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('import.title')} maxWidth="2xl">
      <div className="space-y-6">
        {/* Tabs */}
        <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('export')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors duration-200 ${activeTab === 'export'
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
          >
            <Download size={16} className="inline mr-2" />
            {t('import.exportData')}
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors duration-200 ${activeTab === 'import'
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
          >
            <Upload size={16} className="inline mr-2" />
            {t('import.importData')}
          </button>
        </div>

        {activeTab === 'export' && (
          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
                {t('import.exportTitle')}
              </h3>
              <p className="text-blue-700 dark:text-blue-300 text-sm mb-4">
                {t('import.exportDesc')}
              </p>

              {/* Export Type Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                  {t('import.whatToExport')}
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <button
                    onClick={() => setExportType('all')}
                    className={`p-3 rounded-lg border-2 transition-all duration-200 ${exportType === 'all'
                        ? 'border-blue-500 bg-blue-100 dark:bg-blue-800/20'
                        : 'border-blue-200 dark:border-blue-700 hover:border-blue-400'
                      }`}
                  >
                    <FileText size={20} className="mx-auto mb-2 text-blue-600 dark:text-blue-400" />
                    <div className="font-medium text-blue-900 dark:text-blue-100">{t('import.everything')}</div>
                    <div className="text-sm text-blue-700 dark:text-blue-300">{t('import.everythingDesc')}</div>
                  </button>

                  <button
                    onClick={() => setExportType('tasks')}
                    className={`p-3 rounded-lg border-2 transition-all duration-200 ${exportType === 'tasks'
                        ? 'border-blue-500 bg-blue-100 dark:bg-blue-800/20'
                        : 'border-blue-200 dark:border-blue-700 hover:border-blue-400'
                      }`}
                  >
                    <CheckCircle size={20} className="mx-auto mb-2 text-blue-600 dark:text-blue-400" />
                    <div className="font-medium text-blue-900 dark:text-blue-100">{t('import.tasksOnly')}</div>
                    <div className="text-sm text-blue-700 dark:text-blue-300">{t('import.tasksOnlyDesc')}</div>
                  </button>

                  <button
                    onClick={() => setExportType('budget')}
                    className={`p-3 rounded-lg border-2 transition-all duration-200 ${exportType === 'budget'
                        ? 'border-blue-500 bg-blue-100 dark:bg-blue-800/20'
                        : 'border-blue-200 dark:border-blue-700 hover:border-blue-400'
                      }`}
                  >
                    <DollarSign size={20} className="mx-auto mb-2 text-blue-600 dark:text-blue-400" />
                    <div className="font-medium text-blue-900 dark:text-blue-100">{t('import.budgetOnly')}</div>
                    <div className="text-sm text-blue-700 dark:text-blue-300">{t('import.budgetOnlyDesc')}</div>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
                {(exportType === 'all' || exportType === 'tasks') && (
                  <>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{notes.length}</div>
                      <div className="text-sm text-blue-700 dark:text-blue-300">{t('import.notes')}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{goals.length}</div>
                      <div className="text-sm text-blue-700 dark:text-blue-300">{t('import.goals')}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{plans.length}</div>
                      <div className="text-sm text-blue-700 dark:text-blue-300">{t('import.plans')}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{drawings.length}</div>
                      <div className="text-sm text-blue-700 dark:text-blue-300">{t('import.drawings')}</div>
                    </div>
                  </>
                )}
                {(exportType === 'all' || exportType === 'budget') && (
                  <>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{subscriptions.length}</div>
                      <div className="text-sm text-blue-700 dark:text-blue-300">{t('import.subscriptions')}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{transactions.length}</div>
                      <div className="text-sm text-blue-700 dark:text-blue-300">{t('import.transactions')}</div>
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={exportData}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors duration-200"
              >
                <Download size={20} />
                {exportType === 'all' ? t('import.exportAllData') :
                  exportType === 'tasks' ? t('import.exportTasks') :
                    t('import.exportBudgetData')}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'import' && (
          <div className="space-y-4">
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-2">
                {t('import.importData')}
              </h3>
              <p className="text-green-700 dark:text-green-300 text-sm mb-4">
                {t('import.exportDesc')}
              </p>

              {/* Import Mode Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('import.importMode')}
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <button
                    onClick={() => setImportMode('merge')}
                    className={`p-3 rounded-lg border-2 transition-all duration-200 ${importMode === 'merge'
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-green-300'
                      }`}
                  >
                    <Plus size={20} className="mx-auto mb-2 text-green-500" />
                    <div className="font-medium text-gray-900 dark:text-white">{t('import.addToExisting')}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{t('import.addToExistingDesc')}</div>
                  </button>

                  <button
                    onClick={() => setImportMode('replace')}
                    className={`p-3 rounded-lg border-2 transition-all duration-200 ${importMode === 'replace'
                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-orange-300'
                      }`}
                  >
                    <RefreshCw size={20} className="mx-auto mb-2 text-orange-500" />
                    <div className="font-medium text-gray-900 dark:text-white">{t('import.replaceAll')}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{t('import.replaceAllDesc')}</div>
                  </button>
                </div>
              </div>

              {/* File Upload */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('import.uploadJsonFile')}
                </label>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
                />
              </div>

              {/* Manual JSON Input */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('import.pasteJsonData')}
                </label>
                <textarea
                  value={importData}
                  onChange={(e) => setImportData(e.target.value)}
                  placeholder={t('import.pasteJsonPlaceholder')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
                  rows={8}
                />
              </div>

              {/* Import Status */}
              {importStatus !== 'idle' && (
                <div className={`p-3 rounded-lg mb-4 ${importStatus === 'success'
                    ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200'
                    : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200'
                  }`}>
                  <div className="flex items-center gap-2">
                    {importStatus === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                    <span className="font-medium">
                      {importStatus === 'success' ? t('import.importSuccessful') : t('import.importFailed')}
                    </span>
                  </div>
                  <p className="text-sm mt-1">{importMessage}</p>
                </div>
              )}

              {/* Warning for Replace Mode */}
              {importMode === 'replace' && (
                <div className="bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-200 p-3 rounded-lg mb-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={16} />
                    <span className="font-medium">{t('import.warningTitle')}</span>
                  </div>
                  <p className="text-sm mt-1">
                    {t('import.replaceWarning')}
                  </p>
                </div>
              )}

              <button
                onClick={handleImport}
                disabled={!importData.trim()}
                className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors duration-200"
              >
                <Upload size={20} />
                {t('import.importDataButton')} ({importMode === 'merge' ? t('import.addToExistingButton') : t('import.replaceAllButton')})
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ImportExportModal;