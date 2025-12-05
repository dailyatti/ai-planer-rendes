import React, { useState, useEffect, useRef } from 'react';
import {
  Brush, Save, Trash2, Download, Palette, RotateCcw,
  Square, Circle, Type, Image as ImageIcon, Move,
  Undo, Redo, Layers, ZoomIn, ZoomOut, MousePointer
} from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import * as fabric from 'fabric';

const DrawingView: React.FC = () => {
  const { drawings, addDrawing, deleteDrawing } = useData();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);
  const [activeTool, setActiveTool] = useState<'select' | 'brush' | 'text' | 'rect' | 'circle'>('brush');
  const [brushColor, setBrushColor] = useState('#3B82F6');
  const [brushSize, setBrushSize] = useState(3);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [drawingTitle, setDrawingTitle] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const colors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B',
    '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16',
    '#F97316', '#6366F1', '#000000', '#6B7280'
  ];

  // Initialize Fabric Canvas
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    // Calculate dimensions based on container
    const width = containerRef.current.clientWidth;
    const height = 600; // Fixed height for now

    const fabricCanvas = new fabric.Canvas(canvasRef.current, {
      width: width,
      height: height,
      backgroundColor: '#ffffff',
      isDrawingMode: true,
    });

    // Set initial brush
    const brush = new fabric.PencilBrush(fabricCanvas);
    brush.color = brushColor;
    brush.width = brushSize;
    fabricCanvas.freeDrawingBrush = brush;

    setCanvas(fabricCanvas);

    // Handle resize
    const handleResize = () => {
      if (containerRef.current) {
        fabricCanvas.setDimensions({
          width: containerRef.current.clientWidth,
          height: 600
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      fabricCanvas.dispose();
    };
  }, []);

  // Update Brush Settings
  useEffect(() => {
    if (!canvas) return;

    if (activeTool === 'brush') {
      canvas.isDrawingMode = true;
      if (canvas.freeDrawingBrush) {
        canvas.freeDrawingBrush.color = brushColor;
        canvas.freeDrawingBrush.width = brushSize;
      }
    } else {
      canvas.isDrawingMode = false;
    }
  }, [canvas, activeTool, brushColor, brushSize]);

  // Tools Implementation
  const addText = () => {
    if (!canvas) return;
    setActiveTool('text');
    const text = new fabric.IText('Type here...', {
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
        // Scale down if too big
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
    if (!canvas || !drawingTitle.trim()) return;
    const dataURL = canvas.toDataURL({ format: 'png', quality: 1 });
    addDrawing({
      title: drawingTitle,
      data: dataURL,
    });
    setDrawingTitle('');
    setShowSaveDialog(false);
  };

  const downloadDrawing = () => {
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `drawing-${new Date().toISOString().split('T')[0]}.png`;
    link.href = canvas.toDataURL({ format: 'png', quality: 1 });
    link.click();
  };

  return (
    <div className="view-container">
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="view-title flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 shadow-lg shadow-pink-500/30">
              <Brush size={24} className="text-white" />
            </div>
            Creative Studio
          </h1>
          <p className="view-subtitle">
            Professional drawing, image editing, and visual planning
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setShowSaveDialog(true)}
            className="btn-success"
          >
            <Save size={18} />
            <span className="hidden sm:inline">Save</span>
          </button>
          <button
            onClick={downloadDrawing}
            className="btn-primary"
          >
            <Download size={18} />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Toolbar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Tools */}
          <div className="card">
            <h3 className="section-title text-sm uppercase tracking-wider text-gray-500 mb-4">Tools</h3>
            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={() => setActiveTool('select')}
                className={`p-3 rounded-xl transition-all ${activeTool === 'select'
                    ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
                    : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                title="Select & Move"
              >
                <MousePointer size={20} />
              </button>
              <button
                onClick={() => setActiveTool('brush')}
                className={`p-3 rounded-xl transition-all ${activeTool === 'brush'
                    ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/30'
                    : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                title="Brush"
              >
                <Brush size={20} />
              </button>
              <button
                onClick={addText}
                className={`p-3 rounded-xl transition-all ${activeTool === 'text'
                    ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30'
                    : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                title="Add Text"
              >
                <Type size={20} />
              </button>
              <label className="p-3 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer flex items-center justify-center transition-all" title="Upload Image">
                <ImageIcon size={20} />
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
              <button
                onClick={addRectangle}
                className={`p-3 rounded-xl transition-all ${activeTool === 'rect'
                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                    : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                title="Rectangle"
              >
                <Square size={20} />
              </button>
              <button
                onClick={addCircle}
                className={`p-3 rounded-xl transition-all ${activeTool === 'circle'
                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                    : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                title="Circle"
              >
                <Circle size={20} />
              </button>
              <button
                onClick={deleteSelected}
                className="p-3 rounded-xl bg-red-100 text-red-600 hover:bg-red-200 transition-all"
                title="Delete Selected"
              >
                <Trash2 size={20} />
              </button>
              <button
                onClick={clearCanvas}
                className="p-3 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all"
                title="Clear Canvas"
              >
                <RotateCcw size={20} />
              </button>
            </div>
          </div>

          {/* Properties */}
          <div className="card">
            <h3 className="section-title text-sm uppercase tracking-wider text-gray-500 mb-4">Properties</h3>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Size: {brushSize}px
                </label>
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={brushSize}
                  onChange={(e) => setBrushSize(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-500"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Color
                </label>
                <div className="flex flex-wrap gap-2">
                  {colors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setBrushColor(color)}
                      className={`w-8 h-8 rounded-full border-2 transition-all duration-200 ${brushColor === color
                          ? 'border-gray-900 dark:border-white scale-110 shadow-md'
                          : 'border-transparent hover:scale-105'
                        }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                  <input
                    type="color"
                    value={brushColor}
                    onChange={(e) => setBrushColor(e.target.value)}
                    className="w-8 h-8 rounded-full overflow-hidden cursor-pointer border-0 p-0"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Saved Drawings List */}
          <div className="card max-h-[300px] overflow-y-auto">
            <h3 className="section-title text-sm uppercase tracking-wider text-gray-500 mb-4">Saved</h3>
            {drawings.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No drawings yet</p>
            ) : (
              <div className="space-y-3">
                {drawings.map((drawing) => (
                  <div key={drawing.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
                    <img src={drawing.data} alt={drawing.title} className="w-10 h-10 rounded object-cover bg-gray-100" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate text-gray-900 dark:text-white">{drawing.title}</p>
                      <p className="text-xs text-gray-500">{new Date(drawing.createdAt).toLocaleDateString()}</p>
                    </div>
                    <button
                      onClick={() => deleteDrawing(drawing.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Canvas Area */}
        <div className="lg:col-span-3">
          <div
            ref={containerRef}
            className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-700 h-[600px] relative"
          >
            <canvas ref={canvasRef} />

            {/* Empty State Hint */}
            {!canvas && (
              <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                <p>Initializing Studio...</p>
              </div>
            )}
          </div>
          <p className="text-center text-sm text-gray-500 mt-3">
            Tip: Use the Select tool to move, resize, or rotate objects. Press 'Delete' to remove selected items.
          </p>
        </div>
      </div>

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="modal-backdrop">
          <div className="modal-panel p-6 animate-scale-in">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Save Masterpiece
            </h3>
            <input
              type="text"
              value={drawingTitle}
              onChange={(e) => setDrawingTitle(e.target.value)}
              className="input-field mb-6"
              placeholder="Enter a title..."
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowSaveDialog(false)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={saveDrawing}
                disabled={!drawingTitle.trim()}
                className="btn-primary flex-1"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DrawingView;