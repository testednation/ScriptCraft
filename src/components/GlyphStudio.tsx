import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import {
  Undo,
  Redo,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Sliders,
  MoveHorizontal,
  Compass,
  Check,
  Sparkles,
  Zap,
  Camera,
  Upload,
  Activity,
  Gauge,
  ToggleLeft,
  ToggleRight,
  Eye,
  EyeOff,
  Plus,
  Copy,
  Layers,
  Split,
  Wand2,
  Image as ImageIcon,
  RotateCcw,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Ghost,
  AlignCenter,
  Crosshair,
  Focus,
  Minimize2,
  Eraser,
  Flame,
  Feather,
  ClipboardCheck,
  PenTool,
  LayoutGrid,
  Grid,
  Magnet,
  Scissors,
  GitCommit,
  Type,
  Italic,
} from 'lucide-react';
import { GlyphData, GlyphStroke, GlyphVariant, PenSettings, PenToolType } from '../types/font';
import {
  skewPoint,
  skewGlyphStrokes,
  batchSlantAllGlyphs,
  drawSlantGuideOverlay,
  SLANT_PRESETS,
  getSlantDescription,
  SlantPreset,
} from '../utils/slantCorrection';
import {
  CANVAS_ASCENDER,
  CANVAS_BASELINE,
  CANVAS_CAP_HEIGHT,
  CANVAS_DESCENDER,
  CANVAS_ORIGIN_X,
  CANVAS_SIZE,
  CANVAS_X_HEIGHT,
  strokesToSvgPath,
  rotateGlyphStrokes,
  mirrorStrokesHorizontal,
  mirrorStrokesVertical,
  centerGlyphStrokes,
  getStrokesBoundingBox,
  CenteringVerticalMode,
} from '../utils/fontEngine';
import { calculateGlyphBearing } from '../utils/autoSpacing';
import {
  beautifyGlyphStrokes,
  batchBeautifyAllGlyphs,
  stabilizePointRealtime,
  finalizeStrokeWithSmoothing,
  snapGlyphToBaseline,
} from '../utils/strokeSmoothing';
import {
  eraseStrokeSegments,
  eraseStrokeSegmentsAlongPath,
  eraseWholeStrokesAtPoint,
} from '../utils/strokeEraser';
import {
  renderPressureHeatmapLayer,
  computeStrokesPressureStats,
  computePenmanshipConsistency,
  balanceStrokesPressure,
  boostStrokesPressureContrast,
  computeCrossCharacterWeightDistribution,
  PressureColorPalette,
  PenmanshipMetrics,
  CrossCharacterWeightMetrics,
} from '../utils/pressureHeatmap';
import {
  GridSnapSettings,
  DEFAULT_GRID_SNAP_SETTINGS,
  snapPointToGrid,
  snapStrokeEndpoints,
  snapGlyphStrokesEndpoints,
  computeGridAlignmentMetrics,
  drawCanvasGridOverlay,
} from '../utils/gridSnap';
import {
  ReflectionSettings,
  DEFAULT_REFLECTION_SETTINGS,
  ReflectionType,
  computeReflectionAxes,
  reflectPoint,
  reflectStroke,
  reflectStrokes,
  mirrorHalfStrokes,
  computeCharacterBalanceMetrics,
  CharacterBalanceMetrics,
  drawReflectionCanvasOverlay,
  HORIZONTAL_SYMMETRY_PRESETS,
  VERTICAL_SYMMETRY_PRESETS,
  QUAD_SYMMETRY_PRESETS,
} from '../utils/reflectionTool';
import {
  SimplifySettings,
  DEFAULT_SIMPLIFY_SETTINGS,
  SIMPLIFY_PRESETS,
  simplifyGlyphStrokes,
  simplifyStroke,
  batchSimplifyAllGlyphs,
  drawSimplifyCanvasOverlay,
} from '../utils/pathSimplification';
import { SingleCharCropModal } from './SingleCharCropModal';
import { StrokeWidthInspector } from './StrokeWidthInspector';
import { TracingGuideInspector } from './TracingGuideInspector';
import { UnderlayInspector, UnderlayState, ComplexSampleType } from './UnderlayInspector';
import { GhostPathInspector, GhostPathSettings } from './GhostPathInspector';
import { BaselineGuideInspector, GuideConfig } from './BaselineGuideInspector';
import { ContextualAlternatesModal } from './ContextualAlternatesModal';
import { CopyGlyphModal } from './CopyGlyphModal';
import {
  renderCanvasVariableStrokes,
  drawStrokeWidthVisualIndicator,
  strokesToContourSvgPath,
} from '../utils/strokeWidthDynamics';
import {
  TracingGuideSettings,
  DEFAULT_TRACING_SETTINGS,
  drawTracingGuideOverlay,
  STANDARD_FONT_OPTIONS,
  STANDARD_LATIN_UPPERCASE,
  STANDARD_LATIN_LOWERCASE,
  TRACING_OPACITY_PRESETS,
  isStandardLatinChar,
  compareDrawnGlyphWithStandard,
  TracingRenderMode,
  TracingColorTheme,
} from '../utils/tracingGuide';

interface GlyphStudioProps {
  currentChar: string;
  onSelectChar: (char: string) => void;
  glyphs: Record<string, GlyphData>;
  onUpdateGlyph: (
    char: string,
    strokes: GlyphStroke[],
    advanceWidth?: number,
    variants?: GlyphVariant[],
    rotation?: number,
    slant?: number
  ) => void;
  onUpdateAllGlyphs?: (glyphs: Record<string, GlyphData>) => void;
  penSettings: PenSettings;
  setPenSettings: React.Dispatch<React.SetStateAction<PenSettings>>;
  slant: number;
  setSlant: (slant: number) => void;
  onOpenAiTips?: (char: string) => void;
  onOpenScanTab?: () => void;
  onRecordHistory?: (actionDesc?: string) => void;
  onGlobalUndo?: () => void;
  onGlobalRedo?: () => void;
  canGlobalUndo?: boolean;
  canGlobalRedo?: boolean;
}

const CHARACTER_GROUPS = [
  {
    name: 'Uppercase',
    chars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
  },
  {
    name: 'Lowercase',
    chars: 'abcdefghijklmnopqrstuvwxyz'.split(''),
  },
  {
    name: 'Numerals',
    chars: '0123456789'.split(''),
  },
  {
    name: 'Punctuation',
    chars: ['.', ',', '!', '?', '-', '+', '=', '/', ':', ';', "'", '"', '(', ')', '&'].filter(
      Boolean
    ),
  },
];

