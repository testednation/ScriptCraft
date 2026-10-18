import React, { useState } from 'react';
import {
  Download,
  X,
  Check,
  Copy,
  Laptop,
  Apple,
  Smartphone,
  Code,
  Sparkles,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { FontMetadata, GlyphData, KerningMap, LigatureData } from '../types/font';
import { buildOpenTypeFont } from '../utils/fontEngine';

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
  onOpenOfflineExport?: () => void;
}

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
  onOpenOfflineExport,
}) => {
  const [copiedCss, setCopiedCss] = useState(false);
  const [activeTab, setActiveTab] = useState<'mac' | 'win' | 'ios' | 'web'>('mac');
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const validGlyphsCount = Object.values(glyphs).filter((g) => g.strokes.length > 0).length;
  const activeKernCount = Object.values(kerningMap).filter((v) => v !== 0).length;
  const activeLigCount = Object.values(ligaturesMap).filter((l) => l.strokes.length > 0).length;

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
        pressureSensitivity
      );
      const safeFilename = `${(metadata.familyName || 'MyHandwriting').replace(/\s+/g, '_')}.ttf`;
      font.download(safeFilename);

      // Trigger festive celebratory confetti
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
}`;

  const handleCopyCss = () => {
    navigator.clipboard.writeText(cssSnippet);
    setCopiedCss(true);
    setTimeout(() => setCopiedCss(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
              <Download className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
                Export & Download Typeface
              </h2>
              <p className="text-xs text-slate-500 font-mono">
                {validGlyphsCount} glyphs · {activeLigCount} ligatures · {activeKernCount} kerning pairs ready
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Font Details Form */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-slate-900 uppercase font-mono tracking-wider">
              Font Metadata
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Font Family Name
                </label>
                <input
                  type="text"
                  value={metadata.familyName}
                  onChange={(e) =>
                    setMetadata((prev) => ({ ...prev, familyName: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                  placeholder="e.g. Sarah Script"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Style Name
                </label>
                <input
                  type="text"
                  value={metadata.styleName}
                  onChange={(e) =>
                    setMetadata((prev) => ({ ...prev, styleName: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                  placeholder="Regular"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Designer / Author
                </label>
                <input
                  type="text"
                  value={metadata.designer}
                  onChange={(e) =>
                    setMetadata((prev) => ({ ...prev, designer: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                  placeholder="Your Name"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Version</label>
                <input
                  type="text"
                  value={metadata.version}
                  onChange={(e) =>
                    setMetadata((prev) => ({ ...prev, version: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
                  placeholder="1.000"
                />
              </div>
            </div>
          </div>

          {/* Primary Action Button */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <button
              onClick={handleDownloadTTF}
              disabled={isExporting}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-semibold transition-all shadow-md active:scale-[0.99]"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Download TrueType Font (.TTF)</span>
            </button>
            <p className="text-[11px] text-center text-slate-500">
              Compatible with Microsoft Word, Apple Pages, Adobe Creative Cloud, Canva, Figma, and all standard apps.
            </p>
          </div>

          {/* Export WebApp Offline Option */}
          {onOpenOfflineExport && (
            <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between gap-3">
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
