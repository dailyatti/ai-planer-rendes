import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as fabric from 'fabric';
import {
  Pencil, Square, Circle as CircleIcon, Triangle as TriangleIcon,
  Type, Image as ImageIcon, Eraser, MousePointer2,
  Undo2, Redo2, Download, Trash2, Move, ZoomIn, ZoomOut,
  Maximize2, Palette, Minus
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
}

const DrawingView: React.FC = () => {
  const { t } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<fabric.Canvas | null>(null);

  // State
  const [state, setState] = useState<DrawingState>({
    tool: 'select',
    strokeColor: '#000000',
    fillColor: 'transparent',
    strokeWidth: 3,
    opacity: 1,
    fontFamily: 'Inter'
  });

  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(true);

  // --- Initialization ---
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    // Initialize Fabric Canvas
    const canvas = new fabric.Canvas(canvasRef.current, {
      isDrawingMode: false,
      selection: true,
      backgroundColor: '#ffffff',
      preserveObjectStacking: true, // Key for layer management
      stopContextMenu: true,
      fireRightClick: true,
    });

    // Set initial dimensions
    canvas.setDimensions({
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight || window.innerHeight - 100
    });

    // Custom properties for cleaner UI
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

    // Resize Observer
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
        if (zoom < 0.01) zoom = 0.01; // Allow deep zoom out
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
        opt.e.prevntDefault();
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
        // Restore selection mode if we were just temporarily panning
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

  // --- Persistence (PhD Level Auto-Save) ---
  // Save to local storage
  const saveToLocalStorage = useCallback(() => {
    if (!fabricCanvas) return;
    const json = JSON.stringify(fabricCanvas.toJSON());
    localStorage.setItem('drawing_draft', json);
    console.log('[DrawingView] Auto-saved draft');

    // Update History
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(json);
    // Limit history for performance
    if (newHistory.length > 50) newHistory.shift();

    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);

  }, [fabricCanvas, history, historyIndex]);

  // Debounced Save on changes
  useEffect(() => {
    if (!fabricCanvas) return;

    const handleObjectModified = () => saveToLocalStorage();
    const handlePathCreated = () => saveToLocalStorage();

    fabricCanvas.on('object:modified', handleObjectModified);
    fabricCanvas.on('path:created', handlePathCreated);
    fabricCanvas.on('object:added', handleObjectModified);
    fabricCanvas.on('object:removed', handleObjectModified);

    return () => {
      fabricCanvas.off('object:modified', handleObjectModified);
      fabricCanvas.off('path:created', handlePathCreated);
      fabricCanvas.off('object:added', handleObjectModified);
      fabricCanvas.off('object:removed', handleObjectModified);
    };
  }, [fabricCanvas, saveToLocalStorage]);

  // Restore from Storage
  useEffect(() => {
    if (!fabricCanvas) return;
    const saved = localStorage.getItem('drawing_draft');
    if (saved) {
      fabricCanvas.loadFromJSON(saved, () => {
        fabricCanvas.renderAll();
        setHistory([saved]);
        setHistoryIndex(0);
        setIsLoading(false);
        console.log('[DrawingView] Restored draft');
      });
    } else {
      setIsLoading(false);
      // Save initial blank state
      const json = JSON.stringify(fabricCanvas.toJSON());
      setHistory([json]);
      setHistoryIndex(0);
    }
  }, [fabricCanvas]);


  return (
    <div className="h-full flex flex-col relative bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Main Canvas Container */}
      <div ref={containerRef} className="flex-1 w-full h-full relative shadow-inner">
        <canvas ref={canvasRef} className="absolute inset-0 z-10" />

        {/* Loading Shield */}
        {isLoading && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        )}
      </div>

      {/* TEMP Controls to verify step 1 */}
      <div className="absolute top-4 left-4 z-50 bg-white dark:bg-gray-800 p-2 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700">
        <p className="text-xs font-bold text-gray-500 mb-1">DEV MODE: v0.3.0</p>
        <div className="flex gap-2">
          <button onClick={() => setState(s => ({ ...s, tool: 'select' }))} className={`p-2 rounded ${state.tool === 'select' ? 'bg-blue-100 text-blue-600' : ''}`}><MousePointer2 size={20} /></button>
          <button onClick={() => setState(s => ({ ...s, tool: 'pan' }))} className={`p-2 rounded ${state.tool === 'pan' ? 'bg-blue-100 text-blue-600' : ''}`}><Move size={20} /></button>
        </div>
        <p className="text-xs text-gray-400 mt-2">Scroll to Zoom, Shift+Drag to Pan</p>
      </div>
    </div>
  );
};

export default DrawingView;