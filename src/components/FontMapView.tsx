import React, { useState, useMemo } from 'react';
import {
  Grid,
  Sliders,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Search,
  Eye,
  Maximize2,
  BarChart2,
  Layers,
  Zap,
  Camera,
  Upload,
} from 'lucide-react';
import { GlyphData, LigatureData, PenSettings } from '../types/font';
import {
  CANVAS_ASCENDER,
  CANVAS_BASELINE,
  CANVAS_CAP_HEIGHT,
  CANVAS_DESCENDER,
  CANVAS_X_HEIGHT,
  strokesToSvgPath,
  rotateGlyphStrokes,
} from '../utils/fontEngine';
import { SpacingPreset } from '../utils/autoSpacing';

interface FontMapViewProps {
  glyphs: Record<string, GlyphData>;
  ligatures: Record<string, LigatureData>;
  onSelectChar: (char: string) => void;
  onAutoSpaceAll: (preset: SpacingPreset) => void;
  penSettings: PenSettings;
  liveFontFamily: string;
  onOpenScanTab?: () => void;
}

export const FontMapView: React.FC<FontMapViewProps> = ({
  glyphs,
  ligatures,
  onSelectChar,
  onAutoSpaceAll,
  penSettings,
  liveFontFamily,
  onOpenScanTab,
}) => {
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showGuides, setShowGuides] = useState<boolean>(true);
  const [gridSize, setGridSize] = useState<'compact' | 'comfortable' | 'detailed'>('comfortable');
  const [spacingPreset, setSpacingPreset] = useState<SpacingPreset>('balanced');
  const [selectedInspectChar, setSelectedInspectChar] = useState<string | null>(null);
  const [autoSpacedNotice, setAutoSpacedNotice] = useState<boolean>(false);

  const uppercaseList = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const lowercaseList = 'abcdefghijklmnopqrstuvwxyz'.split('');
  const numeralList = '0123456789'.split('');
  const punctuationList = ['.', ',', '!', '?', '-', '+', '=', '/', ':', ';', "'", '"', '(', ')', '&'];

  const allChars = useMemo(() => {
    return [...uppercaseList, ...lowercaseList, ...numeralList, ...punctuationList];
  }, []);

  // Filter items
  const displayItems = useMemo(() => {
    let list: { type: 'glyph' | 'ligature'; char: string; data: GlyphData | LigatureData }[] = [];

    if (filterCategory === 'All' || filterCategory === 'Uppercase') {
      uppercaseList.forEach((c) => {
        if (glyphs[c]) list.push({ type: 'glyph', char: c, data: glyphs[c] });
      });
    }

    if (filterCategory === 'All' || filterCategory === 'Lowercase') {
      lowercaseList.forEach((c) => {
        if (glyphs[c]) list.push({ type: 'glyph', char: c, data: glyphs[c] });
      });
    }

    if (filterCategory === 'All' || filterCategory === 'Numerals') {
      numeralList.forEach((c) => {
        if (glyphs[c]) list.push({ type: 'glyph', char: c, data: glyphs[c] });
      });
    }

    if (filterCategory === 'All' || filterCategory === 'Punctuation') {
      punctuationList.forEach((c) => {
        if (glyphs[c]) list.push({ type: 'glyph', char: c, data: glyphs[c] });
      });
    }

    if (filterCategory === 'All' || filterCategory === 'Ligatures') {
      Object.values(ligatures).forEach((lig) => {
        list.push({ type: 'ligature', char: lig.sequence, data: lig });
      });
    }

    if (filterCategory === 'Completed') {
      list = allChars
        .filter((c) => glyphs[c] && glyphs[c].strokes.length > 0)
        .map((c) => ({ type: 'glyph', char: c, data: glyphs[c] }));
    }

    if (searchQuery.trim()) {
      list = list.filter((item) =>
        item.char.toLowerCase().includes(searchQuery.toLowerCase().trim())
      );
    }

    return list;
  }, [filterCategory, searchQuery, glyphs, ligatures, allChars]);

  // Consistency metrics calculation
  const metrics = useMemo(() => {
    const populated = Object.values(glyphs).filter((g) => g.strokes.length > 0);
    const count = populated.length;
    if (count === 0) {
      return { count: 0, avgWidth: 600, minWidth: 600, maxWidth: 600, totalGlyphs: allChars.length };
    }
    const widths = populated.map((g) => g.advanceWidth || 600);
    const sum = widths.reduce((a, b) => a + b, 0);
    const avgWidth = Math.round(sum / count);
    const minWidth = Math.min(...widths);
    const maxWidth = Math.max(...widths);
    return { count, avgWidth, minWidth, maxWidth, totalGlyphs: allChars.length };
  }, [glyphs, allChars]);

  const handleApplyAutoSpace = () => {
    onAutoSpaceAll(spacingPreset);
    setAutoSpacedNotice(true);
    setTimeout(() => setAutoSpacedNotice(false), 3000);
  };

  const inspectedData = selectedInspectChar ? glyphs[selectedInspectChar] : null;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-slate-500">
            <span>Typographic Health</span>
            <span aria-hidden="true">·</span>
            <span>Consistency Map</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 font-['Plus_Jakarta_Sans']">
            Font Map & Spacing Overview
          </h1>
          <p className="text-slate-600 text-xs">
            Inspect all letterforms side-by-side with alignment guides to ensure uniform x-height, baseline discipline, and optical spacing.
          </p>
        </div>

        {/* Actions Strip */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {onOpenScanTab && (
            <button
              onClick={onOpenScanTab}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 active:scale-[0.98] text-emerald-800 border border-emerald-300 rounded-xl text-xs font-semibold transition-all shadow-2xs whitespace-nowrap"
              title="Upload photo of your handwriting to isolate and trace characters"
            >
              <Camera className="w-4 h-4 text-emerald-600" />
              <span>Upload Photo & Scan</span>
            </button>
          )}

          {/* Auto-Spacing Control Strip */}
          <div className="flex items-center gap-2 p-1.5 bg-white rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-1.5 px-2">
              <span className="text-xs font-medium text-slate-700">Profile:</span>
              <select
                value={spacingPreset}
                onChange={(e) => setSpacingPreset(e.target.value as SpacingPreset)}
                className="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
              >
                <option value="tight">Tight</option>
                <option value="balanced">Balanced (Standard)</option>
                <option value="airy">Airy (Expansive)</option>
              </select>
            </div>

            <button
              onClick={handleApplyAutoSpace}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-white rounded-lg text-xs font-medium transition-all shadow-sm whitespace-nowrap"
              title="Automatically calculate and apply left & right side bearings based on stroke bounding boxes"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Auto-Space All Glyphs</span>
            </button>
          </div>
        </div>
      </div>

      {/* Auto-Spaced Success Feedback Notice */}
      {autoSpacedNotice && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-medium animate-in fade-in slide-in-from-top-1">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            Optical side bearings calculated and applied successfully to all {metrics.count} glyphs using the {spacingPreset} profile!
          </span>
        </div>
      )}

      {/* Font Health & Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1">
          <span className="text-[11px] font-mono text-slate-400 uppercase">Coverage</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
              {metrics.count}
            </span>
            <span className="text-xs text-slate-500 font-mono">/ {metrics.totalGlyphs} chars</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1">
          <span className="text-[11px] font-mono text-slate-400 uppercase">Average Advance</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
              {metrics.avgWidth}
            </span>
            <span className="text-xs text-slate-500 font-mono">font units</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1">
          <span className="text-[11px] font-mono text-slate-400 uppercase">Width Spread</span>
          <div className="flex items-baseline gap-1 text-xs font-mono text-slate-700 font-semibold mt-1">
            <span>Min: {metrics.minWidth}</span>
            <span aria-hidden="true">·</span>
            <span>Max: {metrics.maxWidth}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1">
          <span className="text-[11px] font-mono text-slate-400 uppercase">Active Pen</span>
          <p className="text-sm font-semibold text-slate-900 capitalize mt-1">
            {penSettings.tool} ({penSettings.baseWidth}px)
          </p>
        </div>
      </div>

      {/* Toolbar & View Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs">
        {/* Category Filters */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {['All', 'Completed', 'Uppercase', 'Lowercase', 'Numerals', 'Punctuation', 'Ligatures'].map(
            (cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  filterCategory === cat
                    ? 'bg-slate-900 text-white font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100'
                }`}
              >
                {cat}
              </button>
            )
          )}
        </div>

        {/* Display Toggles */}
        <div className="flex items-center gap-4">
          {/* Consistency Guides Toggle */}
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showGuides}
              onChange={(e) => setShowGuides(e.target.checked)}
              className="rounded border-slate-300 text-slate-900 focus:ring-0"
            />
            <span className="font-medium text-slate-700">Consistency Guidelines</span>
          </label>

          {/* Grid Size Density */}
          <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg">
            {(
              [
                { id: 'compact', label: 'Compact' },
                { id: 'comfortable', label: 'Standard' },
                { id: 'detailed', label: 'Detailed' },
              ] as const
            ).map((mode) => (
              <button
                key={mode.id}
                onClick={() => setGridSize(mode.id)}
                className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                  gridSize === mode.id
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Grid Matrix */}
      <div
        className={`grid gap-4 ${
          gridSize === 'compact'
            ? 'grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10'
            : gridSize === 'detailed'
            ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4'
            : 'grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-6'
        }`}
      >
        {displayItems.map((item) => {
          const hasInk = item.data.strokes && item.data.strokes.length > 0;
          const advance = item.data.advanceWidth || 600;

          return (
            <div
              key={item.char}
              onClick={() => {
                if (item.type === 'glyph') {
                  setSelectedInspectChar(item.char);
                }
              }}
              className={`group relative bg-white border rounded-xl overflow-hidden cursor-pointer transition-all flex flex-col justify-between ${
                hasInk
                  ? 'border-slate-200 hover:border-slate-400 hover:shadow-md'
                  : 'border-dashed border-slate-200 bg-slate-50/50 opacity-50 hover:opacity-80'
              }`}
            >
              {/* Card Header */}
              <div className="flex items-center justify-between p-2.5 pb-1 border-b border-slate-100 bg-slate-50/40">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold font-mono text-slate-700">{item.char}</span>
                  {'variants' in item.data && item.data.variants && item.data.variants.length > 0 && (
                    <span className="px-1.5 py-0.2 text-[9px] font-semibold bg-indigo-100 text-indigo-700 rounded-full font-mono">
                      +{item.data.variants.length} var
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-mono text-slate-400 tabular-nums">
                  {advance}u
                </span>
              </div>

              {/* Vector Viewport */}
              <div className="relative aspect-square flex items-center justify-center p-3 overflow-hidden bg-[#faf9f5]">
                {/* Guidelines Overlay */}
                {showGuides && (
                  <div className="absolute inset-0 pointer-events-none select-none">
                    {/* Baseline */}
                    <div
                      style={{ top: '75%' }}
                      className="absolute left-1 right-1 border-b border-rose-400/80"
                    />
                    {/* x-Height */}
                    <div
                      style={{ top: '50%' }}
                      className="absolute left-1 right-1 border-b border-dashed border-amber-400/60"
                    />
                    {/* Cap-Height */}
                    <div
                      style={{ top: '30%' }}
                      className="absolute left-1 right-1 border-b border-dashed border-blue-400/60"
                    />
                  </div>
                )}

                {hasInk ? (
                  <svg viewBox="0 0 800 800" className="w-full h-full relative z-10">
                    <path
                      d={strokesToSvgPath(
                        'rotation' in item.data && item.data.rotation
                          ? rotateGlyphStrokes(item.data.strokes, item.data.rotation)
                          : item.data.strokes
                      )}
                      fill="none"
                      stroke="#0f172a"
                      strokeWidth={penSettings.baseWidth}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <span className="text-3xl text-slate-300 font-serif">{item.char}</span>
                )}
              </div>

              {/* Detailed View Info Footer */}
              {gridSize === 'detailed' && (
                <div className="p-2.5 pt-2 border-t border-slate-100 bg-slate-50/70 text-[10px] font-mono text-slate-500 flex items-center justify-between">
                  <span>
                    LSB: {'leftBearing' in item.data ? item.data.leftBearing : 80}
                  </span>
                  <span>
                    RSB: {'rightBearing' in item.data ? item.data.rightBearing : 80}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectChar(item.char);
                    }}
                    className="text-slate-900 font-semibold hover:underline flex items-center gap-0.5"
                  >
                    <span>Edit</span>
                    <ArrowRight className="w-2.5 h-2.5" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Quick Character Inspect & Jump Modal */}
      {selectedInspectChar && inspectedData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-2xl font-['Plus_Jakarta_Sans'] shadow-inner">
                  {selectedInspectChar}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Glyph: '{selectedInspectChar}'
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Unicode: U+{selectedInspectChar.charCodeAt(0).toString(16).toUpperCase()}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedInspectChar(null)}
                className="text-slate-400 hover:text-slate-700 text-sm font-semibold"
              >
                Close
              </button>
            </div>

            {/* Large Preview */}
            <div className="aspect-square bg-[#faf9f5] rounded-xl border border-slate-200 p-4 relative overflow-hidden flex items-center justify-center">
              {/* Guidelines */}
              <div className="absolute inset-0 pointer-events-none">
                <div style={{ top: '75%' }} className="absolute left-4 right-4 border-b-2 border-rose-400" />
                <div style={{ top: '50%' }} className="absolute left-4 right-4 border-b border-dashed border-amber-400" />
                <div style={{ top: '30%' }} className="absolute left-4 right-4 border-b border-dashed border-blue-400" />
              </div>

              {inspectedData.strokes.length > 0 ? (
                <svg viewBox="0 0 800 800" className="w-full h-full relative z-10">
                  <path
                    d={strokesToSvgPath(
                      inspectedData.rotation
                        ? rotateGlyphStrokes(inspectedData.strokes, inspectedData.rotation)
                        : inspectedData.strokes
                    )}
                    fill="none"
                    stroke="#0f172a"
                    strokeWidth={penSettings.baseWidth}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <span className="text-6xl text-slate-300">{selectedInspectChar}</span>
              )}
            </div>

            {/* Metrics Breakdown */}
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[10px] font-mono text-slate-400 uppercase">Advance</span>
                <p className="text-sm font-bold font-mono text-slate-900">
                  {inspectedData.advanceWidth || 600}
                </p>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[10px] font-mono text-slate-400 uppercase">Tilt</span>
                <p className="text-sm font-bold font-mono text-indigo-600">
                  {inspectedData.rotation ? `${inspectedData.rotation > 0 ? '+' : ''}${inspectedData.rotation}°` : '0°'}
                </p>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[10px] font-mono text-slate-400 uppercase">Left B</span>
                <p className="text-sm font-bold font-mono text-slate-900">
                  {inspectedData.leftBearing || 80}
                </p>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[10px] font-mono text-slate-400 uppercase">Right B</span>
                <p className="text-sm font-bold font-mono text-slate-900">
                  {inspectedData.rightBearing || 80}
                </p>
              </div>
            </div>

            {/* Alternate Variants Preview if present */}
            {'variants' in inspectedData && inspectedData.variants && inspectedData.variants.length > 0 && (
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <span>Alternate Variants ({inspectedData.variants.length})</span>
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {inspectedData.variants.map((v, idx) => (
                    <div key={v.id} className="p-2 bg-[#faf9f5] rounded-lg border border-slate-200 text-center">
                      <div className="aspect-square flex items-center justify-center">
                        {v.strokes && v.strokes.length > 0 ? (
                          <svg viewBox="0 0 800 800" className="w-full h-full">
                            <path
                              d={strokesToSvgPath(
                                v.rotation ? rotateGlyphStrokes(v.strokes, v.rotation) : v.strokes
                              )}
                              fill="none"
                              stroke="#0f172a"
                              strokeWidth={penSettings.baseWidth}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Empty</span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-600 font-medium block truncate mt-1">
                        {v.name || `Var ${idx + 2}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Jump to Studio Action */}
            <button
              onClick={() => {
                onSelectChar(selectedInspectChar);
                setSelectedInspectChar(null);
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
            >
              <span>Edit '{selectedInspectChar}' in Studio</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
