import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { GlyphStudio } from './components/GlyphStudio';
import { FontMapView } from './components/FontMapView';
import { LigaturesEditor } from './components/LigaturesEditor';
import { KerningEditor } from './components/KerningEditor';
import { CommunityPresets } from './components/CommunityPresets';
import { TemplateScanView } from './components/TemplateScanView';
import { AiPenmanshipLab } from './components/AiPenmanshipLab';
import { SpecimenTester } from './components/SpecimenTester';
import { WorksheetStudio } from './components/WorksheetStudio';
import { ExportModal } from './components/ExportModal';
import { OfflineExportModal } from './components/OfflineExportModal';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { MobileBottomNav } from './components/MobileBottomNav';
import { FontMetadata, GlyphData, GlyphStroke, GlyphVariant, HandwritingPreset, KerningMap, LigatureData, PenSettings } from './types/font';
import { HANDWRITING_PRESETS } from './utils/presets';
import { buildOpenTypeFont, registerLiveFontFace } from './utils/fontEngine';
import { DEFAULT_INITIAL_KERNING } from './utils/kerningDefaults';
import { generateStarterLigatures } from './utils/ligatureDefaults';
import { autoCalculateAllBearings, SpacingPreset } from './utils/autoSpacing';
import {
  createProjectSnapshot,
  cloneGlyphsMap,
  cloneKerningMap,
  ProjectHistorySnapshot,
} from './utils/historyManager';

