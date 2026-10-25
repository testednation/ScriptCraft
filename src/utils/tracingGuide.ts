import { GlyphStroke } from '../types/font';
import {
  CANVAS_ASCENDER,
  CANVAS_BASELINE,
  CANVAS_CAP_HEIGHT,
  CANVAS_DESCENDER,
  CANVAS_ORIGIN_X,
  CANVAS_SIZE,
  CANVAS_X_HEIGHT,
} from './fontEngine';

export type TracingStandardFont =
  | 'modern-sans'
  | 'classic-serif'
  | 'cursive-script'
  | 'drafting-mono'
  | 'geometric';

export type TracingRenderMode =
  | 'ghost-outline'
  | 'ghost-fill'
  | 'dual'
  | 'skeleton';

export type TracingColorTheme = 'blueprint' | 'indigo' | 'slate' | 'emerald' | 'amber';

export interface TracingGuideSettings {
  enabled: boolean;
  fontStyle: TracingStandardFont;
  renderMode: TracingRenderMode;
  opacity: number; // 0.05 to 0.50
  applySlant: boolean; // Tilt ghost with active canvas slant angle
  showProportions: boolean; // Bounding caliper and standard width indicator
  showGuidelineSnaps: boolean; // Guideline contact markers at baseline / cap / x-height
  scale: number; // 0.8 to 1.25 (default 1.0)
  offsetX: number; // -100 to 100 px nudge
  offsetY: number; // -100 to 100 px nudge
  colorTheme: TracingColorTheme;
}

export const DEFAULT_TRACING_SETTINGS: TracingGuideSettings = {
  enabled: true,
  fontStyle: 'modern-sans',
  renderMode: 'ghost-outline',
  opacity: 0.22,
  applySlant: true,
  showProportions: true,
  showGuidelineSnaps: true,
  scale: 1.0,
  offsetX: 0,
  offsetY: 0,
  colorTheme: 'blueprint',
};

export interface StandardFontOption {
  id: TracingStandardFont;
  name: string;
  category: string;
  fontFamily: string;
  sampleText: string;
  description: string;
  bestFor: string;
}

export const STANDARD_FONT_OPTIONS: StandardFontOption[] = [
  {
    id: 'modern-sans',
    name: 'Modern Sans',
    category: 'Grotesque / Humanist',
    fontFamily: '"Plus Jakarta Sans", system-ui, -apple-system, sans-serif',
    sampleText: 'Aa Rr Gg',
    description: 'Clean modern proportions with balanced optical rhythm and clear stems.',
    bestFor: 'Everyday neat handwriting, print lettering, and note-taking',
  },
  {
    id: 'classic-serif',
    name: 'Classic Serif',
    category: 'High-Contrast Roman',
    fontFamily: '"Playfair Display", Georgia, serif',
    sampleText: 'Aa Rr Gg',
    description: 'Classical proportions with distinct ascender serifs, loops, and brackets.',
    bestFor: 'Formal penmanship, calligraphy capitals, and bookish cursive',
  },
  {
    id: 'cursive-script',
    name: 'Cursive Script',
    category: 'Schoolbook & Rhythm',
    fontFamily: '"Caveat", "Brush Script MT", cursive',
    sampleText: 'Aa Rr Gg',
    description: 'Natural handwritten flowing cadence with organic entry/exit curves.',
    bestFor: 'Continuous cursive handwriting, Spencerian flow, and signatures',
  },
  {
    id: 'drafting-mono',
    name: 'Technical Mono',
    category: 'Fixed Pitch / Architectural',
    fontFamily: '"JetBrains Mono", "Courier New", monospace',
    sampleText: 'Aa Rr Gg',
    description: 'Strict uniform-width drafting geometry inspired by architectural blueprints.',
    bestFor: 'Architect hand-lettering, comic book lettering, and engineering caps',
  },
  {
    id: 'geometric',
    name: 'Geometric Bauhaus',
    category: 'Circular & Constructivist',
    fontFamily: '"Plus Jakarta Sans", "Helvetica Neue", sans-serif',
    sampleText: 'Aa Rr Gg',
    description: 'Circular bowls, sharp apexes, and minimalist modern symmetry.',
    bestFor: 'Poster lettering, block handwriting, and modern monoline fonts',
  },
];

interface ThemeColors {
  fill: (alpha: number) => string;
  stroke: (alpha: number) => string;
  accent: (alpha: number) => string;
  badgeBg: string;
  badgeText: string;
}

