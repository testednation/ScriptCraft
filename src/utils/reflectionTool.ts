import { GlyphStroke } from '../types/font';
import { CANVAS_SIZE, CANVAS_ORIGIN_X } from './fontEngine';

export type ReflectionType = 'horizontal' | 'vertical' | 'quad';
export type HorizontalAxisMode = 'metric' | 'canvas' | 'custom';
export type VerticalAxisMode = 'typographic' | 'baseline' | 'canvas' | 'custom';

export interface ReflectionSettings {
  enabled: boolean;
  type: ReflectionType; // 'horizontal' (L <-> R), 'vertical' (T <-> B), or 'quad' (4-way)
  horizontalAxisMode: HorizontalAxisMode;
  horizontalAxisOffset: number; // in pixels
  verticalAxisMode: VerticalAxisMode;
  verticalAxisOffset: number; // in pixels
  showAxisLines: boolean;
  showGhostReticle: boolean;
  lockAxesToBoundingBoxCenter?: boolean;
}

export const DEFAULT_REFLECTION_SETTINGS: ReflectionSettings = {
  enabled: false,
  type: 'horizontal',
  horizontalAxisMode: 'metric',
  horizontalAxisOffset: 0,
  verticalAxisMode: 'typographic',
  verticalAxisOffset: 0,
  showAxisLines: true,
  showGhostReticle: true,
  lockAxesToBoundingBoxCenter: false,
};

// Recommended typographic character presets for each reflection axis
export const HORIZONTAL_SYMMETRY_PRESETS = [
  'A', 'H', 'I', 'M', 'O', 'T', 'U', 'V', 'W', 'X', 'Y', 'o', 'v', 'w', 'x', '0', '8', '+', '=', '-',
];

export const VERTICAL_SYMMETRY_PRESETS = [
  'B', 'C', 'D', 'E', 'H', 'I', 'K', 'O', 'X', 'c', 'o', 'x', '0', '8', '-', '=', '+',
];

export const QUAD_SYMMETRY_PRESETS = [
  'H', 'I', 'O', 'X', 'o', 'x', '0', '8', '+', '=',
];

/**
 * Calculates current axis coordinates X (vertical reflection line) and Y (horizontal reflection line)
 */
export function computeReflectionAxes(
  settings: ReflectionSettings,
  options: {
    advanceWidth?: number;
    baseline?: number;
    capHeight?: number;
    bboxCenter?: { x: number; y: number } | null;
  }
): { axisX: number; axisY: number } {
  const { advanceWidth = 600, baseline = 600, capHeight = 240, bboxCenter = null } = options;

  // If locked to current glyph's bounding box center
  if (settings.lockAxesToBoundingBoxCenter && bboxCenter) {
    return {
      axisX: Math.round(bboxCenter.x + settings.horizontalAxisOffset),
      axisY: Math.round(bboxCenter.y + settings.verticalAxisOffset),
    };
  }

  // 1. Horizontal reflection axis line X (vertical line across which X coordinates reflect)
  let baseX: number;
  if (settings.horizontalAxisMode === 'metric') {
    baseX = CANVAS_ORIGIN_X + advanceWidth * 0.36;
  } else if (settings.horizontalAxisMode === 'canvas') {
    baseX = CANVAS_SIZE / 2; // 400px
  } else {
    baseX = CANVAS_ORIGIN_X + advanceWidth * 0.36;
  }
  const axisX = Math.round(baseX + settings.horizontalAxisOffset);

  // 2. Vertical reflection axis line Y (horizontal line across which Y coordinates reflect)
  let baseY: number;
  if (settings.verticalAxisMode === 'typographic') {
    // Optical typographic center between cap-height and baseline
    baseY = (capHeight + baseline) / 2;
  } else if (settings.verticalAxisMode === 'baseline') {
    baseY = baseline;
  } else if (settings.verticalAxisMode === 'canvas') {
    baseY = CANVAS_SIZE / 2; // 400px
  } else {
    baseY = (capHeight + baseline) / 2;
  }
  const axisY = Math.round(baseY + settings.verticalAxisOffset);

  return { axisX, axisY };
}

export interface ReflectedPoint {
  x: number;
  y: number;
  pressure: number;
}

