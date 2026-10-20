import React, { useState } from 'react';
import {
  CreditCard,
  BookOpen,
  Coffee,
  Heart,
  Package,
  Sparkles,
  Download,
  RotateCcw,
  Sliders,
  Type,
  Maximize2,
  Palette,
  Check,
  Copy,
  Layout,
  ExternalLink,
} from 'lucide-react';
import { FontMetadata, GlyphData } from '../types/font';

interface RealWorldSpecimensProps {
  fontFamilyName: string;
  metadata: FontMetadata;
  glyphs: Record<string, GlyphData>;
  onExportClick?: () => void;
}

export type ScenarioType = 'business-card' | 'book-cover' | 'cafe-menu' | 'invitation' | 'packaging' | 'editorial-poster';

interface ScenarioPreset {
  id: ScenarioType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  category: string;
}

const SCENARIOS: ScenarioPreset[] = [
  {
    id: 'business-card',
    label: 'Business Card',
    icon: CreditCard,
    description: 'Double-sided tactile card with signature branding, titles, and contact lines',
    category: 'Identity',
  },
  {
    id: 'book-cover',
    label: 'Book Cover',
    icon: BookOpen,
    description: 'Literary hardcover dust-jacket with title, subtitle, author byline, and spine',
    category: 'Editorial',
  },
  {
    id: 'cafe-menu',
    label: 'Chalkboard Bistro Menu',
    icon: Coffee,
    description: 'Hand-lettered cafe slate board with specials, pour-overs, and prices',
    category: 'Commercial',
  },
  {
    id: 'invitation',
    label: 'Wedding & Event Card',
    icon: Heart,
    description: 'Luxury deckle-edge invitation card with gold foil accents and formal script',
    category: 'Stationery',
  },
  {
    id: 'packaging',
    label: 'Apothecary Label',
    icon: Package,
    description: 'Artisan candle and botanical perfume label with batch notes and maker seal',
    category: 'Packaging',
  },
  {
    id: 'editorial-poster',
    label: 'Typography Poster',
    icon: Layout,
    description: 'Gallery print layout featuring oversized display quotes and specimen notes',
    category: 'Print',
  },
];

const COLOR_THEMES = [
  { id: 'ivory', name: 'Cotton Ivory', bg: '#faf8f2', cardBg: '#ffffff', text: '#1e293b', accent: '#0f766e', border: '#e2e8f0' },
  { id: 'noir', name: 'Matte Noir & Gold', bg: '#0b0f19', cardBg: '#111827', text: '#f8fafc', accent: '#fbbf24', border: '#1f2937' },
  { id: 'terracotta', name: 'Warm Terracotta', bg: '#fbf7f4', cardBg: '#f6ede8', text: '#431407', accent: '#c2410c', border: '#fed7aa' },
  { id: 'forest', name: 'Alpine Forest', bg: '#f3f7f4', cardBg: '#064e3b', text: '#ecfdf5', accent: '#34d399', border: '#047857' },
  { id: 'navy', name: 'Deep Royal Navy', bg: '#f0f4f8', cardBg: '#0f172a', text: '#f8fafc', accent: '#38bdf8', border: '#1e293b' },
];