export default function App() {
  const [activeTab, setActiveTab] = useState<'studio' | 'fontmap' | 'ligatures' | 'kerning' | 'presets' | 'scan' | 'ai' | 'specimen' | 'worksheets' | 'export'>('studio');
  const [currentChar, setCurrentChar] = useState<string>('A');
  const [activePresetId, setActivePresetId] = useState<string>('architect');
  const [slant, setSlant] = useState<number>(0);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [isOfflineExportOpen, setIsOfflineExportOpen] = useState<boolean>(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState<boolean>(false);
  const [kerningMap, setKerningMap] = useState<KerningMap>(DEFAULT_INITIAL_KERNING);
  const [ligatures, setLigatures] = useState<Record<string, LigatureData>>(() => generateStarterLigatures());

  // Multi-step History State Manager tracking 'glyphs' and 'kerningMap'
  const [projectUndoStack, setProjectUndoStack] = useState<ProjectHistorySnapshot[]>([]);
  const [projectRedoStack, setProjectRedoStack] = useState<ProjectHistorySnapshot[]>([]);
  const [historyToast, setHistoryToast] = useState<string | null>(null);

  // Pen settings
  const [penSettings, setPenSettings] = useState<PenSettings>({
    tool: 'rollerball',
    baseWidth: 14,
    smoothing: 0.5,
    angle: 45,
    pressureSensitivity: true,
  });

  // Font metadata
  const [fontMetadata, setMetadata] = useState<FontMetadata>({
    familyName: 'ScriptCraft Hand',
    styleName: 'Regular',
    designer: 'Handwriting Community',
    version: '1.000',
    description: 'Custom handwriting typeface created with ScriptCraft Studio',
    unitsPerEm: 1000,
    ascender: 800,
    descender: -200,
    capHeight: 700,
    xHeight: 500,
  });

  // Initialize glyphs from the default starter preset ("Architect Drafter 0.5")
  const [glyphs, setGlyphs] = useState<Record<string, GlyphData>>(() => {
    const starterPreset = HANDWRITING_PRESETS[0];
    const initialGlyphs: Record<string, GlyphData> = {};

    for (const [char, strokes] of Object.entries(starterPreset.glyphs)) {
      initialGlyphs[char] = {
        char,
        unicode: char.charCodeAt(0),
        strokes,
        advanceWidth: char === char.toUpperCase() ? 650 : 520,
        leftBearing: 80,
        rightBearing: 80,
        lastModified: Date.now(),
      };
    }
    return initialGlyphs;
  });

  const [liveFontFamily, setLiveFontFamily] = useState<string>('ScriptCraft-Live');

  // Compile and register live browser FontFace whenever glyphs, kerning, or ligatures change
  const recompileLiveFont = useCallback(async () => {
    try {
      const font = buildOpenTypeFont(
        fontMetadata,
        glyphs,
        penSettings.tool,
        penSettings.baseWidth,
        kerningMap,
        ligatures,
        penSettings.pressureSensitivity,
        penSettings.angle ?? 45
      );
      const uniqueName = `ScriptCraft-Live-${Date.now()}`;
      await registerLiveFontFace(font, uniqueName);
      setLiveFontFamily(uniqueName);
    } catch (err) {
      console.warn('Live font compilation notice:', err);
    }
  }, [
    glyphs,
    fontMetadata,
    penSettings.tool,
    penSettings.baseWidth,
    penSettings.angle,
    penSettings.pressureSensitivity,
    kerningMap,
    ligatures,
  ]);

  useEffect(() => {
    const timer = setTimeout(() => {
      recompileLiveFont();
    }, 400);
    return () => clearTimeout(timer);
  }, [recompileLiveFont]);

  // Record an immutable project history snapshot before mutations
  const recordHistorySnapshot = useCallback(
    (actionDesc?: string) => {
      const snapshot = createProjectSnapshot(glyphs, kerningMap, actionDesc);
      setProjectUndoStack((prev) => [...prev.slice(-49), snapshot]);
      setProjectRedoStack([]);
    },
    [glyphs, kerningMap]
  );

  // Revert to previous project state (multi-step undo)
  const handleGlobalUndo = useCallback(() => {
    if (projectUndoStack.length === 0) return;
    const previousSnapshot = projectUndoStack[projectUndoStack.length - 1];
    const currentSnapshot = createProjectSnapshot(glyphs, kerningMap, 'Current state');

    setProjectUndoStack((prev) => prev.slice(0, -1));
    setProjectRedoStack((prev) => [...prev.slice(-49), currentSnapshot]);
    setGlyphs(cloneGlyphsMap(previousSnapshot.glyphs));
    setKerningMap(cloneKerningMap(previousSnapshot.kerningMap));

    setHistoryToast(`Undo: Reverted ${previousSnapshot.action || 'previous change'}`);
    setTimeout(() => setHistoryToast(null), 3000);
  }, [projectUndoStack, glyphs, kerningMap]);

  // Advance to next project state (multi-step redo)
  const handleGlobalRedo = useCallback(() => {
    if (projectRedoStack.length === 0) return;
    const nextSnapshot = projectRedoStack[projectRedoStack.length - 1];
    const currentSnapshot = createProjectSnapshot(glyphs, kerningMap, 'Current state');

    setProjectRedoStack((prev) => prev.slice(0, -1));
    setProjectUndoStack((prev) => [...prev.slice(-49), currentSnapshot]);
    setGlyphs(cloneGlyphsMap(nextSnapshot.glyphs));
    setKerningMap(cloneKerningMap(nextSnapshot.kerningMap));

    setHistoryToast(`Redo: Restored ${nextSnapshot.action || 'change'}`);
    setTimeout(() => setHistoryToast(null), 3000);
  }, [projectRedoStack, glyphs, kerningMap]);

  // Update a single glyph's strokes or metrics
  const handleUpdateGlyph = (
    char: string,
    strokes: GlyphStroke[],
    advanceWidth?: number,
    variants?: GlyphVariant[],
    rotation?: number,
    slant?: number
  ) => {
    setGlyphs((prev) => {
      const existing = prev[char] || {
        char,
        unicode: char.charCodeAt(0),
        strokes: [],
        advanceWidth: 600,
        leftBearing: 100,
        rightBearing: 100,
        lastModified: Date.now(),
      };
      return {
        ...prev,
        [char]: {
          ...existing,
          strokes,
          advanceWidth: advanceWidth !== undefined ? advanceWidth : existing.advanceWidth,
          variants: variants !== undefined ? variants : existing.variants,
          rotation: rotation !== undefined ? rotation : (existing.rotation ?? 0),
          slant: slant !== undefined ? slant : (existing.slant ?? 0),
          lastModified: Date.now(),
        },
      };
    });
  };

  const handleUpdateVariants = (char: string, variants: GlyphVariant[]) => {
    recordHistorySnapshot(`Update Alternates for '${char}'`);
    setGlyphs((prev) => {
      const existing = prev[char] || {
        char,
        unicode: char.charCodeAt(0),
        strokes: [],
        advanceWidth: 600,
        leftBearing: 100,
        rightBearing: 100,
        lastModified: Date.now(),
      };
      return {
        ...prev,
        [char]: {
          ...existing,
          variants,
          lastModified: Date.now(),
        },
      };
    });
  };

  // Load an entire preset into the workspace
  const handleLoadPreset = (preset: HandwritingPreset) => {
    recordHistorySnapshot(`Load Preset: ${preset.name}`);
    const newGlyphs: Record<string, GlyphData> = {};
    for (const [char, strokes] of Object.entries(preset.glyphs)) {
      newGlyphs[char] = {
        char,
        unicode: char.charCodeAt(0),
        strokes,
        advanceWidth: char === char.toUpperCase() ? 650 : 520,
        leftBearing: 80,
        rightBearing: 80,
        lastModified: Date.now(),
      };
    }
    setGlyphs(newGlyphs);
    setActivePresetId(preset.id);
    setSlant(preset.slant);
    setPenSettings((prev) => ({
      ...prev,
      tool: (preset.penType as any) || 'rollerball',
      baseWidth: preset.strokeWidth || 14,
    }));
    setMetadata((prev) => ({
      ...prev,
      familyName: preset.name,
      styleName: 'Regular',
    }));
    setActiveTab('studio');
  };

  // Direct download a preset as TTF
  const handleDirectDownloadPreset = (preset: HandwritingPreset) => {
    const newGlyphs: Record<string, GlyphData> = {};
    for (const [char, strokes] of Object.entries(preset.glyphs)) {
      newGlyphs[char] = {
        char,
        unicode: char.charCodeAt(0),
        strokes,
        advanceWidth: char === char.toUpperCase() ? 650 : 520,
        leftBearing: 80,
        rightBearing: 80,
        lastModified: Date.now(),
      };
    }
    const font = buildOpenTypeFont(
      { ...fontMetadata, familyName: preset.name },
      newGlyphs,
      (preset.penType as any) || 'rollerball',
      preset.strokeWidth || 14,
      kerningMap,
      ligatures
    );
    font.download(`${preset.name.replace(/\s+/g, '_')}.ttf`);
  };

  // Apply batch scanned glyphs
  const handleApplyScannedGlyphs = (scanned: Record<string, GlyphStroke[]>) => {
    recordHistorySnapshot('Apply Scanned Handwriting');
    setGlyphs((prev) => {
      const updated = { ...prev };
      for (const [char, strokes] of Object.entries(scanned)) {
        if (strokes && strokes.length > 0) {
          updated[char] = {
            char,
            unicode: char.charCodeAt(0),
            strokes,
            advanceWidth: updated[char]?.advanceWidth || 600,
            leftBearing: 80,
            rightBearing: 80,
            lastModified: Date.now(),
          };
        }
      }
      return updated;
    });
    setActiveTab('studio');
  };

  // Apply AI Penmanship traits
  const handleApplyAiTraits = (traits: { slant: number; strokeWidth: number; styleName: string }) => {
    setSlant(traits.slant);
    setPenSettings((prev) => ({ ...prev, baseWidth: traits.strokeWidth }));
    setMetadata((prev) => ({ ...prev, familyName: traits.styleName }));
    setActiveTab('studio');
  };

  // Restore project workspace from offline JSON backup
  const handleImportProject = (data: {
    metadata?: FontMetadata;
    glyphs?: Record<string, GlyphData>;
    penSettings?: PenSettings;
    slant?: number;
    kerningMap?: KerningMap;
    ligaturesMap?: Record<string, LigatureData>;
  }) => {
    recordHistorySnapshot('Import Project Backup');
    if (data.metadata) setMetadata(data.metadata);
    if (data.glyphs) setGlyphs(data.glyphs);
    if (data.penSettings) setPenSettings(data.penSettings);
    if (data.slant !== undefined) setSlant(data.slant);
    if (data.kerningMap) setKerningMap(data.kerningMap);
    if (data.ligaturesMap) setLigatures(data.ligaturesMap);
  };

  // Global keyboard shortcuts for workspace navigation & actions
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement | null;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.isContentEditable)
      ) {
        return;
      }

      // Project History Undo: Ctrl+Z / Cmd+Z (without Shift)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z') && !e.shiftKey) {
        // If in studio, local glyph undo takes precedence if available; otherwise global undo kicks in
        if (activeTab !== 'studio') {
          e.preventDefault();
          handleGlobalUndo();
          return;
        }
      }

      // Project History Redo: Ctrl+Y / Cmd+Y OR Ctrl+Shift+Z / Cmd+Shift+Z
      if (
        ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'z' || e.key === 'Z'))
      ) {
        if (activeTab !== 'studio') {
          e.preventDefault();
          handleGlobalRedo();
          return;
        }
      }

      // Close open modals on Escape
      if (e.key === 'Escape') {
        if (isShortcutsOpen) setIsShortcutsOpen(false);
        if (isExportOpen) setIsExportOpen(false);
        if (isOfflineExportOpen) setIsOfflineExportOpen(false);
        return;
      }

      // Help cheatsheet: '?' or Shift+'/'
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setIsShortcutsOpen((prev) => !prev);
        return;
      }

      // Global Navigation & Actions: Ctrl+1..9, Cmd+1..9, Alt+1..9
      if ((e.ctrlKey || e.metaKey || e.altKey) && !e.shiftKey) {
        const tabNumberMap: Record<string, typeof activeTab> = {
          '1': 'studio',
          '2': 'fontmap',
          '3': 'scan',
          '4': 'ligatures',
          '5': 'kerning',
          '6': 'presets',
          '7': 'ai',
          '8': 'specimen',
          '9': 'worksheets',
        };

        if (tabNumberMap[e.key]) {
          e.preventDefault();
          setActiveTab(tabNumberMap[e.key]);
          return;
        }

        // Quick Export: Ctrl+E / Cmd+E
        if (e.key === 'e' || e.key === 'E') {
          e.preventDefault();
          setIsExportOpen(true);
          return;
        }

        // Offline Manager: Ctrl+O / Cmd+O
        if (e.key === 'o' || e.key === 'O') {
          e.preventDefault();
          setIsOfflineExportOpen(true);
          return;
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isShortcutsOpen, isExportOpen, isOfflineExportOpen, activeTab, handleGlobalUndo, handleGlobalRedo]);

  const completedCount = Object.values(glyphs).filter((g) => g.strokes.length > 0).length;
  const totalCount = 64; // Standard character set target

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-['Plus_Jakarta_Sans',sans-serif] text-slate-900 selection:bg-amber-200 selection:text-slate-900 relative">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        fontName={fontMetadata.familyName}
        completedGlyphsCount={completedCount}
        totalGlyphsCount={totalCount}
        onQuickDownload={() => setIsExportOpen(true)}
        onOpenOfflineExport={() => setIsOfflineExportOpen(true)}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        canUndo={projectUndoStack.length > 0}
        canRedo={projectRedoStack.length > 0}
        onUndo={handleGlobalUndo}
        onRedo={handleGlobalRedo}
        undoCount={projectUndoStack.length}
        redoCount={projectRedoStack.length}
      />

      {/* Floating Project History Toast Notification */}
      {historyToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-slate-900/95 text-white border border-slate-700 px-4 py-2 rounded-full text-xs font-semibold shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200 pointer-events-none">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span>{historyToast}</span>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col pb-16 md:pb-0">
        {activeTab === 'studio' && (
          <GlyphStudio
            currentChar={currentChar}
            onSelectChar={setCurrentChar}
            glyphs={glyphs}
            onUpdateGlyph={handleUpdateGlyph}
            onUpdateAllGlyphs={(updated) => {
              recordHistorySnapshot('Batch glyphs update');
              setGlyphs(updated);
            }}
            penSettings={penSettings}
            setPenSettings={setPenSettings}
            slant={slant}
            setSlant={setSlant}
            onOpenAiTips={(char) => {
              setCurrentChar(char);
              setActiveTab('ai');
            }}
            onOpenScanTab={() => setActiveTab('scan')}
            onRecordHistory={recordHistorySnapshot}
            onGlobalUndo={handleGlobalUndo}
            onGlobalRedo={handleGlobalRedo}
            canGlobalUndo={projectUndoStack.length > 0}
            canGlobalRedo={projectRedoStack.length > 0}
          />
        )}

        {activeTab === 'fontmap' && (
          <FontMapView
            glyphs={glyphs}
            ligatures={ligatures}
            onSelectChar={(char) => {
              setCurrentChar(char);
              setActiveTab('studio');
            }}
            onAutoSpaceAll={(preset) => {
              recordHistorySnapshot('Auto-Space Bearings');
              const updated = autoCalculateAllBearings(
                glyphs,
                penSettings.baseWidth,
                preset,
                fontMetadata.unitsPerEm
              );
              setGlyphs(updated);
            }}
            penSettings={penSettings}
            liveFontFamily={liveFontFamily}
            onOpenScanTab={() => setActiveTab('scan')}
          />
        )}

        {activeTab === 'ligatures' && (
          <LigaturesEditor
            ligatures={ligatures}
            onUpdateLigature={(id, updated) =>
              setLigatures((prev) => ({ ...prev, [id]: updated }))
            }
            onAddLigature={(newLig) =>
              setLigatures((prev) => ({ ...prev, [newLig.id]: newLig }))
            }
            onDeleteLigature={(id) =>
              setLigatures((prev) => {
                const next = { ...prev };
                delete next[id];
                return next;
              })
            }
            glyphs={glyphs}
            penSettings={penSettings}
            setPenSettings={setPenSettings}
            slant={slant}
            liveFontFamily={liveFontFamily}
          />
        )}

        {activeTab === 'kerning' && (
          <KerningEditor
            glyphs={glyphs}
            kerningMap={kerningMap}
            onUpdateKerning={(pair, value) => {
              recordHistorySnapshot(`Kerning: ${pair}`);
              setKerningMap((prev) => ({ ...prev, [pair]: value }));
            }}
            onBatchUpdateKerning={(pairs) => {
              recordHistorySnapshot('Batch Kerning Update');
              setKerningMap((prev) => ({ ...prev, ...pairs }));
            }}
            penSettings={penSettings}
            liveFontFamily={liveFontFamily}
          />
        )}

        {activeTab === 'presets' && (
          <CommunityPresets
            onLoadPreset={handleLoadPreset}
            onDirectDownloadPreset={handleDirectDownloadPreset}
            activePresetId={activePresetId}
          />
        )}

        {activeTab === 'scan' && (
          <TemplateScanView
            onApplyScannedGlyphs={handleApplyScannedGlyphs}
            onApplySingleGlyph={(char, strokes) => handleUpdateGlyph(char, strokes)}
            currentChar={currentChar}
          />
        )}

        {activeTab === 'ai' && (
          <AiPenmanshipLab onApplyStyleTraits={handleApplyAiTraits} />
        )}

        {activeTab === 'specimen' && (
          <SpecimenTester
            fontFamilyName={liveFontFamily}
            metadata={fontMetadata}
            glyphs={glyphs}
            onExportClick={() => setIsExportOpen(true)}
            onSelectCharForStudio={(char) => {
              setCurrentChar(char);
              setActiveTab('studio');
            }}
            onUpdateAllGlyphs={setGlyphs}
            penSettings={penSettings}
          />
        )}

        {activeTab === 'worksheets' && (
          <WorksheetStudio
            metadata={fontMetadata}
            glyphs={glyphs}
            liveFontFamily={liveFontFamily}
            penSettings={penSettings}
            slant={slant}
          />
        )}
      </div>

      {/* Export & Installation Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        metadata={fontMetadata}
        setMetadata={setMetadata}
        glyphs={glyphs}
        baseWidth={penSettings.baseWidth}
        tool={penSettings.tool}
        kerningMap={kerningMap}
        ligaturesMap={ligatures}
        pressureSensitivity={penSettings.pressureSensitivity}
        nibAngle={penSettings.angle ?? 45}
        onOpenOfflineExport={() => setIsOfflineExportOpen(true)}
      />

      {/* Offline WebApp Export & Portable Studio Modal */}
      <OfflineExportModal
        isOpen={isOfflineExportOpen}
        onClose={() => setIsOfflineExportOpen(false)}
        metadata={fontMetadata}
        glyphs={glyphs}
        penSettings={penSettings}
        slant={slant}
        kerningMap={kerningMap}
        ligaturesMap={ligatures}
        onImportProject={handleImportProject}
      />

      {/* Global Keyboard Shortcuts Cheatsheet Modal */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      {/* Offline Status Connectivity Banner */}
      <OfflineIndicator />

      {/* Mobile Bottom Navigation Bar (< md) */}
      <MobileBottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        completedGlyphsCount={completedCount}
        totalGlyphsCount={totalCount}
        onQuickDownload={() => setIsExportOpen(true)}
        onOpenOfflineExport={() => setIsOfflineExportOpen(true)}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
      />
    </div>
  );
}