export const GlyphStudio: React.FC<GlyphStudioProps> = ({
  currentChar,
  onSelectChar,
  glyphs,
  onUpdateGlyph,
  onUpdateAllGlyphs,
  penSettings,
  setPenSettings,
  slant,
  setSlant,
  onOpenAiTips,
  onOpenScanTab,
  onRecordHistory,
  onGlobalUndo,
  onGlobalRedo,
  canGlobalUndo,
  canGlobalRedo,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const studioFileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  
  // Robust Undo & Redo stacks
  const [undoStack, setUndoStack] = useState<GlyphStroke[][]>([]);
  const [redoStack, setRedoStack] = useState<GlyphStroke[][]>([]);

  // Underlay reference image state for direct tracing
  const [underlay, setUnderlay] = useState<UnderlayState>({
    src: null,
    visible: true,
    opacity: 0.45,
    scale: 1.0,
    offsetX: 0,
    offsetY: 0,
    grayscale: true,
    invert: false,
  });
  const [showUnderlayPanel, setShowUnderlayPanel] = useState<boolean>(false);
  const underlayImgRef = useRef<HTMLImageElement | null>(null);
  const underlayInputRef = useRef<HTMLInputElement | null>(null);

  // Ghost Path state: preview previous character's baseline and height for spacing & proportions reference
  const [ghostPath, setGhostPath] = useState<GhostPathSettings>({
    enabled: false,
    placement: 'overlay',
    showGuidelines: true,
    opacity: 0.35,
    color: '#6366f1',
  });
  const [showGhostPathPanel, setShowGhostPathPanel] = useState<boolean>(false);

  const [showGuides, setShowGuides] = useState(true);
  const [showSlantGuides, setShowSlantGuides] = useState(true);

  // Configurable Typographic Horizontal Baseline & Cap-Height Guide Overlay
  const [guideConfig, setGuideConfig] = useState<GuideConfig>({
    baseline: CANVAS_BASELINE, // default 600
    capHeight: CANVAS_CAP_HEIGHT, // default 240
    showOvershoot: true,
    baselineColor: '#ef4444',
    capHeightColor: '#3b82f6',
    lineWidth: 1.8,
  });
  const [showGuideConfigPanel, setShowGuideConfigPanel] = useState<boolean>(false);
  const [activeGroup, setActiveGroup] = useState<string>('Uppercase');
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [pastedImageSrc, setPastedImageSrc] = useState<string | null>(null);
  const [isDragOverCanvas, setIsDragOverCanvas] = useState(false);
  const [canvasDropTarget, setCanvasDropTarget] = useState<'underlay' | 'crop'>('underlay');

  // Tool mode: Precision Pen vs Selective Segment Eraser
  const [drawingMode, setDrawingMode] = useState<'pen' | 'eraser'>('pen');
  const [eraserSubMode, setEraserSubMode] = useState<'segment' | 'whole'>('segment');
  const [eraserRadius, setEraserRadius] = useState<number>(24);
  const [eraserCursor, setEraserCursor] = useState<{ x: number; y: number; visible: boolean } | null>(null);
  const prevEraserPosRef = useRef<{ x: number; y: number } | null>(null);
  const hasPushedUndoForCurrentEraserDrag = useRef<boolean>(false);

  // Visual pen pressure heatmap overlay: visualizes stroke pressure data on active character to refine penmanship consistency
  const [showPressureHeatmap, setShowPressureHeatmap] = useState<boolean>(false);
  const [pressurePalette, setPressurePalette] = useState<PressureColorPalette>('penmanship-spectrum');
  const [pressureOverlayAlpha, setPressureOverlayAlpha] = useState<number>(0.88);
  const [showPressureBadges, setShowPressureBadges] = useState<boolean>(true);
  const [showPressureSwellCalipers, setShowPressureSwellCalipers] = useState<boolean>(true);
  const [showPressureTremorWarnings, setShowPressureTremorWarnings] = useState<boolean>(true);
  const [pressureThicknessScale, setPressureThicknessScale] = useState<number>(1.25);
  const [isPressureHUDCollapsed, setIsPressureHUDCollapsed] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 1024 : false
  );
  // Mobile Studio tab selector for screens < lg ('canvas' | 'matrix' | 'inspector')
  const [mobileStudioTab, setMobileStudioTab] = useState<'canvas' | 'matrix' | 'inspector'>('canvas');

  // Reflection Tool: Vertical and Horizontal axis reflection for symmetrical stroke balance
  const [reflectionSettings, setReflectionSettings] = useState<ReflectionSettings>(DEFAULT_REFLECTION_SETTINGS);
  const [showReflectionPanel, setShowReflectionPanel] = useState<boolean>(false);
  const [hoverCanvasPt, setHoverCanvasPt] = useState<{ x: number; y: number; pressure?: number } | null>(null);

  // Backward-compatibility aliases
  const symmetryEnabled = reflectionSettings.enabled;
  const setSymmetryEnabled = (valOrFn: boolean | ((prev: boolean) => boolean)) => {
    setReflectionSettings((prev) => ({
      ...prev,
      enabled: typeof valOrFn === 'function' ? valOrFn(prev.enabled) : valOrFn,
    }));
  };
  const showSymmetryPanel = showReflectionPanel;
  const setShowSymmetryPanel = setShowReflectionPanel;

  // Snap to Grid: automatically aligns stroke endpoints to configurable grid
  const [gridSettings, setGridSettings] = useState<GridSnapSettings>(DEFAULT_GRID_SNAP_SETTINGS);
  const [showGridConfigPanel, setShowGridConfigPanel] = useState<boolean>(false);

  // Simplify Paths: Ramer-Douglas-Peucker (RDP) algorithm to decimate control points while preserving shape
  const [simplifySettings, setSimplifySettings] = useState<SimplifySettings>(DEFAULT_SIMPLIFY_SETTINGS);
  const [showSimplifyPanel, setShowSimplifyPanel] = useState<boolean>(false);

  // Common typographical characters with bilateral/horizontal reflective symmetry
  const SYMMETRY_PRESET_CHARS = useMemo(
    () => ['A', 'H', 'I', 'M', 'O', 'T', 'U', 'V', 'W', 'X', 'Y', 'o', 'v', 'w', 'x', '0', '8'],
    []
  );

  // Underlay file upload handler
  const handleUnderlayFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setUnderlay((prev) => ({
        ...prev,
        src: dataUrl,
        visible: true,
        invert: false,
      }));
      setShowUnderlayPanel(true);
      setBeautifyNotice(`Reference image imported! Ready to trace '${currentChar}'.`);
      setTimeout(() => setBeautifyNotice(null), 3000);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Generate an instant reference underlay for complex character shapes
  const handleLoadSampleUnderlay = (type: ComplexSampleType = 'italic') => {
    const offscreen = document.createElement('canvas');
    offscreen.width = 800;
    offscreen.height = 800;
    const offCtx = offscreen.getContext('2d');
    if (!offCtx) return;

    offCtx.fillStyle = '#ffffff';
    offCtx.fillRect(0, 0, 800, 800);
    offCtx.fillStyle = '#0f172a';
    offCtx.textAlign = 'center';
    offCtx.textBaseline = 'alphabetic';

    const targetBase = guideConfig.baseline;

    if (type === 'italic') {
      offCtx.font = 'italic 520px "Georgia", "Times New Roman", serif';
      offCtx.fillText(currentChar, 400, targetBase);
    } else if (type === 'blackletter') {
      // Bold gothic blackletter textura style
      offCtx.font = 'bold 500px "UnifrakturMaguntia", "Cloister Black", "Old English Text MT", "Didot", serif';
      offCtx.fillText(currentChar, 400, targetBase);
      offCtx.strokeStyle = '#0f172a';
      offCtx.lineWidth = 14;
      offCtx.beginPath();
      offCtx.moveTo(250, targetBase + 8);
      offCtx.lineTo(550, targetBase + 8);
      offCtx.stroke();
    } else if (type === 'kanji') {
      // Complex multi-stroke character shape (繁 "flourishing/complex", or 龍 "dragon")
      offCtx.font = '500px "Noto Serif JP", "Songti SC", "SimSun", "Yu Mincho", serif';
      offCtx.fillText('繁', 400, targetBase);
      // Subtle 4-quadrant guideline cross to help trace complex strokes
      offCtx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
      offCtx.lineWidth = 2;
      offCtx.setLineDash([6, 6]);
      offCtx.beginPath();
      offCtx.moveTo(400, 100);
      offCtx.lineTo(400, 700);
      offCtx.moveTo(100, 400);
      offCtx.lineTo(700, 400);
      offCtx.stroke();
    } else if (type === 'flourished') {
      // Ornate flourished initial with swirling calligraphic pen swashes
      offCtx.font = 'italic 460px "Zapfino", "Bickham Script Pro", "Edwardian Script ITC", "Snell Roundhand", cursive, serif';
      offCtx.fillText(currentChar, 400, targetBase);
      // Decorative flourishes
      offCtx.strokeStyle = '#0f172a';
      offCtx.lineWidth = 4;
      offCtx.beginPath();
      offCtx.ellipse(400, targetBase - 120, 260, 200, Math.PI / 12, 0, Math.PI * 1.8);
      offCtx.stroke();
      offCtx.beginPath();
      offCtx.arc(400, targetBase + 30, 180, 0.2 * Math.PI, 0.8 * Math.PI);
      offCtx.stroke();
    }

    const dataUrl = offscreen.toDataURL('image/png');
    setUnderlay({
      src: dataUrl,
      visible: true,
      opacity: 0.38,
      scale: 1.0,
      offsetX: 0,
      offsetY: 0,
      grayscale: true,
      invert: false,
    });
    setShowUnderlayPanel(true);
    setBeautifyNotice(`Loaded ${type} reference guide for tracing!`);
    setTimeout(() => setBeautifyNotice(null), 2500);
  };

  // Snap resting points of current character to the configured horizontal baseline
  const handleSnapToConfiguredBaseline = () => {
    if (currentStrokes.length === 0) return;
    setUndoStack((prev) => [...prev.slice(-49), cloneGlyphStrokes(currentStrokes)]);
    setRedoStack([]);
    const snapped = snapGlyphToBaseline(currentChar, currentStrokes, guideConfig.baseline);
    updateActiveStrokes(snapped);
    setBeautifyNotice(`Snapped '${currentChar}' to ${guideConfig.baseline}px horizontal baseline`);
    setTimeout(() => setBeautifyNotice(null), 2500);
  };

  // Direct file upload handler from photo picker
  const handleStudioFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setPastedImageSrc(dataUrl);
      setIsCropModalOpen(true);
    };
    reader.readAsDataURL(file);
    // Reset input so same file can be picked again if desired
    e.target.value = '';
  };

  // Drag and drop photo directly onto canvas
  const handleCanvasDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOverCanvas(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (canvasDropTarget === 'underlay') {
          // Set directly as tracing background reference
          setUnderlay({
            src: dataUrl,
            visible: true,
            opacity: 0.45,
            scale: 1.0,
            offsetX: 0,
            offsetY: 0,
            grayscale: true,
            invert: false,
          });
          setShowUnderlayPanel(true);
          setBeautifyNotice(`Imported reference image for tracing '${currentChar}'!`);
          setTimeout(() => setBeautifyNotice(null), 3000);
        } else {
          // Open crop and vectorizer modal
          setPastedImageSrc(dataUrl);
          setIsCropModalOpen(true);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Visual indicator overlay options for stroke width variation
  const [showWidthOverlay, setShowWidthOverlay] = useState(true);
  const [showWidthCalipers, setShowWidthCalipers] = useState(true);
  const [showMinMaxBadges, setShowMinMaxBadges] = useState(true);
  const [hoveredWaveformT, setHoveredWaveformT] = useState<number | null>(null);

  // Tracing Guide overlay state (ghosted character standard form for proportions)
  const [tracingGuide, setTracingGuide] = useState<TracingGuideSettings>(DEFAULT_TRACING_SETTINGS);
  const [showTracingGuidePanel, setShowTracingGuidePanel] = useState<boolean>(false);
  const [tracingLatinCaseTab, setTracingLatinCaseTab] = useState<'upper' | 'lower'>('upper');

  // Allow pasting an image directly onto the drawing studio canvas
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = (event) => {
              const dataUrl = event.target?.result as string;
              setPastedImageSrc(dataUrl);
              setIsCropModalOpen(true);
            };
            reader.readAsDataURL(blob);
          }
          break;
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  // Alternate Glyph Variants state
  const [activeVariantId, setActiveVariantId] = useState<string>('primary');
  const [showPrimaryGhostInVariant, setShowPrimaryGhostInVariant] = useState<boolean>(true);
  // Focus Mode state (distraction-free maximized drawing canvas with high contrast text)
  const [isFocusMode, setIsFocusMode] = useState<boolean>(false);
  const [isContextualModalOpen, setIsContextualModalOpen] = useState<boolean>(false);
  const [isCopyGlyphModalOpen, setIsCopyGlyphModalOpen] = useState<boolean>(false);
  const [glyphClipboard, setGlyphClipboard] = useState<{
    char: string;
    strokes: GlyphStroke[];
    advanceWidth?: number;
  } | null>(null);

  // Reset to primary variant when current character changes
  useEffect(() => {
    setActiveVariantId('primary');
  }, [currentChar]);

  // Helper to deep clone strokes for immutable undo/redo history
  const cloneGlyphStrokes = (strokes: GlyphStroke[]): GlyphStroke[] => {
    if (!strokes) return [];
    return strokes.map((stroke) =>
      stroke.map((pt) => ({
        x: pt.x,
        y: pt.y,
        pressure: pt.pressure !== undefined ? pt.pressure : 1,
      }))
    );
  };

  // Per-character persistent undo & redo history map
  const glyphHistoryRef = useRef<
    Record<string, { undo: GlyphStroke[][]; redo: GlyphStroke[][] }>
  >({});
  const prevKeyRef = useRef<string>(`${currentChar}__${activeVariantId}`);

  // When switching character or alternate variant, preserve previous character's history and restore target's history
  useEffect(() => {
    const currentKey = `${currentChar}__${activeVariantId}`;
    if (prevKeyRef.current !== currentKey) {
      // Save outgoing character's history before switching
      glyphHistoryRef.current[prevKeyRef.current] = {
        undo: undoStack,
        redo: redoStack,
      };
      prevKeyRef.current = currentKey;

      // Restore incoming character's history
      const saved = glyphHistoryRef.current[currentKey];
      if (saved) {
        setUndoStack(saved.undo);
        setRedoStack(saved.redo);
      } else {
        setUndoStack([]);
        setRedoStack([]);
      }
    } else {
      // Normal mutation while remaining on same character: keep history map in sync
      glyphHistoryRef.current[currentKey] = {
        undo: undoStack,
        redo: redoStack,
      };
    }
  }, [currentChar, activeVariantId, undoStack, redoStack]);

  const currentGlyph = glyphs[currentChar] || {
    char: currentChar,
    unicode: currentChar.charCodeAt(0),
    strokes: [],
    advanceWidth: 600,
    leftBearing: 100,
    rightBearing: 100,
    lastModified: Date.now(),
    variants: [],
  };

  const variantsList: GlyphVariant[] = currentGlyph.variants || [];
  const isEditingVariant = activeVariantId !== 'primary';
  const activeVariant = variantsList.find((v) => v.id === activeVariantId);
  const currentStrokes = isEditingVariant
    ? (activeVariant ? activeVariant.strokes : [])
    : (currentGlyph.strokes || []);

  // Individual character rotation / tilt state (degrees)
  const [charRotation, setCharRotation] = useState<number>(0);

  // Sync rotation state whenever character, variant, or stored rotation changes
  useEffect(() => {
    const rot = isEditingVariant
      ? (activeVariant?.rotation ?? 0)
      : (currentGlyph?.rotation ?? 0);
    setCharRotation(rot);
  }, [currentChar, activeVariantId, isEditingVariant, activeVariant?.rotation, currentGlyph?.rotation]);

  // Toggle for showing live bounding box & metric alignment crosshair
  const [showBoundingBox, setShowBoundingBox] = useState<boolean>(false);
  const [centeringVerticalMode, setCenteringVerticalMode] =
    useState<CenteringVerticalMode>('ascender-descender');

  // Compute character bounding box across all points
  const currentBBox = useMemo(() => {
    return getStrokesBoundingBox(currentStrokes);
  }, [currentStrokes]);

  // Compute live stroke pressure statistics and pixel thicknesses for the Pressure Map
  const pressureStats = useMemo(() => {
    return computeStrokesPressureStats(currentStrokes, penSettings.baseWidth);
  }, [currentStrokes, penSettings.baseWidth]);

  // Compute penmanship consistency metrics from live stroke pressure data
  const penmanshipMetrics = useMemo(() => {
    return computePenmanshipConsistency(currentStrokes);
  }, [currentStrokes]);

  // Compute endpoint alignment metrics against current grid pitch
  const gridAlignmentMetrics = useMemo(() => {
    return computeGridAlignmentMetrics(currentStrokes, gridSettings.gridSize);
  }, [currentStrokes, gridSettings.gridSize]);

  // Compute Ramer-Douglas-Peucker simplification metrics for active character
  const simplificationMetrics = useMemo(() => {
    return simplifyGlyphStrokes(
      currentStrokes,
      simplifySettings.epsilon,
      simplifySettings.curveRelaxation
    ).metrics;
  }, [currentStrokes, simplifySettings.epsilon, simplifySettings.curveRelaxation]);

  // Compute live proportion comparison against standard Latin archetype template
  const tracingProportionComparison = useMemo(() => {
    return compareDrawnGlyphWithStandard(currentChar, currentStrokes, tracingGuide, penSettings.baseWidth);
  }, [currentChar, currentStrokes, tracingGuide, penSettings.baseWidth]);

  // Compute font-wide cross-character line-weight and stroke pressure balance
  const crossCharWeightMetrics = useMemo(() => {
    return computeCrossCharacterWeightDistribution(glyphs, currentChar, penSettings.baseWidth);
  }, [glyphs, currentChar, penSettings.baseWidth, currentStrokes]);

  // Compute character horizontal bounding box center and baseline pivot point
  const { pivotX, pivotY } = useMemo(() => {
    const px =
      currentBBox !== null
        ? currentBBox.centerX
        : CANVAS_ORIGIN_X + (currentGlyph.advanceWidth || 600) * 0.36;
    return { pivotX: px, pivotY: guideConfig.baseline };
  }, [currentBBox, currentGlyph.advanceWidth, guideConfig.baseline]);

  // Handler to adjust character-specific tilt independently of global slant
  const handleRotationChange = useCallback(
    (newAngle: number) => {
      setCharRotation(newAngle);
      if (isEditingVariant) {
        const updatedVariants = variantsList.map((v) =>
          v.id === activeVariantId ? { ...v, rotation: newAngle } : v
        );
        onUpdateGlyph(
          currentChar,
          currentGlyph.strokes,
          currentGlyph.advanceWidth,
          updatedVariants,
          currentGlyph.rotation
        );
      } else {
        onUpdateGlyph(
          currentChar,
          currentGlyph.strokes,
          currentGlyph.advanceWidth,
          currentGlyph.variants,
          newAngle
        );
      }
    },
    [isEditingVariant, variantsList, activeVariantId, onUpdateGlyph, currentChar, currentGlyph]
  );

  // Sequence matrix navigation & Ghost Path previous character reference
  const allChars = CHARACTER_GROUPS.flatMap((g) => g.chars);
  const currentIndex = allChars.indexOf(currentChar);
  const prevCharInSequence =
    currentIndex > 0 ? allChars[currentIndex - 1] : allChars[allChars.length - 1];
  const activeGhostChar = ghostPath.referenceChar || prevCharInSequence;
  const ghostGlyph = glyphs[activeGhostChar];

  let ghostMinX = Infinity, ghostMaxX = -Infinity;
  let ghostMinY = Infinity, ghostMaxY = -Infinity;
  if (ghostGlyph && ghostGlyph.strokes && ghostGlyph.strokes.length > 0) {
    for (const stroke of ghostGlyph.strokes) {
      for (const pt of stroke) {
        if (pt.x < ghostMinX) ghostMinX = pt.x;
        if (pt.x > ghostMaxX) ghostMaxX = pt.x;
        if (pt.y < ghostMinY) ghostMinY = pt.y;
        if (pt.y > ghostMaxY) ghostMaxY = pt.y;
      }
    }
  }
  const hasGhostStrokes = ghostMinY !== Infinity;

  const updateActiveStrokes = useCallback((strokes: GlyphStroke[], advanceWidth?: number) => {
    if (activeVariantId === 'primary') {
      onUpdateGlyph(
        currentChar,
        strokes,
        advanceWidth !== undefined ? advanceWidth : currentGlyph.advanceWidth,
        currentGlyph.variants,
        currentGlyph.rotation
      );
    } else {
      const updatedVariants = variantsList.map((v) =>
        v.id === activeVariantId
          ? { ...v, strokes, advanceWidth: advanceWidth !== undefined ? advanceWidth : v.advanceWidth }
          : v
      );
      onUpdateGlyph(
        currentChar,
        currentGlyph.strokes,
        currentGlyph.advanceWidth,
        updatedVariants,
        currentGlyph.rotation
      );
    }
  }, [activeVariantId, onUpdateGlyph, currentChar, currentGlyph, variantsList]);

  // Permanently bake character tilt into raw stroke points coordinates
  const handleBakeRotation = useCallback(() => {
    if (charRotation === 0 || currentStrokes.length === 0) return;
    setUndoStack((prev) => [...prev.slice(-49), cloneGlyphStrokes(currentStrokes)]);
    setRedoStack([]);
    const baked = rotateGlyphStrokes(currentStrokes, charRotation, pivotX, pivotY);
    setCharRotation(0);
    updateActiveStrokes(baked);
    if (isEditingVariant) {
      const updatedVariants = variantsList.map((v) =>
        v.id === activeVariantId ? { ...v, strokes: baked, rotation: 0 } : v
      );
      onUpdateGlyph(
        currentChar,
        currentGlyph.strokes,
        currentGlyph.advanceWidth,
        updatedVariants,
        currentGlyph.rotation
      );
    } else {
      onUpdateGlyph(
        currentChar,
        baked,
        currentGlyph.advanceWidth,
        currentGlyph.variants,
        0
      );
    }
    setBeautifyNotice(`Baked ${charRotation > 0 ? `+${charRotation}` : charRotation}° tilt directly into '${currentChar}' stroke coordinates`);
    setTimeout(() => setBeautifyNotice(null), 3000);
  }, [charRotation, currentStrokes, pivotX, pivotY, isEditingVariant, variantsList, activeVariantId, onUpdateGlyph, currentChar, currentGlyph, updateActiveStrokes]);

  // Mirror glyph strokes horizontally (Left ↔ Right) around character horizontal center
  const handleMirrorHorizontal = useCallback(() => {
    if (currentStrokes.length === 0) return;
    setUndoStack((prev) => [...prev.slice(-49), cloneGlyphStrokes(currentStrokes)]);
    setRedoStack([]);
    const mirrored = mirrorStrokesHorizontal(currentStrokes, pivotX);
    updateActiveStrokes(mirrored);
    setBeautifyNotice(`Mirrored '${currentChar}' horizontally (Left ↔ Right)`);
    setTimeout(() => setBeautifyNotice(null), 2500);
  }, [currentStrokes, pivotX, updateActiveStrokes, currentChar]);

  // Mirror glyph strokes vertically (Top ↕ Bottom) around vertical center
  const handleMirrorVertical = useCallback(() => {
    if (currentStrokes.length === 0) return;
    setUndoStack((prev) => [...prev.slice(-49), cloneGlyphStrokes(currentStrokes)]);
    setRedoStack([]);
    const mirrored = mirrorStrokesVertical(currentStrokes);
    updateActiveStrokes(mirrored);
    setBeautifyNotice(`Mirrored '${currentChar}' vertically (Top ↕ Bottom)`);
    setTimeout(() => setBeautifyNotice(null), 2500);
  }, [currentStrokes, updateActiveStrokes, currentChar]);

  // Calculate effective reflection axis coordinates:
  // axisX is the vertical line (for horizontal reflection L <-> R)
  // axisY is the horizontal line (for vertical reflection T <-> B)
  const { axisX: reflectionAxisX, axisY: reflectionAxisY } = useMemo(() => {
    return computeReflectionAxes(reflectionSettings, {
      advanceWidth: currentGlyph.advanceWidth || 600,
      baseline: guideConfig.baseline,
      capHeight: guideConfig.capHeight,
      bboxCenter: currentBBox ? { x: currentBBox.centerX, y: currentBBox.centerY } : null,
    });
  }, [
    reflectionSettings,
    currentGlyph.advanceWidth,
    guideConfig.baseline,
    guideConfig.capHeight,
    currentBBox,
  ]);

  const effectiveSymmetryAxisX = reflectionAxisX;
  const effectiveSymmetryAxisY = reflectionAxisY;

  // Character optical balance metrics against reflection axes
  const characterBalanceMetrics = useMemo(() => {
    return computeCharacterBalanceMetrics(currentStrokes, reflectionAxisX, reflectionAxisY);
  }, [currentStrokes, reflectionAxisX, reflectionAxisY]);

  // Mirror half strokes across the active reflection axis (horizontal or vertical)
  const handleMirrorHalf = useCallback(
    (direction: 'left-to-right' | 'right-to-left' | 'top-to-bottom' | 'bottom-to-top') => {
      if (currentStrokes.length === 0) return;
      setUndoStack((prev) => [...prev.slice(-49), cloneGlyphStrokes(currentStrokes)]);
      setRedoStack([]);
      const result = mirrorHalfStrokes(currentStrokes, reflectionAxisX, reflectionAxisY, direction);
      updateActiveStrokes(result.strokes);
      const dirLabels: Record<string, string> = {
        'left-to-right': 'Left ➔ Right (Vertical Axis)',
        'right-to-left': 'Right ➔ Left (Vertical Axis)',
        'top-to-bottom': 'Top ➔ Bottom (Horizontal Axis)',
        'bottom-to-top': 'Bottom ➔ Top (Horizontal Axis)',
      };
      setBeautifyNotice(`Mirrored ${dirLabels[direction] || direction} (${result.mirroredCount} strokes added)`);
      if (onRecordHistory) {
        onRecordHistory(`Reflected half strokes ${direction} on '${currentChar}'`);
      }
      setTimeout(() => setBeautifyNotice(null), 2500);
    },
    [currentStrokes, reflectionAxisX, reflectionAxisY, updateActiveStrokes, onRecordHistory, currentChar]
  );

  // Backward-compatible handleMirrorSide
  const handleMirrorSide = useCallback(
    (sourceSide: 'left' | 'right') => {
      handleMirrorHalf(sourceSide === 'left' ? 'left-to-right' : 'right-to-left');
    },
    [handleMirrorHalf]
  );

  // Reflect all strokes across the active reflection axis
  const handleReflectAllStrokes = useCallback(
    (type?: ReflectionType) => {
      if (currentStrokes.length === 0) return;
      const refType = type || reflectionSettings.type;
      setUndoStack((prev) => [...prev.slice(-49), cloneGlyphStrokes(currentStrokes)]);
      setRedoStack([]);
      const reflected = reflectStrokes(currentStrokes, reflectionAxisX, reflectionAxisY, refType);
      const combined = [...currentStrokes, ...reflected];
      updateActiveStrokes(combined);
      setBeautifyNotice(`Reflected all strokes (${refType} reflection, ${reflected.length} added)`);
      if (onRecordHistory) {
        onRecordHistory(`Reflected all strokes (${refType}) on '${currentChar}'`);
      }
      setTimeout(() => setBeautifyNotice(null), 2500);
    },
    [currentStrokes, reflectionSettings.type, reflectionAxisX, reflectionAxisY, updateActiveStrokes, onRecordHistory, currentChar]
  );

  // Apply Ramer-Douglas-Peucker simplification to decimate control points while maintaining shape
  const handleApplySimplification = useCallback(
    (targetEpsilon?: number) => {
      if (currentStrokes.length === 0) return;
      const eps = targetEpsilon !== undefined ? targetEpsilon : simplifySettings.epsilon;
      setUndoStack((prev) => [...prev.slice(-49), cloneGlyphStrokes(currentStrokes)]);
      setRedoStack([]);
      const result = simplifyGlyphStrokes(
        currentStrokes,
        eps,
        simplifySettings.curveRelaxation
      );
      updateActiveStrokes(result.strokes);
      if (onRecordHistory) {
        onRecordHistory(
          `Simplify paths (RDP ε=${eps}px) on '${currentChar}': -${result.metrics.reductionPercentage}% points`
        );
      }
      setBeautifyNotice(
        `Simplified '${currentChar}' paths: ${result.metrics.originalPointCount} ➔ ${result.metrics.simplifiedPointCount} pts (-${result.metrics.reductionPercentage}%) [RDP ε=${eps}px]`
      );
      setTimeout(() => setBeautifyNotice(null), 3000);
    },
    [currentStrokes, simplifySettings.epsilon, simplifySettings.curveRelaxation, updateActiveStrokes, onRecordHistory, currentChar]
  );

  // Batch simplify all glyphs in the entire font dictionary using Ramer-Douglas-Peucker
  const handleBatchSimplifyAll = useCallback(() => {
    setUndoStack((prev) => [...prev.slice(-49), cloneGlyphStrokes(currentStrokes)]);
    setRedoStack([]);
    const res = batchSimplifyAllGlyphs(
      glyphs,
      simplifySettings.epsilon,
      simplifySettings.curveRelaxation
    );
    if (onUpdateAllGlyphs) {
      onUpdateAllGlyphs(res.glyphs);
    }
    if (onRecordHistory) {
      onRecordHistory(
        `Batch simplified ${res.modifiedGlyphCount} characters: reduced ${res.totalReducedPoints} pts (-${res.overallReductionPercentage}%)`
      );
    }
    setBeautifyNotice(
      `Batch simplified ${res.modifiedGlyphCount} characters: reduced ${res.totalReducedPoints} points (-${res.overallReductionPercentage}%)!`
    );
    setTimeout(() => setBeautifyNotice(null), 3500);
  }, [glyphs, simplifySettings.epsilon, simplifySettings.curveRelaxation, onUpdateAllGlyphs, onRecordHistory, currentStrokes]);

  // Center glyph strokes horizontally and vertically within the font's metric boundaries
  const handleCenterGlyph = useCallback(
    (mode?: CenteringVerticalMode) => {
      if (currentStrokes.length === 0) return;
      const vMode = mode || centeringVerticalMode;
      const activeAdvance = isEditingVariant
        ? (activeVariant?.advanceWidth ?? currentGlyph.advanceWidth ?? 600)
        : (currentGlyph.advanceWidth ?? 600);

      const result = centerGlyphStrokes(currentStrokes, {
        advanceWidth: activeAdvance,
        verticalMode: vMode,
      });

      if (!result.bbox) return;

      if (result.deltaX === 0 && result.deltaY === 0) {
        setBeautifyNotice(`'${currentChar}' is already centered within font metric boundaries`);
        setTimeout(() => setBeautifyNotice(null), 2000);
        return;
      }

      setUndoStack((prev) => [...prev.slice(-49), cloneGlyphStrokes(currentStrokes)]);
      setRedoStack([]);
      updateActiveStrokes(result.strokes);

      const dxStr = result.deltaX > 0 ? `+${result.deltaX}` : `${result.deltaX}`;
      const dyStr = result.deltaY > 0 ? `+${result.deltaY}` : `${result.deltaY}`;
      setBeautifyNotice(
        `Centered '${currentChar}' within metric boundaries (ΔX: ${dxStr}px, ΔY: ${dyStr}px)`
      );
      setTimeout(() => setBeautifyNotice(null), 2500);
    },
    [
      currentStrokes,
      centeringVerticalMode,
      isEditingVariant,
      activeVariant,
      currentGlyph.advanceWidth,
      updateActiveStrokes,
      currentChar,
    ]
  );

  const handleAddVariant = () => {
    const nextNum = variantsList.length + 2;
    const newVariant: GlyphVariant = {
      id: `var_${Date.now()}`,
      name: `Variant ${nextNum}`,
      strokes: [],
      advanceWidth: currentGlyph.advanceWidth,
    };
    const updatedVariants = [...variantsList, newVariant];
    onUpdateGlyph(currentChar, currentGlyph.strokes, currentGlyph.advanceWidth, updatedVariants);
    setActiveVariantId(newVariant.id);
  };

  const handleDuplicateToVariant = () => {
    const nextNum = variantsList.length + 2;
    const newVariant: GlyphVariant = {
      id: `var_${Date.now()}`,
      name: `Variant ${nextNum} (Copy)`,
      strokes: JSON.parse(JSON.stringify(currentGlyph.strokes)),
      advanceWidth: currentGlyph.advanceWidth,
    };
    const updatedVariants = [...variantsList, newVariant];
    onUpdateGlyph(currentChar, currentGlyph.strokes, currentGlyph.advanceWidth, updatedVariants);
    setActiveVariantId(newVariant.id);
  };

  const handleDeleteVariant = (varId: string) => {
    const updatedVariants = variantsList.filter((v) => v.id !== varId);
    onUpdateGlyph(currentChar, currentGlyph.strokes, currentGlyph.advanceWidth, updatedVariants);
    if (activeVariantId === varId) {
      setActiveVariantId('primary');
    }
  };

  const handleApplyContextualVariants = (updates: Record<string, GlyphVariant[]>) => {
    if (onUpdateAllGlyphs) {
      const newGlyphs = { ...glyphs };
      for (const [char, variants] of Object.entries(updates)) {
        if (newGlyphs[char]) {
          newGlyphs[char] = {
            ...newGlyphs[char],
            variants,
          };
        }
      }
      onUpdateAllGlyphs(newGlyphs);
    } else {
      for (const [char, variants] of Object.entries(updates)) {
        const g = glyphs[char];
        if (g) {
          onUpdateGlyph(char, g.strokes, g.advanceWidth, variants, g.rotation);
        }
      }
    }
    const count = Object.keys(updates).length;
    setBeautifyNotice(`Generated contextual alternates for ${count} character${count === 1 ? '' : 's'}!`);
    setTimeout(() => setBeautifyNotice(null), 3000);
  };

  const [beautifyNotice, setBeautifyNotice] = useState<string | null>(null);

  // Copy stroke data between characters for rapid base shape borrowing and variant creation
  const handleApplyCopyStrokes = useCallback(
    (
      sourceChar: string,
      targetChar: string,
      mode: 'replace' | 'append' | 'variant',
      copyAdvanceWidth: boolean,
      targetVariantName?: string
    ) => {
      const srcGlyph = glyphs[sourceChar];
      if (!srcGlyph || !srcGlyph.strokes || srcGlyph.strokes.length === 0) return;

      const clonedStrokes: GlyphStroke[] = JSON.parse(JSON.stringify(srcGlyph.strokes));
      const tgtGlyph = glyphs[targetChar] || {
        char: targetChar,
        unicode: targetChar.charCodeAt(0),
        strokes: [],
        advanceWidth: 600,
        leftBearing: 80,
        rightBearing: 80,
        lastModified: Date.now(),
        variants: [],
      };

      const effectiveAdvance = copyAdvanceWidth
        ? (srcGlyph.advanceWidth ?? 600)
        : (tgtGlyph.advanceWidth ?? 600);

      // If targetChar is the currently active currentChar
      if (targetChar === currentChar) {
        setUndoStack((prev) => [...prev.slice(-49), cloneGlyphStrokes(currentStrokes)]);
        setRedoStack([]);

        if (mode === 'replace') {
          updateActiveStrokes(clonedStrokes, effectiveAdvance);
          setBeautifyNotice(`Applied '${sourceChar}' strokes to '${currentChar}' (Base shape replaced)`);
        } else if (mode === 'append') {
          const merged = [...currentStrokes, ...clonedStrokes];
          updateActiveStrokes(merged, effectiveAdvance);
          setBeautifyNotice(`Appended ${clonedStrokes.length} strokes from '${sourceChar}' into '${currentChar}'`);
        } else if (mode === 'variant') {
          const newVariant: GlyphVariant = {
            id: `var_${Date.now()}`,
            name: targetVariantName || `Base '${sourceChar}'`,
            strokes: clonedStrokes,
            advanceWidth: effectiveAdvance,
          };
          const updatedVariants = [...variantsList, newVariant];
          onUpdateGlyph(
            currentChar,
            currentGlyph.strokes,
            currentGlyph.advanceWidth,
            updatedVariants,
            currentGlyph.rotation
          );
          setActiveVariantId(newVariant.id);
          setBeautifyNotice(`Created new stylistic variant from '${sourceChar}' base shape`);
        }
      } else {
        // Target is another character in the font
        if (mode === 'replace') {
          onUpdateGlyph(
            targetChar,
            clonedStrokes,
            effectiveAdvance,
            tgtGlyph.variants,
            tgtGlyph.rotation
          );
        } else if (mode === 'append') {
          const merged = [...(tgtGlyph.strokes || []), ...clonedStrokes];
          onUpdateGlyph(
            targetChar,
            merged,
            effectiveAdvance,
            tgtGlyph.variants,
            tgtGlyph.rotation
          );
        } else if (mode === 'variant') {
          const newVariant: GlyphVariant = {
            id: `var_${Date.now()}`,
            name: targetVariantName || `Base '${sourceChar}'`,
            strokes: clonedStrokes,
            advanceWidth: effectiveAdvance,
          };
          onUpdateGlyph(
            targetChar,
            tgtGlyph.strokes,
            tgtGlyph.advanceWidth,
            [...(tgtGlyph.variants || []), newVariant],
            tgtGlyph.rotation
          );
        }
        setBeautifyNotice(`Copied strokes from '${sourceChar}' to '${targetChar}'`);
      }

      if (onRecordHistory) {
        onRecordHistory(`Copied glyph strokes: '${sourceChar}' → '${targetChar}' (${mode})`);
      }
      setTimeout(() => setBeautifyNotice(null), 3000);
    },
    [glyphs, currentChar, currentStrokes, currentGlyph, variantsList, updateActiveStrokes, onUpdateGlyph, onRecordHistory]
  );

  // Batch copy current or source character to multiple destination characters
  const handleBatchCopyToChars = useCallback(
    (
      sourceChar: string,
      targetChars: string[],
      mode: 'replace' | 'append' | 'variant',
      copyAdvanceWidth: boolean
    ) => {
      const srcGlyph = glyphs[sourceChar];
      if (!srcGlyph || !srcGlyph.strokes || srcGlyph.strokes.length === 0) return;

      if (onUpdateAllGlyphs) {
        const updated = { ...glyphs };
        for (const tChar of targetChars) {
          const cloned: GlyphStroke[] = JSON.parse(JSON.stringify(srcGlyph.strokes));
          const existing = updated[tChar] || {
            char: tChar,
            unicode: tChar.charCodeAt(0),
            strokes: [],
            advanceWidth: 600,
            leftBearing: 80,
            rightBearing: 80,
            lastModified: Date.now(),
            variants: [],
          };
          const advance = copyAdvanceWidth ? (srcGlyph.advanceWidth ?? 600) : (existing.advanceWidth ?? 600);

          if (mode === 'replace') {
            updated[tChar] = { ...existing, strokes: cloned, advanceWidth: advance, lastModified: Date.now() };
          } else if (mode === 'append') {
            updated[tChar] = { ...existing, strokes: [...existing.strokes, ...cloned], advanceWidth: advance, lastModified: Date.now() };
          } else if (mode === 'variant') {
            const v: GlyphVariant = {
              id: `var_${Date.now()}_${tChar}`,
              name: `Base '${sourceChar}'`,
              strokes: cloned,
              advanceWidth: advance,
            };
            updated[tChar] = { ...existing, variants: [...(existing.variants || []), v], lastModified: Date.now() };
          }
        }
        onUpdateAllGlyphs(updated);
      }
      setBeautifyNotice(`Batch copied '${sourceChar}' strokes to ${targetChars.length} characters (${targetChars.join(', ')})`);
      setTimeout(() => setBeautifyNotice(null), 3000);
    },
    [glyphs, onUpdateAllGlyphs]
  );

  // Smooth curves, reduce hand jitter, and snap baseline for current character/variant
  const handleBeautifyCurrent = () => {
    if (currentStrokes.length === 0) return;
    setUndoStack((prev) => [...prev.slice(-49), cloneGlyphStrokes(currentStrokes)]);
    setRedoStack([]);
    const beautified = beautifyGlyphStrokes(currentChar, currentStrokes, {
      smoothIterations: 1,
      removeJitter: true,
      snapBaseline: true,
      addTapers: true,
    });
    updateActiveStrokes(beautified);
    setBeautifyNotice(`Smoothed curves & stabilized '${currentChar}'`);
    setTimeout(() => setBeautifyNotice(null), 2500);
  };

  // Batch beautify all glyphs across the entire font
  const handleBatchBeautify = () => {
    if (!onUpdateAllGlyphs) return;
    const updated = batchBeautifyAllGlyphs(glyphs, {
      smoothIterations: 1,
      removeJitter: true,
      snapBaseline: true,
    });
    onUpdateAllGlyphs(updated);
    setBeautifyNotice('Smoothed curves & stabilized all characters in font!');
    setTimeout(() => setBeautifyNotice(null), 3000);
  };

  // Balance pen pressure across all strokes of the glyph to smooth hand tremors and normalize thickness
  const handleBalancePressure = useCallback(() => {
    if (currentStrokes.length === 0) return;
    setUndoStack((prev) => [...prev.slice(-49), cloneGlyphStrokes(currentStrokes)]);
    setRedoStack([]);
    const balanced = balanceStrokesPressure(currentStrokes, {
      targetAverage: 0.85,
      smoothRadius: 3,
      contrastBoost: 1.0,
    });
    updateActiveStrokes(balanced);
    if (onRecordHistory) {
      onRecordHistory(`Balanced pen pressure on '${currentChar}'`);
    }
    setBeautifyNotice(`Balanced pen pressure across strokes on '${currentChar}'`);
    setTimeout(() => setBeautifyNotice(null), 2500);
  }, [currentStrokes, currentChar, updateActiveStrokes, onRecordHistory]);

  // Boost dynamic calligraphic contrast (hairlines vs downstroke swells)
  const handleBoostPressureContrast = useCallback(() => {
    if (currentStrokes.length === 0) return;
    setUndoStack((prev) => [...prev.slice(-49), cloneGlyphStrokes(currentStrokes)]);
    setRedoStack([]);
    const boosted = boostStrokesPressureContrast(currentStrokes);
    updateActiveStrokes(boosted);
    if (onRecordHistory) {
      onRecordHistory(`Boosted pen pressure contrast on '${currentChar}'`);
    }
    setBeautifyNotice(`Boosted pen pressure contrast (hairlines vs swells) on '${currentChar}'`);
    setTimeout(() => setBeautifyNotice(null), 2500);
  }, [currentStrokes, currentChar, updateActiveStrokes, onRecordHistory]);

  // One-click Snap: align all stroke endpoints (or all points) of the active character to the configured grid
  const handleSnapGlyphEndpoints = useCallback(() => {
    if (currentStrokes.length === 0) return;
    setUndoStack((prev) => [...prev.slice(-49), cloneGlyphStrokes(currentStrokes)]);
    setRedoStack([]);
    const res = snapGlyphStrokesEndpoints(
      currentStrokes,
      gridSettings.gridSize,
      gridSettings.magneticThreshold,
      gridSettings.snapEndpointsOnly
    );
    updateActiveStrokes(res.strokes);
    if (onRecordHistory) {
      onRecordHistory(
        `Snapped ${res.snappedEndpointsCount} endpoints to ${gridSettings.gridSize}px grid on '${currentChar}'`
      );
    }
    setBeautifyNotice(
      `Aligned ${res.snappedEndpointsCount}/${res.totalEndpoints} endpoints to ${gridSettings.gridSize}px grid [X]`
    );
    setTimeout(() => setBeautifyNotice(null), 2500);
  }, [currentStrokes, gridSettings, currentChar, updateActiveStrokes, onRecordHistory]);

  // Match Font Average Weight: normalize current character's pressure to harmonize with font-wide average
  const handleMatchFontAverageWeight = useCallback(() => {
    if (currentStrokes.length === 0 || crossCharWeightMetrics.fontAvgPressure <= 0) return;
    setUndoStack((prev) => [...prev.slice(-49), cloneGlyphStrokes(currentStrokes)]);
    setRedoStack([]);
    const balanced = balanceStrokesPressure(currentStrokes, {
      targetAverage: crossCharWeightMetrics.fontAvgPressure,
      smoothRadius: 3,
      contrastBoost: 1.0,
    });
    updateActiveStrokes(balanced);
    if (onRecordHistory) {
      onRecordHistory(
        `Harmonized line weight on '${currentChar}' to font average (${crossCharWeightMetrics.fontAvgThickness}px)`
      );
    }
    setBeautifyNotice(
      `Harmonized '${currentChar}' to font average line weight (${crossCharWeightMetrics.fontAvgThickness}px)`
    );
    setTimeout(() => setBeautifyNotice(null), 2500);
  }, [currentStrokes, crossCharWeightMetrics, currentChar, updateActiveStrokes, onRecordHistory]);

  // Redraw canvas on state changes
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
    }

    ctx.save();
    ctx.scale((rect.width * dpr) / CANVAS_SIZE, (rect.height * dpr) / CANVAS_SIZE);

    // Background paper
    ctx.fillStyle = '#faf9f5'; // Warm archival paper ivory
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Subtle texture grid
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x < CANVAS_SIZE; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_SIZE);
      ctx.stroke();
    }
    for (let y = 0; y < CANVAS_SIZE; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_SIZE, y);
      ctx.stroke();
    }

    // Snap to Grid: geometric alignment grid lines, vertex dots, and magnetic snapping halo
    if (gridSettings.showGridLines || gridSettings.enabled) {
      drawCanvasGridOverlay(ctx, gridSettings.gridSize, {
        hoverPt: hoverCanvasPt,
        magneticThreshold: gridSettings.enabled ? gridSettings.magneticThreshold : 0,
        showIntersectionDots: gridSettings.showIntersectionDots,
        majorGridEvery: gridSettings.majorGridEvery,
      });
    }

    // Underlay reference image for direct manual tracing
    if (underlay.src && underlay.visible && underlayImgRef.current) {
      const img = underlayImgRef.current;
      if (img.complete && img.naturalWidth > 0) {
        ctx.save();
        ctx.globalAlpha = Math.max(0.05, Math.min(1.0, underlay.opacity));
        let filterStr = '';
        if (underlay.grayscale) {
          filterStr += 'grayscale(100%) contrast(140%) ';
        }
        if (underlay.invert) {
          filterStr += 'invert(100%) ';
        }
        if (filterStr) {
          ctx.filter = filterStr.trim();
        }

        const baseW = img.naturalWidth;
        const baseH = img.naturalHeight;
        const baseTargetH = (CANVAS_DESCENDER - CANVAS_ASCENDER) * underlay.scale;
        const baseTargetW = (baseW / baseH) * baseTargetH;

        const centerX = CANVAS_SIZE / 2 + underlay.offsetX;
        const centerY = (CANVAS_ASCENDER + CANVAS_DESCENDER) / 2 + underlay.offsetY;

        ctx.drawImage(
          img,
          centerX - baseTargetW / 2,
          centerY - baseTargetH / 2,
          baseTargetW,
          baseTargetH
        );
        ctx.restore();
      }
    }

    // Slant lines (French cursive / Spencerian 52° or custom slant)
    if (showSlantGuides && slant !== 0) {
      ctx.strokeStyle = 'rgba(217, 119, 6, 0.14)'; // Soft amber guideline
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);

      const angleRad = (slant * Math.PI) / 180;
      const tanSlant = Math.tan(angleRad);
      const effectiveBase = guideConfig.baseline;

      for (let x = -CANVAS_SIZE; x < CANVAS_SIZE * 2; x += 120) {
        ctx.beginPath();
        const topX = x + (effectiveBase - 0) * tanSlant;
        const botX = x + (effectiveBase - CANVAS_SIZE) * tanSlant;
        ctx.moveTo(topX, 0);
        ctx.lineTo(botX, CANVAS_SIZE);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }

    // Configurable typographic guidelines overlay
    if (showGuides) {
      const effectiveBaseline = guideConfig.baseline;
      const effectiveCapHeight = guideConfig.capHeight;
      const effectiveCapDistance = effectiveBaseline - effectiveCapHeight;
      const effectiveXHeight = Math.round(effectiveBaseline - effectiveCapDistance * 0.62);

      // Ascender line
      ctx.strokeStyle = '#93c5fd'; // Soft blue
      ctx.lineWidth = 1.2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(40, CANVAS_ASCENDER);
      ctx.lineTo(CANVAS_SIZE - 40, CANVAS_ASCENDER);
      ctx.stroke();

      // Optical overshoot guides for curved letters (O, C, S, Q, G) if enabled (±8px)
      if (guideConfig.showOvershoot) {
        ctx.save();
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.28)'; // Soft blue overshoot band
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 4]);

        // Cap-Height top overshoot line (-8px above cap height)
        ctx.beginPath();
        ctx.moveTo(40, effectiveCapHeight - 8);
        ctx.lineTo(CANVAS_SIZE - 40, effectiveCapHeight - 8);
        ctx.stroke();

        // Baseline bottom overshoot line (+8px below baseline)
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.28)'; // Soft red overshoot band
        ctx.beginPath();
        ctx.moveTo(40, effectiveBaseline + 8);
        ctx.lineTo(CANVAS_SIZE - 40, effectiveBaseline + 8);
        ctx.stroke();

        // Shaded subtle overshoot guide bands
        ctx.fillStyle = 'rgba(59, 130, 246, 0.04)';
        ctx.fillRect(40, effectiveCapHeight - 8, CANVAS_SIZE - 80, 8);
        ctx.fillStyle = 'rgba(239, 68, 68, 0.04)';
        ctx.fillRect(40, effectiveBaseline, CANVAS_SIZE - 80, 8);
        ctx.restore();
      }

      // Configurable Cap Height line
      ctx.strokeStyle = guideConfig.capHeightColor || '#3b82f6';
      ctx.lineWidth = guideConfig.lineWidth || 1.8;
      ctx.setLineDash([8, 4]);
      ctx.beginPath();
      ctx.moveTo(40, effectiveCapHeight);
      ctx.lineTo(CANVAS_SIZE - 40, effectiveCapHeight);
      ctx.stroke();

      // Proportional x-Height line
      ctx.strokeStyle = '#f59e0b'; // Amber
      ctx.lineWidth = 1.2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(40, effectiveXHeight);
      ctx.lineTo(CANVAS_SIZE - 40, effectiveXHeight);
      ctx.stroke();

      // Configurable Baseline (grounded solid or prominent line)
      ctx.strokeStyle = guideConfig.baselineColor || '#ef4444';
      ctx.lineWidth = Math.max(2, (guideConfig.lineWidth || 1.8) + 0.4);
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(40, effectiveBaseline);
      ctx.lineTo(CANVAS_SIZE - 40, effectiveBaseline);
      ctx.stroke();

      // Descender line
      ctx.strokeStyle = '#c084fc'; // Purple
      ctx.lineWidth = 1.2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(40, CANVAS_DESCENDER);
      ctx.lineTo(CANVAS_SIZE - 40, CANVAS_DESCENDER);
      ctx.stroke();

      ctx.setLineDash([]);

      // Capital height dimension caliper on right margin
      ctx.save();
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.45)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      const caliperX = CANVAS_SIZE - 45;
      ctx.moveTo(caliperX - 6, effectiveCapHeight);
      ctx.lineTo(caliperX, effectiveCapHeight);
      ctx.lineTo(caliperX, effectiveBaseline);
      ctx.lineTo(caliperX - 6, effectiveBaseline);
      ctx.stroke();

      // Caliper dimension text label
      ctx.fillStyle = '#6366f1';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${effectiveCapDistance}px Cap`, caliperX - 8, (effectiveCapHeight + effectiveBaseline) / 2 + 3);
      ctx.restore();

      // Advance width side bearings
      const leftX = CANVAS_ORIGIN_X;
      const rightX = leftX + (currentGlyph.advanceWidth || 600) * 0.72;

      ctx.strokeStyle = 'rgba(100, 116, 139, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([2, 2]);

      ctx.beginPath();
      ctx.moveTo(leftX, 60);
      ctx.lineTo(leftX, CANVAS_SIZE - 60);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(rightX, 60);
      ctx.lineTo(rightX, CANVAS_SIZE - 60);
      ctx.stroke();

      ctx.setLineDash([]);
    }

    // Tracing Guide overlay: Ghosted standard form to help maintain consistent letter proportions
    if (tracingGuide.enabled) {
      drawTracingGuideOverlay(ctx, currentChar, tracingGuide, slant);
    }

    // If editing an alternate variant and ghost primary is enabled, render primary glyph faintly underneath
    if (isEditingVariant && showPrimaryGhostInVariant && currentGlyph.strokes.length > 0) {
      ctx.save();
      ctx.globalAlpha = 0.2;
      renderCanvasVariableStrokes(
        ctx,
        currentGlyph.strokes,
        penSettings.baseWidth,
        penSettings.tool,
        penSettings.pressureSensitivity,
        '#1e293b',
        penSettings.angle ?? 45,
        penSettings.pressureCurve,
        penSettings.pressureGamma
      );
      ctx.restore();
    }

    // Ghost Path: Light-colored preview of previous character's baseline, height, and strokes
    if (ghostPath.enabled && hasGhostStrokes && ghostGlyph) {
      ctx.save();

      // In adjacent mode, position reference character immediately to the left of the current glyph
      const shiftX =
        ghostPath.placement === 'adjacent'
          ? Math.min(-60, -(CANVAS_ORIGIN_X + (ghostGlyph.advanceWidth || 600) * 0.55))
          : 0;

      // 1. Draw light-colored ghost strokes of the reference character
      ctx.save();
      ctx.translate(shiftX, 0);
      ctx.globalAlpha = ghostPath.opacity;
      renderCanvasVariableStrokes(
        ctx,
        ghostGlyph.strokes,
        penSettings.baseWidth,
        penSettings.tool,
        penSettings.pressureSensitivity,
        ghostPath.color,
        penSettings.angle ?? 45,
        penSettings.pressureCurve,
        penSettings.pressureGamma
      );
      ctx.restore();

      // 2. Draw previous character's baseline and height projection guide lines
      if (ghostPath.showGuidelines) {
        ctx.save();
        ctx.strokeStyle = ghostPath.color;
        ctx.lineWidth = 1.3;
        ctx.setLineDash([4, 4]);

        // Peak height horizontal line across canvas
        ctx.beginPath();
        ctx.moveTo(30, ghostMinY);
        ctx.lineTo(CANVAS_SIZE - 30, ghostMinY);
        ctx.stroke();

        // Baseline / bottom horizontal line across canvas
        ctx.beginPath();
        ctx.moveTo(30, ghostMaxY);
        ctx.lineTo(CANVAS_SIZE - 30, ghostMaxY);
        ctx.stroke();

        ctx.setLineDash([]);

        // Label badges for peak height & baseline
        const heightPx = Math.round(ghostMaxY - ghostMinY);
        ctx.font = 'bold 10px monospace';
        ctx.fillStyle = ghostPath.color;

        ctx.textBaseline = 'bottom';
        ctx.fillText(
          `Prev '${activeGhostChar}' Height (${heightPx}px)`,
          CANVAS_SIZE - 200,
          ghostMinY - 4
        );

        ctx.textBaseline = 'top';
        ctx.fillText(
          `Prev '${activeGhostChar}' Base`,
          CANVAS_SIZE - 140,
          ghostMaxY + 4
        );

        // Height dimension caliper on the left margin
        const bracketX = Math.max(30, ghostMinX + shiftX - 16);
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(bracketX + 5, ghostMinY);
        ctx.lineTo(bracketX, ghostMinY);
        ctx.lineTo(bracketX, ghostMaxY);
        ctx.lineTo(bracketX + 5, ghostMaxY);
        ctx.stroke();

        ctx.restore();
      }

      ctx.restore();
    }

    // Visual tilt guide axis line when character has custom rotation
    if (charRotation !== 0) {
      ctx.save();
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.35)'; // Soft indigo tilt guide
      ctx.lineWidth = 1.3;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      const tiltAngleRad = (charRotation * Math.PI) / 180;
      const lenTop = 440;
      const lenBot = 120;
      ctx.moveTo(
        pivotX - Math.sin(tiltAngleRad) * lenTop,
        pivotY - Math.cos(tiltAngleRad) * lenTop
      );
      ctx.lineTo(
        pivotX + Math.sin(tiltAngleRad) * lenBot,
        pivotY + Math.cos(tiltAngleRad) * lenBot
      );
      ctx.stroke();
      ctx.setLineDash([]);

      // Pivot origin anchor dot at baseline
      ctx.fillStyle = '#6366f1';
      ctx.beginPath();
      ctx.arc(pivotX, pivotY, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Label indicator
      ctx.font = 'bold 10px monospace';
      ctx.fillStyle = '#6366f1';
      ctx.textAlign = 'center';
      ctx.fillText(
        `'${currentChar}' Tilt: ${charRotation > 0 ? `+${charRotation}` : charRotation}°`,
        pivotX,
        CANVAS_BASELINE + 28
      );
      ctx.restore();
    }

    // Apply character-specific rotation around baseline pivot
    if (charRotation !== 0) {
      ctx.save();
      ctx.translate(pivotX, pivotY);
      ctx.rotate((charRotation * Math.PI) / 180);
      ctx.translate(-pivotX, -pivotY);
    }

    // Draw user ink strokes with real variable width
    renderCanvasVariableStrokes(
      ctx,
      currentStrokes,
      penSettings.baseWidth,
      penSettings.tool,
      penSettings.pressureSensitivity,
      '#1e293b',
      penSettings.angle ?? 45,
      penSettings.pressureCurve,
      penSettings.pressureGamma
    );

    // Draw visual indicator showing stroke width variation along the path
    if (showWidthOverlay && currentStrokes.length > 0) {
      drawStrokeWidthVisualIndicator(
        ctx,
        currentStrokes,
        penSettings.baseWidth,
        penSettings.tool,
        penSettings.pressureSensitivity,
        {
          showContours: true,
          showCalipers: showWidthCalipers,
          showHeatmap: true,
          showMinMaxBadges: showMinMaxBadges,
          showCenterline: true,
        },
        penSettings.angle ?? 45
      );
    }

    // Pressure Map visualization layer: renders stroke data with varying thicknesses to visualize & balance pen pressure
    if (showPressureHeatmap && currentStrokes.length > 0) {
      renderPressureHeatmapLayer(ctx, currentStrokes, penSettings.baseWidth, {
        palette: pressurePalette,
        showNumericBadges: showPressureBadges,
        showGlow: true,
        showUnderlineHalo: true,
        alpha: pressureOverlayAlpha,
        showSwellCalipers: showPressureSwellCalipers,
        showTremorWarnings: showPressureTremorWarnings,
        thicknessScale: pressureThicknessScale,
        renderThicknessEnvelopes: true,
        liveCursorPt: hoverCanvasPt,
      });
    }

    // Selective Segment or Whole Stroke Eraser Circular Reticle
    if (drawingMode === 'eraser' && eraserCursor && eraserCursor.visible) {
      ctx.save();
      const isSegment = eraserSubMode === 'segment';
      const strokeColor = isSegment ? '#f43f5e' : '#f97316';
      const fillColor = isSegment ? 'rgba(244, 63, 94, 0.12)' : 'rgba(249, 115, 22, 0.15)';

      ctx.strokeStyle = strokeColor;
      ctx.fillStyle = fillColor;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(eraserCursor.x, eraserCursor.y, eraserRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Center crosshair dot
      ctx.fillStyle = strokeColor;
      ctx.beginPath();
      ctx.arc(eraserCursor.x, eraserCursor.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Draw Bounding Box & Metric Centerlines Overlay
    if (showBoundingBox && currentBBox) {
      ctx.save();
      const leftX = CANVAS_ORIGIN_X;
      const rightX = leftX + (currentGlyph.advanceWidth || 600) * 0.72;
      const metricCenterX = (leftX + rightX) / 2;
      const metricCenterY = (CANVAS_ASCENDER + CANVAS_DESCENDER) / 2;

      // 1. Metric boundaries center crosshair (indigo)
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.45)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 4]);

      // Vertical metric center line
      ctx.beginPath();
      ctx.moveTo(metricCenterX, CANVAS_ASCENDER - 15);
      ctx.lineTo(metricCenterX, CANVAS_DESCENDER + 15);
      ctx.stroke();

      // Horizontal metric center line
      ctx.beginPath();
      ctx.moveTo(leftX - 15, metricCenterY);
      ctx.lineTo(rightX + 15, metricCenterY);
      ctx.stroke();

      // Target metric center intersection ring
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 1.8;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(metricCenterX, metricCenterY, 5, 0, Math.PI * 2);
      ctx.stroke();

      // 2. Stroke Bounding Box (emerald)
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.75)';
      ctx.lineWidth = 1.4;
      ctx.setLineDash([3, 3]);
      ctx.strokeRect(
        currentBBox.minX,
        currentBBox.minY,
        currentBBox.width,
        currentBBox.height
      );

      // 3. Stroke center point (emerald dot)
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(currentBBox.centerX, currentBBox.centerY, 4.5, 0, Math.PI * 2);
      ctx.fill();

      // Distance line from stroke center to metric center if offset
      const dist = Math.hypot(
        currentBBox.centerX - metricCenterX,
        currentBBox.centerY - metricCenterY
      );
      if (dist > 3) {
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(currentBBox.centerX, currentBBox.centerY);
        ctx.lineTo(metricCenterX, metricCenterY);
        ctx.stroke();
      }

      // Small badge showing bbox dimensions
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      const dimText = `${Math.round(currentBBox.width)}×${Math.round(currentBBox.height)}px`;
      ctx.font = 'bold 10px monospace';
      const textMetrics = ctx.measureText(dimText);
      const textW = textMetrics.width;
      const badgeX = currentBBox.minX;
      const badgeY = Math.max(18, currentBBox.minY - 6);
      ctx.fillRect(badgeX - 2, badgeY - 11, textW + 8, 14);
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      ctx.fillText(dimText, badgeX + 2, badgeY);

      ctx.restore();
    }

    // -------------------------------------------------------------
    // Reflection Tool: Vertical & Horizontal Axis Reflection Overlay
    // -------------------------------------------------------------
    if (reflectionSettings.enabled) {
      drawReflectionCanvasOverlay(
        ctx,
        reflectionAxisX,
        reflectionAxisY,
        reflectionSettings,
        {
          hoverPt: hoverCanvasPt,
          drawingMode,
          baseWidth: penSettings.baseWidth,
          width: CANVAS_SIZE,
          height: CANVAS_SIZE,
        }
      );

      // Mirrored eraser reticle when eraser mode is active
      if (drawingMode === 'eraser' && eraserCursor && eraserCursor.visible) {
        ctx.save();
        const mirroredPoints = reflectPoint(
          eraserCursor,
          reflectionAxisX,
          reflectionAxisY,
          reflectionSettings.type
        );
        const isSegment = eraserSubMode === 'segment';
        ctx.strokeStyle = isSegment ? '#f43f5e' : '#f97316';
        ctx.fillStyle = isSegment ? 'rgba(244, 63, 94, 0.12)' : 'rgba(249, 115, 22, 0.15)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);

        for (const mPt of mirroredPoints) {
          ctx.beginPath();
          ctx.arc(mPt.x, mPt.y, eraserRadius, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    // -------------------------------------------------------------
    // Simplify Paths: Ramer-Douglas-Peucker (RDP) Vector Node Overlay
    // -------------------------------------------------------------
    if (
      (simplifySettings.enabled || showSimplifyPanel || simplifySettings.showControlPoints) &&
      currentStrokes.length > 0
    ) {
      drawSimplifyCanvasOverlay(ctx, currentStrokes, simplifySettings);
    }

    if (charRotation !== 0) {
      ctx.restore();
    }

    // In Focus Mode, draw a clean high-contrast black character indicator & watermark
    if (isFocusMode) {
      ctx.save();
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`Focus Mode · '${currentChar}' (High Contrast Black)`, CANVAS_SIZE - 40, 48);
      ctx.restore();
    }

    ctx.restore();
  }, [
    currentStrokes,
    showGuides,
    showSlantGuides,
    slant,
    currentChar,
    currentGlyph.advanceWidth,
    currentGlyph.strokes,
    isEditingVariant,
    showPrimaryGhostInVariant,
    penSettings,
    showWidthOverlay,
    showWidthCalipers,
    showMinMaxBadges,
    showPressureHeatmap,
    pressurePalette,
    pressureOverlayAlpha,
    showPressureBadges,
    showPressureSwellCalipers,
    showPressureTremorWarnings,
    pressureThicknessScale,
    guideConfig,
    drawingMode,
    eraserSubMode,
    eraserRadius,
    eraserCursor,
    tracingGuide,
    underlay.src,
    underlay.visible,
    underlay.opacity,
    underlay.scale,
    underlay.offsetX,
    underlay.offsetY,
    underlay.grayscale,
    underlay.invert,
    ghostPath,
    hasGhostStrokes,
    ghostGlyph,
    ghostMinX,
    ghostMaxX,
    ghostMinY,
    ghostMaxY,
    activeGhostChar,
    charRotation,
    pivotX,
    pivotY,
    showBoundingBox,
    currentBBox,
    isFocusMode,
    reflectionSettings,
    reflectionAxisX,
    reflectionAxisY,
    hoverCanvasPt,
    gridSettings,
    simplifySettings,
    showSimplifyPanel,
  ]);

  // Load underlay image into underlayImgRef whenever underlay.src changes
  useEffect(() => {
    if (!underlay.src) {
      underlayImgRef.current = null;
      renderCanvas();
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      underlayImgRef.current = img;
      renderCanvas();
    };
    img.src = underlay.src;
  }, [underlay.src, renderCanvas]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Pointer event handlers for drawing
  const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0, pressure: 1 };
    const rect = canvas.getBoundingClientRect();
    let x = ((e.clientX - rect.left) / rect.width) * CANVAS_SIZE;
    let y = ((e.clientY - rect.top) / rect.height) * CANVAS_SIZE;

    // Inverse-rotate around baseline pivot so pen input lines up exactly on rotated canvas
    if (charRotation !== 0) {
      const rad = (-charRotation * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const dx = x - pivotX;
      const dy = y - pivotY;
      x = pivotX + dx * cos - dy * sin;
      y = pivotY + dx * sin + dy * cos;
    }
    
    // Check hardware pressure vs fallback
    let pressure = 1;
    if (e.pointerType === 'pen' && typeof e.pressure === 'number' && e.pressure > 0) {
      pressure = Math.round(e.pressure * 100) / 100;
    } else if (typeof e.pressure === 'number' && e.pressure > 0 && e.pressure !== 0.5) {
      pressure = Math.round(e.pressure * 100) / 100;
    } else {
      pressure = 0.95;
    }

    return { x: Math.round(x), y: Math.round(y), pressure };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDrawing(true);
    const pt = getCanvasPoint(e);
    setHoverCanvasPt(pt);

    const isStylusEraser = (e.buttons & 32) !== 0 || e.button === 5;
    const effectiveEraser = drawingMode === 'eraser' || isStylusEraser;

    // Eraser mode: selectively slice and remove stroke segments or whole strokes inside circular brush
    if (effectiveEraser) {
      prevEraserPosRef.current = { x: pt.x, y: pt.y };
      hasPushedUndoForCurrentEraserDrag.current = false;
      setEraserCursor({ x: pt.x, y: pt.y, visible: true });

      if (currentStrokes.length > 0) {
        let result =
          eraserSubMode === 'segment'
            ? eraseStrokeSegments(currentStrokes, pt.x, pt.y, eraserRadius)
            : eraseWholeStrokesAtPoint(currentStrokes, pt.x, pt.y, eraserRadius);

        // Also erase mirrored points across reflection axes if reflection tool is enabled
        if (reflectionSettings.enabled) {
          const mirroredPts = reflectPoint(
            pt,
            reflectionAxisX,
            reflectionAxisY,
            reflectionSettings.type
          );
          for (const mPt of mirroredPts) {
            const symResult =
              eraserSubMode === 'segment'
                ? eraseStrokeSegments(result.strokes, mPt.x, mPt.y, eraserRadius)
                : eraseWholeStrokesAtPoint(result.strokes, mPt.x, mPt.y, eraserRadius);
            if (symResult.changed) {
              result = { strokes: symResult.strokes, changed: true };
            }
          }
        }

        if (result.changed) {
          setUndoStack((prev) => [...prev.slice(-49), cloneGlyphStrokes(currentStrokes)]);
          setRedoStack([]);
          hasPushedUndoForCurrentEraserDrag.current = true;
          if (onRecordHistory) {
            onRecordHistory(
              eraserSubMode === 'segment'
                ? `Erase segments in '${currentChar}'`
                : `Delete stroke in '${currentChar}'`
            );
          }
          updateActiveStrokes(result.strokes);
        }
      }
      return;
    }

    // Pen mode: Entry taper & start point grid snapping
    let drawPt: { x: number; y: number; pressure: number } = pt;
    if (gridSettings.enabled) {
      const snapRes = snapPointToGrid(pt, gridSettings.gridSize, gridSettings.magneticThreshold);
      if (snapRes.snapped) {
        drawPt = {
          x: snapRes.point.x,
          y: snapRes.point.y,
          pressure: snapRes.point.pressure ?? pt.pressure,
        };
      }
    }

    if (penSettings.pressureSensitivity && e.pointerType !== 'pen') {
      drawPt.pressure = 0.65;
    }
    // Save deep-cloned state to undo stack before stroke begins
    setUndoStack((prev) => [...prev.slice(-49), cloneGlyphStrokes(currentStrokes)]);
    setRedoStack([]);

    if (reflectionSettings.enabled) {
      const mirroredPts = reflectPoint(
        drawPt,
        reflectionAxisX,
        reflectionAxisY,
        reflectionSettings.type
      );
      // Push primary stroke and all mirrored strokes in tandem
      const newStrokes = [
        ...currentStrokes,
        [drawPt],
        ...mirroredPts.map((mPt) => [{ x: mPt.x, y: mPt.y, pressure: mPt.pressure ?? drawPt.pressure }]),
      ];
      updateActiveStrokes(newStrokes);
    } else {
      const newStrokes = [...currentStrokes, [drawPt]];
      updateActiveStrokes(newStrokes);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pt = getCanvasPoint(e);
    setHoverCanvasPt(pt);

    const isStylusEraser = (e.buttons & 32) !== 0 || e.button === 5;
    const effectiveEraser = drawingMode === 'eraser' || isStylusEraser;

    // Eraser mode: update cursor reticle and continuously erase intersected stroke segments along drag path
    if (effectiveEraser) {
      setEraserCursor({ x: pt.x, y: pt.y, visible: true });

      if (isDrawing && currentStrokes.length > 0) {
        let result: { strokes: GlyphStroke[]; changed: boolean };

        if (eraserSubMode === 'segment') {
          if (prevEraserPosRef.current) {
            result = eraseStrokeSegmentsAlongPath(
              currentStrokes,
              prevEraserPosRef.current.x,
              prevEraserPosRef.current.y,
              pt.x,
              pt.y,
              eraserRadius
            );
          } else {
            result = eraseStrokeSegments(currentStrokes, pt.x, pt.y, eraserRadius);
          }

          if (reflectionSettings.enabled) {
            const mirroredPts = reflectPoint(
              pt,
              reflectionAxisX,
              reflectionAxisY,
              reflectionSettings.type
            );
            const prevMirroredPts = prevEraserPosRef.current
              ? reflectPoint(
                  prevEraserPosRef.current,
                  reflectionAxisX,
                  reflectionAxisY,
                  reflectionSettings.type
                )
              : mirroredPts;

            for (let i = 0; i < mirroredPts.length; i++) {
              const mPt = mirroredPts[i];
              const pMPt = prevMirroredPts[i] || mPt;
              const symResult = prevEraserPosRef.current
                ? eraseStrokeSegmentsAlongPath(
                    result.strokes,
                    pMPt.x,
                    pMPt.y,
                    mPt.x,
                    mPt.y,
                    eraserRadius
                  )
                : eraseStrokeSegments(result.strokes, mPt.x, mPt.y, eraserRadius);
              if (symResult.changed) {
                result = { strokes: symResult.strokes, changed: true };
              }
            }
          }
        } else {
          result = eraseWholeStrokesAtPoint(currentStrokes, pt.x, pt.y, eraserRadius);
          if (reflectionSettings.enabled) {
            const mirroredPts = reflectPoint(
              pt,
              reflectionAxisX,
              reflectionAxisY,
              reflectionSettings.type
            );
            for (const mPt of mirroredPts) {
              const symResult = eraseWholeStrokesAtPoint(result.strokes, mPt.x, mPt.y, eraserRadius);
              if (symResult.changed) {
                result = { strokes: symResult.strokes, changed: true };
              }
            }
          }
        }

        if (result.changed) {
          if (!hasPushedUndoForCurrentEraserDrag.current) {
            setUndoStack((prev) => [...prev.slice(-49), cloneGlyphStrokes(currentStrokes)]);
            setRedoStack([]);
            hasPushedUndoForCurrentEraserDrag.current = true;
            if (onRecordHistory) {
              onRecordHistory(
                eraserSubMode === 'segment'
                  ? `Erase segments in '${currentChar}'`
                  : `Delete stroke in '${currentChar}'`
              );
            }
          }
          updateActiveStrokes(result.strokes);
        }
      }

      prevEraserPosRef.current = { x: pt.x, y: pt.y };
      return;
    }

    if (!isDrawing) return;
    const strokes = [...currentStrokes];
    if (strokes.length === 0) return;

    if (reflectionSettings.enabled) {
      const mirroredCount = reflectionSettings.type === 'quad' ? 3 : 1;
      const totalGroup = 1 + mirroredCount;
      if (strokes.length < totalGroup) return;

      const priIdx = strokes.length - totalGroup;
      const primaryStroke = [...strokes[priIdx]];
      const lastPt = primaryStroke[primaryStroke.length - 1];
      if (!lastPt) return;

      // Dynamic speed & downstroke response
      if (e.pointerType !== 'pen' && penSettings.pressureSensitivity) {
        const dy = pt.y - lastPt.y;
        const dx = pt.x - lastPt.x;
        const dist = Math.hypot(dx, dy) || 1;
        const downwardness = dy / dist;
        let dynamicPressure = 0.9;
        if (downwardness > 0.25) {
          dynamicPressure = 1.0 + downwardness * 0.45;
        } else if (downwardness < -0.25) {
          dynamicPressure = 0.62;
        }
        pt.pressure = Math.round(dynamicPressure * 100) / 100;
      }

      const smoothingVal = typeof penSettings.smoothing === 'number' ? penSettings.smoothing : 0.5;
      const stabilizedPt = stabilizePointRealtime(pt, lastPt, smoothingVal);
      if (!stabilizedPt) return;

      primaryStroke.push(stabilizedPt);
      strokes[priIdx] = primaryStroke;

      const mirroredPts = reflectPoint(
        stabilizedPt,
        reflectionAxisX,
        reflectionAxisY,
        reflectionSettings.type
      );
      mirroredPts.forEach((mPt, idx) => {
        const mStroke = [...strokes[priIdx + 1 + idx]];
        mStroke.push(mPt);
        strokes[priIdx + 1 + idx] = mStroke;
      });

      updateActiveStrokes(strokes);
      return;
    }

    const activeStroke = [...strokes[strokes.length - 1]];
    const lastPt = activeStroke[activeStroke.length - 1];
    if (!lastPt) return;

    // For mouse/trackpad drawing with pressure sensitivity on: dynamic speed & downstroke response
    if (e.pointerType !== 'pen' && penSettings.pressureSensitivity) {
      const dy = pt.y - lastPt.y;
      const dx = pt.x - lastPt.x;
      const dist = Math.hypot(dx, dy) || 1;
      const downwardness = dy / dist; // 1 = down, -1 = up
      let dynamicPressure = 0.9;
      if (downwardness > 0.25) {
        dynamicPressure = 1.0 + downwardness * 0.45; // Broad downstroke swell
      } else if (downwardness < -0.25) {
        dynamicPressure = 0.62; // Delicate hairline upstroke
      }
      pt.pressure = Math.round(dynamicPressure * 100) / 100;
    }

    // Real-time stroke smoothing & stabilization filter based on penSettings.smoothing
    const smoothingVal = typeof penSettings.smoothing === 'number' ? penSettings.smoothing : 0.5;
    const stabilizedPt = stabilizePointRealtime(pt, lastPt, smoothingVal);
    if (!stabilizedPt) return; // Micro-jitter below threshold filtered out

    activeStroke.push(stabilizedPt);
    strokes[strokes.length - 1] = activeStroke;
    updateActiveStrokes(strokes);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    prevEraserPosRef.current = null;
    hasPushedUndoForCurrentEraserDrag.current = false;

    // Finalize stroke with curve relaxation based on penSettings.smoothing
    const smoothingVal = typeof penSettings.smoothing === 'number' ? penSettings.smoothing : 0.5;
    if (drawingMode === 'pen' && smoothingVal >= 0.15 && currentStrokes.length > 0) {
      const strokes = [...currentStrokes];

      if (reflectionSettings.enabled) {
        const mirroredCount = reflectionSettings.type === 'quad' ? 3 : 1;
        const totalGroup = 1 + mirroredCount;
        if (strokes.length >= totalGroup) {
          const priIdx = strokes.length - totalGroup;
          const primaryStroke = strokes[priIdx];
          if (primaryStroke && primaryStroke.length >= 3) {
            const finalizedPrimary = finalizeStrokeWithSmoothing(primaryStroke, smoothingVal);
            strokes[priIdx] = finalizedPrimary;
            // Mirror finalized primary curve points to preserve 100% mathematical symmetry
            const mirroredStrokes = reflectStroke(
              finalizedPrimary,
              reflectionAxisX,
              reflectionAxisY,
              reflectionSettings.type
            );
            mirroredStrokes.forEach((mStroke, idx) => {
              strokes[priIdx + 1 + idx] = mStroke;
            });
            updateActiveStrokes(strokes);
          }
        }
      } else {
        const activeStroke = strokes[strokes.length - 1];
        if (activeStroke && activeStroke.length >= 3) {
          const finalized = finalizeStrokeWithSmoothing(activeStroke, smoothingVal);
          strokes[strokes.length - 1] = finalized;
          updateActiveStrokes(strokes);
        }
      }
    }

    // Snap stroke endpoint to grid if Snap to Grid is enabled
    if (gridSettings.enabled && drawingMode === 'pen' && currentStrokes.length > 0) {
      const strokes = [...currentStrokes];
      if (reflectionSettings.enabled) {
        const mirroredCount = reflectionSettings.type === 'quad' ? 3 : 1;
        const totalGroup = 1 + mirroredCount;
        if (strokes.length >= totalGroup) {
          const priIdx = strokes.length - totalGroup;
          const priStroke = [...strokes[priIdx]];
          if (priStroke.length > 0) {
            const lastPt = priStroke[priStroke.length - 1];
            const snapRes = snapPointToGrid(lastPt, gridSettings.gridSize, gridSettings.magneticThreshold);
            if (snapRes.snapped) {
              priStroke[priStroke.length - 1] = {
                x: snapRes.point.x,
                y: snapRes.point.y,
                pressure: snapRes.point.pressure ?? lastPt.pressure,
              };
              strokes[priIdx] = priStroke;
              const mirroredStrokes = reflectStroke(
                priStroke,
                reflectionAxisX,
                reflectionAxisY,
                reflectionSettings.type
              );
              mirroredStrokes.forEach((mStroke, idx) => {
                strokes[priIdx + 1 + idx] = mStroke;
              });
              updateActiveStrokes(strokes);
            }
          }
        }
      } else {
        const actIdx = strokes.length - 1;
        const actStroke = [...strokes[actIdx]];
        if (actStroke.length > 0) {
          const lastPt = actStroke[actStroke.length - 1];
          const snapRes = snapPointToGrid(lastPt, gridSettings.gridSize, gridSettings.magneticThreshold);
          if (snapRes.snapped) {
            actStroke[actStroke.length - 1] = {
              x: snapRes.point.x,
              y: snapRes.point.y,
              pressure: snapRes.point.pressure ?? lastPt.pressure,
            };
            strokes[actIdx] = actStroke;
            updateActiveStrokes(strokes);
          }
        }
      }
    }

    // Auto-Simplify on Draw: apply Ramer-Douglas-Peucker immediately to newly drawn strokes
    if (simplifySettings.autoSimplifyOnDraw && drawingMode === 'pen' && currentStrokes.length > 0) {
      const strokes = [...currentStrokes];
      if (reflectionSettings.enabled) {
        const mirroredCount = reflectionSettings.type === 'quad' ? 3 : 1;
        const totalGroup = 1 + mirroredCount;
        if (strokes.length >= totalGroup) {
          const priIdx = strokes.length - totalGroup;
          const priStroke = strokes[priIdx];
          if (priStroke && priStroke.length > 2) {
            const simplifiedPri = simplifyStroke(
              priStroke,
              simplifySettings.epsilon,
              simplifySettings.curveRelaxation
            );
            strokes[priIdx] = simplifiedPri;
            const mirroredStrokes = reflectStroke(
              simplifiedPri,
              reflectionAxisX,
              reflectionAxisY,
              reflectionSettings.type
            );
            mirroredStrokes.forEach((mStroke, idx) => {
              strokes[priIdx + 1 + idx] = mStroke;
            });
            updateActiveStrokes(strokes);
          }
        }
      } else {
        const actIdx = strokes.length - 1;
        const actStroke = strokes[actIdx];
        if (actStroke && actStroke.length > 2) {
          const simplified = simplifyStroke(
            actStroke,
            simplifySettings.epsilon,
            simplifySettings.curveRelaxation
          );
          strokes[actIdx] = simplified;
          updateActiveStrokes(strokes);
        }
      }
    }

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore if pointer capture release throws
    }
  };

  const handlePointerLeave = () => {
    setEraserCursor(null);
    setHoverCanvasPt(null);
    prevEraserPosRef.current = null;
  };

  // Delete the most recent stroke with full undo tracking
  const handleDeleteLastStroke = useCallback(() => {
    if (currentStrokes.length === 0) return;
    setUndoStack((prev) => [...prev.slice(-49), cloneGlyphStrokes(currentStrokes)]);
    setRedoStack([]);
    const countToDelete = reflectionSettings.enabled
      ? (reflectionSettings.type === 'quad' ? 4 : 2)
      : 1;
    const effectiveCount = Math.min(countToDelete, currentStrokes.length);
    const updated = currentStrokes.slice(0, -effectiveCount);
    updateActiveStrokes(updated);
    setBeautifyNotice(
      `Deleted ${
        effectiveCount > 1
          ? `mirrored stroke group (${effectiveCount} strokes)`
          : 'stroke'
      } (${updated.length} left). Revert with Undo [Ctrl+Z].`
    );
    setTimeout(() => setBeautifyNotice(null), 2500);
  }, [currentStrokes, updateActiveStrokes, reflectionSettings.enabled, reflectionSettings.type]);

  const handleClear = () => {
    if (currentStrokes.length === 0) return;
    setUndoStack((prev) => [...prev.slice(-49), cloneGlyphStrokes(currentStrokes)]);
    setRedoStack([]);
    updateActiveStrokes([]);
    setBeautifyNotice(`Cleared all ink. Press Ctrl+Z or Undo to restore.`);
    setTimeout(() => setBeautifyNotice(null), 3500);
  };

  const handleUndo = useCallback(() => {
    setIsDrawing(false);
    if (undoStack.length > 0) {
      const prevStrokes = undoStack[undoStack.length - 1];
      const newUndo = undoStack.slice(0, -1);
      setUndoStack(newUndo);
      setRedoStack((prev) => [...prev.slice(-49), cloneGlyphStrokes(currentStrokes)]);
      updateActiveStrokes(cloneGlyphStrokes(prevStrokes));
      setBeautifyNotice(`Undo: reverted stroke (${newUndo.length} left in history)`);
      setTimeout(() => setBeautifyNotice(null), 1800);
    } else if (currentStrokes.length > 0) {
      setRedoStack((prev) => [...prev.slice(-49), cloneGlyphStrokes(currentStrokes)]);
      updateActiveStrokes(cloneGlyphStrokes(currentStrokes.slice(0, -1)));
      setBeautifyNotice(`Undo: removed stroke (${currentStrokes.length - 1} remaining)`);
      setTimeout(() => setBeautifyNotice(null), 1800);
    } else if (onGlobalUndo && canGlobalUndo) {
      onGlobalUndo();
    }
  }, [undoStack, currentStrokes, updateActiveStrokes, onGlobalUndo, canGlobalUndo]);

  const handleRedo = useCallback(() => {
    setIsDrawing(false);
    if (redoStack.length > 0) {
      const nextStrokes = redoStack[redoStack.length - 1];
      const newRedo = redoStack.slice(0, -1);
      setRedoStack(newRedo);
      setUndoStack((prev) => [...prev.slice(-49), cloneGlyphStrokes(currentStrokes)]);
      updateActiveStrokes(cloneGlyphStrokes(nextStrokes));
      setBeautifyNotice(`Redo: restored stroke (${newRedo.length} remaining)`);
      setTimeout(() => setBeautifyNotice(null), 1800);
    } else if (onGlobalRedo && canGlobalRedo) {
      onGlobalRedo();
    }
  }, [redoStack, currentStrokes, updateActiveStrokes, onGlobalRedo, canGlobalRedo]);

  const goToPrev = () => {
    if (currentIndex > 0) {
      onSelectChar(allChars[currentIndex - 1]);
    }
  };

  const goToNext = () => {
    if (currentIndex < allChars.length - 1) {
      onSelectChar(allChars[currentIndex + 1]);
    }
  };

  // Keyboard navigation & canvas actions
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If typing in input or textarea, ignore
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        (document.activeElement as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      // Undo: Ctrl+Z / Cmd+Z (without shift)
      if ((e.metaKey || e.ctrlKey) && (e.key === 'z' || e.key === 'Z') && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Redo: Ctrl+Y / Cmd+Y or Ctrl+Shift+Z / Cmd+Shift+Z
      if (
        ((e.metaKey || e.ctrlKey) && (e.key === 'y' || e.key === 'Y')) ||
        ((e.metaKey || e.ctrlKey) && (e.key === 'z' || e.key === 'Z') && e.shiftKey)
      ) {
        e.preventDefault();
        handleRedo();
        return;
      }

      // Tool switches: E for Eraser, P for Pen
      if ((e.key === 'e' || e.key === 'E') && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setDrawingMode('eraser');
        setBeautifyNotice(`Eraser Tool active (Size: ${eraserRadius}px)`);
        setTimeout(() => setBeautifyNotice(null), 1500);
        return;
      }
      if ((e.key === 'p' || e.key === 'P') && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setDrawingMode('pen');
        setBeautifyNotice('Pen Drawing Tool active');
        setTimeout(() => setBeautifyNotice(null), 1500);
        return;
      }
      // M: Toggle Pressure Map
      if ((e.key === 'm' || e.key === 'M') && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setShowPressureHeatmap((prev) => {
          const next = !prev;
          setBeautifyNotice(
            next
              ? 'Pressure Map Overlay ON: Visualizing variable thickness & pressure balance [M]'
              : 'Pressure Map Overlay OFF'
          );
          setTimeout(() => setBeautifyNotice(null), 2000);
          return next;
        });
        return;
      }

      // S: Toggle Reflection Tool (horizontal, vertical, or quad 4-way mirroring)
      // Shift+S: Cycle reflection mode (horizontal -> vertical -> quad)
      if ((e.key === 's' || e.key === 'S') && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        if (e.shiftKey) {
          setReflectionSettings((prev) => {
            const nextType: ReflectionType =
              prev.type === 'horizontal'
                ? 'vertical'
                : prev.type === 'vertical'
                ? 'quad'
                : 'horizontal';
            const typeLabel =
              nextType === 'horizontal'
                ? 'Horizontal (Left ↔ Right)'
                : nextType === 'vertical'
                ? 'Vertical (Top ↕ Bottom)'
                : 'Quad 4-Way (Dual Axes)';
            setBeautifyNotice(`Reflection Mode: ${typeLabel} [Shift+S]`);
            setTimeout(() => setBeautifyNotice(null), 2500);
            return { ...prev, type: nextType, enabled: true };
          });
        } else {
          setReflectionSettings((prev) => {
            const next = !prev.enabled;
            const typeLabel =
              prev.type === 'horizontal'
                ? `Horizontal (X=${reflectionAxisX}px)`
                : prev.type === 'vertical'
                ? `Vertical (Y=${reflectionAxisY}px)`
                : `Quad 4-Way (X=${reflectionAxisX}px, Y=${reflectionAxisY}px)`;
            setBeautifyNotice(
              next
                ? `Reflection Tool ON: ${typeLabel} [S]`
                : 'Reflection Tool OFF [S]'
            );
            setTimeout(() => setBeautifyNotice(null), 2500);
            return { ...prev, enabled: next };
          });
        }
        return;
      }

      // X: Toggle Snap to Grid (endpoint alignment)
      if ((e.key === 'x' || e.key === 'X') && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setGridSettings((prev) => {
          const next = !prev.enabled;
          setBeautifyNotice(
            next
              ? `Snap to Grid ON: aligning stroke endpoints to ${prev.gridSize}px pitch [X]`
              : 'Snap to Grid OFF'
          );
          setTimeout(() => setBeautifyNotice(null), 2000);
          return { ...prev, enabled: next };
        });
        return;
      }

      // Y: Toggle Simplify Paths (Ramer-Douglas-Peucker) tool panel
      if ((e.key === 'y' || e.key === 'Y') && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setShowSimplifyPanel((prev) => {
          const next = !prev;
          setBeautifyNotice(
            next
              ? `Simplify Paths (RDP ε=${simplifySettings.epsilon}px) Inspector Open [Y]`
              : 'Simplify Paths Inspector Closed'
          );
          setTimeout(() => setBeautifyNotice(null), 2000);
          return next;
        });
        return;
      }

      if (e.key === 'ArrowLeft') {
        goToPrev();
      } else if (e.key === 'ArrowRight') {
        goToNext();
      } else if (e.key === 't' || e.key === 'T') {
        // Toggle Ghost Template (standard Latin tracing guide) overlay
        e.preventDefault();
        if (e.shiftKey) {
          setShowTracingGuidePanel((prev) => {
            const next = !prev;
            setBeautifyNotice(
              next
                ? `Ghost Template Inspector Open [Shift+T]`
                : 'Ghost Template Inspector Closed'
            );
            setTimeout(() => setBeautifyNotice(null), 2000);
            return next;
          });
        } else {
          setTracingGuide((prev) => {
            const next = !prev.enabled;
            setBeautifyNotice(
              next
                ? `Ghost Template ON: Tracing '${currentChar}' standard Latin guide [T]`
                : 'Ghost Template OFF [T]'
            );
            setTimeout(() => setBeautifyNotice(null), 2000);
            return { ...prev, enabled: next };
          });
        }
      } else if (e.key === 'g' || e.key === 'G') {
        // Toggle Ghost Path preview of previous character's baseline & height
        e.preventDefault();
        setGhostPath((prev) => ({ ...prev, enabled: !prev.enabled }));
      } else if (e.key === 'u' || e.key === 'U') {
        // Toggle underlay reference image
        e.preventDefault();
        if (!underlay.src) {
          underlayInputRef.current?.click();
        } else {
          setUnderlay((prev) => ({ ...prev, visible: !prev.visible }));
        }
      } else if (e.key === 'b' || e.key === 'B') {
        // Beautify & smooth current glyph
        e.preventDefault();
        handleBeautifyCurrent();
      } else if (e.key === 'h' || e.key === 'H') {
        // Mirror horizontally
        e.preventDefault();
        handleMirrorHorizontal();
      } else if (e.key === 'v' || e.key === 'V') {
        // Mirror vertically
        e.preventDefault();
        handleMirrorVertical();
      } else if (e.key === '[' || e.key === '{') {
        e.preventDefault();
        if (drawingMode === 'eraser') {
          setEraserRadius((r) => Math.max(8, r - 4));
        } else {
          // Tilt character left (decrease rotation)
          handleRotationChange(Math.max(-30, charRotation - 1));
        }
      } else if (e.key === ']' || e.key === '}') {
        e.preventDefault();
        if (drawingMode === 'eraser') {
          setEraserRadius((r) => Math.min(60, r + 4));
        } else {
          // Tilt character right (increase rotation)
          handleRotationChange(Math.min(30, charRotation + 1));
        }
      } else if (e.altKey && (e.key === 'c' || e.key === 'C')) {
        // Alt+C: Open Copy Glyph & Base Shapes Modal
        e.preventDefault();
        setIsCopyGlyphModalOpen(true);
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'C' || e.key === 'c')) {
        // Ctrl+Shift+C: Quick copy current character strokes to clipboard
        e.preventDefault();
        if (currentStrokes.length > 0) {
          setGlyphClipboard({
            char: currentChar,
            strokes: JSON.parse(JSON.stringify(currentStrokes)),
            advanceWidth: currentGlyph.advanceWidth || 600,
          });
          setBeautifyNotice(`Copied '${currentChar}' (${currentStrokes.length} strokes) to clipboard!`);
          setTimeout(() => setBeautifyNotice(null), 2500);
        }
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'V' || e.key === 'v')) {
        // Ctrl+Shift+V: Quick paste strokes from clipboard
        e.preventDefault();
        if (glyphClipboard && glyphClipboard.strokes.length > 0) {
          handleApplyCopyStrokes(glyphClipboard.char, currentChar, 'replace', true);
        }
      } else if (e.key === 'c' || e.key === 'C') {
        // Center glyph strokes within metric boundaries
        e.preventDefault();
        handleCenterGlyph();
      } else if ((e.key === 'f' || e.key === 'F') && !e.ctrlKey && !e.metaKey) {
        // Toggle Focus Mode in GlyphStudio
        e.preventDefault();
        setIsFocusMode((prev) => !prev);
      } else if (e.key === 'Escape') {
        if (isFocusMode) {
          e.preventDefault();
          setIsFocusMode(false);
        }
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        // Delete last stroke with undo support
        if (currentStrokes.length > 0) {
          e.preventDefault();
          handleDeleteLastStroke();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    currentIndex,
    handleUndo,
    handleRedo,
    drawingMode,
    eraserRadius,
    charRotation,
    handleRotationChange,
    handleDeleteLastStroke,
    currentStrokes.length,
    underlay.src,
    handleBeautifyCurrent,
    handleMirrorHorizontal,
    handleMirrorVertical,
    handleCenterGlyph,
    handleApplyCopyStrokes,
    glyphClipboard,
    currentChar,
    currentGlyph.advanceWidth,
    allChars,
    onSelectChar,
    isFocusMode,
  ]);

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-61px)] bg-slate-50 overflow-hidden relative">
      {/* Mobile Studio Segmented View Tabs (Visible on screens < lg) */}
      {!isFocusMode && (
        <div className="lg:hidden flex items-center justify-between px-3 py-2 bg-white border-b border-slate-200 shadow-2xs z-30 sticky top-0 shrink-0">
          <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg flex-1">
            <button
              onClick={() => setMobileStudioTab('canvas')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-semibold transition-all ${
                mobileStudioTab === 'canvas'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <PenTool className="w-3.5 h-3.5 text-indigo-600" />
              <span>Canvas</span>
              <span className="font-mono text-[10px] text-slate-500 font-bold">('{currentChar}')</span>
            </button>
            <button
              onClick={() => setMobileStudioTab('matrix')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-semibold transition-all ${
                mobileStudioTab === 'matrix'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5 text-emerald-600" />
              <span>Glyphs</span>
              <span className="font-mono text-[10px] text-slate-500">
                {Object.values(glyphs).filter((g) => g.strokes.length > 0).length}/{allChars.length}
              </span>
            </button>
            <button
              onClick={() => setMobileStudioTab('inspector')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-semibold transition-all ${
                mobileStudioTab === 'inspector'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-amber-600" />
              <span>Inspect & Tools</span>
            </button>
          </div>
        </div>
      )}

      {/* Left Column: Character Matrix Navigator */}
      <aside
        className={`w-full lg:w-72 bg-white border-b lg:border-b-0 lg:border-r border-slate-200 flex-col shrink-0 transition-all ${
          isFocusMode
            ? 'hidden'
            : mobileStudioTab === 'matrix'
            ? 'flex flex-1 min-h-0'
            : 'hidden lg:flex'
        }`}
      >
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-slate-900 tracking-wider uppercase font-mono">
              Glyph Matrix
            </h2>
            <div className="flex items-center gap-1.5">
              {onUpdateAllGlyphs && (
                <button
                  onClick={handleBatchBeautify}
                  className="text-[10px] text-amber-800 hover:text-amber-950 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 px-1.5 py-0.5 rounded flex items-center gap-1 font-medium transition-colors"
                  title="Smooth curves, reduce hand jitter, and align baselines across all glyphs in font"
                >
                  <Wand2 className="w-2.5 h-2.5 text-amber-600" />
                  <span>Clean All</span>
                </button>
              )}
              <span className="text-xs text-slate-500 font-mono tabular-nums">
                {Object.values(glyphs).filter((g) => g.strokes.length > 0).length} / {allChars.length}
              </span>
            </div>
          </div>

          {/* Group Tabs */}
          <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-lg text-xs font-medium">
            {CHARACTER_GROUPS.map((g) => (
              <button
                key={g.name}
                onClick={() => setActiveGroup(g.name)}
                className={`py-1 rounded text-center transition-colors truncate ${
                  activeGroup === g.name
                    ? 'bg-white text-slate-900 shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {g.name.slice(0, 4)}
              </button>
            ))}
          </div>
        </div>

        {/* Character Grid */}
        <div className="flex-1 overflow-y-auto p-3 grid grid-cols-5 sm:grid-cols-6 lg:grid-cols-4 gap-2 content-start">
          {CHARACTER_GROUPS.find((g) => g.name === activeGroup)?.chars.map((char) => {
            const glyph = glyphs[char];
            const hasInk = glyph && glyph.strokes.length > 0;
            const isSelected = char === currentChar;

            return (
              <button
                key={char}
                onClick={() => {
                  onSelectChar(char);
                  setMobileStudioTab('canvas');
                }}
                className={`relative aspect-square flex flex-col items-center justify-center rounded-lg border transition-all ${
                  isSelected
                    ? 'border-slate-900 bg-slate-900 text-white shadow-md'
                    : hasInk
                    ? 'border-slate-200 bg-white text-slate-900 hover:border-slate-400'
                    : 'border-dashed border-slate-200 bg-slate-50/50 text-slate-400 hover:border-slate-300 hover:text-slate-600'
                }`}
              >
                <span className="text-xl font-bold font-['Plus_Jakarta_Sans']">{char}</span>
                {hasInk && (
                  <span
                    className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${
                      isSelected ? 'bg-emerald-400' : 'bg-emerald-600'
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Quick Tips Box */}
        <div className="p-3.5 border-t border-slate-200 bg-slate-50/80 text-xs text-slate-600 space-y-1.5">
          <div className="flex items-center justify-between font-medium text-slate-800">
            <span>Quick Tip</span>
            <span className="text-[10px] text-slate-500 font-mono">Tap to draw</span>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-500">
            Select any character to immediately open the drawing canvas and start vectorizing your penmanship.
          </p>
        </div>
      </aside>

      {/* Center: Tactile Drawing Canvas */}
      <main
        className={`flex-1 flex-col overflow-y-auto lg:overflow-hidden bg-slate-100 ${
          isFocusMode || mobileStudioTab === 'canvas' ? 'flex' : 'hidden lg:flex'
        }`}
      >
        {/* Workspace Toolbar */}
        <div className="flex items-center justify-between px-3 sm:px-6 py-2 sm:py-2.5 bg-white border-b border-slate-200 gap-2 sm:gap-4 flex-wrap">
          {/* Active Letter & Navigation */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1">
              <button
                onClick={goToPrev}
                disabled={currentIndex === 0}
                className="p-1.5 sm:p-2 rounded-md hover:bg-slate-100 disabled:opacity-30 text-slate-700 transition-colors"
                title="Previous character (Left Arrow)"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setMobileStudioTab('matrix')}
                className="flex items-center justify-center w-9 sm:w-10 h-9 sm:h-10 rounded-lg bg-slate-900 text-white font-bold text-lg sm:text-xl shadow-inner font-['Plus_Jakarta_Sans'] hover:bg-slate-800 transition-colors cursor-pointer"
                title="Click to browse all characters in matrix"
              >
                {currentChar}
              </button>
              <button
                onClick={goToNext}
                disabled={currentIndex === allChars.length - 1}
                className="p-1.5 sm:p-2 rounded-md hover:bg-slate-100 disabled:opacity-30 text-slate-700 transition-colors"
                title="Next character (Right Arrow)"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {isFocusMode && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg bg-black text-white shadow-xs">
                <Focus className="w-3.5 h-3.5" />
                <span>Focus Mode Active · Contrast Black</span>
              </span>
            )}

            <div className="hidden sm:block text-xs text-slate-500 font-mono">
              Unicode: U+{currentChar.charCodeAt(0).toString(16).padStart(4, '0').toUpperCase()}
            </div>
          </div>

          {/* Mode Selector: Precision Pen vs Selective Segment Eraser */}
          <div className="flex items-center p-1 bg-slate-200/80 rounded-lg gap-1 shrink-0">
            <button
              onClick={() => setDrawingMode('pen')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded transition-all ${
                drawingMode === 'pen'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Pen Drawing Mode [P]: Draw calligraphic vector strokes"
            >
              <Zap className="w-3.5 h-3.5 text-indigo-600" />
              <span>Draw [P]</span>
            </button>
            <button
              onClick={() => setDrawingMode('eraser')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded transition-all ${
                drawingMode === 'eraser'
                  ? 'bg-rose-500 text-white shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Selective Segment Eraser Mode [E]: Slices and removes only stroke segments inside the brush circle"
            >
              <Eraser className="w-3.5 h-3.5" />
              <span>Eraser [E]</span>
            </button>
          </div>

          {/* Eraser Controls Bar (visible when Eraser mode is active) */}
          {drawingMode === 'eraser' && (
            <div className="flex items-center gap-2.5 bg-rose-50/90 border border-rose-200 px-3 py-1 rounded-lg text-xs shrink-0 animate-in fade-in duration-150 flex-wrap">
              {/* Eraser Type Sub-Mode: Segment vs Whole Stroke */}
              <div className="flex items-center p-0.5 bg-white/90 rounded-md gap-0.5 border border-rose-200/90 shadow-2xs">
                <button
                  onClick={() => setEraserSubMode('segment')}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all ${
                    eraserSubMode === 'segment'
                      ? 'bg-rose-600 text-white shadow-2xs'
                      : 'text-rose-700 hover:bg-rose-100/70'
                  }`}
                  title="Selective Segment Eraser: Slices strokes and excises only points inside the brush circle"
                >
                  Segment Cut
                </button>
                <button
                  onClick={() => setEraserSubMode('whole')}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all ${
                    eraserSubMode === 'whole'
                      ? 'bg-amber-600 text-white shadow-2xs'
                      : 'text-rose-700 hover:bg-rose-100/70'
                  }`}
                  title="Whole Stroke Eraser: Removes the entire connected stroke on contact"
                >
                  Whole Stroke
                </button>
              </div>

              {/* Quick Size Presets */}
              <div className="flex items-center gap-1">
                {[
                  { label: 'Fine', size: 12 },
                  { label: 'Med', size: 24 },
                  { label: 'Broad', size: 40 },
                ].map((preset) => (
                  <button
                    key={preset.size}
                    onClick={() => setEraserRadius(preset.size)}
                    className={`px-1.5 py-0.5 text-[10px] font-mono font-semibold rounded border transition-colors ${
                      eraserRadius === preset.size
                        ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                        : 'bg-white text-rose-800 border-rose-200 hover:bg-rose-100'
                    }`}
                    title={`Set eraser diameter to ${preset.size}px`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Eraser Radius Slider */}
              <div className="flex items-center gap-1.5">
                <input
                  type="range"
                  min="8"
                  max="60"
                  step="2"
                  value={eraserRadius}
                  onChange={(e) => setEraserRadius(Number(e.target.value))}
                  className="w-16 accent-rose-600"
                  title="Adjust eraser circular brush diameter [ or ]"
                />
                <span className="font-mono text-rose-700 font-bold w-7 text-right tabular-nums text-[11px]">
                  {eraserRadius}px
                </span>
              </div>
            </div>
          )}

          {/* Pen Tool Segmented Control (visible when Pen mode is active) */}
          {drawingMode === 'pen' && (
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg shrink-0">
              {(
                [
                  { id: 'calligraphy', label: 'Calligraphy', isCallig: true },
                  { id: 'fountain', label: 'Fountain Pen', isCallig: false },
                  { id: 'rollerball', label: 'Gel Pen', isCallig: false },
                  { id: 'drafting', label: 'Drafting 0.5', isCallig: false },
                ] as const
              ).map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => setPenSettings((prev) => ({ ...prev, tool: tool.id }))}
                  className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                    penSettings.tool === tool.id
                      ? tool.id === 'calligraphy'
                        ? 'bg-amber-600 text-white shadow-sm font-semibold'
                        : 'bg-white text-slate-900 shadow-sm font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title={
                    tool.id === 'calligraphy'
                      ? 'Calligraphy Brush: Dynamic stroke width based on pen travel direction to simulate fountain pen nib characteristics'
                      : undefined
                  }
                >
                  {tool.id === 'calligraphy' && <Feather className="w-3 h-3" />}
                  <span>{tool.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Calligraphy Brush Tool Nib Angle & Direction Setting Widget */}
          {drawingMode === 'pen' && penSettings.tool === 'calligraphy' && (
            <div className="flex items-center gap-2 px-2.5 py-1 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/90 rounded-lg text-xs shadow-2xs shrink-0 animate-in fade-in duration-150">
              {/* Nib Angle Visual Compass */}
              <div className="flex items-center gap-1.5 text-amber-950 font-semibold">
                <div
                  className="w-5 h-5 rounded-full bg-amber-200/70 border border-amber-300 flex items-center justify-center relative shadow-inner"
                  title={`Calligraphic Chisel Nib oriented at ${penSettings.angle ?? 45}°`}
                >
                  {/* Rotating Nib Chisel Line */}
                  <div
                    className="w-3.5 h-[2.5px] bg-amber-900 rounded-full transition-transform duration-100"
                    style={{ transform: `rotate(${-((penSettings.angle ?? 45))}deg)` }}
                  />
                </div>
                <span>Nib Angle:</span>
              </div>

              {/* Angle Slider */}
              <input
                type="range"
                min="0"
                max="90"
                step="5"
                value={penSettings.angle ?? 45}
                onChange={(e) =>
                  setPenSettings((prev) => ({
                    ...prev,
                    angle: Number(e.target.value),
                  }))
                }
                className="w-18 accent-amber-600 cursor-pointer"
                title="Adjust Calligraphy Fountain Pen Nib angle (0° to 90°). Strokes parallel to the nib are hairline thin; strokes perpendicular are broad."
              />

              {/* Angle Readout & Nudges */}
              <div className="flex items-center gap-0.5 bg-white px-1.5 py-0.5 rounded border border-amber-300 font-mono text-[11px] font-bold text-amber-900 shadow-2xs">
                <span>{penSettings.angle ?? 45}°</span>
                <div className="flex flex-col -my-0.5 ml-1">
                  <button
                    onClick={() =>
                      setPenSettings((prev) => ({
                        ...prev,
                        angle: Math.min(90, (prev.angle ?? 45) + 5),
                      }))
                    }
                    className="leading-none text-[8px] text-amber-700 hover:text-amber-950 font-black"
                    title="Nudge angle +5°"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() =>
                      setPenSettings((prev) => ({
                        ...prev,
                        angle: Math.max(0, (prev.angle ?? 45) - 5),
                      }))
                    }
                    className="leading-none text-[8px] text-amber-700 hover:text-amber-950 font-black"
                    title="Nudge angle -5°"
                  >
                    ▼
                  </button>
                </div>
              </div>

              {/* Quick Calligraphy Angle Presets */}
              <div className="hidden lg:flex items-center gap-1 p-0.5 bg-white rounded border border-amber-200">
                {[
                  { angle: 45, label: 'Italic (45°)', title: 'Italic 45°: Classic Chancery Renaissance cursive' },
                  { angle: 30, label: 'Roman (30°)', title: 'Foundational 30°: Wide circular bowls & upright stems' },
                  { angle: 40, label: 'Gothic (40°)', title: 'Blackletter 40°: Dense vertical gothic textura' },
                  { angle: 52, label: 'Spencerian (52°)', title: 'Copperplate 52°: Delicate calligraphic flourish slant' },
                  { angle: 0, label: 'Flat (0°)', title: 'Horizontal 0°: Heavy vertical downstrokes & hairline crossbars' },
                ].map((preset) => {
                  const isCur = (penSettings.angle ?? 45) === preset.angle;
                  return (
                    <button
                      key={preset.angle}
                      onClick={() => setPenSettings((prev) => ({ ...prev, angle: preset.angle }))}
                      className={`px-1.5 py-0.5 text-[10px] font-semibold rounded transition-colors ${
                        isCur
                          ? 'bg-amber-600 text-white shadow-2xs font-bold'
                          : 'text-amber-800 hover:bg-amber-100/70'
                      }`}
                      title={preset.title}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Real-time Stroke Smoothing & Path Stabilizer Slider */}
          {drawingMode === 'pen' && (
            <div className="flex items-center gap-2 px-2.5 py-1 bg-slate-100/90 border border-slate-200/90 rounded-lg text-xs shadow-2xs shrink-0">
              <div className="flex items-center gap-1 text-slate-700">
                <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                <span className="font-semibold text-slate-800">Stabilizer:</span>
              </div>

              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={penSettings.smoothing ?? 0.5}
                onChange={(e) =>
                  setPenSettings((prev) => ({
                    ...prev,
                    smoothing: parseFloat(e.target.value),
                  }))
                }
                className="w-20 md:w-24 accent-indigo-600 cursor-pointer"
                title="Real-time stroke smoothing stabilizer: 0% records raw authentic tremors and angular jitter, 100% creates silk-smooth stabilized calligraphic curves"
              />

              <span
                className={`font-mono text-[11px] font-bold px-1.5 py-0.5 rounded min-w-[76px] text-center tabular-nums border ${
                  (penSettings.smoothing ?? 0.5) === 0
                    ? 'bg-amber-50 text-amber-900 border-amber-300'
                    : (penSettings.smoothing ?? 0.5) >= 0.8
                    ? 'bg-indigo-50 text-indigo-900 border-indigo-300'
                    : 'bg-white text-slate-800 border-slate-200'
                }`}
                title={`Stabilization level: ${Math.round((penSettings.smoothing ?? 0.5) * 100)}%`}
              >
                {(penSettings.smoothing ?? 0.5) === 0
                  ? 'Raw (0%)'
                  : (penSettings.smoothing ?? 0.5) <= 0.35
                  ? `${Math.round((penSettings.smoothing ?? 0.5) * 100)}% (Nat)`
                  : (penSettings.smoothing ?? 0.5) <= 0.7
                  ? `${Math.round((penSettings.smoothing ?? 0.5) * 100)}% (Smooth)`
                  : `${Math.round((penSettings.smoothing ?? 0.5) * 100)}% (Stab)`}
              </span>

              {/* Quick Preset Buttons */}
              <div className="hidden xl:flex items-center gap-0.5 p-0.5 bg-white rounded border border-slate-200">
                {[
                  { label: 'Raw', val: 0, title: 'Raw (0%): Unfiltered authentic handwriting tremors' },
                  { label: 'Nat', val: 0.35, title: 'Natural (35%): Subtle jitter reduction' },
                  { label: 'Smooth', val: 0.65, title: 'Smooth (65%): Fluid cursive stabilization' },
                  { label: 'Stab', val: 0.95, title: 'Stabilized (95%): High calligraphic stabilization' },
                ].map((preset) => {
                  const isCurrent = Math.abs((penSettings.smoothing ?? 0.5) - preset.val) < 0.1;
                  return (
                    <button
                      key={preset.label}
                      onClick={() => setPenSettings((prev) => ({ ...prev, smoothing: preset.val }))}
                      className={`px-1.5 py-0.5 text-[10px] font-bold rounded transition-colors ${
                        isCurrent
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                      title={preset.title}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pressure Sensitivity, Heatmap & Width Indicators Quick Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                setPenSettings((prev) => ({
                  ...prev,
                  pressureSensitivity: !prev.pressureSensitivity,
                }))
              }
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                penSettings.pressureSensitivity
                  ? 'bg-indigo-50 border border-indigo-200 text-indigo-700 shadow-2xs'
                  : 'bg-slate-100 border border-transparent text-slate-600 hover:bg-slate-200'
              }`}
              title={
                penSettings.pressureSensitivity
                  ? 'Pressure Sensitivity ON: Stroke width varies along paths'
                  : 'Pressure Sensitivity OFF: Uniform monoline width'
              }
            >
              <Activity className="w-3.5 h-3.5 text-indigo-600" />
              <span>Pressure {penSettings.pressureSensitivity ? 'ON' : 'OFF'}</span>
            </button>

            {/* Pressure Map (Stroke Thickness & Pressure Balance) Visualization Toggle Button */}
            <button
              onClick={() => {
                setShowPressureHeatmap((prev) => {
                  const next = !prev;
                  setBeautifyNotice(
                    next
                      ? 'Pressure Map Overlay ON: Visualizing variable thickness and pressure balance [M]'
                      : 'Pressure Map Overlay OFF'
                  );
                  setTimeout(() => setBeautifyNotice(null), 2500);
                  return next;
                });
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                showPressureHeatmap
                  ? 'bg-gradient-to-r from-amber-500/15 via-rose-500/15 to-indigo-500/20 border border-amber-400 text-amber-950 shadow-2xs ring-2 ring-amber-400/50'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
              title="Toggle Pressure Map Overlay [M]: Renders stroke data with varying thicknesses, allowing you to visualize and balance pen pressure across handwritten glyphs"
            >
              <Flame className={`w-3.5 h-3.5 ${showPressureHeatmap ? 'text-amber-600 animate-pulse' : 'text-slate-400'}`} />
              <span>Pressure Map {showPressureHeatmap ? 'ON' : 'OFF'} [M]</span>
              {showPressureHeatmap && currentStrokes.length > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 rounded bg-amber-600 text-white text-[10px] font-mono font-bold">
                  {penmanshipMetrics.consistencyScore}%
                </span>
              )}
            </button>

            <button
              onClick={() => setShowWidthOverlay((prev) => !prev)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                showWidthOverlay
                  ? 'bg-amber-50 border border-amber-200 text-amber-800 shadow-2xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
              title="Toggle stroke width variation indicators, contours, and caliper crossbars on canvas"
            >
              <Gauge className="w-3.5 h-3.5 text-amber-600" />
              <span>Width Indicators</span>
            </button>

            {/* Ghost Template (Standard Latin Tracing Guide) Control */}
            <div className="flex items-center rounded-lg border border-sky-300 overflow-hidden shadow-2xs bg-white">
              <button
                onClick={() => {
                  setTracingGuide((prev) => {
                    const next = !prev.enabled;
                    setBeautifyNotice(
                      next
                        ? `Ghost Template ON: Tracing '${currentChar}' standard Latin form [T]`
                        : 'Ghost Template OFF [T]'
                    );
                    setTimeout(() => setBeautifyNotice(null), 2000);
                    return { ...prev, enabled: next };
                  });
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                  tracingGuide.enabled
                    ? 'bg-sky-600 text-white'
                    : 'bg-white text-slate-700 hover:bg-slate-100'
                }`}
                title="Toggle semi-transparent 'ghost' template of standard Latin characters for manual handwriting tracing [T]"
              >
                <Ghost className="w-3.5 h-3.5" />
                <span>Ghost Template {tracingGuide.enabled ? 'ON' : 'OFF'} [T]</span>
                {tracingGuide.enabled && (
                  <span className="ml-0.5 px-1.5 py-0.2 rounded bg-sky-800 text-white text-[10px] font-mono font-bold">
                    {Math.round(tracingGuide.opacity * 100)}%
                  </span>
                )}
              </button>
              <button
                onClick={() => setShowTracingGuidePanel((prev) => !prev)}
                className={`px-2 py-1.5 text-xs transition-colors border-l border-sky-300 ${
                  showTracingGuidePanel
                    ? 'bg-sky-700 text-white'
                    : 'bg-sky-50 text-sky-700 hover:bg-sky-100'
                }`}
                title="Open Ghost Template Settings & Latin Tracing HUD [Shift+T]"
              >
                <Sliders className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Background Reference Image Tracing Import & Toggle */}
            {!underlay.src ? (
              <div className="flex items-center rounded-lg border border-indigo-200 bg-indigo-50/70 overflow-hidden shadow-2xs">
                <button
                  onClick={() => underlayInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-900 hover:bg-indigo-100 transition-colors"
                  title="Import reference image (sketch, calligraphy, or photo) to trace over for complex character shapes [U]"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Import Reference Image</span>
                </button>
                <button
                  onClick={() => setShowUnderlayPanel((prev) => !prev)}
                  className="px-1.5 py-1.5 text-xs transition-colors border-l border-indigo-200 text-indigo-700 hover:bg-indigo-100"
                  title="Open Tracing Reference inspector and sample presets"
                >
                  <Sliders className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center rounded-lg border border-indigo-200 overflow-hidden shadow-2xs bg-white">
                <button
                  onClick={() => setUnderlay((prev) => ({ ...prev, visible: !prev.visible }))}
                  className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                    underlay.visible
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                  title="Toggle Reference Underlay Image on/off [U]"
                >
                  {underlay.visible ? (
                    <Eye className="w-3.5 h-3.5" />
                  ) : (
                    <EyeOff className="w-3.5 h-3.5" />
                  )}
                  <span>Reference {underlay.visible ? 'ON' : 'OFF'}</span>
                </button>
                <button
                  onClick={() => setShowUnderlayPanel((prev) => !prev)}
                  className={`px-1.5 py-1.5 text-xs transition-colors border-l border-indigo-200 ${
                    showUnderlayPanel
                      ? 'bg-indigo-700 text-white'
                      : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                  }`}
                  title="Adjust Reference Image Tracing settings (scale, opacity, offset, contrast)"
                >
                  <Sliders className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Ghost Path Preview Button */}
            {!ghostPath.enabled ? (
              <button
                onClick={() => setGhostPath((prev) => ({ ...prev, enabled: true }))}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                title="Preview previous character's baseline and height for spacing & proportions reference [G]"
              >
                <Ghost className="w-3.5 h-3.5 text-violet-600" />
                <span>Ghost Path</span>
              </button>
            ) : (
              <div className="flex items-center rounded-lg border border-violet-200 overflow-hidden shadow-2xs">
                <button
                  onClick={() => setGhostPath((prev) => ({ ...prev, enabled: false }))}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-violet-600 text-white transition-colors"
                  title="Toggle Ghost Path on/off [G]"
                >
                  <Ghost className="w-3.5 h-3.5" />
                  <span>Ghost: '{activeGhostChar}'</span>
                </button>
                <button
                  onClick={() => setShowGhostPathPanel((prev) => !prev)}
                  className={`px-1.5 py-1.5 text-xs transition-colors border-l border-violet-300 ${
                    showGhostPathPanel
                      ? 'bg-violet-700 text-white'
                      : 'bg-violet-50 text-violet-700 hover:bg-violet-100'
                  }`}
                  title="Adjust Ghost Path settings (reference char, overlay/adjacent, opacity, guidelines)"
                >
                  <Sliders className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Actions: Upload Photo, Full Sheet OCR, Undo, Redo, Clear */}
          <div className="flex items-center gap-1.5">
            {/* Direct Photo Upload */}
            <button
              onClick={() => studioFileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-300 rounded-md hover:bg-emerald-100 hover:border-emerald-400 active:scale-[0.98] transition-all shadow-2xs"
              title="Upload photo of your handwriting from computer/phone"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-600" />
              <span>Upload Photo</span>
            </button>
            <input
              ref={studioFileInputRef}
              type="file"
              accept="image/*"
              onChange={handleStudioFileUpload}
              className="hidden"
            />
            <input
              ref={underlayInputRef}
              type="file"
              accept="image/*"
              onChange={handleUnderlayFileUpload}
              className="hidden"
            />

            {onOpenScanTab && (
              <button
                onClick={onOpenScanTab}
                className="hidden xl:flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors shadow-2xs"
                title="Scan full handwriting sheet or notebook page"
              >
                <Camera className="w-3.5 h-3.5 text-emerald-600" />
                <span>Full Sheet OCR</span>
              </button>
            )}

            <button
              onClick={handleBeautifyCurrent}
              disabled={currentStrokes.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-900 bg-amber-50 border border-amber-300 rounded-md hover:bg-amber-100 hover:border-amber-400 disabled:opacity-40 transition-colors shadow-2xs"
              title="Smooth curves, reduce hand tremors/jitter, and snap baseline [B]"
            >
              <Wand2 className="w-3.5 h-3.5 text-amber-600" />
              <span>Smooth & Beautify</span>
            </button>

            {/* Center Glyph Button */}
            <button
              onClick={() => handleCenterGlyph()}
              disabled={currentStrokes.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-900 bg-indigo-50 border border-indigo-200 rounded-md hover:bg-indigo-100 hover:border-indigo-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs active:scale-[0.98]"
              title="Center Glyph: Calculate bounding box and shift strokes to be centered within metric boundaries [C]"
            >
              <AlignCenter className="w-3.5 h-3.5 text-indigo-600" />
              <span>Center Glyph</span>
            </button>

            {/* Copy Glyph / Base Shapes Tool */}
            <div className="flex items-center rounded-md border border-indigo-200 overflow-hidden bg-white shadow-2xs">
              <button
                onClick={() => setIsCopyGlyphModalOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-indigo-900 hover:bg-indigo-50 transition-colors cursor-pointer"
                title="Copy Glyph: Copy stroke data between characters to craft stylistic variants or borrow base shapes [Alt+C]"
              >
                <Copy className="w-3.5 h-3.5 text-indigo-600" />
                <span>Copy Glyph</span>
              </button>
              {glyphClipboard && (
                <button
                  onClick={() => {
                    handleApplyCopyStrokes(
                      glyphClipboard.char,
                      currentChar,
                      'replace',
                      true
                    );
                  }}
                  className="px-2 py-1.5 text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border-l border-indigo-200 transition-colors flex items-center gap-1 cursor-pointer"
                  title={`Quick Paste ${glyphClipboard.strokes.length} strokes from '${glyphClipboard.char}' into '${currentChar}' [Ctrl+Shift+V]`}
                >
                  <ClipboardCheck className="w-3 h-3 text-emerald-600" />
                  <span>Paste '{glyphClipboard.char}'</span>
                </button>
              )}
            </div>

            {/* Mirror / Flip Tools */}
            <div className="flex items-center rounded-md border border-slate-200 overflow-hidden bg-white shadow-2xs">
              <button
                onClick={handleMirrorHorizontal}
                disabled={currentStrokes.length === 0}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-35 disabled:cursor-not-allowed transition-colors"
                title="Mirror Horizontal: Flip character Left ↔ Right [H]"
              >
                <FlipHorizontal className="w-3.5 h-3.5 text-indigo-600" />
                <span className="hidden md:inline">Mirror H</span>
              </button>
              <div className="w-[1px] h-4 bg-slate-200" />
              <button
                onClick={handleMirrorVertical}
                disabled={currentStrokes.length === 0}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-35 disabled:cursor-not-allowed transition-colors"
                title="Mirror Vertical: Flip character Top ↕ Bottom [V]"
              >
                <FlipVertical className="w-3.5 h-3.5 text-indigo-600" />
                <span className="hidden md:inline">Mirror V</span>
              </button>
            </div>

            {/* Vertical & Horizontal Reflection Tool */}
            <div className="flex items-center rounded-md border border-slate-200 overflow-hidden bg-white shadow-2xs">
              <button
                onClick={() => {
                  setReflectionSettings((prev) => {
                    const next = !prev.enabled;
                    const modeDesc =
                      prev.type === 'horizontal'
                        ? 'Horizontal (L ↔ R)'
                        : prev.type === 'vertical'
                        ? 'Vertical (T ↕ B)'
                        : 'Quad 4-Way (Dual Axes)';
                    setBeautifyNotice(
                      next
                        ? `Reflection Tool ON: ${modeDesc} [S]`
                        : 'Reflection Tool OFF [S]'
                    );
                    setTimeout(() => setBeautifyNotice(null), 2500);
                    return { ...prev, enabled: next };
                  });
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold transition-all ${
                  reflectionSettings.enabled
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
                title="Toggle Reflection Tool [S]: Mirror strokes horizontally (vertical axis X), vertically (horizontal axis Y), or quad 4-way across both axes simultaneously"
              >
                <Split className={`w-3.5 h-3.5 ${reflectionSettings.enabled ? 'text-white' : 'text-indigo-600'}`} />
                <span>Reflection {reflectionSettings.enabled ? 'ON' : 'OFF'} [S]</span>
                {reflectionSettings.enabled && (
                  <span className="ml-0.5 px-1.5 py-0.2 rounded bg-indigo-800 text-indigo-100 text-[10px] font-mono font-bold uppercase">
                    {reflectionSettings.type === 'horizontal'
                      ? 'H'
                      : reflectionSettings.type === 'vertical'
                      ? 'V'
                      : '4-Way'}
                  </span>
                )}
              </button>
              <button
                onClick={() => setShowReflectionPanel((prev) => !prev)}
                className={`px-1.5 py-1.5 text-xs transition-colors border-l ${
                  showReflectionPanel
                    ? 'bg-indigo-800 text-white border-indigo-700'
                    : reflectionSettings.enabled
                    ? 'bg-indigo-700 text-indigo-100 hover:bg-indigo-800 border-indigo-500'
                    : 'text-slate-500 hover:bg-slate-100 border-slate-200'
                }`}
                title="Reflection Tool HUD & Inspector: Switch axis mode (Horizontal ↔, Vertical ↕, Quad ✛), analyze character optical balance, or use one-click half-stroke mirroring"
              >
                <Sliders className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Snap to Grid (Endpoint Alignment & Grid Settings) */}
            <div className="flex items-center rounded-md border border-slate-200 overflow-hidden bg-white shadow-2xs">
              <button
                onClick={() => {
                  setGridSettings((prev) => {
                    const next = !prev.enabled;
                    setBeautifyNotice(
                      next
                        ? `Snap to Grid ON: aligning stroke endpoints to ${prev.gridSize}px grid [X]`
                        : 'Snap to Grid OFF'
                    );
                    setTimeout(() => setBeautifyNotice(null), 2500);
                    return { ...prev, enabled: next };
                  });
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold transition-all ${
                  gridSettings.enabled
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
                title="Toggle Snap to Grid [X]: Automatically aligns stroke endpoints to a configurable grid for clean geometric alignment"
              >
                <Magnet className={`w-3.5 h-3.5 ${gridSettings.enabled ? 'text-white' : 'text-indigo-600'}`} />
                <span>Snap to Grid {gridSettings.enabled ? 'ON' : 'OFF'} [X]</span>
                {gridSettings.enabled && currentStrokes.length > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.2 rounded bg-indigo-800 text-indigo-100 text-[10px] font-mono font-bold">
                    {gridAlignmentMetrics.alignmentPercentage}%
                  </span>
                )}
              </button>
              <button
                onClick={() => setShowGridConfigPanel((prev) => !prev)}
                className={`px-1.5 py-1.5 text-xs transition-colors border-l ${
                  showGridConfigPanel
                    ? 'bg-indigo-800 text-white border-indigo-700'
                    : gridSettings.enabled
                    ? 'bg-indigo-700 text-indigo-100 hover:bg-indigo-800 border-indigo-500'
                    : 'text-slate-500 hover:bg-slate-100 border-slate-200'
                }`}
                title="Grid Settings: Configure pitch (10/20/40/50px), magnetic snap radius, or snap current glyph endpoints"
              >
                <Sliders className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Simplify Paths (Ramer-Douglas-Peucker Algorithm) */}
            <div className="flex items-center rounded-md border border-emerald-300 overflow-hidden bg-white shadow-2xs">
              <button
                onClick={() => handleApplySimplification()}
                disabled={currentStrokes.length === 0}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                title={`Simplify Paths (Ramer-Douglas-Peucker ε=${simplifySettings.epsilon}px) [Y]: Decimates control points to clean up shaky handwriting`}
              >
                <Scissors className="w-3.5 h-3.5 text-emerald-600" />
                <span>Simplify [Y]</span>
                {currentStrokes.length > 0 && simplificationMetrics.reductionPercentage > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.2 rounded bg-emerald-700 text-white text-[10px] font-mono font-bold">
                    -{simplificationMetrics.reductionPercentage}%
                  </span>
                )}
              </button>
              <button
                onClick={() => setShowSimplifyPanel((prev) => !prev)}
                className={`px-1.5 py-1.5 text-xs transition-colors border-l ${
                  showSimplifyPanel
                    ? 'bg-emerald-800 text-white border-emerald-700'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200'
                }`}
                title="Simplify Paths Settings: Adjust RDP epsilon tolerance, view live vector vertices, or auto-simplify during sketching"
              >
                <Sliders className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              onClick={handleUndo}
              disabled={undoStack.length === 0 && currentStrokes.length === 0}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-35 disabled:cursor-not-allowed transition-colors shadow-2xs active:scale-[0.98]"
              title={`Undo last stroke [Ctrl+Z]${undoStack.length > 0 ? ` (${undoStack.length} in history)` : ''}`}
            >
              <Undo className="w-3.5 h-3.5" />
              <span>Undo</span>
              {undoStack.length > 0 && (
                <span className="text-[10px] font-mono font-semibold px-1 rounded bg-slate-100 text-slate-600 tabular-nums">
                  {undoStack.length}
                </span>
              )}
            </button>

            <button
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-35 disabled:cursor-not-allowed transition-colors shadow-2xs active:scale-[0.98]"
              title={`Redo reverted stroke [Ctrl+Y / Ctrl+Shift+Z]${redoStack.length > 0 ? ` (${redoStack.length} available)` : ''}`}
            >
              <Redo className="w-3.5 h-3.5" />
              <span>Redo</span>
              {redoStack.length > 0 && (
                <span className="text-[10px] font-mono font-semibold px-1 rounded bg-slate-100 text-slate-600 tabular-nums">
                  {redoStack.length}
                </span>
              )}
            </button>

            {currentStrokes.length > 0 && (
              <button
                onClick={handleDeleteLastStroke}
                className="hidden md:flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors shadow-2xs"
                title="Delete the most recent stroke [Backspace / Delete] (can be reverted with Undo)"
              >
                <span>Delete Stroke</span>
              </button>
            )}

            <button
              onClick={handleClear}
              disabled={currentStrokes.length === 0}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-rose-600 bg-white border border-rose-200 rounded-md hover:bg-rose-50 disabled:opacity-40 transition-colors shadow-2xs"
              title="Clear all ink (can be reverted with Undo [Ctrl+Z])"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>

            {/* Focus Mode Button */}
            <button
              onClick={() => setIsFocusMode((prev) => !prev)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all shadow-2xs active:scale-[0.98] ${
                isFocusMode
                  ? 'bg-black text-white hover:bg-slate-800'
                  : 'text-slate-800 bg-white hover:bg-slate-100 border border-slate-300'
              }`}
              title="Toggle Focus Mode: Distraction-free drawing canvas with high-contrast black text [F]"
            >
              {isFocusMode ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5 text-white" />
                  <span>Exit Focus [Esc]</span>
                </>
              ) : (
                <>
                  <Focus className="w-3.5 h-3.5 text-slate-800" />
                  <span>Focus Mode [F]</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Tracing Underlay Inspector Panel */}
        {showUnderlayPanel && (
          <UnderlayInspector
            underlay={underlay}
            setUnderlay={setUnderlay}
            onUploadClick={() => underlayInputRef.current?.click()}
            onLoadSample={handleLoadSampleUnderlay}
            onClose={() => setShowUnderlayPanel(false)}
            currentChar={currentChar}
          />
        )}

        {/* Ghost Path Reference Inspector Panel */}
        {showGhostPathPanel && (
          <GhostPathInspector
            settings={ghostPath}
            setSettings={setGhostPath}
            currentChar={currentChar}
            prevChar={prevCharInSequence}
            hasStrokes={hasGhostStrokes}
            onClose={() => setShowGhostPathPanel(false)}
          />
        )}

        {/* Typographic Horizontal Baseline & Cap-Height Guide Inspector Panel */}
        {showGuideConfigPanel && (
          <BaselineGuideInspector
            config={guideConfig}
            onChange={setGuideConfig}
            onSnapToBaseline={handleSnapToConfiguredBaseline}
            onClose={() => setShowGuideConfigPanel(false)}
            currentChar={currentChar}
          />
        )}

        {/* Glyph Alternates & Contextual Variants Bar */}
        <div className="bg-slate-50/90 border-b border-slate-200 px-6 py-2 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 shrink-0">
              <Split className="w-3.5 h-3.5 text-indigo-600" />
              <span>Alternates:</span>
            </div>

            {/* Primary Variant Tab */}
            <button
              onClick={() => setActiveVariantId('primary')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md transition-all shrink-0 ${
                activeVariantId === 'primary'
                  ? 'bg-slate-900 text-white font-semibold shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span>★ Standard</span>
              <span
                className={`text-[10px] px-1 rounded ${
                  activeVariantId === 'primary'
                    ? 'bg-slate-800 text-slate-300'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {currentGlyph.strokes?.length || 0} pts
              </span>
            </button>

            {/* List of Alternate Variants */}
            {variantsList.map((variant, idx) => (
              <div
                key={variant.id}
                className={`flex items-center rounded-md border text-xs transition-all shrink-0 overflow-hidden ${
                  activeVariantId === variant.id
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-950 font-semibold shadow-xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <button
                  onClick={() => setActiveVariantId(variant.id)}
                  className="px-2.5 py-1 flex items-center gap-1.5"
                >
                  <span>{variant.name || `Variant ${idx + 2}`}</span>
                  <span
                    className={`text-[10px] px-1 rounded ${
                      activeVariantId === variant.id
                        ? 'bg-indigo-200/70 text-indigo-800'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {variant.strokes?.length || 0}
                  </span>
                </button>
                <button
                  onClick={() => handleDeleteVariant(variant.id)}
                  className="p-1 hover:bg-rose-100 hover:text-rose-600 text-slate-400 transition-colors"
                  title="Delete alternate variant"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}

            {/* Add Variant & Duplicate Buttons */}
            <button
              onClick={handleAddVariant}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-indigo-700 bg-indigo-50/80 border border-indigo-200/80 rounded-md hover:bg-indigo-100 hover:border-indigo-300 transition-colors shrink-0"
              title="Add a new blank alternate variant for this character"
            >
              <Plus className="w-3 h-3" />
              <span>Add Alternate</span>
            </button>

            {currentGlyph.strokes && currentGlyph.strokes.length > 0 && (
              <button
                onClick={handleDuplicateToVariant}
                className="flex items-center gap-1 px-2 py-1 text-xs text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-100 hover:text-slate-900 transition-colors shrink-0"
                title="Duplicate Standard glyph strokes as starting point for a new variant"
              >
                <Copy className="w-3 h-3 text-slate-500" />
                <span className="hidden sm:inline">Duplicate to Variant</span>
              </button>
            )}

            <button
              onClick={() => setIsCopyGlyphModalOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-indigo-700 bg-white border border-indigo-200/90 rounded-md hover:bg-indigo-50 transition-colors shrink-0"
              title="Borrow stroke data from another character to build a new stylistic variant or base shape"
            >
              <Copy className="w-3 h-3 text-indigo-600" />
              <span>Copy Base Shape</span>
            </button>

            {/* Automated Contextual Alternates Generator Button */}
            <button
              onClick={() => setIsContextualModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200/90 rounded-md hover:from-indigo-100 hover:to-purple-100 transition-all shadow-2xs shrink-0"
              title="Automate organic handwriting variations to prevent the robotic look of repeating identical characters in text"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Auto-Alternates</span>
            </button>
          </div>

          {/* Contextual Info & Ghost Toggle */}
          <div className="flex items-center gap-3 text-xs">
            {isEditingVariant && (
              <label className="flex items-center gap-1.5 text-xs text-indigo-900 bg-indigo-50/70 border border-indigo-200/60 px-2 py-0.5 rounded cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showPrimaryGhostInVariant}
                  onChange={(e) => setShowPrimaryGhostInVariant(e.target.checked)}
                  className="rounded border-indigo-300 text-indigo-600 focus:ring-0"
                />
                <span>Ghost Standard Form</span>
              </label>
            )}

            <span className="hidden md:inline text-[11px] text-slate-500 italic">
              Alternates cycle automatically in sentences for natural, organic handwriting.
            </span>
          </div>
        </div>

        {/* Main Canvas Viewport */}
        <div className="flex-1 flex flex-col items-center justify-center p-2 sm:p-4 lg:p-6 overflow-hidden relative">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOverCanvas(true);
              const rect = e.currentTarget.getBoundingClientRect();
              const relativeY = e.clientY - rect.top;
              if (relativeY < rect.height / 2) {
                setCanvasDropTarget('underlay');
              } else {
                setCanvasDropTarget('crop');
              }
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setIsDragOverCanvas(false);
            }}
            onDrop={handleCanvasDrop}
            className={`relative shadow-2xl rounded-xl overflow-hidden border ${
              isDragOverCanvas ? 'border-indigo-500 ring-4 ring-indigo-200' : 'border-slate-300'
            } bg-white max-w-[min(calc(100vw-20px),620px)] max-h-[min(calc(100vw-20px),620px)] w-full aspect-square touch-none transition-all`}
          >
            <canvas
              ref={canvasRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerLeave}
              className={`w-full h-full block ${
                drawingMode === 'eraser' ? 'cursor-none' : 'cursor-crosshair'
              }`}
              style={{ touchAction: 'none' }}
            />

            {/* Floating Pressure Map (Thickness & Penmanship Balance) HUD Card */}
            {showPressureHeatmap && (
              <div
                className={`absolute top-2.5 left-2.5 z-20 bg-slate-900/95 backdrop-blur-md border border-amber-500/40 rounded-xl ${
                  isPressureHUDCollapsed ? 'py-1.5 px-3 max-w-fit' : 'p-3 max-w-[335px]'
                } text-white shadow-xl w-full animate-in fade-in slide-in-from-top-1 duration-200 select-none`}
              >
                {/* Header */}
                <div
                  className={`flex items-center justify-between gap-2 ${
                    isPressureHUDCollapsed ? '' : 'mb-2 pb-1.5 border-b border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                    <Flame className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                    <span>
                      {isPressureHUDCollapsed
                        ? `Pressure Map: ${penmanshipMetrics.consistencyScore}% (${penmanshipMetrics.consistencyRating.split(' ')[0]})`
                        : 'Pressure Map · Thickness & Balance'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setIsPressureHUDCollapsed((prev) => !prev)}
                      className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 text-[10px]"
                      title={isPressureHUDCollapsed ? 'Expand Pressure Map & Balance details' : 'Collapse HUD'}
                    >
                      <Sliders className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => setShowPressureHeatmap(false)}
                      className="text-slate-400 hover:text-white text-xs font-bold px-1.5 py-0.5 rounded hover:bg-slate-800"
                      title="Hide Pressure Map Overlay [M]"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {!isPressureHUDCollapsed && (
                  <div className="space-y-2.5 text-xs animate-in fade-in duration-150">
                    {/* Real-time Cursor Line-Weight Readout Badge */}
                    <div className="flex items-center justify-between bg-slate-950/80 px-2.5 py-1.5 rounded-lg border border-amber-500/30">
                      <div className="flex items-center gap-1.5 text-[10px] text-amber-300">
                        <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                        <span className="font-semibold">Live Cursor Weight:</span>
                      </div>
                      <div className="font-mono text-[11px] font-bold text-amber-200">
                        {hoverCanvasPt
                          ? `${Math.round(
                              Math.max(
                                3,
                                penSettings.baseWidth *
                                  (hoverCanvasPt.pressure ?? 1.0) *
                                  pressureThicknessScale
                              )
                            )}px · ${Math.round((hoverCanvasPt.pressure ?? 1.0) * 100)}%`
                          : `${pressureStats.avgThickness}px · ${Math.round(
                              pressureStats.avg * 100
                            )}% (Avg)`}
                      </div>
                    </div>

                    {/* Penmanship Consistency Score Card */}
                    <div className="bg-slate-800/80 rounded-lg p-2 border border-slate-700/70">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-semibold text-slate-300">Consistency:</span>
                        <span
                          className={`text-[11px] font-bold font-mono px-1.5 py-0.2 rounded border ${
                            penmanshipMetrics.consistencyScore >= 85
                              ? 'bg-emerald-950/70 text-emerald-300 border-emerald-500/50'
                              : penmanshipMetrics.consistencyScore >= 70
                              ? 'bg-blue-950/70 text-blue-300 border-blue-500/50'
                              : 'bg-amber-950/70 text-amber-300 border-amber-500/50'
                          }`}
                        >
                          {penmanshipMetrics.consistencyScore}% · {penmanshipMetrics.consistencyRating}
                        </span>
                      </div>

                      {/* Consistency Progress Bar */}
                      <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-700 mb-1.5">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            penmanshipMetrics.consistencyScore >= 85
                              ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                              : penmanshipMetrics.consistencyScore >= 70
                              ? 'bg-gradient-to-r from-blue-500 to-indigo-400'
                              : 'bg-gradient-to-r from-amber-500 to-rose-400'
                          }`}
                          style={{ width: `${penmanshipMetrics.consistencyScore}%` }}
                        />
                      </div>

                      {/* Actionable recommendation */}
                      <p className="text-[10px] text-slate-300 leading-snug italic">
                        "{penmanshipMetrics.recommendation}"
                      </p>
                    </div>

                    {/* Pressure Distribution Spectrum Bar (Hairlines vs Midtones vs Swells) */}
                    <div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mb-1">
                        <span>Hairline {penmanshipMetrics.hairlinePercentage}%</span>
                        <span>Mid {penmanshipMetrics.midPercentage}%</span>
                        <span>Swell {penmanshipMetrics.swellPercentage}%</span>
                      </div>
                      <div className="h-2 w-full rounded-full flex overflow-hidden border border-slate-700 shadow-inner">
                        <div
                          className="bg-amber-300 transition-all duration-200"
                          style={{ width: `${penmanshipMetrics.hairlinePercentage}%` }}
                          title={`Hairline strokes: ${penmanshipMetrics.hairlinePercentage}%`}
                        />
                        <div
                          className="bg-emerald-400 transition-all duration-200"
                          style={{ width: `${penmanshipMetrics.midPercentage}%` }}
                          title={`Mid-tone strokes: ${penmanshipMetrics.midPercentage}%`}
                        />
                        <div
                          className="bg-rose-500 transition-all duration-200"
                          style={{ width: `${penmanshipMetrics.swellPercentage}%` }}
                          title={`Heavy swell downstrokes: ${penmanshipMetrics.swellPercentage}%`}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono mt-0.5">
                        <span>Contrast: {penmanshipMetrics.contrastRatio}×</span>
                        <span>
                          Tremors:{' '}
                          {penmanshipMetrics.tremorCount === 0
                            ? 'Smooth'
                            : `${penmanshipMetrics.tremorCount} spikes`}
                        </span>
                      </div>
                    </div>

                    {/* One-click Balance & Contrast Action Buttons */}
                    <div className="pt-2 border-t border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] text-slate-300 font-semibold">
                        <span>Pressure Balance Tools:</span>
                        <span className="text-[9px] text-slate-400 font-normal">Undoable</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          onClick={handleBalancePressure}
                          disabled={currentStrokes.length === 0}
                          className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 text-[10px] font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-xs active:scale-95"
                          title="Balance pen pressure across all strokes to smooth hand tremors and normalize stem thickness"
                        >
                          <Sliders className="w-3 h-3 text-amber-400" />
                          <span>Balance Pressure</span>
                        </button>
                        <button
                          onClick={handleBoostPressureContrast}
                          disabled={currentStrokes.length === 0}
                          className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/40 text-indigo-200 text-[10px] font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-xs active:scale-95"
                          title="Boost dynamic calligraphic contrast between hairlines and downstroke swells"
                        >
                          <Sparkles className="w-3 h-3 text-indigo-400" />
                          <span>Boost Contrast</span>
                        </button>
                      </div>
                    </div>

                    {/* Color Palette Switcher Pills */}
                    <div>
                      <div className="text-[10px] text-slate-400 font-medium mb-1">Color Palette:</div>
                      <div className="grid grid-cols-2 gap-1 p-0.5 bg-slate-800/90 rounded-lg text-[10px]">
                        <button
                          onClick={() => setPressurePalette('penmanship-spectrum')}
                          className={`py-0.5 px-1.5 rounded font-medium transition-all ${
                            pressurePalette === 'penmanship-spectrum'
                              ? 'bg-amber-600 text-white shadow-xs font-semibold'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                          title="Calligraphic spectrum: Gold (hairline) → Jade (stem) → Sapphire (swell) → Crimson"
                        >
                          Penmanship
                        </button>
                        <button
                          onClick={() => setPressurePalette('thermal')}
                          className={`py-0.5 px-1.5 rounded font-medium transition-all ${
                            pressurePalette === 'thermal'
                              ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                          title="Thermal chromatic spectrum (Cyan → Green → Amber → Red)"
                        >
                          Thermal
                        </button>
                        <button
                          onClick={() => setPressurePalette('light-to-dark')}
                          className={`py-0.5 px-1.5 rounded font-medium transition-all ${
                            pressurePalette === 'light-to-dark'
                              ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                          title="Light periwinkle to midnight obsidian"
                        >
                          Light → Dark
                        </button>
                        <button
                          onClick={() => setPressurePalette('ink-density')}
                          className={`py-0.5 px-1.5 rounded font-medium transition-all ${
                            pressurePalette === 'ink-density'
                              ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                          title="Sumi ink wash monochrome density"
                        >
                          Ink Wash
                        </button>
                      </div>
                    </div>

                    {/* Dynamic visual gradient representation bar */}
                    <div
                      className={`h-2 rounded-full w-full shadow-inner border border-slate-700/60 ${
                        pressurePalette === 'penmanship-spectrum'
                          ? 'bg-gradient-to-r from-[#fef08a] via-[#34d399] via-[#3b82f6] to-[#dc2626]'
                          : pressurePalette === 'light-to-dark'
                          ? 'bg-gradient-to-r from-[#e0e7ff] via-[#818cf8] via-[#4338ca] via-[#1e1b4b] to-[#020617]'
                          : pressurePalette === 'ink-density'
                          ? 'bg-gradient-to-r from-[#f1f5f9] via-[#94a3b8] via-[#475569] to-[#020617]'
                          : 'bg-gradient-to-r from-[#06b6d4] via-[#10b981] via-[#f59e0b] to-[#ef4444]'
                      }`}
                    />

                    {/* Thickness Exaggeration & Opacity Controls */}
                    <div className="pt-1.5 border-t border-slate-800 space-y-1.5 text-[10px]">
                      {/* Thickness scale slider */}
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-slate-400 font-mono">Thickness Scale</span>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="range"
                            min="0.8"
                            max="2.5"
                            step="0.05"
                            value={pressureThicknessScale}
                            onChange={(e) => setPressureThicknessScale(parseFloat(e.target.value))}
                            className="w-16 accent-amber-400 cursor-pointer h-1.5"
                            title="Scale stroke thickness variation on canvas (0.8x to 2.5x)"
                          />
                          <span className="font-mono text-amber-300 font-bold text-[9px] w-9 text-right">
                            {pressureThicknessScale.toFixed(2)}×
                          </span>
                        </div>
                      </div>

                      {/* Opacity slider & diagnostic toggle pills */}
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400 font-mono">Opacity</span>
                          <input
                            type="range"
                            min="0.2"
                            max="1.0"
                            step="0.05"
                            value={pressureOverlayAlpha}
                            onChange={(e) => setPressureOverlayAlpha(parseFloat(e.target.value))}
                            className="w-14 accent-amber-400 cursor-pointer h-1.5"
                            title="Adjust overlay opacity"
                          />
                          <span className="font-mono text-slate-300 text-[9px] w-6">
                            {Math.round(pressureOverlayAlpha * 100)}%
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setShowPressureBadges((prev) => !prev)}
                            className={`px-1.5 py-0.5 rounded text-[9px] font-medium border transition-colors ${
                              showPressureBadges
                                ? 'bg-amber-950/70 border-amber-500/80 text-amber-200'
                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                            }`}
                            title="Toggle numeric pressure percentage badges along stroke paths"
                          >
                            % Badges
                          </button>
                          <button
                            onClick={() => setShowPressureSwellCalipers((prev) => !prev)}
                            className={`px-1.5 py-0.5 rounded text-[9px] font-medium border transition-colors ${
                              showPressureSwellCalipers
                                ? 'bg-amber-950/70 border-amber-500/80 text-amber-200'
                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                            }`}
                            title="Toggle downstroke peak swell caliper markers"
                          >
                            Swells
                          </button>
                          <button
                            onClick={() => setShowPressureTremorWarnings((prev) => !prev)}
                            className={`px-1.5 py-0.5 rounded text-[9px] font-medium border transition-colors ${
                              showPressureTremorWarnings
                                ? 'bg-rose-950/70 border-rose-500/80 text-rose-200'
                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                            }`}
                            title="Highlight sudden pressure tremor spikes"
                          >
                            Tremors
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Live Pressure & Thickness Metrics */}
                    <div className="grid grid-cols-4 gap-1 pt-1.5 border-t border-slate-800 text-center font-mono">
                      <div className="bg-slate-800/80 rounded px-1 py-1">
                        <div className="text-[8px] text-slate-400 uppercase">Min</div>
                        <div className="text-[10px] font-bold text-amber-200">{pressureStats.min}</div>
                        <div className="text-[8px] text-slate-400">{pressureStats.minThickness}</div>
                      </div>
                      <div className="bg-slate-800/80 rounded px-1 py-1">
                        <div className="text-[8px] text-slate-400 uppercase">Avg</div>
                        <div className="text-[10px] font-bold text-amber-400">{pressureStats.avg}</div>
                        <div className="text-[8px] text-slate-400">{pressureStats.avgThickness}</div>
                      </div>
                      <div className="bg-slate-800/80 rounded px-1 py-1">
                        <div className="text-[8px] text-slate-400 uppercase">Max</div>
                        <div className="text-[10px] font-bold text-rose-400">{pressureStats.max}</div>
                        <div className="text-[8px] text-slate-400">{pressureStats.maxThickness}</div>
                      </div>
                      <div className="bg-slate-800/80 rounded px-1 py-1">
                        <div className="text-[8px] text-slate-400 uppercase">Strokes</div>
                        <div className="text-[10px] font-bold text-slate-300">{currentStrokes.length}</div>
                        <div className="text-[8px] text-slate-400">{pressureStats.pointCount} pts</div>
                      </div>
                    </div>

                    {/* Cross-Character Line-Weight Distribution Section */}
                    <div className="pt-2 border-t border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-1 font-semibold text-slate-200">
                          <Gauge className="w-3 h-3 text-indigo-400" />
                          <span>Cross-Character Weight</span>
                        </div>
                        <span
                          className={`font-mono text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                            crossCharWeightMetrics.weightCategory === 'Balanced Regular'
                              ? 'bg-emerald-950/70 text-emerald-300 border-emerald-500/50'
                              : crossCharWeightMetrics.weightCategory === 'Heavy / Bold'
                              ? 'bg-rose-950/70 text-rose-300 border-rose-500/50'
                              : 'bg-amber-950/70 text-amber-300 border-amber-500/50'
                          }`}
                        >
                          {crossCharWeightMetrics.weightDifferencePercent > 0
                            ? `+${crossCharWeightMetrics.weightDifferencePercent}% heavier`
                            : crossCharWeightMetrics.weightDifferencePercent < 0
                            ? `${crossCharWeightMetrics.weightDifferencePercent}% lighter`
                            : 'Balanced'}
                        </span>
                      </div>

                      {/* Active Glyph vs Font Average Comparison Row */}
                      <div className="grid grid-cols-2 gap-1.5 bg-slate-800/80 p-1.5 rounded-lg border border-slate-700/80 text-[10px]">
                        <div>
                          <span className="text-slate-400 text-[9px] block">'{currentChar}' Average:</span>
                          <span className="font-mono font-bold text-amber-300 text-[11px]">
                            {crossCharWeightMetrics.currentAvgThickness}px
                          </span>
                          <span className="text-slate-400 text-[9px] ml-1">
                            ({Math.round(crossCharWeightMetrics.currentAvgPressure * 100)}%)
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[9px] block">Font Average:</span>
                          <span className="font-mono font-bold text-indigo-300 text-[11px]">
                            {crossCharWeightMetrics.fontAvgThickness}px
                          </span>
                          <span className="text-slate-400 text-[9px] ml-1">
                            ({Math.round(crossCharWeightMetrics.fontAvgPressure * 100)}%)
                          </span>
                        </div>
                      </div>

                      {/* Visual Balance Bar */}
                      <div className="space-y-0.5">
                        <div className="flex items-center justify-between text-[9px] font-mono text-slate-400">
                          <span>Thin (0.5×)</span>
                          <span className="text-slate-300">Target (1.0×)</span>
                          <span>Bold (1.5×)</span>
                        </div>
                        <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-700 relative">
                          {/* 1.0x Target marker */}
                          <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white/70 z-10" />
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              Math.abs(crossCharWeightMetrics.weightDifferencePercent) <= 15
                                ? 'bg-emerald-400'
                                : crossCharWeightMetrics.weightDifferencePercent > 15
                                ? 'bg-rose-500'
                                : 'bg-amber-400'
                            }`}
                            style={{
                              width: `${Math.min(
                                100,
                                Math.max(10, ((crossCharWeightMetrics.relativeWeightRatio - 0.5) / 1.0) * 100)
                              )}%`,
                            }}
                          />
                        </div>
                      </div>

                      {/* One-click Action to Harmonize Weight */}
                      <button
                        onClick={handleMatchFontAverageWeight}
                        disabled={currentStrokes.length === 0 || crossCharWeightMetrics.comparedGlyphCount <= 1}
                        className="w-full flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/40 text-indigo-200 text-[10px] font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-xs active:scale-95"
                        title={`Harmonize '${currentChar}' line-weight to match the ${crossCharWeightMetrics.fontAvgThickness}px font average`}
                      >
                        <Sparkles className="w-3 h-3 text-indigo-400" />
                        <span>Match Font Average ({crossCharWeightMetrics.fontAvgThickness}px)</span>
                      </button>

                      {/* Cross-Character Thickness Rank Breakdown */}
                      {crossCharWeightMetrics.charBreakdown.length > 1 && (
                        <div className="pt-1">
                          <div className="text-[9px] text-slate-400 font-medium mb-1">
                            Character Weight Distribution ({crossCharWeightMetrics.charBreakdown.length} glyphs):
                          </div>
                          <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto pr-0.5">
                            {crossCharWeightMetrics.charBreakdown.slice(0, 8).map((item) => (
                              <button
                                key={item.char}
                                onClick={() => onSelectChar(item.char)}
                                className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold border flex items-center gap-1 transition-all ${
                                  item.char === currentChar
                                    ? 'bg-amber-500/30 border-amber-400 text-amber-200 ring-1 ring-amber-400/50'
                                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
                                }`}
                                title={`Switch to '${item.char}' · ${item.avgThickness}px thickness (${Math.round(
                                  item.avgPressure * 100
                                )}% pressure)`}
                              >
                                <span className="font-bold font-sans">{item.char}</span>
                                <span className="text-[8px] text-slate-400">{item.avgThickness}px</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Floating Reflection Tool HUD & Inspector on Canvas */}
            {(reflectionSettings.enabled || showReflectionPanel) && (
              <div
                className={`absolute top-2.5 ${
                  showPressureHeatmap
                    ? isPressureHUDCollapsed
                      ? 'left-[215px]'
                      : 'left-[340px]'
                    : 'left-2.5'
                } z-20 bg-slate-900/95 backdrop-blur-md border border-indigo-500/50 rounded-xl ${
                  showReflectionPanel ? 'p-3 max-w-[340px]' : 'py-1.5 px-3 max-w-fit'
                } text-white shadow-xl w-full animate-in fade-in slide-in-from-top-1 duration-200 select-none max-h-[85vh] overflow-y-auto`}
              >
                {/* Header Row */}
                <div
                  className={`flex items-center justify-between gap-2.5 ${
                    showReflectionPanel ? 'mb-2 pb-1.5 border-b border-slate-800' : ''
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-300">
                    <Split className="w-3.5 h-3.5 text-indigo-400" />
                    <span>
                      Reflection{' '}
                      {showReflectionPanel
                        ? 'Tool · Symmetrical Balance'
                        : `${
                            reflectionSettings.type === 'horizontal'
                              ? `H (X:${reflectionAxisX}px)`
                              : reflectionSettings.type === 'vertical'
                              ? `V (Y:${reflectionAxisY}px)`
                              : `Quad (X:${reflectionAxisX}, Y:${reflectionAxisY})`
                          }`}
                    </span>
                    {reflectionSettings.enabled && (
                      <span className="px-1.5 py-0.2 rounded bg-indigo-950 border border-indigo-500/60 text-indigo-300 text-[10px] font-mono font-bold uppercase">
                        {reflectionSettings.type === 'horizontal'
                          ? 'H'
                          : reflectionSettings.type === 'vertical'
                          ? 'V'
                          : '4-Way'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() =>
                        setReflectionSettings((prev) => {
                          const next = !prev.enabled;
                          setBeautifyNotice(
                            next
                              ? `Reflection Tool ON: ${prev.type.toUpperCase()} [S]`
                              : 'Reflection Tool OFF [S]'
                          );
                          setTimeout(() => setBeautifyNotice(null), 2000);
                          return { ...prev, enabled: next };
                        })
                      }
                      className={`text-[10px] font-bold px-2 py-0.5 rounded transition-colors ${
                        reflectionSettings.enabled
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'bg-slate-800 text-slate-300 hover:text-white'
                      }`}
                      title="Toggle real-time stroke reflection on canvas [S]"
                    >
                      {reflectionSettings.enabled ? 'Active [S]' : 'Off [S]'}
                    </button>
                    <button
                      onClick={() => setShowReflectionPanel((prev) => !prev)}
                      className={`p-1 rounded text-xs transition-colors ${
                        showReflectionPanel
                          ? 'bg-indigo-700 text-white'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                      title={showReflectionPanel ? 'Collapse Reflection Panel' : 'Expand Reflection Settings'}
                    >
                      <Sliders className="w-3 h-3" />
                    </button>
                    {showReflectionPanel && (
                      <button
                        onClick={() => setShowReflectionPanel(false)}
                        className="text-slate-400 hover:text-white text-xs font-bold px-1.5 py-0.5 rounded hover:bg-slate-800"
                        title="Close Reflection Inspector"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded Reflection Inspector Controls */}
                {showReflectionPanel && (
                  <div className="space-y-2.5 text-xs animate-in fade-in duration-150">
                    {/* Reflection Mode Segmented Tabs */}
                    <div>
                      <div className="text-[10px] text-slate-400 font-medium mb-1">Mirroring Axis Mode:</div>
                      <div className="grid grid-cols-3 gap-1 p-0.5 bg-slate-800/90 rounded-lg text-[10px]">
                        <button
                          onClick={() =>
                            setReflectionSettings((prev) => ({
                              ...prev,
                              type: 'horizontal',
                              enabled: true,
                            }))
                          }
                          className={`py-1 px-1 rounded font-medium transition-all text-center flex flex-col items-center gap-0.5 ${
                            reflectionSettings.type === 'horizontal'
                              ? 'bg-indigo-600 text-white shadow-xs font-semibold ring-1 ring-indigo-400/50'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                          title="Horizontal Reflection (Left ↔ Right): Mirrors across vertical axis X for characters like A, H, M, O, T, U, V, W, X, Y"
                        >
                          <div className="flex items-center gap-1 font-bold">
                            <MoveHorizontal className="w-3 h-3 text-indigo-300" />
                            <span>Horizontal</span>
                          </div>
                          <span className="text-[9px] opacity-80">Left ↔ Right</span>
                        </button>
                        <button
                          onClick={() =>
                            setReflectionSettings((prev) => ({
                              ...prev,
                              type: 'vertical',
                              enabled: true,
                            }))
                          }
                          className={`py-1 px-1 rounded font-medium transition-all text-center flex flex-col items-center gap-0.5 ${
                            reflectionSettings.type === 'vertical'
                              ? 'bg-purple-600 text-white shadow-xs font-semibold ring-1 ring-purple-400/50'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                          title="Vertical Reflection (Top ↕ Bottom): Mirrors across horizontal axis Y for characters like B, C, D, E, H, I, K, O, X, -"
                        >
                          <div className="flex items-center gap-1 font-bold">
                            <Sliders className="w-3 h-3 text-purple-300 rotate-90" />
                            <span>Vertical</span>
                          </div>
                          <span className="text-[9px] opacity-80">Top ↕ Bottom</span>
                        </button>
                        <button
                          onClick={() =>
                            setReflectionSettings((prev) => ({
                              ...prev,
                              type: 'quad',
                              enabled: true,
                            }))
                          }
                          className={`py-1 px-1 rounded font-medium transition-all text-center flex flex-col items-center gap-0.5 ${
                            reflectionSettings.type === 'quad'
                              ? 'bg-fuchsia-600 text-white shadow-xs font-semibold ring-1 ring-fuchsia-400/50'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                          title="Quad 4-Way Reflection: Dual-axis simultaneous reflection across both vertical and horizontal axes for H, I, O, X, 0, 8, +"
                        >
                          <div className="flex items-center gap-1 font-bold">
                            <Crosshair className="w-3 h-3 text-fuchsia-300" />
                            <span>Quad (4-Way)</span>
                          </div>
                          <span className="text-[9px] opacity-80">Dual Axes</span>
                        </button>
                      </div>
                    </div>

                    {/* Optical Balance Analyzer Card */}
                    <div className="p-2 bg-slate-800/80 rounded-lg border border-slate-700/80 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-1 font-semibold text-indigo-300">
                          <Activity className="w-3 h-3 text-indigo-400" />
                          <span>Character Optical Balance</span>
                        </div>
                        <span
                          className={`font-mono text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                            characterBalanceMetrics.overallBalanceScore >= 85
                              ? 'bg-emerald-950/70 text-emerald-300 border-emerald-500/50'
                              : characterBalanceMetrics.overallBalanceScore >= 70
                              ? 'bg-amber-950/70 text-amber-300 border-amber-500/50'
                              : 'bg-rose-950/70 text-rose-300 border-rose-500/50'
                          }`}
                        >
                          {characterBalanceMetrics.overallBalanceScore}% · {characterBalanceMetrics.balanceRating}
                        </span>
                      </div>

                      {/* Score Bars */}
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div>
                          <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono mb-0.5">
                            <span>↔ Horiz Sym</span>
                            <span className="text-indigo-200 font-bold">
                              {characterBalanceMetrics.horizontalBalanceScore}%
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                              style={{ width: `${characterBalanceMetrics.horizontalBalanceScore}%` }}
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono mb-0.5">
                            <span>↕ Vert Sym</span>
                            <span className="text-purple-200 font-bold">
                              {characterBalanceMetrics.verticalBalanceScore}%
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-purple-500 rounded-full transition-all duration-300"
                              style={{ width: `${characterBalanceMetrics.verticalBalanceScore}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Mass Distribution Row */}
                      <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-slate-700/60 text-[9px] font-mono text-slate-300">
                        <div className="bg-slate-900/60 p-1 rounded">
                          <span className="text-slate-400 block text-[8px] uppercase">L / R Mass</span>
                          <span>
                            {characterBalanceMetrics.leftPointWeight}% L ·{' '}
                            {characterBalanceMetrics.rightPointWeight}% R
                          </span>
                        </div>
                        <div className="bg-slate-900/60 p-1 rounded">
                          <span className="text-slate-400 block text-[8px] uppercase">T / B Mass</span>
                          <span>
                            {characterBalanceMetrics.topPointWeight}% T ·{' '}
                            {characterBalanceMetrics.bottomPointWeight}% B
                          </span>
                        </div>
                      </div>

                      {/* Optical Balance Recommendation */}
                      <div className="text-[9px] text-slate-400 italic bg-slate-900/40 p-1 rounded">
                        💡 {characterBalanceMetrics.recommendation}
                      </div>
                    </div>

                    {/* Vertical Reflection Axis X Placement (for Horizontal / Quad mode) */}
                    {(reflectionSettings.type === 'horizontal' || reflectionSettings.type === 'quad') && (
                      <div className="space-y-1 bg-slate-800/60 p-2 rounded-lg border border-slate-700/60">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-indigo-300 font-semibold">Vertical Axis X (L ↔ R):</span>
                          <span className="font-mono text-indigo-200 font-bold bg-slate-900 px-1.5 py-0.5 rounded text-[10px]">
                            {reflectionAxisX}px
                          </span>
                        </div>

                        {/* Preset Placement Buttons */}
                        <div className="grid grid-cols-2 gap-1 text-[10px]">
                          <button
                            onClick={() =>
                              setReflectionSettings((prev) => ({
                                ...prev,
                                horizontalAxisMode: 'metric',
                                horizontalAxisOffset: 0,
                              }))
                            }
                            className={`py-0.5 px-1 rounded transition-colors text-center ${
                              reflectionSettings.horizontalAxisMode === 'metric' &&
                              reflectionSettings.horizontalAxisOffset === 0
                                ? 'bg-indigo-600 text-white font-semibold'
                                : 'bg-slate-700/80 text-slate-300 hover:text-white'
                            }`}
                            title="Metric Glyph Center: centers between character side bearings"
                          >
                            Glyph Center ({Math.round(CANVAS_ORIGIN_X + (currentGlyph.advanceWidth || 600) * 0.36)}px)
                          </button>
                          <button
                            onClick={() =>
                              setReflectionSettings((prev) => ({
                                ...prev,
                                horizontalAxisMode: 'canvas',
                                horizontalAxisOffset: 0,
                              }))
                            }
                            className={`py-0.5 px-1 rounded transition-colors text-center ${
                              reflectionSettings.horizontalAxisMode === 'canvas' &&
                              reflectionSettings.horizontalAxisOffset === 0
                                ? 'bg-indigo-600 text-white font-semibold'
                                : 'bg-slate-700/80 text-slate-300 hover:text-white'
                            }`}
                            title="Canvas Center: geometric 400px line"
                          >
                            Canvas 400px
                          </button>
                        </div>

                        {/* Axis X Nudge Offset */}
                        <div className="flex items-center justify-between gap-1 text-[10px] pt-1">
                          <span className="text-slate-400">Nudge X:</span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() =>
                                setReflectionSettings((prev) => ({
                                  ...prev,
                                  horizontalAxisOffset: prev.horizontalAxisOffset - 2,
                                }))
                              }
                              className="px-1.5 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 font-mono text-[9px]"
                              title="Nudge axis 2px left"
                            >
                              -2px
                            </button>
                            <span className="font-mono text-indigo-300 w-10 text-center text-[10px]">
                              {reflectionSettings.horizontalAxisOffset > 0
                                ? `+${reflectionSettings.horizontalAxisOffset}`
                                : reflectionSettings.horizontalAxisOffset}px
                            </span>
                            <button
                              onClick={() =>
                                setReflectionSettings((prev) => ({
                                  ...prev,
                                  horizontalAxisOffset: prev.horizontalAxisOffset + 2,
                                }))
                              }
                              className="px-1.5 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 font-mono text-[9px]"
                              title="Nudge axis 2px right"
                            >
                              +2px
                            </button>
                            {reflectionSettings.horizontalAxisOffset !== 0 && (
                              <button
                                onClick={() =>
                                  setReflectionSettings((prev) => ({
                                    ...prev,
                                    horizontalAxisOffset: 0,
                                  }))
                                }
                                className="text-[9px] text-indigo-400 hover:text-indigo-300 underline ml-1"
                                title="Reset axis offset"
                              >
                                Reset
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Horizontal Reflection Axis Y Placement (for Vertical / Quad mode) */}
                    {(reflectionSettings.type === 'vertical' || reflectionSettings.type === 'quad') && (
                      <div className="space-y-1 bg-slate-800/60 p-2 rounded-lg border border-slate-700/60">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-purple-300 font-semibold">Horizontal Axis Y (T ↕ B):</span>
                          <span className="font-mono text-purple-200 font-bold bg-slate-900 px-1.5 py-0.5 rounded text-[10px]">
                            {reflectionAxisY}px
                          </span>
                        </div>

                        {/* Preset Placement Buttons */}
                        <div className="grid grid-cols-3 gap-1 text-[9px]">
                          <button
                            onClick={() =>
                              setReflectionSettings((prev) => ({
                                ...prev,
                                verticalAxisMode: 'typographic',
                                verticalAxisOffset: 0,
                              }))
                            }
                            className={`py-0.5 px-1 rounded transition-colors text-center ${
                              reflectionSettings.verticalAxisMode === 'typographic' &&
                              reflectionSettings.verticalAxisOffset === 0
                                ? 'bg-purple-600 text-white font-semibold'
                                : 'bg-slate-700/80 text-slate-300 hover:text-white'
                            }`}
                            title="Typographic Center: mid-point between Cap-Height and Baseline"
                          >
                            Typographic ({Math.round((guideConfig.capHeight + guideConfig.baseline) / 2)}px)
                          </button>
                          <button
                            onClick={() =>
                              setReflectionSettings((prev) => ({
                                ...prev,
                                verticalAxisMode: 'baseline',
                                verticalAxisOffset: 0,
                              }))
                            }
                            className={`py-0.5 px-1 rounded transition-colors text-center ${
                              reflectionSettings.verticalAxisMode === 'baseline' &&
                              reflectionSettings.verticalAxisOffset === 0
                                ? 'bg-purple-600 text-white font-semibold'
                                : 'bg-slate-700/80 text-slate-300 hover:text-white'
                            }`}
                            title="Baseline: horizontal baseline level"
                          >
                            Baseline ({guideConfig.baseline}px)
                          </button>
                          <button
                            onClick={() =>
                              setReflectionSettings((prev) => ({
                                ...prev,
                                verticalAxisMode: 'canvas',
                                verticalAxisOffset: 0,
                              }))
                            }
                            className={`py-0.5 px-1 rounded transition-colors text-center ${
                              reflectionSettings.verticalAxisMode === 'canvas' &&
                              reflectionSettings.verticalAxisOffset === 0
                                ? 'bg-purple-600 text-white font-semibold'
                                : 'bg-slate-700/80 text-slate-300 hover:text-white'
                            }`}
                            title="Canvas Center: 400px horizontal line"
                          >
                            Canvas 400px
                          </button>
                        </div>

                        {/* Axis Y Nudge Offset */}
                        <div className="flex items-center justify-between gap-1 text-[10px] pt-1">
                          <span className="text-slate-400">Nudge Y:</span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() =>
                                setReflectionSettings((prev) => ({
                                  ...prev,
                                  verticalAxisOffset: prev.verticalAxisOffset - 2,
                                }))
                              }
                              className="px-1.5 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 font-mono text-[9px]"
                              title="Nudge axis 2px up"
                            >
                              -2px
                            </button>
                            <span className="font-mono text-purple-300 w-10 text-center text-[10px]">
                              {reflectionSettings.verticalAxisOffset > 0
                                ? `+${reflectionSettings.verticalAxisOffset}`
                                : reflectionSettings.verticalAxisOffset}px
                            </span>
                            <button
                              onClick={() =>
                                setReflectionSettings((prev) => ({
                                  ...prev,
                                  verticalAxisOffset: prev.verticalAxisOffset + 2,
                                }))
                              }
                              className="px-1.5 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 font-mono text-[9px]"
                              title="Nudge axis 2px down"
                            >
                              +2px
                            </button>
                            {reflectionSettings.verticalAxisOffset !== 0 && (
                              <button
                                onClick={() =>
                                  setReflectionSettings((prev) => ({
                                    ...prev,
                                    verticalAxisOffset: 0,
                                  }))
                                }
                                className="text-[9px] text-purple-400 hover:text-purple-300 underline ml-1"
                                title="Reset axis offset"
                              >
                                Reset
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Bounding Box Snap & Visual Overlay Toggles */}
                    <div className="flex items-center justify-between text-[10px] bg-slate-800/40 p-1.5 rounded-lg border border-slate-700/40">
                      <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white">
                        <input
                          type="checkbox"
                          checked={reflectionSettings.lockAxesToBoundingBoxCenter ?? false}
                          onChange={(e) =>
                            setReflectionSettings((prev) => ({
                              ...prev,
                              lockAxesToBoundingBoxCenter: e.target.checked,
                            }))
                          }
                          className="accent-indigo-500 rounded"
                        />
                        <span>Lock to Bounding Box Center</span>
                      </label>
                      <button
                        onClick={() =>
                          setReflectionSettings((prev) => ({
                            ...prev,
                            showGhostReticle: !prev.showGhostReticle,
                          }))
                        }
                        className={`px-1.5 py-0.5 rounded text-[9px] border transition-colors ${
                          reflectionSettings.showGhostReticle
                            ? 'bg-indigo-950/70 border-indigo-500/80 text-indigo-200'
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                        }`}
                        title="Toggle live ghost mirror reticle preview while hovering pen cursor"
                      >
                        Ghost Reticles
                      </button>
                    </div>

                    {/* One-Click Post-Drawing Reflection Tools */}
                    <div className="pt-2 border-t border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] text-slate-300 font-semibold">
                        <span>One-Click Half-Stroke Reflection:</span>
                        <span className="text-[9px] text-slate-400 font-normal">Undoable</span>
                      </div>

                      {/* Horizontal half reflection buttons */}
                      {(reflectionSettings.type === 'horizontal' || reflectionSettings.type === 'quad') && (
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            onClick={() => handleMirrorHalf('left-to-right')}
                            disabled={currentStrokes.length === 0}
                            className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/40 text-indigo-200 text-[10px] font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-xs active:scale-95"
                            title="Mirror Left half strokes to Right side across vertical axis X"
                          >
                            <span>Left ➔ Right (↔)</span>
                          </button>
                          <button
                            onClick={() => handleMirrorHalf('right-to-left')}
                            disabled={currentStrokes.length === 0}
                            className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/40 text-indigo-200 text-[10px] font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-xs active:scale-95"
                            title="Mirror Right half strokes to Left side across vertical axis X"
                          >
                            <span>Right ➔ Left (↔)</span>
                          </button>
                        </div>
                      )}

                      {/* Vertical half reflection buttons */}
                      {(reflectionSettings.type === 'vertical' || reflectionSettings.type === 'quad') && (
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            onClick={() => handleMirrorHalf('top-to-bottom')}
                            disabled={currentStrokes.length === 0}
                            className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-200 text-[10px] font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-xs active:scale-95"
                            title="Mirror Top half strokes to Bottom side across horizontal axis Y"
                          >
                            <span>Top ➔ Bottom (↕)</span>
                          </button>
                          <button
                            onClick={() => handleMirrorHalf('bottom-to-top')}
                            disabled={currentStrokes.length === 0}
                            className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-200 text-[10px] font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-xs active:scale-95"
                            title="Mirror Bottom half strokes to Top side across horizontal axis Y"
                          >
                            <span>Bottom ➔ Top (↕)</span>
                          </button>
                        </div>
                      )}

                      {/* Reflect All Strokes Button */}
                      <button
                        onClick={() => handleReflectAllStrokes()}
                        disabled={currentStrokes.length === 0}
                        className="w-full flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[10px] font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-xs active:scale-95"
                        title="Duplicate and reflect all active strokes across the configured reflection axes"
                      >
                        <Copy className="w-3 h-3 text-indigo-400" />
                        <span>Reflect All Strokes Across Active Axes</span>
                      </button>
                    </div>

                    {/* Symmetrical Character Quick Select Presets */}
                    <div className="pt-2 border-t border-slate-800">
                      <div className="text-[10px] text-slate-400 mb-1.5 font-medium flex items-center justify-between">
                        <span>
                          {reflectionSettings.type === 'horizontal'
                            ? 'Horizontal Symmetrical Letters:'
                            : reflectionSettings.type === 'vertical'
                            ? 'Vertical Symmetrical Letters:'
                            : 'Quad (Dual-Axis) Symmetrical:'}
                        </span>
                        <span className="text-[9px] text-indigo-300 font-mono">
                          {reflectionSettings.type === 'horizontal'
                            ? 'A, H, M, O, T...'
                            : reflectionSettings.type === 'vertical'
                            ? 'B, C, D, E, K...'
                            : 'H, I, O, X, 0, 8...'}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {(reflectionSettings.type === 'horizontal'
                          ? HORIZONTAL_SYMMETRY_PRESETS
                          : reflectionSettings.type === 'vertical'
                          ? VERTICAL_SYMMETRY_PRESETS
                          : QUAD_SYMMETRY_PRESETS
                        ).map((char) => (
                          <button
                            key={char}
                            onClick={() => onSelectChar(char)}
                            className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold font-mono transition-colors ${
                              currentChar === char
                                ? 'bg-indigo-600 text-white ring-1 ring-white'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                            }`}
                            title={`Switch to symmetrical character '${char}'`}
                          >
                            {char}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Floating Snap to Grid HUD Card */}
            {(gridSettings.enabled || showGridConfigPanel) && (
              <div
                className={`absolute ${
                  underlay.src && underlay.visible ? 'top-14' : 'top-2.5'
                } right-2.5 z-20 bg-slate-900/95 backdrop-blur-md border border-indigo-500/50 rounded-xl ${
                  showGridConfigPanel ? 'p-3 max-w-[310px]' : 'py-1.5 px-3 max-w-fit'
                } text-white shadow-xl w-full animate-in fade-in slide-in-from-top-1 duration-200 select-none`}
              >
                <div
                  className={`flex items-center justify-between gap-2.5 ${
                    showGridConfigPanel ? 'mb-2 pb-1.5 border-b border-slate-800' : ''
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-300">
                    <Magnet className="w-3.5 h-3.5 text-indigo-400" />
                    <span>
                      Snap to Grid{' '}
                      {showGridConfigPanel
                        ? `(${gridSettings.gridSize}px Pitch)`
                        : `[${gridSettings.gridSize}px]`}
                    </span>
                    {currentStrokes.length > 0 && (
                      <span className="px-1.5 py-0.2 rounded bg-indigo-950 border border-indigo-500/60 text-indigo-300 text-[10px] font-mono">
                        {gridAlignmentMetrics.alignmentPercentage}%
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() =>
                        setGridSettings((prev) => ({ ...prev, enabled: !prev.enabled }))
                      }
                      className={`text-[10px] font-bold px-2 py-0.5 rounded transition-colors ${
                        gridSettings.enabled
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'bg-slate-800 text-slate-300 hover:text-white'
                      }`}
                      title="Toggle Snap to Grid [X]"
                    >
                      {gridSettings.enabled ? 'Active [X]' : 'Off [X]'}
                    </button>
                    <button
                      onClick={() => setShowGridConfigPanel((prev) => !prev)}
                      className={`p-1 rounded text-xs transition-colors ${
                        showGridConfigPanel
                          ? 'bg-indigo-700 text-white'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                      title={showGridConfigPanel ? 'Collapse Grid Settings' : 'Expand Grid Settings'}
                    >
                      <Sliders className="w-3 h-3" />
                    </button>
                    {showGridConfigPanel && (
                      <button
                        onClick={() => setShowGridConfigPanel(false)}
                        className="text-slate-400 hover:text-white text-xs font-bold px-1.5 py-0.5 rounded hover:bg-slate-800"
                        title="Close Grid Inspector"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {showGridConfigPanel && (
                  <div className="space-y-2.5 text-xs animate-in fade-in duration-150">
                    {/* Alignment Stats */}
                    <div className="bg-slate-800/80 rounded-lg p-2 border border-slate-700/80 flex items-center justify-between">
                      <div>
                        <span className="text-slate-400 text-[10px] block">Aligned Endpoints</span>
                        <span className="font-mono font-bold text-indigo-200 text-xs">
                          {gridAlignmentMetrics.alignedEndpoints} of {gridAlignmentMetrics.totalEndpoints} endpoints
                        </span>
                      </div>
                      <span className="font-mono font-extrabold text-sm text-indigo-300 bg-indigo-950 px-2 py-0.5 rounded border border-indigo-700">
                        {gridAlignmentMetrics.alignmentPercentage}%
                      </span>
                    </div>

                    {/* Pitch Presets */}
                    <div>
                      <div className="text-[10px] text-slate-400 font-medium mb-1">
                        Grid Pitch (Pixels):
                      </div>
                      <div className="grid grid-cols-4 gap-1 p-0.5 bg-slate-800/90 rounded-lg text-[10px] font-mono">
                        {[10, 20, 40, 50].map((size) => (
                          <button
                            key={size}
                            onClick={() =>
                              setGridSettings((prev) => ({ ...prev, gridSize: size }))
                            }
                            className={`py-1 px-1 rounded font-semibold text-center transition-all ${
                              gridSettings.gridSize === size
                                ? 'bg-indigo-600 text-white shadow-2xs font-bold'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {size}px
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Custom Grid Pitch Slider */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                        <span>Pitch Scale:</span>
                        <span className="text-indigo-300 font-bold">{gridSettings.gridSize}px</span>
                      </div>
                      <input
                        type="range"
                        min="8"
                        max="100"
                        step="2"
                        value={gridSettings.gridSize}
                        onChange={(e) =>
                          setGridSettings((prev) => ({
                            ...prev,
                            gridSize: parseInt(e.target.value),
                          }))
                        }
                        className="w-full accent-indigo-500 cursor-pointer h-1.5"
                        title="Adjust grid spacing in canvas pixels"
                      />
                    </div>

                    {/* Magnetic Snap Radius Slider */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                        <span>Magnetic Snap Radius:</span>
                        <span className="text-indigo-300 font-bold">
                          {gridSettings.magneticThreshold}px
                        </span>
                      </div>
                      <input
                        type="range"
                        min="6"
                        max="40"
                        step="2"
                        value={gridSettings.magneticThreshold}
                        onChange={(e) =>
                          setGridSettings((prev) => ({
                            ...prev,
                            magneticThreshold: parseInt(e.target.value),
                          }))
                        }
                        className="w-full accent-indigo-500 cursor-pointer h-1.5"
                        title="Snap radius: endpoints within this pixel distance magnetically attract to grid vertices"
                      />
                    </div>

                    {/* Snap Targets: Endpoints Only vs All Points */}
                    <div className="pt-1.5 border-t border-slate-800">
                      <div className="flex items-center justify-between text-[10px] mb-1">
                        <span className="text-slate-400 font-medium">Alignment Scope:</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 p-0.5 bg-slate-800/90 rounded-lg text-[10px]">
                        <button
                          onClick={() =>
                            setGridSettings((prev) => ({ ...prev, snapEndpointsOnly: true }))
                          }
                          className={`py-1 px-1.5 rounded font-semibold text-center transition-all ${
                            gridSettings.snapEndpointsOnly
                              ? 'bg-indigo-600 text-white shadow-2xs'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                          title="Snap stroke start and end points only (preserves freehand curvature in curve interiors)"
                        >
                          Endpoints Only
                        </button>
                        <button
                          onClick={() =>
                            setGridSettings((prev) => ({ ...prev, snapEndpointsOnly: false }))
                          }
                          className={`py-1 px-1.5 rounded font-semibold text-center transition-all ${
                            !gridSettings.snapEndpointsOnly
                              ? 'bg-indigo-600 text-white shadow-2xs'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                          title="Snap all stroke points (creates rigid geometric or pixel-grid characters)"
                        >
                          All Points
                        </button>
                      </div>
                    </div>

                    {/* Visual Overlay Toggles */}
                    <div className="flex items-center justify-between text-[10px] pt-1">
                      <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                        <input
                          type="checkbox"
                          checked={gridSettings.showGridLines}
                          onChange={(e) =>
                            setGridSettings((prev) => ({
                              ...prev,
                              showGridLines: e.target.checked,
                            }))
                          }
                          className="rounded border-slate-700 bg-slate-800 text-indigo-500 focus:ring-0"
                        />
                        <span>Grid Lines</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                        <input
                          type="checkbox"
                          checked={gridSettings.showIntersectionDots}
                          onChange={(e) =>
                            setGridSettings((prev) => ({
                              ...prev,
                              showIntersectionDots: e.target.checked,
                            }))
                          }
                          className="rounded border-slate-700 bg-slate-800 text-indigo-500 focus:ring-0"
                        />
                        <span>Intersection Dots</span>
                      </label>
                    </div>

                    {/* One-Click Action: Snap All Endpoints of Active Character */}
                    <div className="pt-2 border-t border-slate-800">
                      <button
                        onClick={handleSnapGlyphEndpoints}
                        disabled={currentStrokes.length === 0}
                        className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md active:scale-95 cursor-pointer"
                        title="Snap all stroke endpoints in the active character to the nearest grid intersection"
                      >
                        <Magnet className="w-3.5 h-3.5" />
                        <span>Snap '{currentChar}' Endpoints to Grid</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Floating Ghost Template (Standard Latin Tracing Guide) HUD Card on Canvas */}
            {(tracingGuide.enabled || showTracingGuidePanel) && (
              <div
                className={`absolute ${
                  showPressureHeatmap
                    ? isPressureHUDCollapsed
                      ? 'top-14 left-2.5'
                      : 'top-14 left-2.5'
                    : reflectionSettings.enabled || showReflectionPanel
                    ? 'top-14 left-2.5'
                    : 'top-2.5 left-2.5'
                } z-20 bg-slate-900/95 backdrop-blur-md border border-sky-500/50 rounded-xl ${
                  showTracingGuidePanel ? 'p-3 max-w-[340px]' : 'py-1.5 px-3 max-w-fit'
                } text-white shadow-xl w-full animate-in fade-in slide-in-from-top-1 duration-200 select-none max-h-[85vh] overflow-y-auto`}
              >
                {/* Header Row */}
                <div
                  className={`flex items-center justify-between gap-2.5 ${
                    showTracingGuidePanel ? 'mb-2 pb-1.5 border-b border-slate-800' : ''
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-sky-300">
                    <Ghost className="w-3.5 h-3.5 text-sky-400" />
                    <span>
                      Ghost Template{' '}
                      {showTracingGuidePanel
                        ? '· Latin Tracing Guide'
                        : `'${currentChar}' · ${Math.round(tracingGuide.opacity * 100)}%`}
                    </span>
                    {tracingGuide.enabled && (
                      <span className="px-1.5 py-0.2 rounded bg-sky-950 border border-sky-500/60 text-sky-300 text-[10px] font-mono font-bold">
                        {Math.round(tracingGuide.opacity * 100)}%
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() =>
                        setTracingGuide((prev) => {
                          const next = !prev.enabled;
                          setBeautifyNotice(
                            next
                              ? `Ghost Template ON: Tracing '${currentChar}' standard Latin form [T]`
                              : 'Ghost Template OFF [T]'
                          );
                          setTimeout(() => setBeautifyNotice(null), 2000);
                          return { ...prev, enabled: next };
                        })
                      }
                      className={`text-[10px] font-bold px-2 py-0.5 rounded transition-colors ${
                        tracingGuide.enabled
                          ? 'bg-sky-600 text-white shadow-2xs'
                          : 'bg-slate-800 text-slate-300 hover:text-white'
                      }`}
                      title="Toggle Ghost Template overlay on canvas [T]"
                    >
                      {tracingGuide.enabled ? 'Active [T]' : 'Off [T]'}
                    </button>
                    <button
                      onClick={() => setShowTracingGuidePanel((prev) => !prev)}
                      className={`p-1 rounded text-xs transition-colors ${
                        showTracingGuidePanel
                          ? 'bg-sky-700 text-white'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                      title={showTracingGuidePanel ? 'Collapse Ghost Template HUD' : 'Expand Ghost Template Settings'}
                    >
                      <Sliders className="w-3 h-3" />
                    </button>
                    {showTracingGuidePanel && (
                      <button
                        onClick={() => setShowTracingGuidePanel(false)}
                        className="text-slate-400 hover:text-white text-xs font-bold px-1.5 py-0.5 rounded hover:bg-slate-800"
                        title="Close Ghost Template Inspector"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded Ghost Template Inspector Controls */}
                {showTracingGuidePanel && (
                  <div className="space-y-2.5 text-xs animate-in fade-in duration-150">
                    {/* Opacity Slider & Presets */}
                    <div className="space-y-1.5 bg-slate-800/80 p-2.5 rounded-lg border border-slate-700/80">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-sky-300 font-semibold">Ghost Template Opacity:</span>
                        <span className="font-mono text-sky-200 font-bold bg-slate-900 px-1.5 py-0.5 rounded text-[10px]">
                          {Math.round(tracingGuide.opacity * 100)}%
                        </span>
                      </div>

                      <div className="grid grid-cols-4 gap-1 p-0.5 bg-slate-900/80 rounded-lg text-[10px]">
                        {TRACING_OPACITY_PRESETS.map((preset) => {
                          const isSel = Math.abs(tracingGuide.opacity - preset.value) < 0.05;
                          return (
                            <button
                              key={preset.label}
                              onClick={() =>
                                setTracingGuide((prev) => ({ ...prev, opacity: preset.value, enabled: true }))
                              }
                              className={`py-1 px-1 rounded text-center transition-all ${
                                isSel
                                  ? 'bg-sky-600 text-white font-bold shadow-2xs'
                                  : 'text-slate-400 hover:text-slate-200'
                              }`}
                              title={`${preset.label} (${Math.round(preset.value * 100)}%): ${preset.hint}`}
                            >
                              <div className="font-semibold text-[10px]">{preset.label}</div>
                              <div className="text-[8px] opacity-80 font-mono">{Math.round(preset.value * 100)}%</div>
                            </button>
                          );
                        })}
                      </div>

                      <input
                        type="range"
                        min="0.05"
                        max="0.60"
                        step="0.02"
                        value={tracingGuide.opacity}
                        onChange={(e) =>
                          setTracingGuide((prev) => ({
                            ...prev,
                            opacity: parseFloat(e.target.value),
                            enabled: true,
                          }))
                        }
                        className="w-full accent-sky-500 cursor-pointer h-1.5"
                        title="Adjust semi-transparent ghost opacity"
                      />
                      <div className="flex items-center justify-between text-[8px] font-mono text-slate-400">
                        <span>Faint (5%)</span>
                        <span>Balanced (22%)</span>
                        <span>Prominent (60%)</span>
                      </div>
                    </div>

                    {/* Standard Latin Archetype Font Selector */}
                    <div>
                      <div className="text-[10px] text-slate-400 font-medium mb-1">
                        Standard Latin Archetype:
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        {STANDARD_FONT_OPTIONS.map((opt) => {
                          const isSelected = tracingGuide.fontStyle === opt.id;
                          return (
                            <button
                              key={opt.id}
                              onClick={() =>
                                setTracingGuide((prev) => ({
                                  ...prev,
                                  fontStyle: opt.id,
                                  enabled: true,
                                }))
                              }
                              className={`p-1.5 rounded-lg border text-left transition-all ${
                                isSelected
                                  ? 'border-sky-500 bg-sky-950/70 text-sky-200 ring-1 ring-sky-400 shadow-2xs'
                                  : 'border-slate-700 bg-slate-800/80 text-slate-300 hover:border-slate-600'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-[11px] truncate">{opt.name}</span>
                                {isSelected && <Check className="w-3 h-3 text-sky-400 shrink-0" />}
                              </div>
                              <div
                                className="text-[14px] font-bold text-white mt-0.5 truncate tracking-wide"
                                style={{ fontFamily: opt.fontFamily }}
                              >
                                {currentChar} {opt.sampleText.slice(3)}
                              </div>
                              <div className="text-[9px] text-slate-400 truncate mt-0.5">
                                {opt.bestFor}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Overlay Style: Outline, Silhouette, Dual, Skeleton */}
                    <div>
                      <div className="text-[10px] text-slate-400 font-medium mb-1">
                        Template Render Style:
                      </div>
                      <div className="grid grid-cols-4 gap-1 p-0.5 bg-slate-800/90 rounded-lg text-[10px] text-center">
                        {[
                          { id: 'ghost-outline', label: 'Outline' },
                          { id: 'ghost-fill', label: 'Silhouette' },
                          { id: 'dual', label: 'Dual' },
                          { id: 'skeleton', label: 'Skeleton' },
                        ].map((mode) => (
                          <button
                            key={mode.id}
                            onClick={() =>
                              setTracingGuide((prev) => ({
                                ...prev,
                                renderMode: mode.id as TracingRenderMode,
                                enabled: true,
                              }))
                            }
                            className={`py-1 px-1 rounded transition-colors truncate ${
                              tracingGuide.renderMode === mode.id
                                ? 'bg-sky-600 text-white font-bold shadow-xs'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {mode.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Quick Latin Characters Tracing Strip (A-Z, a-z) */}
                    <div className="space-y-1.5 pt-1.5 border-t border-slate-800">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-300 font-semibold flex items-center gap-1">
                          <Type className="w-3 h-3 text-sky-400" />
                          <span>Standard Latin Quick Jump:</span>
                        </span>
                        <div className="flex items-center gap-1 bg-slate-800 p-0.5 rounded">
                          <button
                            onClick={() => setTracingLatinCaseTab('upper')}
                            className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold transition-colors ${
                              tracingLatinCaseTab === 'upper'
                                ? 'bg-sky-600 text-white'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            A–Z
                          </button>
                          <button
                            onClick={() => setTracingLatinCaseTab('lower')}
                            className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold transition-colors ${
                              tracingLatinCaseTab === 'lower'
                                ? 'bg-sky-600 text-white'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            a–z
                          </button>
                        </div>
                      </div>

                      {/* Horizontal character strip */}
                      <div className="flex gap-1 overflow-x-auto pb-1 max-w-full scrollbar-thin">
                        {(tracingLatinCaseTab === 'upper'
                          ? STANDARD_LATIN_UPPERCASE
                          : STANDARD_LATIN_LOWERCASE
                        ).map((char) => {
                          const isCurrent = currentChar === char;
                          const hasInk = (glyphs[char]?.strokes?.length ?? 0) > 0;
                          return (
                            <button
                              key={char}
                              onClick={() => onSelectChar(char)}
                              className={`w-6 h-6 shrink-0 rounded flex items-center justify-center font-bold text-xs font-mono transition-all ${
                                isCurrent
                                  ? 'bg-sky-500 text-white ring-2 ring-sky-300 shadow-xs'
                                  : hasInk
                                  ? 'bg-slate-800 text-emerald-300 hover:bg-slate-700'
                                  : 'bg-slate-800/80 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                              }`}
                              title={`Trace '${char}' standard Latin template${hasInk ? ' (Ink drawn)' : ''}`}
                            >
                              {char}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Sync Slant & Visual Guides */}
                    <div className="space-y-1.5 pt-1 border-t border-slate-800 text-[10px]">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white">
                          <input
                            type="checkbox"
                            checked={tracingGuide.applySlant}
                            onChange={(e) =>
                              setTracingGuide((prev) => ({ ...prev, applySlant: e.target.checked }))
                            }
                            className="rounded border-slate-700 bg-slate-800 text-sky-500 focus:ring-0"
                          />
                          <span>Sync with Font Slant ({slant}°)</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white">
                          <input
                            type="checkbox"
                            checked={tracingGuide.showProportions}
                            onChange={(e) =>
                              setTracingGuide((prev) => ({ ...prev, showProportions: e.target.checked }))
                            }
                            className="rounded border-slate-700 bg-slate-800 text-sky-500 focus:ring-0"
                          />
                          <span>Width Calipers</span>
                        </label>
                      </div>

                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white">
                          <input
                            type="checkbox"
                            checked={tracingGuide.showGuidelineSnaps}
                            onChange={(e) =>
                              setTracingGuide((prev) => ({ ...prev, showGuidelineSnaps: e.target.checked }))
                            }
                            className="rounded border-slate-700 bg-slate-800 text-sky-500 focus:ring-0"
                          />
                          <span>Guideline Alignment Pips</span>
                        </label>

                        {/* Guide Color Theme */}
                        <div className="flex items-center gap-1">
                          {(
                            [
                              { id: 'blueprint', dot: 'bg-sky-400' },
                              { id: 'indigo', dot: 'bg-indigo-400' },
                              { id: 'emerald', dot: 'bg-emerald-400' },
                              { id: 'amber', dot: 'bg-amber-400' },
                            ] as const
                          ).map((t) => (
                            <button
                              key={t.id}
                              onClick={() =>
                                setTracingGuide((prev) => ({
                                  ...prev,
                                  colorTheme: t.id as TracingColorTheme,
                                }))
                              }
                              className={`w-3.5 h-3.5 rounded-full ${t.dot} transition-transform ${
                                tracingGuide.colorTheme === t.id
                                  ? 'ring-2 ring-white scale-110'
                                  : 'opacity-60 hover:opacity-100'
                              }`}
                              title={`${t.id} tint`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Live Proportion Matching Diagnostics */}
                    <div className="p-2 bg-slate-800/80 rounded-lg border border-slate-700/80 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-slate-200 flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-sky-400" />
                          <span>Proportion Match</span>
                        </span>
                        {tracingProportionComparison.hasDrawnInk && (
                          <span
                            className={`font-mono text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                              tracingProportionComparison.overallMatchScore >= 80
                                ? 'bg-emerald-950/70 text-emerald-300 border-emerald-500/50'
                                : tracingProportionComparison.overallMatchScore >= 60
                                ? 'bg-amber-950/70 text-amber-300 border-amber-500/50'
                                : 'bg-rose-950/70 text-rose-300 border-rose-500/50'
                            }`}
                          >
                            {tracingProportionComparison.overallMatchScore}% Match
                          </span>
                        )}
                      </div>

                      {tracingProportionComparison.hasDrawnInk ? (
                        <>
                          <div className="grid grid-cols-2 gap-1.5 text-[9px] font-mono text-slate-300">
                            <div className="bg-slate-900/60 p-1 rounded">
                              <span className="text-slate-400 block text-[8px] uppercase">Width</span>
                              <span>
                                {tracingProportionComparison.drawnWidth}px / {tracingProportionComparison.standardWidth}px
                              </span>
                            </div>
                            <div className="bg-slate-900/60 p-1 rounded">
                              <span className="text-slate-400 block text-[8px] uppercase">Height</span>
                              <span>
                                {tracingProportionComparison.drawnHeight}px / {tracingProportionComparison.standardHeight}px
                              </span>
                            </div>
                          </div>
                          <div className="text-[9px] text-slate-400 italic bg-slate-900/40 p-1 rounded leading-tight">
                            💡 {tracingProportionComparison.feedbackTip}
                          </div>
                        </>
                      ) : (
                        <div className="text-[9px] text-slate-400 leading-tight">
                          Trace over the ghosted template for '{currentChar}' with your pen to match standard Latin proportions.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Floating Simplify Paths (RDP Algorithm) HUD Card on Canvas */}
            {(simplifySettings.enabled || showSimplifyPanel) && (
              <div
                className={`absolute bottom-3 right-3 z-20 bg-slate-900/95 backdrop-blur-md border border-emerald-500/50 rounded-xl ${
                  showSimplifyPanel ? 'p-3 max-w-[340px]' : 'py-1.5 px-3 max-w-fit'
                } text-white shadow-xl w-full animate-in fade-in slide-in-from-bottom-2 duration-200 select-none max-h-[85vh] overflow-y-auto`}
              >
                {/* Header */}
                <div
                  className={`flex items-center justify-between gap-2.5 ${
                    showSimplifyPanel ? 'mb-2 pb-1.5 border-b border-slate-800' : ''
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                    <Scissors className="w-3.5 h-3.5 text-emerald-400" />
                    <span>
                      Simplify Paths{' '}
                      {showSimplifyPanel
                        ? '· RDP Algorithm'
                        : `(ε:${simplifySettings.epsilon}px)`}
                    </span>
                    {currentStrokes.length > 0 && simplificationMetrics.reductionPercentage > 0 && (
                      <span className="px-1.5 py-0.2 rounded bg-emerald-950 border border-emerald-500/60 text-emerald-300 text-[10px] font-mono font-bold">
                        -{simplificationMetrics.reductionPercentage}%
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() =>
                        setSimplifySettings((prev) => {
                          const next = !prev.enabled;
                          setBeautifyNotice(
                            next
                              ? `Simplify Paths ON (RDP ε=${prev.epsilon}px)`
                              : 'Simplify Paths OFF'
                          );
                          setTimeout(() => setBeautifyNotice(null), 2000);
                          return { ...prev, enabled: next };
                        })
                      }
                      className={`text-[10px] font-bold px-2 py-0.5 rounded transition-colors ${
                        simplifySettings.enabled
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'bg-slate-800 text-slate-300 hover:text-white'
                      }`}
                      title="Toggle Simplify Paths mode overlay"
                    >
                      {simplifySettings.enabled ? 'Active' : 'Off'}
                    </button>
                    <button
                      onClick={() => setShowSimplifyPanel((prev) => !prev)}
                      className={`p-1 rounded text-xs transition-colors ${
                        showSimplifyPanel
                          ? 'bg-emerald-700 text-white'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                      title={showSimplifyPanel ? 'Collapse Simplify Settings' : 'Expand Simplify Settings'}
                    >
                      <Sliders className="w-3 h-3" />
                    </button>
                    {showSimplifyPanel && (
                      <button
                        onClick={() => setShowSimplifyPanel(false)}
                        className="text-slate-400 hover:text-white text-xs font-bold px-1.5 py-0.5 rounded hover:bg-slate-800"
                        title="Close Simplify Inspector"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded Simplify Settings */}
                {showSimplifyPanel && (
                  <div className="space-y-2.5 text-xs animate-in fade-in duration-150">
                    {/* Live Point Reduction Scorecard */}
                    <div className="bg-slate-800/80 rounded-lg p-2.5 border border-slate-700/80 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-300 font-semibold flex items-center gap-1">
                          <GitCommit className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Control Points:</span>
                        </span>
                        <span className="font-mono text-emerald-300 font-bold text-xs">
                          {simplificationMetrics.originalPointCount} ➔ {simplificationMetrics.simplifiedPointCount} pts
                        </span>
                      </div>

                      {/* Visual Reduction Progress Bar */}
                      <div className="space-y-0.5">
                        <div className="flex items-center justify-between text-[9px] font-mono text-slate-400">
                          <span>Original Points</span>
                          <span className="text-emerald-300 font-bold">
                            -{simplificationMetrics.reductionPercentage}% decimation
                          </span>
                        </div>
                        <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-700">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-300"
                            style={{
                              width: `${Math.max(
                                5,
                                Math.min(
                                  100,
                                  simplificationMetrics.originalPointCount > 0
                                    ? (simplificationMetrics.simplifiedPointCount /
                                        simplificationMetrics.originalPointCount) *
                                        100
                                    : 100
                                )
                              )}%`,
                            }}
                          />
                        </div>
                      </div>

                      {/* Diagnostics summary row */}
                      <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-slate-700/60 text-[9px] font-mono text-slate-300">
                        <div className="bg-slate-900/60 p-1 rounded">
                          <span className="text-slate-400 block text-[8px] uppercase">Max Deviation</span>
                          <span>±{simplificationMetrics.maxDeviation}px error</span>
                        </div>
                        <div className="bg-slate-900/60 p-1 rounded">
                          <span className="text-slate-400 block text-[8px] uppercase">Point Spacing</span>
                          <span>~{simplificationMetrics.averagePointSpacing}px avg</span>
                        </div>
                      </div>
                    </div>

                    {/* Tolerance (Epsilon ε) Slider & Readout */}
                    <div className="space-y-1 bg-slate-800/60 p-2 rounded-lg border border-slate-700/60">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-emerald-300 font-semibold">Tolerance (Epsilon ε):</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() =>
                              setSimplifySettings((prev) => ({
                                ...prev,
                                epsilon: Math.max(0.5, Math.round((prev.epsilon - 0.5) * 10) / 10),
                              }))
                            }
                            className="px-1.5 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 font-mono text-[9px]"
                            title="Decrease tolerance by 0.5px"
                          >
                            -0.5
                          </button>
                          <span className="font-mono text-emerald-200 font-bold bg-slate-900 px-1.5 py-0.5 rounded text-[10px] w-12 text-center">
                            {simplifySettings.epsilon.toFixed(1)}px
                          </span>
                          <button
                            onClick={() =>
                              setSimplifySettings((prev) => ({
                                ...prev,
                                epsilon: Math.min(20, Math.round((prev.epsilon + 0.5) * 10) / 10),
                              }))
                            }
                            className="px-1.5 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 font-mono text-[9px]"
                            title="Increase tolerance by 0.5px"
                          >
                            +0.5
                          </button>
                        </div>
                      </div>

                      <input
                        type="range"
                        min="0.5"
                        max="15.0"
                        step="0.5"
                        value={simplifySettings.epsilon}
                        onChange={(e) =>
                          setSimplifySettings((prev) => ({
                            ...prev,
                            epsilon: parseFloat(e.target.value),
                          }))
                        }
                        className="w-full accent-emerald-500 cursor-pointer h-1.5"
                        title="Distance tolerance (epsilon): points deviating less than this from line segment chords are removed"
                      />
                      <div className="flex items-center justify-between text-[8px] font-mono text-slate-400">
                        <span>0.5px (Fine)</span>
                        <span>3.0px (Balanced)</span>
                        <span>15.0px (Minimal)</span>
                      </div>
                    </div>

                    {/* Presets Grid */}
                    <div>
                      <div className="text-[10px] text-slate-400 font-medium mb-1">
                        Simplification Presets:
                      </div>
                      <div className="grid grid-cols-4 gap-1 p-0.5 bg-slate-800/90 rounded-lg text-[10px]">
                        {SIMPLIFY_PRESETS.map((preset) => {
                          const isSel = Math.abs(simplifySettings.epsilon - preset.epsilon) < 0.25;
                          return (
                            <button
                              key={preset.id}
                              onClick={() =>
                                setSimplifySettings((prev) => ({
                                  ...prev,
                                  epsilon: preset.epsilon,
                                }))
                              }
                              className={`py-1 px-1 rounded text-center transition-all ${
                                isSel
                                  ? 'bg-emerald-600 text-white shadow-xs font-bold'
                                  : 'text-slate-400 hover:text-slate-200'
                              }`}
                              title={`${preset.label} (ε=${preset.epsilon}px): ${preset.description}. Recommended for: ${preset.recommendedFor}`}
                            >
                              <div className="font-semibold text-[10px]">{preset.label}</div>
                              <div className="text-[8px] opacity-80 font-mono">{preset.epsilon}px</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Feature Toggles */}
                    <div className="space-y-1.5 pt-1 border-t border-slate-800 text-[10px]">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white">
                          <input
                            type="checkbox"
                            checked={simplifySettings.showControlPoints}
                            onChange={(e) =>
                              setSimplifySettings((prev) => ({
                                ...prev,
                                showControlPoints: e.target.checked,
                              }))
                            }
                            className="rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-0"
                          />
                          <span>Show Vector Node Anchors</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white">
                          <input
                            type="checkbox"
                            checked={simplifySettings.showLivePreview}
                            onChange={(e) =>
                              setSimplifySettings((prev) => ({
                                ...prev,
                                showLivePreview: e.target.checked,
                              }))
                            }
                            className="rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-0"
                          />
                          <span>Wireframe Preview</span>
                        </label>
                      </div>

                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white">
                          <input
                            type="checkbox"
                            checked={simplifySettings.autoSimplifyOnDraw}
                            onChange={(e) =>
                              setSimplifySettings((prev) => ({
                                ...prev,
                                autoSimplifyOnDraw: e.target.checked,
                              }))
                            }
                            className="rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-0"
                          />
                          <span>Auto-Clean Shaky Strokes on Draw</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white">
                          <input
                            type="checkbox"
                            checked={simplifySettings.curveRelaxation}
                            onChange={(e) =>
                              setSimplifySettings((prev) => ({
                                ...prev,
                                curveRelaxation: e.target.checked,
                              }))
                            }
                            className="rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-0"
                          />
                          <span>Curve Relaxation</span>
                        </label>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-2 border-t border-slate-800 space-y-1.5">
                      <button
                        onClick={() => handleApplySimplification()}
                        disabled={currentStrokes.length === 0}
                        className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md active:scale-95 cursor-pointer"
                        title={`Simplify '${currentChar}' paths by decimating points with distance deviation <= ${simplifySettings.epsilon}px`}
                      >
                        <Scissors className="w-3.5 h-3.5" />
                        <span>
                          Apply to '{currentChar}' (-{simplificationMetrics.reductionPercentage}%)
                        </span>
                      </button>

                      <button
                        onClick={handleBatchSimplifyAll}
                        disabled={Object.keys(glyphs).length === 0}
                        className="w-full flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[10px] font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-xs active:scale-95 cursor-pointer"
                        title={`Apply Ramer-Douglas-Peucker simplification to all characters in font to clean up handwriting universally`}
                      >
                        <Wand2 className="w-3 h-3 text-emerald-400" />
                        <span>Batch Simplify Entire Font ({Object.keys(glyphs).length} Glyphs)</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Floating Background Reference Image Tracing HUD Card on Canvas */}
            {underlay.src && (
              <div
                className={`absolute ${
                  tracingGuide.enabled ? 'top-12' : 'top-2.5'
                } right-2.5 z-20 flex items-center gap-2 bg-slate-900/90 backdrop-blur-md border border-indigo-400/50 text-white rounded-xl px-2.5 py-1.5 shadow-xl text-xs select-none animate-in fade-in duration-150`}
              >
                <div className="flex items-center gap-1.5 font-semibold text-indigo-300">
                  <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="hidden sm:inline">Reference</span>
                </div>

                {/* Visibility Eye */}
                <button
                  onClick={() => setUnderlay((prev) => ({ ...prev, visible: !prev.visible }))}
                  className={`p-1 rounded transition-colors ${
                    underlay.visible
                      ? 'bg-indigo-600/80 text-white hover:bg-indigo-600'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                  title="Toggle Reference Underlay [U]"
                >
                  {underlay.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>

                {/* Quick Opacity Slider */}
                <div className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-800/80 rounded border border-slate-700">
                  <span className="text-[10px] text-slate-400 font-mono">Opacity</span>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.05"
                    value={underlay.opacity}
                    onChange={(e) =>
                      setUnderlay((prev) => ({ ...prev, opacity: parseFloat(e.target.value) }))
                    }
                    className="w-12 accent-indigo-400 cursor-pointer"
                    title="Adjust Reference Image Opacity"
                  />
                  <span className="text-[10px] font-mono text-indigo-200 tabular-nums">
                    {Math.round(underlay.opacity * 100)}%
                  </span>
                </div>

                {/* Scale Nudges */}
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() =>
                      setUnderlay((prev) => ({ ...prev, scale: Math.max(0.3, prev.scale - 0.1) }))
                    }
                    className="px-1 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold"
                    title="Zoom Out Reference"
                  >
                    -
                  </button>
                  <span className="text-[10px] font-mono text-slate-300 tabular-nums px-0.5">
                    {underlay.scale.toFixed(1)}x
                  </span>
                  <button
                    onClick={() =>
                      setUnderlay((prev) => ({ ...prev, scale: Math.min(2.5, prev.scale + 0.1) }))
                    }
                    className="px-1 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold"
                    title="Zoom In Reference"
                  >
                    +
                  </button>
                </div>

                {/* High Contrast B&W Toggle */}
                <button
                  onClick={() => setUnderlay((prev) => ({ ...prev, grayscale: !prev.grayscale }))}
                  className={`px-1.5 py-0.5 text-[10px] font-bold rounded transition-colors ${
                    underlay.grayscale
                      ? 'bg-indigo-700 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                  title="Toggle B&W High-Contrast Tracing Filter"
                >
                  B&W
                </button>

                {/* Open full settings */}
                <button
                  onClick={() => setShowUnderlayPanel((prev) => !prev)}
                  className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  title="Open Reference Inspector Panel"
                >
                  <Sliders className="w-3.5 h-3.5" />
                </button>

                {/* Clear Reference */}
                <button
                  onClick={() =>
                    setUnderlay({
                      src: null,
                      visible: true,
                      opacity: 0.45,
                      scale: 1.0,
                      offsetX: 0,
                      offsetY: 0,
                      grayscale: true,
                      invert: false,
                    })
                  }
                  className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                  title="Clear Reference Image"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Floating Eraser Mode Status on Canvas */}
            {drawingMode === 'eraser' && (
              <div
                className={`absolute bottom-2.5 right-2.5 z-20 flex items-center gap-1.5 backdrop-blur-xs text-white border rounded-lg py-1 px-2.5 text-[11px] shadow-lg select-none ${
                  eraserSubMode === 'segment'
                    ? 'bg-rose-900/90 border-rose-500/50'
                    : 'bg-amber-900/90 border-amber-500/50'
                }`}
              >
                <Eraser className="w-3.5 h-3.5 text-rose-300 animate-pulse" />
                <span className="font-semibold text-rose-100">
                  {eraserSubMode === 'segment' ? 'Segment Cut' : 'Whole Stroke'}: {eraserRadius}px
                </span>
                <span className="text-rose-300/80 text-[10px]">([ / ] to resize)</span>
              </div>
            )}

            {/* Beautify Notice Toast */}
            {beautifyNotice && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-slate-900/95 text-white border border-slate-700 px-3.5 py-1.5 rounded-full text-xs font-medium shadow-xl backdrop-blur-xs animate-in fade-in duration-200 pointer-events-none">
                <Wand2 className="w-3.5 h-3.5 text-amber-400" />
                <span>{beautifyNotice}</span>
              </div>
            )}

            {/* Drag & Drop Photo Overlay with dual targets */}
            {isDragOverCanvas && (
              <div className="absolute inset-0 z-30 bg-slate-900/85 backdrop-blur-xs rounded-xl flex flex-col p-4 text-white pointer-events-none select-none">
                <div className="text-center font-bold text-sm mb-2 text-slate-100">
                  Drop Image onto Canvas
                </div>
                <div className="flex-1 grid grid-rows-2 gap-2.5">
                  {/* Top Target: Tracing Underlay */}
                  <div
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                      canvasDropTarget === 'underlay'
                        ? 'bg-indigo-600/90 border-indigo-300 ring-4 ring-indigo-400/50 scale-[1.01]'
                        : 'bg-slate-800/80 border-slate-700 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <ImageIcon className="w-5 h-5 text-indigo-300" />
                      <span className="font-bold text-xs text-white">
                        Drop Here: Background Tracing Reference
                      </span>
                    </div>
                    <span className="text-[11px] text-indigo-100 text-center max-w-sm">
                      Import as underlay to trace over intricate characters, Kanji, or calligraphy sketches
                    </span>
                  </div>

                  {/* Bottom Target: Crop & Vectorize */}
                  <div
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                      canvasDropTarget === 'crop'
                        ? 'bg-emerald-600/90 border-emerald-300 ring-4 ring-emerald-400/50 scale-[1.01]'
                        : 'bg-slate-800/80 border-slate-700 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Camera className="w-5 h-5 text-emerald-300" />
                      <span className="font-bold text-xs text-white">
                        Drop Here: Auto-Crop & Vectorize
                      </span>
                    </div>
                    <span className="text-[11px] text-emerald-100 text-center max-w-sm">
                      Extract and vectorize letter '{currentChar}' directly into black ink paths
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Floating Tracing Guide Status Badge */}
            {tracingGuide.enabled && (
              <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1.5 bg-white/95 backdrop-blur-xs border border-sky-200/90 rounded-lg py-1 px-2.5 text-[11px] shadow-xs select-none">
                <Compass className="w-3.5 h-3.5 text-sky-600" />
                <span className="font-semibold text-sky-950 capitalize">
                  Guide: {tracingGuide.fontStyle.replace('-', ' ')}
                </span>
                <span className="text-slate-300">·</span>
                <span className="text-slate-600 capitalize">
                  {tracingGuide.renderMode.replace('ghost-', '')}
                </span>
                <span className="text-slate-300">·</span>
                <span className="font-mono text-slate-500">
                  {Math.round(tracingGuide.opacity * 100)}%
                </span>
              </div>
            )}

            {/* Floating Character Tilt Badge on Canvas */}
            {charRotation !== 0 && (
              <div className="absolute bottom-2.5 left-2.5 z-20 flex items-center gap-1.5 bg-white/95 backdrop-blur-xs border border-indigo-200/90 rounded-lg py-1 px-2.5 text-[11px] shadow-xs select-none">
                <RotateCw className="w-3.5 h-3.5 text-indigo-600" />
                <span className="font-semibold text-indigo-950 font-mono">
                  '{currentChar}' Tilt: {charRotation > 0 ? `+${charRotation}` : charRotation}°
                </span>
                <span className="text-slate-300">·</span>
                <span className="text-slate-500 font-mono text-[10px]">
                  Global: {slant}°
                </span>
                <button
                  onClick={() => handleRotationChange(0)}
                  className="ml-1 text-slate-400 hover:text-rose-600 font-bold"
                  title="Reset character tilt to 0°"
                >
                  ×
                </button>
              </div>
            )}

            {/* Floating Calligraphy Fountain Pen Nib Status Badge on Canvas */}
            {drawingMode === 'pen' && penSettings.tool === 'calligraphy' && (
              <div className="absolute bottom-2.5 right-2.5 z-20 flex items-center gap-1.5 bg-amber-950/90 backdrop-blur-md border border-amber-500/50 text-amber-100 rounded-lg py-1 px-2.5 text-[11px] shadow-lg select-none">
                <div
                  className="w-4 h-4 rounded-full bg-amber-800/80 border border-amber-400 flex items-center justify-center relative shrink-0"
                  title={`Calligraphy Chisel Nib at ${penSettings.angle ?? 45}°`}
                >
                  <div
                    className="w-2.5 h-[2px] bg-amber-200 rounded-full"
                    style={{ transform: `rotate(${-((penSettings.angle ?? 45))}deg)` }}
                  />
                </div>
                <span className="font-semibold text-amber-200">
                  Calligraphy: {penSettings.angle ?? 45}°
                </span>
                <span className="text-amber-400/60">·</span>
                <span className="text-[10px] text-amber-300 font-mono hidden sm:inline">
                  Directional Swell
                </span>
              </div>
            )}

            {/* Canvas Guideline Labels */}
            {showGuides && (
              <div className="absolute left-2 top-0 bottom-0 pointer-events-none flex flex-col py-2 text-[10px] font-mono text-slate-400 select-none">
                <span
                  style={{ top: `${(CANVAS_ASCENDER / CANVAS_SIZE) * 100}%`, transform: 'translateY(-50%)' }}
                  className="absolute text-blue-400/90 font-medium"
                >
                  Ascender
                </span>
                <div
                  style={{ top: `${(guideConfig.capHeight / CANVAS_SIZE) * 100}%`, transform: 'translateY(-50%)' }}
                  className="absolute pointer-events-auto flex items-center gap-1 group bg-white/80 backdrop-blur-2xs px-1 rounded border border-blue-200/60 shadow-2xs"
                >
                  <span className="font-semibold text-blue-600">Cap</span>
                  <span className="text-[9px] text-blue-500 font-mono hidden sm:inline">{guideConfig.capHeight}px</span>
                  <div className="opacity-0 group-hover:opacity-100 flex items-center transition-opacity ml-0.5">
                    <button
                      onClick={() => setGuideConfig((prev) => ({ ...prev, capHeight: Math.max(100, prev.capHeight - 5) }))}
                      className="px-0.5 text-blue-600 hover:text-blue-900 font-bold leading-none"
                      title="Nudge Cap Height Up (-5px)"
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => setGuideConfig((prev) => ({ ...prev, capHeight: Math.min(prev.baseline - 50, prev.capHeight + 5) }))}
                      className="px-0.5 text-blue-600 hover:text-blue-900 font-bold leading-none"
                      title="Nudge Cap Height Down (+5px)"
                    >
                      ▼
                    </button>
                  </div>
                </div>
                <span
                  style={{
                    top: `${(((guideConfig.baseline - (guideConfig.baseline - guideConfig.capHeight) * 0.62)) / CANVAS_SIZE) * 100}%`,
                    transform: 'translateY(-50%)',
                  }}
                  className="absolute text-amber-500/90 font-medium"
                >
                  x-Height
                </span>
                <div
                  style={{ top: `${(guideConfig.baseline / CANVAS_SIZE) * 100}%`, transform: 'translateY(-50%)' }}
                  className="absolute pointer-events-auto flex items-center gap-1 group bg-white/80 backdrop-blur-2xs px-1 rounded border border-rose-200/60 shadow-2xs"
                >
                  <span className="font-bold text-rose-600">Baseline</span>
                  <span className="text-[9px] text-rose-500 font-mono hidden sm:inline">{guideConfig.baseline}px</span>
                  <div className="opacity-0 group-hover:opacity-100 flex items-center transition-opacity ml-0.5">
                    <button
                      onClick={() => setGuideConfig((prev) => ({ ...prev, baseline: Math.max(prev.capHeight + 50, prev.baseline - 5) }))}
                      className="px-0.5 text-rose-600 hover:text-rose-900 font-bold leading-none"
                      title="Nudge Baseline Up (-5px)"
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => setGuideConfig((prev) => ({ ...prev, baseline: Math.min(760, prev.baseline + 5) }))}
                      className="px-0.5 text-rose-600 hover:text-rose-900 font-bold leading-none"
                      title="Nudge Baseline Down (+5px)"
                    >
                      ▼
                    </button>
                  </div>
                </div>
                <span
                  style={{ top: `${(CANVAS_DESCENDER / CANVAS_SIZE) * 100}%`, transform: 'translateY(-50%)' }}
                  className="absolute text-purple-400/90 font-medium"
                >
                  Descender
                </span>
              </div>
            )}
          </div>

          {/* Mobile Canvas Quick Action Dock (Visible on screens < lg) */}
          <div className="lg:hidden mt-2.5 w-full max-w-[min(calc(100vw-20px),620px)] bg-white border border-slate-200/90 rounded-xl p-1.5 shadow-sm flex items-center justify-between gap-1 select-none">
            <button
              onClick={goToPrev}
              disabled={currentIndex === 0}
              className="flex items-center justify-center p-2 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 text-slate-700 min-h-[40px] min-w-[40px]"
              title="Previous character"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              onClick={handleUndo}
              disabled={undoStack.length === 0 && currentStrokes.length === 0}
              className="flex-1 flex items-center justify-center gap-1 py-2 px-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 disabled:opacity-30 text-slate-700 text-xs font-semibold min-h-[40px]"
              title="Undo last stroke"
            >
              <Undo className="w-3.5 h-3.5" />
              <span>Undo</span>
              {undoStack.length > 0 && (
                <span className="text-[10px] font-mono text-slate-500 font-bold ml-0.5">
                  {undoStack.length}
                </span>
              )}
            </button>

            <button
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              className="flex-1 flex items-center justify-center gap-1 py-2 px-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 disabled:opacity-30 text-slate-700 text-xs font-semibold min-h-[40px]"
              title="Redo stroke"
            >
              <Redo className="w-3.5 h-3.5" />
              <span>Redo</span>
            </button>

            <button
              onClick={handleBeautifyCurrent}
              disabled={currentStrokes.length === 0}
              className="flex-1 flex items-center justify-center gap-1 py-2 px-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 disabled:opacity-30 text-amber-900 text-xs font-semibold min-h-[40px]"
              title="Smooth curves and reduce hand jitter"
            >
              <Wand2 className="w-3.5 h-3.5 text-amber-600" />
              <span>Smooth</span>
            </button>

            <button
              onClick={handleClear}
              disabled={currentStrokes.length === 0}
              className="flex items-center justify-center p-2 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 disabled:opacity-30 text-rose-600 min-h-[40px] min-w-[40px]"
              title="Clear ink"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <button
              onClick={goToNext}
              disabled={currentIndex === allChars.length - 1}
              className="flex items-center justify-center p-2 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 text-slate-700 min-h-[40px] min-w-[40px]"
              title="Next character"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Photo Upload & Helper Bar beneath canvas */}
          <div className="mt-3 flex items-center justify-center gap-3 text-xs text-slate-500 max-w-[620px] w-full px-2 flex-wrap">
            <span className="flex items-center gap-1.5 text-slate-600 font-medium">
              <Camera className="w-3.5 h-3.5 text-emerald-600" />
              <span>Have this letter on paper?</span>
            </span>
            <button
              onClick={() => studioFileInputRef.current?.click()}
              className="font-semibold text-emerald-700 hover:text-emerald-800 underline underline-offset-2 flex items-center gap-1"
            >
              <Upload className="w-3 h-3" />
              Upload Photo
            </button>
            <span className="text-slate-400">or paste (Ctrl+V)</span>
            {onOpenScanTab && (
              <>
                <span className="text-slate-300" aria-hidden="true">·</span>
                <button
                  onClick={onOpenScanTab}
                  className="text-slate-600 hover:text-slate-900 underline underline-offset-2 font-medium"
                >
                  Scan Full A–Z Sheet
                </button>
              </>
            )}
          </div>
        </div>

        {/* Bottom Inspector Bar (Desktop only) */}
        <div className="hidden lg:flex bg-white border-t border-slate-200 px-6 py-2.5 items-center justify-between text-xs text-slate-600 flex-wrap gap-4">
          <div className="flex items-center gap-5">
            {/* Guide toggles */}
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showGuides}
                  onChange={(e) => setShowGuides(e.target.checked)}
                  className="rounded border-slate-300 text-slate-900 focus:ring-0"
                />
                <span className="font-medium">Typographic Guides</span>
              </label>

              {showGuides && (
                <button
                  onClick={() => setShowGuideConfigPanel((prev) => !prev)}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border transition-all ${
                    showGuideConfigPanel
                      ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                      : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                  }`}
                  title="Configure horizontal Baseline, Cap-Height, and optical overshoots"
                >
                  <Sliders className="w-3 h-3" />
                  <span>Configure Guides ({guideConfig.baseline - guideConfig.capHeight}px Cap)</span>
                </button>
              )}
            </div>

            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showSlantGuides}
                onChange={(e) => setShowSlantGuides(e.target.checked)}
                className="rounded border-slate-300 text-slate-900 focus:ring-0"
              />
              <span>Slant Guides ({slant}°)</span>
            </label>

            {/* Stroke Width Visual Indicator Overlay Toggle */}
            <label className="flex items-center gap-1.5 cursor-pointer select-none text-indigo-700 font-medium">
              <input
                type="checkbox"
                checked={showWidthOverlay}
                onChange={(e) => setShowWidthOverlay(e.target.checked)}
                className="rounded border-indigo-300 text-indigo-600 focus:ring-0"
              />
              <span className="flex items-center gap-1">
                <Gauge className="w-3.5 h-3.5 text-indigo-500" />
                Width Variation
              </span>
            </label>

            {/* Ghost Template Tracing Guide Toggle & Quick Config */}
            <div className="flex items-center gap-1.5">
              <label className="flex items-center gap-1.5 cursor-pointer select-none text-sky-700 font-medium">
                <input
                  type="checkbox"
                  checked={tracingGuide.enabled}
                  onChange={(e) => {
                    setTracingGuide((prev) => ({ ...prev, enabled: e.target.checked }));
                    setBeautifyNotice(
                      e.target.checked
                        ? `Ghost Template ON: Tracing '${currentChar}' standard Latin guide [T]`
                        : 'Ghost Template OFF [T]'
                    );
                    setTimeout(() => setBeautifyNotice(null), 2000);
                  }}
                  className="rounded border-sky-300 text-sky-600 focus:ring-0"
                />
                <span className="flex items-center gap-1">
                  <Ghost className="w-3.5 h-3.5 text-sky-500" />
                  Ghost Template [T]
                </span>
              </label>

              {tracingGuide.enabled && (
                <button
                  onClick={() => setShowTracingGuidePanel((prev) => !prev)}
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold border transition-all ${
                    showTracingGuidePanel
                      ? 'bg-sky-600 text-white border-sky-600 shadow-2xs'
                      : 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100'
                  }`}
                  title="Configure Ghost Template Archetype & Opacity [Shift+T]"
                >
                  <Sliders className="w-3 h-3" />
                  <span>{Math.round(tracingGuide.opacity * 100)}%</span>
                </button>
              )}
            </div>

            {/* Bounding Box & Metric Centerlines Toggle */}
            <label className="flex items-center gap-1.5 cursor-pointer select-none text-emerald-700 font-medium">
              <input
                type="checkbox"
                checked={showBoundingBox}
                onChange={(e) => setShowBoundingBox(e.target.checked)}
                className="rounded border-emerald-300 text-emerald-600 focus:ring-0"
              />
              <span className="flex items-center gap-1">
                <Crosshair className="w-3.5 h-3.5 text-emerald-500" />
                Bounding Box
              </span>
            </label>

            {/* Pressure Heatmap / Penmanship Consistency Toggle */}
            <label className="flex items-center gap-1.5 cursor-pointer select-none text-amber-900 font-medium">
              <input
                type="checkbox"
                checked={showPressureHeatmap}
                onChange={(e) => {
                  setShowPressureHeatmap(e.target.checked);
                  if (e.target.checked) {
                    setBeautifyNotice(
                      'Pressure Heatmap Overlay ON: Visualizing stroke pressure data for penmanship consistency [M]'
                    );
                    setTimeout(() => setBeautifyNotice(null), 2500);
                  }
                }}
                className="rounded border-amber-300 text-amber-600 focus:ring-0"
              />
              <span className="flex items-center gap-1 bg-amber-50/90 px-2 py-0.5 rounded border border-amber-300 text-amber-900 font-semibold shadow-2xs">
                <Flame className="w-3.5 h-3.5 text-amber-600" />
                <span>Pressure Heatmap [M]</span>
                {currentStrokes.length > 0 && (
                  <span className="text-[10px] font-mono font-bold text-amber-700">
                    ({penmanshipMetrics.consistencyScore}% Consistency)
                  </span>
                )}
              </span>
            </label>

            {/* Symmetry Guide Mirroring Toggle */}
            <label className="flex items-center gap-1.5 cursor-pointer select-none text-indigo-700 font-medium">
              <input
                type="checkbox"
                checked={symmetryEnabled}
                onChange={(e) => {
                  setSymmetryEnabled(e.target.checked);
                  if (e.target.checked) {
                    setBeautifyNotice(
                      `Symmetry Guide ON: horizontal mirroring active at X=${effectiveSymmetryAxisX}px [S]`
                    );
                    setTimeout(() => setBeautifyNotice(null), 2500);
                  }
                }}
                className="rounded border-indigo-300 text-indigo-600 focus:ring-0"
              />
              <span className="flex items-center gap-1 bg-indigo-50/90 px-2 py-0.5 rounded border border-indigo-200 text-indigo-900 font-semibold shadow-2xs">
                <Split className="w-3.5 h-3.5 text-indigo-600" />
                <span>Symmetry Guide [S]</span>
                <span className="text-[10px] font-mono text-indigo-600/80">({effectiveSymmetryAxisX}px)</span>
              </span>
            </label>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            {/* Calligraphy Nib Angle Slider (when Calligraphy tool active) */}
            {penSettings.tool === 'calligraphy' && (
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-amber-50 border border-amber-200 shadow-2xs">
                <Feather className="w-3.5 h-3.5 text-amber-600" />
                <span className="text-amber-900 font-semibold font-mono">
                  Nib: {penSettings.angle ?? 45}°
                </span>
                <input
                  type="range"
                  min="0"
                  max="90"
                  step="5"
                  value={penSettings.angle ?? 45}
                  onChange={(e) =>
                    setPenSettings((prev) => ({ ...prev, angle: Number(e.target.value) }))
                  }
                  className="w-16 accent-amber-600 cursor-pointer"
                  title="Adjust Calligraphy fountain pen nib angle: 45° Italic, 30° Roman, 40° Gothic, 0° Flat"
                />
              </div>
            )}

            {/* Stroke Width Slider */}
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-mono">Stroke: {penSettings.baseWidth}px</span>
              <input
                type="range"
                min="8"
                max="28"
                value={penSettings.baseWidth}
                onChange={(e) =>
                  setPenSettings((prev) => ({ ...prev, baseWidth: Number(e.target.value) }))
                }
                className="w-20 accent-slate-900"
              />
            </div>

            {/* Real-time Stroke Smoothing Stabilizer Slider */}
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-mono">
                Stabilizer: {Math.round((penSettings.smoothing ?? 0.5) * 100)}%
              </span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={penSettings.smoothing ?? 0.5}
                onChange={(e) =>
                  setPenSettings((prev) => ({ ...prev, smoothing: parseFloat(e.target.value) }))
                }
                className="w-20 accent-indigo-600"
                title="Adjust real-time stroke smoothing: 0% raw authentic jitter to 100% stabilized paths"
              />
            </div>

            {/* Slant Slider (Global) */}
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-mono">Slant: {slant}°</span>
              <input
                type="range"
                min="-15"
                max="30"
                value={slant}
                onChange={(e) => setSlant(Number(e.target.value))}
                className="w-20 accent-slate-900"
                title={`Global font slant applied to guidelines and character templates`}
              />
            </div>

            {/* Character-Specific Rotation Slider */}
            <div className="flex items-center gap-2 bg-indigo-50/70 border border-indigo-200/80 px-2.5 py-1 rounded-lg">
              <RotateCw className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <div className="flex items-center gap-1 text-slate-700">
                <span className="font-medium">'{currentChar}' Tilt:</span>
                <span className="font-mono font-semibold text-indigo-700 tabular-nums">
                  {charRotation > 0 ? `+${charRotation}` : charRotation}°
                </span>
              </div>
              <input
                type="range"
                min="-30"
                max="30"
                step="1"
                value={charRotation}
                onChange={(e) => handleRotationChange(Number(e.target.value))}
                className="w-24 accent-indigo-600"
                title={`Fine-tune the tilt of '${currentChar}' independently of the global ${slant}° slant [ [ / ] ]`}
              />
              {charRotation !== 0 && (
                <button
                  onClick={() => handleRotationChange(0)}
                  className="text-[10px] text-slate-400 hover:text-indigo-700 underline font-medium ml-0.5"
                  title="Reset character tilt to 0°"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Right Column: Glyph Metrics & Live Preview */}
      <aside
        className={`w-full lg:w-80 bg-white border-t lg:border-t-0 lg:border-l border-slate-200 flex-col shrink-0 p-4 sm:p-5 overflow-y-auto space-y-6 transition-all ${
          isFocusMode
            ? 'hidden'
            : mobileStudioTab === 'inspector'
            ? 'flex flex-1 min-h-0'
            : 'hidden lg:flex'
        }`}
      >
        <div>
          <h3 className="text-xs font-semibold text-slate-900 tracking-wider uppercase font-mono mb-3">
            Character Preview
          </h3>

          {/* SVG Vector Render */}
          <div className="aspect-square bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center p-4 relative overflow-hidden">
            {currentStrokes.length > 0 ? (
              <svg viewBox="0 0 800 800" className="w-full h-full">
                <path
                  d={strokesToContourSvgPath(
                    charRotation !== 0
                      ? rotateGlyphStrokes(currentStrokes, charRotation, pivotX, pivotY)
                      : currentStrokes,
                    penSettings.baseWidth,
                    penSettings.tool,
                    penSettings.pressureSensitivity
                  )}
                  fill="#0f172a"
                />
              </svg>
            ) : (
              <div className="text-center text-slate-400 text-xs">
                <p>No ink drawn yet</p>
                <p className="text-[11px] mt-1 text-slate-400">Draw inside the canvas to vectorize</p>
              </div>
            )}

            <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-400 bg-white/80 border border-slate-200">
              {currentStrokes.length} stroke{currentStrokes.length === 1 ? '' : 's'}
            </div>
          </div>

          <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-emerald-600" />
                <span>Import from Photo</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400">OCR Vectorizer</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-tight">
              Isolate handwritten '{currentChar}' from a paper snapshot or phone photo.
            </p>
            <div className="flex items-center gap-2 pt-0.5">
              <button
                onClick={() => studioFileInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors shadow-2xs"
              >
                <Upload className="w-3.5 h-3.5 text-emerald-400" />
                <span>Upload Photo</span>
              </button>
              {onOpenScanTab && (
                <button
                  onClick={onOpenScanTab}
                  className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium transition-colors"
                  title="Switch to full page scanning"
                >
                  Full Sheet
                </button>
              )}
            </div>
          </div>

          {/* Background Reference Image Tracing Card */}
          <div className="mt-3 p-3 bg-gradient-to-br from-indigo-50/70 to-slate-50 border border-indigo-200/80 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-indigo-950 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                <span>Reference Tracing</span>
              </span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                  underlay.src && underlay.visible
                    ? 'bg-emerald-100 text-emerald-800'
                    : underlay.src
                    ? 'bg-slate-200 text-slate-700'
                    : 'bg-indigo-100 text-indigo-800'
                }`}
              >
                {underlay.src && underlay.visible
                  ? 'Active'
                  : underlay.src
                  ? 'Hidden'
                  : 'Empty'}
              </span>
            </div>

            <p className="text-[11px] text-slate-600 leading-tight">
              Import a sketch, photo, or calligraphy sample as a background underlay to trace complex character shapes.
            </p>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => underlayInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-2xs"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{underlay.src ? 'Replace Image' : 'Import Reference'}</span>
              </button>
              {underlay.src && (
                <button
                  onClick={() => setShowUnderlayPanel((prev) => !prev)}
                  className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold transition-colors"
                  title="Adjust underlay opacity, scale, and positioning"
                >
                  <Sliders className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Sample Presets for Complex Characters */}
            <div className="pt-1 border-t border-indigo-100">
              <div className="text-[10px] text-slate-500 font-semibold mb-1 uppercase tracking-wider font-mono">
                Sample Guides:
              </div>
              <div className="grid grid-cols-2 gap-1 text-[11px]">
                <button
                  onClick={() => handleLoadSampleUnderlay('italic')}
                  className="px-2 py-1 bg-white hover:bg-indigo-50 border border-indigo-200/70 rounded text-slate-700 font-medium transition-colors text-left truncate"
                  title="Load Italic Calligraphy standard"
                >
                  Italic '{currentChar}'
                </button>
                <button
                  onClick={() => handleLoadSampleUnderlay('blackletter')}
                  className="px-2 py-1 bg-white hover:bg-indigo-50 border border-indigo-200/70 rounded text-slate-700 font-medium transition-colors text-left truncate"
                  title="Load Gothic Blackletter shape"
                >
                  Gothic
                </button>
                <button
                  onClick={() => handleLoadSampleUnderlay('kanji')}
                  className="px-2 py-1 bg-white hover:bg-indigo-50 border border-indigo-200/70 rounded text-slate-700 font-medium transition-colors text-left truncate"
                  title="Load Complex Multi-Stroke Kanji (繁)"
                >
                  Kanji (繁)
                </button>
                <button
                  onClick={() => handleLoadSampleUnderlay('flourished')}
                  className="px-2 py-1 bg-white hover:bg-indigo-50 border border-indigo-200/70 rounded text-slate-700 font-medium transition-colors text-left truncate"
                  title="Load Ornate Flourished swashes"
                >
                  Flourish
                </button>
              </div>
            </div>
          </div>

          {/* Automated Contextual Alternates Quick Launcher */}
          <div className="mt-3 p-3 bg-gradient-to-br from-indigo-50/80 to-purple-50/60 border border-indigo-200/80 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-indigo-950 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Contextual Alternates</span>
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 font-bold">
                {variantsList.length} variant{variantsList.length === 1 ? '' : 's'}
              </span>
            </div>
            <p className="text-[11px] text-indigo-900/80 leading-tight">
              Auto-generate humanized variations to eliminate robotic repeating letters in long text.
            </p>
            <button
              onClick={() => setIsContextualModalOpen(true)}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Generate Alternates</span>
            </button>
          </div>
        </div>

        {/* Character Tilt & Rotation Card (Independent of Global Slant) */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
              <RotateCw className="w-3.5 h-3.5 text-indigo-600" />
              <span>'{currentChar}' Tilt & Rotation</span>
            </span>
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold ${
              charRotation !== 0 ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-200/70 text-slate-600'
            }`}>
              {charRotation > 0 ? `+${charRotation}` : charRotation}°
            </span>
          </div>

          <p className="text-[11px] text-slate-500 leading-tight">
            Fine-tune tilt for '{currentChar}' independently of the global {slant}° font slant.
          </p>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-slate-600">
              <span className="font-medium">Rotation Slider</span>
              <span className="font-mono text-slate-500">
                Net lean: <strong className="text-slate-800 font-semibold">{slant + charRotation}°</strong>
              </span>
            </div>
            <input
              type="range"
              min="-30"
              max="30"
              step="1"
              value={charRotation}
              onChange={(e) => handleRotationChange(Number(e.target.value))}
              className="w-full accent-indigo-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>-30° (Left)</span>
              <span>0° (Upright)</span>
              <span>+30° (Right)</span>
            </div>
          </div>

          {/* Quick Tilt Presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {[-15, -8, 0, 8, 15, 22].map((deg) => (
              <button
                key={deg}
                onClick={() => handleRotationChange(deg)}
                className={`px-2 py-0.5 text-[10px] font-mono rounded border transition-colors ${
                  charRotation === deg
                    ? 'bg-indigo-600 border-indigo-600 text-white font-semibold'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {deg > 0 ? `+${deg}` : deg}°
              </button>
            ))}
          </div>

          {/* Actions: Bake Rotation into points / Reset */}
          <div className="flex items-center gap-2 pt-1 border-t border-slate-200/80">
            <button
              onClick={handleBakeRotation}
              disabled={charRotation === 0 || currentStrokes.length === 0}
              className="flex-1 py-1.5 px-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 disabled:opacity-40 rounded-lg text-xs font-medium transition-colors"
              title="Permanently bake this angle into the stroke coordinate points and reset rotation to 0°"
            >
              Bake into Strokes
            </button>
            {charRotation !== 0 && (
              <button
                onClick={() => handleRotationChange(0)}
                className="py-1.5 px-2.5 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg text-xs font-medium transition-colors"
                title="Reset character tilt back to 0°"
              >
                Reset
              </button>
            )}
          </div>

          {/* Mirror / Flip Actions */}
          <div className="flex items-center gap-2 pt-1 border-t border-slate-200/80">
            <button
              onClick={handleMirrorHorizontal}
              disabled={currentStrokes.length === 0}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 disabled:opacity-40 rounded-lg text-xs font-medium transition-colors"
              title="Mirror character horizontally Left ↔ Right [H]"
            >
              <FlipHorizontal className="w-3.5 h-3.5 text-indigo-600" />
              <span>Mirror Horizontal</span>
            </button>
            <button
              onClick={handleMirrorVertical}
              disabled={currentStrokes.length === 0}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 disabled:opacity-40 rounded-lg text-xs font-medium transition-colors"
              title="Mirror character vertically Top ↕ Bottom [V]"
            >
              <FlipVertical className="w-3.5 h-3.5 text-indigo-600" />
              <span>Mirror Vertical</span>
            </button>
          </div>

          {/* Centering within Metric Boundaries */}
          <div className="pt-2 border-t border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-600">
              <span className="font-semibold flex items-center gap-1.5 text-slate-800">
                <AlignCenter className="w-3.5 h-3.5 text-indigo-600" />
                <span>Center within Metrics</span>
              </span>
              {currentBBox && (
                <span
                  className="font-mono text-[10px] text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200"
                  title="Current stroke bounding box dimensions (Width × Height)"
                >
                  {Math.round(currentBBox.width)}×{Math.round(currentBBox.height)}px
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => handleCenterGlyph('ascender-descender')}
                disabled={currentStrokes.length === 0}
                className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-800 disabled:opacity-40 rounded-lg text-xs font-semibold transition-colors"
                title="Shift strokes to center horizontally & vertically between Ascender and Descender [C]"
              >
                <AlignCenter className="w-3.5 h-3.5 text-indigo-600" />
                <span>Center Full [C]</span>
              </button>
              <button
                onClick={() => handleCenterGlyph('ascender-baseline')}
                disabled={currentStrokes.length === 0}
                className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 disabled:opacity-40 rounded-lg text-xs font-medium transition-colors"
                title="Shift strokes to center horizontally and vertically between Ascender and Baseline"
              >
                <Crosshair className="w-3.5 h-3.5 text-slate-500" />
                <span>Body Center</span>
              </button>
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
              <label className="flex items-center gap-1.5 cursor-pointer select-none hover:text-slate-800">
                <input
                  type="checkbox"
                  checked={showBoundingBox}
                  onChange={(e) => setShowBoundingBox(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-0 w-3 h-3"
                />
                <span>Overlay BBox & Guides</span>
              </label>
              {currentBBox && (
                <span className="font-mono text-slate-400">
                  Ctr: ({Math.round(currentBBox.centerX)}, {Math.round(currentBBox.centerY)})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tracing Guide & Standard Form Overlay Inspector */}
        <TracingGuideInspector
          currentChar={currentChar}
          strokes={currentStrokes}
          baseWidth={penSettings.baseWidth}
          slant={slant}
          settings={tracingGuide}
          setSettings={setTracingGuide}
        />

        {/* Stroke Width & Pressure Dynamics Visualizer */}
        <StrokeWidthInspector
          currentChar={currentChar}
          glyph={currentGlyph}
          penSettings={penSettings}
          setPenSettings={setPenSettings}
          onUpdateStrokes={(strokes) => {
            setUndoStack((prev) => [...prev.slice(-49), cloneGlyphStrokes(currentStrokes)]);
            setRedoStack([]);
            updateActiveStrokes(strokes);
          }}
          showOverlay={showWidthOverlay}
          setShowOverlay={setShowWidthOverlay}
          showCalipers={showWidthCalipers}
          setShowCalipers={setShowWidthCalipers}
          showMinMaxBadges={showMinMaxBadges}
          setShowMinMaxBadges={setShowMinMaxBadges}
          hoveredT={hoveredWaveformT}
          setHoveredT={setHoveredWaveformT}
        />

        {/* Advance Width (Letter Spacing) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-slate-700">Advance Width</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const { advanceWidth } = calculateGlyphBearing(
                    currentGlyph,
                    penSettings.baseWidth,
                    'balanced'
                  );
                  onUpdateGlyph(currentChar, currentStrokes, advanceWidth);
                }}
                className="flex items-center gap-1 text-[11px] font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded transition-colors"
                title="Automatically calculate optical advance width and side bearings from stroke bounds"
              >
                <Zap className="w-3 h-3 text-amber-500" />
                <span>Auto-Space</span>
              </button>
              <span className="font-mono tabular-nums text-slate-500">
                {currentGlyph.advanceWidth}u
              </span>
            </div>
          </div>
          <input
            type="range"
            min="300"
            max="950"
            step="10"
            value={currentGlyph.advanceWidth || 600}
            onChange={(e) => {
              onUpdateGlyph(currentChar, currentStrokes, Number(e.target.value));
            }}
            className="w-full accent-slate-900"
          />
          <div className="flex justify-between text-[10px] text-slate-400 font-mono">
            <span>Tight (300)</span>
            <span>Balanced (600)</span>
            <span>Wide (950)</span>
          </div>
        </div>

        {/* Word Test in Context */}
        <div className="space-y-2 border-t border-slate-200 pt-4">
          <span className="text-xs font-medium text-slate-700">Sample In-Context</span>
          <div className="p-3 bg-amber-50/50 border border-amber-200/60 rounded-lg text-slate-800 text-lg font-['Caveat',sans-serif]">
            <p>Handwriting with {currentChar}</p>
            <p className="text-sm text-slate-500 mt-1">The quick brown fox jumps.</p>
          </div>
        </div>

        {/* AI Penmanship Guidance Button */}
        {onOpenAiTips && (
          <button
            onClick={() => onOpenAiTips(currentChar)}
            className="flex items-center justify-center gap-2 w-full py-2.5 px-3 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 transition-colors shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>AI Advice for '{currentChar}'</span>
          </button>
        )}
      </aside>

      {/* Single Character Crop & Isolation Modal */}
      <SingleCharCropModal
        isOpen={isCropModalOpen}
        onClose={() => {
          setIsCropModalOpen(false);
          setPastedImageSrc(null);
        }}
        currentChar={currentChar}
        initialImageSrc={pastedImageSrc}
        onApplyStrokes={(strokes) => {
          setUndoStack((prev) => [...prev.slice(-49), cloneGlyphStrokes(currentStrokes)]);
          setRedoStack([]);
          updateActiveStrokes(strokes);
        }}
      />

      {/* Contextual Alternates Generator Modal */}
      <ContextualAlternatesModal
        isOpen={isContextualModalOpen}
        onClose={() => setIsContextualModalOpen(false)}
        currentChar={currentChar}
        glyphs={glyphs}
        onApplyVariants={handleApplyContextualVariants}
        baseWidth={penSettings.baseWidth}
        tool={penSettings.tool}
        pressureSensitivity={penSettings.pressureSensitivity}
        fontFamilyName="MyHandwriting"
      />

      {/* Copy Glyph & Anatomical Base Shapes Modal */}
      <CopyGlyphModal
        isOpen={isCopyGlyphModalOpen}
        onClose={() => setIsCopyGlyphModalOpen(false)}
        currentChar={currentChar}
        currentStrokes={currentStrokes}
        currentAdvanceWidth={currentGlyph.advanceWidth || 600}
        glyphs={glyphs}
        onApplyCopy={handleApplyCopyStrokes}
        onBatchCopyToChars={handleBatchCopyToChars}
        onSwitchChar={onSelectChar}
        clipboardStrokes={glyphClipboard}
        onSetClipboardStrokes={setGlyphClipboard}
      />
    </div>
  );
};
