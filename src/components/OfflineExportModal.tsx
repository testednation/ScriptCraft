import React, { useState } from 'react';
import {
  Download,
  X,
  FileCode,
  Archive,
  Save,
  Upload,
  CheckCircle2,
  Wifi,
  WifiOff,
  Laptop,
  Check,
  Sparkles,
  Layers,
  HelpCircle,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { FontMetadata, GlyphData, KerningMap, LigatureData, PenSettings } from '../types/font';
import {
  downloadOfflineHtmlFile,
  downloadOfflineZipBundle,
  downloadProjectBackup,
  OfflineExportOptions,
} from '../utils/offlineExport';
import { usePWAInstall } from '../utils/usePWAInstall';
import { useOnlineStatus } from '../utils/useOnlineStatus';

interface OfflineExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  metadata: FontMetadata;
  glyphs: Record<string, GlyphData>;
  penSettings: PenSettings;
  slant: number;
  kerningMap: KerningMap;
  ligaturesMap: Record<string, LigatureData>;
  onImportProject: (data: {
    metadata?: FontMetadata;
    glyphs?: Record<string, GlyphData>;
    penSettings?: PenSettings;
    slant?: number;
    kerningMap?: KerningMap;
    ligaturesMap?: Record<string, LigatureData>;
  }) => void;
}

