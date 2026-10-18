import React, { useState } from 'react';
import {
  FileText,
  Sliders,
  Type,
  Maximize2,
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
} from 'lucide-react';
import { FontMetadata, GlyphData } from '../types/font';
import { strokesToSvgPath } from '../utils/fontEngine';
import { RealWorldSpecimens } from './RealWorldSpecimens';

interface SpecimenTesterProps {
  fontFamilyName: string;
  metadata: FontMetadata;
  glyphs: Record<string, GlyphData>;
  onExportClick: () => void;
  onSelectCharForStudio?: (char: string) => void;
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

  const completedGlyphs = Object.keys(glyphs).filter((c) => glyphs[c]?.strokes?.length > 0);

  // Characters with alternate variants
  const glyphsWithVariants = Object.values(glyphs).filter(
    (g) => g.variants && g.variants.length > 0
  );

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
          {/* Paper & Ink Swatches */}
          <div className="flex items-center gap-5">
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
                    onClick={() => setActiveInk(ink)}
                    style={{ backgroundColor: ink.color }}
                    className={`w-5 h-5 rounded-full border-2 transition-transform ${
                      activeInk.name === ink.name
                        ? 'border-slate-900 scale-110 shadow-sm'
                        : 'border-transparent hover:scale-105'
                    }`}
                    title={ink.name}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Font Size & Spacing Sliders */}
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-mono">Size: {fontSize}px</span>
              <input
                type="range"
                min="16"
                max="72"
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="w-24 accent-slate-900"
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
                className="w-20 accent-slate-900"
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
            color: activePaper.textColor || activeInk.color,
          }}
          className="rounded-2xl border shadow-xl p-8 lg:p-12 min-h-[460px] relative transition-all"
        >
          {/* Editable live handwriting canvas area */}
          <textarea
            value={typedText}
            onChange={(e) => setTypedText(e.target.value)}
            style={{
              fontFamily: `"${fontFamilyName}", "Caveat", cursive, sans-serif`,
              fontSize: `${fontSize}px`,
              lineHeight: lineHeight,
              letterSpacing: `${letterSpacing}px`,
              color: activePaper.textColor || activeInk.color,
            }}
            placeholder="Click anywhere and type with your custom handwriting font..."
            className="w-full h-full min-h-[380px] bg-transparent outline-none border-none resize-none overflow-y-auto"
          />

          <div className="absolute bottom-4 right-4 text-[11px] font-mono opacity-50 select-none">
            {typedText.length} characters · {fontFamilyName}
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
                className="p-6 rounded-xl border border-indigo-200 min-h-[140px] flex items-center justify-center text-center text-3xl select-none"
              >
                coffee seeds & sweet letter
              </div>
              <p className="text-[11px] text-indigo-900 font-medium">
                Repeating letters naturally vary with subtle micro-differences in loop width, terminal flourish, and baseline slant.
              </p>
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

            {glyphsWithVariants.length === 0 ? (
              <div className="text-center py-12 px-4 border-2 border-dashed border-slate-200 rounded-xl space-y-3">
                <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center">
                  <Split className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">No Alternate Variants Created Yet</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Open any character (like lowercase <strong>'e'</strong> or <strong>'o'</strong>) in the Glyph Studio, and click <strong>"+ Add Alternate"</strong> above the canvas to draw a 2nd variant!
                </p>
                {onSelectCharForStudio && (
                  <button
                    onClick={() => onSelectCharForStudio('e')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-all shadow-sm"
                  >
                    <span>Create Alternate for 'e' in Studio</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
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
                              d={strokesToSvgPath(glyph.strokes)}
                              fill="none"
                              stroke="#0f172a"
                              strokeWidth={18}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </div>
                        <span className="text-[9px] font-bold text-slate-700 block truncate mt-1">
                          ★ Standard
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
                                  d={strokesToSvgPath(v.strokes)}
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
    </div>
  );
};
