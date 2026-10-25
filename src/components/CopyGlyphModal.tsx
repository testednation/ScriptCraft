import React, { useState, useMemo } from 'react';
import {
  X,
  Copy,
  Layers,
  ArrowRight,
  ArrowLeftRight,
  Sparkles,
  Check,
  Search,
  Plus,
  RotateCcw,
  Sliders,
  ChevronRight,
  ClipboardCheck,
} from 'lucide-react';
import { GlyphData, GlyphStroke, GlyphVariant } from '../types/font';
import { strokesToSvgPath, CANVAS_BASELINE, CANVAS_ASCENDER, CANVAS_DESCENDER } from '../utils/fontEngine';

export interface CopyGlyphModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentChar: string;
  currentStrokes: GlyphStroke[];
  currentAdvanceWidth: number;
  glyphs: Record<string, GlyphData>;
  onApplyCopy: (
    sourceChar: string,
    targetChar: string,
    mode: 'replace' | 'append' | 'variant',
    copyAdvanceWidth: boolean,
    targetVariantName?: string
  ) => void;
  onBatchCopyToChars?: (
    sourceChar: string,
    targetChars: string[],
    mode: 'replace' | 'append' | 'variant',
    copyAdvanceWidth: boolean
  ) => void;
  onSwitchChar: (char: string) => void;
  clipboardStrokes: { char: string; strokes: GlyphStroke[]; advanceWidth?: number } | null;
  onSetClipboardStrokes: (data: { char: string; strokes: GlyphStroke[]; advanceWidth?: number } | null) => void;
}

// Recommended typographic base shape associations (anatomy references)
const TYPOGRAPHIC_BASE_SHAPES: Record<string, { recommendedSource: string; rationale: string }[]> = {
  // Uppercase
  Q: [{ recommendedSource: 'O', rationale: 'Circular bowl base shape (add tail)' }],
  C: [{ recommendedSource: 'O', rationale: 'Curved bowl base (open right side)' }],
  G: [{ recommendedSource: 'C', rationale: 'Open circular bowl (add spur/crossbar)' }, { recommendedSource: 'O', rationale: 'Full circular bowl' }],
  D: [{ recommendedSource: 'O', rationale: 'Right curved bowl + vertical stem' }],
  B: [{ recommendedSource: 'P', rationale: 'Top bowl + stem (add lower bowl)' }],
  R: [{ recommendedSource: 'P', rationale: 'Top bowl + stem (add diagonal leg)' }],
  E: [{ recommendedSource: 'F', rationale: 'Vertical stem + horizontal arms (add base arm)' }, { recommendedSource: 'L', rationale: 'Stem + baseline' }],
  F: [{ recommendedSource: 'E', rationale: 'Stem + top & mid arm (remove base)' }],
  H: [{ recommendedSource: 'I', rationale: 'Vertical stem base' }],
  J: [{ recommendedSource: 'I', rationale: 'Stem base (curve lower terminal)' }],
  K: [{ recommendedSource: 'I', rationale: 'Vertical stem base (add diagonal arms)' }],
  L: [{ recommendedSource: 'I', rationale: 'Vertical stem base (add baseline foot)' }],
  M: [{ recommendedSource: 'N', rationale: 'Diagonal apex rhythm' }, { recommendedSource: 'V', rationale: 'Diagonal slant angles' }],
  N: [{ recommendedSource: 'I', rationale: 'Parallel vertical stems' }],
  U: [{ recommendedSource: 'O', rationale: 'Lower rounded bowl' }, { recommendedSource: 'V', rationale: 'Symmetrical open ductus' }],
  W: [{ recommendedSource: 'V', rationale: 'Repeated diagonal vertex strokes' }],
  Y: [{ recommendedSource: 'V', rationale: 'Upper diagonal vertex (add vertical stem)' }],

  // Lowercase
  q: [{ recommendedSource: 'o', rationale: 'Round bowl (add right descender)' }, { recommendedSource: 'p', rationale: 'Flipped stem & bowl' }],
  d: [{ recommendedSource: 'o', rationale: 'Round bowl (add ascender stem)' }, { recommendedSource: 'b', rationale: 'Mirrored bowl & stem' }],
  b: [{ recommendedSource: 'o', rationale: 'Round bowl (add left ascender stem)' }, { recommendedSource: 'p', rationale: 'Ascender vs descender stem' }],
  p: [{ recommendedSource: 'o', rationale: 'Round bowl (add left descender stem)' }],
  c: [{ recommendedSource: 'o', rationale: 'Round bowl (open right aperture)' }],
  e: [{ recommendedSource: 'c', rationale: 'Open curved bowl (add crossbar loop)' }, { recommendedSource: 'o', rationale: 'Round bowl base' }],
  g: [{ recommendedSource: 'o', rationale: 'Round bowl (add loop/descender)' }, { recommendedSource: 'q', rationale: 'Descender shape' }],
  m: [{ recommendedSource: 'n', rationale: 'Double arched shoulder repetition' }],
  h: [{ recommendedSource: 'n', rationale: 'Arched shoulder (extend left ascender)' }],
  u: [{ recommendedSource: 'n', rationale: 'Inverted arched shoulder' }],
  r: [{ recommendedSource: 'n', rationale: 'Left stem & partial shoulder branch' }],
  v: [{ recommendedSource: 'u', rationale: 'Open bowl/vertex shape' }],
  w: [{ recommendedSource: 'v', rationale: 'Double vertex diagonal strokes' }],
  y: [{ recommendedSource: 'v', rationale: 'Upper vertex (add descending hook)' }, { recommendedSource: 'u', rationale: 'Open counter (add descender)' }],
  j: [{ recommendedSource: 'i', rationale: 'Tittle dot & stem (extend into descender hook)' }],
  t: [{ recommendedSource: 'l', rationale: 'Vertical stem (add crossbar & curved foot)' }],
  k: [{ recommendedSource: 'l', rationale: 'Vertical ascender stem' }],

  // Numerals
  '9': [{ recommendedSource: '6', rationale: 'Inverted loop & descender stem' }, { recommendedSource: '0', rationale: 'Upper round bowl' }],
  '6': [{ recommendedSource: '0', rationale: 'Lower circular bowl' }],
  '8': [{ recommendedSource: '0', rationale: 'Double stacked oval counter loops' }, { recommendedSource: '3', rationale: 'Rightward curved loops' }],
  '4': [{ recommendedSource: '1', rationale: 'Vertical downstroke stem' }],
};

