/**
 * WorkflowCanvas.tsx
 * SVG-based interactive canvas for workflow visualization
 * Features: Pan, Zoom, Node rendering, Edge connections with bezier curves
 */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ZoomIn, ZoomOut, Maximize2, Grid3X3 } from 'lucide-react';
import { WorkflowNode, WorkflowEdge, CanvasState, DEFAULT_CANVAS_STATE, WorkflowNodeType } from '../../types/workflow';
import WorkflowNodeComponent from './WorkflowNode';

interface WorkflowCanvasProps {
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
    onNodesChange: (nodes: WorkflowNode[]) => void;
    onEdgesChange: (edges: WorkflowEdge[]) => void;
    selectedNodeId: string | null;
    onNodeSelect: (id: string | null) => void;
    onNodeAdd?: (type: WorkflowNodeType, position: { x: number; y: number }) => void;
}

const WorkflowCanvas: React.FC<WorkflowCanvasProps> = ({
    nodes,
    edges,
    onNodesChange,
    onEdgesChange: _onEdgesChange,
    selectedNodeId,
    onNodeSelect,
    onNodeAdd
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [canvasState, setCanvasState] = useState<CanvasState>(DEFAULT_CANVAS_STATE);
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });
    const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    // Zoom controls
    const handleZoomIn = () => {
        setCanvasState(prev => ({ ...prev, zoom: Math.min(prev.zoom + 0.1, 2) }));
    };

    const handleZoomOut = () => {
        setCanvasState(prev => ({ ...prev, zoom: Math.max(prev.zoom - 0.1, 0.25) }));
    };

    const handleFitView = () => {
        if (nodes.length === 0) return;

        // Calculate bounds
        const minX = Math.min(...nodes.map(n => n.position.x));
        const maxX = Math.max(...nodes.map(n => n.position.x + 200));
        const minY = Math.min(...nodes.map(n => n.position.y));
        const maxY = Math.max(...nodes.map(n => n.position.y + 100));

        const container = containerRef.current;
        if (!container) return;

        const { width, height } = container.getBoundingClientRect();
        const contentWidth = maxX - minX + 100;
        const contentHeight = maxY - minY + 100;

        const zoomX = width / contentWidth;
        const zoomY = height / contentHeight;
        const zoom = Math.min(zoomX, zoomY, 1);

        setCanvasState(prev => ({
            ...prev,
            zoom: Math.max(0.25, Math.min(zoom, 1)),
            panX: -minX * zoom + 50,
            panY: -minY * zoom + 50
        }));
    };

    const toggleGrid = () => {
        setCanvasState(prev => ({ ...prev, showGrid: !prev.showGrid }));
    };

    // Pan handling
    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('canvas-bg')) {
            onNodeSelect(null);
            setIsPanning(true);
            setPanStart({ x: e.clientX - canvasState.panX, y: e.clientY - canvasState.panY });
        }
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (isPanning) {
            setCanvasState(prev => ({
                ...prev,
                panX: e.clientX - panStart.x,
                panY: e.clientY - panStart.y
            }));
        }

        if (draggingNodeId) {
            const container = containerRef.current;
            if (!container) return;

            const rect = container.getBoundingClientRect();
            let newX = (e.clientX - rect.left - canvasState.panX) / canvasState.zoom - dragOffset.x;
            let newY = (e.clientY - rect.top - canvasState.panY) / canvasState.zoom - dragOffset.y;

            // Snap to grid if enabled
            if (canvasState.snapToGrid) {
                newX = Math.round(newX / canvasState.gridSize) * canvasState.gridSize;
                newY = Math.round(newY / canvasState.gridSize) * canvasState.gridSize;
            }

            onNodesChange(nodes.map(n =>
                n.id === draggingNodeId
                    ? { ...n, position: { x: Math.max(0, newX), y: Math.max(0, newY) } }
                    : n
            ));
        }
    }, [isPanning, panStart, draggingNodeId, dragOffset, canvasState, nodes, onNodesChange]);

    const handleMouseUp = useCallback(() => {
        setIsPanning(false);
        setDraggingNodeId(null);
    }, []);

    useEffect(() => {
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [handleMouseMove, handleMouseUp]);

    // Wheel zoom
    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const delta = -e.deltaY * 0.001;
        setCanvasState(prev => ({
            ...prev,
            zoom: Math.min(2, Math.max(0.25, prev.zoom + delta))
        }));
    };

    // Node drag start
    const handleNodeDragStart = (e: React.MouseEvent, nodeId: string) => {
        e.preventDefault();
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;

        const container = containerRef.current;
        if (!container) return;

        const rect = container.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left - canvasState.panX) / canvasState.zoom;
        const mouseY = (e.clientY - rect.top - canvasState.panY) / canvasState.zoom;

        setDragOffset({
            x: mouseX - node.position.x,
            y: mouseY - node.position.y
        });
        setDraggingNodeId(nodeId);
        onNodeSelect(nodeId);
    };

    // External Drag & Drop
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (!onNodeAdd) return;

        const type = e.dataTransfer.getData('application/reactflow/type') as WorkflowNodeType;
        if (!type) return;

        const container = containerRef.current;
        if (!container) return;

        const rect = container.getBoundingClientRect();
        const x = (e.clientX - rect.left - canvasState.panX) / canvasState.zoom;
        const y = (e.clientY - rect.top - canvasState.panY) / canvasState.zoom;

        onNodeAdd(type, { x, y });
    };

    // Node status change
    const handleNodeStatusChange = (nodeId: string, status: WorkflowNode['status']) => {
        onNodesChange(nodes.map(n => n.id === nodeId ? { ...n, status } : n));
    };

    // Calculate edge path (bezier curve)
    const getEdgePath = (edge: WorkflowEdge): string => {
        const sourceNode = nodes.find(n => n.id === edge.source);
        const targetNode = nodes.find(n => n.id === edge.target);
        if (!sourceNode || !targetNode) return '';

        // Source: right side of node
        const sourceX = sourceNode.position.x + 200;
        const sourceY = sourceNode.position.y + 40;

        // Target: left side of node
        const targetX = targetNode.position.x;
        const targetY = targetNode.position.y + 40;

        // Control points for smooth bezier
        const controlOffset = Math.min(80, Math.abs(targetX - sourceX) / 3);

        return `M ${sourceX} ${sourceY} C ${sourceX + controlOffset} ${sourceY}, ${targetX - controlOffset} ${targetY}, ${targetX} ${targetY}`;
    };

    return (
        <div className="relative w-full h-full overflow-hidden bg-gray-900 rounded-xl">
            {/* Control bar */}
            <div className="absolute top-4 left-4 z-30 flex items-center gap-2 bg-gray-800/80 backdrop-blur-sm rounded-lg p-1.5 shadow-lg border border-gray-700/50">
                <button
                    onClick={handleZoomOut}
                    className="p-1.5 rounded-md hover:bg-gray-700 text-gray-300 hover:text-white transition-colors"
                    title="Zoom Out"
                >
                    <ZoomOut size={18} />
                </button>
                <span className="text-xs text-gray-400 font-medium min-w-[40px] text-center">
                    {Math.round(canvasState.zoom * 100)}%
                </span>
                <button
                    onClick={handleZoomIn}
                    className="p-1.5 rounded-md hover:bg-gray-700 text-gray-300 hover:text-white transition-colors"
                    title="Zoom In"
                >
                    <ZoomIn size={18} />
                </button>
                <div className="w-px h-4 bg-gray-700" />
                <button
                    onClick={handleFitView}
                    className="p-1.5 rounded-md hover:bg-gray-700 text-gray-300 hover:text-white transition-colors"
                    title="Fit View"
                >
                    <Maximize2 size={18} />
                </button>
                <button
                    onClick={toggleGrid}
                    className={`p-1.5 rounded-md transition-colors ${canvasState.showGrid
                        ? 'bg-primary-500/20 text-primary-400'
                        : 'hover:bg-gray-700 text-gray-300 hover:text-white'
                        }`}
                    title="Toggle Grid"
                >
                    <Grid3X3 size={18} />
                </button>
            </div>

            {/* Canvas container */}
            <div
                ref={containerRef}
                className="w-full h-full cursor-grab active:cursor-grabbing"
                onMouseDown={handleMouseDown}
                onWheel={handleWheel}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
            >
                {/* Transformable layer */}
                <div
                    className="relative w-full h-full"
                    style={{
                        transform: `translate(${canvasState.panX}px, ${canvasState.panY}px) scale(${canvasState.zoom})`,
                        transformOrigin: '0 0'
                    }}
                >
                    {/* Grid background */}
                    {canvasState.showGrid && (
                        <svg className="absolute inset-0 w-[5000px] h-[5000px] pointer-events-none canvas-bg">
                            <defs>
                                <pattern
                                    id="grid"
                                    width={canvasState.gridSize}
                                    height={canvasState.gridSize}
                                    patternUnits="userSpaceOnUse"
                                >
                                    <path
                                        d={`M ${canvasState.gridSize} 0 L 0 0 0 ${canvasState.gridSize}`}
                                        fill="none"
                                        stroke="rgba(255,255,255,0.05)"
                                        strokeWidth="1"
                                    />
                                </pattern>
                                <pattern
                                    id="grid-large"
                                    width={canvasState.gridSize * 5}
                                    height={canvasState.gridSize * 5}
                                    patternUnits="userSpaceOnUse"
                                >
                                    <rect width="100%" height="100%" fill="url(#grid)" />
                                    <path
                                        d={`M ${canvasState.gridSize * 5} 0 L 0 0 0 ${canvasState.gridSize * 5}`}
                                        fill="none"
                                        stroke="rgba(255,255,255,0.08)"
                                        strokeWidth="1"
                                    />
                                </pattern>
                            </defs>
                            <rect width="100%" height="100%" fill="url(#grid-large)" />
                        </svg>
                    )}

                    {/* Edges SVG */}
                    <svg className="absolute inset-0 w-[5000px] h-[5000px] pointer-events-none">
                        <defs>
                            <marker
                                id="arrowhead"
                                markerWidth="10"
                                markerHeight="7"
                                refX="9"
                                refY="3.5"
                                orient="auto"
                            >
                                <polygon
                                    points="0 0, 10 3.5, 0 7"
                                    fill="rgba(139, 92, 246, 0.6)"
                                />
                            </marker>
                        </defs>
                        {edges.map(edge => {
                            const path = getEdgePath(edge);
                            if (!path) return null;

                            return (
                                <g key={edge.id}>
                                    {/* Glow effect */}
                                    <path
                                        d={path}
                                        fill="none"
                                        stroke="rgba(139, 92, 246, 0.2)"
                                        strokeWidth="6"
                                        strokeLinecap="round"
                                    />
                                    {/* Main line */}
                                    <path
                                        d={path}
                                        fill="none"
                                        stroke="rgba(139, 92, 246, 0.6)"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        markerEnd="url(#arrowhead)"
                                        className={edge.animated ? 'animate-pulse' : ''}
                                    />
                                </g>
                            );
                        })}
                    </svg>

                    {/* Nodes */}
                    {nodes.map(node => (
                        <WorkflowNodeComponent
                            key={node.id}
                            node={node}
                            isSelected={selectedNodeId === node.id}
                            onSelect={onNodeSelect}
                            onStatusChange={handleNodeStatusChange}
                            onDragStart={handleNodeDragStart}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default WorkflowCanvas;
