import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Download,
  X,
  Check,
  Copy,
  Laptop,
  Eye,
  Sliders,
  Type,
  RotateCcw,
  RefreshCw,
  Sparkles,
  Layers,
  Split,
  MoveHorizontal,
  CheckCircle2,
  AlertCircle,
  EyeOff,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { FontMetadata, GlyphData, KerningMap, LigatureData } from '../types/font';
import { buildOpenTypeFont, registerLiveFontFace } from '../utils/fontEngine';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  metadata: FontMetadata;
  setMetadata: React.Dispatch<React.SetStateAction<FontMetadata>>;
  glyphs: Record<string, GlyphData>;
  baseWidth: number;
  tool: 'fountain' | 'drafting' | 'rollerball' | 'calligraphy';
  kerningMap?: KerningMap;
  ligaturesMap?: Record<string, LigatureData>;
  pressureSensitivity?: boolean;
  nibAngle?: number;
  onOpenOfflineExport?: () => void;
}

const INK_PRESETS = [
  { name: 'Carbon Black', color: '#0f172a' },
  { name: 'Royal Cerulean', color: '#0284c7' },
  { name: 'Vintage Oxblood', color: '#881337' },
  { name: 'Forest Emerald', color: '#065f46' },
  { name: 'Deep Indigo', color: '#4338ca' },
];

const PAPER_PRESETS = [
  {
    id: 'ivory',
    name: 'Archival Ivory',
    bg: '#faf9f5',
    border: 'border-amber-200/70',
    style: {},
  },
  {
    id: 'white',
    name: 'Crisp White',
    bg: '#ffffff',
    border: 'border-slate-200',
    style: {},
  },
  {
    id: 'lined',
    name: 'Ruled Notebook',
    bg: '#faf9f5',
    border: 'border-blue-200/80',
    style: {
      backgroundImage: 'repeating-linear-gradient(transparent, transparent 35px, #e2e8f0 36px)',
      backgroundAttachment: 'local',
    },
  },
  {
    id: 'dark',
    name: 'Slate Darkroom',
    bg: '#0f172a',
    border: 'border-slate-700',
    style: {},
    defaultInk: '#f8fafc',
  },
];

