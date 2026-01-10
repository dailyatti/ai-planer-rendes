/**
 * workflow.ts
 * PhD-Level Workflow System Types
 * Mind-map style project planning with n8n-like visual interface
 */

// Node types - each step type in the workflow
export type WorkflowNodeType =
    | 'task'        // General task
    | 'milestone'   // Milestone / checkpoint
    | 'decision'    // Decision point (branching)
    | 'platform'    // Platform (Whop, TikTok, Facebook, etc.)
    | 'media'       // Media creation (video, image)
    | 'promotion'   // Promotion / Advertising
    | 'note';       // Note / Comment

// Position on the canvas
export interface Position {
    x: number;
    y: number;
}

// Connection between two nodes
export interface WorkflowEdge {
    id: string;
    source: string;      // Source node ID
    target: string;      // Target node ID
    label?: string;      // Optional label on the connection
    animated?: boolean;  // Animated line for active connections
}

// Single node in the workflow
export interface WorkflowNode {
    id: string;
    type: WorkflowNodeType;
    title: string;
    description?: string;
    position: Position;
    status: 'pending' | 'in-progress' | 'completed' | 'skipped';
    dueDate?: string;              // ISO date string (YMD)
    color?: string;                // Custom node color
    icon?: string;                 // Custom icon name
    data?: Record<string, any>;    // Extra data for node-specific info
    width?: number;                // Node width (auto if not set)
    height?: number;               // Node height (auto if not set)
    // Nesting / Grouping fields
    parentId?: string;             // ID of the parent group node (if any)
    isGroup?: boolean;             // True if this node is a container group
    groupWidth?: number;           // Width when expanded as a group
    groupHeight?: number;          // Height when expanded as a group
    collapsed?: boolean;           // Whether the group is collapsed
    groupColor?: string;           // Background color for the group frame
}

// Workflow template - reusable blueprint
export interface WorkflowTemplate {
    id: string;
    name: string;
    description: string;
    category: 'product-launch' | 'social-media' | 'content-creation' | 'marketing' | 'custom';
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
    icon: string;                  // Lucide icon name
    isBuiltIn: boolean;            // System template vs user-created
    createdAt: Date;
}

// Project workflow - actual project using a workflow
export interface ProjectWorkflow {
    id: string;
    name: string;
    description?: string;
    templateId?: string;           // Reference to template used (if any)
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
    status: 'planning' | 'active' | 'completed' | 'archived';
    progress: number;              // 0-100 calculated from completed nodes
    createdAt: Date;
    updatedAt: Date;
    dueDate?: string;              // ISO date string
    color?: string;                // Project accent color
}

// Canvas state for zoom/pan
export interface CanvasState {
    zoom: number;                  // 0.25 - 2.0
    panX: number;
    panY: number;
    showGrid: boolean;
    snapToGrid: boolean;
    gridSize: number;              // Grid cell size in pixels
}

// Node type configuration for the palette
export interface NodeTypeConfig {
    type: WorkflowNodeType;
    label: string;
    icon: string;
    color: string;
    description: string;
}

// Built-in template categories
export const TEMPLATE_CATEGORIES = [
    'product-launch',
    'social-media',
    'content-creation',
    'marketing',
    'custom'
] as const;

// Default canvas state
export const DEFAULT_CANVAS_STATE: CanvasState = {
    zoom: 1,
    panX: 0,
    panY: 0,
    showGrid: true,
    snapToGrid: true,
    gridSize: 20
};

// Node type configuration
export const NODE_TYPE_CONFIGS: NodeTypeConfig[] = [
    { type: 'task', label: 'Task', icon: 'CheckSquare', color: '#3B82F6', description: 'General task or action item' },
    { type: 'milestone', label: 'Milestone', icon: 'Flag', color: '#10B981', description: 'Key checkpoint or goal' },
    { type: 'decision', label: 'Decision', icon: 'GitBranch', color: '#F59E0B', description: 'Decision point with branching' },
    { type: 'platform', label: 'Platform', icon: 'Globe', color: '#8B5CF6', description: 'Platform or service (Whop, TikTok, etc.)' },
    { type: 'media', label: 'Media', icon: 'Video', color: '#EC4899', description: 'Media creation (video, image, audio)' },
    { type: 'promotion', label: 'Promotion', icon: 'Megaphone', color: '#EF4444', description: 'Marketing or advertising action' },
    { type: 'note', label: 'Note', icon: 'StickyNote', color: '#6B7280', description: 'Note or comment' }
];