/**
 * Computes mirrored points for a given coordinate based on reflection type
 */
export function reflectPoint(
  pt: { x: number; y: number; pressure?: number },
  axisX: number,
  axisY: number,
  type: ReflectionType
): ReflectedPoint[] {
  const p = pt.pressure !== undefined ? pt.pressure : 1.0;

  if (type === 'horizontal') {
    // Left <-> Right mirror across vertical line axisX
    return [
      {
        x: Math.round(2 * axisX - pt.x),
        y: pt.y,
        pressure: p,
      },
    ];
  }

  if (type === 'vertical') {
    // Top <-> Bottom mirror across horizontal line axisY
    return [
      {
        x: pt.x,
        y: Math.round(2 * axisY - pt.y),
        pressure: p,
      },
    ];
  }

  // 'quad': 4-Quadrant dual reflection
  return [
    // 1. Horizontal mirror
    {
      x: Math.round(2 * axisX - pt.x),
      y: pt.y,
      pressure: p,
    },
    // 2. Vertical mirror
    {
      x: pt.x,
      y: Math.round(2 * axisY - pt.y),
      pressure: p,
    },
    // 3. Diagonal origin mirror (both X and Y)
    {
      x: Math.round(2 * axisX - pt.x),
      y: Math.round(2 * axisY - pt.y),
      pressure: p,
    },
  ];
}

/**
 * Mirrors a single stroke across the specified reflection axes
 */
export function reflectStroke(
  stroke: GlyphStroke,
  axisX: number,
  axisY: number,
  type: ReflectionType
): GlyphStroke[] {
  if (!stroke || stroke.length === 0) return [];

  if (type === 'horizontal') {
    const mirrored: GlyphStroke = stroke.map((pt) => ({
      x: Math.round(2 * axisX - pt.x),
      y: pt.y,
      pressure: pt.pressure,
    }));
    return [mirrored];
  }

  if (type === 'vertical') {
    const mirrored: GlyphStroke = stroke.map((pt) => ({
      x: pt.x,
      y: Math.round(2 * axisY - pt.y),
      pressure: pt.pressure,
    }));
    return [mirrored];
  }

  // Quad reflection: returns 3 mirrored strokes
  const horizStroke: GlyphStroke = stroke.map((pt) => ({
    x: Math.round(2 * axisX - pt.x),
    y: pt.y,
    pressure: pt.pressure,
  }));
  const vertStroke: GlyphStroke = stroke.map((pt) => ({
    x: pt.x,
    y: Math.round(2 * axisY - pt.y),
    pressure: pt.pressure,
  }));
  const diagStroke: GlyphStroke = stroke.map((pt) => ({
    x: Math.round(2 * axisX - pt.x),
    y: Math.round(2 * axisY - pt.y),
    pressure: pt.pressure,
  }));

  return [horizStroke, vertStroke, diagStroke];
}

/**
 * Reflects an entire collection of strokes across the specified axis
 */
export function reflectStrokes(
  strokes: GlyphStroke[],
  axisX: number,
  axisY: number,
  type: ReflectionType
): GlyphStroke[] {
  if (!strokes || strokes.length === 0) return [];
  const results: GlyphStroke[] = [];
  for (const s of strokes) {
    const reflected = reflectStroke(s, axisX, axisY, type);
    results.push(...reflected);
  }
  return results;
}

/**
 * One-click half-glyph reflection: copies and reflects strokes from one half of the character to the opposite half,
 * replacing the target side for perfect mathematical symmetry (e.g. sketching left side of 'M' and reflecting to right).
 */
