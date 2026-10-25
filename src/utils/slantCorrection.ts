import { GlyphData, GlyphPoint, GlyphStroke } from '../types/font';
import { CANVAS_BASELINE, CANVAS_CAP_HEIGHT, CANVAS_SIZE } from './fontEngine';

export interface SlantPreset {
  label: string;
  angle: number;
  description: string;
  styleCategory: string;
}

export const SLANT_PRESETS: SlantPreset[] = [
  {
    label: 'Backslant',
    angle: -12,
    description: 'Left-leaning backslant often seen in left-handed script',
    styleCategory: 'Left-Handed',
  },
  {
    label: 'Slight Back',
    angle: -6,
    description: 'Subtle leftward tilt',
    styleCategory: 'Gentle',
  },
  {
    label: 'Upright (0°)',
    angle: 0,
    description: 'Perpendicular 90° upright Roman letterforms',
    styleCategory: 'Roman / Print',
  },
  {
    label: 'Natural Hand',
    angle: 8,
    description: 'Comfortable everyday casual handwriting slope',
    styleCategory: 'Everyday Hand',
  },
  {
    label: 'Italic (14°)',
    angle: 14,
    description: 'Standard typographical italic incline',
    styleCategory: 'Italic',
  },
  {
    label: 'Cursive (20°)',
    angle: 20,
    description: 'Flowing cursive speed script with dynamic cadence',
    styleCategory: 'Running Hand',
  },
  {
    label: 'Spencerian (26°)',
    angle: 26,
    description: 'Traditional American Spencerian & Roundhand calligraphic slope',
    styleCategory: 'Calligraphic',
  },
];

/**
 * Transforms a single 2D glyph point using horizontal shear around the baseline.
 * Baseline Y remains stationary (dy = 0 => dx = 0).
 * Points above baseline (y < baselineY) shift horizontally to the right for positive angles.
 * Points below baseline (y > baselineY) shift horizontally to the left for positive angles.
 */
export function skewPoint(
  pt: GlyphPoint,
  slantAngleDegrees: number,
  baselineY: number = CANVAS_BASELINE
): GlyphPoint {
  if (slantAngleDegrees === 0) return pt;
  const rad = (slantAngleDegrees * Math.PI) / 180;
  const tan = Math.tan(rad);
  const dy = pt.y - baselineY;
  const newX = Math.round((pt.x - dy * tan) * 100) / 100;
  return {
    ...pt,
    x: newX,
    y: pt.y,
  };
}

/**
 * Applies horizontal skew transformation to an array of glyph strokes.
 * Preserves individual point pressure, point count, and stroke continuity.
 */
export function skewGlyphStrokes(
  strokes: GlyphStroke[],
  slantAngleDegrees: number,
  baselineY: number = CANVAS_BASELINE
): GlyphStroke[] {
  if (!strokes || strokes.length === 0 || slantAngleDegrees === 0) {
    return strokes;
  }

  const rad = (slantAngleDegrees * Math.PI) / 180;
  const tan = Math.tan(rad);

  return strokes.map((stroke) =>
    stroke.map((pt) => {
      const dy = pt.y - baselineY;
      return {
        ...pt,
        x: Math.round((pt.x - dy * tan) * 100) / 100,
        y: pt.y,
      };
    })
  );
}

/**
 * Batch applies a slant skew transformation across all characters in a font dictionary.
 * Non-destructively commits the slant to stroke coordinates and resets per-character slant offsets.
 */
export function batchSlantAllGlyphs(
  glyphs: Record<string, GlyphData>,
  slantAngleDegrees: number,
  baselineY: number = CANVAS_BASELINE
): {
  glyphs: Record<string, GlyphData>;
  modifiedCount: number;
} {
  if (slantAngleDegrees === 0) {
    return { glyphs, modifiedCount: 0 };
  }

  const updated: Record<string, GlyphData> = {};
  let modifiedCount = 0;

  for (const [char, glyph] of Object.entries(glyphs)) {
    if (glyph && glyph.strokes && glyph.strokes.length > 0) {
      const skewedStrokes = skewGlyphStrokes(glyph.strokes, slantAngleDegrees, baselineY);
      
      // Also transform any alternates
      const updatedVariants = glyph.variants?.map((v) => ({
        ...v,
        strokes: v.strokes ? skewGlyphStrokes(v.strokes, slantAngleDegrees, baselineY) : [],
        slant: 0,
      }));

      updated[char] = {
        ...glyph,
        strokes: skewedStrokes,
        variants: updatedVariants,
        slant: 0,
        lastModified: Date.now(),
      };
      modifiedCount++;
    } else {
      updated[char] = glyph;
    }
  }

  return { glyphs: updated, modifiedCount };
}

/**
 * Computes descriptive metadata for the active slant angle.
 */
