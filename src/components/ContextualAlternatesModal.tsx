import React, { useState, useMemo } from 'react';
import {
  X,
  Sparkles,
  Shuffle,
  Layers,
  Check,
  Sliders,
  RefreshCw,
  Eye,
  Type,
  ArrowRight,
  Zap,
} from 'lucide-react';
import { GlyphData, GlyphVariant, PenToolType } from '../types/font';
import {
  ContextualAlternateOptions,
  FREQUENT_CONTEXTUAL_LETTERS,
  HumanVariationLevel,
  batchGenerateContextualAlternates,
  generateContextualVariants,
  substituteContextualAlternates,
} from '../utils/contextualAlternates';
import { strokesToSvgPath } from '../utils/fontEngine';
import { strokesToContourSvgPath } from '../utils/strokeWidthDynamics';

interface ContextualAlternatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentChar: string;
  glyphs: Record<string, GlyphData>;
  onApplyVariants: (updates: Record<string, GlyphVariant[]>) => void;
  baseWidth: number;
  tool: PenToolType;
  pressureSensitivity: boolean;
  fontFamilyName: string;
}

export const ContextualAlternatesModal: React.FC<ContextualAlternatesModalProps> = ({
  isOpen,
  onClose,
  currentChar,
  glyphs,
  onApplyVariants,
  baseWidth,
  tool,
  pressureSensitivity,
  fontFamilyName,
}) => {
  if (!isOpen) return null;

  // Configuration state
  const [scope, setScope] = useState<'current' | 'frequent' | 'all'>('current');
  const [level, setLevel] = useState<HumanVariationLevel>('balanced');
  const [variantCount, setVariantCount] = useState<number>(2);
  const [enableTiltDrift, setEnableTiltDrift] = useState<boolean>(true);
  const [enableBaselineDrift, setEnableBaselineDrift] = useState<boolean>(true);
  const [enableSmoothMorphing, setEnableSmoothMorphing] = useState<boolean>(true);
  const [enableLoopBreathing, setEnableLoopBreathing] = useState<boolean>(true);
  const [enableTerminalFlourish, setEnableTerminalFlourish] = useState<boolean>(true);
  const [enablePressureDynamics, setEnablePressureDynamics] = useState<boolean>(true);
  const [randomSeed, setRandomSeed] = useState<number>(() => Math.floor(Math.random() * 10000));
  const [sampleSentence, setSampleSentence] = useState<string>('coffee seeds & sweet letter');

  const currentGlyph = glyphs[currentChar];
  const hasCurrentStrokes = !!(currentGlyph?.strokes && currentGlyph.strokes.length > 0);

  const completedChars = useMemo(() => {
    return Object.keys(glyphs).filter((c) => glyphs[c]?.strokes && glyphs[c].strokes.length > 0);
  }, [glyphs]);

  const frequentCompletedChars = useMemo(() => {
    return FREQUENT_CONTEXTUAL_LETTERS.filter(
      (c) => glyphs[c]?.strokes && glyphs[c].strokes.length > 0
    );
  }, [glyphs]);

  // Target characters based on selected scope
  const targetChars = useMemo(() => {
    if (scope === 'current') {
      return hasCurrentStrokes ? [currentChar] : [];
    }
    if (scope === 'frequent') {
      return frequentCompletedChars;
    }
    return completedChars;
  }, [scope, currentChar, hasCurrentStrokes, frequentCompletedChars, completedChars]);

  const options: ContextualAlternateOptions = useMemo(
    () => ({
      level,
      count: variantCount,
      enableTiltDrift,
      enableBaselineDrift,
      enableSmoothMorphing,
      enableLoopBreathing,
      enableTerminalFlourish,
      enablePressureDynamics,
      seed: randomSeed,
    }),
    [
      level,
      variantCount,
      enableTiltDrift,
      enableBaselineDrift,
      enableSmoothMorphing,
      enableLoopBreathing,
      enableTerminalFlourish,
      enablePressureDynamics,
      randomSeed,
    ]
  );

  // Generate preview variants for the active character
  const previewVariants = useMemo(() => {
    if (!currentGlyph || !currentGlyph.strokes || currentGlyph.strokes.length === 0) return [];
    return generateContextualVariants(currentGlyph, options);
  }, [currentGlyph, options]);

  // Construct virtual glyphs with generated variants for live sentence preview
  const virtualGlyphsForPreview = useMemo(() => {
    const virtual = { ...glyphs };
    if (previewVariants.length > 0 && currentGlyph) {
      virtual[currentChar] = {
        ...currentGlyph,
        variants: previewVariants,
      };
    }
    return virtual;
  }, [glyphs, currentChar, currentGlyph, previewVariants]);

  // Simulated contextual cycling in sample text
  const cycledPreviewUnits = useMemo(() => {
    return substituteContextualAlternates(sampleSentence, virtualGlyphsForPreview);
  }, [sampleSentence, virtualGlyphsForPreview]);

  const handleApply = () => {
    const updates = batchGenerateContextualAlternates(glyphs, targetChars, options);
    onApplyVariants(updates);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-indigo-50/70 via-white to-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 font-['Plus_Jakarta_Sans'] flex items-center gap-2">
                <span>Automated Contextual Alternate Generator</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-semibold">
                  Anti-Repetition Engine
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Generate subtly randomized variations of your glyphs to eliminate robotic repeating letters in long text.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Scope Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-800 uppercase tracking-wider font-mono">
              1. Target Characters to Humanize
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setScope('current')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  scope === 'current'
                    ? 'border-indigo-600 bg-indigo-50/80 ring-2 ring-indigo-600/20 shadow-xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
                    Current Glyph ('{currentChar}')
                  </span>
                  <span className="text-sm font-bold font-mono px-1.5 py-0.5 rounded bg-slate-900 text-white">
                    {currentChar}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  {hasCurrentStrokes ? 'Has drawn ink · ready' : 'No ink drawn yet'}
                </p>
              </button>

              <button
                type="button"
                onClick={() => setScope('frequent')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  scope === 'frequent'
                    ? 'border-indigo-600 bg-indigo-50/80 ring-2 ring-indigo-600/20 shadow-xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
                    Frequent Letters
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 font-bold">
                    {frequentCompletedChars.length} ready
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  e, t, a, o, i, n, s, r, l, d, c, u, m, p
                </p>
              </button>

              <button
                type="button"
                onClick={() => setScope('all')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  scope === 'all'
                    ? 'border-indigo-600 bg-indigo-50/80 ring-2 ring-indigo-600/20 shadow-xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
                    All Completed Glyphs
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                    {completedChars.length} total
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Generate alternates across entire typeface
                </p>
              </button>
            </div>
          </div>

          {/* Humanization Style & Variant Count */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Level */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 font-mono uppercase tracking-wider">
                  2. Humanization Intensity
                </span>
                <span className="text-[10px] font-mono font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">
                  {level.toUpperCase()}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {(['subtle', 'balanced', 'expressive'] as HumanVariationLevel[]).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setLevel(lvl)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold capitalize transition-all ${
                      level === lvl
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 leading-tight">
                {level === 'subtle' && 'Minimal micro-variation (~4%). Retains 96% original geometry with delicate organic muscle tremor.'}
                {level === 'balanced' && 'Natural handwriting feel (~8%). Subtle slant drift, breathing loops, and organic baseline rhythm.'}
                {level === 'expressive' && 'Lively cursive & casual (~15%). Noticeable tilt personality, varied flourishes, and dynamic pressure.'}
              </p>
            </div>

            {/* Quantity */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 font-mono uppercase tracking-wider">
                  3. Variants per Character
                </span>
                <span className="text-[10px] font-mono font-semibold text-slate-600 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                  {variantCount} alternates + standard
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {[1, 2, 3].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setVariantCount(count)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                      variantCount === count
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {count} {count === 1 ? 'Variant' : 'Variants'}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 leading-tight">
                Creates {variantCount + 1} total variations per letter for smooth 1-2-3 cycling in sentences.
              </p>
            </div>
          </div>

          {/* Micro-Fluctuation Controls */}
          <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200 space-y-3">
            <span className="text-xs font-bold text-slate-800 font-mono uppercase tracking-wider block">
              4. Organic Variation Traits
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
              <label className="flex items-center gap-2 cursor-pointer select-none bg-white p-2 rounded-lg border border-slate-200">
                <input
                  type="checkbox"
                  checked={enableTiltDrift}
                  onChange={(e) => setEnableTiltDrift(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-0"
                />
                <span className="font-medium text-slate-800">Tilt Fluctuation (±2.5°)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none bg-white p-2 rounded-lg border border-slate-200">
                <input
                  type="checkbox"
                  checked={enableBaselineDrift}
                  onChange={(e) => setEnableBaselineDrift(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-0"
                />
                <span className="font-medium text-slate-800">Baseline Float (±3px)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none bg-white p-2 rounded-lg border border-slate-200">
                <input
                  type="checkbox"
                  checked={enableSmoothMorphing}
                  onChange={(e) => setEnableSmoothMorphing(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-0"
                />
                <span className="font-medium text-slate-800">Curvature Harmonic Wave</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none bg-white p-2 rounded-lg border border-slate-200">
                <input
                  type="checkbox"
                  checked={enableLoopBreathing}
                  onChange={(e) => setEnableLoopBreathing(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-0"
                />
                <span className="font-medium text-slate-800">Loop & Width Breath (±4%)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none bg-white p-2 rounded-lg border border-slate-200">
                <input
                  type="checkbox"
                  checked={enableTerminalFlourish}
                  onChange={(e) => setEnableTerminalFlourish(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-0"
                />
                <span className="font-medium text-slate-800">Terminal Exit Flourish</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none bg-white p-2 rounded-lg border border-slate-200">
                <input
                  type="checkbox"
                  checked={enablePressureDynamics}
                  onChange={(e) => setEnablePressureDynamics(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-0"
                />
                <span className="font-medium text-slate-800">Pen Pressure Variance</span>
              </label>
            </div>
          </div>

          {/* Live Glyph Preview Side-by-Side */}
          {hasCurrentStrokes && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 font-mono uppercase tracking-wider flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Side-by-Side Variant Comparison for '{currentChar}'</span>
                </span>
                <button
                  type="button"
                  onClick={() => setRandomSeed((prev) => prev + 1)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-colors"
                  title="Generate a fresh organic variation seed"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Re-roll Variation Seed</span>
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Standard Base */}
                <div className="p-3 bg-white rounded-xl border-2 border-slate-300 text-center space-y-1.5 shadow-xs">
                  <div className="aspect-square bg-slate-50 rounded-lg p-2 flex items-center justify-center">
                    <svg viewBox="0 0 800 800" className="w-full h-full">
                      <path
                        d={strokesToContourSvgPath(
                          currentGlyph.strokes,
                          baseWidth,
                          tool,
                          pressureSensitivity
                        )}
                        fill="#0f172a"
                      />
                    </svg>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block truncate">
                      ★ Standard Base
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      Original Drawn
                    </span>
                  </div>
                </div>

                {/* Generated Alternates */}
                {previewVariants.map((v, idx) => (
                  <div
                    key={v.id}
                    className="p-3 bg-indigo-50/40 rounded-xl border border-indigo-200 text-center space-y-1.5 shadow-xs"
                  >
                    <div className="aspect-square bg-white rounded-lg p-2 flex items-center justify-center border border-indigo-100">
                      <svg viewBox="0 0 800 800" className="w-full h-full">
                        <path
                          d={strokesToContourSvgPath(
                            v.strokes,
                            baseWidth,
                            tool,
                            pressureSensitivity
                          )}
                          fill="#312e81"
                        />
                      </svg>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-indigo-950 block truncate">
                        {v.name}
                      </span>
                      <span className="text-[10px] font-mono text-indigo-600 font-medium">
                        Auto-Contextual
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Live Anti-Repetition Sentence Preview */}
          <div className="p-4 bg-slate-900 text-white rounded-xl space-y-3 shadow-inner">
            <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
              <span className="font-mono text-slate-300 font-semibold flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5 text-indigo-400" />
                <span>Simulated Sentence Cycling (Repeating Letters Never Identical)</span>
              </span>
              <span className="text-[10px] font-mono text-indigo-400 bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-800">
                Contextual Substitution Active
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 py-2 px-1 text-2xl font-normal overflow-x-auto">
              {cycledPreviewUnits.map((unit, uIdx) => (
                <div
                  key={uIdx}
                  className={`relative flex items-center justify-center min-w-[14px] h-[48px] ${
                    unit.isAlternate
                      ? 'text-indigo-300 border-b-2 border-indigo-400'
                      : 'text-slate-100'
                  }`}
                  title={
                    unit.isAlternate
                      ? `Letter '${unit.char}' dynamically cycled to ${unit.variantName} (no repetition)`
                      : `Standard '${unit.char}'`
                  }
                >
                  {unit.strokes.length > 0 ? (
                    <svg viewBox="0 0 800 800" className="w-9 h-9">
                      <path
                        d={strokesToContourSvgPath(
                          unit.strokes,
                          baseWidth,
                          tool,
                          pressureSensitivity
                        )}
                        fill="currentColor"
                      />
                    </svg>
                  ) : (
                    <span style={{ fontFamily: `"${fontFamilyName}", cursive, sans-serif` }}>
                      {unit.char === ' ' ? '\u00A0' : unit.char}
                    </span>
                  )}
                  {unit.isAlternate && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                  )}
                </div>
              ))}
            </div>

            <p className="text-[11px] text-slate-400 leading-tight">
              Notice how repeating letters like <strong>'e'</strong> in "coffee" and "sweet" or <strong>'t'</strong> in "letter" automatically cycle through natural micro-variations.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            Applying will add <strong>{variantCount} contextual alternates</strong> to{' '}
            <strong>
              {targetChars.length} character{targetChars.length === 1 ? '' : 's'}
            </strong>.
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={targetChars.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                Apply Alternates to {targetChars.length} {targetChars.length === 1 ? 'Glyph' : 'Glyphs'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