export function mirrorHalfStrokes(
  strokes: GlyphStroke[],
  axisX: number,
  axisY: number,
  direction: 'left-to-right' | 'right-to-left' | 'top-to-bottom' | 'bottom-to-top'
): { strokes: GlyphStroke[]; mirroredCount: number } {
  if (!strokes || strokes.length === 0) return { strokes: [], mirroredCount: 0 };

  if (direction === 'left-to-right') {
    // Keep strokes on the left side (or center), mirror them across axisX to the right
    const leftStrokes = strokes.filter((stroke) => {
      if (stroke.length === 0) return false;
      const avgX = stroke.reduce((sum, p) => sum + p.x, 0) / stroke.length;
      return avgX <= axisX + 16;
    });
    const source = leftStrokes.length > 0 ? leftStrokes : strokes;
    const mirrored: GlyphStroke[] = source.map((stroke) =>
      stroke.map((p) => ({
        x: Math.round(2 * axisX - p.x),
        y: p.y,
        pressure: p.pressure,
      }))
    );
    return {
      strokes: [...source, ...mirrored],
      mirroredCount: mirrored.length,
    };
  }

  if (direction === 'right-to-left') {
    // Keep strokes on the right side, mirror them across axisX to the left
    const rightStrokes = strokes.filter((stroke) => {
      if (stroke.length === 0) return false;
      const avgX = stroke.reduce((sum, p) => sum + p.x, 0) / stroke.length;
      return avgX >= axisX - 16;
    });
    const source = rightStrokes.length > 0 ? rightStrokes : strokes;
    const mirrored: GlyphStroke[] = source.map((stroke) =>
      stroke.map((p) => ({
        x: Math.round(2 * axisX - p.x),
        y: p.y,
        pressure: p.pressure,
      }))
    );
    return {
      strokes: [...source, ...mirrored],
      mirroredCount: mirrored.length,
    };
  }

  if (direction === 'top-to-bottom') {
    // Keep strokes on the top half (y <= axisY), mirror them across axisY to bottom
    const topStrokes = strokes.filter((stroke) => {
      if (stroke.length === 0) return false;
      const avgY = stroke.reduce((sum, p) => sum + p.y, 0) / stroke.length;
      return avgY <= axisY + 16;
    });
    const source = topStrokes.length > 0 ? topStrokes : strokes;
    const mirrored: GlyphStroke[] = source.map((stroke) =>
      stroke.map((p) => ({
        x: p.x,
        y: Math.round(2 * axisY - p.y),
        pressure: p.pressure,
      }))
    );
    return {
      strokes: [...source, ...mirrored],
      mirroredCount: mirrored.length,
    };
  }

  // 'bottom-to-top'
  const bottomStrokes = strokes.filter((stroke) => {
    if (stroke.length === 0) return false;
    const avgY = stroke.reduce((sum, p) => sum + p.y, 0) / stroke.length;
    return avgY >= axisY - 16;
  });
  const source = bottomStrokes.length > 0 ? bottomStrokes : strokes;
  const mirrored: GlyphStroke[] = source.map((stroke) =>
    stroke.map((p) => ({
      x: p.x,
      y: Math.round(2 * axisY - p.y),
      pressure: p.pressure,
    }))
  );
  return {
    strokes: [...source, ...mirrored],
    mirroredCount: mirrored.length,
  };
}

export interface CharacterBalanceMetrics {
  horizontalBalanceScore: number; // 0 - 100%
  verticalBalanceScore: number; // 0 - 100%
  overallBalanceScore: number; // 0 - 100%
  leftPointWeight: number; // % of ink points on left
  rightPointWeight: number; // % of ink points on right
  topPointWeight: number; // % of ink points on top
  bottomPointWeight: number; // % of ink points on bottom
  centerOfMassX: number;
  centerOfMassY: number;
  offsetFromAxisX: number;
  offsetFromAxisY: number;
  balanceRating: 'Impeccable Symmetrical Balance' | 'Good Typographical Equilibrium' | 'Organic Asymmetry' | 'Pronounced Lateral Bias';
  recommendation: string;
}

/**
 * Computes horizontal and vertical optical balance scores of the active character against the reflection axes
 */
