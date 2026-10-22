import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Undo,
  Redo,
  Trash2,
  Plus,
  Sparkles,
  Search,
  Check,
  ChevronRight,
  Eye,
  Sliders,
  Type,
  RotateCcw,
} from 'lucide-react';
import { GlyphData, GlyphStroke, LigatureData, PenSettings } from '../types/font';
import {
  CANVAS_ASCENDER,
  CANVAS_BASELINE,
  CANVAS_CAP_HEIGHT,
  CANVAS_DESCENDER,
  CANVAS_SIZE,
  CANVAS_X_HEIGHT,
  strokesToSvgPath,
} from '../utils/fontEngine';

interface LigaturesEditorProps {
  ligatures: Record<string, LigatureData>;
  onUpdateLigature: (id: string, updated: LigatureData) => void;
  onAddLigature: (newLig: LigatureData) => void;
  onDeleteLigature: (id: string) => void;
  glyphs: Record<string, GlyphData>;
  penSettings: PenSettings;
  setPenSettings: React.Dispatch<React.SetStateAction<PenSettings>>;
  slant: number;
  liveFontFamily: string;
}

export const LigaturesEditor: React.FC<LigaturesEditorProps> = ({
  ligatures,
  onUpdateLigature,
  onAddLigature,
  onDeleteLigature,
  glyphs,
  penSettings,
  setPenSettings,
  slant,
  liveFontFamily,
}) => {
  const [activeLigatureId, setActiveLigatureId] = useState<string>('fi');
  const [newSequence, setNewSequence] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showGuides, setShowGuides] = useState<boolean>(true);
  const [showGhostLetters, setShowGhostLetters] = useState<boolean>(true);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [testSentence, setTestSentence] = useState<string>(
    'First flight over the stiff stone forest with flowing feathers.'
  );
  const [enableGsubPreview, setEnableGsubPreview] = useState<boolean>(true);

  // Undo and Redo stacks for ligature strokes
  const [undoStack, setUndoStack] = useState<GlyphStroke[][]>([]);
  const [redoStack, setRedoStack] = useState<GlyphStroke[][]>([]);

  // Clear local stacks when switching ligatures
  useEffect(() => {
    setUndoStack([]);
    setRedoStack([]);
  }, [activeLigatureId]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const activeLigature = ligatures[activeLigatureId] || {
    id: activeLigatureId,
    sequence: activeLigatureId,
    name: activeLigatureId.split('').join('_'),
    strokes: [],
    advanceWidth: 760,
    description: 'Custom ligature',
  };

  const currentStrokes = activeLigature.strokes || [];

  // Redraw canvas on state changes
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
    }

    ctx.save();
    ctx.scale((rect.width * dpr) / CANVAS_SIZE, (rect.height * dpr) / CANVAS_SIZE);

    // Warm archival paper background
    ctx.fillStyle = '#faf9f5';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Subtle texture grid
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x < CANVAS_SIZE; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_SIZE);
      ctx.stroke();
    }
    for (let y = 0; y < CANVAS_SIZE; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_SIZE, y);
      ctx.stroke();
    }

    // Slant lines
    if (slant !== 0) {
      ctx.strokeStyle = 'rgba(217, 119, 6, 0.12)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);
      const angleRad = (slant * Math.PI) / 180;
      const tanSlant = Math.tan(angleRad);
      for (let x = -CANVAS_SIZE; x < CANVAS_SIZE * 2; x += 120) {
        ctx.beginPath();
        ctx.moveTo(x + (CANVAS_BASELINE - 0) * tanSlant, 0);
        ctx.lineTo(x + (CANVAS_BASELINE - CANVAS_SIZE) * tanSlant, CANVAS_SIZE);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }

    // Typographic guidelines
    if (showGuides) {
      // Ascender
      ctx.strokeStyle = '#93c5fd';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(40, CANVAS_ASCENDER);
      ctx.lineTo(CANVAS_SIZE - 40, CANVAS_ASCENDER);
      ctx.stroke();

      // Cap Height
      ctx.strokeStyle = '#60a5fa';
      ctx.beginPath();
      ctx.moveTo(40, CANVAS_CAP_HEIGHT);
      ctx.lineTo(CANVAS_SIZE - 40, CANVAS_CAP_HEIGHT);
      ctx.stroke();

      // X-Height
      ctx.strokeStyle = '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(40, CANVAS_X_HEIGHT);
      ctx.lineTo(CANVAS_SIZE - 40, CANVAS_X_HEIGHT);
      ctx.stroke();

      // Baseline
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.8;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(40, CANVAS_BASELINE);
      ctx.lineTo(CANVAS_SIZE - 40, CANVAS_BASELINE);
      ctx.stroke();

      // Descender
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(40, CANVAS_DESCENDER);
      ctx.lineTo(CANVAS_SIZE - 40, CANVAS_DESCENDER);
      ctx.stroke();

      ctx.setLineDash([]);

      // Advance width boundaries for this wide ligature
      const originX = 100;
      const rightX = originX + (activeLigature.advanceWidth || 760) * 0.76;
      ctx.strokeStyle = 'rgba(100, 116, 139, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(originX, 60);
      ctx.lineTo(originX, CANVAS_SIZE - 60);
      ctx.moveTo(rightX, 60);
      ctx.lineTo(rightX, CANVAS_SIZE - 60);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Ghost letter reference watermark
    if (showGhostLetters) {
      ctx.fillStyle = 'rgba(100, 116, 139, 0.08)';
      ctx.font = '280px "Caveat", "Playfair Display", serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(activeLigature.sequence, CANVAS_SIZE / 2, CANVAS_BASELINE);
    }

    // Render user ink strokes
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a';

    for (const stroke of currentStrokes) {
      if (!stroke || stroke.length === 0) continue;

      if (stroke.length === 1) {
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        const r = (penSettings.baseWidth * (stroke[0].pressure || 1)) / 2;
        ctx.arc(stroke[0].x, stroke[0].y, r, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }

      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);

      for (let i = 1; i < stroke.length; i++) {
        const pt = stroke[i];
        let w = penSettings.baseWidth;
        if (penSettings.pressureSensitivity) {
          w *= pt.pressure || 1;
        }
        ctx.lineWidth = w;
        ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();
    }

    ctx.restore();
  }, [
    currentStrokes,
    showGuides,
    showGhostLetters,
    slant,
    activeLigature.advanceWidth,
    activeLigature.sequence,
    penSettings,
  ]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0, pressure: 1 };
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * CANVAS_SIZE;
    const y = ((e.clientY - rect.top) / rect.height) * CANVAS_SIZE;
    const pressure = e.pressure && e.pressure > 0 ? e.pressure : 1;
    return { x: Math.round(x), y: Math.round(y), pressure };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDrawing(true);
    const pt = getCanvasPoint(e);
    setUndoStack((prev) => [...prev.slice(-49), currentStrokes]);
    setRedoStack([]);
    const updated = {
      ...activeLigature,
      strokes: [...currentStrokes, [pt]],
    };
    onUpdateLigature(activeLigatureId, updated);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const pt = getCanvasPoint(e);
    const strokes = [...currentStrokes];
    if (strokes.length === 0) return;

    const activeStroke = [...strokes[strokes.length - 1]];
    const lastPt = activeStroke[activeStroke.length - 1];
    if (lastPt && Math.hypot(pt.x - lastPt.x, pt.y - lastPt.y) < 3) return;

    activeStroke.push(pt);
    strokes[strokes.length - 1] = activeStroke;
    onUpdateLigature(activeLigatureId, {
      ...activeLigature,
      strokes,
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
  };

  const handleUndo = useCallback(() => {
    if (undoStack.length > 0) {
      const prev = undoStack[undoStack.length - 1];
      setUndoStack((u) => u.slice(0, -1));
      setRedoStack((r) => [...r.slice(-49), currentStrokes]);
      onUpdateLigature(activeLigatureId, {
        ...activeLigature,
        strokes: prev,
      });
    } else if (currentStrokes.length > 0) {
      setRedoStack((r) => [...r.slice(-49), currentStrokes]);
      onUpdateLigature(activeLigatureId, {
        ...activeLigature,
        strokes: currentStrokes.slice(0, -1),
      });
    }
  }, [undoStack, currentStrokes, activeLigature, activeLigatureId, onUpdateLigature]);

  const handleRedo = useCallback(() => {
    if (redoStack.length > 0) {
      const next = redoStack[redoStack.length - 1];
      setRedoStack((r) => r.slice(0, -1));
      setUndoStack((u) => [...u.slice(-49), currentStrokes]);
      onUpdateLigature(activeLigatureId, {
        ...activeLigature,
        strokes: next,
      });
    }
  }, [redoStack, currentStrokes, activeLigature, activeLigatureId, onUpdateLigature]);

  const handleClear = () => {
    if (currentStrokes.length > 0) {
      setUndoStack((u) => [...u.slice(-49), currentStrokes]);
      setRedoStack([]);
      onUpdateLigature(activeLigatureId, {
        ...activeLigature,
        strokes: [],
      });
    }
  };

  // Keyboard shortcuts for Ligatures Editor
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        (document.activeElement as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      if ((e.metaKey || e.ctrlKey) && (e.key === 'z' || e.key === 'Z') && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if (
        ((e.metaKey || e.ctrlKey) && (e.key === 'y' || e.key === 'Y')) ||
        ((e.metaKey || e.ctrlKey) && (e.key === 'z' || e.key === 'Z') && e.shiftKey)
      ) {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  const handleAddNewLigature = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSeq = newSequence.trim();
    if (cleanSeq.length < 2) return;

    const id = cleanSeq.toLowerCase();
    const newLig: LigatureData = {
      id,
      sequence: cleanSeq,
      name: cleanSeq.split('').join('_'),
      strokes: [],
      advanceWidth: Math.max(700, cleanSeq.length * 360),
      description: `Custom handwritten ligature for "${cleanSeq}"`,
    };

    onAddLigature(newLig);
    setActiveLigatureId(id);
    setNewSequence('');
  };

  const filteredLigatures = Object.values(ligatures).filter((lig) =>
    lig.sequence.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-61px)] bg-slate-50 overflow-hidden">
      {/* Left Column: Ligatures Directory & Creator */}
      <aside className="w-full lg:w-80 bg-white border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-slate-900 tracking-wider uppercase font-mono">
              OpenType Ligatures
            </h2>
            <span className="text-xs text-slate-500 font-mono tabular-nums">
              {Object.values(ligatures).filter((l) => l.strokes.length > 0).length} active
            </span>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search (fi, fl, st)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>
        </div>

        {/* Ligatures List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {filteredLigatures.map((lig) => {
            const isSelected = lig.id === activeLigatureId;
            const hasStrokes = lig.strokes && lig.strokes.length > 0;

            return (
              <button
                key={lig.id}
                onClick={() => setActiveLigatureId(lig.id)}
                className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${
                  isSelected ? 'bg-slate-900 text-white' : 'hover:bg-slate-50 text-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-11 h-11 rounded-lg flex items-center justify-center font-bold text-lg font-['Caveat',sans-serif] ${
                      isSelected
                        ? 'bg-slate-800 text-white'
                        : 'bg-slate-100 text-slate-900 border border-slate-200'
                    }`}
                  >
                    {hasStrokes ? (
                      <svg viewBox="0 0 800 800" className="w-8 h-8">
                        <path
                          d={strokesToSvgPath(lig.strokes)}
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={penSettings.baseWidth}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : (
                      lig.sequence
                    )}
                  </div>

                  <div>
                    <div className="text-xs font-semibold leading-tight flex items-center gap-2">
                      <span>{lig.sequence}</span>
                      {hasStrokes && (
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isSelected ? 'bg-emerald-400' : 'bg-emerald-600'
                          }`}
                        />
                      )}
                    </div>
                    <div
                      className={`text-[10px] truncate max-w-[150px] ${
                        isSelected ? 'text-slate-300' : 'text-slate-400'
                      }`}
                    >
                      {lig.description}
                    </div>
                  </div>
                </div>

                <ChevronRight
                  className={`w-3.5 h-3.5 ${isSelected ? 'text-slate-400' : 'text-slate-300'}`}
                />
              </button>
            );
          })}
        </div>

        {/* Add Custom Ligature Form */}
        <div className="p-3.5 border-t border-slate-200 bg-slate-50/80 space-y-2">
          <form onSubmit={handleAddNewLigature} className="space-y-2">
            <span className="text-xs font-semibold text-slate-700">Add Custom Ligature:</span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="e.g. ct, sh, qu"
                value={newSequence}
                onChange={(e) => setNewSequence(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
              <button
                type="submit"
                disabled={newSequence.trim().length < 2}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white rounded text-xs font-medium transition-colors"
              >
                Create
              </button>
            </div>
          </form>
        </div>
      </aside>

      {/* Center: Tactile Ligature Drawing Canvas */}
      <main className="flex-1 flex flex-col overflow-hidden bg-slate-100">
        {/* Workspace Toolbar */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-white border-b border-slate-200 gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center px-3.5 py-1.5 rounded-lg bg-slate-900 text-white font-bold text-lg font-['Plus_Jakarta_Sans'] shadow-inner">
              {activeLigature.sequence}
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 leading-tight">
                Ligature: "{activeLigature.sequence}"
              </h2>
              <p className="text-xs text-slate-500 font-mono">
                OpenType GSUB tag: liga · {activeLigature.strokes.length} strokes
              </p>
            </div>
          </div>

          {/* Pen Tool Segmented Control */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {(
              [
                { id: 'fountain', label: 'Fountain Pen' },
                { id: 'rollerball', label: 'Gel Pen' },
                { id: 'drafting', label: 'Drafting 0.5' },
                { id: 'calligraphy', label: 'Broad Nib' },
              ] as const
            ).map((tool) => (
              <button
                key={tool.id}
                onClick={() => setPenSettings((prev) => ({ ...prev, tool: tool.id }))}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                  penSettings.tool === tool.id
                    ? 'bg-white text-slate-900 shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tool.label}
              </button>
            ))}
          </div>

          {/* Actions: Undo, Redo, Clear */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleUndo}
              disabled={undoStack.length === 0 && currentStrokes.length === 0}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-40 transition-colors shadow-2xs"
              title={`Undo last ligature stroke [Ctrl+Z]${undoStack.length > 0 ? ` (${undoStack.length} in history)` : ''}`}
            >
              <Undo className="w-3.5 h-3.5" />
              <span>Undo</span>
              {undoStack.length > 0 && (
                <span className="text-[10px] font-mono font-semibold px-1 rounded bg-slate-100 text-slate-600 tabular-nums">
                  {undoStack.length}
                </span>
              )}
            </button>
            <button
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-40 transition-colors shadow-2xs"
              title={`Redo reverted stroke [Ctrl+Y / Ctrl+Shift+Z]${redoStack.length > 0 ? ` (${redoStack.length} available)` : ''}`}
            >
              <Redo className="w-3.5 h-3.5" />
              <span>Redo</span>
              {redoStack.length > 0 && (
                <span className="text-[10px] font-mono font-semibold px-1 rounded bg-slate-100 text-slate-600 tabular-nums">
                  {redoStack.length}
                </span>
              )}
            </button>
            <button
              onClick={handleClear}
              disabled={currentStrokes.length === 0}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-rose-600 bg-white border border-rose-200 rounded-md hover:bg-rose-50 disabled:opacity-40 transition-colors shadow-2xs"
              title="Clear ligature canvas"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          </div>
        </div>

        {/* Main Canvas Viewport */}
        <div className="flex-1 flex items-center justify-center p-4 lg:p-6 overflow-hidden relative">
          <div className="relative shadow-2xl rounded-xl overflow-hidden border border-slate-300 bg-white max-w-[640px] max-h-[640px] w-full aspect-square touch-none">
            <canvas
              ref={canvasRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              className="w-full h-full cursor-crosshair block"
              style={{ touchAction: 'none' }}
            />

            {/* Canvas Guideline Labels */}
            {showGuides && (
              <div className="absolute left-2.5 top-0 bottom-0 pointer-events-none flex flex-col justify-between py-2 text-[10px] font-mono text-slate-400 select-none">
                <span style={{ top: '20%' }} className="absolute">
                  Ascender
                </span>
                <span style={{ top: '30%' }} className="absolute">
                  Cap
                </span>
                <span style={{ top: '50%' }} className="absolute">
                  x-Height
                </span>
                <span style={{ top: '75%' }} className="absolute text-rose-500 font-semibold">
                  Baseline
                </span>
                <span style={{ top: '95%' }} className="absolute">
                  Descender
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Inspector Bar */}
        <div className="bg-white border-t border-slate-200 px-6 py-2.5 flex items-center justify-between text-xs text-slate-600 flex-wrap gap-4">
          <div className="flex items-center gap-5">
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showGuides}
                onChange={(e) => setShowGuides(e.target.checked)}
                className="rounded border-slate-300 text-slate-900 focus:ring-0"
              />
              <span>Guidelines</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showGhostLetters}
                onChange={(e) => setShowGhostLetters(e.target.checked)}
                className="rounded border-slate-300 text-slate-900 focus:ring-0"
              />
              <span>Ghost Guide Letters</span>
            </label>
          </div>

          {/* Advance Width Slider */}
          <div className="flex items-center gap-3">
            <span className="text-slate-500 font-mono">
              Advance: {activeLigature.advanceWidth || 760}
            </span>
            <input
              type="range"
              min="500"
              max="1100"
              step="10"
              value={activeLigature.advanceWidth || 760}
              onChange={(e) =>
                onUpdateLigature(activeLigatureId, {
                  ...activeLigature,
                  advanceWidth: Number(e.target.value),
                })
              }
              className="w-28 accent-slate-900"
            />
          </div>

          {/* Stroke Width Slider */}
          <div className="flex items-center gap-3">
            <span className="text-slate-500 font-mono">Stroke: {penSettings.baseWidth}px</span>
            <input
              type="range"
              min="8"
              max="28"
              value={penSettings.baseWidth}
              onChange={(e) =>
                setPenSettings((prev) => ({ ...prev, baseWidth: Number(e.target.value) }))
              }
              className="w-24 accent-slate-900"
            />
          </div>
        </div>
      </main>

      {/* Right Column: Live Typographic Flow & GSUB Substitution Tester */}
      <aside className="w-full lg:w-84 bg-white border-t lg:border-t-0 lg:border-l border-slate-200 flex flex-col shrink-0 p-5 overflow-y-auto space-y-6">
        <div>
          <h3 className="text-xs font-semibold text-slate-900 tracking-wider uppercase font-mono mb-2">
            Ligature Vector Preview
          </h3>
          <div className="aspect-square bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center p-4 relative overflow-hidden">
            {currentStrokes.length > 0 ? (
              <svg viewBox="0 0 800 800" className="w-full h-full">
                <path
                  d={strokesToSvgPath(currentStrokes)}
                  fill="none"
                  stroke="#0f172a"
                  strokeWidth={penSettings.baseWidth}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              <div className="text-center text-slate-400 text-xs">
                <p>No ligature ink drawn yet</p>
                <p className="text-[11px] mt-1 text-slate-400">
                  Draw above to join "{activeLigature.sequence}" seamlessly
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Live Typographic Substitution Tester */}
        <div className="space-y-3 border-t border-slate-200 pt-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-800">Typographic Flow Test</span>
            <button
              onClick={() => setEnableGsubPreview(!enableGsubPreview)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-colors ${
                enableGsubPreview
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : 'bg-slate-100 border-slate-200 text-slate-600'
              }`}
            >
              {enableGsubPreview ? 'GSUB Ligatures: ON' : 'GSUB Ligatures: OFF'}
            </button>
          </div>

          <textarea
            value={testSentence}
            onChange={(e) => setTestSentence(e.target.value)}
            rows={3}
            className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 resize-none focus:outline-none focus:ring-1 focus:ring-slate-900"
          />

          {/* Render with compiled font face */}
          <div
            style={{
              fontFamily: `"${liveFontFamily}", "Caveat", cursive, sans-serif`,
              fontVariantLigatures: enableGsubPreview ? 'common-ligatures' : 'none',
            }}
            className="p-4 bg-amber-50/60 border border-amber-200/80 rounded-xl text-2xl text-slate-900 leading-relaxed min-h-[100px] break-words"
          >
            {testSentence}
          </div>

          <p className="text-[11px] text-slate-500 leading-normal">
            When GSUB is enabled, character pairs like <strong className="text-slate-700">"{activeLigature.sequence}"</strong> in the sentence automatically fuse into your unique ligature glyph!
          </p>
        </div>

        {/* Information box */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-600 space-y-1">
          <span className="font-semibold text-slate-800 font-mono">OpenType Standard:</span>
          <p>
            Compiled into the OpenType <code>GSUB</code> table under the <code>'liga'</code> feature.
            Compatible with Adobe InDesign, Figma, Canva, Apple Pages, and Microsoft Word.
          </p>
        </div>
      </aside>
    </div>
  );
};
