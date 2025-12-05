import React, { useState } from 'react';
import {
    Link2, Check, X, ExternalLink, RefreshCw,
    Calendar, FileText, CheckSquare, Mail,
    Cloud, Shield, Settings, AlertCircle,
    ChevronRight, Zap, Clock
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Integration } from '../../types/planner';

const IntegrationsView: React.FC = () => {
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState<'available' | 'connected' | 'settings'>('available');

    // Mock integrations - will be replaced with context
    const availableIntegrations = [
        {
            id: 'google-calendar',
            name: 'Google Calendar',
            description: 'Sync your plans and events with Google Calendar automatically.',
            icon: Calendar,
            color: 'from-red-500 to-orange-500',
            connected: false,
            features: ['Two-way sync', 'Event import/export', 'Reminders'],
        },
        {
            id: 'notion',
            name: 'Notion',
            description: 'Connect your Notion workspace for seamless note and task management.',
            icon: FileText,
            color: 'from-gray-700 to-gray-900',
            connected: false,
            features: ['Database sync', 'Page import', 'Block conversion'],
        },
        {
            id: 'todoist',
            name: 'Todoist',
            description: 'Import and sync your Todoist tasks with ContentPlanner Pro.',
            icon: CheckSquare,
            color: 'from-red-500 to-red-600',
            connected: false,
            features: ['Task sync', 'Project import', 'Label mapping'],
        },
        {
            id: 'outlook',
            name: 'Microsoft Outlook',
            description: 'Integrate with Outlook calendar and tasks for Windows users.',
            icon: Mail,
            color: 'from-blue-500 to-blue-700',
            connected: false,
            features: ['Calendar sync', 'Task integration', 'Contacts'],
        },
    ];

    const handleConnect = (integrationId: string) => {
        // This will handle OAuth flow in the future
        console.log('Connecting to:', integrationId);
        // Would open OAuth popup window
    };

    return (
        <div className="view-container">
            {/* Header */}
            <div className="mb-8">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="view-title flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/30">
                                <Link2 size={24} className="text-white" />
                            </div>
                            Integrations
                        </h1>
                        <p className="view-subtitle">
                            Connect your favorite apps to supercharge your productivity
                        </p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="mt-6">
                    <div className="tab-group">
                        {[
                            { id: 'available', label: 'Available', icon: Zap },
                            { id: 'connected', label: 'Connected', icon: Check },
                            { id: 'settings', label: 'Settings', icon: Settings },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`tab-item ${activeTab === tab.id ? 'active' : ''}`}
                            >
                                <tab.icon size={16} className="inline mr-2" />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Available Integrations */}
            {activeTab === 'available' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                    {availableIntegrations.map((integration) => {
                        const Icon = integration.icon;
                        return (
                            <div key={integration.id} className="card hover-lift">
                                <div className="flex items-start gap-4">
                                    <div className={`p-3 rounded-xl bg-gradient-to-br ${integration.color} shadow-lg`}>
                                        <Icon size={24} className="text-white" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                                                {integration.name}
                                            </h3>
                                            {integration.connected ? (
                                                <span className="badge badge-success">
                                                    <Check size={12} />
                                                    Connected
                                                </span>
                                            ) : (
                                                <span className="badge bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                                                    Not connected
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                            {integration.description}
                                        </p>

                                        {/* Features */}
                                        <div className="flex flex-wrap gap-2 mb-4">
                                            {integration.features.map((feature, idx) => (
                                                <span
                                                    key={idx}
                                                    className="inline-flex items-center px-2 py-1 rounded-md 
                                   bg-gray-100 dark:bg-gray-700/50 
                                   text-xs text-gray-600 dark:text-gray-400"
                                                >
                                                    {feature}
                                                </span>
                                            ))}
                                        </div>

                                        <button
                                            onClick={() => handleConnect(integration.id)}
                                            className={integration.connected ? 'btn-secondary w-full' : 'btn-primary w-full'}
                                        >
                                            {integration.connected ? (
                                                <>
                                                    <Settings size={16} />
                                                    Manage
                                                </>
                                            ) : (
                                                <>
                                                    <ExternalLink size={16} />
                                                    Connect
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Connected Tab */}
            {activeTab === 'connected' && (
                <div className="animate-fade-in">
                    <div className="card text-center py-12">
                        <Cloud size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                            No Integrations Connected
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
                            Connect your first integration to see it here. Your connected apps will sync automatically.
                        </p>
                        <button
                            onClick={() => setActiveTab('available')}
                            className="btn-primary"
                        >
                            <Zap size={18} />
                            Browse Integrations
                        </button>
                    </div>
                </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="card">
                        <h3 className="section-title flex items-center gap-2">
                            <RefreshCw size={20} className="text-primary-500" />
                            Sync Settings
                        </h3>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                                <div>
                                    <p className="font-medium text-gray-900 dark:text-white">Auto-sync interval</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">How often to sync with connected apps</p>
                                </div>
                                <select className="input-field max-w-[160px] py-2">
                                    <option>Every 5 minutes</option>
                                    <option>Every 15 minutes</option>
                                    <option>Every hour</option>
                                    <option>Manual only</option>
                                </select>
                            </div>

                            <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                                <div>
                                    <p className="font-medium text-gray-900 dark:text-white">Conflict resolution</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">What to do when changes conflict</p>
                                </div>
                                <select className="input-field max-w-[180px] py-2">
                                    <option>Ask every time</option>
                                    <option>Keep local changes</option>
                                    <option>Keep remote changes</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="card">
                        <h3 className="section-title flex items-center gap-2">
                            <Shield size={20} className="text-primary-500" />
                            Security & Privacy
                        </h3>

                        <div className="p-4 rounded-xl bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800/30">
                            <div className="flex items-start gap-3">
                                <AlertCircle size={20} className="text-primary-600 dark:text-primary-400 mt-0.5" />
                                <div>
                                    <p className="font-medium text-primary-800 dark:text-primary-300">Your data is secure</p>
                                    <p className="text-sm text-primary-600 dark:text-primary-500 mt-1">
                                        All integration connections use OAuth 2.0 with encrypted tokens.
                                        We never store your passwords and you can revoke access anytime.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default IntegrationsView;
