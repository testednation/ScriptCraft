import { GlyphPoint, GlyphStroke, GlyphData } from '../types/font';

export interface SimplifySettings {
  enabled: boolean;
  epsilon: number; // Tolerance threshold in pixels (distance from chord)
  autoSimplifyOnDraw: boolean; // Automatically apply RDP when finishing a stroke
  showControlPoints: boolean; // Render vector node handles on canvas
  showLivePreview: boolean; // Show ghost preview of simplified curve
  curveRelaxation: boolean; // Apply gentle curve smoothing after point reduction
}

export const DEFAULT_SIMPLIFY_SETTINGS: SimplifySettings = {
  enabled: false,
  epsilon: 3.0,
  autoSimplifyOnDraw: false,
  showControlPoints: true,
  showLivePreview: false,
  curveRelaxation: false,
};

export interface SimplifyPreset {
  id: string;
  label: string;
  epsilon: number;
  description: string;
  recommendedFor: string;
}

export const SIMPLIFY_PRESETS: SimplifyPreset[] = [
  {
    id: 'subtle',
    label: 'Subtle',
    epsilon: 1.5,
    description: 'Light tremor removal preserving fine handwriting quirks',
    recommendedFor: 'Delicate cursive, fine scripts, signatures',
  },
  {
    id: 'balanced',
    label: 'Balanced',
    epsilon: 3.0,
    description: 'Optimal handwriting clean-up maintaining authentic shape',
    recommendedFor: 'Everyday handwriting, standard font glyphs',
  },
  {
    id: 'crisp',
    label: 'Crisp',
    epsilon: 5.5,
    description: 'Polished vector curves with significant point reduction',
    recommendedFor: 'Calligraphy, logo lettering, clean display fonts',
  },
  {
    id: 'geometric',
    label: 'Minimal',
    epsilon: 10.0,
    description: 'High-reduction structural outline with essential vertices',
    recommendedFor: 'Architectural lettering, modern signage, sans-serif',
  },
];

export interface SimplificationMetrics {
  originalPointCount: number;
  simplifiedPointCount: number;
  reducedPointCount: number;
  reductionPercentage: number;
  maxDeviation: number;
  averagePointSpacing: number;
  strokeCount: number;
}

/**
 * Calculates perpendicular distance from point P to line segment AB.
 * If segment has zero length, returns Euclidean distance to point A.
 */
export function perpendicularDistance(
  p: GlyphPoint,
  lineStart: GlyphPoint,
  lineEnd: GlyphPoint
): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const lineLengthSq = dx * dx + dy * dy;

  if (lineLengthSq === 0) {
    return Math.hypot(p.x - lineStart.x, p.y - lineStart.y);
  }

  // Calculate perpendicular distance to the infinite line defined by lineStart and lineEnd
  const numerator = Math.abs(dy * p.x - dx * p.y + lineEnd.x * lineStart.y - lineEnd.y * lineStart.x);
  return numerator / Math.sqrt(lineLengthSq);
}

/**
 * Classic Ramer-Douglas-Peucker (RDP) algorithm implementation for a single polyline stroke.
 * Recursively decimates points whose perpendicular deviation from the line segment is <= epsilon.
 */
export function ramerDouglasPeucker(stroke: GlyphStroke, epsilon: number): GlyphStroke {
  if (!stroke || stroke.length <= 2) {
    return stroke ? [...stroke] : [];
  }

  // Handle closed or nearly-closed loops (e.g. circle 'O', '0', loop of 'e', 'g')
  // If start and end point are practically identical, dividing across chord would collapse circle.
  // Instead, find furthest point and split into two separate arcs.
  const startPt = stroke[0];
  const endPt = stroke[stroke.length - 1];
  const endpointDist = Math.hypot(endPt.x - startPt.x, endPt.y - startPt.y);

  if (endpointDist < 3 && stroke.length >= 6) {
    let maxDistFromStart = -1;
    let splitIdx = Math.floor(stroke.length / 2);
    for (let i = 1; i < stroke.length - 1; i++) {
      const d = Math.hypot(stroke[i].x - startPt.x, stroke[i].y - startPt.y);
      if (d > maxDistFromStart) {
        maxDistFromStart = d;
        splitIdx = i;
      }
    }

    const firstHalf = ramerDouglasPeucker(stroke.slice(0, splitIdx + 1), epsilon);
    const secondHalf = ramerDouglasPeucker(stroke.slice(splitIdx), epsilon);
    return firstHalf.slice(0, firstHalf.length - 1).concat(secondHalf);
  }

  // Standard Ramer-Douglas-Peucker
  let maxDistance = 0;
  let maxIndex = 0;

  for (let i = 1; i < stroke.length - 1; i++) {
    const distance = perpendicularDistance(stroke[i], startPt, endPt);
    if (distance > maxDistance) {
      maxDistance = distance;
      maxIndex = i;
    }
  }

  if (maxDistance > epsilon) {
    // Recursive division
    const leftSegment = ramerDouglasPeucker(stroke.slice(0, maxIndex + 1), epsilon);
    const rightSegment = ramerDouglasPeucker(stroke.slice(maxIndex), epsilon);

    return leftSegment.slice(0, leftSegment.length - 1).concat(rightSegment);
  } else {
    // All intermediate points deviate <= epsilon; retain only endpoints
    return [startPt, endPt];
  }
}

