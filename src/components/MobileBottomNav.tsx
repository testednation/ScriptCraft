import React, { useState } from 'react';
import {
  PenTool,
  LayoutGrid,
  Printer,
  Camera,
  Layers,
  Sparkles,
  Eye,
  Sliders,
  Download,
  Laptop,
  X,
  Keyboard,
  ChevronRight,
} from 'lucide-react';

interface MobileBottomNavProps {
  activeTab: 'studio' | 'fontmap' | 'ligatures' | 'kerning' | 'presets' | 'scan' | 'ai' | 'specimen' | 'worksheets' | 'export';
  setActiveTab: (tab: 'studio' | 'fontmap' | 'ligatures' | 'kerning' | 'presets' | 'scan' | 'ai' | 'specimen' | 'worksheets' | 'export') => void;
  completedGlyphsCount: number;
  totalGlyphsCount: number;
  onQuickDownload: () => void;
  onOpenOfflineExport: () => void;
  onOpenShortcuts?: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  completedGlyphsCount,
  totalGlyphsCount,
  onQuickDownload,
  onOpenOfflineExport,
  onOpenShortcuts,
}) => {
  const [showMoreMenu, setShowMoreMenu] = useState<boolean>(false);

  const handleSelectTab = (tab: any) => {
    setActiveTab(tab);
    setShowMoreMenu(false);
  };

  const isMoreActive = [
    'specimen',
    'presets',
    'ligatures',
    'kerning',
    'ai',
  ].includes(activeTab);

  return (
    <>
      {/* Slide-Up Drawer for Secondary Modules on Mobile */}
      {showMoreMenu && (
        <div className="fixed inset-0 z-50 md:hidden animate-in fade-in duration-200">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setShowMoreMenu(false)}
          />

          {/* Bottom Drawer Card */}
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl border-t border-slate-200 shadow-2xl p-4 max-h-[80vh] overflow-y-auto animate-in slide-in-from-bottom duration-250">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center">
                  <Layers className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">ScriptCraft Tools</h3>
                  <p className="text-[11px] text-slate-500">Typography editors & font utilities</p>
                </div>
              </div>
              <button
                onClick={() => setShowMoreMenu(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modules Grid */}
            <div className="grid grid-cols-2 gap-2 py-3">
              <button
                onClick={() => handleSelectTab('specimen')}
                className={`flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all ${
                  activeTab === 'specimen'
                    ? 'border-indigo-600 bg-indigo-50/80 text-indigo-950 font-semibold'
                    : 'border-slate-200 bg-slate-50/60 text-slate-800 hover:bg-slate-100'
                }`}
              >
                <Eye className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold">Test Drive</div>
                  <div className="text-[10px] text-slate-500 leading-tight">Interactive real-world text specimen tester</div>
                </div>
              </button>

              <button
                onClick={() => handleSelectTab('presets')}
                className={`flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all ${
                  activeTab === 'presets'
                    ? 'border-indigo-600 bg-indigo-50/80 text-indigo-950 font-semibold'
                    : 'border-slate-200 bg-slate-50/60 text-slate-800 hover:bg-slate-100'
                }`}
              >
                <Sliders className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold">Styles & Presets</div>
                  <div className="text-[10px] text-slate-500 leading-tight">Architect, Cursive, Comic, Spencerian</div>
                </div>
              </button>

              <button
                onClick={() => handleSelectTab('ligatures')}
                className={`flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all ${
                  activeTab === 'ligatures'
                    ? 'border-indigo-600 bg-indigo-50/80 text-indigo-950 font-semibold'
                    : 'border-slate-200 bg-slate-50/60 text-slate-800 hover:bg-slate-100'
                }`}
              >
                <Layers className="w-4 h-4 text-violet-600 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold">Ligatures</div>
                  <div className="text-[10px] text-slate-500 leading-tight">Multi-character cursive connected glyphs</div>
                </div>
              </button>

              <button
                onClick={() => handleSelectTab('kerning')}
                className={`flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all ${
                  activeTab === 'kerning'
                    ? 'border-indigo-600 bg-indigo-50/80 text-indigo-950 font-semibold'
                    : 'border-slate-200 bg-slate-50/60 text-slate-800 hover:bg-slate-100'
                }`}
              >
                <Sliders className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold">Kerning Pairs</div>
                  <div className="text-[10px] text-slate-500 leading-tight">Fine-tune letter pair spacing adjustments</div>
                </div>
              </button>

              <button
                onClick={() => handleSelectTab('ai')}
                className={`flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all ${
                  activeTab === 'ai'
                    ? 'border-emerald-600 bg-emerald-50/80 text-emerald-950 font-semibold'
                    : 'border-slate-200 bg-slate-50/60 text-slate-800 hover:bg-slate-100'
                }`}
              >
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold">AI Penmanship</div>
                  <div className="text-[10px] text-slate-500 leading-tight">Handwriting critique, slant & tremor advice</div>
                </div>
              </button>

              <button
                onClick={() => {
                  setShowMoreMenu(false);
                  onOpenOfflineExport();
                }}
                className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/60 text-slate-800 hover:bg-slate-100 text-left transition-all"
              >
                <Laptop className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold">Offline Studio</div>
                  <div className="text-[10px] text-slate-500 leading-tight">Save complete webapp for offline use</div>
                </div>
              </button>
            </div>

            {/* Direct Export Action */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <button
                onClick={() => {
                  setShowMoreMenu(false);
                  onQuickDownload();
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-md hover:bg-slate-800 transition-all"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                <span>Export TrueType Font (.TTF)</span>
              </button>

              {onOpenShortcuts && (
                <button
                  onClick={() => {
                    setShowMoreMenu(false);
                    onOpenShortcuts();
                  }}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[11px] text-slate-500 hover:text-slate-800"
                >
                  <Keyboard className="w-3.5 h-3.5" />
                  <span>View Keyboard Shortcuts</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Persistent Bottom Bar on Mobile Screens (hidden on md and above) */}
      <nav
        aria-label="Mobile Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/95 backdrop-blur-md border-t border-slate-200 px-1 py-1 shadow-lg flex items-center justify-around select-none safe-area-pb"
      >
        {/* 1. Studio */}
        <button
          onClick={() => setActiveTab('studio')}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all min-h-[46px] ${
            activeTab === 'studio'
              ? 'text-slate-950 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
              activeTab === 'studio'
                ? 'bg-slate-900 text-emerald-400 shadow-xs scale-105'
                : 'text-slate-600'
            }`}
          >
            <PenTool className="w-4 h-4" />
          </div>
          <span className="text-[10px] tracking-tight mt-0.5">Studio</span>
        </button>

        {/* 2. Font Map */}
        <button
          onClick={() => setActiveTab('fontmap')}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all min-h-[46px] ${
            activeTab === 'fontmap'
              ? 'text-slate-950 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
              activeTab === 'fontmap'
                ? 'bg-slate-900 text-emerald-400 shadow-xs scale-105'
                : 'text-slate-600'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
          </div>
          <span className="text-[10px] tracking-tight mt-0.5">Font Map</span>
        </button>

        {/* 3. Worksheets */}
        <button
          onClick={() => setActiveTab('worksheets')}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all min-h-[46px] ${
            activeTab === 'worksheets'
              ? 'text-slate-950 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
              activeTab === 'worksheets'
                ? 'bg-emerald-600 text-white shadow-xs scale-105'
                : 'text-slate-600'
            }`}
          >
            <Printer className="w-4 h-4" />
          </div>
          <span className="text-[10px] tracking-tight mt-0.5">Worksheets</span>
        </button>

        {/* 4. Scan / Camera */}
        <button
          onClick={() => setActiveTab('scan')}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all min-h-[46px] ${
            activeTab === 'scan'
              ? 'text-slate-950 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
              activeTab === 'scan'
                ? 'bg-emerald-600 text-white shadow-xs scale-105'
                : 'text-slate-600'
            }`}
          >
            <Camera className="w-4 h-4" />
          </div>
          <span className="text-[10px] tracking-tight mt-0.5">Scan</span>
        </button>

        {/* 5. More */}
        <button
          onClick={() => setShowMoreMenu((prev) => !prev)}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all min-h-[46px] ${
            isMoreActive || showMoreMenu
              ? 'text-slate-950 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
              isMoreActive || showMoreMenu
                ? 'bg-slate-900 text-emerald-400 shadow-xs scale-105'
                : 'text-slate-600'
            }`}
          >
            <Layers className="w-4 h-4" />
          </div>
          <span className="text-[10px] tracking-tight mt-0.5">More</span>
        </button>
      </nav>
    </>
  );
};
