import React, { useState, useRef, useEffect } from 'react';
import {
  Activity,
  Sliders,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Eye,
  EyeOff,
  Gauge,
  PenTool,
  RotateCcw,
  Check,
  ChevronDown,
  ChevronUp,
  Info,
  Maximize2,
} from 'lucide-react';
import { GlyphData, GlyphStroke, PenSettings } from '../types/font';
import {
  computeStrokePointWidth,
  getGlyphStrokeMetrics,
  enhanceStrokesWithDynamicPressure,
  GlyphStrokeMetrics,
} from '../utils/strokeWidthDynamics';

interface StrokeWidthInspectorProps {
  currentChar: string;
  glyph: GlyphData;
  penSettings: PenSettings;
  setPenSettings: React.Dispatch<React.SetStateAction<PenSettings>>;
  onUpdateStrokes: (strokes: GlyphStroke[]) => void;
  showOverlay: boolean;
  setShowOverlay: (show: boolean) => void;
  showCalipers: boolean;
  setShowCalipers: (show: boolean) => void;
  showMinMaxBadges: boolean;
  setShowMinMaxBadges: (show: boolean) => void;
  hoveredT: number | null;
  setHoveredT: (t: number | null) => void;
}

export const StrokeWidthInspector: React.FC<StrokeWidthInspectorProps> = ({
  currentChar,
  glyph,
  penSettings,
  setPenSettings,
  onUpdateStrokes,
  showOverlay,
  setShowOverlay,
  showCalipers,
  setShowCalipers,
  showMinMaxBadges,
  setShowMinMaxBadges,
  hoveredT,
  setHoveredT,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showScratchpad, setShowScratchpad] = useState(false);
  const [testPressure, setTestPressure] = useState<number | null>(null);
  const [testWidth, setTestWidth] = useState<number | null>(null);
  const [isTestDrawing, setIsTestDrawing] = useState(false);
  const [appliedEnhanceToast, setAppliedEnhanceToast] = useState(false);

  const scratchCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const scratchStrokesRef = useRef<Array<Array<{ x: number; y: number; pressure: number }>>>([]);

  const metrics: GlyphStrokeMetrics = getGlyphStrokeMetrics(
    glyph.strokes || [],
    penSettings.baseWidth,
    penSettings.tool,
    penSettings.pressureSensitivity
  );

  const togglePressure = () => {
    setPenSettings((prev) => ({
      ...prev,
      pressureSensitivity: !prev.pressureSensitivity,
    }));
  };

  const handleApplyCalligraphicPressure = () => {
    if (!glyph.strokes || glyph.strokes.length === 0) return;
    const enhanced = enhanceStrokesWithDynamicPressure(glyph.strokes);
    onUpdateStrokes(enhanced);
    setAppliedEnhanceToast(true);
    setTimeout(() => setAppliedEnhanceToast(false), 2400);
  };

  // Scratchpad drawing handlers
  const handleScratchPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = scratchCanvasRef.current;
    if (!canvas) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsTestDrawing(true);

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const pressure = e.pressure && e.pressure > 0 ? e.pressure : 0.65;

    const w = computeStrokePointWidth(
      penSettings.baseWidth,
      pressure,
      penSettings.tool,
      penSettings.pressureSensitivity
    );
    setTestPressure(pressure);
    setTestWidth(w);

    scratchStrokesRef.current.push([{ x, y, pressure }]);
    drawScratchpad();
  };

  const handleScratchPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isTestDrawing) return;
    const canvas = scratchCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const pressure = e.pressure && e.pressure > 0 ? e.pressure : 0.75;

    const w = computeStrokePointWidth(
      penSettings.baseWidth,
      pressure,
      penSettings.tool,
      penSettings.pressureSensitivity
    );
    setTestPressure(pressure);
    setTestWidth(w);

    const strokes = scratchStrokesRef.current;
    if (strokes.length > 0) {
      strokes[strokes.length - 1].push({ x, y, pressure });
    }
    drawScratchpad();
  };

  const handleScratchPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setIsTestDrawing(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
  };

  const clearScratchpad = () => {
    scratchStrokesRef.current = [];
    setTestPressure(null);
    setTestWidth(null);
    drawScratchpad();
  };

  const drawScratchpad = () => {
    const canvas = scratchCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Warm paper background
    ctx.fillStyle = '#fafaf9';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle guideline
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(10, canvas.height / 2);
    ctx.lineTo(canvas.width - 10, canvas.height / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw scratch strokes
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1e293b';

    for (const stroke of scratchStrokesRef.current) {
      if (stroke.length < 2) continue;
      for (let i = 1; i < stroke.length; i++) {
        const p0 = stroke[i - 1];
        const p1 = stroke[i];
        const w0 = computeStrokePointWidth(
          penSettings.baseWidth,
          p0.pressure,
          penSettings.tool,
          penSettings.pressureSensitivity
        );
        const w1 = computeStrokePointWidth(
          penSettings.baseWidth,
          p1.pressure,
          penSettings.tool,
          penSettings.pressureSensitivity
        );
        ctx.beginPath();
        ctx.lineWidth = (w0 + w1) / 2;
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
      }
    }
  };

  useEffect(() => {
    if (showScratchpad) {
      drawScratchpad();
    }
  }, [showScratchpad, penSettings.baseWidth, penSettings.tool, penSettings.pressureSensitivity]);

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
      {/* Header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-4 py-3 bg-white border-b border-slate-200 flex items-center justify-between cursor-pointer select-none hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div
            className={`w-6 h-6 rounded-md flex items-center justify-center ${
              penSettings.pressureSensitivity && penSettings.tool !== 'drafting'
                ? 'bg-indigo-50 text-indigo-600'
                : 'bg-slate-100 text-slate-500'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-slate-900 tracking-wide">
              Stroke Width & Pressure Variation
            </h4>
            <p className="text-[10px] text-slate-500">
              {penSettings.pressureSensitivity && penSettings.tool !== 'drafting'
                ? `Dynamic: ${metrics.minWidth}px – ${metrics.maxWidth}px (${metrics.dynamicRange}×)`
                : `Uniform: ${penSettings.baseWidth}px (Monoline)`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              togglePressure();
            }}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              penSettings.pressureSensitivity
                ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
            }`}
            title="Toggle pressure sensitivity on or off"
          >
            {penSettings.pressureSensitivity ? (
              <>
                <ToggleRight className="w-3.5 h-3.5 text-indigo-600" />
                <span>ON</span>
              </>
            ) : (
              <>
                <ToggleLeft className="w-3.5 h-3.5 text-slate-500" />
                <span>OFF</span>
              </>
            )}
          </button>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 space-y-4 text-xs">
          {/* Status Explanation Banner */}
          <div
            className={`p-2.5 rounded-lg border text-[11px] leading-relaxed ${
              penSettings.pressureSensitivity && penSettings.tool !== 'drafting'
                ? 'bg-indigo-50/70 border-indigo-200/80 text-indigo-950'
                : 'bg-slate-100 border-slate-200 text-slate-700'
            }`}
          >
            {penSettings.pressureSensitivity && penSettings.tool !== 'drafting' ? (
              <div className="flex items-start gap-2">
                <Gauge className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-indigo-900">Pressure Sensitivity Active: </span>
                  Stroke width varies along the path from delicate hairlines to rich downstroke swells based
                  on pen pressure and {penSettings.tool} nib physics.
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-800">
                    {penSettings.tool === 'drafting' ? 'Drafting Pen (Fixed): ' : 'Pressure Sensitivity Disabled: '}
                  </span>
                  Stroke width is rendered with uniform monoline thickness of {penSettings.baseWidth}px along
                  all paths.
                </div>
              </div>
            )}
          </div>

          {/* Width Metrics Cards: Min / Median / Max */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white border border-slate-200 rounded-lg p-2.5 text-center">
              <span className="text-[10px] uppercase font-mono text-emerald-600 font-semibold block">
                Min (Hairline)
              </span>
              <span className="text-base font-bold font-mono text-slate-900 block mt-0.5">
                {metrics.minWidth}
                <span className="text-[10px] text-slate-400 font-normal">px</span>
              </span>
              <span className="text-[9px] text-slate-400">Light touch</span>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-2.5 text-center">
              <span className="text-[10px] uppercase font-mono text-slate-500 font-semibold block">
                Base / Median
              </span>
              <span className="text-base font-bold font-mono text-slate-900 block mt-0.5">
                {penSettings.baseWidth}
                <span className="text-[10px] text-slate-400 font-normal">px</span>
              </span>
              <span className="text-[9px] text-slate-400">Nominal setting</span>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-2.5 text-center">
              <span className="text-[10px] uppercase font-mono text-violet-600 font-semibold block">
                Max (Swell)
              </span>
              <span className="text-base font-bold font-mono text-slate-900 block mt-0.5">
                {metrics.maxWidth}
                <span className="text-[10px] text-slate-400 font-normal">px</span>
              </span>
              <span className="text-[9px] text-slate-400">Heavy downstroke</span>
            </div>
          </div>

          {/* Stroke Width Profile Waveform Graph */}
          <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-medium text-slate-700 flex items-center gap-1.5">
                <span>Stroke Width Profile Along Path</span>
              </span>
              <span className="font-mono text-[10px] text-slate-500">
                Range: {metrics.dynamicRange}× ({metrics.variationDelta}px delta)
              </span>
            </div>

            {/* SVG Waveform Chart */}
            <div className="relative h-20 w-full bg-slate-50 border border-slate-100 rounded-md overflow-hidden flex items-end">
              {metrics.samples.length > 0 ? (
                <svg
                  viewBox="0 0 100 50"
                  preserveAspectRatio="none"
                  className="w-full h-full cursor-crosshair"
                  onMouseLeave={() => setHoveredT(null)}
                >
                  <defs>
                    <linearGradient id="widthGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.75" />
                      <stop offset="50%" stopColor="#6366f1" stopOpacity="0.85" />
                      <stop offset="100%" stopColor="#ec4899" stopOpacity="0.75" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Base Reference Line */}
                  {(() => {
                    const maxDisplayW = Math.max(30, metrics.maxWidth * 1.15);
                    const baseNormY = 50 - (penSettings.baseWidth / maxDisplayW) * 45;
                    return (
                      <line
                        x1="0"
                        y1={baseNormY}
                        x2="100"
                        y2={baseNormY}
                        stroke="#94a3b8"
                        strokeDasharray="2 2"
                        strokeWidth="0.8"
                      />
                    );
                  })()}

                  {/* Filled ribbon under curve */}
                  {(() => {
                    const maxDisplayW = Math.max(30, metrics.maxWidth * 1.15);
                    const pts = metrics.samples.map((s, idx) => {
                      const x = (idx / (metrics.samples.length - 1)) * 100;
                      const y = 50 - (s.width / maxDisplayW) * 45;
                      return { x, y, width: s.width };
                    });

                    let d = `M 0 50 L ${pts[0].x} ${pts[0].y} `;
                    for (let i = 1; i < pts.length; i++) {
                      d += `L ${pts[i].x} ${pts[i].y} `;
                    }
                    d += `L 100 50 Z`;

                    return <path d={d} fill="url(#widthGrad)" fillOpacity="0.35" />;
                  })()}

                  {/* Top contour line */}
                  {(() => {
                    const maxDisplayW = Math.max(30, metrics.maxWidth * 1.15);
                    const pts = metrics.samples.map((s, idx) => {
                      const x = (idx / (metrics.samples.length - 1)) * 100;
                      const y = 50 - (s.width / maxDisplayW) * 45;
                      return `${x},${y}`;
                    });

                    return (
                      <polyline
                        points={pts.join(' ')}
                        fill="none"
                        stroke="#4f46e5"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    );
                  })()}

                  {/* Hovered indicator line */}
                  {hoveredT !== null && (
                    <line
                      x1={hoveredT * 100}
                      y1="0"
                      x2={hoveredT * 100}
                      y2="50"
                      stroke="#f59e0b"
                      strokeWidth="1.2"
                    />
                  )}
                </svg>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400 text-[11px]">
                  No stroke paths drawn yet
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
              <span>Path Start (0%)</span>
              <span className="text-slate-500">Base: {penSettings.baseWidth}px (dashed)</span>
              <span>Path End (100%)</span>
            </div>
          </div>

          {/* Visual Indicator Overlay Toggles for the Canvas */}
          <div className="space-y-2 border-t border-slate-200 pt-3">
            <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider font-mono block">
              Canvas Overlay Controls
            </span>

            <div className="space-y-1.5">
              <label className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                <span className="flex items-center gap-2 text-slate-700">
                  <Activity className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Show Width Contours & Envelope</span>
                </span>
                <input
                  type="checkbox"
                  checked={showOverlay}
                  onChange={(e) => setShowOverlay(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-0"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                <span className="flex items-center gap-2 text-slate-700">
                  <Sliders className="w-3.5 h-3.5 text-cyan-500" />
                  <span>Show Caliper Ticks & Heatmap</span>
                </span>
                <input
                  type="checkbox"
                  checked={showCalipers}
                  onChange={(e) => setShowCalipers(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-0"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                <span className="flex items-center gap-2 text-slate-700">
                  <Gauge className="w-3.5 h-3.5 text-amber-500" />
                  <span>Show Min/Max Width Callouts</span>
                </span>
                <input
                  type="checkbox"
                  checked={showMinMaxBadges}
                  onChange={(e) => setShowMinMaxBadges(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-0"
                />
              </label>
            </div>
          </div>

          {/* Action: Calligraphic Pressure Enhancer (helps mouse users & flat presets) */}
          <div className="border-t border-slate-200 pt-3 space-y-2">
            <button
              onClick={handleApplyCalligraphicPressure}
              disabled={!glyph.strokes || glyph.strokes.length === 0}
              className="flex items-center justify-center gap-2 w-full py-2 px-3 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium transition-colors shadow-2xs disabled:opacity-40"
              title="Apply realistic calligraphy pressure dynamics (thin hairlines on upstrokes, heavy swells on downstrokes, entry/exit tapering)"
            >
              {appliedEnhanceToast ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-semibold">Pressure Dynamics Applied!</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Enrich '{currentChar}' with Natural Pressure</span>
                </>
              )}
            </button>

            <button
              onClick={() => setShowScratchpad(!showScratchpad)}
              className="flex items-center justify-center gap-1.5 w-full py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[11px] font-medium transition-colors"
            >
              <PenTool className="w-3 h-3 text-slate-500" />
              <span>{showScratchpad ? 'Hide Live Pressure Scratchpad' : 'Test Stylus Pressure Scratchpad'}</span>
            </button>
          </div>

          {/* Interactive Live Pressure Scratchpad */}
          {showScratchpad && (
            <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-slate-800">Live Stylus Pressure Pad</span>
                <div className="flex items-center gap-2">
                  {testPressure !== null && (
                    <span className="font-mono text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                      Press: {(testPressure * 100).toFixed(0)}% → {testWidth?.toFixed(1)}px
                    </span>
                  )}
                  <button
                    onClick={clearScratchpad}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded"
                    title="Clear test pad"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <div className="relative border border-slate-200 rounded-lg overflow-hidden touch-none h-24 bg-[#fafaf9]">
                <canvas
                  ref={scratchCanvasRef}
                  width={280}
                  height={96}
                  onPointerDown={handleScratchPointerDown}
                  onPointerMove={handleScratchPointerMove}
                  onPointerUp={handleScratchPointerUp}
                  className="w-full h-full cursor-crosshair block"
                  style={{ touchAction: 'none' }}
                />
                {scratchStrokesRef.current.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center text-[11px] text-slate-400 pointer-events-none select-none">
                    Draw here with pen / mouse to test sensitivity
                  </div>
                )}
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">
                Press lightly for thin hairlines; press firmly for broad swells.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