/**
 * Gentle corner rounding and curve relaxation to soften simplified polygonal segments.
 */
function relaxSimplifiedCurve(stroke: GlyphStroke): GlyphStroke {
  if (stroke.length <= 2) return stroke;

  const relaxed: GlyphPoint[] = [stroke[0]];
  for (let i = 0; i < stroke.length - 1; i++) {
    const p0 = stroke[i];
    const p1 = stroke[i + 1];

    const q: GlyphPoint = {
      x: Math.round(0.75 * p0.x + 0.25 * p1.x),
      y: Math.round(0.75 * p0.y + 0.25 * p1.y),
      pressure:
        p0.pressure !== undefined && p1.pressure !== undefined
          ? Math.round((0.75 * p0.pressure + 0.25 * p1.pressure) * 100) / 100
          : p0.pressure,
    };

    const r: GlyphPoint = {
      x: Math.round(0.25 * p0.x + 0.75 * p1.x),
      y: Math.round(0.25 * p0.y + 0.75 * p1.y),
      pressure:
        p0.pressure !== undefined && p1.pressure !== undefined
          ? Math.round((0.25 * p0.pressure + 0.75 * p1.pressure) * 100) / 100
          : p1.pressure,
    };

    relaxed.push(q);
    relaxed.push(r);
  }
  relaxed.push(stroke[stroke.length - 1]);
  return relaxed;
}

/**
 * Simplifies a single stroke using Ramer-Douglas-Peucker algorithm with optional curve relaxation.
 */
export function simplifyStroke(
  stroke: GlyphStroke,
  epsilon: number,
  curveRelaxation = false
): GlyphStroke {
  if (!stroke || stroke.length <= 2) return stroke;

  const simplified = ramerDouglasPeucker(stroke, Math.max(0.2, epsilon));

  if (curveRelaxation && simplified.length >= 3) {
    return relaxSimplifiedCurve(simplified);
  }

  return simplified;
}

/**
 * Simplifies all strokes in a glyph using Ramer-Douglas-Peucker algorithm.
 * Returns new strokes and comprehensive decimation metrics.
 */
export function simplifyGlyphStrokes(
  strokes: GlyphStroke[],
  epsilon: number,
  curveRelaxation = false
): {
  strokes: GlyphStroke[];
  metrics: SimplificationMetrics;
} {
  if (!strokes || strokes.length === 0) {
    return {
      strokes: [],
      metrics: {
        originalPointCount: 0,
        simplifiedPointCount: 0,
        reducedPointCount: 0,
        reductionPercentage: 0,
        maxDeviation: 0,
        averagePointSpacing: 0,
        strokeCount: 0,
      },
    };
  }

  let originalTotal = 0;
  let simplifiedTotal = 0;
  let totalSpacing = 0;
  let spacingSegments = 0;
  let maxDeviationOverall = 0;

  const simplifiedStrokes: GlyphStroke[] = strokes.map((stroke) => {
    originalTotal += stroke.length;

    // Track original spacing
    for (let i = 0; i < stroke.length - 1; i++) {
      totalSpacing += Math.hypot(stroke[i + 1].x - stroke[i].x, stroke[i + 1].y - stroke[i].y);
      spacingSegments++;
    }

    const simplified = simplifyStroke(stroke, epsilon, curveRelaxation);
    simplifiedTotal += simplified.length;

    // Measure maximum deviation between original points and simplified polyline
    for (const origPt of stroke) {
      let minDistToPolyline = Infinity;
      for (let s = 0; s < simplified.length - 1; s++) {
        const d = perpendicularDistance(origPt, simplified[s], simplified[s + 1]);
        if (d < minDistToPolyline) minDistToPolyline = d;
      }
      if (minDistToPolyline > maxDeviationOverall && minDistToPolyline !== Infinity) {
        maxDeviationOverall = minDistToPolyline;
      }
    }

    return simplified;
  });

  const reduced = originalTotal - simplifiedTotal;
  const reductionPercentage =
    originalTotal > 0 ? Math.round((reduced / originalTotal) * 100) : 0;
  const avgSpacing = spacingSegments > 0 ? Math.round((totalSpacing / spacingSegments) * 10) / 10 : 0;

  return {
    strokes: simplifiedStrokes,
    metrics: {
      originalPointCount: originalTotal,
      simplifiedPointCount: simplifiedTotal,
      reducedPointCount: reduced,
      reductionPercentage,
      maxDeviation: Math.round(maxDeviationOverall * 10) / 10,
      averagePointSpacing: avgSpacing,
      strokeCount: strokes.length,
    },
  };
}