export function getSlantDescription(angle: number): {
  title: string;
  category: 'upright' | 'forward' | 'backward';
  shiftAtCapHeight: number; // Horizontal px displacement at 360px Cap-Height
  description: string;
} {
  const rad = (angle * Math.PI) / 180;
  const tan = Math.tan(rad);
  const capHeightDistance = CANVAS_BASELINE - CANVAS_CAP_HEIGHT; // 360px
  const shiftAtCapHeight = Math.round(capHeightDistance * tan);

  if (Math.abs(angle) < 0.5) {
    return {
      title: 'Upright (0°)',
      category: 'upright',
      shiftAtCapHeight: 0,
      description: 'Strict 90° vertical stems with balanced upright rhythm.',
    };
  }

  if (angle > 0) {
    let style = 'Gentle Italic Hand';
    if (angle >= 22) style = 'Spencerian / Cursive Script';
    else if (angle >= 14) style = 'Formal Italic Incline';
    else if (angle >= 8) style = 'Natural Forward Handwriting';

    return {
      title: `Forward Italic (+${angle}°)`,
      category: 'forward',
      shiftAtCapHeight,
      description: `${style} · Stems lean +${shiftAtCapHeight}px forward at Cap-Height.`,
    };
  }

  return {
    title: `Backslant (${angle}°)`,
    category: 'backward',
    shiftAtCapHeight,
    description: `Left-leaning backslant · Stems shift ${shiftAtCapHeight}px back at Cap-Height.`,
  };
}

/**
 * Draws visual slant inclination lines and shear vectors on the canvas.
 */
export function drawSlantGuideOverlay(
  ctx: CanvasRenderingContext2D,
  slantAngle: number,
  baselineY: number,
  pivotX: number,
  options?: {
    color?: string;
    showAngleArc?: boolean;
    showHorizontalShiftBar?: boolean;
  }
): void {
  if (slantAngle === 0) return;

  const color = options?.color || 'rgba(14, 165, 233, 0.7)'; // Vibrant sky/cyan
  const rad = (slantAngle * Math.PI) / 180;
  const tan = Math.tan(rad);

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.4;
  ctx.setLineDash([5, 4]);

  const topY = CANVAS_CAP_HEIGHT - 30;
  const bottomY = baselineY + 80;
  const topX = pivotX - (topY - baselineY) * tan;
  const botX = pivotX - (bottomY - baselineY) * tan;

  // 1. Primary inclined shear axis line through the character center
  ctx.beginPath();
  ctx.moveTo(topX, topY);
  ctx.lineTo(botX, bottomY);
  ctx.stroke();

  // 2. Stationary Baseline Origin Anchor Dot
  ctx.setLineDash([]);
  ctx.fillStyle = '#0284c7';
  ctx.beginPath();
  ctx.arc(pivotX, baselineY, 4, 0, Math.PI * 2);
  ctx.fill();

  // 3. Upright vertical reference dashed plumb line (90°) for comparison
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)'; // Slate 400 faint line
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(pivotX, topY);
  ctx.lineTo(pivotX, bottomY);
  ctx.stroke();

  // 4. Horizontal displacement caliper bar at Cap-Height
  if (options?.showHorizontalShiftBar !== false) {
    const capY = CANVAS_CAP_HEIGHT;
    const slantedCapX = pivotX - (capY - baselineY) * tan;

    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.moveTo(pivotX, capY);
    ctx.lineTo(slantedCapX, capY);
    // End ticks
    ctx.moveTo(pivotX, capY - 4);
    ctx.lineTo(pivotX, capY + 4);
    ctx.moveTo(slantedCapX, capY - 4);
    ctx.lineTo(slantedCapX, capY + 4);
    ctx.stroke();

    // Caliper label text
    const shift = Math.round(slantedCapX - pivotX);
    const shiftText = `${shift > 0 ? `+${shift}` : shift}px`;
    ctx.font = '600 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(shiftText, (pivotX + slantedCapX) / 2, capY - 5);
  }

  // 5. Angular Arc Indicator at Baseline
  if (options?.showAngleArc !== false) {
    const arcRadius = 36;
    const startAngle = -Math.PI / 2; // Upright 90 deg pointing up
    const endAngle = startAngle + rad;

    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (slantAngle > 0) {
      ctx.arc(pivotX, baselineY, arcRadius, startAngle, endAngle, false);
    } else {
      ctx.arc(pivotX, baselineY, arcRadius, startAngle, endAngle, true);
    }
    ctx.stroke();

    // Angle label text badge near arc
    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    ctx.fillStyle = '#0369a1';
    ctx.textAlign = slantAngle > 0 ? 'left' : 'right';
    ctx.textBaseline = 'middle';
    const angleText = `${slantAngle > 0 ? `+${slantAngle}` : slantAngle}°`;
    const labelX = pivotX + (slantAngle > 0 ? 1 : -1) * (arcRadius + 8);
    const labelY = baselineY - arcRadius * 0.7;
    ctx.fillText(angleText, labelX, labelY);
  }

  ctx.restore();
}
