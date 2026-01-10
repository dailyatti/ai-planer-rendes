/**
 * WorkflowView.tsx
 *
 * The main entry point for the Project Workflow system.
 *
 * Architecture:
 * - "Dashboard Mode": Displays a grid of existing projects and options to create new ones.
 * - "Editor Mode": A full-screen interactive canvas for the selected project.
 *
 * This split design ensures a focused, "PhD-level" user experience where planning (dashboard)
 * is separated from execution (editor).
 */
import React, { useState, useMemo } from 'react';
import {
    GitBranch, Plus, Trash2, Layout,
    Package, Share2, Film, Search, ArrowLeft, X,
    CheckSquare, Flag, Globe, Video, Megaphone, StickyNote
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useData } from '../../contexts/DataContext';
import { WorkflowNode, WorkflowNodeType, NODE_TYPE_CONFIGS } from '../../types/workflow';
import { cloneTemplateForProject } from '../../data/workflowTemplates';
import WorkflowCanvas from '../workflow/WorkflowCanvas';

const WorkflowView: React.FC = () => {
    const { t } = useLanguage();
    const {
        workflows,
        workflowTemplates,
        addWorkflow,
        updateWorkflow,
        deleteWorkflow
    } = useData();

    // View State
    const [viewMode, setViewMode] = useState<'dashboard' | 'editor'>('dashboard');
    const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);

    // Filter/Search State (Dashboard)
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'planning' | 'active' | 'completed'>('all');

    // Modal State
    const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
    const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>(workflowTemplates[0]?.id || '');

    // Derived State
    const selectedWorkflow = useMemo(() =>
        workflows.find(w => w.id === selectedWorkflowId) || null
        , [workflows, selectedWorkflowId]);

    const filteredWorkflows = useMemo(() => {
        return workflows.filter(w => {
            const matchesSearch = w.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = filterStatus === 'all' || w.status === filterStatus;
            return matchesSearch && matchesStatus;
        });
    }, [workflows, searchTerm, filterStatus]);

    // Actions
    const handleCreateProject = () => {
        if (!newProjectName.trim()) return;

        const template = workflowTemplates.find(t => t.id === selectedTemplateId);
        if (!template) return;

        const newWorkflow = cloneTemplateForProject(template, newProjectName);
        addWorkflow(newWorkflow);

        setNewProjectName('');
        setIsNewProjectModalOpen(false);

        // Auto-open the new project
        setSelectedWorkflowId(newWorkflow.id);
        setViewMode('editor');
    };

    const handleDeleteProject = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm(t('workflow.confirmDelete'))) {
            deleteWorkflow(id);
            if (selectedWorkflowId === id) {
                setViewMode('dashboard');
                setSelectedWorkflowId(null);
            }
        }
    };

    const handleOpenProject = (id: string) => {
        setSelectedWorkflowId(id);
        setViewMode('editor');
    };

    const handleBackToDashboard = () => {
        setViewMode('dashboard');
        setSelectedWorkflowId(null);
    };

    const handleNodeAdd = (type: WorkflowNodeType, position: { x: number; y: number }) => {
        if (!selectedWorkflow) return;

        const newNode: WorkflowNode = {
            id: `node_${Date.now()}`,
            type,
            title: t(`workflow.node.${type}`), // Translate title
            position,
            status: 'pending'
        };

        const updatedNodes = [...selectedWorkflow.nodes, newNode];
        updateWorkflow(selectedWorkflow.id, { nodes: updatedNodes });
    };

    const renderLucideIcon = (iconName: string, size: number = 20) => {
        switch (iconName) {
            case 'CheckSquare': return <CheckSquare size={size} />;
            case 'Flag': return <Flag size={size} />;
            case 'GitBranch': return <GitBranch size={size} />;
            case 'Globe': return <Globe size={size} />;
            case 'Video': return <Video size={size} />;
            case 'Megaphone': return <Megaphone size={size} />;
            case 'StickyNote': return <StickyNote size={size} />;
            default: return <Layout size={size} />;
        }
    };

    // --- Sub-components (Render Helpers) ---

    // 1. Dashboard View
    const renderDashboard = () => (
        <div className="p-8 h-full overflow-y-auto bg-gray-900 text-white animate-in fade-in duration-300">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
                <div>
                    <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-400 to-purple-400 mb-2">
                        {t('nav.projectWorkflows')}
                    </h1>
                    <p className="text-gray-400 text-lg max-w-2xl">
                        {t('workflow.subtitle')}
                    </p>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={() => setIsTemplatesModalOpen(true)}
                        className="px-6 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 transition-all flex items-center gap-2 border border-gray-700/50 backdrop-blur-sm"
                    >
                        <Layout size={20} />
                        {t('workflow.templates')}
                    </button>
                    <button
                        onClick={() => setIsNewProjectModalOpen(true)}
                        className="px-8 py-3 rounded-xl bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white shadow-lg shadow-purple-900/40 transition-all transform hover:scale-[1.02] flex items-center gap-2 font-medium"
                    >
                        <Plus size={20} />
                        {t('workflow.newProject')}
                    </button>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <div className="relative flex-1 max-w-md group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-fuchsia-400 transition-colors" size={20} />
                    <input
                        type="text"
                        placeholder={t('workflow.searchPlaceholder')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-fuchsia-500/50 focus:border-transparent outline-none text-white placeholder-gray-500 transition-all"
                    />
                </div>
                <div className="flex bg-gray-800/50 p-1.5 rounded-xl border border-gray-700">
                    {(['all', 'planning', 'active', 'completed'] as const).map((status) => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${filterStatus === status
                                ? 'bg-gray-700 text-white shadow-sm'
                                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                                }`}
                        >
                            {status === 'all' ? t('filter.all') : t(`workflow.status.${status}`)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Projects Grid */}
            {filteredWorkflows.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-gray-800 rounded-3xl bg-gray-900/50">
                    <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mb-6 text-gray-600">
                        <GitBranch size={40} />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-300 mb-2">{t('workflow.noProjects')}</h3>
                    <p className="text-gray-500 mb-8 max-w-md text-center">
                        {t('workflow.selectProjectDesc')}
                    </p>
                    <button
                        onClick={() => setIsNewProjectModalOpen(true)}
                        className="px-6 py-3 rounded-xl bg-gray-800 text-fuchsia-400 hover:bg-gray-700 transition-colors font-medium flex items-center gap-2"
                    >
                        <Plus size={18} />
                        {t('workflow.create')}
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredWorkflows.map(workflow => (
                        <div
                            key={workflow.id}
                            onClick={() => handleOpenProject(workflow.id)}
                            className="group relative bg-gray-800/40 border border-gray-700/50 hover:border-fuchsia-500/50 rounded-2xl p-6 cursor-pointer hover:bg-gray-800/80 transition-all duration-300 hover:shadow-xl hover:shadow-purple-900/10 hover:-translate-y-1"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${workflow.status === 'completed' ? 'from-green-500/20 to-emerald-500/20 text-emerald-400' :
                                    workflow.status === 'active' ? 'from-blue-500/20 to-indigo-500/20 text-blue-400' :
                                        'from-fuchsia-500/20 to-purple-500/20 text-fuchsia-400'
                                    }`}>
                                    <GitBranch size={24} />
                                </div>
                                <button
                                    onClick={(e) => handleDeleteProject(workflow.id, e)}
                                    className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>

                            <h3 className="text-xl font-bold text-white mb-2 truncate pr-2 group-hover:text-fuchsia-400 transition-colors">
                                {workflow.name}
                            </h3>

                            <div className="flex items-center gap-3 text-sm text-gray-400 mb-6">
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium uppercase tracking-wider bg-gray-700/50 border border-gray-600/50 ${workflow.status === 'active' ? 'text-blue-400 border-blue-500/30' :
                                    workflow.status === 'completed' ? 'text-green-400 border-green-500/30' :
                                        'text-purple-400 border-purple-500/30'
                                    }`}>
                                    {t(`workflow.status.${workflow.status}`)}
                                </span>
                                <span>•</span>
                                <span>{new Date(workflow.updatedAt).toLocaleDateString()}</span>
                            </div>

                            <div className="w-full bg-gray-700/50 rounded-full h-1.5 overflow-hidden">
                                <div
                                    className="bg-gradient-to-r from-fuchsia-500 to-purple-600 h-full rounded-full transition-all duration-500"
                                    style={{ width: `${workflow.progress}%` }}
                                />
                            </div>
                            <div className="flex justify-between mt-2 text-xs text-gray-500 font-medium">
                                <span>{t('workflow.status.completed')}</span>
                                <span>{Math.round(workflow.progress)}%</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    // 2. Editor View
    const renderEditor = () => (
        <div className="relative w-full h-full bg-[#0a0a0f] flex flex-col animate-in slide-in-from-right-10 duration-300">
            {/* Editor Toolbar - Floating Style */}
            <div className="absolute top-6 left-6 right-6 z-10 flex justify-between items-center pointer-events-none">
                {/* Left: Back & Title */}
                <div className="flex items-center gap-4 pointer-events-auto bg-gray-900/80 backdrop-blur-md border border-gray-700/50 p-2 pr-6 rounded-2xl shadow-xl">
                    <button
                        onClick={handleBackToDashboard}
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition-all"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h2 className="text-white font-bold text-lg leading-tight">
                            {selectedWorkflow?.name}
                        </h2>
                        <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${selectedWorkflow?.status === 'active' ? 'bg-blue-400 animate-pulse' :
                                selectedWorkflow?.status === 'completed' ? 'bg-green-400' :
                                    'bg-purple-400'
                                }`} />
                            <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">
                                {selectedWorkflow ? t(`workflow.status.${selectedWorkflow.status}`) : ''}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Center: Maybe Zoom Controls or Tools could go here, currently inside Canvas */}

                {/* Right: Actions */}
                <div className="flex items-center gap-3 pointer-events-auto">
                    {/* Placeholder for future export/share buttons */}
                    <button className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-900/80 backdrop-blur-md border border-gray-700/50 text-gray-400 hover:text-white hover:bg-gray-800 transition-all shadow-lg">
                        <Share2 size={18} />
                    </button>
                </div>
            </div>

            {/* Node Palette - Floating Left Sidebar */}
            <div className="absolute top-28 left-6 z-20 bg-gray-900/90 backdrop-blur-md border border-gray-700/50 p-4 rounded-2xl shadow-xl w-56 animate-in slide-in-from-left-5 duration-500">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 px-1">{t('workflow.addNode')}</h3>
                <div className="grid grid-cols-2 gap-2">
                    {NODE_TYPE_CONFIGS.map(config => (
                        <div
                            key={config.type}
                            className="flex flex-col items-center justify-center p-3 bg-gray-800/50 rounded-xl cursor-move hover:bg-gray-800 transition-all border border-gray-700/50 hover:border-fuchsia-500/50 group active:scale-95"
                            draggable
                            onDragStart={(e) => {
                                e.dataTransfer.setData('application/reactflow/type', config.type);
                                e.dataTransfer.effectAllowed = 'copy';
                            }}
                        >
                            <div className="mb-2 text-gray-400 group-hover:text-fuchsia-400 transition-colors">
                                {renderLucideIcon(config.icon)}
                            </div>
                            <span className="text-xs font-medium text-gray-300 group-hover:text-white text-center leading-none">
                                {t(`workflow.node.${config.type}`)}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Canvas Area */}
            <div className="flex-1 w-full h-full overflow-hidden">
                {selectedWorkflow && (
                    <WorkflowCanvas
                        nodes={selectedWorkflow.nodes}
                        edges={selectedWorkflow.edges}
                        selectedNodeId={null}
                        onNodesChange={(nodes) => {
                            updateWorkflow(selectedWorkflow.id, { nodes });
                        }}
                        onEdgesChange={(edges) => {
                            updateWorkflow(selectedWorkflow.id, { edges });
                        }}
                        onNodeSelect={() => { }} // Handle selection details later
                        onNodeAdd={handleNodeAdd}
                    />
                )}
            </div>
        </div>
    );

    // 3. New Project Modal
    const renderNewProjectModal = () => (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#13131f] border border-gray-700 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden scale-100 animate-in zoom-in-95 duration-200">
                <div className="p-8 border-b border-gray-800">
                    <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                        {t('workflow.newProject')}
                    </h2>
                    <p className="text-gray-500 mt-1">{t('workflow.selectProjectDesc')}</p>
                </div>

                <div className="p-8 space-y-8">
                    {/* Project Name */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-300 uppercase tracking-wide ml-1">
                            {t('workflow.projectName')}
                        </label>
                        <input
                            type="text"
                            value={newProjectName}
                            onChange={(e) => setNewProjectName(e.target.value)}
                            placeholder={t('workflow.projectNamePlaceholder')}
                            className="w-full bg-gray-900/50 border border-gray-700 rounded-xl px-5 py-4 text-white placeholder-gray-600 focus:ring-2 focus:ring-fuchsia-500/50 focus:border-transparent outline-none transition-all text-lg"
                            autoFocus
                        />
                    </div>

                    {/* Template Selection */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-300 uppercase tracking-wide ml-1">
                            {t('workflow.chooseTemplate')}
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                            {workflowTemplates.map(template => (
                                <div
                                    key={template.id}
                                    onClick={() => setSelectedTemplateId(template.id)}
                                    className={`p-4 rounded-xl border-2 text-left transition-all cursor-pointer relative group ${selectedTemplateId === template.id
                                        ? 'bg-fuchsia-500/10 border-fuchsia-500'
                                        : 'bg-gray-800/30 border-gray-700 hover:border-gray-500 hover:bg-gray-800'
                                        }`}
                                >
                                    <h4 className={`font-bold mb-1 ${selectedTemplateId === template.id ? 'text-fuchsia-400' : 'text-gray-200'}`}>
                                        {template.name}
                                    </h4>
                                    <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                                        {template.description}
                                    </p>

                                    {/* Selection Indicator */}
                                    {selectedTemplateId === template.id && (
                                        <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-fuchsia-500 shadow-[0_0_10px_rgba(232,121,249,0.5)]" />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-gray-900/50 border-t border-gray-800 flex justify-end gap-3">
                    <button
                        onClick={() => setIsNewProjectModalOpen(false)}
                        className="px-6 py-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors font-medium"
                    >
                        {t('workflow.cancel')}
                    </button>
                    <button
                        onClick={handleCreateProject}
                        disabled={!newProjectName.trim()}
                        className={`px-8 py-2.5 rounded-xl bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white font-bold shadow-lg shadow-purple-900/30 transition-all ${!newProjectName.trim()
                            ? 'opacity-50 cursor-not-allowed'
                            : 'hover:from-fuchsia-500 hover:to-purple-500 hover:scale-[1.02]'
                            }`}
                    >
                        {t('workflow.create')}
                    </button>
                </div>
            </div>
        </div>
    );

    // 4. Templates Browser Modal (Simplified for now)
    const renderTemplatesModal = () => (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-[#13131f] border border-gray-700 rounded-3xl w-full max-w-4xl h-[80vh] shadow-2xl flex flex-col overflow-hidden">
                <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white">{t('workflow.templates')}</h2>
                    <button
                        onClick={() => setIsTemplatesModalOpen(false)}
                        className="p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>
                <div className="p-8 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-6">
                    {workflowTemplates.map(template => (
                        <div key={template.id} className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6 hover:border-fuchsia-500/30 transition-all">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-3 bg-gray-900 rounded-xl text-fuchsia-400">
                                    {template.category === 'marketing' ? <Share2 size={24} /> :
                                        template.category === 'content-creation' ? <Film size={24} /> :
                                            template.category === 'product-launch' ? <Package size={24} /> : <Layout size={24} />}
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-white">{template.name}</h3>
                                    <span className="text-xs text-gray-500 uppercase tracking-wider">{t(`workflow.category.${template.category}`)}</span>
                                </div>
                            </div>
                            <p className="text-gray-400 text-sm leading-relaxed mb-6">
                                {template.description}
                            </p>
                            <button
                                onClick={() => {
                                    setSelectedTemplateId(template.id);
                                    setIsTemplatesModalOpen(false);
                                    setIsNewProjectModalOpen(true);
                                }}
                                className="w-full py-3 rounded-xl bg-gray-700 text-gray-200 font-medium hover:bg-fuchsia-600 hover:text-white transition-all"
                            >
                                {t('workflow.useTemplate')}
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    return (
        <div className="w-full h-full bg-[#0a0a0f] relative overflow-hidden">
            {viewMode === 'dashboard' ? renderDashboard() : renderEditor()}
            {isNewProjectModalOpen && renderNewProjectModal()}
            {isTemplatesModalOpen && renderTemplatesModal()}
        </div>
    );
};

export default WorkflowView;