/**
 * Batch simplify all characters across an entire font dictionary.
 */
export function batchSimplifyAllGlyphs(
  glyphs: Record<string, GlyphData>,
  epsilon: number,
  curveRelaxation = false
): {
  glyphs: Record<string, GlyphData>;
  totalOriginalPoints: number;
  totalSimplifiedPoints: number;
  totalReducedPoints: number;
  overallReductionPercentage: number;
  modifiedGlyphCount: number;
} {
  const updatedGlyphs: Record<string, GlyphData> = {};
  let totalOriginal = 0;
  let totalSimplified = 0;
  let modifiedCount = 0;

  for (const [char, glyph] of Object.entries(glyphs)) {
    if (!glyph.strokes || glyph.strokes.length === 0) {
      updatedGlyphs[char] = glyph;
      continue;
    }

    const { strokes: simplifiedStrokes, metrics } = simplifyGlyphStrokes(
      glyph.strokes,
      epsilon,
      curveRelaxation
    );

    totalOriginal += metrics.originalPointCount;
    totalSimplified += metrics.simplifiedPointCount;
    if (metrics.reducedPointCount > 0) modifiedCount++;

    // Also simplify alternate variants if present
    const updatedVariants = glyph.variants?.map((v) => {
      if (!v.strokes || v.strokes.length === 0) return v;
      const vResult = simplifyGlyphStrokes(v.strokes, epsilon, curveRelaxation);
      totalOriginal += vResult.metrics.originalPointCount;
      totalSimplified += vResult.metrics.simplifiedPointCount;
      return {
        ...v,
        strokes: vResult.strokes,
      };
    });

    updatedGlyphs[char] = {
      ...glyph,
      strokes: simplifiedStrokes,
      variants: updatedVariants,
      lastModified: Date.now(),
    };
  }

  const totalReduced = totalOriginal - totalSimplified;
  const overallPercentage =
    totalOriginal > 0 ? Math.round((totalReduced / totalOriginal) * 100) : 0;

  return {
    glyphs: updatedGlyphs,
    totalOriginalPoints: totalOriginal,
    totalSimplifiedPoints: totalSimplified,
    totalReducedPoints: totalReduced,
    overallReductionPercentage: overallPercentage,
    modifiedGlyphCount: modifiedCount,
  };
}

/**
 * Draws visual control point handles and ghost preview of simplified path on canvas.
 */
export function drawSimplifyCanvasOverlay(
  ctx: CanvasRenderingContext2D,
  strokes: GlyphStroke[],
  settings: SimplifySettings
): void {
  if (!strokes || strokes.length === 0) return;

  const { strokes: simplifiedStrokes, metrics } = simplifyGlyphStrokes(
    strokes,
    settings.epsilon,
    settings.curveRelaxation
  );

  ctx.save();

  // 1. Ghost preview of simplified polyline if enabled
  if (settings.showLivePreview) {
    ctx.strokeStyle = '#06b6d4'; // Bright cyan vector wireframe
    ctx.lineWidth = 2.5;
    ctx.setLineDash([4, 4]);

    for (const stroke of simplifiedStrokes) {
      if (stroke.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      for (let i = 1; i < stroke.length; i++) {
        ctx.lineTo(stroke[i].x, stroke[i].y);
      }
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  // 2. Control Point Node Handles (vertices retained by RDP)
  if (settings.showControlPoints) {
    for (let sIdx = 0; sIdx < simplifiedStrokes.length; sIdx++) {
      const stroke = simplifiedStrokes[sIdx];
      for (let pIdx = 0; pIdx < stroke.length; pIdx++) {
        const pt = stroke[pIdx];
        const isEndpoint = pIdx === 0 || pIdx === stroke.length - 1;

        ctx.save();
        if (isEndpoint) {
          // Terminal endpoints: square handle
          ctx.fillStyle = pIdx === 0 ? '#10b981' : '#f43f5e'; // Green start, Red end
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.fillRect(pt.x - 4, pt.y - 4, 8, 8);
          ctx.strokeRect(pt.x - 4, pt.y - 4, 8, 8);
        } else {
          // Intermediate RDP vertex: circular node handle
          ctx.fillStyle = '#06b6d4'; // Cyan
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 3.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
        ctx.restore();
      }
    }
  }

  ctx.restore();
}