const CHARACTER_CATEGORIES = [
  { name: 'Uppercase', chars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('') },
  { name: 'Lowercase', chars: 'abcdefghijklmnopqrstuvwxyz'.split('') },
  { name: 'Numerals', chars: '0123456789'.split('') },
  { name: 'Punctuation', chars: ['.', ',', '!', '?', '-', '+', '=', '/', ':', ';', "'", '"', '(', ')', '&'] },
];

export const CopyGlyphModal: React.FC<CopyGlyphModalProps> = ({
  isOpen,
  onClose,
  currentChar,
  currentStrokes,
  currentAdvanceWidth,
  glyphs,
  onApplyCopy,
  onBatchCopyToChars,
  onSwitchChar,
  clipboardStrokes,
  onSetClipboardStrokes,
}) => {
  // Navigation tabs: "pull" (Copy From another char into currentChar) vs "push" (Copy currentChar to another char)
  const [direction, setDirection] = useState<'pull' | 'push'>('pull');

  // Selected character to copy from (in pull mode) or to copy to (in push mode)
  const [selectedChar, setSelectedChar] = useState<string>(() => {
    // Default to the first recommended source if available
    const recs = TYPOGRAPHIC_BASE_SHAPES[currentChar];
    if (recs && recs.length > 0 && glyphs[recs[0].recommendedSource]?.strokes?.length > 0) {
      return recs[0].recommendedSource;
    }
    // Fallback: previous letter or 'O' / 'o'
    return currentChar === 'A' ? 'B' : 'O';
  });

  // Multiple targets for push mode
  const [batchTargetChars, setBatchTargetChars] = useState<string[]>([]);

  // Application mode: replace, append, or create as variant
  const [copyMode, setCopyMode] = useState<'replace' | 'append' | 'variant'>('replace');
  const [copyAdvanceWidth, setCopyAdvanceWidth] = useState<boolean>(true);
  const [customVariantName, setCustomVariantName] = useState<string>('');

  // Search & category filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [onlyWithInk, setOnlyWithInk] = useState<boolean>(true);

  // Success toast inside modal
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  // Typographic smart suggestions for the current character
  const recommendations = TYPOGRAPHIC_BASE_SHAPES[currentChar] || [];

  // Source and target glyph data
  const sourceChar = direction === 'pull' ? selectedChar : currentChar;
  const targetChar = direction === 'pull' ? currentChar : selectedChar;
  const sourceGlyph = glyphs[sourceChar];
  const targetGlyph = glyphs[targetChar];

  const sourceStrokes = sourceGlyph?.strokes || [];
  const targetStrokes = targetGlyph?.strokes || [];

  // Filtered character list
  const filteredChars = useMemo(() => {
    let list: string[] = [];
    if (activeCategory === 'All') {
      list = CHARACTER_CATEGORIES.flatMap((c) => c.chars);
    } else {
      const cat = CHARACTER_CATEGORIES.find((c) => c.name === activeCategory);
      list = cat ? cat.chars : [];
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((c) => c.toLowerCase().includes(q));
    }

    if (onlyWithInk) {
      list = list.filter((c) => (glyphs[c]?.strokes?.length || 0) > 0);
    }

    return list;
  }, [activeCategory, searchQuery, onlyWithInk, glyphs]);

  // Handle single apply
  const handleExecuteCopy = () => {
    if (direction === 'pull') {
      if (sourceStrokes.length === 0) return;
      onApplyCopy(
        sourceChar,
        targetChar,
        copyMode,
        copyAdvanceWidth,
        copyMode === 'variant' ? customVariantName || `Base '${sourceChar}'` : undefined
      );
      setActionNotice(`Copied ${sourceStrokes.length} strokes from '${sourceChar}' into '${targetChar}'!`);
    } else {
      // Push mode
      if (currentStrokes.length === 0) return;
      if (batchTargetChars.length > 0 && onBatchCopyToChars) {
        onBatchCopyToChars(currentChar, batchTargetChars, copyMode, copyAdvanceWidth);
        setActionNotice(`Copied '${currentChar}' strokes into ${batchTargetChars.length} characters (${batchTargetChars.join(', ')})!`);
      } else {
        onApplyCopy(
          currentChar,
          targetChar,
          copyMode,
          copyAdvanceWidth,
          copyMode === 'variant' ? customVariantName || `Base '${currentChar}'` : undefined
        );
        setActionNotice(`Copied '${currentChar}' strokes into '${targetChar}'!`);
      }
    }

    setTimeout(() => {
      setActionNotice(null);
      onClose();
    }, 1200);
  };

  // Clipboard copy handler
  const handleCopyCurrentToClipboard = () => {
    if (currentStrokes.length === 0) return;
    onSetClipboardStrokes({
      char: currentChar,
      strokes: JSON.parse(JSON.stringify(currentStrokes)),
      advanceWidth: currentAdvanceWidth,
    });
    setActionNotice(`Copied '${currentChar}' (${currentStrokes.length} strokes) to clipboard!`);
    setTimeout(() => setActionNotice(null), 2500);
  };

  // Clipboard paste handler
  const handlePasteFromClipboard = () => {
    if (!clipboardStrokes || clipboardStrokes.strokes.length === 0) return;
    onApplyCopy(
      clipboardStrokes.char,
      currentChar,
      copyMode,
      copyAdvanceWidth,
      copyMode === 'variant' ? customVariantName || `Pasted from '${clipboardStrokes.char}'` : undefined
    );
    setActionNotice(`Pasted ${clipboardStrokes.strokes.length} strokes from '${clipboardStrokes.char}' into '${currentChar}'!`);
    setTimeout(() => {
      setActionNotice(null);
      onClose();
    }, 1200);
  };

  // Toggle character in batch push selection
  const handleToggleBatchTarget = (char: string) => {
    setBatchTargetChars((prev) =>
      prev.includes(char) ? prev.filter((c) => c !== char) : [...prev, char]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-slate-800">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-xl text-indigo-700">
              <Copy className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
                  Copy Glyph & Anatomical Base Shapes
                </h2>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Current: '{currentChar}'
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Transfer stroke data between characters to rapidly craft stylistic variants, bowls, stems, and related letterforms.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            title="Close modal [Esc]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Direction Switcher & Clipboard Quick Strip */}
        <div className="px-6 py-2.5 bg-white border-b border-slate-100 flex items-center justify-between gap-4 flex-wrap">
          {/* Direction Tabs */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl gap-1">
            <button
              onClick={() => setDirection('pull')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                direction === 'pull'
                  ? 'bg-white text-indigo-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Borrow Base Shape Into '{currentChar}'</span>
            </button>
            <button
              onClick={() => setDirection('push')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                direction === 'push'
                  ? 'bg-white text-indigo-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Send '{currentChar}' To Another Letter</span>
            </button>
          </div>

          {/* Quick Clipboard Copy/Paste buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyCurrentToClipboard}
              disabled={currentStrokes.length === 0}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition-colors shadow-2xs"
              title="Copy current strokes to temporary memory clipboard"
            >
              <Copy className="w-3.5 h-3.5 text-slate-500" />
              <span>Copy '{currentChar}'</span>
            </button>

            {clipboardStrokes && (
              <button
                onClick={handlePasteFromClipboard}
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-300 rounded-lg hover:bg-emerald-100 transition-colors shadow-2xs"
                title={`Paste ${clipboardStrokes.strokes.length} strokes from '${clipboardStrokes.char}' into '${currentChar}'`}
              >
                <ClipboardCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Paste from '{clipboardStrokes.char}'</span>
              </button>
            )}
          </div>
        </div>

        {/* Action notification toast */}
        {actionNotice && (
          <div className="mx-6 mt-3 px-4 py-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200 shadow-2xs">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionNotice}</span>
          </div>
        )}

        {/* Modal Main Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Smart Anatomical Suggestions (if available for current character) */}
          {direction === 'pull' && recommendations.length > 0 && (
            <div className="p-3.5 bg-gradient-to-r from-indigo-50/80 to-purple-50/60 border border-indigo-200/80 rounded-xl space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-950 uppercase tracking-wider font-mono">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Typographic Anatomy Recommendations for '{currentChar}':</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {recommendations.map((rec) => {
                  const srcGlyph = glyphs[rec.recommendedSource];
                  const hasInk = srcGlyph && srcGlyph.strokes.length > 0;
                  const isSelected = selectedChar === rec.recommendedSource;

                  return (
                    <button
                      key={rec.recommendedSource}
                      onClick={() => setSelectedChar(rec.recommendedSource)}
                      className={`p-2.5 rounded-lg border text-left flex items-center gap-3 transition-all ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : hasInk
                          ? 'bg-white hover:bg-indigo-50/50 border-indigo-200 text-slate-800'
                          : 'bg-white/60 border-slate-200 text-slate-400 opacity-60'
                      }`}
                    >
                      {/* Character Badge & SVG stroke preview */}
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border relative ${
                          isSelected ? 'bg-indigo-700 border-indigo-500' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        {hasInk ? (
                          <svg
                            viewBox="0 0 800 800"
                            className="w-8 h-8 pointer-events-none"
                            style={{ overflow: 'visible' }}
                          >
                            <path
                              d={strokesToSvgPath(srcGlyph.strokes)}
                              fill="none"
                              stroke={isSelected ? '#ffffff' : '#334155'}
                              strokeWidth="32"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        ) : (
                          <span className="font-bold text-lg">{rec.recommendedSource}</span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold font-mono">Base '{rec.recommendedSource}'</span>
                          <span className={`text-[10px] ${isSelected ? 'text-indigo-200' : 'text-slate-500'}`}>
                            {hasInk ? `${srcGlyph.strokes.length} strokes` : 'empty'}
                          </span>
                        </div>
                        <p className={`text-[11px] truncate mt-0.5 ${isSelected ? 'text-indigo-100' : 'text-slate-500'}`}>
                          {rec.rationale}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Side-by-Side Visual Comparison Card */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            {/* Source Preview Card */}
            <div className="bg-white rounded-lg p-3 border border-slate-200 shadow-2xs flex items-center gap-4">
              <div className="w-16 h-16 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0 relative overflow-hidden">
                {sourceStrokes.length > 0 ? (
                  <svg viewBox="0 0 800 800" className="w-14 h-14">
                    <line x1="80" y1="600" x2="720" y2="600" stroke="#cbd5e1" strokeWidth="16" />
                    <line x1="80" y1="400" x2="720" y2="400" stroke="#e2e8f0" strokeWidth="12" strokeDasharray="20 20" />
                    <path
                      d={strokesToSvgPath(sourceStrokes)}
                      fill="none"
                      stroke="#4338ca"
                      strokeWidth="28"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <span className="text-2xl font-bold text-slate-300 font-['Plus_Jakarta_Sans']">
                    {sourceChar}
                  </span>
                )}
                <span className="absolute bottom-1 right-1 px-1 rounded text-[9px] font-mono bg-slate-900 text-white font-bold">
                  {sourceChar}
                </span>
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-900">Source: '{sourceChar}'</span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    ({sourceStrokes.length} stroke{sourceStrokes.length === 1 ? '' : 's'})
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Advance Width: <span className="font-mono font-semibold">{sourceGlyph?.advanceWidth || 600}px</span>
                </div>
                <div className="text-[10px] text-indigo-600 font-medium mt-1">
                  {direction === 'pull' ? 'Borrowing strokes from here' : 'Original character strokes'}
                </div>
              </div>
            </div>

            {/* Target Preview Card */}
            <div className="bg-white rounded-lg p-3 border border-slate-200 shadow-2xs flex items-center gap-4">
              <div className="w-16 h-16 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0 relative overflow-hidden">
                {targetStrokes.length > 0 ? (
                  <svg viewBox="0 0 800 800" className="w-14 h-14">
                    <line x1="80" y1="600" x2="720" y2="600" stroke="#cbd5e1" strokeWidth="16" />
                    <line x1="80" y1="400" x2="720" y2="400" stroke="#e2e8f0" strokeWidth="12" strokeDasharray="20 20" />
                    <path
                      d={strokesToSvgPath(targetStrokes)}
                      fill="none"
                      stroke="#0f172a"
                      strokeWidth="28"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <span className="text-2xl font-bold text-slate-300 font-['Plus_Jakarta_Sans']">
                    {targetChar}
                  </span>
                )}
                <span className="absolute bottom-1 right-1 px-1 rounded text-[9px] font-mono bg-indigo-600 text-white font-bold">
                  {targetChar}
                </span>
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-900">Destination: '{targetChar}'</span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    ({targetStrokes.length} stroke{targetStrokes.length === 1 ? '' : 's'} currently)
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Action:{' '}
                  <span className="font-semibold text-indigo-700 capitalize">
                    {copyMode === 'replace'
                      ? 'Replace Strokes'
                      : copyMode === 'append'
                      ? `Merge (+${sourceStrokes.length} strokes)`
                      : 'Create New Stylistic Variant'}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  {direction === 'pull' ? `Target active in Studio` : `Will be updated with '${sourceChar}'`}
                </div>
              </div>
            </div>
          </div>

          {/* Transfer Mode Configuration */}
          <div className="space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 font-mono">
              Transfer Mode & Target Behavior:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  id: 'replace',
                  title: 'Replace Strokes',
                  desc: `Overwrite destination '${targetChar}' entirely with '${sourceChar}' strokes as a clean base canvas.`,
                },
                {
                  id: 'append',
                  title: 'Append / Merge',
                  desc: `Keep existing strokes on '${targetChar}' and append '${sourceChar}' strokes together.`,
                },
                {
                  id: 'variant',
                  title: 'Create Alternate Variant',
                  desc: `Keep '${targetChar}' standard form untouched and create a new Stylistic Variant tab.`,
                },
              ].map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setCopyMode(mode.id as any)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    copyMode === mode.id
                      ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 shadow-xs'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold">{mode.title}</span>
                    {copyMode === mode.id && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug">{mode.desc}</p>
                </button>
              ))}
            </div>

            {/* Custom Variant Name input if mode is variant */}
            {copyMode === 'variant' && (
              <div className="flex items-center gap-3 p-3 bg-indigo-50/40 rounded-xl border border-indigo-100">
                <label className="text-xs font-semibold text-indigo-950 whitespace-nowrap">
                  Variant Name:
                </label>
                <input
                  type="text"
                  value={customVariantName}
                  onChange={(e) => setCustomVariantName(e.target.value)}
                  placeholder={`Base from '${sourceChar}'`}
                  className="flex-1 px-3 py-1.5 text-xs bg-white border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 font-sans"
                />
              </div>
            )}

            {/* Spacing option */}
            <div className="flex items-center gap-2 pt-1">
              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={copyAdvanceWidth}
                  onChange={(e) => setCopyAdvanceWidth(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>Also transfer advance width and metric bearings from '{sourceChar}' ({sourceGlyph?.advanceWidth || 600}px)</span>
              </label>
            </div>
          </div>

          {/* Character Browser Grid */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono">
                {direction === 'pull' ? 'Choose Character to Borrow From:' : 'Choose Destination Letter:'}
              </label>

              {/* Filters */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search char..."
                    className="pl-8 pr-2.5 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-600 w-28 sm:w-36"
                  />
                </div>

                <div className="flex items-center p-0.5 bg-slate-100 rounded-lg text-[11px]">
                  {['All', 'Uppercase', 'Lowercase', 'Numerals'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                        activeCategory === cat ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <label className="flex items-center gap-1 text-[11px] text-slate-500 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={onlyWithInk}
                    onChange={(e) => setOnlyWithInk(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-0"
                  />
                  <span>Drawn only</span>
                </label>
              </div>
            </div>

            {/* Character Cards Grid */}
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 max-h-56 overflow-y-auto p-1 bg-slate-50 rounded-xl border border-slate-200 content-start">
              {filteredChars.map((char) => {
                const g = glyphs[char];
                const hasStrokes = g && g.strokes.length > 0;
                const isSelected = selectedChar === char;
                const isCurrentActive = char === currentChar;
                const isBatchSelected = batchTargetChars.includes(char);

                return (
                  <button
                    key={char}
                    onClick={() => {
                      if (direction === 'push' && batchTargetChars.length > 0) {
                        handleToggleBatchTarget(char);
                      } else {
                        setSelectedChar(char);
                      }
                    }}
                    disabled={direction === 'pull' && !hasStrokes}
                    className={`aspect-square p-1 rounded-lg border text-center flex flex-col items-center justify-between transition-all relative ${
                      isSelected || isBatchSelected
                        ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-400/40'
                        : isCurrentActive
                        ? 'border-slate-400 bg-slate-200 text-slate-900'
                        : hasStrokes
                        ? 'border-slate-200 bg-white text-slate-900 hover:border-indigo-300 hover:bg-indigo-50/30'
                        : 'border-dashed border-slate-200 bg-white/40 text-slate-300'
                    }`}
                    title={`Character '${char}' · ${hasStrokes ? `${g.strokes.length} strokes` : 'no strokes drawn yet'}`}
                  >
                    <span className="text-xs font-bold font-mono">{char}</span>

                    {/* SVG mini-glyph preview */}
                    <div className="w-6 h-6 flex items-center justify-center">
                      {hasStrokes ? (
                        <svg viewBox="0 0 800 800" className="w-5 h-5 pointer-events-none">
                          <path
                            d={strokesToSvgPath(g.strokes)}
                            fill="none"
                            stroke={isSelected || isBatchSelected ? '#ffffff' : '#334155'}
                            strokeWidth="38"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      ) : (
                        <span className="text-[9px] text-slate-300">·</span>
                      )}
                    </div>

                    <span
                      className={`text-[9px] font-mono leading-none ${
                        isSelected || isBatchSelected
                          ? 'text-indigo-200'
                          : hasStrokes
                          ? 'text-slate-500'
                          : 'text-slate-300'
                      }`}
                    >
                      {hasStrokes ? `${g.strokes.length}p` : '0'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            {direction === 'pull' ? (
              <span>
                Ready to copy <strong className="text-slate-800 font-mono">{sourceStrokes.length}</strong> stroke{sourceStrokes.length === 1 ? '' : 's'} from '{sourceChar}' into '{currentChar}'.
              </span>
            ) : (
              <span>
                Sending <strong className="text-slate-800 font-mono">{currentStrokes.length}</strong> stroke{currentStrokes.length === 1 ? '' : 's'} from '{currentChar}' to '{targetChar}'.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200/70 rounded-xl transition-colors"
            >
              Cancel
            </button>

            <button
              onClick={handleExecuteCopy}
              disabled={direction === 'pull' ? sourceStrokes.length === 0 : currentStrokes.length === 0}
              className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] rounded-xl transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>
                {direction === 'pull'
                  ? `Apply '${sourceChar}' to '${currentChar}'`
                  : `Copy to '${targetChar}'`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