export const RealWorldSpecimens: React.FC<RealWorldSpecimensProps> = ({
  fontFamilyName,
  metadata,
  glyphs,
  onExportClick,
}) => {
  const [activeScenario, setActiveScenario] = useState<ScenarioType>('business-card');
  const [activeTheme, setActiveTheme] = useState(COLOR_THEMES[0]);
  const [scaleMultiplier, setScaleMultiplier] = useState<number>(1);
  const [copiedNotification, setCopiedNotification] = useState(false);

  // Business Card State
  const [bcData, setBcData] = useState({
    name: 'Julian Sterling',
    title: 'Lead Architect & Typographer',
    studio: 'Studio Sterling & Co.',
    slogan: 'Crafting spaces and letterforms with organic tactility.',
    email: 'julian@studiosterling.design',
    phone: '+1 (555) 382-9014',
    city: 'San Francisco · London',
    website: 'studiosterling.design',
  });

  // Book Cover State
  const [bcCoverData, setBcCoverData] = useState({
    genreTag: 'A MEMOIR OF INK AND SILENCE',
    title: 'The Art of Slow Living',
    subtitle: 'Observations on Penmanship, Quiet Hours, and the Tactile World',
    author: 'Eleanor Sterling Vance',
    blurb: '“A deeply intimate celebration of the analog craft. Unforgettable and grounding.” — The Literary Review',
    publisher: 'ATELIER EDITIONS',
    edition: 'FIRST MONOGRAPH 2026',
  });

  // Cafe Menu State
  const [menuData, setMenuData] = useState({
    cafeName: 'The Copper Kettle & Roastery',
    tagline: 'Hand-crafted coffees, slow teas & morning bakes',
    item1: 'Single-Origin Ethiopian Pour Over',
    desc1: 'Notes of jasmine, bergamot & wildflower honey',
    price1: '$6.50',
    item2: 'Smoked Vanilla Oat Latte',
    desc2: 'Double ristretto with house vanilla bean infusion',
    price2: '$7.00',
    item3: 'Cardamom & Sea Salt Morning Bun',
    desc3: 'Laminated pastry with crushed green cardamom',
    price3: '$5.50',
    item4: 'Artisan Sourdough Toast & Cultured Butter',
    desc4: 'Wild fermented loaf with seasonal berry compote',
    price4: '$6.00',
    footnote: 'Everything baked fresh at 5:00 AM · Organic dairy from local pastures',
  });

  // Wedding Invitation State
  const [inviteData, setInviteData] = useState({
    intro: 'TOGETHER WITH THEIR FAMILIES',
    names: 'Clara & Alexander',
    request: 'REQUEST THE HONOR OF YOUR PRESENCE AT THEIR WEDDING CELEBRATION',
    date: 'Saturday, the Fourteenth of October',
    year: 'TWO THOUSAND TWENTY-SIX',
    time: 'AT FOUR O’CLOCK IN THE AFTERNOON',
    venue: 'The Conservatory at Willow Creek',
    city: 'CARMEL-BY-THE-SEA, CALIFORNIA',
    reception: 'Dinner, dancing, and midnight merriment to follow',
  });

  // Packaging Label State
  const [pkgData, setPkgData] = useState({
    brand: 'BOTANICAL NO. 09',
    productName: 'Wild Bergamot & Smoked Cedar',
    category: 'Hand-Poured Soy Botanical Candle',
    notes: 'Top notes of Sicilian bergamot, heart of bruised fig leaf, grounded in aged Virginia cedar and amber resin.',
    batch: 'Batch No. 448 · Hand-poured in small vats',
    burnTime: 'Approx. 55 hours · 280g / 9.8 oz',
    signature: 'Blended by J. Sterling',
  });

  // Editorial Poster State
  const [posterData, setPosterData] = useState({
    quote: '“There is a profound honesty in human handwriting that no machine can ever simulate.”',
    author: 'Robert Bringhurst, The Elements of Typographic Style',
    footnote: 'Specimen in ' + (metadata.familyName || 'ScriptCraft') + ' · Vector contours compiled with OpenType font foundry.',
    yearTag: 'ISSUE 04 · ESSAYS ON FORM',
  });

  const fontStyle = {
    fontFamily: `"${fontFamilyName}", "Caveat", "Cedarville Cursive", cursive, serif`,
  };

  return (
    <div className="space-y-8">
      {/* Scenario Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {SCENARIOS.map((sc) => {
          const Icon = sc.icon;
          const isActive = activeScenario === sc.id;
          return (
            <button
              key={sc.id}
              onClick={() => setActiveScenario(sc.id)}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                isActive
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm ring-1 ring-slate-900'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
              <span>{sc.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                  isActive ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {sc.category}
              </span>
            </button>
          );
        })}
      </div>

      {/* Control Strip: Themes & Sizing */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs shadow-xs">
        {/* Left: Active scenario description */}
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-900">
            {SCENARIOS.find((s) => s.id === activeScenario)?.label}
          </span>
          <span className="text-slate-400">·</span>
          <span className="text-slate-500 hidden sm:inline">
            {SCENARIOS.find((s) => s.id === activeScenario)?.description}
          </span>
        </div>

        {/* Right: Theme swatches and scale */}
        <div className="flex items-center gap-6">
          {/* Color finishes */}
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-600">Material Theme:</span>
            <div className="flex items-center gap-1.5">
              {COLOR_THEMES.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => setActiveTheme(theme)}
                  style={{ backgroundColor: theme.cardBg }}
                  className={`w-5 h-5 rounded-full border-2 transition-transform ${
                    activeTheme.id === theme.id
                      ? 'border-emerald-500 scale-110 ring-2 ring-emerald-400/40 shadow-xs'
                      : 'border-slate-300 hover:scale-105'
                  }`}
                  title={theme.name}
                />
              ))}
            </div>
          </div>

          {/* Scale slider */}
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-mono">Scale: {Math.round(scaleMultiplier * 100)}%</span>
            <input
              type="range"
              min="0.8"
              max="1.3"
              step="0.05"
              value={scaleMultiplier}
              onChange={(e) => setScaleMultiplier(Number(e.target.value))}
              className="w-20 accent-slate-900"
            />
          </div>

          <div className="text-[11px] text-slate-400 font-mono hidden md:inline">
            Editable text: click any line to edit
          </div>
        </div>
      </div>

      {/* Scenario Stage */}
      <div
        style={{ backgroundColor: activeTheme.bg }}
        className="rounded-2xl border border-slate-200/80 p-6 md:p-12 min-h-[580px] flex items-center justify-center transition-colors shadow-inner overflow-hidden relative"
      >
        {/* 1. BUSINESS CARD LAYOUT */}
        {activeScenario === 'business-card' && (
          <div
            style={{ transform: `scale(${scaleMultiplier})` }}
            className="flex flex-col lg:flex-row items-center gap-8 transition-transform origin-center max-w-4xl w-full"
          >
            {/* Front of Card */}
            <div
              style={{
                backgroundColor: activeTheme.cardBg,
                color: activeTheme.text,
                borderColor: activeTheme.border,
              }}
              className="w-full max-w-[420px] aspect-[1.75/1] rounded-2xl border p-8 flex flex-col justify-between shadow-2xl relative overflow-hidden group select-none"
            >
              {/* Subtle top edge metallic foil accent */}
              <div
                style={{ backgroundColor: activeTheme.accent }}
                className="absolute top-0 left-0 right-0 h-1 opacity-75"
              />

              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-mono tracking-widest opacity-60">
                  EST. 2026 · PRIVATE PRACTICE
                </span>
                <span
                  style={{ color: activeTheme.accent }}
                  className="text-xs font-serif font-bold tracking-widest"
                >
                  ✦
                </span>
              </div>

              {/* Large Handwritten Name */}
              <div className="space-y-1 my-auto">
                <input
                  type="text"
                  value={bcData.name}
                  onChange={(e) => setBcData({ ...bcData, name: e.target.value })}
                  style={fontStyle}
                  className="w-full bg-transparent border-none outline-none text-4xl sm:text-5xl font-normal leading-tight tracking-wide"
                  placeholder="Your Name"
                />
                <input
                  type="text"
                  value={bcData.title}
                  onChange={(e) => setBcData({ ...bcData, title: e.target.value })}
                  className="w-full bg-transparent border-none outline-none text-xs font-mono uppercase tracking-widest opacity-75"
                  placeholder="Your Title"
                />
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono opacity-60 border-t border-current/10 pt-3">
                <input
                  type="text"
                  value={bcData.studio}
                  onChange={(e) => setBcData({ ...bcData, studio: e.target.value })}
                  className="bg-transparent border-none outline-none text-[11px] font-mono tracking-wider w-full"
                  placeholder="Studio Name"
                />
              </div>
            </div>

            {/* Back of Card */}
            <div
              style={{
                backgroundColor: activeTheme.cardBg,
                color: activeTheme.text,
                borderColor: activeTheme.border,
              }}
              className="w-full max-w-[420px] aspect-[1.75/1] rounded-2xl border p-8 flex flex-col justify-between shadow-2xl relative overflow-hidden group select-none"
            >
              <div className="flex items-center justify-between">
                <span
                  style={{ color: activeTheme.accent }}
                  className="text-xs font-mono uppercase tracking-wider"
                >
                  Studio Contact
                </span>
                <span className="text-[10px] font-mono opacity-50">{bcData.city}</span>
              </div>

              {/* Handwritten Slogan / Sign-off */}
              <div className="my-auto py-2">
                <textarea
                  value={bcData.slogan}
                  onChange={(e) => setBcData({ ...bcData, slogan: e.target.value })}
                  style={fontStyle}
                  rows={2}
                  className="w-full bg-transparent border-none outline-none text-2xl sm:text-3xl font-normal leading-snug resize-none focus:text-slate-950 focus:opacity-100 transition-colors"
                  placeholder="Handwritten slogan or personal motto"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono opacity-70 border-t border-current/10 pt-3">
                <input
                  type="text"
                  value={bcData.email}
                  onChange={(e) => setBcData({ ...bcData, email: e.target.value })}
                  className="bg-transparent border-none outline-none truncate focus:text-slate-950 focus:opacity-100 transition-colors"
                  placeholder="email"
                />
                <input
                  type="text"
                  value={bcData.website}
                  onChange={(e) => setBcData({ ...bcData, website: e.target.value })}
                  className="bg-transparent border-none outline-none text-right truncate focus:text-slate-950 focus:opacity-100 transition-colors"
                  placeholder="website"
                />
              </div>
            </div>
          </div>
        )}

        {/* 2. BOOK COVER TEMPLATE */}
        {activeScenario === 'book-cover' && (
          <div
            style={{ transform: `scale(${scaleMultiplier})` }}
            className="flex items-center justify-center transition-transform origin-center max-w-xl w-full"
          >
            {/* Book Dust Jacket */}
            <div
              style={{
                backgroundColor: activeTheme.cardBg,
                color: activeTheme.text,
                borderColor: activeTheme.border,
              }}
              className="w-full max-w-[400px] aspect-[1/1.55] rounded-r-2xl rounded-l-xs border-r-8 border-t-2 border-b-2 border-l-[14px] border-l-black/30 p-8 sm:p-10 flex flex-col justify-between shadow-2xl relative overflow-hidden select-none"
            >
              {/* Embossed book spine crease visual */}
              <div className="absolute top-0 bottom-0 left-0 w-3 bg-gradient-to-r from-black/25 via-transparent to-white/10 pointer-events-none" />

              {/* Top: Genre badge */}
              <div className="space-y-2 text-center border-b border-current/15 pb-4">
                <input
                  type="text"
                  value={bcCoverData.genreTag}
                  onChange={(e) => setBcCoverData({ ...bcCoverData, genreTag: e.target.value })}
                  className="w-full text-center bg-transparent border-none outline-none text-[10px] font-mono uppercase tracking-[0.25em] opacity-60"
                  placeholder="GENRE TAG"
                />
              </div>

              {/* Center: Title in Big Custom Handwriting */}
              <div className="text-center space-y-4 my-auto py-6">
                <textarea
                  value={bcCoverData.title}
                  onChange={(e) => setBcCoverData({ ...bcCoverData, title: e.target.value })}
                  style={fontStyle}
                  rows={2}
                  className="w-full text-center bg-transparent border-none outline-none text-4xl sm:text-5xl lg:text-6xl font-normal leading-tight resize-none"
                  placeholder="Book Title"
                />

                <div
                  style={{ backgroundColor: activeTheme.accent }}
                  className="w-12 h-0.5 mx-auto opacity-80"
                />

                <textarea
                  value={bcCoverData.subtitle}
                  onChange={(e) => setBcCoverData({ ...bcCoverData, subtitle: e.target.value })}
                  rows={2}
                  className="w-full text-center bg-transparent border-none outline-none text-xs sm:text-sm font-serif italic opacity-75 resize-none leading-relaxed"
                  placeholder="Subtitle or descriptive text"
                />
              </div>

              {/* Bottom: Author & Publisher */}
              <div className="space-y-4 text-center border-t border-current/15 pt-5">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest opacity-50 block mb-1">
                    BY THE AUTHOR
                  </span>
                  <input
                    type="text"
                    value={bcCoverData.author}
                    onChange={(e) => setBcCoverData({ ...bcCoverData, author: e.target.value })}
                    style={fontStyle}
                    className="w-full text-center bg-transparent border-none outline-none text-2xl sm:text-3xl font-medium tracking-wide"
                    placeholder="Author Name"
                  />
                </div>

                <div className="flex items-center justify-between text-[9px] font-mono opacity-50 pt-2 border-t border-current/10">
                  <span>{bcCoverData.edition}</span>
                  <span className="uppercase tracking-widest">{bcCoverData.publisher}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. CAFE BISTRO CHALKBOARD MENU */}
        {activeScenario === 'cafe-menu' && (
          <div
            style={{ transform: `scale(${scaleMultiplier})` }}
            className="flex items-center justify-center transition-transform origin-center max-w-2xl w-full"
          >
            {/* Wooden Slate Frame */}
            <div className="w-full bg-[#1e1b18] p-4 sm:p-6 rounded-2xl shadow-2xl border-4 border-[#3a2f26] ring-8 ring-[#241c15]">
              {/* Slate Chalkboard interior */}
              <div className="bg-[#14171a] text-slate-100 p-6 sm:p-8 rounded-xl border border-white/10 shadow-inner relative space-y-6">
                {/* Chalkboard Header */}
                <div className="text-center space-y-2 border-b border-dashed border-white/20 pb-5">
                  <span className="text-amber-400 font-mono text-[10px] uppercase tracking-[0.3em]">
                    ✦ TODAY'S SPECIALS & HAND-POURS ✦
                  </span>
                  <input
                    type="text"
                    value={menuData.cafeName}
                    onChange={(e) => setMenuData({ ...menuData, cafeName: e.target.value })}
                    style={fontStyle}
                    className="w-full text-center bg-transparent border-none outline-none text-3xl sm:text-5xl text-white font-normal leading-tight"
                    placeholder="Cafe Name"
                  />
                  <p className="text-xs text-slate-400 font-serif italic">
                    {menuData.tagline}
                  </p>
                </div>

                {/* Menu Items List */}
                <div className="space-y-4">
                  {/* Item 1 */}
                  <div className="flex items-baseline justify-between gap-4 border-b border-white/10 pb-3">
                    <div className="space-y-0.5">
                      <input
                        type="text"
                        value={menuData.item1}
                        onChange={(e) => setMenuData({ ...menuData, item1: e.target.value })}
                        style={fontStyle}
                        className="bg-transparent border-none outline-none text-2xl text-amber-200 w-full"
                      />
                      <input
                        type="text"
                        value={menuData.desc1}
                        onChange={(e) => setMenuData({ ...menuData, desc1: e.target.value })}
                        className="bg-transparent border-none outline-none text-xs text-slate-400 font-sans block w-full"
                      />
                    </div>
                    <span
                      style={fontStyle}
                      className="text-2xl text-amber-300 font-bold shrink-0"
                    >
                      {menuData.price1}
                    </span>
                  </div>

                  {/* Item 2 */}
                  <div className="flex items-baseline justify-between gap-4 border-b border-white/10 pb-3">
                    <div className="space-y-0.5">
                      <input
                        type="text"
                        value={menuData.item2}
                        onChange={(e) => setMenuData({ ...menuData, item2: e.target.value })}
                        style={fontStyle}
                        className="bg-transparent border-none outline-none text-2xl text-amber-200 w-full"
                      />
                      <input
                        type="text"
                        value={menuData.desc2}
                        onChange={(e) => setMenuData({ ...menuData, desc2: e.target.value })}
                        className="bg-transparent border-none outline-none text-xs text-slate-400 font-sans block w-full"
                      />
                    </div>
                    <span
                      style={fontStyle}
                      className="text-2xl text-amber-300 font-bold shrink-0"
                    >
                      {menuData.price2}
                    </span>
                  </div>

                  {/* Item 3 */}
                  <div className="flex items-baseline justify-between gap-4 border-b border-white/10 pb-3">
                    <div className="space-y-0.5">
                      <input
                        type="text"
                        value={menuData.item3}
                        onChange={(e) => setMenuData({ ...menuData, item3: e.target.value })}
                        style={fontStyle}
                        className="bg-transparent border-none outline-none text-2xl text-amber-200 w-full"
                      />
                      <input
                        type="text"
                        value={menuData.desc3}
                        onChange={(e) => setMenuData({ ...menuData, desc3: e.target.value })}
                        className="bg-transparent border-none outline-none text-xs text-slate-400 font-sans block w-full"
                      />
                    </div>
                    <span
                      style={fontStyle}
                      className="text-2xl text-amber-300 font-bold shrink-0"
                    >
                      {menuData.price3}
                    </span>
                  </div>
                </div>

                {/* Footer signoff */}
                <div className="text-center pt-2">
                  <input
                    type="text"
                    value={menuData.footnote}
                    onChange={(e) => setMenuData({ ...menuData, footnote: e.target.value })}
                    style={fontStyle}
                    className="w-full text-center bg-transparent border-none outline-none text-lg text-emerald-300 opacity-90"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. WEDDING INVITATION CARD */}
        {activeScenario === 'invitation' && (
          <div
            style={{ transform: `scale(${scaleMultiplier})` }}
            className="flex items-center justify-center transition-transform origin-center max-w-xl w-full"
          >
            {/* Deckle edge archival paper */}
            <div className="w-full max-w-[460px] aspect-[1/1.42] bg-[#fbf9f5] text-[#2c2724] p-8 sm:p-12 rounded-xl border border-[#e8dfd4] shadow-2xl flex flex-col justify-between text-center relative select-none">
              {/* Foil border frame */}
              <div className="absolute inset-4 border border-[#d4af37]/40 pointer-events-none rounded-lg" />
              <div className="absolute inset-5 border border-dashed border-[#d4af37]/20 pointer-events-none rounded-md" />

              <div className="space-y-2 pt-2">
                <input
                  type="text"
                  value={inviteData.intro}
                  onChange={(e) => setInviteData({ ...inviteData, intro: e.target.value })}
                  className="w-full text-center bg-transparent border-none outline-none text-[10px] font-serif tracking-[0.25em] text-[#8c827a]"
                />
              </div>

              {/* Couple's Names in Dramatic Handwriting Script */}
              <div className="py-6 space-y-2">
                <textarea
                  value={inviteData.names}
                  onChange={(e) => setInviteData({ ...inviteData, names: e.target.value })}
                  style={fontStyle}
                  rows={2}
                  className="w-full text-center bg-transparent border-none outline-none text-5xl sm:text-6xl text-[#1e1b18] font-normal leading-snug resize-none"
                  placeholder="Names"
                />

                <span className="text-[#d4af37] text-lg block">❦</span>

                <textarea
                  value={inviteData.request}
                  onChange={(e) => setInviteData({ ...inviteData, request: e.target.value })}
                  rows={2}
                  className="w-full text-center bg-transparent border-none outline-none text-xs font-serif italic text-[#6e665f] leading-relaxed resize-none"
                />
              </div>

              {/* Date & Location */}
              <div className="space-y-3 pb-2 border-t border-[#e2d7cb] pt-4">
                <div className="space-y-0.5">
                  <input
                    type="text"
                    value={inviteData.date}
                    onChange={(e) => setInviteData({ ...inviteData, date: e.target.value })}
                    style={fontStyle}
                    className="w-full text-center bg-transparent border-none outline-none text-2xl text-[#1e1b18]"
                  />
                  <input
                    type="text"
                    value={inviteData.year}
                    onChange={(e) => setInviteData({ ...inviteData, year: e.target.value })}
                    className="w-full text-center bg-transparent border-none outline-none text-[10px] font-mono tracking-widest text-[#8c827a]"
                  />
                </div>

                <div className="space-y-0.5 pt-1">
                  <input
                    type="text"
                    value={inviteData.venue}
                    onChange={(e) => setInviteData({ ...inviteData, venue: e.target.value })}
                    className="w-full text-center bg-transparent border-none outline-none text-xs font-serif font-bold tracking-wide text-[#3d3631]"
                  />
                  <input
                    type="text"
                    value={inviteData.city}
                    onChange={(e) => setInviteData({ ...inviteData, city: e.target.value })}
                    className="w-full text-center bg-transparent border-none outline-none text-[10px] font-mono tracking-widest text-[#8c827a]"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 5. APOTHECARY PACKAGING LABEL */}
        {activeScenario === 'packaging' && (
          <div
            style={{ transform: `scale(${scaleMultiplier})` }}
            className="flex items-center justify-center transition-transform origin-center max-w-md w-full"
          >
            {/* Cylindrical Jar Label */}
            <div className="w-full bg-[#fcfaf7] text-slate-800 p-8 rounded-xl border border-slate-300 shadow-2xl space-y-6 relative select-none">
              <div className="flex items-center justify-between border-b border-slate-300 pb-3 text-[10px] font-mono text-slate-500">
                <span>{pkgData.brand}</span>
                <span className="text-emerald-700 font-bold">100% PURE SOY</span>
              </div>

              {/* Fragrance Name */}
              <div className="space-y-1 py-2 text-center">
                <textarea
                  value={pkgData.productName}
                  onChange={(e) => setPkgData({ ...pkgData, productName: e.target.value })}
                  style={fontStyle}
                  rows={2}
                  className="w-full text-center bg-transparent border-none outline-none text-4xl sm:text-5xl font-normal leading-tight text-slate-900 resize-none"
                  placeholder="Product Name"
                />
                <input
                  type="text"
                  value={pkgData.category}
                  onChange={(e) => setPkgData({ ...pkgData, category: e.target.value })}
                  className="w-full text-center bg-transparent border-none outline-none text-xs font-mono uppercase tracking-widest text-slate-500"
                />
              </div>

              {/* Olfactory / Product Notes */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-center">
                <textarea
                  value={pkgData.notes}
                  onChange={(e) => setPkgData({ ...pkgData, notes: e.target.value })}
                  rows={2}
                  className="w-full text-center bg-transparent border-none outline-none text-xs font-serif italic text-slate-600 leading-relaxed resize-none"
                />
              </div>

              {/* Maker's signature line */}
              <div className="border-t border-slate-300 pt-4 flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-mono text-slate-400 uppercase block">
                    {pkgData.batch}
                  </span>
                  <span className="text-[9px] font-mono text-slate-400">
                    {pkgData.burnTime}
                  </span>
                </div>

                <div className="text-right">
                  <input
                    type="text"
                    value={pkgData.signature}
                    onChange={(e) => setPkgData({ ...pkgData, signature: e.target.value })}
                    style={fontStyle}
                    className="text-right bg-transparent border-none outline-none text-xl text-emerald-800"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 6. EDITORIAL TYPOGRAPHY POSTER */}
        {activeScenario === 'editorial-poster' && (
          <div
            style={{ transform: `scale(${scaleMultiplier})` }}
            className="flex items-center justify-center transition-transform origin-center max-w-2xl w-full"
          >
            {/* Gallery Print Poster */}
            <div className="w-full aspect-[1/1.4] bg-[#f8f6f0] text-slate-900 p-8 sm:p-14 rounded-xl border border-slate-300 shadow-2xl flex flex-col justify-between relative select-none">
              {/* Header metadata */}
              <div className="flex items-center justify-between text-[10px] font-mono tracking-widest text-slate-400 border-b border-slate-300 pb-4">
                <span>SCRIPTCRAFT TYPOGRAPHY ARCHIVE</span>
                <span>{posterData.yearTag}</span>
              </div>

              {/* Giant Display Quote */}
              <div className="my-auto py-8">
                <textarea
                  value={posterData.quote}
                  onChange={(e) => setPosterData({ ...posterData, quote: e.target.value })}
                  style={fontStyle}
                  rows={4}
                  className="w-full bg-transparent border-none outline-none text-4xl sm:text-6xl lg:text-7xl font-normal leading-tight text-slate-900 resize-none tracking-tight"
                  placeholder="Type an editorial quote"
                />

                <input
                  type="text"
                  value={posterData.author}
                  onChange={(e) => setPosterData({ ...posterData, author: e.target.value })}
                  className="w-full bg-transparent border-none outline-none text-xs font-mono uppercase tracking-widest text-slate-500 mt-6 block"
                />
              </div>

              {/* Character Specimen Waterfall on the bottom */}
              <div className="border-t border-slate-300 pt-5 space-y-2">
                <div
                  style={fontStyle}
                  className="text-2xl sm:text-3xl tracking-widest text-slate-800 truncate"
                >
                  Aa Bb Cc Dd Ee Ff Gg Hh Ii Jj Kk Ll Mm Nn Oo Pp Qq Rr Ss Tt Uu Vv Ww Xx Yy Zz 0123456789
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <input
                    type="text"
                    value={posterData.footnote}
                    onChange={(e) => setPosterData({ ...posterData, footnote: e.target.value })}
                    className="w-full bg-transparent border-none outline-none text-[10px] font-mono text-slate-400"
                  />
                  <span className="shrink-0">1000 UPM · TRUETYPE</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
