import React, { useState, useRef } from 'react';
import {
  Mail,
  Printer,
  Download,
  Palette,
  Sliders,
  Sparkles,
  Stamp,
  RotateCcw,
  Check,
  Type,
  Maximize2,
  Copy,
  BookOpen,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { FontMetadata, GlyphData } from '../types/font';

interface StationeryLetterStudioProps {
  metadata: FontMetadata;
  glyphs: Record<string, GlyphData>;
  liveFontFamily: string;
}

interface StationeryPaper {
  id: string;
  name: string;
  subtitle: string;
  bg: string;
  textColor: string;
  borderStyle: string;
  hasAirmailBorder?: boolean;
  texturePattern?: string;
}

interface InkFormula {
  name: string;
  brand: string;
  color: string;
  shadingColor: string; // Darker pooling color
  sheenColor?: string;
  label: string;
}

interface WaxSealConfig {
  initial: string;
  color: string;
  rimColor: string;
  highlightColor: string;
  name: string;
  shape: 'circle' | 'oval' | 'shield';
}

const STATIONERY_PAPERS: StationeryPaper[] = [
  {
    id: 'french-parchment',
    name: 'French Deckle Parchment',
    subtitle: 'Aged 1880s cream stationery',
    bg: '#fcf8ee',
    textColor: '#1e293b',
    borderStyle: '1px solid #e7dfcb',
    texturePattern: 'radial-gradient(#e5dfce 0.8px, transparent 0.8px)',
  },
  {
    id: 'aerogramme',
    name: 'Airmail Aerogramme',
    subtitle: 'Classic transatlantic postal paper',
    bg: '#f7faff',
    textColor: '#0f172a',
    borderStyle: '1px solid #bfdbfe',
    hasAirmailBorder: true,
  },
  {
    id: 'mulberry-washi',
    name: 'Mulberry Washi (和紙)',
    subtitle: 'Handmade Japanese fibrous paper',
    bg: '#faf6ee',
    textColor: '#292524',
    borderStyle: '1px solid #e7e0d3',
    texturePattern: 'radial-gradient(#d6cebe 1px, transparent 1px)',
  },
  {
    id: 'victorian-noir',
    name: 'Victorian Noir Slate',
    subtitle: 'Midnight stationery with metallic ink',
    bg: '#0f172a',
    textColor: '#fef08a',
    borderStyle: '1px solid #334155',
  },
  {
    id: 'botanical-cotton',
    name: 'Botanical Herbarium',
    subtitle: 'Raw cotton paper with pressed herbs',
    bg: '#fdfbf7',
    textColor: '#1c1917',
    borderStyle: '1px solid #fed7aa',
  },
];

const FOUNTAIN_INKS: InkFormula[] = [
  {
    name: "Iroshizuku Kon-peki",
    brand: 'Pilot Japan',
    color: '#0284c7',
    shadingColor: '#0369a1',
    label: 'Cerulean Sky',
  },
  {
    name: 'Diamine Oxblood',
    brand: 'Diamine UK',
    color: '#881337',
    shadingColor: '#4c0519',
    label: 'Vintage Oxblood',
  },
  {
    name: 'J. Herbin Emerald',
    brand: 'J. Herbin Paris',
    color: '#047857',
    shadingColor: '#064e3b',
    sheenColor: '#fbbf24',
    label: 'Emerald Gilt',
  },
  {
    name: "Noodler's Black",
    brand: 'Noodler’s USA',
    color: '#09090b',
    shadingColor: '#000000',
    label: 'Archival Carbon',
  },
  {
    name: 'Walnut Sepia',
    brand: 'Platinum Japan',
    color: '#78350f',
    shadingColor: '#451a03',
    label: 'Antique Sepia',
  },
  {
    name: 'Amethyst Shimmer',
    brand: 'Diamine Shimmertastic',
    color: '#7e22ce',
    shadingColor: '#581c87',
    sheenColor: '#38bdf8',
    label: 'Violet Amethyst',
  },
];

const WAX_SEAL_COLORS = [
  {
    name: 'Royal Burgundy',
    color: '#991b1b',
    rimColor: '#7f1d1d',
    highlightColor: '#f87171',
  },
  {
    name: 'Antique Gilded Gold',
    color: '#d97706',
    rimColor: '#b45309',
    highlightColor: '#fde047',
  },
  {
    name: 'Evergreen Forest',
    color: '#166534',
    rimColor: '#14532d',
    highlightColor: '#86efac',
  },
  {
    name: 'Imperial Navy',
    color: '#1e3a8a',
    rimColor: '#172554',
    highlightColor: '#93c5fd',
  },
  {
    name: 'Pearl Champagne',
    color: '#d4d4d8',
    rimColor: '#a1a1aa',
    highlightColor: '#ffffff',
  },
];

const LETTER_TEMPLATES = [
  {
    title: 'A Warm Letter Across the Miles',
    text: `Dearest Eleanor,

I hope this handwritten letter finds you well on this golden autumn afternoon. The leaves have begun their descent across the courtyard, painting the cobblestones in shades of amber and rust.

I have spent many quiet hours writing with this fountain pen, watching the wet ink settle into the grain of the paper. There is a tenderness in handwriting that no digital screen can ever truly replace—each stroke carries the breath and rhythm of the moment it was formed.

Please write back whenever you find a quiet evening. You remain forever in my thoughts.

Yours most faithfully,
Julian`,
  },
  {
    title: 'Formal Garden Soirée Invitation',
    text: `Cordially Invited:

You are warmly invited to an Evening of Music, Poetry, and Fine Conversation under the Midsummer Lanterns.

Date: Saturday, the Twelfth of June
Hour: Seven o'clock in the evening
Venue: The Glass Conservatory at Willowbrook Estate

Attire: Formal Garden Elegance
R.S.V.P. with your kind acceptance by the first of June.`,
  },
  {
    title: 'Heirloom Rosemary Bread Recipe',
    text: `Grandmother's Rosemary & Sea Salt Focaccia:

Ingredients:
- 500g unbleached bread flour
- 400ml warm spring water
- 7g active dry yeast & 1 tsp wildflower honey
- 10g flaky Maldon sea salt
- Cold-pressed extra virgin olive oil & fresh rosemary sprigs

Method:
Knead with gentle patience. Allow the dough to double in a warm earthen bowl. Dimple lovingly with your fingertips, bathe in olive oil, and bake at 220°C until golden and fragrant. Share with someone you cherish.`,
  },
];

export const StationeryLetterStudio: React.FC<StationeryLetterStudioProps> = ({
  metadata,
  glyphs,
  liveFontFamily,
}) => {
  const [activePaper, setActivePaper] = useState<StationeryPaper>(STATIONERY_PAPERS[0]);
  const [activeInk, setActiveInk] = useState<InkFormula>(FOUNTAIN_INKS[1]); // Oxblood
  const [letterContent, setLetterContent] = useState<string>(LETTER_TEMPLATES[0].text);
  const [fontSize, setFontSize] = useState<number>(24);
  const [lineHeight, setLineHeight] = useState<number>(1.8);
  const [letterSpacing, setLetterSpacing] = useState<number>(0.5);

  // Wax seal settings
  const [showWaxSeal, setShowWaxSeal] = useState<boolean>(true);
  const [waxInitial, setWaxInitial] = useState<string>(
    (metadata.familyName || 'S').trim()[0] || 'S'
  );
  const [activeWaxColor, setActiveWaxColor] = useState(WAX_SEAL_COLORS[0]);
  const [sealPosition, setSealPosition] = useState<'bottom-right' | 'bottom-center' | 'bottom-left'>(
    'bottom-right'
  );

  const letterContainerRef = useRef<HTMLDivElement | null>(null);

  const handlePrint = () => {
    window.print();
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(letterContent);
    confetti({
      particleCount: 30,
      spread: 50,
      origin: { y: 0.8 },
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Studio Header (Hidden on print) */}
      <div className="print:hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-slate-500">
            <span>Stationery & Letter Foundry</span>
            <span>·</span>
            <span className="text-amber-700 font-semibold">Vintage Paper & Wax Seals</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 font-['Plus_Jakarta_Sans']">
            Handwritten Letters & Wax Seal Studio
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
            Compose authentic handwritten letters, heirloom recipe cards, and vintage correspondence using your custom font. Features realistic fountain pen ink shading, archival paper textures, and custom 3D embossed monogram wax seals.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleCopyText}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 active:scale-[0.98] transition-all shadow-2xs"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Copy Text</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg active:scale-[0.98] transition-all text-xs font-semibold shadow-sm"
            title="Print letter or Save as PDF"
          >
            <Printer className="w-4 h-4 text-emerald-400" />
            <span>Print Letter / PDF</span>
          </button>
        </div>
      </div>

      {/* Control Configuration Bar (Hidden on print) */}
      <div className="print:hidden bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs space-y-5">
        {/* Row 1: Paper Stationery Picker */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 font-['Plus_Jakarta_Sans']">
            1. Select Archival Paper Stationery
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {STATIONERY_PAPERS.map((paper) => (
              <button
                key={paper.id}
                onClick={() => setActivePaper(paper)}
                style={{ backgroundColor: paper.bg }}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between shadow-2xs ${
                  activePaper.id === paper.id
                    ? 'ring-2 ring-slate-900 border-slate-900 scale-[1.02]'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div>
                  <span
                    style={{ color: paper.textColor }}
                    className="text-xs font-bold font-['Plus_Jakarta_Sans'] block leading-snug"
                  >
                    {paper.name}
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    {paper.subtitle}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: Fountain Pen Inks & Wax Seal Palette */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
          {/* Fountain Pen Ink Shading Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Fountain Pen Ink (Color & Shading)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {FOUNTAIN_INKS.map((ink) => (
                <button
                  key={ink.name}
                  onClick={() => setActiveInk(ink)}
                  className={`p-2 rounded-lg border text-left flex items-center gap-2.5 transition-all ${
                    activeInk.name === ink.name
                      ? 'border-slate-900 bg-slate-50 font-semibold shadow-2xs'
                      : 'border-slate-200 bg-white hover:bg-slate-50/50'
                  }`}
                >
                  <div
                    style={{
                      background: `radial-gradient(circle at 35% 35%, ${ink.color}, ${ink.shadingColor})`,
                    }}
                    className="w-5 h-5 rounded-full shrink-0 shadow-xs border border-white"
                  />
                  <div className="min-w-0">
                    <span className="text-xs text-slate-800 block truncate leading-tight">
                      {ink.label}
                    </span>
                    <span className="text-[9px] text-slate-400 block truncate">
                      {ink.brand}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 3D Wax Seal Customizer */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showWaxSeal}
                  onChange={(e) => setShowWaxSeal(e.target.checked)}
                  className="rounded border-slate-300 text-slate-900 focus:ring-0"
                />
                <span>Include 3D Embossed Wax Seal</span>
              </label>

              {showWaxSeal && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-mono">Seal Initial:</span>
                  <input
                    type="text"
                    maxLength={2}
                    value={waxInitial}
                    onChange={(e) => setWaxInitial(e.target.value.toUpperCase())}
                    className="w-10 text-center uppercase font-bold text-xs py-0.5 border border-slate-300 rounded focus:ring-1 focus:ring-slate-900"
                  />
                </div>
              )}
            </div>

            {showWaxSeal && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {WAX_SEAL_COLORS.map((wax) => (
                  <button
                    key={wax.name}
                    onClick={() => setActiveWaxColor(wax)}
                    style={{ backgroundColor: wax.color }}
                    className={`w-7 h-7 rounded-full border-2 transition-transform shadow-sm ${
                      activeWaxColor.name === wax.name
                        ? 'border-slate-900 scale-110 ring-2 ring-slate-900/20'
                        : 'border-white hover:scale-105'
                    }`}
                    title={wax.name}
                  />
                ))}
                <span className="text-xs text-slate-500 font-mono pl-2 truncate">
                  {activeWaxColor.name}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Row 3: Quick Letter Templates & Sliders */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Letter Templates:
            </label>
            <div className="flex flex-col gap-1">
              {LETTER_TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.title}
                  onClick={() => setLetterContent(tmpl.text)}
                  className="px-2 py-1 text-left text-xs rounded bg-slate-50 hover:bg-slate-100 text-slate-700 truncate transition-colors"
                >
                  {tmpl.title}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium text-slate-700">Font Size:</span>
                <span className="font-mono text-slate-500 font-bold">{fontSize}px</span>
              </div>
              <input
                type="range"
                min="16"
                max="40"
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="w-full accent-slate-900"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium text-slate-700">Line Height:</span>
                <span className="font-mono text-slate-500 font-bold">{lineHeight}</span>
              </div>
              <input
                type="range"
                min="1.3"
                max="2.5"
                step="0.1"
                value={lineHeight}
                onChange={(e) => setLineHeight(Number(e.target.value))}
                className="w-full accent-slate-900"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-medium text-slate-700">Letter Spacing:</span>
              <span className="font-mono text-slate-500 font-bold">{letterSpacing}px</span>
            </div>
            <input
              type="range"
              min="-1"
              max="5"
              step="0.5"
              value={letterSpacing}
              onChange={(e) => setLetterSpacing(Number(e.target.value))}
              className="w-full accent-slate-900"
            />
          </div>
        </div>
      </div>

      {/* Printable Letter Viewport */}
      <div className="flex justify-center print:block print:p-0">
        <div
          ref={letterContainerRef}
          style={{
            backgroundColor: activePaper.bg,
            backgroundImage: activePaper.texturePattern || 'none',
            backgroundSize: '24px 24px',
            border: activePaper.borderStyle,
          }}
          className={`w-full max-w-[820px] min-h-[960px] p-10 sm:p-14 shadow-2xl rounded-2xl relative transition-all flex flex-col justify-between print:border-none print:shadow-none print:rounded-none print:p-8 print:w-full print:max-w-none ${
            activePaper.hasAirmailBorder ? 'border-[12px] border-dashed border-red-500/40' : ''
          }`}
        >
          {/* Top Postmark Stamp (Aerogramme style) */}
          {activePaper.hasAirmailBorder && (
            <div className="flex items-center justify-between pb-6 border-b border-blue-200/80 mb-6 text-xs text-blue-900 font-mono">
              <span className="font-bold tracking-widest uppercase">
                PAR AVION · AIR MAIL · POSTE AÉRIENNE
              </span>
              <div className="w-14 h-14 rounded-full border-2 border-dashed border-blue-400 flex flex-col items-center justify-center text-[9px] text-blue-700 rotate-12">
                <span>POST</span>
                <span className="font-bold">2026</span>
              </div>
            </div>
          )}

          {/* Editable Handwritten Letter Body */}
          <div className="flex-1">
            <textarea
              value={letterContent}
              onChange={(e) => setLetterContent(e.target.value)}
              style={{
                fontFamily: `"${liveFontFamily}", cursive, sans-serif`,
                fontSize: `${fontSize}px`,
                lineHeight: lineHeight,
                letterSpacing: `${letterSpacing}px`,
                color: activePaper.textColor !== '#fef08a' ? activeInk.color : '#fef08a',
                textShadow:
                  activePaper.id === 'victorian-noir'
                    ? '0 0 1px rgba(254, 240, 138, 0.4)'
                    : `0 0 0.5px ${activeInk.shadingColor}`,
              }}
              placeholder="Begin writing your handwritten letter here..."
              className="w-full h-full min-h-[580px] bg-transparent outline-none border-none resize-none overflow-y-auto"
            />
          </div>

          {/* Bottom Area: Wax Seal Stamp & Postscript */}
          <div className="pt-8 border-t border-slate-200/60 flex items-end justify-between relative mt-6">
            <div className="text-[11px] text-slate-400 font-mono select-none">
              Inked with {activeInk.name} on {activePaper.name} · {metadata.familyName || 'ScriptCraft'}
            </div>

            {/* 3D Embossed Wax Seal */}
            {showWaxSeal && (
              <div
                style={{
                  boxShadow: `0 10px 25px -4px rgba(0, 0, 0, 0.4), inset 0 2px 4px ${activeWaxColor.highlightColor}, inset 0 -4px 6px ${activeWaxColor.rimColor}`,
                  backgroundColor: activeWaxColor.color,
                }}
                className="w-20 h-20 rounded-full flex items-center justify-center relative cursor-pointer select-none transition-transform hover:scale-105 active:scale-95 shrink-0"
                title="Personalized 3D Embossed Wax Seal"
              >
                {/* Uneven organic wax rim drips */}
                <div
                  style={{ borderColor: activeWaxColor.rimColor }}
                  className="absolute inset-1 rounded-full border-2 border-dashed opacity-50"
                />

                {/* Inner seal circle */}
                <div
                  style={{
                    backgroundColor: activeWaxColor.rimColor,
                    boxShadow: `inset 0 3px 5px rgba(0, 0, 0, 0.6), 0 1px 2px ${activeWaxColor.highlightColor}`,
                  }}
                  className="w-14 h-14 rounded-full flex items-center justify-center text-white"
                >
                  <span
                    style={{
                      fontFamily: `"${liveFontFamily}", serif`,
                      textShadow: `1px 1px 0 rgba(0,0,0,0.8), -1px -1px 0 ${activeWaxColor.highlightColor}`,
                    }}
                    className="text-2xl font-bold font-serif"
                  >
                    {waxInitial}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
