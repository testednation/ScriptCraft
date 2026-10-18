import React, { useState, useRef } from 'react';
import {
  Printer,
  Download,
  Sliders,
  Type,
  FileText,
  RotateCcw,
  Sparkles,
  Eye,
  Check,
  Compass,
  Grid,
  BookOpen,
  Share2,
  Edit3,
} from 'lucide-react';
import { FontMetadata, GlyphData, PenSettings } from '../types/font';
import { strokesToSvgPath } from '../utils/fontEngine';

interface WorksheetStudioProps {
  metadata: FontMetadata;
  glyphs: Record<string, GlyphData>;
  liveFontFamily: string;
  penSettings: PenSettings;
  slant: number;
}

export type RulingStyle =
  | 'seyes'
  | 'spencerian'
  | 'copperplate'
  | 'primary'
  | 'college'
  | 'dotgrid'
  | 'architect';

export type TracingMode = 'ghost' | 'dotted' | 'exemplar' | 'blank';

const RULING_PRESETS: {
  id: RulingStyle;
  name: string;
  tagline: string;
  defaultSlant: number;
  description: string;
}[] = [
  {
    id: 'seyes',
    name: 'French Ruled (Grands Carreaux / Seyès)',
    tagline: 'Classic 8mm lines with 2mm auxiliary steps',
    defaultSlant: 0,
    description: 'Standard French school system paper for uniform ascenders, descenders, and x-height proportion control.',
  },
  {
    id: 'spencerian',
    name: 'Spencerian Cursive (52° Slant)',
    tagline: 'American ornamental penmanship lines',
    defaultSlant: 52,
    description: 'Traditional 19th century American ruling with strict 52-degree slant lines and 1:1:1 proportional bands.',
  },
  {
    id: 'copperplate',
    name: 'Copperplate / Engrosser’s (55° Slant)',
    tagline: 'Roundhand calligraphy ruling',
    defaultSlant: 55,
    description: 'Formal British roundhand ruling with 55° guide lines and 3:2:3 ascender-to-x-height-to-descender ratio.',
  },
  {
    id: 'primary',
    name: 'Primary / Dotted Midline',
    tagline: 'Red baseline with dashed blue midline',
    defaultSlant: 0,
    description: 'Kindergarten & elementary handwriting paper with clear visual distinction between midline and baseline.',
  },
  {
    id: 'college',
    name: 'College Ruled Lined',
    tagline: 'Standard 7.1mm horizontal lined paper',
    defaultSlant: 0,
    description: 'Classic notebook ruling with left vertical margin line for everyday note-taking practice.',
  },
  {
    id: 'dotgrid',
    name: '5mm Dot Grid (Bullet Journal)',
    tagline: 'Minimalist dot grid matrix',
    defaultSlant: 0,
    description: 'Unobtrusive dot matrix allowing both upright lettering and custom slanted practice.',
  },
  {
    id: 'architect',
    name: 'Architect Drafting Grid',
    tagline: 'Quarter-inch technical drafting grid',
    defaultSlant: 0,
    description: 'Clean precision square grid for architectural all-caps lettering discipline.',
  },
];

const PRESET_DRILLS = [
  {
    label: 'Sphinx Pangram',
    text: 'Sphinx of black quartz, judge my vow.',
  },
  {
    label: 'Classic Fox Pangram',
    text: 'The quick brown fox jumps over the lazy dog.',
  },
  {
    label: 'Pack My Box',
    text: 'Pack my box with five dozen liquor jugs.',
  },
  {
    label: 'Alphabet Drill (A-Z, a-z)',
    text: 'Aa Bb Cc Dd Ee Ff Gg Hh Ii Jj Kk Ll Mm Nn Oo Pp Qq Rr Ss Tt Uu Vv Ww Xx Yy Zz',
  },
  {
    label: 'Loop & Ascender Drill',
    text: 'lll hhh bbb kkk ddd ttt fff ggg jjj yyy ppp qqq',
  },
  {
    label: 'Numerals & Math',
    text: '0 1 2 3 4 5 6 7 8 9 + - = % $ & @ #',
  },
  {
    label: 'Inspirational Handwriting',
    text: 'Patience and rhythm turn simple strokes into living art.',
  },
];