export function computeCharacterBalanceMetrics(
  strokes: GlyphStroke[],
  axisX: number,
  axisY: number
): CharacterBalanceMetrics {
  let totalPoints = 0;
  let sumX = 0;
  let sumY = 0;
  let leftPts = 0;
  let rightPts = 0;
  let topPts = 0;
  let bottomPts = 0;

  for (const stroke of strokes) {
    for (const pt of stroke) {
      totalPoints++;
      sumX += pt.x;
      sumY += pt.y;
      if (pt.x < axisX) leftPts++;
      else rightPts++;

      if (pt.y < axisY) topPts++;
      else bottomPts++;
    }
  }

  if (totalPoints === 0) {
    return {
      horizontalBalanceScore: 100,
      verticalBalanceScore: 100,
      overallBalanceScore: 100,
      leftPointWeight: 50,
      rightPointWeight: 50,
      topPointWeight: 50,
      bottomPointWeight: 50,
      centerOfMassX: axisX,
      centerOfMassY: axisY,
      offsetFromAxisX: 0,
      offsetFromAxisY: 0,
      balanceRating: 'Good Typographical Equilibrium',
      recommendation: 'Draw strokes to analyze reflection balance against the axes.',
    };
  }

  const comX = Math.round(sumX / totalPoints);
  const comY = Math.round(sumY / totalPoints);
  const diffX = Math.abs(comX - axisX);
  const diffY = Math.abs(comY - axisY);

  // Horizontal balance score (penalizes center of mass deviation from axisX)
  const hScore = Math.max(0, Math.min(100, Math.round(100 - (diffX / 80) * 100)));
  // Vertical balance score (penalizes center of mass deviation from axisY)
  const vScore = Math.max(0, Math.min(100, Math.round(100 - (diffY / 100) * 100)));
  const overall = Math.round((hScore * 0.6) + (vScore * 0.4));

  const leftWeight = Math.round((leftPts / totalPoints) * 100);
  const rightWeight = Math.round((rightPts / totalPoints) * 100);
  const topWeight = Math.round((topPts / totalPoints) * 100);
  const bottomWeight = Math.round((bottomPts / totalPoints) * 100);

  let rating: CharacterBalanceMetrics['balanceRating'] = 'Good Typographical Equilibrium';
  if (overall >= 92) rating = 'Impeccable Symmetrical Balance';
  else if (overall >= 75) rating = 'Good Typographical Equilibrium';
  else if (overall >= 50) rating = 'Organic Asymmetry';
  else rating = 'Pronounced Lateral Bias';

  let recommendation = '';
  if (diffX > 25) {
    recommendation = `Optical mass leans ${comX < axisX ? 'left' : 'right'} by ${diffX}px. Use 'Mirror Side' or nudge strokes toward vertical center.`;
  } else if (diffY > 30) {
    recommendation = `Optical mass is weighted ${comY < axisY ? 'toward top' : 'toward bottom'} by ${diffY}px.`;
  } else {
    recommendation = 'Excellent optical equilibrium across both horizontal and vertical axes.';
  }

  return {
    horizontalBalanceScore: hScore,
    verticalBalanceScore: vScore,
    overallBalanceScore: overall,
    leftPointWeight: leftWeight,
    rightPointWeight: rightWeight,
    topPointWeight: topWeight,
    bottomPointWeight: bottomWeight,
    centerOfMassX: comX,
    centerOfMassY: comY,
    offsetFromAxisX: comX - axisX,
    offsetFromAxisY: comY - axisY,
    balanceRating: rating,
    recommendation,
  };
}

/**
 * Draws the reflection axes (horizontal and/or vertical), guides, intersection diamond,
 * and live cursor ghost mirror reticles on the drawing canvas.
 */