const THEME_COLOR_MAP: Record<TracingColorTheme, ThemeColors> = {
  blueprint: {
    fill: (a) => `rgba(14, 165, 233, ${a})`,
    stroke: (a) => `rgba(2, 132, 199, ${a})`,
    accent: (a) => `rgba(56, 189, 248, ${a})`,
    badgeBg: 'bg-sky-50 border-sky-200 text-sky-800',
    badgeText: 'text-sky-600',
  },
  indigo: {
    fill: (a) => `rgba(99, 102, 241, ${a})`,
    stroke: (a) => `rgba(79, 70, 229, ${a})`,
    accent: (a) => `rgba(129, 140, 248, ${a})`,
    badgeBg: 'bg-indigo-50 border-indigo-200 text-indigo-800',
    badgeText: 'text-indigo-600',
  },
  slate: {
    fill: (a) => `rgba(71, 85, 105, ${a})`,
    stroke: (a) => `rgba(51, 65, 85, ${a})`,
    accent: (a) => `rgba(148, 163, 184, ${a})`,
    badgeBg: 'bg-slate-100 border-slate-300 text-slate-800',
    badgeText: 'text-slate-600',
  },
  emerald: {
    fill: (a) => `rgba(16, 185, 129, ${a})`,
    stroke: (a) => `rgba(5, 150, 105, ${a})`,
    accent: (a) => `rgba(52, 211, 153, ${a})`,
    badgeBg: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    badgeText: 'text-emerald-600',
  },
  amber: {
    fill: (a) => `rgba(217, 119, 6, ${a})`,
    stroke: (a) => `rgba(180, 83, 9, ${a})`,
    accent: (a) => `rgba(245, 158, 11, ${a})`,
    badgeBg: 'bg-amber-50 border-amber-200 text-amber-900',
    badgeText: 'text-amber-600',
  },
};

export function getThemeColors(theme: TracingColorTheme): ThemeColors {
  return THEME_COLOR_MAP[theme] || THEME_COLOR_MAP.blueprint;
}

export const STANDARD_LATIN_UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
export const STANDARD_LATIN_LOWERCASE = 'abcdefghijklmnopqrstuvwxyz'.split('');
export const STANDARD_LATIN_ALL = [...STANDARD_LATIN_UPPERCASE, ...STANDARD_LATIN_LOWERCASE];

export function isStandardLatinChar(char: string): boolean {
  return /^[a-zA-Z]$/.test(char);
}

export const TRACING_OPACITY_PRESETS = [
  { label: 'Faint', value: 0.12, hint: 'Whisper guide' },
  { label: 'Balanced', value: 0.22, hint: 'Recommended for pen tracing' },
  { label: 'Crisp', value: 0.38, hint: 'High contrast architectural outline' },
  { label: 'Bold', value: 0.52, hint: 'Prominent template' },
];

/**
 * Calculates font styling and base size to accurately align with typographic lines.
 * Cap Height (240) to Baseline (600) = 360px vertical height.
 * Base sizes are calibrated so standard Latin capitals (A-Z) span exactly 360px.
 */
function getFontStyle(style: TracingStandardFont, scale: number = 1.0): { font: string; size: number } {
  let baseSize = 500 * scale;
  let fontFace = '"Plus Jakarta Sans", system-ui, sans-serif';
  let weight = '600';

  switch (style) {
    case 'classic-serif':
      baseSize = 525 * scale;
      fontFace = '"Playfair Display", Georgia, serif';
      weight = '600';
      break;
    case 'cursive-script':
      baseSize = 570 * scale;
      fontFace = '"Caveat", cursive';
      weight = '700';
      break;
    case 'drafting-mono':
      baseSize = 495 * scale;
      fontFace = '"JetBrains Mono", monospace';
      weight = '600';
      break;
    case 'geometric':
      baseSize = 505 * scale;
      fontFace = '"Plus Jakarta Sans", sans-serif';
      weight = '700';
      break;
    case 'modern-sans':
    default:
      baseSize = 500 * scale;
      fontFace = '"Plus Jakarta Sans", system-ui, sans-serif';
      weight = '700';
      break;
  }

  return {
    font: `${weight} ${Math.round(baseSize)}px ${fontFace}`,
    size: baseSize,
  };
}

/**
 * Renders the Tracing Guide standard form overlay onto the canvas context.
 */
