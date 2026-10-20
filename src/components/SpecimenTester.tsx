import React, { useState, useMemo, useEffect } from 'react';
import {
  FileText,
  Sliders,
  Type,
  Maximize2,
  Minimize2,
  Palette,
  RotateCcw,
  Sparkles,
  Download,
  Layout,
  Eye,
  BookOpen,
  Split,
  Sparkles as SparklesIcon,
  ArrowRight,
  Plus,
  RefreshCw,
  Zap,
  Focus,
  Contrast,
  Check,
  X,
} from 'lucide-react';
import { FontMetadata, GlyphData, GlyphVariant, PenSettings } from '../types/font';
import { strokesToSvgPath, rotateGlyphStrokes } from '../utils/fontEngine';
import { RealWorldSpecimens } from './RealWorldSpecimens';
import { ContextualAlternatesModal } from './ContextualAlternatesModal';
import {
  substituteContextualAlternates,
  batchGenerateContextualAlternates,
  FREQUENT_CONTEXTUAL_LETTERS,
} from '../utils/contextualAlternates';

interface SpecimenTesterProps {
  fontFamilyName: string;
  metadata: FontMetadata;
  glyphs: Record<string, GlyphData>;
  onExportClick: () => void;
  onSelectCharForStudio?: (char: string) => void;
  onUpdateAllGlyphs?: (glyphs: Record<string, GlyphData>) => void;
  penSettings?: PenSettings;
}

const INK_COLORS = [
  { name: "Noodler's Black", color: '#111827', label: 'Carbon Black' },
  { name: 'Iroshizuku Kon-peki', color: '#0284c7', label: 'Royal Cerulean' },
  { name: 'Diamine Oxblood', color: '#881337', label: 'Vintage Oxblood' },
  { name: 'J. Herbin Emerald', color: '#065f46', label: 'Forest Green' },
  { name: 'Platinum Walnut', color: '#78350f', label: 'Sepia Walnut' },
];

const PAPER_THEMES = [
  {
    id: 'college',
    name: 'Lined Notebook',
    bg: '#faf9f5',
    lineStyle: 'linear-gradient(transparent 39px, #93c5fd 40px)',
    border: '#e2e8f0',
  },
  {
    id: 'dotgrid',
    name: 'Dot Grid (BuJo)',
    bg: '#fcfbf7',
    lineStyle: 'radial-gradient(#cbd5e1 1.5px, transparent 1.5px)',
    border: '#e2e8f0',
  },
  {
    id: 'parchment',
    name: 'Cream Stationery',
    bg: '#fdfbf7',
    lineStyle: 'none',
    border: '#fde68a',
  },
  {
    id: 'stickynote',
    name: 'Sticky Note',
    bg: '#fef08a',
    lineStyle: 'none',
    border: '#facc15',
  },
  {
    id: 'blueprint',
    name: 'Drafting Grid',
    bg: '#0f172a',
    lineStyle: 'linear-gradient(rgba(56, 189, 248, 0.1) 1px, transparent 1px)',
    border: '#1e293b',
    textColor: '#e0f2fe',
  },
];

const SAMPLE_TEXTS = [
  {
    label: 'Sphinx Pangram',
    text: 'Sphinx of black quartz, judge my vow. The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs.',
  },
  {
    label: 'Warm Personal Letter',
    text: `Dearest friend,\n\nI am writing to you on a quiet Tuesday evening with coffee on my desk. The afternoon light is filtering softly through the window, and I wanted to send this handwritten thought across the miles. May your week be gentle and full of creative inspiration.\n\nWarmest regards,\nYours always.`,
  },
  {
    label: 'Architect Blueprint Note',
    text: `PROJECT NOTE // SECTION 04:\n- VERIFY ALL FOUNDATION ELEVATIONS ON SITE PRIOR TO POURING SLAB.\n- SPECIFIED 0.5MM TOLERANCE ON MAIN STRUCTURAL TRUSS ANCHORS.\n- APPROVED FOR FABRICATION. ARCHITECT SIGN-OFF 2026.`,
  },
  {
    label: 'Handmade Recipe Card',
    text: `Grandma's Fresh Rosemary Focaccia:\n1. 500g high-protein flour, 400ml warm water, 7g active yeast.\n2. Generous drizzle of cold-pressed olive oil & flaky Maldon sea salt.\n3. Bake at 220°C until golden and fragrant. Share with someone you love!`,
  },
];

