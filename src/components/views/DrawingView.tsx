import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as fabric from 'fabric';
import {
  Pencil, Square, Circle as CircleIcon, Triangle as TriangleIcon,
  Type, Image as ImageIcon, Eraser, MousePointer2,
  Undo2, Redo2, Trash2, Move, ZoomIn, ZoomOut,
  Palette
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

// --- Types ---
type Tool = 'select' | 'pan' | 'pen' | 'marker' | 'rectangle' | 'circle' | 'triangle' | 'line' | 'text' | 'image' | 'eraser';

interface DrawingState {
  tool: Tool;
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  opacity: number;
  fontFamily: string;
  activeObject: fabric.Object | null;
}

const DrawingView: React.FC = () => {
  const { t } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<fabric.Canvas | null>(null);

  // State
  const [state, setState] = useState<DrawingState>({
    tool: 'select',
    strokeColor: '#000000',
    fillColor: 'transparent',
    strokeWidth: 3,
    opacity: 1,
    fontFamily: 'Inter',
    activeObject: null
  });

  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(true);
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  // --- Persistence (Professional Level) ---
  const saveToLocalStorage = useCallback(() => {
    if (!fabricCanvas) return;
    try {
      const json = fabricCanvas.toJSON();
      const dataToSave = {
        version: '0.3.3',
        timestamp: new Date().toISOString(),
        canvas: json,
      };
      localStorage.setItem('planner-drawing-state', JSON.stringify(dataToSave));

      // Update History
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(JSON.stringify(json));
      if (newHistory.length > 50) newHistory.shift();

      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    } catch (e) {
      console.error('Failed to save drawing state:', e);
    }
  }, [fabricCanvas, history, historyIndex]);

  // Failsafe: Force loading to stop after 2s to prevent infinite spinner
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // --- Initialization ---
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    // Initialize Fabric Canvas
    const canvas = new fabric.Canvas(canvasRef.current, {
      isDrawingMode: false,
      selection: true,
      backgroundColor: '#ffffff',
      preserveObjectStacking: true,
      stopContextMenu: true,
      fireRightClick: true,
    });

    // Set initial dimensions
    canvas.setDimensions({
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight || window.innerHeight - 100
    });

    // Custom config
    fabric.Object.prototype.set({
      cornerColor: '#3b82f6',
      cornerStyle: 'circle',
      borderColor: '#3b82f6',
      borderScaleFactor: 1.5,
      transparentCorners: false,
      cornerSize: 10,
      padding: 5,
    });

    setFabricCanvas(canvas);

    const resizeObserver = new ResizeObserver(() => {
      if (containerRef.current) {
        canvas.setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
        canvas.renderAll();
      }
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      canvas.dispose();
      resizeObserver.disconnect();
    };
  }, []);

  // --- Tool Logic ---
  useEffect(() => {
    if (!fabricCanvas) return;

    // Reset
    fabricCanvas.isDrawingMode = false;
    fabricCanvas.selection = true;
    fabricCanvas.defaultCursor = 'default';

    // Apply Tool Settings
    switch (state.tool) {
      case 'pan':
        fabricCanvas.selection = false;
        fabricCanvas.defaultCursor = 'grab';
        break;
      case 'pen':
      case 'marker':
        fabricCanvas.isDrawingMode = true;
        const brush = new fabric.PencilBrush(fabricCanvas);
        brush.color = state.strokeColor;
        brush.width = state.tool === 'marker' ? state.strokeWidth * 4 : state.strokeWidth;
        // Marker opacity simulation
        if (state.tool === 'marker') {
          brush.color = new fabric.Color(state.strokeColor).setAlpha(0.5).toRgba();
        }
        fabricCanvas.freeDrawingBrush = brush;
        break;
      case 'eraser':
        fabricCanvas.selection = true;
        fabricCanvas.defaultCursor = 'not-allowed'; // Visual cue
        break;
      default:
        // Shapes/Text handled on click/drag
        fabricCanvas.defaultCursor = 'crosshair';
        if (state.tool === 'select') fabricCanvas.defaultCursor = 'default';
        break;
    }
  }, [fabricCanvas, state.tool, state.strokeColor, state.strokeWidth]);

  // --- Selection Handling ---
  useEffect(() => {
    if (!fabricCanvas) return;

    const handleSelection = (e: any) => {
      const selected = e.selected?.[0] || null;
      setState(s => ({ ...s, activeObject: selected }));
    };

    const handleCleared = () => {
      setState(s => ({ ...s, activeObject: null }));
    };

    fabricCanvas.on('selection:created', handleSelection);
    fabricCanvas.on('selection:updated', handleSelection);
    fabricCanvas.on('selection:cleared', handleCleared);

    return () => {
      fabricCanvas.off('selection:created', handleSelection);
      fabricCanvas.off('selection:updated', handleSelection);
      fabricCanvas.off('selection:cleared', handleCleared);
    };
  }, [fabricCanvas]);

  // --- Image Upload Logic (PhD Level) ---
  const handleImageUpload = (file: File) => {
    if (!file || !fabricCanvas) return;

    const reader = new FileReader();
    reader.onload = (f) => {
      const data = f.target?.result as string;
      fabric.Image.fromURL(data).then((img) => {
        // Smart scaling to fit screen
        if (img) {
          const maxWidth = fabricCanvas.width! * 0.5;
          const maxHeight = fabricCanvas.height! * 0.5;
          const scale = Math.min(
            maxWidth / (img.width || 1),
            maxHeight / (img.height || 1),
            1
          );

          img.scale(scale);
          img.set({
            left: fabricCanvas.width! / 2,
            top: fabricCanvas.height! / 2,
            originX: 'center',
            originY: 'center',
            cornerColor: '#3b82f6',
            cornerStyle: 'circle',
          });

          fabricCanvas.add(img);
          fabricCanvas.setActiveObject(img);
          setState(s => ({ ...s, tool: 'select' }));
          // Save after adding image
          saveToLocalStorage();
        }
      });
    };
    reader.readAsDataURL(file);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        handleImageUpload(file);
      }
    }
  }, [fabricCanvas, saveToLocalStorage]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
  }, []);


  // --- Shape Adoption (Click to Add) ---
  // Removed unused addShape helper; shape creation is handled directly in mouse events.

  // Listen for clicks to add shapes (if tool is active)
  useEffect(() => {
    if (!fabricCanvas) return;

    const handleMouseDown = (opt: any) => {
      if (state.tool === 'select' || state.tool === 'pan' || state.tool === 'pen' || state.tool === 'marker' || state.tool === 'eraser' || state.tool === 'image') return;

      // If active tool is a shape, add it at cursor
      const pointer = fabricCanvas.getPointer(opt.e);
      let shape: fabric.Object | null = null;
      const common = {
        left: pointer.x,
        top: pointer.y,
        fill: state.fillColor === 'transparent' && state.tool !== 'text' ? 'transparent' : state.fillColor,
        stroke: state.strokeColor,
        strokeWidth: state.strokeWidth,
        originX: 'center',
        originY: 'center',
      };

      switch (state.tool) {
        case 'rectangle':
          shape = new fabric.Rect({ ...(common as any), width: 100, height: 100, fill: common.fill === 'transparent' ? 'transparent' : common.fill } as any);
          break;
        case 'circle':
          shape = new fabric.Circle({ ...(common as any), radius: 50 } as any);
          break;
        case 'triangle':
          shape = new fabric.Triangle({ ...(common as any), width: 100, height: 100 } as any);
          break;
        case 'text':
          shape = new fabric.IText('Type here...', { ...(common as any), fontSize: 24, fontFamily: 'Inter', fill: state.strokeColor, strokeWidth: 0 } as any);
          break;
      }

      if (shape) {
        fabricCanvas.add(shape);
        fabricCanvas.setActiveObject(shape);
        setState(s => ({ ...s, tool: 'select' })); // Auto-switch back to select
        saveToLocalStorage();
      }
    };

    const handleClick = (opt: any) => {
      if (state.tool === 'eraser' && opt.target) {
        fabricCanvas.remove(opt.target);
        saveToLocalStorage();
      }
    }

    fabricCanvas.on('mouse:down', handleMouseDown);
    fabricCanvas.on('mouse:down', handleClick); // Eraser logic

    return () => {
      fabricCanvas.off('mouse:down', handleMouseDown);
      fabricCanvas.off('mouse:down', handleClick);
    };
  }, [fabricCanvas, state.tool, state.fillColor, state.strokeColor, state.strokeWidth, saveToLocalStorage]);


  // --- Zoom & Pan Logic (Infinite Canvas Feel) ---
  useEffect(() => {
    if (!fabricCanvas) return;

    const handleWheel = (opt: any) => {
      if (opt.e.ctrlKey || opt.e.metaKey) {
        // Zoom
        const delta = opt.e.deltaY;
        let zoom = fabricCanvas.getZoom();
        zoom *= 0.999 ** delta;
        if (zoom > 20) zoom = 20;
        if (zoom < 0.01) zoom = 0.01;
        fabricCanvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
        opt.e.preventDefault();
        opt.e.stopPropagation();
      } else if (state.tool === 'pan' || opt.e.shiftKey) {
        // Pan
        const vpt = fabricCanvas.viewportTransform;
        if (vpt) {
          vpt[4] -= opt.e.deltaX;
          vpt[5] -= opt.e.deltaY;
          fabricCanvas.requestRenderAll();
        }
        opt.e.preventDefault();
        opt.e.stopPropagation();
      }
    };

    // Middle Click Pan
    let isDragging = false;
    let lastPosX = 0;
    let lastPosY = 0;

    const handleMouseDown = (opt: any) => {
      const evt = opt.e;
      if (state.tool === 'pan' || evt.button === 1 || (evt.altKey)) {
        isDragging = true;
        fabricCanvas.selection = false;
        lastPosX = evt.clientX;
        lastPosY = evt.clientY;
        fabricCanvas.defaultCursor = 'grabbing';
      }
    };

    const handleMouseMove = (opt: any) => {
      if (isDragging) {
        const e = opt.e;
        const vpt = fabricCanvas.viewportTransform;
        if (vpt) {
          vpt[4] += e.clientX - lastPosX;
          vpt[5] += e.clientY - lastPosY;
          fabricCanvas.requestRenderAll();
          lastPosX = e.clientX;
          lastPosY = e.clientY;
        }
      }
    };

    const handleMouseUp = () => {
      if (isDragging) {
        isDragging = false;
        fabricCanvas.selection = true;
        fabricCanvas.defaultCursor = 'default';
        if (state.tool !== 'pan') {
          fabricCanvas.selection = true;
        }
      }
    };

    fabricCanvas.on('mouse:wheel', handleWheel);
    fabricCanvas.on('mouse:down', handleMouseDown);
    fabricCanvas.on('mouse:move', handleMouseMove);
    fabricCanvas.on('mouse:up', handleMouseUp);

    return () => {
      fabricCanvas.off('mouse:wheel', handleWheel);
      fabricCanvas.off('mouse:down', handleMouseDown);
      fabricCanvas.off('mouse:move', handleMouseMove);
      fabricCanvas.off('mouse:up', handleMouseUp);
    };
  }, [fabricCanvas, state.tool]);

  // --- Persistence moved earlier ---

  // Debounced Save on changes
  useEffect(() => {
    if (!fabricCanvas) return;

    const handleObjectModified = () => saveToLocalStorage();
    const handlePathCreated = () => saveToLocalStorage();
    const handleObjectAdded = () => saveToLocalStorage();

    fabricCanvas.on('object:modified', handleObjectModified);
    fabricCanvas.on('path:created', handlePathCreated);
    fabricCanvas.on('object:added', handleObjectAdded);
    fabricCanvas.on('object:removed', handleObjectModified);

    return () => {
      fabricCanvas.off('object:modified', handleObjectModified);
      fabricCanvas.off('path:created', handlePathCreated);
      fabricCanvas.off('object:added', handleObjectAdded);
      fabricCanvas.off('object:removed', handleObjectModified);
    };
  }, [fabricCanvas, saveToLocalStorage]);

  // Restore from Storage (Robust & Safe)
  useEffect(() => {
    if (!fabricCanvas) return;

    const loadState = async () => {
      try {
        const saved = localStorage.getItem('planner-drawing-state');
        const legacy = localStorage.getItem('drawing_draft');

        let jsonData = null;

        if (saved) {
          const parsed = JSON.parse(saved);
          jsonData = parsed.canvas || parsed;
        } else if (legacy) {
          jsonData = JSON.parse(legacy);
        }

        if (jsonData) {
          await new Promise<void>((resolve) => {
            fabricCanvas.loadFromJSON(jsonData, () => {
              fabricCanvas.renderAll();
              resolve();
            });
          });

          // Force layout recalculation and second render frame
          // This is critical for objects to appear immediately
          fabricCanvas.setDimensions({
            width: containerRef.current?.clientWidth || 800,
            height: containerRef.current?.clientHeight || 600
          });
          fabricCanvas.requestRenderAll();

          setHistory([JSON.stringify(jsonData)]);
          setHistoryIndex(0);
          console.log('[DrawingView] State restored successfully');
        } else {
          setHistory([JSON.stringify(fabricCanvas.toJSON())]);
          setHistoryIndex(0);
        }
      } catch (error) {
        console.error('[DrawingView] Failed to restore state:', error);
        fabricCanvas.clear();
      } finally {
        setIsLoading(false);
        // Triple check render after loading flag is off
        setTimeout(() => fabricCanvas?.requestRenderAll(), 100);
      }
    };

    // Small delay to ensure render
    setTimeout(loadState, 100);

  }, [fabricCanvas]);

  // --- Actions ---
  const performUndo = () => {
    if (historyIndex <= 0 || !fabricCanvas) return;
    const prev = history[historyIndex - 1];
    setHistoryIndex(historyIndex - 1);
    fabricCanvas.loadFromJSON(prev, () => fabricCanvas.renderAll());
  };

  const performRedo = () => {
    if (historyIndex >= history.length - 1 || !fabricCanvas) return;
    const next = history[historyIndex + 1];
    setHistoryIndex(historyIndex + 1);
    fabricCanvas.loadFromJSON(next, () => fabricCanvas.renderAll());
  };

  const clearCanvas = () => {
    if (!fabricCanvas) return;
    if (confirm('Clear entire canvas?')) {
      fabricCanvas.clear();
      fabricCanvas.backgroundColor = '#ffffff';
      saveToLocalStorage();
    }
  };

  const deleteSelected = () => {
    const active = fabricCanvas?.getActiveObjects();
    if (active?.length) {
      fabricCanvas?.discardActiveObject();
      active.forEach(obj => fabricCanvas?.remove(obj));
      saveToLocalStorage();
    }
  };

  // --- UI Components ---

  return (
    <div
      className="h-full flex flex-col relative bg-gray-50 dark:bg-gray-900 overflow-hidden select-none"
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
    >
      {/* Main Canvas Container */}
      <div ref={containerRef} className="flex-1 w-full h-full relative shadow-inner">
        <canvas ref={canvasRef} className="absolute inset-0 z-10" />

        {/* Drag Overlay */}
        {isDraggingFile && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-primary-500/10 backdrop-blur-sm border-4 border-dashed border-primary-500 rounded-lg m-4 pointer-events-none">
            <div className="text-primary-600 dark:text-primary-400 font-bold text-2xl animate-pulse">
              Drop Image Here
            </div>
          </div>
        )}

        {/* Loading Shield */}
        {isLoading && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        )}
      </div>

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => {
          if (e.target.files?.[0]) handleImageUpload(e.target.files[0]);
        }}
        className="hidden"
        accept="image/*"
      />

      {/* --- Floating Toolbar (Center Top) - PhD Design --- */}
      <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-2xl border border-white/20 dark:border-white/10 shadow-2xl shadow-black/10 rounded-2xl p-2 flex items-center gap-1 ring-1 ring-black/5 dark:ring-white/5 mx-auto max-w-[90vw] overflow-x-auto no-scrollbar">
        {[
          { id: 'select', icon: MousePointer2, label: 'Select' },
          { id: 'pan', icon: Move, label: 'Pan' },
          { id: 'sep1', type: 'separator' },
          { id: 'pen', icon: Pencil, label: 'Pen' },
          { id: 'text', icon: Type, label: 'Text' },
          { id: 'image', icon: ImageIcon, label: 'Image', action: () => fileInputRef.current?.click() },
          { id: 'sep2', type: 'separator' },
          { id: 'rectangle', icon: Square, label: 'Rectangle' },
          { id: 'circle', icon: CircleIcon, label: 'Circle' },
          { id: 'triangle', icon: TriangleIcon, label: 'Triangle' },
          { id: 'sep3', type: 'separator' },
          { id: 'eraser', icon: Eraser, label: 'Eraser' },
        ].map((item: any, i) => {
          if (item.type === 'separator') return <div key={`sep-${i}`} className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1 shrink-0" />;
          return (
            <button
              key={item.id}
              onClick={() => item.action ? item.action() : setState(s => ({ ...s, tool: item.id }))}
              className={`
                p-2.5 rounded-xl transition-all duration-300 group relative shrink-0
                ${state.tool === item.id && !item.action
                  ? 'bg-gradient-to-br from-primary-500/20 to-primary-600/20 text-primary-600 dark:text-primary-300 ring-1 ring-primary-500/30'
                  : 'text-gray-500 hover:bg-gray-100/50 dark:text-gray-400 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'}
              `}
              title={item.label}
            >
              <item.icon size={20} strokeWidth={state.tool === item.id ? 2.5 : 2} />
              {/* Tooltip */}
              <span className="absolute top-full mt-3 left-1/2 -translate-x-1/2 px-2.5 py-1.5 bg-gray-900/95 dark:bg-black/95 text-white text-[10px] font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-1 group-hover:translate-y-0 whitespace-nowrap pointer-events-none shadow-xl border border-white/10 z-50">
                {item.label}
              </span>
            </button>
          )
        })}
      </div>

      {/* --- Context Property Bar (Left Side) - PhD Design --- */}
      <div className="absolute top-1/2 left-6 transform -translate-y-1/2 z-40 flex flex-col gap-4">
        {/* Colors */}
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-2xl border border-white/20 dark:border-white/10 shadow-2xl shadow-black/10 rounded-2xl p-4 flex flex-col gap-3 ring-1 ring-black/5 dark:ring-white/5 animate-fade-in-left">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('drawing.stroke') || 'Stroke'}</label>
          <div className="grid grid-cols-2 gap-2">
            {['#000000', '#ef4444', '#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6'].map(color => (
              <button
                key={color}
                onClick={() => {
                  setState(s => ({ ...s, strokeColor: color }));
                  if (fabricCanvas?.getActiveObject()) {
                    fabricCanvas.getActiveObject()?.set({ stroke: color, fill: state.tool === 'text' ? color : state.fillColor });
                    if (state.tool === 'text') fabricCanvas.getActiveObject()?.set({ fill: color });
                    fabricCanvas.requestRenderAll();
                    saveToLocalStorage();
                  }
                }}
                className={`w-8 h-8 rounded-full border-[3px] transition-all duration-300 hover:scale-110 shadow-sm ${state.strokeColor === color ? 'border-gray-900 dark:border-white scale-110 ring-2 ring-primary-500/20' : 'border-transparent'}`}
                style={{ backgroundColor: color }}
              />
            ))}
            <button className="w-8 h-8 rounded-full border-2 border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <Palette size={14} />
            </button>
          </div>

          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">{t('drawing.width') || 'Width'}</label>
          <input
            type="range" min="1" max="20"
            value={state.strokeWidth}
            onChange={(e) => {
              const w = parseInt(e.target.value);
              setState(s => ({ ...s, strokeWidth: w }));
              if (fabricCanvas?.getActiveObject()) {
                fabricCanvas.getActiveObject()?.set({ strokeWidth: w });
                fabricCanvas.requestRenderAll();
                saveToLocalStorage();
              }
            }}
            className="accent-primary-600 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full appearance-none cursor-pointer"
          />
        </div>

        {/* Actions */}
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-2xl border border-white/20 dark:border-white/10 shadow-2xl shadow-black/10 rounded-2xl p-2 flex flex-col gap-1 ring-1 ring-black/5 dark:ring-white/5 animate-fade-in-left delay-100">
          <button onClick={performUndo} disabled={historyIndex <= 0} className="p-2.5 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-30 transition-colors">
            <Undo2 size={20} />
          </button>
          <button onClick={performRedo} disabled={historyIndex >= history.length - 1} className="p-2.5 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-30 transition-colors">
            <Redo2 size={20} />
          </button>
          <div className="h-px bg-gray-200 dark:bg-gray-700 mx-2 my-1" />
          <button onClick={deleteSelected} disabled={!state.activeObject} className="p-2.5 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-30 transition-colors">
            <Trash2 size={20} />
          </button>
        </div>
      </div>

      {/* --- Zoom Controls (Bottom Right) --- */}
      <div className="absolute bottom-6 right-6 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-2xl border border-white/20 dark:border-white/10 shadow-2xl shadow-black/10 rounded-2xl p-2 flex items-center gap-2 ring-1 ring-black/5 dark:ring-white/5">
        <button onClick={() => {
          const zoom = (fabricCanvas?.getZoom() || 1) * 0.9;
          fabricCanvas?.zoomToPoint({ x: fabricCanvas.width! / 2, y: fabricCanvas.height! / 2 }, zoom);
        }} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500 transition-colors">
          <ZoomOut size={18} />
        </button>
        <span className="text-xs font-mono font-medium text-gray-500 dark:text-gray-400 w-12 text-center select-none">
          {Math.round((fabricCanvas?.getZoom() || 1) * 100)}%
        </span>
        <button onClick={() => {
          const zoom = (fabricCanvas?.getZoom() || 1) * 1.1;
          fabricCanvas?.zoomToPoint({ x: fabricCanvas.width! / 2, y: fabricCanvas.height! / 2 }, zoom);
        }} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500 transition-colors">
          <ZoomIn size={18} />
        </button>
        <div className="w-px h-6 bg-gray-300 dark:bg-gray-700 mx-1" />
        <button onClick={clearCanvas} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 text-[10px] font-bold uppercase tracking-wider transition-colors">
          Clear
        </button>
      </div>
    </div>
  );
};

export default DrawingView;