export function drawReflectionCanvasOverlay(
  ctx: CanvasRenderingContext2D,
  axisX: number,
  axisY: number,
  settings: ReflectionSettings,
  options: {
    hoverPt?: { x: number; y: number } | null;
    drawingMode?: 'pen' | 'eraser';
    baseWidth?: number;
    width?: number;
    height?: number;
  } = {}
) {
  if (!settings.enabled) return;

  const {
    hoverPt = null,
    drawingMode = 'pen',
    baseWidth = 14,
    width = CANVAS_SIZE,
    height = CANVAS_SIZE,
  } = options;

  ctx.save();

  const isHoriz = settings.type === 'horizontal' || settings.type === 'quad';
  const isVert = settings.type === 'vertical' || settings.type === 'quad';

  // 1. Vertical axis line X (for horizontal reflection L <-> R)
  if (isHoriz && settings.showAxisLines) {
    // Soft glowing band
    ctx.fillStyle = 'rgba(99, 102, 241, 0.08)';
    ctx.fillRect(axisX - 12, 24, 24, height - 48);

    // Vertical dashed axis line
    ctx.strokeStyle = '#6366f1'; // Indigo 500
    ctx.lineWidth = 1.8;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.moveTo(axisX, 24);
    ctx.lineTo(axisX, height - 24);
    ctx.stroke();
    ctx.setLineDash([]);

    // Top and bottom diamond anchors
    const drawXAnchor = (cy: number) => {
      ctx.fillStyle = '#4f46e5';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(axisX, cy - 6);
      ctx.lineTo(axisX + 6, cy);
      ctx.lineTo(axisX, cy + 6);
      ctx.lineTo(axisX - 6, cy);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    };
    drawXAnchor(24);
    drawXAnchor(height - 24);
  }

  // 2. Horizontal axis line Y (for vertical reflection T <-> B)
  if (isVert && settings.showAxisLines) {
    // Soft glowing band
    ctx.fillStyle = 'rgba(168, 85, 247, 0.08)';
    ctx.fillRect(24, axisY - 12, width - 48, 24);

    // Horizontal dashed axis line
    ctx.strokeStyle = '#a855f7'; // Purple 500
    ctx.lineWidth = 1.8;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.moveTo(24, axisY);
    ctx.lineTo(width - 24, axisY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Left and right diamond anchors
    const drawYAnchor = (cx: number) => {
      ctx.fillStyle = '#9333ea';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(cx, axisY - 6);
      ctx.lineTo(cx + 6, axisY);
      ctx.lineTo(cx, axisY + 6);
      ctx.lineTo(cx - 6, axisY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    };
    drawYAnchor(24);
    drawYAnchor(width - 24);
  }

  // 3. Central Dual Intersection Crosshair (if Quad mode or both active)
  if (isHoriz && isVert && settings.showAxisLines) {
    ctx.fillStyle = '#ec4899';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.arc(axisX, axisY, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Crosshair lines
    ctx.strokeStyle = '#ec4899';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(axisX - 10, axisY);
    ctx.lineTo(axisX + 10, axisY);
    ctx.moveTo(axisX, axisY - 10);
    ctx.lineTo(axisX, axisY + 10);
    ctx.stroke();
  }

  // 4. Live Ghost Reflection Reticle when pointer hovers over canvas
  if (settings.showGhostReticle && hoverPt && drawingMode === 'pen') {
    const mirroredPoints = reflectPoint(hoverPt, axisX, axisY, settings.type);

    for (let idx = 0; idx < mirroredPoints.length; idx++) {
      const mPt = mirroredPoints[idx];

      // Connecting guide line from cursor to mirror reticle
      ctx.strokeStyle =
        idx === 0
          ? 'rgba(99, 102, 241, 0.4)'
          : idx === 1
          ? 'rgba(168, 85, 247, 0.4)'
          : 'rgba(236, 72, 153, 0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.moveTo(hoverPt.x, hoverPt.y);
      ctx.lineTo(mPt.x, mPt.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Mirror reticle ring
      const reticleR = Math.max(4, baseWidth / 2);
      const ringColor =
        idx === 0 ? '#6366f1' : idx === 1 ? '#a855f7' : '#ec4899';
      const fillColor =
        idx === 0
          ? 'rgba(99, 102, 241, 0.2)'
          : idx === 1
          ? 'rgba(168, 85, 247, 0.2)'
          : 'rgba(236, 72, 153, 0.2)';

      ctx.strokeStyle = ringColor;
      ctx.fillStyle = fillColor;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(mPt.x, mPt.y, reticleR, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Center dot
      ctx.fillStyle = ringColor;
      ctx.beginPath();
      ctx.arc(mPt.x, mPt.y, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Small label pill
      const label =
        settings.type === 'quad'
          ? idx === 0
            ? 'H-MIRROR'
            : idx === 1
            ? 'V-MIRROR'
            : 'QUAD'
          : settings.type === 'horizontal'
          ? 'MIRROR'
          : 'V-MIRROR';

      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.strokeStyle = ringColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(mPt.x + 8, mPt.y - 14, 48, 14, 3);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, mPt.x + 11, mPt.y - 7);
    }
  }

  ctx.restore();
}