export const SpecimenTester: React.FC<SpecimenTesterProps> = ({
  fontFamilyName,
  metadata,
  glyphs,
  onExportClick,
  onSelectCharForStudio,
  onUpdateAllGlyphs,
  penSettings,
}) => {
  const [typedText, setTypedText] = useState(SAMPLE_TEXTS[0].text);
  const [fontSize, setFontSize] = useState<number>(36);
  const [lineHeight, setLineHeight] = useState<number>(1.6);
  const [letterSpacing, setLetterSpacing] = useState<number>(0);
  const [activeInk, setActiveInk] = useState(INK_COLORS[0]);
  const [activePaper, setActivePaper] = useState(PAPER_THEMES[0]);
  const [viewMode, setViewMode] = useState<
    'scenarios' | 'editor' | 'waterfall' | 'alphabet' | 'alternates'
  >('scenarios');
  const [organicMode, setOrganicMode] = useState<boolean>(true);

  // Focus Mode & High-Contrast Settings
  const [isFocusMode, setIsFocusMode] = useState<boolean>(false);
  const [focusContrastMode, setFocusContrastMode] = useState<'black' | 'contrast' | 'ink'>('black');
  const [isTextareaFocused, setIsTextareaFocused] = useState<boolean>(false);

  // Keyboard shortcut listener: Esc to exit focus mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFocusMode) {
        setIsFocusMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFocusMode]);

  // Determine active text color: High-contrast pure black, auto-contrast, or selected ink
  const editorTextColor = useMemo(() => {
    // In Focus Mode, text is pure black or contrast color
    if (isFocusMode) {
      if (focusContrastMode === 'black') {
        return '#000000';
      }
      if (focusContrastMode === 'contrast') {
        return activePaper.id === 'blueprint' ? '#ffffff' : '#000000';
      }
      return activePaper.textColor || activeInk.color;
    }

    // In normal editor mode, obey contrast toggle or focus
    if (focusContrastMode === 'black') {
      return '#000000';
    }
    if (focusContrastMode === 'contrast') {
      return activePaper.id === 'blueprint' ? '#ffffff' : '#000000';
    }
    // If user has focused into textarea and contrast mode is active
    if (isTextareaFocused && focusContrastMode !== 'ink') {
      return activePaper.id === 'blueprint' ? '#ffffff' : '#000000';
    }

    return activePaper.textColor || activeInk.color;
  }, [focusContrastMode, isFocusMode, activePaper, activeInk, isTextareaFocused]);

  const completedGlyphs = Object.keys(glyphs).filter((c) => glyphs[c]?.strokes?.length > 0);

  // Characters with alternate variants
  const glyphsWithVariants = Object.values(glyphs).filter(
    (g) => g.variants && g.variants.length > 0
  );

  const [isContextualModalOpen, setIsContextualModalOpen] = useState<boolean>(false);
  const [targetModalChar, setTargetModalChar] = useState<string>('e');
  const [generationNotice, setGenerationNotice] = useState<string | null>(null);

  const handleApplyContextualVariants = (updates: Record<string, GlyphVariant[]>) => {
    if (onUpdateAllGlyphs) {
      const newGlyphs = { ...glyphs };
      for (const [char, variants] of Object.entries(updates)) {
        if (newGlyphs[char]) {
          newGlyphs[char] = {
            ...newGlyphs[char],
            variants,
          };
        }
      }
      onUpdateAllGlyphs(newGlyphs);
      const count = Object.keys(updates).length;
      setGenerationNotice(`Generated contextual alternates for ${count} character(s)!`);
      setTimeout(() => setGenerationNotice(null), 3500);
    }
  };

  const handleQuickGenerateFrequent = () => {
    if (!onUpdateAllGlyphs) return;
    const frequentCompleted = FREQUENT_CONTEXTUAL_LETTERS.filter(
      (c) => glyphs[c]?.strokes && glyphs[c].strokes.length > 0
    );
    if (frequentCompleted.length === 0) return;

    const updates = batchGenerateContextualAlternates(glyphs, frequentCompleted, {
      level: 'balanced',
      count: 2,
    });
    handleApplyContextualVariants(updates);
  };

  // Dynamic cycling for the comparison phrase
  const samplePhraseUnits = useMemo(() => {
    return substituteContextualAlternates('coffee seeds & sweet letter', glyphs);
  }, [glyphs]);

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
      {/* Editorial Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-slate-500">
            <span>Specimen Preview Foundry</span>
            <span aria-hidden="true">·</span>
            <span>Real-World Contexts & TrueType Render</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 font-['Plus_Jakarta_Sans']">
            {metadata.familyName || 'MyHandwriting'} Specimen
          </h1>
          <p className="text-slate-600 text-xs">
            Test drive your typeface in real-world contexts—business cards, book covers, cafe menus—or freeform typing.
          </p>
        </div>

        {/* View Mode Segmented Controls */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          <button
            onClick={() => setViewMode('scenarios')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              viewMode === 'scenarios'
                ? 'bg-white text-slate-900 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layout className="w-3.5 h-3.5 text-indigo-600" />
            <span>Real-World Layouts</span>
          </button>
          <button
            onClick={() => setViewMode('editor')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              viewMode === 'editor'
                ? 'bg-white text-slate-900 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Live Typewriter
          </button>
          <button
            onClick={() => setViewMode('waterfall')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              viewMode === 'waterfall'
                ? 'bg-white text-slate-900 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Size Waterfall
          </button>
          <button
            onClick={() => setViewMode('alphabet')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              viewMode === 'alphabet'
                ? 'bg-white text-slate-900 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Glyph Catalog
          </button>
          <button
            onClick={() => setViewMode('alternates')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              viewMode === 'alternates'
                ? 'bg-white text-indigo-950 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Split className="w-3.5 h-3.5 text-indigo-600" />
            <span>Organic Alternates</span>
            {glyphsWithVariants.length > 0 && (
              <span className="px-1.5 py-0.2 text-[9px] bg-indigo-100 text-indigo-700 font-bold rounded-full">
                {glyphsWithVariants.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setIsFocusMode(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all bg-indigo-50 hover:bg-indigo-100 text-indigo-950 border border-indigo-200 shadow-2xs active:scale-[0.98]"
            title="Open distraction-free Focus Mode: Full-screen writing space with high-contrast black/contrast text [Esc to exit]"
          >
            <Focus className="w-3.5 h-3.5 text-indigo-600" />
            <span>Focus Mode</span>
          </button>
        </div>
      </div>

      {/* Scenario Mode: Real-World Layouts (Business Card, Book Cover, Menu, etc.) */}
      {viewMode === 'scenarios' && (
        <RealWorldSpecimens
          fontFamilyName={fontFamilyName}
          metadata={metadata}
          glyphs={glyphs}
          onExportClick={onExportClick}
        />
      )}

      {/* Control Bar for Typewriter, Waterfall, and Catalog */}
      {viewMode !== 'scenarios' && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs shadow-xs">
          {/* Paper & Ink Swatches & Text Contrast */}
          <div className="flex items-center gap-5 flex-wrap">
            {/* Paper selector */}
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-700">Paper:</span>
              <div className="flex items-center gap-1">
                {PAPER_THEMES.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setActivePaper(p)}
                    className={`px-2 py-1 rounded text-[11px] font-medium border transition-colors ${
                      activePaper.id === p.id
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Ink swatch selector */}
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-700">Fountain Ink:</span>
              <div className="flex items-center gap-1.5">
                {INK_COLORS.map((ink) => (
                  <button
                    key={ink.name}
                    onClick={() => {
                      setActiveInk(ink);
                      setFocusContrastMode('ink');
                    }}
                    style={{ backgroundColor: ink.color }}
                    className={`w-5 h-5 rounded-full border-2 transition-transform ${
                      activeInk.name === ink.name && focusContrastMode === 'ink'
                        ? 'border-slate-900 scale-110 shadow-sm'
                        : 'border-transparent hover:scale-105'
                    }`}
                    title={ink.name}
                  />
                ))}
              </div>
            </div>

            {/* Text Contrast Selector */}
            <div className="flex items-center gap-1.5 pl-3 border-l border-slate-200">
              <span className="font-medium text-slate-700 flex items-center gap-1">
                <Contrast className="w-3.5 h-3.5 text-slate-500" />
                Text Color:
              </span>
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
                <button
                  type="button"
                  onClick={() => setFocusContrastMode('black')}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
                    focusContrastMode === 'black'
                      ? 'bg-black text-white shadow-2xs'
                      : 'text-slate-600 hover:text-black'
                  }`}
                  title="Force pure solid black (#000000) for highest contrast readability"
                >
                  Solid Black
                </button>
                <button
                  type="button"
                  onClick={() => setFocusContrastMode('contrast')}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
                    focusContrastMode === 'contrast'
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Auto Contrast Color: Pure Black on light paper, Pure White on dark paper"
                >
                  Auto Contrast
                </button>
                <button
                  type="button"
                  onClick={() => setFocusContrastMode('ink')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                    focusContrastMode === 'ink'
                      ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Use selected fountain ink color"
                >
                  Ink Swatch
                </button>
              </div>
            </div>
          </div>

          {/* Font Size, Spacing & Focus Mode */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-mono">Size: {fontSize}px</span>
              <input
                type="range"
                min="16"
                max="72"
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="w-20 accent-slate-900"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-mono">Spacing: {letterSpacing}px</span>
              <input
                type="range"
                min="-2"
                max="8"
                step="0.5"
                value={letterSpacing}
                onChange={(e) => setLetterSpacing(Number(e.target.value))}
                className="w-16 accent-slate-900"
              />
            </div>

            {/* Organic Mode Toggle */}
            <label className="flex items-center gap-1.5 text-xs text-slate-700 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg cursor-pointer select-none">
              <input
                type="checkbox"
                checked={organicMode}
                onChange={(e) => setOrganicMode(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
              />
              <span className="font-semibold text-slate-900">Organic Alternates</span>
              <span className="text-[10px] text-indigo-600 font-bold font-mono">
                {organicMode ? 'ON' : 'OFF'}
              </span>
            </label>

            {/* Focus Mode Button */}
            <button
              onClick={() => setIsFocusMode(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-900 rounded-lg text-xs font-semibold transition-all shadow-2xs active:scale-[0.98]"
              title="Enter distraction-free Focus Mode: Maximize canvas with high-contrast text"
            >
              <Focus className="w-3.5 h-3.5 text-indigo-600" />
              <span>Focus Mode</span>
            </button>

            <button
              onClick={onExportClick}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-all shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download TTF</span>
            </button>
          </div>
        </div>
      )}

      {/* Preset Pangram Chips */}
      {viewMode === 'editor' && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-400 font-mono shrink-0">Sample texts:</span>
          {SAMPLE_TEXTS.map((sample) => (
            <button
              key={sample.label}
              onClick={() => setTypedText(sample.text)}
              className="px-2.5 py-1 bg-white border border-slate-200 hover:border-slate-400 rounded-md text-slate-700 whitespace-nowrap transition-colors"
            >
              {sample.label}
            </button>
          ))}
        </div>
      )}

      {/* Main Specimen Display Area */}
      {viewMode === 'editor' && (
        <div
          style={{
            backgroundColor: activePaper.bg,
            backgroundImage: activePaper.lineStyle,
            backgroundSize: activePaper.id === 'dotgrid' ? '24px 24px' : 'auto 40px',
            borderColor: activePaper.border,
            color: editorTextColor,
          }}
          className="rounded-2xl border shadow-xl p-8 lg:p-12 min-h-[460px] relative transition-all"
        >
          {/* Quick Focus Mode Badge & High Contrast Indicator */}
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-black/5 text-xs">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                  focusContrastMode === 'black'
                    ? 'bg-black text-white'
                    : focusContrastMode === 'contrast'
                    ? 'bg-slate-900 text-white'
                    : 'bg-indigo-100 text-indigo-800'
                }`}
              >
                {focusContrastMode === 'black' && '● Solid Black (#000000)'}
                {focusContrastMode === 'contrast' && '◐ Contrast Color'}
                {focusContrastMode === 'ink' && `◆ ${activeInk.name}`}
              </span>
              <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">
                {activePaper.name} · {fontSize}px
              </span>
            </div>

            <button
              onClick={() => setIsFocusMode(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-indigo-900 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-lg shadow-2xs transition-all"
              title="Expand to distraction-free Zen Focus Mode"
            >
              <Focus className="w-3.5 h-3.5 text-indigo-600" />
              <span>Full Focus Mode</span>
            </button>
          </div>

          {/* Editable live handwriting canvas area */}
          <textarea
            value={typedText}
            onChange={(e) => setTypedText(e.target.value)}
            onFocus={() => setIsTextareaFocused(true)}
            onBlur={() => setIsTextareaFocused(false)}
            style={{
              fontFamily: `"${fontFamilyName}", "Caveat", cursive, sans-serif`,
              fontSize: `${fontSize}px`,
              lineHeight: lineHeight,
              letterSpacing: `${letterSpacing}px`,
              color: editorTextColor,
            }}
            placeholder="Click anywhere and type with your custom handwriting font..."
            className="w-full h-full min-h-[380px] bg-transparent outline-none border-none resize-none overflow-y-auto"
          />

          <div className="absolute bottom-4 right-4 flex items-center gap-3 text-[11px] font-mono opacity-50 select-none">
            <span>{typedText.split(/\s+/).filter(Boolean).length} words</span>
            <span>·</span>
            <span>{typedText.length} characters</span>
            <span>·</span>
            <span>{fontFamilyName}</span>
          </div>
        </div>
      )}

      {/* Waterfall Mode */}
      {viewMode === 'waterfall' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 space-y-8 shadow-sm">
          {[14, 18, 24, 32, 44, 56, 72].map((size) => (
            <div key={size} className="space-y-1.5 border-b border-slate-100 pb-6 last:border-b-0">
              <span className="text-[11px] font-mono text-slate-400">{size}px</span>
              <p
                style={{
                  fontFamily: `"${fontFamilyName}", "Caveat", cursive, sans-serif`,
                  fontSize: `${size}px`,
                  color: activeInk.color,
                }}
                className="leading-tight"
              >
                Sphinx of black quartz, judge my vow. 1234567890
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Alphabet Catalog Mode */}
      {viewMode === 'alphabet' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 space-y-8 shadow-sm">
          <div>
            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-4">
              Uppercase Letterforms
            </h3>
            <div className="grid grid-cols-6 sm:grid-cols-9 md:grid-cols-13 gap-3">
              {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((char) => (
                <div
                  key={char}
                  className="aspect-square bg-slate-50 border border-slate-200 rounded-lg flex flex-col items-center justify-center p-2"
                >
                  <span className="text-[10px] font-mono text-slate-400">{char}</span>
                  <span
                    style={{
                      fontFamily: `"${fontFamilyName}", "Caveat", cursive, sans-serif`,
                      color: activeInk.color,
                    }}
                    className="text-2xl mt-1"
                  >
                    {char}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-4">
              Lowercase Letterforms
            </h3>
            <div className="grid grid-cols-6 sm:grid-cols-9 md:grid-cols-13 gap-3">
              {'abcdefghijklmnopqrstuvwxyz'.split('').map((char) => (
                <div
                  key={char}
                  className="aspect-square bg-slate-50 border border-slate-200 rounded-lg flex flex-col items-center justify-center p-2"
                >
                  <span className="text-[10px] font-mono text-slate-400">{char}</span>
                  <span
                    style={{
                      fontFamily: `"${fontFamilyName}", "Caveat", cursive, sans-serif`,
                      color: activeInk.color,
                    }}
                    className="text-2xl mt-1"
                  >
                    {char}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-4">
              Numerals & Punctuation
            </h3>
            <div className="grid grid-cols-6 sm:grid-cols-9 md:grid-cols-13 gap-3">
              {'0123456789.!?,-+:;()&'.split('').map((char) => (
                <div
                  key={char}
                  className="aspect-square bg-slate-50 border border-slate-200 rounded-lg flex flex-col items-center justify-center p-2"
                >
                  <span className="text-[10px] font-mono text-slate-400">{char}</span>
                  <span
                    style={{
                      fontFamily: `"${fontFamilyName}", "Caveat", cursive, sans-serif`,
                      color: activeInk.color,
                    }}
                    className="text-2xl mt-1"
                  >
                    {char}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Organic Alternates & Randomizer Arena */}
      {viewMode === 'alternates' && (
        <div className="space-y-6">
          {/* Explanation Banner */}
          <div className="bg-gradient-to-r from-indigo-50 via-sky-50 to-emerald-50 border border-indigo-200/80 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2 text-indigo-700 font-semibold text-xs tracking-wider uppercase font-mono">
                <Split className="w-4 h-4" />
                <span>Contextual Alternates & Organic Randomizer</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
                Banish Robotic Monotony from Digital Handwriting
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                In natural penmanship, repeating letters like the twin <em>'e'</em>s in <strong>"coffee"</strong> or <em>'s'</em>s in <strong>"Mississippi"</strong> are never 100% mathematically identical clones. ScriptCraft's Organic Alternates system allows drawing alternate variations of any character, giving your handwriting fonts warm, authentic human realism.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
              <label className="flex items-center gap-2 p-3 bg-white border border-indigo-200 rounded-xl shadow-xs cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={organicMode}
                  onChange={(e) => setOrganicMode(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 w-4 h-4"
                />
                <div className="text-left">
                  <div className="text-xs font-bold text-slate-900">
                    Organic Mode: {organicMode ? 'Active' : 'Disabled'}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Cycle alternates for repeating letters
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Interactive Side-by-Side Comparison Arena */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Box 1: Standard Static Repetition */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs">
                    ✕
                  </div>
                  <span className="text-xs font-bold text-slate-700 font-['Plus_Jakarta_Sans']">
                    Standard Digital Repeat (Identical)
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">Clone Glyphs</span>
              </div>

              <div
                style={{
                  backgroundColor: activePaper.bg,
                  backgroundImage: activePaper.lineStyle,
                  borderColor: activePaper.border,
                  color: activeInk.color,
                  fontFamily: `"${fontFamilyName}", "Caveat", cursive, sans-serif`,
                }}
                className="p-6 rounded-xl border min-h-[140px] flex items-center justify-center text-center text-3xl select-none"
              >
                coffee seeds & sweet letter
              </div>
              <p className="text-[11px] text-slate-500">
                Notice how every single 'e', 'f', and 't' has identical stroke contours, giving away digital repetition.
              </p>
            </div>

            {/* Box 2: Organic Handwriting Mode */}
            <div className="bg-indigo-50/50 border border-indigo-200 rounded-2xl p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-indigo-100">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                    ✓
                  </div>
                  <span className="text-xs font-bold text-indigo-950 font-['Plus_Jakarta_Sans']">
                    Organic Alternates Mode (Human Feel)
                  </span>
                </div>
                <span className="text-[10px] font-mono text-indigo-700 font-bold">Dynamic Cycling</span>
              </div>

              <div
                style={{
                  backgroundColor: activePaper.bg,
                  backgroundImage: activePaper.lineStyle,
                  borderColor: activePaper.border,
                  color: activeInk.color,
                  fontFamily: `"${fontFamilyName}", "Caveat", cursive, sans-serif`,
                }}
                className="p-6 rounded-xl border border-indigo-200 min-h-[140px] flex items-center justify-center text-center text-3xl select-none flex-wrap gap-x-1"
              >
                {samplePhraseUnits.map((u, i) => (
                  <span
                    key={i}
                    className={`inline-block transition-colors relative ${
                      u.isAlternate ? 'text-indigo-600 font-semibold' : ''
                    }`}
                    title={
                      u.isAlternate
                        ? `'${u.char}' dynamically swapped to alternate: ${u.variantName}`
                        : `'${u.char}' standard form`
                    }
                  >
                    {u.char === ' ' ? '\u00A0' : u.char}
                    {u.isAlternate && (
                      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-indigo-500" />
                    )}
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-indigo-900 font-medium flex items-center justify-between">
                <span>
                  Repeating letters naturally vary with subtle micro-differences in loop width, terminal flourish, and baseline slant.
                </span>
                <span className="text-[10px] font-mono text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded shrink-0">
                  Indigo dots = Alternates active
                </span>
              </p>
            </div>
          </div>

          {/* Quick Contextual Alternate Generator Banner */}
          <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 border border-indigo-200 rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Sparkles className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 font-['Plus_Jakarta_Sans'] uppercase tracking-wider flex items-center gap-2">
                  <span>Automated Contextual Alternate Generator</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-bold">
                    One-Click Humanizer
                  </span>
                </h4>
                <p className="text-xs text-slate-600">
                  Automatically create subtly randomized variations of your glyphs based on your base handwriting to prevent identical robotic letters.
                </p>
                {generationNotice && (
                  <p className="text-xs text-emerald-700 font-bold mt-1">
                    ✓ {generationNotice}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <button
                type="button"
                onClick={handleQuickGenerateFrequent}
                disabled={!onUpdateAllGlyphs}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold transition-colors shadow-2xs"
                title="Generate 2 contextual variants for frequent repeating letters (e, t, a, o, l, s, r, n...)"
              >
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>Quick-Generate Frequent Letters</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setTargetModalChar('e');
                  setIsContextualModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5 text-white" />
                <span>Custom Generator Options</span>
              </button>
            </div>
          </div>

          {/* Characters with Defined Alternates Gallery */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 flex-wrap gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
                  Your Font’s Alternate Variants Catalog
                </h3>
                <p className="text-xs text-slate-500">
                  {glyphsWithVariants.length} character{glyphsWithVariants.length === 1 ? '' : 's'} have alternate variations drawn.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setTargetModalChar('e');
                    setIsContextualModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors shadow-2xs"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Auto-Generate Alternates</span>
                </button>

                {onSelectCharForStudio && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <span className="font-medium">Draw variants for:</span>
                    {['e', 'o', 's', 'l', 't', 'a', 'r', 'n'].map((c) => (
                      <button
                        key={c}
                        onClick={() => onSelectCharForStudio(c)}
                        className="w-6 h-6 rounded bg-slate-100 hover:bg-indigo-100 hover:text-indigo-800 font-mono text-xs font-bold transition-colors"
                        title={`Open '${c}' in Glyph Studio to draw an alternate`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {glyphsWithVariants.length === 0 ? (
              <div className="text-center py-12 px-4 border-2 border-dashed border-slate-200 rounded-xl space-y-3">
                <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center">
                  <Split className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">No Alternate Variants Created Yet</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Open any character (like lowercase <strong>'e'</strong> or <strong>'o'</strong>) in the Glyph Studio, and click <strong>"+ Add Alternate"</strong> above the canvas to draw a 2nd variant!
                </p>
                <div className="flex items-center justify-center gap-2 flex-wrap pt-1">
                  <button
                    onClick={handleQuickGenerateFrequent}
                    disabled={!onUpdateAllGlyphs}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Auto-Generate for Frequent Letters (e, t, a, o, l...)</span>
                  </button>
                  <button
                    onClick={() => {
                      setTargetModalChar('e');
                      setIsContextualModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium transition-colors"
                  >
                    <span>Custom Generator Options</span>
                  </button>
                  {onSelectCharForStudio && (
                    <button
                      onClick={() => onSelectCharForStudio('e')}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-all shadow-sm"
                    >
                      <span>Draw Manually in Studio</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {glyphsWithVariants.map((glyph) => (
                  <div
                    key={glyph.char}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white transition-all space-y-3"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-slate-900 text-white font-bold flex items-center justify-center text-sm font-['Plus_Jakarta_Sans']">
                          {glyph.char}
                        </span>
                        <div>
                          <span className="text-xs font-bold text-slate-800 block">
                            Character '{glyph.char}'
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {(glyph.variants?.length || 0) + 1} variations total
                          </span>
                        </div>
                      </div>

                      {onSelectCharForStudio && (
                        <button
                          onClick={() => onSelectCharForStudio(glyph.char)}
                          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1"
                        >
                          <span>Edit</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {/* Variations Grid */}
                    <div className="grid grid-cols-3 gap-2">
                      {/* Standard */}
                      <div className="bg-[#faf9f5] border border-slate-200 rounded-lg p-2 text-center">
                        <div className="aspect-square flex items-center justify-center">
                          <svg viewBox="0 0 800 800" className="w-full h-full">
                            <path
                              d={strokesToSvgPath(
                                glyph.rotation
                                  ? rotateGlyphStrokes(glyph.strokes, glyph.rotation)
                                  : glyph.strokes
                              )}
                              fill="none"
                              stroke="#0f172a"
                              strokeWidth={18}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </div>
                        <span className="text-[9px] font-bold text-slate-700 block truncate mt-1">
                          ★ Standard {glyph.rotation ? `(${glyph.rotation > 0 ? `+${glyph.rotation}` : glyph.rotation}°)` : ''}
                        </span>
                      </div>

                      {/* Alternate Variants */}
                      {glyph.variants?.map((v, vIdx) => (
                        <div
                          key={v.id}
                          className="bg-[#faf9f5] border border-indigo-200 rounded-lg p-2 text-center"
                        >
                          <div className="aspect-square flex items-center justify-center">
                            {v.strokes && v.strokes.length > 0 ? (
                              <svg viewBox="0 0 800 800" className="w-full h-full">
                                <path
                                  d={strokesToSvgPath(
                                    v.rotation
                                      ? rotateGlyphStrokes(v.strokes, v.rotation)
                                      : v.strokes
                                  )}
                                  fill="none"
                                  stroke="#4338ca"
                                  strokeWidth={18}
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            ) : (
                              <span className="text-xs text-slate-300">Empty</span>
                            )}
                          </div>
                          <span className="text-[9px] font-bold text-indigo-800 block truncate mt-1">
                            {v.name || `Var ${vIdx + 2}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Contextual Alternates Generator Modal */}
      <ContextualAlternatesModal
        isOpen={isContextualModalOpen}
        onClose={() => setIsContextualModalOpen(false)}
        currentChar={targetModalChar}
        glyphs={glyphs}
        onApplyVariants={handleApplyContextualVariants}
        baseWidth={penSettings?.baseWidth ?? 14}
        tool={penSettings?.tool ?? 'rollerball'}
        pressureSensitivity={penSettings?.pressureSensitivity ?? true}
        fontFamilyName={fontFamilyName}
      />

      {/* Full-Screen Distraction-Free Focus Mode Overlay */}
      {isFocusMode && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-200">
          {/* Top Floating Control Bar */}
          <div className="bg-white/95 backdrop-blur-sm border-b border-slate-200/80 px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3 shadow-sm shrink-0 flex-wrap">
            {/* Left: Focus Mode Badge & Text Contrast Selectors */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-900 rounded-lg text-xs font-bold shadow-2xs">
                <Focus className="w-3.5 h-3.5 text-indigo-600" />
                <span>Focus Mode</span>
              </div>

              {/* Text Contrast Mode Selector */}
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs">
                <button
                  type="button"
                  onClick={() => setFocusContrastMode('black')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                    focusContrastMode === 'black'
                      ? 'bg-black text-white shadow-xs'
                      : 'text-slate-600 hover:text-black'
                  }`}
                  title="Make text pure solid black (#000000) for highest contrast"
                >
                  <span>Solid Black Text</span>
                  {focusContrastMode === 'black' && <Check className="w-3 h-3" />}
                </button>
                <button
                  type="button"
                  onClick={() => setFocusContrastMode('contrast')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                    focusContrastMode === 'contrast'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Auto Contrast Color: Pure Black on light paper, Pure White on dark paper"
                >
                  <Contrast className="w-3.5 h-3.5" />
                  <span>Auto Contrast</span>
                  {focusContrastMode === 'contrast' && <Check className="w-3 h-3" />}
                </button>
                <button
                  type="button"
                  onClick={() => setFocusContrastMode('ink')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                    focusContrastMode === 'ink'
                      ? 'bg-white text-slate-900 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Use fountain ink swatch color"
                >
                  <span>Fountain Ink</span>
                </button>
              </div>

              {/* Paper Selector Chips in Focus Mode */}
              <div className="hidden md:flex items-center gap-1">
                {PAPER_THEMES.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setActivePaper(p)}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-colors ${
                      activePaper.id === p.id
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Right: Typography sliders & Exit Button */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 text-xs">
                <span className="text-slate-500 font-mono">Size: {fontSize}px</span>
                <input
                  type="range"
                  min="20"
                  max="72"
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="w-20 accent-slate-900"
                />
              </div>

              <div className="text-xs font-mono text-slate-500 hidden sm:block">
                {typedText.split(/\s+/).filter(Boolean).length} words · {typedText.length} chars
              </div>

              <button
                onClick={() => setIsFocusMode(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-all shadow-sm active:scale-[0.98]"
                title="Exit Focus Mode (Esc)"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                <span>Exit Focus [Esc]</span>
              </button>
            </div>
          </div>

          {/* Fullscreen Writing Canvas */}
          <div
            className="flex-1 overflow-y-auto p-4 sm:p-8 lg:p-12 flex justify-center items-start transition-all"
            style={{ backgroundColor: activePaper.id === 'blueprint' ? '#0b1120' : '#f1f5f9' }}
          >
            <div
              style={{
                backgroundColor: activePaper.bg,
                backgroundImage: activePaper.lineStyle,
                backgroundSize: activePaper.id === 'dotgrid' ? '28px 28px' : 'auto 48px',
                borderColor: activePaper.border,
                color: editorTextColor,
              }}
              className="w-full max-w-4xl min-h-[82vh] rounded-2xl border shadow-2xl p-8 sm:p-12 lg:p-16 flex flex-col justify-between relative transition-all"
            >
              <textarea
                value={typedText}
                onChange={(e) => setTypedText(e.target.value)}
                autoFocus
                style={{
                  fontFamily: `"${fontFamilyName}", "Caveat", cursive, sans-serif`,
                  fontSize: `${fontSize}px`,
                  lineHeight: lineHeight,
                  letterSpacing: `${letterSpacing}px`,
                  color: editorTextColor,
                }}
                placeholder="Type freely in focus mode with high-contrast text..."
                className="w-full flex-1 min-h-[68vh] bg-transparent outline-none border-none resize-none font-normal"
              />

              {/* Bottom Subtle Status in Focus Mode */}
              <div className="pt-4 border-t border-black/5 flex items-center justify-between text-xs font-mono opacity-50 select-none">
                <span className="flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                  Text mode: {focusContrastMode === 'black' ? 'Solid Black (#000000)' : focusContrastMode === 'contrast' ? 'High-Contrast Auto' : activeInk.name}
                </span>
                <span>Press Esc to exit focus mode</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