export function drawTracingGuideOverlay(
  ctx: CanvasRenderingContext2D,
  char: string,
  settings: TracingGuideSettings,
  slant: number = 0
): void {
  if (!settings.enabled || !char) return;

  const colors = getThemeColors(settings.colorTheme);
  const { font, size } = getFontStyle(settings.fontStyle, settings.scale);

  ctx.save();

  // Position center point
  const centerX = CANVAS_SIZE / 2 + settings.offsetX;
  const baselineY = CANVAS_BASELINE + settings.offsetY;

  // Apply shear slant transformation around baseline if requested
  if (settings.applySlant && slant !== 0) {
    const angleRad = (slant * Math.PI) / 180;
    const tan = Math.tan(angleRad);
    ctx.translate(centerX, baselineY);
    ctx.transform(1, 0, -tan, 1, 0, 0);
    ctx.translate(-centerX, -baselineY);
  }

  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  // Measure standard text metrics
  const metrics = ctx.measureText(char);
  const textWidth = metrics.width || 200;
  const ascent = metrics.actualBoundingBoxAscent || 280;
  const descent = metrics.actualBoundingBoxDescent || 60;
  const leftBound = centerX - textWidth / 2;
  const rightBound = centerX + textWidth / 2;
  const topBound = baselineY - ascent;
  const bottomBound = baselineY + descent;

  // 1. Ghosted Character Body rendering
  switch (settings.renderMode) {
    case 'ghost-fill': {
      ctx.fillStyle = colors.fill(settings.opacity);
      ctx.fillText(char, centerX, baselineY);
      break;
    }

    case 'ghost-outline': {
      ctx.strokeStyle = colors.stroke(Math.min(0.85, settings.opacity * 2.2));
      ctx.lineWidth = 2.2;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.setLineDash([6, 4]); // Crisp dashed architectural tracing line
      ctx.strokeText(char, centerX, baselineY);
      ctx.setLineDash([]);
      break;
    }

    case 'dual': {
      // Soft fill underlay + crisp outer vector line
      ctx.fillStyle = colors.fill(settings.opacity * 0.7);
      ctx.fillText(char, centerX, baselineY);

      ctx.strokeStyle = colors.stroke(Math.min(0.9, settings.opacity * 2.4));
      ctx.lineWidth = 1.8;
      ctx.lineJoin = 'round';
      ctx.strokeText(char, centerX, baselineY);
      break;
    }

    case 'skeleton': {
      // Crisp outline
      ctx.strokeStyle = colors.stroke(Math.min(0.8, settings.opacity * 2.0));
      ctx.lineWidth = 1.6;
      ctx.setLineDash([4, 4]);
      ctx.strokeText(char, centerX, baselineY);
      ctx.setLineDash([]);

      // Plumb Center Axis & Optical Waistline
      ctx.strokeStyle = colors.accent(Math.min(0.7, settings.opacity * 1.8));
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);

      // Vertical plumb axis
      ctx.beginPath();
      ctx.moveTo(centerX, topBound - 20);
      ctx.lineTo(centerX, bottomBound + 20);
      ctx.stroke();

      // Optical waistline
      const waistlineY = (topBound + baselineY) / 2;
      ctx.beginPath();
      ctx.moveTo(leftBound - 25, waistlineY);
      ctx.lineTo(rightBound + 25, waistlineY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Center intersection pip
      ctx.fillStyle = colors.stroke(0.8);
      ctx.beginPath();
      ctx.arc(centerX, waistlineY, 3, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  }

  // 2. Proportion Anchors & Standard Width Caliper
  if (settings.showProportions) {
    const pad = 12;
    const boxLeft = leftBound - pad;
    const boxRight = rightBound + pad;
    const boxTop = topBound - pad;
    const boxBottom = bottomBound + pad;

    // Corner bracket markers (architectural style)
    const cornerSize = 14;
    ctx.strokeStyle = colors.stroke(Math.min(0.75, settings.opacity * 2.2));
    ctx.lineWidth = 1.5;
    ctx.setLineDash([]);

    // Top-Left
    ctx.beginPath();
    ctx.moveTo(boxLeft, boxTop + cornerSize);
    ctx.lineTo(boxLeft, boxTop);
    ctx.lineTo(boxLeft + cornerSize, boxTop);
    ctx.stroke();

    // Top-Right
    ctx.beginPath();
    ctx.moveTo(boxRight - cornerSize, boxTop);
    ctx.lineTo(boxRight, boxTop);
    ctx.lineTo(boxRight, boxTop + cornerSize);
    ctx.stroke();

    // Bottom-Left
    ctx.beginPath();
    ctx.moveTo(boxLeft, boxBottom - cornerSize);
    ctx.lineTo(boxLeft, boxBottom);
    ctx.lineTo(boxLeft + cornerSize, boxBottom);
    ctx.stroke();

    // Bottom-Right
    ctx.beginPath();
    ctx.moveTo(boxRight - cornerSize, boxBottom);
    ctx.lineTo(boxRight, boxBottom);
    ctx.lineTo(boxRight, boxBottom - cornerSize);
    ctx.stroke();

    // Standard width caliper bar beneath baseline
    const caliperY = Math.min(CANVAS_SIZE - 25, boxBottom + 18);
    ctx.strokeStyle = colors.accent(Math.min(0.7, settings.opacity * 2));
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(boxLeft, caliperY);
    ctx.lineTo(boxRight, caliperY);
    // End ticks
    ctx.moveTo(boxLeft, caliperY - 5);
    ctx.lineTo(boxLeft, caliperY + 5);
    ctx.moveTo(boxRight, caliperY - 5);
    ctx.lineTo(boxRight, caliperY + 5);
    ctx.stroke();

    // Caliper badge text
    ctx.fillStyle = colors.stroke(0.85);
    ctx.font = '500 11px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const label = `↔ Std Form Width: ${Math.round(textWidth)}px`;
    ctx.fillText(label, centerX, caliperY + 12);
  }

  // 3. Guideline Intersection Snap Markers
  if (settings.showGuidelineSnaps) {
    const snapLines = [
      { y: CANVAS_ASCENDER, name: 'Ascender' },
      { y: CANVAS_CAP_HEIGHT, name: 'Cap' },
      { y: CANVAS_X_HEIGHT, name: 'x-Height' },
      { y: CANVAS_BASELINE, name: 'Baseline' },
      { y: CANVAS_DESCENDER, name: 'Descender' },
    ];

    ctx.fillStyle = colors.stroke(Math.min(0.9, settings.opacity * 2.5));
    ctx.strokeStyle = colors.accent(0.6);
    ctx.lineWidth = 1;

    snapLines.forEach((line) => {
      // Check if standard form reaches this guideline region
      const touchesLine = Math.abs(topBound - line.y) < 30 || Math.abs(baselineY - line.y) < 15 || Math.abs(bottomBound - line.y) < 25;
      if (touchesLine || line.y === CANVAS_BASELINE) {
        // Draw left and right alignment diamond pips
        [leftBound - 24, rightBound + 24].forEach((pipX) => {
          ctx.beginPath();
          ctx.moveTo(pipX, line.y - 3.5);
          ctx.lineTo(pipX + 3.5, line.y);
          ctx.lineTo(pipX, line.y + 3.5);
          ctx.lineTo(pipX - 3.5, line.y);
          ctx.closePath();
          ctx.fill();
        });
      }
    });
  }

  ctx.restore();
}

/**
 * Compares user's drawn glyph strokes against the standard archetype proportions.
 */
export interface ProportionComparison {
  hasDrawnInk: boolean;
  drawnWidth: number;
  drawnHeight: number;
  standardWidth: number;
  standardHeight: number;
  widthRatioPercent: number; // e.g. 96 (%)
  heightRatioPercent: number; // e.g. 102 (%)
  baselineOffset: number; // px from baseline (positive = floating, negative = below)
  widthAssessment: 'narrow' | 'matching' | 'wide';
  heightAssessment: 'short' | 'matching' | 'tall';
  overallMatchScore: number; // 0 to 100
  feedbackTip: string;
}

export function compareDrawnGlyphWithStandard(
  char: string,
  strokes: GlyphStroke[],
  settings: TracingGuideSettings,
  baseWidth: number = 14
): ProportionComparison {
  if (!strokes || strokes.length === 0) {
    return {
      hasDrawnInk: false,
      drawnWidth: 0,
      drawnHeight: 0,
      standardWidth: 320,
      standardHeight: 360,
      widthRatioPercent: 0,
      heightRatioPercent: 0,
      baselineOffset: 0,
      widthAssessment: 'matching',
      heightAssessment: 'matching',
      overallMatchScore: 0,
      feedbackTip: `Draw '${char}' using the ghosted guide for consistent letter proportions.`,
    };
  }

  // Calculate drawn stroke bounding box
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const stroke of strokes) {
    for (const pt of stroke) {
      if (pt.x < minX) minX = pt.x;
      if (pt.x > maxX) maxX = pt.x;
      if (pt.y < minY) minY = pt.y;
      if (pt.y > maxY) maxY = pt.y;
    }
  }

  const half = baseWidth / 2;
  const drawnWidth = Math.max(10, Math.round(maxX - minX + half * 2));
  const drawnHeight = Math.max(10, Math.round(maxY - minY + half * 2));
  const drawnBaselineY = maxY;
  const baselineOffset = Math.round(CANVAS_BASELINE - drawnBaselineY);

  // Standard proportions estimation based on character type
  const isUpper = char === char.toUpperCase() && char !== char.toLowerCase();
  const isPunctuation = ['.', ',', '!', '?', ':', ';', "'", '"', '-', '(', ')'].includes(char);
  const isNumber = /^[0-9]$/.test(char);

  let standardHeight = 360; // Cap Height to Baseline
  if (!isUpper && !isNumber && !isPunctuation) {
    // Lowercase
    const hasAscender = ['b', 'd', 'f', 'h', 'k', 'l', 't'].includes(char);
    const hasDescender = ['g', 'j', 'p', 'q', 'y'].includes(char);
    if (hasAscender) standardHeight = 440;
    else if (hasDescender) standardHeight = 360;
    else standardHeight = 200; // x-height
  } else if (isPunctuation) {
    standardHeight = ['.', ','].includes(char) ? 60 : 320;
  }

  // Approximate standard width for proportion matching
  let standardWidth = Math.round(standardHeight * 0.75);
  if (['W', 'M', 'm', 'w'].includes(char)) standardWidth = Math.round(standardHeight * 1.15);
  if (['I', 'i', 'l', 'j', '1', '!', '|'].includes(char)) standardWidth = Math.round(standardHeight * 0.32);
  if (['f', 't', 'r'].includes(char)) standardWidth = Math.round(standardHeight * 0.48);

  const widthRatioPercent = Math.round((drawnWidth / standardWidth) * 100);
  const heightRatioPercent = Math.round((drawnHeight / standardHeight) * 100);

  let widthAssessment: 'narrow' | 'matching' | 'wide' = 'matching';
  if (widthRatioPercent < 82) widthAssessment = 'narrow';
  else if (widthRatioPercent > 122) widthAssessment = 'wide';

  let heightAssessment: 'short' | 'matching' | 'tall' = 'matching';
  if (heightRatioPercent < 85) heightAssessment = 'short';
  else if (heightRatioPercent > 120) heightAssessment = 'tall';

  // Overall match score
  const widthScore = Math.max(0, 100 - Math.abs(100 - widthRatioPercent) * 1.2);
  const heightScore = Math.max(0, 100 - Math.abs(100 - heightRatioPercent) * 1.2);
  const baselinePenalty = Math.min(25, Math.abs(baselineOffset) * 0.5);
  const overallMatchScore = Math.round(Math.max(10, Math.min(100, (widthScore + heightScore) / 2 - baselinePenalty)));

  let feedbackTip = `Great proportions! Your '${char}' aligns well with standard letter rhythm.`;
  if (widthAssessment === 'narrow') {
    feedbackTip = `Slightly narrow compared to standard form. Broaden the horizontal curves for better legibility.`;
  } else if (widthAssessment === 'wide') {
    feedbackTip = `Wider than standard form. Great for bold handwriting, or trace closer to ghost guide for compact text.`;
  } else if (heightAssessment === 'short') {
    feedbackTip = `A bit short. Extend the vertical stroke toward the Cap/x-Height guideline.`;
  } else if (heightAssessment === 'tall') {
    feedbackTip = `Extends taller than standard form. Keep ascenders grounded on the guideline for harmony.`;
  } else if (Math.abs(baselineOffset) > 24) {
    feedbackTip = baselineOffset > 0 ? `Floating slightly above baseline. Pull the base down to touch the red line.` : `Dips below baseline. Keep base stroke resting on the solid red line.`;
  }

  return {
    hasDrawnInk: true,
    drawnWidth,
    drawnHeight,
    standardWidth,
    standardHeight,
    widthRatioPercent,
    heightRatioPercent,
    baselineOffset,
    widthAssessment,
    heightAssessment,
    overallMatchScore,
    feedbackTip,
  };
}
