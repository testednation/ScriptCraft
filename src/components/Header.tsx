import React from 'react';
import {
  PenTool,
  Download,
  Sparkles,
  BookOpen,
  Grid,
  Layers,
  Eye,
  Sliders,
  Link2,
  LayoutGrid,
  Camera,
  Laptop,
  HardDriveDownload,
  Printer,
  Keyboard,
  Undo,
  Redo,
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  activeTab: 'studio' | 'fontmap' | 'ligatures' | 'kerning' | 'presets' | 'scan' | 'ai' | 'specimen' | 'worksheets' | 'export';
  setActiveTab: (tab: 'studio' | 'fontmap' | 'ligatures' | 'kerning' | 'presets' | 'scan' | 'ai' | 'specimen' | 'worksheets' | 'export') => void;
  fontName: string;
  completedGlyphsCount: number;
  totalGlyphsCount: number;
  onQuickDownload: () => void;
  onOpenOfflineExport: () => void;
  onOpenShortcuts?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  undoCount?: number;
  redoCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  fontName,
  completedGlyphsCount,
  totalGlyphsCount,
  onQuickDownload,
  onOpenOfflineExport,
  onOpenShortcuts,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  undoCount,
  redoCount,
}) => {
  return (
    <header className="flex flex-row items-center justify-between gap-2 sm:gap-4 px-3 sm:px-6 py-2 sm:py-3 border-b border-slate-200 bg-white/95 backdrop-blur-sm sticky top-0 z-40">
      {/* Zone 1: Brand Wordmark & Glyph Count */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('studio');
          }}
          className="flex items-center gap-2 group"
        >
          <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center shadow-sm group-hover:bg-slate-800 transition-colors">
            <PenTool className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm sm:text-base font-bold tracking-tight text-slate-900 whitespace-nowrap font-['Plus_Jakarta_Sans']">
              ScriptCraft
            </span>
          </div>
        </a>

        {/* Font glyph progress badge */}
        <div className="flex items-center gap-1 text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
          <span className="font-bold text-slate-800">{completedGlyphsCount}</span>
          <span>/{totalGlyphsCount}</span>
        </div>
      </div>

      {/* Mobile Top Action Buttons (Visible on screens < md) */}
      <div className="flex md:hidden items-center gap-1.5">
        {(onUndo || onRedo) && (
          <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5 shadow-2xs">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className="p-1.5 text-slate-700 hover:bg-slate-100 disabled:opacity-35 rounded min-w-[32px] min-h-[32px] flex items-center justify-center"
              title="Undo"
            >
              <Undo className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className="p-1.5 text-slate-700 hover:bg-slate-100 disabled:opacity-35 rounded min-w-[32px] min-h-[32px] flex items-center justify-center"
              title="Redo"
            >
              <Redo className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <button
          onClick={onQuickDownload}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-all shadow-xs"
          title="Export TTF Font"
        >
          <Download className="w-3.5 h-3.5 text-emerald-400" />
          <span>Export</span>
        </button>
      </div>

      {/* Zone 2: Navigation Links - Visible on desktop/tablet, hidden on mobile */}
      <nav className="hidden md:flex items-center gap-1 text-sm font-medium text-slate-600 overflow-x-auto no-scrollbar py-1">
        <button
          onClick={() => setActiveTab('studio')}
          title="Glyph Studio [Ctrl+1]"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'studio'
              ? 'bg-slate-100 text-slate-900 font-semibold'
              : 'hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <PenTool className="w-3.5 h-3.5" />
          <span>Glyph Studio</span>
        </button>

        <button
          onClick={() => setActiveTab('fontmap')}
          title="Font Map [Ctrl+2]"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'fontmap'
              ? 'bg-slate-100 text-slate-900 font-semibold'
              : 'hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <LayoutGrid className="w-3.5 h-3.5 text-emerald-600" />
          <span>Font Map</span>
        </button>

        <button
          onClick={() => setActiveTab('scan')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'scan'
              ? 'bg-emerald-100 text-emerald-950 font-bold border border-emerald-300 shadow-2xs'
              : 'bg-emerald-50/70 text-emerald-800 border border-emerald-200/80 hover:bg-emerald-100 hover:text-emerald-900'
          }`}
          title="Upload handwriting photo and isolate characters [Ctrl+3]"
        >
          <Camera className="w-3.5 h-3.5 text-emerald-600" />
          <span className="font-semibold">Upload Photo & Scan</span>
          <span className="px-1 py-0.2 text-[9px] bg-emerald-600 text-white rounded font-bold uppercase tracking-wider">
            Photo
          </span>
        </button>

        <button
          onClick={() => setActiveTab('ligatures')}
          title="Ligatures [Ctrl+4]"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'ligatures'
              ? 'bg-slate-100 text-slate-900 font-semibold'
              : 'hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Link2 className="w-3.5 h-3.5 text-indigo-600" />
          <span>Ligatures</span>
        </button>

        <button
          onClick={() => setActiveTab('kerning')}
          title="Kerning [Ctrl+5]"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'kerning'
              ? 'bg-slate-100 text-slate-900 font-semibold'
              : 'hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Sliders className="w-3.5 h-3.5 text-sky-600" />
          <span>Kerning</span>
        </button>

        <button
          onClick={() => setActiveTab('presets')}
          title="Handwriting Styles [Ctrl+6]"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'presets'
              ? 'bg-slate-100 text-slate-900 font-semibold'
              : 'hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Handwriting Styles</span>
        </button>

        <button
          onClick={() => setActiveTab('ai')}
          title="AI Penmanship [Ctrl+7]"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'ai'
              ? 'bg-slate-100 text-slate-900 font-semibold'
              : 'hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>AI Penmanship</span>
        </button>

        <button
          onClick={() => setActiveTab('specimen')}
          title="Specimen Preview [Ctrl+8]"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'specimen'
              ? 'bg-slate-100 text-slate-900 font-semibold'
              : 'hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Eye className="w-3.5 h-3.5 text-rose-500" />
          <span>Specimen Preview</span>
        </button>

        <button
          onClick={() => setActiveTab('worksheets')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'worksheets'
              ? 'bg-emerald-50 text-emerald-950 font-bold border border-emerald-300 shadow-2xs'
              : 'hover:text-slate-900 hover:bg-slate-50'
          }`}
          title="Printable Calligraphy Rulings & Penmanship Practice Worksheets [Ctrl+9]"
        >
          <Printer className="w-3.5 h-3.5 text-emerald-600" />
          <span>Worksheets</span>
          <span className="px-1 py-0.2 text-[9px] bg-emerald-600 text-white rounded font-bold uppercase tracking-wider">
            Print
          </span>
        </button>
      </nav>

      {/* Zone 3: Primary Actions (Desktop) */}
      <div className="hidden md:flex items-center gap-2.5 shrink-0">
        {/* Project Multi-Step Undo / Redo */}
        {(onUndo || onRedo) && (
          <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5 shadow-2xs">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-35 disabled:cursor-not-allowed rounded transition-colors"
              title={`Project Undo: Revert multi-step font and kerning edits [Ctrl+Z]${undoCount ? ` (${undoCount} in stack)` : ''}`}
            >
              <Undo className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden lg:inline">Undo</span>
              {undoCount !== undefined && undoCount > 0 && (
                <span className="text-[10px] font-mono px-1 rounded bg-slate-100 text-slate-700 font-semibold">
                  {undoCount}
                </span>
              )}
            </button>
            <div className="w-[1px] h-3.5 bg-slate-200" />
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-35 disabled:cursor-not-allowed rounded transition-colors"
              title={`Project Redo: Restore reverted font and kerning edits [Ctrl+Y / Ctrl+Shift+Z]${redoCount ? ` (${redoCount} available)` : ''}`}
            >
              <Redo className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden lg:inline">Redo</span>
              {redoCount !== undefined && redoCount > 0 && (
                <span className="text-[10px] font-mono px-1 rounded bg-slate-100 text-slate-700 font-semibold">
                  {redoCount}
                </span>
              )}
            </button>
          </div>
        )}

        {/* In-app PWA install button */}
        <PWAInstallButton />

        {onOpenShortcuts && (
          <button
            onClick={onOpenShortcuts}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-600 bg-white hover:bg-slate-100 hover:text-slate-900 border border-slate-200 rounded-lg active:scale-[0.98] transition-all whitespace-nowrap shrink-0 shadow-2xs"
            title="Keyboard Shortcuts Cheatsheet [?]"
          >
            <Keyboard className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden xl:inline text-[10px] font-mono font-medium text-slate-500 border border-slate-200 px-1 rounded bg-slate-50">?</span>
          </button>
        )}

        <button
          onClick={onOpenOfflineExport}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg active:scale-[0.98] transition-all whitespace-nowrap shrink-0 shadow-2xs"
          title="Export standalone webapp or download portable offline package [Ctrl+O]"
        >
          <Laptop className="w-3.5 h-3.5 text-emerald-600" />
          <span>Export Offline App</span>
        </button>

        <button
          onClick={() => setActiveTab('scan')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-300 rounded-lg hover:bg-emerald-100 active:scale-[0.98] transition-all whitespace-nowrap shrink-0 shadow-2xs"
          title="Upload photo of your handwriting to isolate characters [Ctrl+3]"
        >
          <Camera className="w-3.5 h-3.5 text-emerald-600" />
          <span>Upload Photo</span>
        </button>

        <div className="hidden xl:flex items-center gap-1.5 text-xs text-slate-500 font-mono tabular-nums px-2 border-r border-slate-200">
          <span>{fontName}</span>
          <span aria-hidden="true">·</span>
          <span>
            {completedGlyphsCount}/{totalGlyphsCount}
          </span>
        </div>

        <button
          onClick={onQuickDownload}
          className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 active:scale-[0.98] transition-all whitespace-nowrap shrink-0 shadow-sm"
          title="Download compiled TrueType Font (.ttf) [Ctrl+E]"
        >
          <Download className="w-3.5 h-3.5" />
          Export .TTF
        </button>
      </div>
    </header>
  );
};