export const WorksheetStudio: React.FC<WorksheetStudioProps> = ({
  metadata,
  glyphs,
  liveFontFamily,
  penSettings,
  slant: initialSlant,
}) => {
  const [rulingStyle, setRulingStyle] = useState<RulingStyle>('seyes');
  const [tracingMode, setTracingMode] = useState<TracingMode>('ghost');
  const [practiceText, setPracticeText] = useState<string>(
    'The quick brown fox jumps over the lazy dog.'
  );
  const [lineHeight, setLineHeight] = useState<number>(44); // px per line band
  const [customSlant, setCustomSlant] = useState<number>(0);
  const [guideColor, setGuideColor] = useState<string>('#94a3b8');
  const [guideOpacity, setGuideOpacity] = useState<number>(45); // percentage
  const [repeatLines, setRepeatLines] = useState<number>(6);
  const [paperFormat, setPaperFormat] = useState<'letter' | 'a4'>('letter');
  const [showStudentHeader, setShowStudentHeader] = useState<boolean>(true);
  const [paperTone, setPaperTone] = useState<'ivory' | 'white' | 'sepia'>('ivory');

  const sheetRef = useRef<HTMLDivElement | null>(null);

  // When ruling style changes, optionally adopt its natural slant
  const handleRulingChange = (newStyle: RulingStyle) => {
    setRulingStyle(newStyle);
    const preset = RULING_PRESETS.find((p) => p.id === newStyle);
    if (preset && preset.defaultSlant > 0) {
      setCustomSlant(preset.defaultSlant);
    } else {
      setCustomSlant(0);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const paperBackgrounds = {
    ivory: '#fcfbf7',
    white: '#ffffff',
    sepia: '#f7f2e8',
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Screen Controls Header (Hidden in Print) */}
      <div className="print:hidden space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-slate-500">
              <span>Worksheet & Ruling Studio</span>
              <span>·</span>
              <span className="text-emerald-700 font-semibold">Printable Vector Practice Sheets</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 font-['Plus_Jakarta_Sans']">
              Penmanship Practice Worksheets
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
              Generate custom lined calligraphy and handwriting practice sheets with your own custom font ghosted as tracing guidelines. Print directly onto 8.5×11" or A4 paper.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 active:scale-[0.98] transition-all text-xs font-semibold shadow-sm"
              title="Print worksheet directly onto your printer or Save as PDF"
            >
              <Printer className="w-4 h-4 text-emerald-400" />
              <span>Print Worksheet / PDF</span>
            </button>
          </div>
        </div>

        {/* Configuration Toolbar */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs space-y-5">
          {/* Row 1: Ruling Style Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 font-['Plus_Jakarta_Sans']">
              1. Select Ruling Style
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {RULING_PRESETS.map((style) => (
                <button
                  key={style.id}
                  onClick={() => handleRulingChange(style.id)}
                  className={`p-2.5 rounded-lg border text-left transition-all flex flex-col justify-between ${
                    rulingStyle === style.id
                      ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                      : 'border-slate-200 bg-slate-50/60 hover:bg-white text-slate-700'
                  }`}
                >
                  <span className="text-xs font-bold leading-snug line-clamp-2">
                    {style.name}
                  </span>
                  <span
                    className={`text-[10px] mt-1 line-clamp-1 ${
                      rulingStyle === style.id ? 'text-slate-300' : 'text-slate-500'
                    }`}
                  >
                    {style.defaultSlant > 0 ? `${style.defaultSlant}° Slant` : 'Horizontal'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Row 2: Tracing Guide Mode & Paper Settings */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
            {/* Tracing Mode */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Practice / Tracing Mode
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'ghost', label: 'Ghost Tracing', desc: 'Light 20% ink guidelines' },
                  { id: 'dotted', label: 'Dotted Outline', desc: 'Dotted stroke guide' },
                  { id: 'exemplar', label: 'Exemplar First', desc: 'Top sample + blank lines' },
                  { id: 'blank', label: 'Blank Rulings', desc: 'Guidelines only' },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => setTracingMode(mode.id as TracingMode)}
                    className={`p-2 rounded-md border text-left text-xs transition-colors ${
                      tracingMode === mode.id
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-semibold'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-medium">{mode.label}</div>
                    <div className="text-[10px] text-slate-500 font-normal">{mode.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Scale & Slant Sliders */}
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium text-slate-700">Line Height / Scale:</span>
                  <span className="font-mono text-slate-500 font-bold">{lineHeight}px</span>
                </div>
                <input
                  type="range"
                  min="28"
                  max="72"
                  value={lineHeight}
                  onChange={(e) => setLineHeight(Number(e.target.value))}
                  className="w-full accent-slate-900"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium text-slate-700">Slant Guideline Angle:</span>
                  <span className="font-mono text-slate-500 font-bold">{customSlant}°</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="60"
                  value={customSlant}
                  onChange={(e) => setCustomSlant(Number(e.target.value))}
                  className="w-full accent-slate-900"
                />
              </div>
            </div>

            {/* Repeat Count & Student Header */}
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium text-slate-700">Practice Rows:</span>
                  <span className="font-mono text-slate-500 font-bold">{repeatLines} lines</span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="12"
                  value={repeatLines}
                  onChange={(e) => setRepeatLines(Number(e.target.value))}
                  className="w-full accent-slate-900"
                />
              </div>

              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showStudentHeader}
                    onChange={(e) => setShowStudentHeader(e.target.checked)}
                    className="rounded text-slate-900 focus:ring-slate-900"
                  />
                  <span>Name & Date Header</span>
                </label>

                <div className="flex items-center gap-1 text-xs">
                  <span className="text-slate-500">Tone:</span>
                  {(['ivory', 'white', 'sepia'] as const).map((tone) => (
                    <button
                      key={tone}
                      onClick={() => setPaperTone(tone)}
                      className={`px-1.5 py-0.5 rounded text-[10px] capitalize border ${
                        paperTone === tone
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-200 bg-white text-slate-600'
                      }`}
                    >
                      {tone}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Row 3: Practice Text Input & Quick Drills */}
          <div className="pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Custom Practice Sentence / Drill Content:
              </label>
              <div className="flex items-center gap-1 text-[11px] text-slate-500 overflow-x-auto no-scrollbar">
                <span className="shrink-0 font-medium text-slate-600">Quick drills:</span>
                {PRESET_DRILLS.map((drill) => (
                  <button
                    key={drill.label}
                    onClick={() => setPracticeText(drill.text)}
                    className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors shrink-0 text-[10px]"
                  >
                    {drill.label}
                  </button>
                ))}
              </div>
            </div>
            <input
              type="text"
              value={practiceText}
              onChange={(e) => setPracticeText(e.target.value)}
              placeholder="Type any sentence, pangram, or character drill here..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono"
            />
          </div>
        </div>
      </div>

      {/* Printable Sheet Viewport (This section prints cleanly on letter/A4) */}
      <div className="flex justify-center print:block print:p-0">
        <div
          ref={sheetRef}
          style={{ backgroundColor: paperBackgrounds[paperTone] }}
          className="w-full max-w-[850px] min-h-[1100px] border border-slate-300 shadow-xl rounded-lg p-8 sm:p-12 print:border-none print:shadow-none print:rounded-none print:m-0 print:p-6 print:w-full print:max-w-none transition-all flex flex-col justify-between"
        >
          {/* Sheet Header */}
          <div>
            {showStudentHeader && (
              <div className="pb-6 mb-6 border-b border-slate-300 flex items-center justify-between text-xs font-serif text-slate-700">
                <div className="space-y-1">
                  <div className="font-bold text-sm text-slate-900 tracking-tight font-['Plus_Jakarta_Sans']">
                    {metadata.familyName || 'ScriptCraft Studio'} · Penmanship Practice
                  </div>
                  <div className="text-[11px] text-slate-500 font-sans">
                    Ruling: {RULING_PRESETS.find((p) => p.id === rulingStyle)?.name} · Scale: {lineHeight}px
                  </div>
                </div>

                <div className="flex items-center gap-6 text-xs text-slate-500 font-sans">
                  <div>
                    Name: <span className="inline-block w-28 border-b border-slate-400"></span>
                  </div>
                  <div>
                    Date: <span className="inline-block w-20 border-b border-slate-400"></span>
                  </div>
                  <div>
                    Score: <span className="inline-block w-12 border-b border-slate-400"></span>
                  </div>
                </div>
              </div>
            )}

            {/* Generated Practice Rows */}
            <div className="space-y-6">
              {Array.from({ length: repeatLines }).map((_, lineIdx) => {
                const isExemplarLine = lineIdx === 0 && tracingMode === 'exemplar';
                const isBlankLine =
                  tracingMode === 'blank' || (tracingMode === 'exemplar' && lineIdx > 0);
                const isGhost = tracingMode === 'ghost' || isExemplarLine;
                const isDotted = tracingMode === 'dotted';

                return (
                  <div
                    key={lineIdx}
                    className="relative w-full rounded overflow-hidden select-none"
                    style={{ height: lineHeight * 2 }}
                  >
                    {/* SVG Guidelines Layer */}
                    <svg
                      className="absolute inset-0 w-full h-full pointer-events-none"
                      style={{ overflow: 'visible' }}
                    >
                      <defs>
                        {/* Slant line pattern if angle > 0 */}
                        {customSlant > 0 && (
                          <pattern
                            id={`slant-${lineIdx}`}
                            width={lineHeight * Math.tan((customSlant * Math.PI) / 180) * 1.5 + 40}
                            height={lineHeight * 2}
                            patternUnits="userSpaceOnUse"
                          >
                            <line
                              x1="0"
                              y1={lineHeight * 2}
                              x2={lineHeight * 2 * Math.tan((customSlant * Math.PI) / 180)}
                              y2="0"
                              stroke={guideColor}
                              strokeWidth="0.8"
                              strokeOpacity={guideOpacity / 100}
                              strokeDasharray="3 3"
                            />
                          </pattern>
                        )}
                      </defs>

                      {/* Slant Background Overlay */}
                      {customSlant > 0 && (
                        <rect
                          width="100%"
                          height="100%"
                          fill={`url(#slant-${lineIdx})`}
                        />
                      )}

                      {/* Primary / Kindergarten Style Guidelines */}
                      {rulingStyle === 'primary' && (
                        <>
                          {/* Top Headline (Solid Blue) */}
                          <line
                            x1="0"
                            y1={lineHeight * 0.3}
                            x2="100%"
                            y2={lineHeight * 0.3}
                            stroke="#3b82f6"
                            strokeWidth="1.2"
                            strokeOpacity="0.7"
                          />
                          {/* Midline (Dashed Amber/Blue) */}
                          <line
                            x1="0"
                            y1={lineHeight * 0.8}
                            x2="100%"
                            y2={lineHeight * 0.8}
                            stroke="#f59e0b"
                            strokeWidth="1"
                            strokeDasharray="6 4"
                            strokeOpacity="0.8"
                          />
                          {/* Baseline (Solid Red) */}
                          <line
                            x1="0"
                            y1={lineHeight * 1.3}
                            x2="100%"
                            y2={lineHeight * 1.3}
                            stroke="#ef4444"
                            strokeWidth="1.4"
                            strokeOpacity="0.8"
                          />
                          {/* Descender line (Light Blue) */}
                          <line
                            x1="0"
                            y1={lineHeight * 1.8}
                            x2="100%"
                            y2={lineHeight * 1.8}
                            stroke="#93c5fd"
                            strokeWidth="0.8"
                            strokeDasharray="4 4"
                            strokeOpacity="0.5"
                          />
                        </>
                      )}

                      {/* French Ruled (Seyès) Guidelines */}
                      {rulingStyle === 'seyes' && (
                        <>
                          {/* Main lines (Dark purple/blue) */}
                          <line
                            x1="0"
                            y1={lineHeight * 0.4}
                            x2="100%"
                            y2={lineHeight * 0.4}
                            stroke="#6366f1"
                            strokeWidth="1.2"
                            strokeOpacity="0.75"
                          />
                          <line
                            x1="0"
                            y1={lineHeight * 1.4}
                            x2="100%"
                            y2={lineHeight * 1.4}
                            stroke="#4338ca"
                            strokeWidth="1.5"
                            strokeOpacity="0.85"
                          />
                          {/* 2mm auxiliary lines */}
                          {[-0.2, 0.1, 0.7, 1.0, 1.7].map((offset, idx) => (
                            <line
                              key={idx}
                              x1="0"
                              y1={lineHeight * (0.4 + offset * 0.5)}
                              x2="100%"
                              y2={lineHeight * (0.4 + offset * 0.5)}
                              stroke="#818cf8"
                              strokeWidth="0.6"
                              strokeOpacity="0.35"
                            />
                          ))}
                        </>
                      )}

                      {/* Spencerian & Copperplate Calligraphy Ruling */}
                      {(rulingStyle === 'spencerian' || rulingStyle === 'copperplate') && (
                        <>
                          {/* Ascender line */}
                          <line
                            x1="0"
                            y1={lineHeight * 0.25}
                            x2="100%"
                            y2={lineHeight * 0.25}
                            stroke={guideColor}
                            strokeWidth="0.9"
                            strokeDasharray="4 4"
                            strokeOpacity={guideOpacity / 100}
                          />
                          {/* Waist / x-height line */}
                          <line
                            x1="0"
                            y1={lineHeight * 0.75}
                            x2="100%"
                            y2={lineHeight * 0.75}
                            stroke={guideColor}
                            strokeWidth="1"
                            strokeOpacity={(guideOpacity + 20) / 100}
                          />
                          {/* Baseline */}
                          <line
                            x1="0"
                            y1={lineHeight * 1.35}
                            x2="100%"
                            y2={lineHeight * 1.35}
                            stroke="#1e293b"
                            strokeWidth="1.4"
                            strokeOpacity="0.8"
                          />
                          {/* Descender line */}
                          <line
                            x1="0"
                            y1={lineHeight * 1.85}
                            x2="100%"
                            y2={lineHeight * 1.85}
                            stroke={guideColor}
                            strokeWidth="0.8"
                            strokeDasharray="4 4"
                            strokeOpacity={guideOpacity / 100}
                          />
                        </>
                      )}

                      {/* Standard College Ruled */}
                      {rulingStyle === 'college' && (
                        <>
                          {/* Vertical Margin Red Line */}
                          <line
                            x1="80"
                            y1="0"
                            x2="80"
                            y2="100%"
                            stroke="#f87171"
                            strokeWidth="1"
                            strokeOpacity="0.6"
                          />
                          {/* Horizontal Rule */}
                          <line
                            x1="0"
                            y1={lineHeight * 1.35}
                            x2="100%"
                            y2={lineHeight * 1.35}
                            stroke="#93c5fd"
                            strokeWidth="1.2"
                            strokeOpacity="0.75"
                          />
                        </>
                      )}

                      {/* Dot Grid / Architect Style */}
                      {(rulingStyle === 'dotgrid' || rulingStyle === 'architect') && (
                        <>
                          <line
                            x1="0"
                            y1={lineHeight * 1.35}
                            x2="100%"
                            y2={lineHeight * 1.35}
                            stroke={guideColor}
                            strokeWidth="1"
                            strokeOpacity={guideOpacity / 100}
                          />
                        </>
                      )}
                    </svg>

                    {/* Tracing Text Content Layer */}
                    {!isBlankLine && (
                      <div
                        className="absolute inset-0 flex items-center px-4 overflow-hidden"
                        style={{
                          paddingLeft: rulingStyle === 'college' ? '90px' : '20px',
                          transform: `translateY(${lineHeight * 0.15}px)`,
                        }}
                      >
                        <span
                          style={{
                            fontFamily: `"${liveFontFamily}", cursive, sans-serif`,
                            fontSize: `${lineHeight * 1.1}px`,
                            color: isExemplarLine
                              ? '#0f172a'
                              : isGhost
                              ? 'rgba(100, 116, 139, 0.28)'
                              : '#94a3b8',
                            letterSpacing: '0.04em',
                            textShadow: isDotted
                              ? '0 0 1px #000, 1px 1px 0 rgba(0,0,0,0.1)'
                              : 'none',
                          }}
                          className={`whitespace-nowrap font-normal select-none ${
                            isDotted ? 'border-b border-dashed border-slate-400' : ''
                          }`}
                        >
                          {practiceText}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer of the sheet */}
          <div className="pt-8 mt-8 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span>
              Generated with ScriptCraft Studio · Hand-crafted TrueType Font Foundry
            </span>
            <span>
              Target: Daily 15-minute muscle memory discipline · r/Handwriting
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
