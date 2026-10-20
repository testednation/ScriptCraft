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
} from 'lucide-react';
import { GlyphData, GlyphStroke, GlyphVariant, PenSettings, PenToolType } from '../types/font';
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
import { beautifyGlyphStrokes, batchBeautifyAllGlyphs } from '../utils/strokeSmoothing';
import { SingleCharCropModal } from './SingleCharCropModal';
import { StrokeWidthInspector } from './StrokeWidthInspector';
import { TracingGuideInspector } from './TracingGuideInspector';
import { UnderlayInspector, UnderlayState } from './UnderlayInspector';
import { GhostPathInspector, GhostPathSettings } from './GhostPathInspector';
import { ContextualAlternatesModal } from './ContextualAlternatesModal';
import {
  renderCanvasVariableStrokes,
  drawStrokeWidthVisualIndicator,
  strokesToContourSvgPath,
} from '../utils/strokeWidthDynamics';
import {
  TracingGuideSettings,
  DEFAULT_TRACING_SETTINGS,
  drawTracingGuideOverlay,
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
    rotation?: number
  ) => void;
  onUpdateAllGlyphs?: (glyphs: Record<string, GlyphData>) => void;
  penSettings: PenSettings;
  setPenSettings: React.Dispatch<React.SetStateAction<PenSettings>>;
  slant: number;
  setSlant: (slant: number) => void;
  onOpenAiTips?: (char: string) => void;
  onOpenScanTab?: () => void;
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
  const [activeGroup, setActiveGroup] = useState<string>('Uppercase');
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [pastedImageSrc, setPastedImageSrc] = useState<string | null>(null);
  const [isDragOverCanvas, setIsDragOverCanvas] = useState(false);

  // Underlay file upload handler
  const handleUnderlayFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setUnderlay((prev) => ({ ...prev, src: dataUrl, visible: true }));
      setShowUnderlayPanel(true);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Generate an instant calligraphic reference letter for the current character
  const handleLoadSampleUnderlay = () => {
    const offscreen = document.createElement('canvas');
    offscreen.width = 800;
    offscreen.height = 800;
    const offCtx = offscreen.getContext('2d');
    if (offCtx) {
      offCtx.fillStyle = '#ffffff';
      offCtx.fillRect(0, 0, 800, 800);
      offCtx.fillStyle = '#1e293b';
      offCtx.font = 'italic 520px "Georgia", "Times New Roman", serif';
      offCtx.textAlign = 'center';
      offCtx.textBaseline = 'alphabetic';
      offCtx.fillText(currentChar, 400, CANVAS_BASELINE);
      const dataUrl = offscreen.toDataURL('image/png');
      setUnderlay({
        src: dataUrl,
        visible: true,
        opacity: 0.35,
        scale: 1.0,
        offsetX: 0,
        offsetY: 0,
        grayscale: true,
      });
      setShowUnderlayPanel(true);
    }
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
        setPastedImageSrc(dataUrl);
        setIsCropModalOpen(true);
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

  // Compute character horizontal bounding box center and baseline pivot point
  const { pivotX, pivotY } = useMemo(() => {
    const px =
      currentBBox !== null
        ? currentBBox.centerX
        : CANVAS_ORIGIN_X + (currentGlyph.advanceWidth || 600) * 0.36;
    return { pivotX: px, pivotY: CANVAS_BASELINE };
  }, [currentBBox, currentGlyph.advanceWidth]);

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

    // Underlay reference image for direct manual tracing
    if (underlay.src && underlay.visible && underlayImgRef.current) {
      const img = underlayImgRef.current;
      if (img.complete && img.naturalWidth > 0) {
        ctx.save();
        ctx.globalAlpha = Math.max(0.05, Math.min(1.0, underlay.opacity));
        if (underlay.grayscale) {
          ctx.filter = 'grayscale(100%) contrast(140%)';
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

      for (let x = -CANVAS_SIZE; x < CANVAS_SIZE * 2; x += 120) {
        ctx.beginPath();
        const topX = x + (CANVAS_BASELINE - 0) * tanSlant;
        const botX = x + (CANVAS_BASELINE - CANVAS_SIZE) * tanSlant;
        ctx.moveTo(topX, 0);
        ctx.lineTo(botX, CANVAS_SIZE);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }

    // Typographic guidelines
    if (showGuides) {
      // Ascender line
      ctx.strokeStyle = '#93c5fd'; // Soft blue
      ctx.lineWidth = 1.2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(40, CANVAS_ASCENDER);
      ctx.lineTo(CANVAS_SIZE - 40, CANVAS_ASCENDER);
      ctx.stroke();

      // Cap Height line
      ctx.strokeStyle = '#60a5fa'; // Blue
      ctx.beginPath();
      ctx.moveTo(40, CANVAS_CAP_HEIGHT);
      ctx.lineTo(CANVAS_SIZE - 40, CANVAS_CAP_HEIGHT);
      ctx.stroke();

      // X-Height line
      ctx.strokeStyle = '#f59e0b'; // Amber
      ctx.beginPath();
      ctx.moveTo(40, CANVAS_X_HEIGHT);
      ctx.lineTo(CANVAS_SIZE - 40, CANVAS_X_HEIGHT);
      ctx.stroke();

      // Baseline (solid grounded line)
      ctx.strokeStyle = '#ef4444'; // Red baseline
      ctx.lineWidth = 1.8;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(40, CANVAS_BASELINE);
      ctx.lineTo(CANVAS_SIZE - 40, CANVAS_BASELINE);
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
        penSettings.pressureSensitivity
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
        ghostPath.color
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
      penSettings.pressureSensitivity
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
        }
      );
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
    tracingGuide,
    underlay.src,
    underlay.visible,
    underlay.opacity,
    underlay.scale,
    underlay.offsetX,
    underlay.offsetY,
    underlay.grayscale,
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
    // Entry taper
    if (penSettings.pressureSensitivity && e.pointerType !== 'pen') {
      pt.pressure = 0.65;
    }
    // Save deep-cloned state to undo stack before stroke begins
    setUndoStack((prev) => [...prev.slice(-49), cloneGlyphStrokes(currentStrokes)]);
    setRedoStack([]);
    const newStrokes = [...currentStrokes, [pt]];
    updateActiveStrokes(newStrokes);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const pt = getCanvasPoint(e);
    const strokes = [...currentStrokes];
    if (strokes.length === 0) return;

    const activeStroke = [...strokes[strokes.length - 1]];
    const lastPt = activeStroke[activeStroke.length - 1];

    // Minimal distance filter to avoid jitter
    if (lastPt && Math.hypot(pt.x - lastPt.x, pt.y - lastPt.y) < 3) return;

    // For mouse/trackpad drawing with pressure sensitivity on: dynamic speed & downstroke response
    if (e.pointerType !== 'pen' && penSettings.pressureSensitivity && lastPt) {
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

    activeStroke.push(pt);
    strokes[strokes.length - 1] = activeStroke;
    updateActiveStrokes(strokes);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore if pointer capture release throws
    }
  };

  // Delete the most recent stroke with full undo tracking
  const handleDeleteLastStroke = useCallback(() => {
    if (currentStrokes.length === 0) return;
    setUndoStack((prev) => [...prev.slice(-49), cloneGlyphStrokes(currentStrokes)]);
    setRedoStack([]);
    const updated = currentStrokes.slice(0, -1);
    updateActiveStrokes(updated);
    setBeautifyNotice(`Deleted stroke (${updated.length} left). Revert with Undo [Ctrl+Z].`);
    setTimeout(() => setBeautifyNotice(null), 2500);
  }, [currentStrokes, updateActiveStrokes]);

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
    }
  }, [undoStack, currentStrokes, updateActiveStrokes]);

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
    }
  }, [redoStack, currentStrokes, updateActiveStrokes]);

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

      if (e.key === 'ArrowLeft') {
        goToPrev();
      } else if (e.key === 'ArrowRight') {
        goToNext();
      } else if (e.key === 't' || e.key === 'T') {
        // Toggle tracing guide overlay
        e.preventDefault();
        setTracingGuide((prev) => ({ ...prev, enabled: !prev.enabled }));
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
        // Tilt character left (decrease rotation)
        e.preventDefault();
        handleRotationChange(Math.max(-30, charRotation - 1));
      } else if (e.key === ']' || e.key === '}') {
        // Tilt character right (increase rotation)
        e.preventDefault();
        handleRotationChange(Math.min(30, charRotation + 1));
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
    handleDeleteLastStroke,
    currentStrokes.length,
    underlay.src,
    handleBeautifyCurrent,
    handleMirrorHorizontal,
    handleMirrorVertical,
    handleCenterGlyph,
    allChars,
    onSelectChar,
    charRotation,
    handleRotationChange,
    isFocusMode,
  ]);

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-61px)] bg-slate-50 overflow-hidden">
      {/* Left Column: Character Matrix Navigator */}
      <aside
        className={`w-full lg:w-72 bg-white border-b lg:border-b-0 lg:border-r border-slate-200 flex-col shrink-0 transition-all ${
          isFocusMode ? 'hidden' : 'flex'
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
                onClick={() => onSelectChar(char)}
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
            <span>Keyboard Shortcuts</span>
            <span className="text-[10px] text-slate-500 font-mono">← / →</span>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-500">
            Use <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono">←</kbd>/<kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono">→</kbd> cycle letters. <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono">C</kbd> center glyph. <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono">Ctrl+Z</kbd> undo.
          </p>
        </div>
      </aside>

      {/* Center: Tactile Drawing Canvas */}
      <main className="flex-1 flex flex-col overflow-hidden bg-slate-100">
        {/* Workspace Toolbar */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-white border-b border-slate-200 gap-4 flex-wrap">
          {/* Active Letter & Navigation */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <button
                onClick={goToPrev}
                disabled={currentIndex === 0}
                className="p-1.5 rounded-md hover:bg-slate-100 disabled:opacity-30 text-slate-700 transition-colors"
                title="Previous character (Left Arrow)"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-slate-900 text-white font-bold text-xl shadow-inner font-['Plus_Jakarta_Sans']">
                {currentChar}
              </div>
              <button
                onClick={goToNext}
                disabled={currentIndex === allChars.length - 1}
                className="p-1.5 rounded-md hover:bg-slate-100 disabled:opacity-30 text-slate-700 transition-colors"
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

          {/* Pen Tool Segmented Control */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {(
              [
                { id: 'fountain', label: 'Fountain Pen' },
                { id: 'rollerball', label: 'Gel Pen' },
                { id: 'drafting', label: 'Drafting 0.5' },
                { id: 'calligraphy', label: 'Broad Nib' },
              ] as const
            ).map((tool) => (
              <button
                key={tool.id}
                onClick={() => setPenSettings((prev) => ({ ...prev, tool: tool.id }))}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                  penSettings.tool === tool.id
                    ? 'bg-white text-slate-900 shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tool.label}
              </button>
            ))}
          </div>

          {/* Pressure Sensitivity & Width Indicators Quick Controls */}
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

            <button
              onClick={() => setTracingGuide((prev) => ({ ...prev, enabled: !prev.enabled }))}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                tracingGuide.enabled
                  ? 'bg-sky-50 border border-sky-300 text-sky-800 shadow-2xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
              title="Toggle ghosted standard form Tracing Guide for character proportions [T]"
            >
              <Compass className="w-3.5 h-3.5 text-sky-600" />
              <span>Tracing Guide {tracingGuide.enabled ? 'ON' : 'OFF'}</span>
            </button>

            {/* Tracing Underlay Reference Image Button */}
            {!underlay.src ? (
              <button
                onClick={() => setShowUnderlayPanel((prev) => !prev)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  showUnderlayPanel
                    ? 'bg-indigo-50 border border-indigo-300 text-indigo-900 shadow-2xs font-semibold'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
                title="Add or configure an underlay reference image to trace over [U]"
              >
                <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                <span>Trace Underlay</span>
              </button>
            ) : (
              <div className="flex items-center rounded-lg border border-indigo-200 overflow-hidden shadow-2xs">
                <button
                  onClick={() => setUnderlay((prev) => ({ ...prev, visible: !prev.visible }))}
                  className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    underlay.visible
                      ? 'bg-indigo-600 text-white font-semibold'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                  title="Toggle Underlay Image on/off [U]"
                >
                  {underlay.visible ? (
                    <Eye className="w-3.5 h-3.5" />
                  ) : (
                    <EyeOff className="w-3.5 h-3.5" />
                  )}
                  <span>Underlay {underlay.visible ? 'ON' : 'OFF'}</span>
                </button>
                <button
                  onClick={() => setShowUnderlayPanel((prev) => !prev)}
                  className={`px-1.5 py-1.5 text-xs transition-colors border-l border-indigo-200 ${
                    showUnderlayPanel
                      ? 'bg-indigo-700 text-white'
                      : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                  }`}
                  title="Adjust Underlay Settings (scale, opacity, offset, high contrast)"
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
        <div className="flex-1 flex flex-col items-center justify-center p-4 lg:p-6 overflow-hidden relative">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOverCanvas(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setIsDragOverCanvas(false);
            }}
            onDrop={handleCanvasDrop}
            className={`relative shadow-2xl rounded-xl overflow-hidden border ${
              isDragOverCanvas ? 'border-emerald-500 ring-4 ring-emerald-200' : 'border-slate-300'
            } bg-white max-w-[620px] max-h-[620px] w-full aspect-square touch-none transition-all`}
          >
            <canvas
              ref={canvasRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              className="w-full h-full cursor-crosshair block"
              style={{ touchAction: 'none' }}
            />

            {/* Beautify Notice Toast */}
            {beautifyNotice && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-slate-900/95 text-white border border-slate-700 px-3.5 py-1.5 rounded-full text-xs font-medium shadow-xl backdrop-blur-xs animate-in fade-in duration-200 pointer-events-none">
                <Wand2 className="w-3.5 h-3.5 text-amber-400" />
                <span>{beautifyNotice}</span>
              </div>
            )}

            {/* Drag & Drop Photo Overlay */}
            {isDragOverCanvas && (
              <div className="absolute inset-0 z-30 bg-emerald-50/95 border-2 border-dashed border-emerald-500 rounded-xl flex flex-col items-center justify-center p-6 text-center backdrop-blur-2xs pointer-events-none">
                <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mb-3 text-emerald-600 shadow-sm">
                  <Upload className="w-7 h-7" />
                </div>
                <p className="text-base font-bold text-emerald-950 font-['Plus_Jakarta_Sans']">
                  Drop Photo Here
                </p>
                <p className="text-xs text-emerald-700 mt-1 max-w-xs">
                  We'll open the character crop tool so you can trace '{currentChar}' into vector ink
                </p>
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

            {/* Canvas Guideline Labels */}
            {showGuides && (
              <div className="absolute left-2.5 top-0 bottom-0 pointer-events-none flex flex-col justify-between py-2 text-[10px] font-mono text-slate-400 select-none">
                <span style={{ top: '20%' }} className="absolute">
                  Ascender
                </span>
                <span style={{ top: '30%' }} className="absolute">
                  Cap
                </span>
                <span style={{ top: '50%' }} className="absolute">
                  x-Height
                </span>
                <span style={{ top: '75%' }} className="absolute text-rose-500 font-semibold">
                  Baseline
                </span>
                <span style={{ top: '95%' }} className="absolute">
                  Descender
                </span>
              </div>
            )}
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

        {/* Bottom Inspector Bar */}
        <div className="bg-white border-t border-slate-200 px-6 py-2.5 flex items-center justify-between text-xs text-slate-600 flex-wrap gap-4">
          <div className="flex items-center gap-5">
            {/* Guide toggles */}
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showGuides}
                onChange={(e) => setShowGuides(e.target.checked)}
                className="rounded border-slate-300 text-slate-900 focus:ring-0"
              />
              <span>Typographic Guides</span>
            </label>

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
                Width Variation Indicators
              </span>
            </label>

            {/* Tracing Guide Overlay Toggle */}
            <label className="flex items-center gap-1.5 cursor-pointer select-none text-sky-700 font-medium">
              <input
                type="checkbox"
                checked={tracingGuide.enabled}
                onChange={(e) => setTracingGuide((prev) => ({ ...prev, enabled: e.target.checked }))}
                className="rounded border-sky-300 text-sky-600 focus:ring-0"
              />
              <span className="flex items-center gap-1">
                <Compass className="w-3.5 h-3.5 text-sky-500" />
                Tracing Guide
              </span>
            </label>

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
                Bounding Box & Center
              </span>
            </label>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
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
        className={`w-full lg:w-80 bg-white border-t lg:border-t-0 lg:border-l border-slate-200 flex-col shrink-0 p-5 overflow-y-auto space-y-6 transition-all ${
          isFocusMode ? 'hidden' : 'flex'
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
    </div>
  );
};
