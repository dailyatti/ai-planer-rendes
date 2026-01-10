/**
 * WorkflowNode.tsx
 * Individual node component for the workflow canvas
 * PhD-level design with glassmorphism, status indicators, and smooth interactions
 */
import React from 'react';
import {
    CheckSquare, Flag, GitBranch, Globe, Video, Megaphone, StickyNote,
    CheckCircle2, Clock, PlayCircle, SkipForward, GripVertical
} from 'lucide-react';
import { WorkflowNode as WorkflowNodeType, WorkflowNodeType as NodeType } from '../../types/workflow';

interface WorkflowNodeProps {
    node: WorkflowNodeType;
    isSelected: boolean;
    onSelect: (id: string) => void;
    onStatusChange: (id: string, status: WorkflowNodeType['status']) => void;
    onDragStart: (e: React.MouseEvent, id: string) => void;
}

// Icon mapping for node types
const NODE_ICONS: Record<NodeType, React.ElementType> = {
    task: CheckSquare,
    milestone: Flag,
    decision: GitBranch,
    platform: Globe,
    media: Video,
    promotion: Megaphone,
    note: StickyNote
};

// Color mapping for node types (with gradients)
const NODE_COLORS: Record<NodeType, { bg: string; border: string; iconBg: string }> = {
    task: { bg: 'from-blue-500/10 to-blue-600/5', border: 'border-blue-500/30', iconBg: 'bg-blue-500' },
    milestone: { bg: 'from-emerald-500/10 to-emerald-600/5', border: 'border-emerald-500/30', iconBg: 'bg-emerald-500' },
    decision: { bg: 'from-amber-500/10 to-amber-600/5', border: 'border-amber-500/30', iconBg: 'bg-amber-500' },
    platform: { bg: 'from-purple-500/10 to-purple-600/5', border: 'border-purple-500/30', iconBg: 'bg-purple-500' },
    media: { bg: 'from-pink-500/10 to-pink-600/5', border: 'border-pink-500/30', iconBg: 'bg-pink-500' },
    promotion: { bg: 'from-red-500/10 to-red-600/5', border: 'border-red-500/30', iconBg: 'bg-red-500' },
    note: { bg: 'from-gray-500/10 to-gray-600/5', border: 'border-gray-500/30', iconBg: 'bg-gray-500' }
};

// Status colors and icons
const STATUS_CONFIG: Record<WorkflowNodeType['status'], { color: string; icon: React.ElementType; label: string }> = {
    pending: { color: 'text-gray-400', icon: Clock, label: 'Pending' },
    'in-progress': { color: 'text-blue-400', icon: PlayCircle, label: 'In Progress' },
    completed: { color: 'text-emerald-400', icon: CheckCircle2, label: 'Completed' },
    skipped: { color: 'text-gray-300', icon: SkipForward, label: 'Skipped' }
};

const WorkflowNodeComponent: React.FC<WorkflowNodeProps> = ({
    node,
    isSelected,
    onSelect,
    onStatusChange,
    onDragStart
}) => {
    const Icon = NODE_ICONS[node.type];
    const colors = NODE_COLORS[node.type];
    const statusConfig = STATUS_CONFIG[node.status];
    const StatusIcon = statusConfig.icon;

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onSelect(node.id);
    };

    const handleStatusClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        // Cycle through statuses
        const statuses: WorkflowNodeType['status'][] = ['pending', 'in-progress', 'completed', 'skipped'];
        const currentIndex = statuses.indexOf(node.status);
        const nextIndex = (currentIndex + 1) % statuses.length;
        onStatusChange(node.id, statuses[nextIndex]);
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('.status-button')) return;
        onDragStart(e, node.id);
    };

    return (
        <div
            className={`
        absolute cursor-move select-none
        min-w-[180px] max-w-[240px]
        transition-all duration-200 ease-out
        ${isSelected ? 'z-20 scale-105' : 'z-10 hover:z-15'}
      `}
            style={{
                left: node.position.x,
                top: node.position.y,
                transform: isSelected ? 'scale(1.02)' : 'scale(1)'
            }}
            onClick={handleClick}
            onMouseDown={handleMouseDown}
        >
            {/* Node card with glassmorphism */}
            <div
                className={`
          relative rounded-xl overflow-hidden
          bg-gradient-to-br ${colors.bg}
          backdrop-blur-xl
          border ${colors.border}
          ${isSelected ? 'ring-2 ring-primary-500 ring-offset-2 ring-offset-gray-900' : ''}
          shadow-lg hover:shadow-xl
          transition-all duration-200
        `}
            >
                {/* Drag handle */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <GripVertical size={14} className="text-gray-400" />
                </div>

                {/* Header with icon and title */}
                <div className="p-3 pb-2">
                    <div className="flex items-start gap-2.5">
                        {/* Type icon */}
                        <div className={`flex-shrink-0 p-1.5 rounded-lg ${colors.iconBg} shadow-lg`}>
                            <Icon size={14} className="text-white" />
                        </div>

                        {/* Title */}
                        <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm text-gray-100 truncate leading-tight">
                                {node.title}
                            </h4>
                            {node.description && (
                                <p className="text-xs text-gray-400 mt-0.5 line-clamp-2 leading-snug">
                                    {node.description}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer with status and due date */}
                <div className="px-3 py-2 border-t border-white/5 bg-black/10 flex items-center justify-between gap-2">
                    {/* Status button */}
                    <button
                        className={`
              status-button flex items-center gap-1 px-2 py-1 rounded-md
              text-xs font-medium ${statusConfig.color}
              bg-white/5 hover:bg-white/10
              transition-all duration-150
            `}
                        onClick={handleStatusClick}
                    >
                        <StatusIcon size={12} />
                        <span>{statusConfig.label}</span>
                    </button>

                    {/* Due date if present */}
                    {node.dueDate && (
                        <span className="text-xs text-gray-500">
                            {node.dueDate}
                        </span>
                    )}
                </div>

                {/* Completion indicator bar */}
                {node.status === 'completed' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 to-green-400" />
                )}
                {node.status === 'in-progress' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-cyan-400 animate-pulse" />
                )}
            </div>
        </div>
    );
};

export default WorkflowNodeComponent;