export const OfflineExportModal: React.FC<OfflineExportModalProps> = ({
  isOpen,
  onClose,
  metadata,
  glyphs,
  penSettings,
  slant,
  kerningMap,
  ligaturesMap,
  onImportProject,
}) => {
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const isOnline = useOnlineStatus();

  if (!isOpen) return null;

  const exportOptions: OfflineExportOptions = {
    metadata,
    glyphs,
    penSettings,
    slant,
    kerningMap,
    ligaturesMap,
  };

  const showCelebration = (label: string) => {
    setDownloadSuccess(label);
    confetti({
      particleCount: 60,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#10b981', '#0284c7', '#f59e0b'],
    });
    setTimeout(() => setDownloadSuccess(null), 3500);
  };

  const handleDownloadHtml = () => {
    downloadOfflineHtmlFile(exportOptions);
    showCelebration('Standalone Offline HTML Exported!');
  };

  const handleDownloadZip = async () => {
    setIsExportingZip(true);
    try {
      await downloadOfflineZipBundle(exportOptions);
      showCelebration('Complete Offline Bundle (.zip) Exported!');
    } catch (err) {
      console.error('Failed to create offline zip:', err);
      alert('Failed to package offline zip: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsExportingZip(false);
    }
  };

  const handleDownloadJson = () => {
    downloadProjectBackup(exportOptions);
    showCelebration('Project Backup (.scriptcraft.json) Saved!');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        onImportProject(parsed);
        showCelebration('Project Workspace Restored Successfully!');
      } catch (err) {
        alert('Invalid project file: ' + (err instanceof Error ? err.message : String(err)));
      }
    };
    reader.readAsText(file);
  };

  const validGlyphsCount = Object.values(glyphs).filter((g) => g.strokes.length > 0).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center shadow-sm">
              <Laptop className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold font-['Plus_Jakarta_Sans']">
                  Export WebApp for Offline Use
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-400/20 text-emerald-300 rounded-full border border-emerald-400/30 uppercase tracking-wider">
                  Zero Network Required
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Run ScriptCraft offline anywhere — on airplanes, remote studios, or USB drives
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Alert Banner */}
        {downloadSuccess && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-2.5 flex items-center justify-between text-xs font-semibold text-emerald-800 animate-in fade-in slide-in-from-top-1">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{downloadSuccess}</span>
            </div>
            <span className="text-[11px] text-emerald-600 font-normal">Ready for offline use</span>
          </div>
        )}

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Status summary */}
          <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
            <div className="flex items-center gap-2 text-slate-700">
              {isOnline ? (
                <>
                  <Wifi className="w-4 h-4 text-emerald-600" />
                  <span className="font-medium">Network: Connected</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4 text-amber-600" />
                  <span className="font-semibold text-amber-800">Operating in Offline Mode</span>
                </>
              )}
            </div>

            <div className="flex items-center gap-3 text-slate-600 font-mono text-[11px]">
              <span>{validGlyphsCount} Glyphs Ready</span>
              <span>·</span>
              <span>PWA Service Worker: Cached</span>
            </div>
          </div>

          {/* Export Options Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Option 1: Standalone Single-File HTML */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white hover:border-emerald-300 hover:shadow-md transition-all flex flex-col justify-between group">
              <div>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center mb-2.5 group-hover:bg-emerald-100 transition-colors">
                  <FileCode className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 mb-1">
                  Single-File WebApp (.html)
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed mb-3">
                  A 100% self-contained HTML file with embedded drawing canvas, glyph palette, and live specimen tester. Double-click to open in any browser with no server or internet needed.
                </p>
              </div>

              <button
                onClick={handleDownloadHtml}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-xs transition-all active:scale-[0.98]"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Standalone HTML</span>
              </button>
            </div>

            {/* Option 2: Portable Offline ZIP Package */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white hover:border-sky-300 hover:shadow-md transition-all flex flex-col justify-between group">
              <div>
                <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center mb-2.5 group-hover:bg-sky-100 transition-colors">
                  <Archive className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 mb-1">
                  Portable Bundle Package (.zip)
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed mb-3">
                  Complete offline distribution containing the standalone webapp, full font project backup JSON, one-click launcher scripts for Mac/Windows, and offline user guide.
                </p>
              </div>

              <button
                onClick={handleDownloadZip}
                disabled={isExportingZip}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-all active:scale-[0.98] disabled:opacity-50"
              >
                <Archive className="w-3.5 h-3.5 text-sky-400" />
                <span>{isExportingZip ? 'Packaging Zip...' : 'Download Offline ZIP Bundle'}</span>
              </button>
            </div>
          </div>

          {/* Option 3: Project State Backup & Restore */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/80 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase font-mono tracking-wider flex items-center gap-1.5">
                  <Save className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Project Data Backup & Offline Migration</span>
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Save all vector curves, strokes, kerning pairs, and font settings to a portable JSON file.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <button
                onClick={handleDownloadJson}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium shadow-2xs transition-all"
              >
                <Download className="w-3.5 h-3.5 text-indigo-600" />
                <span>Save Project (.scriptcraft.json)</span>
              </button>

              <label className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium shadow-2xs transition-all cursor-pointer">
                <Upload className="w-3.5 h-3.5 text-emerald-600" />
                <span>Restore / Load Project</span>
                <input
                  type="file"
                  accept=".json,.scriptcraft"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </label>
            </div>
          </div>

          {/* Option 4: PWA Home Screen Installation */}
          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/60 flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-700" />
                <h4 className="text-xs font-bold text-emerald-950">Install PWA on this Device</h4>
              </div>
              <p className="text-xs text-emerald-800 leading-relaxed">
                Install ScriptCraft as a native app on Chrome, Edge, macOS, Windows, iPad, or Android for full-screen offline access.
              </p>
            </div>

            {isInstalled ? (
              <span className="shrink-0 px-3 py-1.5 text-xs font-semibold text-emerald-900 bg-emerald-200/70 rounded-lg">
                Already Installed
              </span>
            ) : isInstallable ? (
              <button
                onClick={install}
                className="shrink-0 px-3.5 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-all active:scale-[0.98]"
              >
                Install App
              </button>
            ) : (
              <span className="shrink-0 text-xs text-emerald-800 font-medium">
                PWA Ready via browser menu
              </span>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
            <span>All font generation & vector curves run client-side in WebAssembly/JS.</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg text-slate-700 font-medium text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
