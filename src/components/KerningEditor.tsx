import React, { useState, useMemo } from 'react';
import {
  Sliders,
  RotateCcw,
  Plus,
  Trash2,
  Sparkles,
  Search,
  Eye,
  Check,
  ArrowRight,
  MoveHorizontal,
  ChevronRight,
} from 'lucide-react';
import { GlyphData, KerningMap, PenSettings } from '../types/font';
import {
  CANVAS_ASCENDER,
  CANVAS_BASELINE,
  CANVAS_CAP_HEIGHT,
  CANVAS_DESCENDER,
  CANVAS_ORIGIN_X,
  CANVAS_SIZE,
  CANVAS_X_HEIGHT,
  strokesToSvgPath,
} from '../utils/fontEngine';
import {
  DEFAULT_INITIAL_KERNING,
  STANDARD_KERNING_CATEGORIES,
} from '../utils/kerningDefaults';

interface KerningEditorProps {
  glyphs: Record<string, GlyphData>;
  kerningMap: KerningMap;
  onUpdateKerning: (pair: string, value: number) => void;
  onBatchUpdateKerning: (pairs: KerningMap) => void;
  penSettings: PenSettings;
  liveFontFamily: string;
}

export const KerningEditor: React.FC<KerningEditorProps> = ({
  glyphs,
  kerningMap,
  onUpdateKerning,
  onBatchUpdateKerning,
  penSettings,
  liveFontFamily,
}) => {
  const [activePair, setActivePair] = useState<string>('AV');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showRawComparison, setShowRawComparison] = useState<boolean>(false);
  const [customLeft, setCustomLeft] = useState<string>('A');
  const [customRight, setCustomRight] = useState<string>('V');
  const [testSampleText, setTestSampleText] = useState<string>(
    'AVATAR Wave Teapot Total P.S. Yellow'
  );

  const leftChar = activePair[0] || 'A';
  const rightChar = activePair[1] || 'V';

  const leftGlyph = glyphs[leftChar];
  const rightGlyph = glyphs[rightChar];

  const currentKernValue = kerningMap[activePair] ?? 0;

  // Flatten all pairs from standard categories
  const allCategoryPairs = useMemo(() => {
    const list: { pair: string; suggested: number; explanation: string; category: string }[] = [];
    for (const cat of STANDARD_KERNING_CATEGORIES) {
      for (const p of cat.pairs) {
        list.push({ ...p, category: cat.category });
      }
    }
    // Also include any user-created pairs that aren't in standard list
    for (const pair of Object.keys(kerningMap)) {
      if (!list.some((item) => item.pair === pair)) {
        list.push({
          pair,
          suggested: kerningMap[pair],
          explanation: 'Custom defined character pair',
          category: 'Custom Pairs',
        });
      }
    }
    return list;
  }, [kerningMap]);

  // Filtered list
  const filteredPairs = useMemo(() => {
    return allCategoryPairs.filter((item) => {
      const matchesCategory =
        selectedCategory === 'All' ||
        (selectedCategory === 'Modified' && (kerningMap[item.pair] ?? 0) !== 0) ||
        item.category === selectedCategory;

      const matchesSearch =
        searchQuery === '' || item.pair.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesCategory && matchesSearch;
    });
  }, [allCategoryPairs, selectedCategory, searchQuery, kerningMap]);

  const handleSliderChange = (newVal: number) => {
    onUpdateKerning(activePair, newVal);
  };

  const handleStep = (delta: number) => {
    const newVal = Math.min(150, Math.max(-250, currentKernValue + delta));
    onUpdateKerning(activePair, newVal);
  };

  const handleResetPair = (pairToReset: string) => {
    onUpdateKerning(pairToReset, 0);
  };

  const handleApplyAllStandard = () => {
    onBatchUpdateKerning(DEFAULT_INITIAL_KERNING);
  };

  const handleCreateCustomPair = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customLeft || !customRight) return;
    const newPair = customLeft[0] + customRight[0];
    setActivePair(newPair);
    if (kerningMap[newPair] === undefined) {
      onUpdateKerning(newPair, 0);
    }
  };

  // Dimensions for visual preview stage
  const leftAdvance = leftGlyph?.advanceWidth || 600;
  // Scaled pixel representation: 1 font unit ≈ 0.4px on stage
  const scale = 0.55;
  const leftWidthPx = leftAdvance * scale;
  const kernOffsetPx = (showRawComparison ? 0 : currentKernValue) * scale;
  const rightAdvance = rightGlyph?.advanceWidth || 600;
  const rightWidthPx = rightAdvance * scale;

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-61px)] bg-slate-50 overflow-hidden">
      {/* Left Column: Kerning Pairs Directory */}
      <aside className="w-full lg:w-80 bg-white border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-slate-900 tracking-wider uppercase font-mono">
              Kerning Pairs
            </h2>
            <span className="text-xs text-slate-500 font-mono tabular-nums">
              {Object.values(kerningMap).filter((v) => v !== 0).length} customized
            </span>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search pairs (e.g. AV, Te)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
            {['All', 'Modified', 'Diagonal Overhangs', 'Capital T Overhangs', 'P, F & V Pairs'].map(
              (cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2 py-1 rounded text-[11px] whitespace-nowrap transition-colors ${
                    selectedCategory === cat
                      ? 'bg-slate-900 text-white font-medium shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 bg-slate-100'
                  }`}
                >
                  {cat === 'Diagonal Overhangs'
                    ? 'Diagonals'
                    : cat === 'Capital T Overhangs'
                    ? 'T-Pairs'
                    : cat === 'P, F & V Pairs'
                    ? 'P/F/V'
                    : cat}
                </button>
              )
            )}
          </div>
        </div>

        {/* Pairs List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {filteredPairs.map((item) => {
            const isSelected = item.pair === activePair;
            const kernVal = kerningMap[item.pair] ?? 0;
            const hasCustomKern = kernVal !== 0;

            return (
              <button
                key={item.pair}
                onClick={() => setActivePair(item.pair)}
                className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${
                  isSelected
                    ? 'bg-slate-900 text-white'
                    : 'hover:bg-slate-50 text-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-base font-['Plus_Jakarta_Sans'] ${
                      isSelected
                        ? 'bg-slate-800 text-white'
                        : 'bg-slate-100 text-slate-900 border border-slate-200'
                    }`}
                  >
                    {item.pair}
                  </div>
                  <div>
                    <div className="text-xs font-semibold leading-tight">{item.pair}</div>
                    <div
                      className={`text-[10px] truncate max-w-[140px] ${
                        isSelected ? 'text-slate-300' : 'text-slate-400'
                      }`}
                    >
                      {item.explanation}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-mono tabular-nums font-semibold ${
                      isSelected
                        ? hasCustomKern
                          ? 'text-amber-400'
                          : 'text-slate-400'
                        : hasCustomKern
                        ? 'text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200'
                        : 'text-slate-400'
                    }`}
                  >
                    {kernVal > 0 ? `+${kernVal}` : kernVal}
                  </span>
                  <ChevronRight
                    className={`w-3.5 h-3.5 ${isSelected ? 'text-slate-400' : 'text-slate-300'}`}
                  />
                </div>
              </button>
            );
          })}
        </div>

        {/* Custom Pair Form & Batch Actions */}
        <div className="p-3.5 border-t border-slate-200 bg-slate-50/80 space-y-3">
          <form onSubmit={handleCreateCustomPair} className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-600 shrink-0">Custom Pair:</span>
            <input
              type="text"
              maxLength={1}
              value={customLeft}
              onChange={(e) => setCustomLeft(e.target.value)}
              className="w-8 h-8 text-center text-xs font-bold bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
            <input
              type="text"
              maxLength={1}
              value={customRight}
              onChange={(e) => setCustomRight(e.target.value)}
              className="w-8 h-8 text-center text-xs font-bold bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
            <button
              type="submit"
              className="flex-1 py-1.5 px-2 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-medium transition-colors"
            >
              Add Pair
            </button>
          </form>

          <button
            onClick={handleApplyAllStandard}
            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 rounded-lg text-xs font-medium transition-colors shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Apply Standard Foundry Kerning</span>
          </button>
        </div>
      </aside>

      {/* Main Column: Dual-Glyph Kerning Stage & Precision Controls */}
      <main className="flex-1 flex flex-col overflow-hidden bg-slate-100">
        {/* Workspace Toolbar */}
        <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-slate-200 gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xl shadow-inner font-['Plus_Jakarta_Sans']">
              {activePair}
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 leading-tight">
                Pair: {leftChar} + {rightChar}
              </h2>
              <p className="text-xs text-slate-500 font-mono">
                Font units offset: {currentKernValue > 0 ? `+${currentKernValue}` : currentKernValue}
              </p>
            </div>
          </div>

          {/* Quick Comparison Toggle: With Kerning vs Raw Spacing */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowRawComparison(!showRawComparison)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                showRawComparison
                  ? 'bg-amber-100 border-amber-300 text-amber-900'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{showRawComparison ? 'Viewing Raw (Unkerned)' : 'Compare with Raw'}</span>
            </button>

            <button
              onClick={() => handleResetPair(activePair)}
              disabled={currentKernValue === 0}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-40 transition-colors"
              title="Reset this pair to 0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset (0)</span>
            </button>
          </div>
        </div>

        {/* Dual-Glyph Visual Kerning Canvas */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-8 overflow-hidden relative">
          {/* Main Visual Stage Card */}
          <div className="relative shadow-xl rounded-2xl overflow-hidden border border-slate-200 bg-[#faf9f5] w-full max-w-4xl h-[380px] flex items-center justify-center p-8 select-none">
            {/* Typographic Guidelines */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Baseline */}
              <div
                style={{ top: '75%' }}
                className="absolute left-6 right-6 border-b-2 border-rose-400"
              />
              <span
                style={{ top: '75.5%' }}
                className="absolute left-8 text-[10px] font-mono font-semibold text-rose-500"
              >
                Baseline (0)
              </span>

              {/* Cap Height */}
              <div
                style={{ top: '30%' }}
                className="absolute left-6 right-6 border-b border-dashed border-blue-400"
              />
              <span
                style={{ top: '30.5%' }}
                className="absolute left-8 text-[10px] font-mono text-blue-500"
              >
                Cap Height (700)
              </span>

              {/* X-Height */}
              <div
                style={{ top: '50%' }}
                className="absolute left-6 right-6 border-b border-dashed border-amber-400"
              />
              <span
                style={{ top: '50.5%' }}
                className="absolute left-8 text-[10px] font-mono text-amber-500"
              >
                x-Height (500)
              </span>
            </div>

            {/* Interactive Vector Glyph Stage */}
            <div className="relative flex items-center justify-center h-full z-10">
              {/* Left Glyph Container */}
              <div
                style={{ width: `${leftWidthPx}px` }}
                className="relative h-full flex items-center justify-center border-r border-dashed border-slate-300"
              >
                {leftGlyph && leftGlyph.strokes.length > 0 ? (
                  <svg viewBox="0 0 800 800" className="w-full h-full max-h-[320px]">
                    <path
                      d={strokesToSvgPath(leftGlyph.strokes)}
                      fill="none"
                      stroke="#0f172a"
                      strokeWidth={penSettings.baseWidth}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <span className="text-8xl font-serif text-slate-800">{leftChar}</span>
                )}
                <span className="absolute bottom-2 left-2 text-[10px] font-mono text-slate-400">
                  {leftChar} advance ({leftAdvance})
                </span>
              </div>

              {/* Dynamic Kerning Delta Zone */}
              <div
                style={{
                  width: `${Math.abs(kernOffsetPx)}px`,
                  marginLeft: kernOffsetPx < 0 ? `${kernOffsetPx}px` : '0px',
                }}
                className={`relative h-full flex flex-col items-center justify-center transition-all ${
                  kernOffsetPx < 0
                    ? 'bg-amber-400/20 border-x border-amber-400/60'
                    : kernOffsetPx > 0
                    ? 'bg-sky-400/20 border-x border-sky-400/60'
                    : 'w-0'
                }`}
              >
                {currentKernValue !== 0 && !showRawComparison && (
                  <div className="absolute top-8 px-2 py-0.5 rounded bg-slate-900 text-white text-[10px] font-mono whitespace-nowrap shadow-md z-20">
                    {currentKernValue > 0 ? `+${currentKernValue}` : currentKernValue}
                  </div>
                )}
              </div>

              {/* Right Glyph Container */}
              <div
                style={{ width: `${rightWidthPx}px` }}
                className="relative h-full flex items-center justify-center border-l border-dashed border-slate-300"
              >
                {rightGlyph && rightGlyph.strokes.length > 0 ? (
                  <svg viewBox="0 0 800 800" className="w-full h-full max-h-[320px]">
                    <path
                      d={strokesToSvgPath(rightGlyph.strokes)}
                      fill="none"
                      stroke="#0f172a"
                      strokeWidth={penSettings.baseWidth}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <span className="text-8xl font-serif text-slate-800">{rightChar}</span>
                )}
                <span className="absolute bottom-2 right-2 text-[10px] font-mono text-slate-400">
                  {rightChar} advance ({rightAdvance})
                </span>
              </div>
            </div>

            {/* Notification tag when raw comparison is active */}
            {showRawComparison && (
              <div className="absolute top-4 right-4 px-3 py-1 bg-amber-500 text-white rounded-full text-xs font-semibold shadow-md animate-pulse">
                Showing Raw Spacing (0 units)
              </div>
            )}
          </div>
        </div>

        {/* Bottom Precision Adjustment Bar */}
        <div className="bg-white border-t border-slate-200 px-6 py-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Step buttons */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-slate-600 mr-2">Nudge:</span>
              {[-50, -10, -1, 1, 10, 50].map((step) => (
                <button
                  key={step}
                  onClick={() => handleStep(step)}
                  className="px-2.5 py-1 text-xs font-mono font-medium bg-slate-100 hover:bg-slate-200 text-slate-800 rounded transition-colors"
                >
                  {step > 0 ? `+${step}` : step}
                </button>
              ))}
            </div>

            {/* Precision Slider */}
            <div className="flex items-center gap-3 flex-1 max-w-md">
              <span className="text-xs text-slate-500 font-mono shrink-0">Tight (-250)</span>
              <input
                type="range"
                min="-250"
                max="150"
                step="1"
                value={currentKernValue}
                onChange={(e) => handleSliderChange(Number(e.target.value))}
                className="w-full accent-slate-900 cursor-pointer"
              />
              <span className="text-xs text-slate-500 font-mono shrink-0">Loose (+150)</span>
            </div>

            {/* Numeric Display */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-600">Kerning:</span>
              <span className="text-sm font-bold font-mono tabular-nums px-2.5 py-1 bg-slate-100 rounded text-slate-900 border border-slate-200">
                {currentKernValue > 0 ? `+${currentKernValue}` : currentKernValue}
              </span>
            </div>
          </div>

          {/* In-Context Pangram Sentence Tester */}
          <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-3">
            <span className="text-xs font-medium text-slate-600 shrink-0">Context Preview:</span>
            <input
              type="text"
              value={testSampleText}
              onChange={(e) => setTestSampleText(e.target.value)}
              className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
            />
            <div
              style={{
                fontFamily: `"${liveFontFamily}", "Caveat", cursive, sans-serif`,
              }}
              className="text-2xl text-slate-900 px-4 py-1.5 bg-amber-50/60 rounded-lg border border-amber-200/80 tracking-normal min-w-[240px] truncate text-center"
            >
              {testSampleText}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