const DEFAULT_SAMPLE_TEXT =
  'The quick brown fox jumps over the lazy dog. Wait for the little butterfly in the starlight.';

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  metadata,
  setMetadata,
  glyphs,
  baseWidth,
  tool,
  kerningMap = {},
  ligaturesMap = {},
  pressureSensitivity = true,
  nibAngle = 45,
  onOpenOfflineExport,
}) => {
  const [copiedCss, setCopiedCss] = useState(false);
  const [activeTab, setActiveTab] = useState<'mac' | 'win' | 'ios' | 'web'>('mac');
  const [isExporting, setIsExporting] = useState(false);

  // Live Font Preview State
  const [previewFontFamily, setPreviewFontFamily] = useState<string | null>(null);
  const [isCompilingFont, setIsCompilingFont] = useState(false);
  const [compileError, setCompileError] = useState<string | null>(null);
  const [sampleText, setSampleText] = useState(DEFAULT_SAMPLE_TEXT);
  const [fontSize, setFontSize] = useState<number>(32);
  const [enableLigatures, setEnableLigatures] = useState<boolean>(true);
  const [enableKerning, setEnableKerning] = useState<boolean>(true);
  const [letterSpacing, setLetterSpacing] = useState<number>(0);
  const [paperTheme, setPaperTheme] = useState<'ivory' | 'white' | 'lined' | 'dark'>('ivory');
  const [inkColor, setInkColor] = useState<string>('#0f172a');
  const [activePreset, setActivePreset] = useState<'sample' | 'ligatures' | 'kerning' | 'pangram' | 'alphabet'>('sample');

  const registeredFontFamilyRef = useRef<string | null>(null);

  const validGlyphsCount = useMemo(
    () => Object.values(glyphs).filter((g) => g.strokes && g.strokes.length > 0).length,
    [glyphs]
  );

  const activeKernPairs = useMemo(
    () => Object.entries(kerningMap).filter(([_, v]) => v !== 0),
    [kerningMap]
  );

  const activeLigaturesList = useMemo(
    () => Object.values(ligaturesMap).filter((l) => l.strokes && l.strokes.length > 0),
    [ligaturesMap]
  );

  // Compile and register the font dynamically in the browser runtime
  const compileLiveFont = () => {
    if (!isOpen) return;
    setIsCompilingFont(true);
    setCompileError(null);

    try {
      const font = buildOpenTypeFont(
        metadata,
        glyphs,
        tool,
        baseWidth,
        kerningMap,
        ligaturesMap,
        pressureSensitivity,
        nibAngle
      );

      const uniqueFamilyName = `ScriptCraft_Preview_${Date.now()}`;
      registerLiveFontFace(font, uniqueFamilyName)
        .then((registeredName) => {
          registeredFontFamilyRef.current = registeredName;
          setPreviewFontFamily(registeredName);
          setIsCompilingFont(false);
        })
        .catch((err) => {
          console.error('Failed to register FontFace:', err);
          setCompileError(err instanceof Error ? err.message : String(err));
          setIsCompilingFont(false);
        });
    } catch (err) {
      console.error('Failed to compile preview font:', err);
      setCompileError(err instanceof Error ? err.message : String(err));
      setIsCompilingFont(false);
    }
  };

  // Compile on modal open and when core font properties change
  useEffect(() => {
    if (isOpen) {
      compileLiveFont();
    }
  }, [
    isOpen,
    metadata.familyName,
    metadata.styleName,
    metadata.unitsPerEm,
    metadata.ascender,
    metadata.descender,
    glyphs,
    baseWidth,
    tool,
    kerningMap,
    ligaturesMap,
    pressureSensitivity,
    nibAngle,
  ]);

  if (!isOpen) return null;

  // Handler for presets
  const handleSelectPreset = (preset: 'sample' | 'ligatures' | 'kerning' | 'pangram' | 'alphabet') => {
    setActivePreset(preset);
    if (preset === 'sample') {
      setSampleText(DEFAULT_SAMPLE_TEXT);
    } else if (preset === 'ligatures') {
      const customLigs = activeLigaturesList.map((l) => l.sequence).join(' ');
      const baseLigText = 'The little butterfly drifts through soft starlight. Crafting fine office typography.';
      setSampleText(customLigs ? `${baseLigText}\nActive ligatures: ${customLigs}` : baseLigText);
      setEnableLigatures(true);
    } else if (preset === 'kerning') {
      const customPairs = activeKernPairs.map(([pair]) => pair).join(' ');
      const standardPairs = 'AV AW WA To Ta Te Ty Vo Va Yo LT FA PA';
      setSampleText(customPairs ? `${customPairs}\nWAR VOTE AWAY WATER YACHT` : `${standardPairs}\nWAR VOTE AWAY WATER YACHT`);
      setEnableKerning(true);
    } else if (preset === 'pangram') {
      setSampleText('Sphinx of black quartz, judge my vow. The quick brown fox jumps over the lazy dog.');
    } else if (preset === 'alphabet') {
      setSampleText(
        'ABCDEFGHIJKLMNOPQRSTUVWXYZ\nabcdefghijklmnopqrstuvwxyz\n0123456789\n.,;:!?()-\'"&'
      );
    }
  };

  // Insert a specific token into sample text
  const handleInsertToken = (token: string) => {
    setSampleText((prev) => (prev ? `${prev} ${token}` : token));
  };

  // Detect which active ligatures or kerning pairs are present in the text
  const detectedLigatures = activeLigaturesList.filter((lig) =>
    sampleText.includes(lig.sequence)
  );

  const detectedKerningPairs = activeKernPairs.filter(([pair]) =>
    sampleText.includes(pair)
  );

  const handleDownloadTTF = () => {
    setIsExporting(true);
    try {
      const font = buildOpenTypeFont(
        metadata,
        glyphs,
        tool,
        baseWidth,
        kerningMap,
        ligaturesMap,
        pressureSensitivity,
        nibAngle
      );
      const safeFilename = `${(metadata.familyName || 'MyHandwriting').replace(/\s+/g, '_')}.ttf`;
      font.download(safeFilename);

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#0284c7', '#d97706', '#10b981', '#1e293b'],
      });
    } catch (err) {
      console.error('Failed to export TTF:', err);
      alert('Error building font: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsExporting(false);
    }
  };

  const cssSnippet = `@font-face {
  font-family: '${metadata.familyName || 'MyHandwriting'}';
  src: url('${(metadata.familyName || 'MyHandwriting').replace(/\s+/g, '_')}.ttf') format('truetype');
  font-weight: normal;
  font-style: normal;
}

/* Apply to your website elements */
.handwritten {
  font-family: '${metadata.familyName || 'MyHandwriting'}', cursive, sans-serif;
  font-feature-settings: "liga" 1, "calt" 1, "kern" 1;
  font-kerning: normal;
}`;

  const handleCopyCss = () => {
    navigator.clipboard.writeText(cssSnippet);
    setCopiedCss(true);
    setTimeout(() => setCopiedCss(false), 2000);
  };

  const activePaper = PAPER_PRESETS.find((p) => p.id === paperTheme) || PAPER_PRESETS[0];
  const effectiveInkColor = paperTheme === 'dark' && inkColor === '#0f172a' ? '#f8fafc' : inkColor;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-4xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <Download className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
                  Export & Verify Typeface
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  OpenType TTF
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono">
                {metadata.familyName || 'MyHandwriting'} · {validGlyphsCount} Glyphs · {activeLigaturesList.length} Ligatures · {activeKernPairs.length} Kerning Pairs
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
            title="Close [Esc]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Metadata Section */}
          <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4">
            <h3 className="text-xs font-semibold text-slate-900 uppercase font-mono tracking-wider mb-3 flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5 text-slate-600" />
              <span>Font Identity & Metadata</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  Font Family Name
                </label>
                <input
                  type="text"
                  value={metadata.familyName}
                  onChange={(e) =>
                    setMetadata((prev) => ({ ...prev, familyName: e.target.value }))
                  }
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-semibold text-slate-900 shadow-2xs"
                  placeholder="e.g. Sarah Script"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  Style
                </label>
                <input
                  type="text"
                  value={metadata.styleName}
                  onChange={(e) =>
                    setMetadata((prev) => ({ ...prev, styleName: e.target.value }))
                  }
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 text-slate-700 shadow-2xs"
                  placeholder="Regular"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  Designer / Author
                </label>
                <input
                  type="text"
                  value={metadata.designer}
                  onChange={(e) =>
                    setMetadata((prev) => ({ ...prev, designer: e.target.value }))
                  }
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 text-slate-700 shadow-2xs"
                  placeholder="Your Name"
                />
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* FONT PREVIEW & TYPOGRAPHIC VERIFICATION SECTION */}
          {/* ========================================================================= */}
          <div className="border border-indigo-200/80 rounded-2xl p-4 sm:p-5 bg-gradient-to-b from-indigo-50/40 via-white to-slate-50/50 shadow-xs space-y-4">
            {/* Header with Title and Verification Badges */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-2xs">
                  <Eye className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-indigo-950 font-['Plus_Jakarta_Sans']">
                      Live Font Preview & Typographic Verification
                    </h3>
                    {isCompilingFont ? (
                      <span className="flex items-center gap-1 text-[11px] text-amber-600 font-mono animate-pulse">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        Compiling TTF...
                      </span>
                    ) : compileError ? (
                      <span className="flex items-center gap-1 text-[11px] text-rose-600 font-mono">
                        <AlertCircle className="w-3 h-3" />
                        Compilation Notice
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[11px] text-emerald-700 font-mono font-medium">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        OpenType Engine Ready
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Verify that custom ligatures merge seamlessly and kerning pairs balance letter spacing before downloading.
                  </p>
                </div>
              </div>

              {/* Re-compile button */}
              <button
                onClick={compileLiveFont}
                disabled={isCompilingFont}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-white hover:bg-indigo-50 border border-indigo-200 rounded-lg shadow-2xs transition-all active:scale-95 disabled:opacity-50"
                title="Re-compile font binary to refresh preview"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCompilingFont ? 'animate-spin' : ''}`} />
                <span>Refresh Font</span>
              </button>
            </div>

            {/* Quick Test Presets Row */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-mono text-slate-500 font-medium mr-1">
                Test Presets:
              </span>
              <button
                onClick={() => handleSelectPreset('ligatures')}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all ${
                  activePreset === 'ligatures'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                    : 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50'
                }`}
                title="Load sample phrase designed to test ligature connections (th, fi, fl, st, etc.)"
              >
                <Split className="w-3 h-3" />
                <span>Ligatures Check ({activeLigaturesList.length})</span>
              </button>

              <button
                onClick={() => handleSelectPreset('kerning')}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all ${
                  activePreset === 'kerning'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                    : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-50'
                }`}
                title="Load letter pairs designed to test kerning balance (AV, To, Ta, We, Yo, etc.)"
              >
                <MoveHorizontal className="w-3 h-3" />
                <span>Kerning Check ({activeKernPairs.length})</span>
              </button>

              <button
                onClick={() => handleSelectPreset('pangram')}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-all ${
                  activePreset === 'pangram'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
                title="Classic Sphinx pangram with all 26 English letters"
              >
                Full Pangram
              </button>

              <button
                onClick={() => handleSelectPreset('alphabet')}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-all ${
                  activePreset === 'alphabet'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
                title="All uppercase, lowercase, numbers, and punctuation"
              >
                Alphabet & Numbers
              </button>

              <button
                onClick={() => handleSelectPreset('sample')}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-all ${
                  activePreset === 'sample'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
                title="Default mixed sentence"
              >
                Default
              </button>
            </div>

            {/* Verification Controls Toolbar */}
            <div className="flex items-center justify-between gap-3 p-2.5 bg-slate-100/90 rounded-xl border border-slate-200 text-xs flex-wrap">
              {/* Left: Ligatures & Kerning Toggles for Before-and-After Comparison */}
              <div className="flex items-center gap-2">
                {/* Ligatures Toggle */}
                <button
                  onClick={() => setEnableLigatures((prev) => !prev)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold border transition-all shadow-2xs ${
                    enableLigatures
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-slate-500 border-slate-300 hover:bg-slate-50'
                  }`}
                  title="Toggle OpenType GSUB Ligatures ('liga'). Turn OFF to inspect individual unjoined letterforms."
                >
                  <Split className="w-3.5 h-3.5" />
                  <span>Ligatures (liga): {enableLigatures ? 'ON' : 'OFF'}</span>
                </button>

                {/* Kerning Toggle */}
                <button
                  onClick={() => setEnableKerning((prev) => !prev)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold border transition-all shadow-2xs ${
                    enableKerning
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-500 border-slate-300 hover:bg-slate-50'
                  }`}
                  title="Toggle OpenType GPOS Kerning ('kern'). Turn OFF to inspect unadjusted natural character widths."
                >
                  <MoveHorizontal className="w-3.5 h-3.5" />
                  <span>Kerning (kern): {enableKerning ? 'ON' : 'OFF'}</span>
                </button>
              </div>

              {/* Right: Size Slider & Paper Backgrounds */}
              <div className="flex items-center gap-3 flex-wrap">
                {/* Size Slider */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-mono text-slate-600">Size: {fontSize}px</span>
                  <input
                    type="range"
                    min="18"
                    max="64"
                    step="2"
                    value={fontSize}
                    onChange={(e) => setFontSize(parseInt(e.target.value))}
                    className="w-18 accent-indigo-600 cursor-pointer"
                  />
                </div>

                {/* Tracking / Letter Spacing */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-mono text-slate-600">Tracking</span>
                  <input
                    type="range"
                    min="-4"
                    max="10"
                    step="1"
                    value={letterSpacing}
                    onChange={(e) => setLetterSpacing(parseInt(e.target.value))}
                    className="w-14 accent-indigo-600 cursor-pointer"
                    title="Letter Spacing Offset"
                  />
                  <span className="text-[10px] font-mono text-slate-500 w-5">
                    {letterSpacing > 0 ? `+${letterSpacing}` : letterSpacing}px
                  </span>
                </div>

                {/* Paper Theme Pills */}
                <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200">
                  {PAPER_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setPaperTheme(p.id as any)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-all ${
                        paperTheme === p.id
                          ? 'bg-slate-900 text-white shadow-2xs font-semibold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                      title={p.name}
                    >
                      {p.name.split(' ')[0]}
                    </button>
                  ))}
                </div>

                {/* Ink Color Selector */}
                <div className="flex items-center gap-1">
                  {INK_PRESETS.map((ink) => (
                    <button
                      key={ink.color}
                      onClick={() => setInkColor(ink.color)}
                      style={{ backgroundColor: ink.color }}
                      className={`w-4 h-4 rounded-full border transition-all ${
                        inkColor === ink.color
                          ? 'ring-2 ring-indigo-500 ring-offset-1 scale-110 border-white'
                          : 'border-slate-300 opacity-80 hover:opacity-100'
                      }`}
                      title={ink.name}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Quick-Insert Ligature & Kerning Chips */}
            {(activeLigaturesList.length > 0 || activeKernPairs.length > 0) && (
              <div className="p-2.5 bg-indigo-50/50 rounded-xl border border-indigo-100 text-xs space-y-1.5">
                {activeLigaturesList.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-semibold text-indigo-900 uppercase font-mono tracking-wider">
                      Active Ligatures ({activeLigaturesList.length}):
                    </span>
                    {activeLigaturesList.map((lig) => {
                      const isPresent = sampleText.includes(lig.sequence);
                      return (
                        <button
                          key={lig.id}
                          onClick={() => handleInsertToken(lig.sequence)}
                          className={`px-2 py-0.5 rounded-md text-[11px] font-mono transition-all border ${
                            isPresent
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold shadow-2xs'
                              : 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                          }`}
                          title={`Insert '${lig.sequence}' into sample text to verify ligature`}
                        >
                          {lig.sequence} {isPresent ? '✓' : '+'}
                        </button>
                      );
                    })}
                  </div>
                )}

                {activeKernPairs.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-semibold text-blue-900 uppercase font-mono tracking-wider">
                      Active Kerning ({activeKernPairs.length}):
                    </span>
                    {activeKernPairs.slice(0, 8).map(([pair, val]) => {
                      const isPresent = sampleText.includes(pair);
                      return (
                        <button
                          key={pair}
                          onClick={() => handleInsertToken(pair)}
                          className={`px-2 py-0.5 rounded-md text-[11px] font-mono transition-all border ${
                            isPresent
                              ? 'bg-blue-100 text-blue-800 border-blue-300 font-bold shadow-2xs'
                              : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-100'
                          }`}
                          title={`Insert pair '${pair}' (kerning: ${val} units)`}
                        >
                          {pair} ({val > 0 ? `+${val}` : val}) {isPresent ? '✓' : '+'}
                        </button>
                      );
                    })}
                    {activeKernPairs.length > 8 && (
                      <span className="text-[10px] text-slate-500 font-mono">
                        +{activeKernPairs.length - 8} more
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Live Interactive Specimen Display Canvas / Textarea */}
            <div
              className={`relative rounded-xl border-2 ${activePaper.border} p-5 transition-all shadow-inner overflow-hidden min-h-[160px]`}
              style={{
                backgroundColor: activePaper.bg,
                ...activePaper.style,
              }}
            >
              {/* Status Header inside preview paper */}
              <div className="flex items-center justify-between text-[10px] font-mono pb-3 border-b border-slate-300/40 mb-3 select-none">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800">
                    {metadata.familyName || 'MyHandwriting'}
                  </span>
                  <span className="text-slate-400">·</span>
                  <span className="text-slate-500">{metadata.styleName || 'Regular'}</span>
                  <span className="text-slate-400">·</span>
                  <span className="text-slate-500 font-mono">{fontSize}px</span>
                </div>

                <div className="flex items-center gap-2">
                  {detectedLigatures.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold">
                      {detectedLigatures.length} Ligatures Verified
                    </span>
                  )}
                  {detectedKerningPairs.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-300 font-semibold">
                      {detectedKerningPairs.length} Kerning Pairs Active
                    </span>
                  )}
                  {!enableLigatures && (
                    <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                      Ligatures Disabled (Comparison Mode)
                    </span>
                  )}
                  {!enableKerning && (
                    <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                      Kerning Disabled (Natural Spacing)
                    </span>
                  )}
                </div>
              </div>

              {/* Editable Sample Text Block */}
              <textarea
                value={sampleText}
                onChange={(e) => {
                  setSampleText(e.target.value);
                  setActivePreset('sample');
                }}
                rows={4}
                placeholder="Type anything to test ligatures, kerning, and letterforms..."
                style={{
                  fontFamily: previewFontFamily
                    ? `"${previewFontFamily}", cursive, sans-serif`
                    : 'cursive, sans-serif',
                  fontSize: `${fontSize}px`,
                  color: effectiveInkColor,
                  fontFeatureSettings: `${enableLigatures ? '"liga" 1, "calt" 1' : '"liga" 0, "calt" 0'}, ${
                    enableKerning ? '"kern" 1' : '"kern" 0'
                  }`,
                  fontKerning: enableKerning ? 'normal' : 'none',
                  letterSpacing: `${letterSpacing}px`,
                  lineHeight: 1.45,
                }}
                className="w-full bg-transparent resize-y outline-none border-none p-0 focus:ring-0 leading-relaxed transition-all placeholder:text-slate-400/60"
              />

              {/* Informative bottom footer inside paper */}
              <div className="mt-4 pt-2 border-t border-slate-300/30 flex items-center justify-between text-[10px] text-slate-500 font-mono select-none">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  Direct browser OpenType engine rendering
                </span>
                <span>Click text to edit or type custom words</span>
              </div>
            </div>
          </div>

          {/* Primary Action Button */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <button
              onClick={handleDownloadTTF}
              disabled={isExporting}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-semibold transition-all shadow-md active:scale-[0.99] disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Download TrueType Font (.TTF)</span>
            </button>
            <p className="text-[11px] text-center text-slate-500">
              Compatible with Microsoft Word, Apple Pages, Adobe Creative Cloud, Canva, Figma, and all standard typography applications.
            </p>
          </div>

          {/* Export WebApp Offline Option */}
          {onOpenOfflineExport && (
            <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-700 flex items-center justify-center shrink-0">
                  <Laptop className="w-4 h-4 text-emerald-700" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Want to run ScriptCraft completely offline?</h4>
                  <p className="text-[11px] text-slate-600">Export standalone single-file HTML or portable offline ZIP package.</p>
                </div>
              </div>
              <button
                onClick={() => {
                  onClose();
                  onOpenOfflineExport();
                }}
                className="shrink-0 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-2xs transition-all active:scale-[0.98]"
              >
                Export WebApp Offline
              </button>
            </div>
          )}

          {/* Step-by-Step Installation Guides */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-900 uppercase font-mono tracking-wider">
                How to Install & Use
              </h3>

              {/* Platform Selector Tabs */}
              <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-md">
                {(
                  [
                    { id: 'mac', label: 'macOS' },
                    { id: 'win', label: 'Windows' },
                    { id: 'ios', label: 'iPad / iOS' },
                    { id: 'web', label: 'Web CSS' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-2 py-1 text-[11px] font-medium rounded transition-colors ${
                      activeTab === tab.id
                        ? 'bg-white text-slate-900 shadow-xs font-semibold'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Instruction content */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 leading-relaxed space-y-2">
              {activeTab === 'mac' && (
                <ol className="list-decimal pl-4 space-y-1.5">
                  <li>Download the <strong>.ttf</strong> file to your Mac Downloads folder.</li>
                  <li>Double-click the downloaded file. macOS will open <strong>Font Book</strong>.</li>
                  <li>Click the blue <strong>"Install"</strong> button in Font Book.</li>
                  <li>Restart or open any app (Pages, Word, Figma, Photoshop, Illustrator) — your custom font will appear in the font picker under <em>"{metadata.familyName || 'MyHandwriting'}"</em>!</li>
                </ol>
              )}

              {activeTab === 'win' && (
                <ol className="list-decimal pl-4 space-y-1.5">
                  <li>Download the <strong>.ttf</strong> file to your computer.</li>
                  <li>Right-click the file in Windows File Explorer and select <strong>"Install"</strong> (or <em>"Install for all users"</em>).</li>
                  <li>Alternatively, drag and drop the file into <code>Settings &gt; Personalization &gt; Fonts</code>.</li>
                  <li>Open Microsoft Word, Excel, PowerPoint, or Canva desktop — select your handwriting font from the typography list!</li>
                </ol>
              )}

              {activeTab === 'ios' && (
                <ol className="list-decimal pl-4 space-y-1.5">
                  <li>Download the <strong>.ttf</strong> file in Safari on your iPad or iPhone.</li>
                  <li>Open the free <strong>iFont</strong> or <strong>AnyFont</strong> app from the App Store.</li>
                  <li>Import the font file and tap <strong>Install Configuration Profile</strong>.</li>
                  <li>Use your handwriting directly in GoodNotes, Procreate, Apple Pages, and Keynote!</li>
                </ol>
              )}

              {activeTab === 'web' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-slate-500">CSS @font-face</span>
                    <button
                      onClick={handleCopyCss}
                      className="flex items-center gap-1 text-[11px] text-slate-700 hover:text-slate-900"
                    >
                      {copiedCss ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy CSS</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-3 bg-slate-900 text-slate-200 rounded-lg text-[11px] font-mono overflow-x-auto">
                    {cssSnippet}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
