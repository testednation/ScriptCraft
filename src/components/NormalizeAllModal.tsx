import React, { useState, useMemo } from 'react';
import {
  X,
  AlignCenter,
  Sparkles,
  Check,
  Sliders,
  Scale,
  Baseline,
  ArrowRight,
  Eye,
  Info,
} from 'lucide-react';
import { GlyphData } from '../types/font';
import {
  NormalizationOptions,
  batchNormalizeAllGlyphs,
  isRoundBaseChar,
  isFlatBaseChar,
  isDescenderChar,
} from '../utils/glyphNormalization';

interface NormalizeAllModalProps {
  isOpen: boolean;
  onClose: () => void;
  glyphs: Record<string, GlyphData>;
  onApplyNormalizedGlyphs: (updatedGlyphs: Record<string, GlyphData>, summary: string) => void;
}

export const NormalizeAllModal: React.FC<NormalizeAllModalProps> = ({
  isOpen,
  onClose,
  glyphs,
  onApplyNormalizedGlyphs,
}) => {
  if (!isOpen) return null;

  // Options
  const [centerHorizontally, setCenterHorizontally] = useState<boolean>(true);
  const [snapBaseline, setSnapBaseline] = useState<boolean>(true);
  const [opticalOvershoot, setOpticalOvershoot] = useState<boolean>(true);
  const [harmonizeHeight, setHarmonizeHeight] = useState<boolean>(false);
  const [harmonizeTolerance, setHarmonizeTolerance] = useState<number>(0.18);

  const completedChars = useMemo(() => {
    return Object.keys(glyphs).filter((c) => glyphs[c]?.strokes && glyphs[c].strokes.length > 0);
  }, [glyphs]);

  const options: NormalizationOptions = useMemo(
    () => ({
      centerHorizontally,
      snapBaseline,
      opticalOvershoot,
      harmonizeHeight,
      harmonizeTolerance,
    }),
    [centerHorizontally, snapBaseline, opticalOvershoot, harmonizeHeight, harmonizeTolerance]
  );

  // Dry run to preview stats
  const preview = useMemo(() => {
    return batchNormalizeAllGlyphs(glyphs, options);
  }, [glyphs, options]);

  const handleApply = () => {
    const { updatedGlyphs, report } = preview;
    const summary = `Normalized ${report.normalizedCount} glyph(s): centered, snapped baseline${
      opticalOvershoot ? ' with 2% optical overshoot' : ''
    }${harmonizeHeight ? `, and harmonized heights` : ''}.`;
    onApplyNormalizedGlyphs(updatedGlyphs, summary);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-indigo-50/80 via-white to-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 font-['Plus_Jakarta_Sans'] flex items-center gap-2">
                <span>Batch Typographic Normalizer</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-semibold">
                  1-Click Align
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Harmonize spacing, baseline grounding, and optical proportions across all completed glyphs.
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

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          {/* Options List */}
          <div className="space-y-3">
            <span className="font-bold text-slate-900 uppercase font-mono tracking-wider block text-[11px]">
              Typographic Rules to Apply
            </span>

            {/* 1. Horizontal Centering */}
            <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-slate-300 transition-all cursor-pointer">
              <input
                type="checkbox"
                checked={centerHorizontally}
                onChange={(e) => setCenterHorizontally(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
              />
              <div className="space-y-0.5">
                <span className="font-bold text-slate-900 block flex items-center gap-1.5">
                  <AlignCenter className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Center Horizontally in Advance Width Slot</span>
                </span>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Calculates each glyph’s horizontal bounding box and centers it precisely between its left side bearing (120px) and right advance boundary.
                </p>
              </div>
            </label>

            {/* 2. Baseline Snapping */}
            <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-slate-300 transition-all cursor-pointer">
              <input
                type="checkbox"
                checked={snapBaseline}
                onChange={(e) => setSnapBaseline(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
              />
              <div className="space-y-0.5">
                <span className="font-bold text-slate-900 block flex items-center gap-1.5">
                  <Baseline className="w-3.5 h-3.5 text-rose-600" />
                  <span>Snap Base to Typographic Baseline</span>
                </span>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Grommets flat-bottomed glyphs (<code className="font-mono text-slate-700 bg-slate-100 px-1 py-0.2 rounded">m, n, h, r, b, d, i, M, H...</code>) directly onto the grounded red baseline so characters don't float or sink.
                </p>
              </div>
            </label>

            {/* 3. Optical Overshoot (Feature 4) */}
            <label className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer ${
              opticalOvershoot
                ? 'border-indigo-200 bg-indigo-50/50'
                : 'border-slate-200 bg-slate-50/60 hover:bg-white'
            }`}>
              <input
                type="checkbox"
                checked={opticalOvershoot}
                disabled={!snapBaseline}
                onChange={(e) => setOpticalOvershoot(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 disabled:opacity-40"
              />
              <div className="space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 block flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Optical Baseline Overshoot for Curved Letters (2% / 8px)</span>
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">
                    Typographic Standard
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  In professional typography, curved characters (<code className="font-mono text-slate-700 bg-white px-1 py-0.2 rounded">o, c, e, s, a, g, C, O, S, U</code>) must extend slightly below the baseline (~8px), otherwise optical illusion makes them look too small and detached from the line.
                </p>
              </div>
            </label>

            {/* 4. Harmonize Heights */}
            <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-slate-300 transition-all cursor-pointer">
              <input
                type="checkbox"
                checked={harmonizeHeight}
                onChange={(e) => setHarmonizeHeight(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
              />
              <div className="space-y-1.5 flex-1">
                <span className="font-bold text-slate-900 block flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Harmonize Body Proportions (X-Height & Cap-Height)</span>
                </span>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Proportionally normalizes lowercase body letters toward the standard x-height line (400px) and capitals toward cap-height (240px).
                </p>
                {harmonizeHeight && (
                  <div className="pt-2 flex items-center gap-3">
                    <span className="text-[11px] text-slate-600 font-mono">Max Scaling: ±{Math.round(harmonizeTolerance * 100)}%</span>
                    <input
                      type="range"
                      min="0.05"
                      max="0.30"
                      step="0.02"
                      value={harmonizeTolerance}
                      onChange={(e) => setHarmonizeTolerance(Number(e.target.value))}
                      className="w-36 accent-indigo-600"
                    />
                  </div>
                )}
              </div>
            </label>
          </div>

          {/* Impact Summary Pill */}
          <div className="p-4 bg-slate-900 text-white rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono text-slate-300 font-semibold flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-indigo-400" />
                <span>Normalization Preview Summary</span>
              </span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                {preview.report.normalizedCount} of {completedChars.length} Glyphs will adjust
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1 max-h-24 overflow-y-auto">
              {completedChars.map((c) => {
                const isRound = isRoundBaseChar(c);
                const isDesc = isDescenderChar(c);
                return (
                  <span
                    key={c}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold border ${
                      isRound && opticalOvershoot
                        ? 'bg-amber-950/60 text-amber-300 border-amber-800'
                        : isDesc
                        ? 'bg-purple-950/60 text-purple-300 border-purple-800'
                        : 'bg-slate-800 text-slate-200 border-slate-700'
                    }`}
                    title={
                      isRound
                        ? `'${c}' is round-bottomed (receives 8px optical overshoot)`
                        : isDesc
                        ? `'${c}' has descender`
                        : `'${c}' flat base`
                    }
                  >
                    {c} {isRound && opticalOvershoot ? '↓8' : ''}
                  </span>
                );
              })}
            </div>

            <div className="flex items-center gap-4 text-[10px] text-slate-400 pt-1 border-t border-slate-800">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400" /> Curved overshoot ({preview.report.overshootCount})
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-slate-400" /> Flat baseline snap
              </span>
              {harmonizeHeight && (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" /> Proportion scaled ({preview.report.scaledCount})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
          <span className="text-xs text-slate-500">
            Affects <strong>{completedChars.length} completed glyphs</strong> & their variants.
          </span>
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
              disabled={completedChars.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Apply Normalization to All</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
