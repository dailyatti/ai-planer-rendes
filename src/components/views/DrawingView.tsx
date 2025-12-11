import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Brush, Save, Trash2, Download, RotateCcw,
  Square, Circle, Type, Image as ImageIcon, MousePointer,
  Eraser, Undo2, Redo2, Layers, X, ChevronDown, Palette
} from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useLanguage } from '../../contexts/LanguageContext';
import * as fabric from 'fabric';

const DrawingView: React.FC = () => {
  const { drawings, addDrawing, deleteDrawing } = useData();
  const { t } = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);
  const [activeTool, setActiveTool] = useState<'select' | 'brush' | 'eraser' | 'text' | 'rect' | 'circle'>('brush');
  const [brushColor, setBrushColor] = useState('#3B82F6');
  const [brushSize, setBrushSize] = useState(3);
  const [opacity, setOpacity] = useState(100);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showSavedDrawings, setShowSavedDrawings] = useState(false);
  const [drawingTitle, setDrawingTitle] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Translations object for local use


  const colors = [
    '#3B82F6', '#EF4444', '#10B981',
    '#F59E0B', '#8B5CF6', '#EC4899',
    '#06B6D4', '#84CC16', '#F97316',
  ];

  // Initialize Fabric Canvas
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight || 600;

    const fabricCanvas = new fabric.Canvas(canvasRef.current, {
      width: width,
      height: height,
      backgroundColor: '#ffffff',
      isDrawingMode: true,
    });

    const brush = new fabric.PencilBrush(fabricCanvas);
    brush.color = brushColor;
    brush.width = brushSize;
    fabricCanvas.freeDrawingBrush = brush;

    setCanvas(fabricCanvas);

    // Save initial state or restore from draft
    const savedDraft = localStorage.getItem('drawing_draft');
    if (savedDraft) {
      fabricCanvas.loadFromJSON(savedDraft, () => {
        fabricCanvas.renderAll();
        setHistory([savedDraft]);
        setHistoryIndex(0);
        console.log('[DrawingView] Draft restored from localStorage');
      });
    } else {
      const json = JSON.stringify(fabricCanvas.toJSON());
      setHistory([json]);
      setHistoryIndex(0);
    }

    const handleResize = () => {
      if (containerRef.current) {
        fabricCanvas.setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight || 600
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      fabricCanvas.dispose();
    };
  }, []);

  // Save state for undo/redo and auto-save
  const saveState = useCallback(() => {
    if (!canvas) return;
    const json = JSON.stringify(canvas.toJSON());
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(json);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);

    // Auto-save draft
    localStorage.setItem('drawing_draft', json);
  }, [canvas, history, historyIndex]);

  // Listen for canvas changes
  useEffect(() => {
    if (!canvas) return;

    const handleModified = () => saveState();
    canvas.on('object:added', handleModified);
    canvas.on('object:modified', handleModified);
    canvas.on('object:removed', handleModified);

    return () => {
      canvas.off('object:added', handleModified);
      canvas.off('object:modified', handleModified);
      canvas.off('object:removed', handleModified);
    };
  }, [canvas, saveState]);

  // Update Brush Settings
  useEffect(() => {
    if (!canvas) return;

    if (activeTool === 'brush' || activeTool === 'eraser') {
      canvas.isDrawingMode = true;
      if (canvas.freeDrawingBrush) {
        canvas.freeDrawingBrush.color = activeTool === 'eraser' ? '#FFFFFF' : brushColor;
        canvas.freeDrawingBrush.width = brushSize;
      }
    } else {
      canvas.isDrawingMode = false;
    }
  }, [canvas, activeTool, brushColor, brushSize]);

  // Undo / Redo
  const handleUndo = () => {
    if (!canvas || historyIndex <= 0) return;
    const newIndex = historyIndex - 1;
    canvas.loadFromJSON(history[newIndex], () => {
      canvas.renderAll();
      setHistoryIndex(newIndex);
    });
  };

  const handleRedo = () => {
    if (!canvas || historyIndex >= history.length - 1) return;
    const newIndex = historyIndex + 1;
    canvas.loadFromJSON(history[newIndex], () => {
      canvas.renderAll();
      setHistoryIndex(newIndex);
    });
  };

  // Tools Implementation
  const addText = () => {
    if (!canvas) return;
    setActiveTool('text');
    const text = new fabric.IText(t('drawing.defaultText'), {
      left: 100,
      top: 100,
      fontFamily: 'Inter',
      fill: brushColor,
      fontSize: 24,
    });
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
  };

  const addRectangle = () => {
    if (!canvas) return;
    setActiveTool('rect');
    const rect = new fabric.Rect({
      left: 100,
      top: 100,
      fill: 'transparent',
      stroke: brushColor,
      strokeWidth: brushSize,
      width: 100,
      height: 100,
    });
    canvas.add(rect);
    canvas.setActiveObject(rect);
    canvas.renderAll();
  };

  const addCircle = () => {
    if (!canvas) return;
    setActiveTool('circle');
    const circle = new fabric.Circle({
      left: 100,
      top: 100,
      fill: 'transparent',
      stroke: brushColor,
      strokeWidth: brushSize,
      radius: 50,
    });
    canvas.add(circle);
    canvas.setActiveObject(circle);
    canvas.renderAll();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canvas || !e.target.files || !e.target.files[0]) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const imgObj = new Image();
      imgObj.src = event.target?.result as string;
      imgObj.onload = () => {
        const imgInstance = new fabric.Image(imgObj);
        if (imgInstance.width! > 300) {
          imgInstance.scaleToWidth(300);
        }
        canvas.add(imgInstance);
        canvas.centerObject(imgInstance);
        canvas.setActiveObject(imgInstance);
        canvas.renderAll();
      };
    };
    reader.readAsDataURL(e.target.files[0]);
  };

  const clearCanvas = () => {
    if (!canvas) return;
    canvas.clear();
    canvas.backgroundColor = '#ffffff';
    canvas.renderAll();
    saveState();
    localStorage.removeItem('drawing_draft');
  };

  const deleteSelected = () => {
    if (!canvas) return;
    const activeObjects = canvas.getActiveObjects();
    if (activeObjects.length) {
      canvas.discardActiveObject();
      activeObjects.forEach((obj) => {
        canvas.remove(obj);
      });
      canvas.renderAll();
    }
  };

  const saveDrawing = () => {
    console.log('[DrawingView] saveDrawing called. Canvas:', canvas, 'Title:', drawingTitle);
    if (!canvas || !drawingTitle.trim()) {
      console.log('[DrawingView] saveDrawing aborted - missing canvas or title');
      return;
    }
    const dataURL = canvas.toDataURL({ format: 'png', quality: 1, multiplier: 1 });
    console.log('[DrawingView] dataURL generated, length:', dataURL?.length);
    addDrawing({
      title: drawingTitle,
      data: dataURL,
    });
    console.log('[DrawingView] addDrawing called');
    setDrawingTitle('');
    setShowSaveDialog(false);
  };

  const downloadDrawing = () => {
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `drawing-${new Date().toISOString().split('T')[0]}.png`;
    link.href = canvas.toDataURL({ format: 'png', quality: 1, multiplier: 1 });
    link.click();
  };

  return (
    <div className="view-container relative min-h-screen">
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="view-title flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 shadow-lg shadow-pink-500/30">
              <Palette size={24} className="text-white" />
            </div>
            {t('drawing.title')}
          </h1>
          <p className="view-subtitle">
            {t('drawing.subtitle')}
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setShowSaveDialog(true)}
            className="btn-success"
          >
            <Save size={18} />
            <span className="hidden sm:inline">{t('drawing.save')}</span>
          </button>
          <button
            onClick={downloadDrawing}
            className="btn-primary"
          >
            <Download size={18} />
            <span className="hidden sm:inline">{t('drawing.export')}</span>
          </button>
        </div>
      </div>

      {/* Main Layout with Floating Panels */}
      <div className="relative flex gap-4">
        {/* Floating Tools Panel (Left) */}
        <div className="flex-shrink-0 w-20">
          <div className="glass-card p-3 sticky top-4">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3 text-center">
              {t('drawing.tools')}
            </h3>
            <div className="flex flex-col gap-2">
              {/* Selection */}
              <button
                onClick={() => setActiveTool('select')}
                className={`p-3 rounded-xl transition-all flex items-center justify-center ${activeTool === 'select'
                  ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
                  : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                title={t('drawing.select')}
              >
                <MousePointer size={20} />
              </button>
              {/* Brush */}
              <button
                onClick={() => setActiveTool('brush')}
                className={`p-3 rounded-xl transition-all flex items-center justify-center ${activeTool === 'brush'
                  ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/30'
                  : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                title={t('drawing.brush')}
              >
                <Brush size={20} />
              </button>
              {/* Eraser */}
              <button
                onClick={() => setActiveTool('eraser')}
                className={`p-3 rounded-xl transition-all flex items-center justify-center ${activeTool === 'eraser'
                  ? 'bg-gray-800 text-white shadow-lg'
                  : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                title={t('drawing.eraser')}
              >
                <Eraser size={20} />
              </button>
              {/* Text */}
              <button
                onClick={addText}
                className={`p-3 rounded-xl transition-all flex items-center justify-center ${activeTool === 'text'
                  ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30'
                  : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                title={t('drawing.text')}
              >
                <Type size={20} />
              </button>
              {/* Image Upload */}
              <label
                className="p-3 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer flex items-center justify-center transition-all"
                title={t('drawing.image')}
              >
                <ImageIcon size={20} />
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
              {/* Rectangle */}
              <button
                onClick={addRectangle}
                className={`p-3 rounded-xl transition-all flex items-center justify-center ${activeTool === 'rect'
                  ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                  : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                title={t('drawing.rectangle')}
              >
                <Square size={20} />
              </button>
              {/* Circle */}
              <button
                onClick={addCircle}
                className={`p-3 rounded-xl transition-all flex items-center justify-center ${activeTool === 'circle'
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                  : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                title={t('drawing.circle')}
              >
                <Circle size={20} />
              </button>

              <hr className="border-gray-200 dark:border-gray-600 my-1" />

              {/* Delete Selected */}
              <button
                onClick={deleteSelected}
                className="p-3 rounded-xl bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 transition-all flex items-center justify-center"
                title={t('drawing.deleteSelected')}
              >
                <Trash2 size={20} />
              </button>
              {/* Clear Canvas */}
              <button
                onClick={clearCanvas}
                className="p-3 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600 transition-all flex items-center justify-center"
                title={t('drawing.clearCanvas')}
              >
                <RotateCcw size={20} />
              </button>

              <hr className="border-gray-200 dark:border-gray-600 my-1" />

              {/* Undo */}
              <button
                onClick={handleUndo}
                disabled={historyIndex <= 0}
                className="p-3 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600 transition-all flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
                title={t('drawing.undo')}
              >
                <Undo2 size={20} />
              </button>
              {/* Redo */}
              <button
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1}
                className="p-3 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600 transition-all flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
                title={t('drawing.redo')}
              >
                <Redo2 size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1">
          <div
            ref={containerRef}
            className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-700 h-[600px] relative"
          >
            <canvas ref={canvasRef} />

            {!canvas && (
              <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                <p>{t('drawing.initializing')}</p>
              </div>
            )}
          </div>
          <p className="text-center text-sm text-gray-500 mt-3">
            {t('drawing.tip')}
          </p>
        </div>

        {/* Floating Properties Panel (Right) */}
        <div className="flex-shrink-0 w-56">
          <div className="glass-card p-4 sticky top-4 space-y-5">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {t('drawing.properties')}
            </h3>

            {/* Size Slider */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                {t('drawing.size')}: {brushSize}px
              </label>
              <input
                type="range"
                min="1"
                max="50"
                value={brushSize}
                onChange={(e) => setBrushSize(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
              />
            </div>

            {/* Opacity Slider */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                {t('drawing.opacity')}: {opacity}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={opacity}
                onChange={(e) => setOpacity(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
              />
            </div>

            {/* Color Picker */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                {t('drawing.color')}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {colors.map((color) => (
                  <button
                    key={color}
                    onClick={() => setBrushColor(color)}
                    className={`w-10 h-10 rounded-xl border-2 transition-all duration-200 ${brushColor === color
                      ? 'border-gray-900 dark:border-white scale-110 shadow-md'
                      : 'border-transparent hover:scale-105'
                      }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <input
                type="color"
                value={brushColor}
                onChange={(e) => setBrushColor(e.target.value)}
                className="w-full h-10 mt-2 rounded-xl overflow-hidden cursor-pointer border-0 p-0"
              />
            </div>

            <hr className="border-gray-200 dark:border-gray-600" />

            {/* Saved Drawings Toggle */}
            <button
              onClick={() => setShowSavedDrawings(!showSavedDrawings)}
              className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              <span className="flex items-center gap-2">
                <Layers size={16} />
                {t('drawing.savedDrawings')}
              </span>
              <ChevronDown size={16} className={`transition-transform ${showSavedDrawings ? 'rotate-180' : ''}`} />
            </button>

            {showSavedDrawings && (
              <div className="max-h-40 overflow-y-auto space-y-2">
                {drawings.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-2">{t('drawing.noDrawings')}</p>
                ) : (
                  drawings.map((drawing) => (
                    <div key={drawing.id} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
                      <img src={drawing.data} alt={drawing.title} className="w-8 h-8 rounded object-cover bg-gray-100" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate text-gray-900 dark:text-white">{drawing.title}</p>
                      </div>
                      <button
                        onClick={() => deleteDrawing(drawing.id)}
                        className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="modal-backdrop">
          <div className="modal-panel p-6 animate-scale-in max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {t('drawing.saveMasterpiece')}
              </h3>
              <button onClick={() => setShowSaveDialog(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <input
              type="text"
              value={drawingTitle}
              onChange={(e) => setDrawingTitle(e.target.value)}
              className="input-field mb-6"
              placeholder={t('drawing.enterTitle')}
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowSaveDialog(false)}
                className="btn-secondary flex-1"
              >
                {t('drawing.cancel')}
              </button>
              <button
                onClick={saveDrawing}
                disabled={!drawingTitle.trim()}
                className="btn-primary flex-1"
              >
                {t('drawing.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DrawingView;