import { GlyphPoint, GlyphStroke } from '../types/font';

/**
 * Linearly interpolates between two GlyphPoints at parameter t in [0, 1].
 */
function interpolatePoint(A: GlyphPoint, B: GlyphPoint, t: number): GlyphPoint {
  const clampedT = Math.max(0, Math.min(1, t));
  const pA = A.pressure !== undefined ? A.pressure : 1;
  const pB = B.pressure !== undefined ? B.pressure : 1;
  return {
    x: Math.round(A.x + (B.x - A.x) * clampedT),
    y: Math.round(A.y + (B.y - A.y) * clampedT),
    pressure: Math.round((pA + (pB - pA) * clampedT) * 100) / 100,
  };
}

/**
 * Selectively erases portions of a single continuous stroke within a circle of (cx, cy, r).
 * Intersects each segment with the circle boundary and cleanly splits the stroke
 * into sub-strokes if cut through the middle, excising only the exact internal points.
 */
function eraseSingleStroke(
  stroke: GlyphStroke,
  cx: number,
  cy: number,
  r: number
): { subStrokes: GlyphStroke[]; changed: boolean } {
  if (!stroke || stroke.length === 0) {
    return { subStrokes: [], changed: false };
  }

  // Fast bounding box check
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const pt of stroke) {
    if (pt.x < minX) minX = pt.x;
    if (pt.x > maxX) maxX = pt.x;
    if (pt.y < minY) minY = pt.y;
    if (pt.y > maxY) maxY = pt.y;
  }

  if (cx + r < minX || cx - r > maxX || cy + r < minY || cy - r > maxY) {
    // Entire stroke is outside eraser circle bounding box
    return { subStrokes: [stroke], changed: false };
  }

  // Single-point dot case
  if (stroke.length === 1) {
    const dist = Math.hypot(stroke[0].x - cx, stroke[0].y - cy);
    if (dist <= r) {
      return { subStrokes: [], changed: true };
    }
    return { subStrokes: [stroke], changed: false };
  }

  let changed = false;
  const subStrokes: GlyphStroke[] = [];
  let currentSub: GlyphPoint[] = [];

  const rSq = r * r;

  for (let i = 0; i < stroke.length - 1; i++) {
    const A = stroke[i];
    const B = stroke[i + 1];

    const distSqA = (A.x - cx) ** 2 + (A.y - cy) ** 2;
    const distSqB = (B.x - cx) ** 2 + (B.y - cy) ** 2;

    const inA = distSqA <= rSq;
    const inB = distSqB <= rSq;

    const dx = B.x - A.x;
    const dy = B.y - A.y;
    const lenSq = dx * dx + dy * dy;

    if (lenSq === 0) {
      // Zero length segment
      if (!inA) {
        if (currentSub.length === 0) currentSub.push(A);
      } else {
        changed = true;
      }
      continue;
    }

    // Solve quadratic equation for intersection with circle:
    // |A + t*(B - A) - C|^2 = r^2
    const fx = A.x - cx;
    const fy = A.y - cy;
    const a = lenSq;
    const b = 2 * (fx * dx + fy * dy);
    const c = fx * fx + fy * fy - rSq;
    const discriminant = b * b - 4 * a * c;

    if (!inA && !inB) {
      // Both points are outside. Does the line segment cut across the circle interior?
      if (discriminant > 0) {
        const sqrtDisc = Math.sqrt(discriminant);
        const t1 = (-b - sqrtDisc) / (2 * a);
        const t2 = (-b + sqrtDisc) / (2 * a);

        if (t1 > 0 && t2 < 1 && t1 < t2) {
          // Segment enters circle at t1 and exits at t2
          changed = true;
          const pEnter = interpolatePoint(A, B, t1);
          const pExit = interpolatePoint(A, B, t2);

          if (currentSub.length === 0) currentSub.push(A);
          currentSub.push(pEnter);
          if (currentSub.length >= 2) {
            subStrokes.push(currentSub);
          }
          currentSub = [pExit, B];
          continue;
        }
      }

      // Completely outside the circle
      if (currentSub.length === 0) currentSub.push(A);
      currentSub.push(B);
    } else if (!inA && inB) {
      // Enters the circle
      changed = true;
      let t = 0.5;
      if (discriminant >= 0) {
        const sqrtDisc = Math.sqrt(discriminant);
        const t1 = (-b - sqrtDisc) / (2 * a);
        const t2 = (-b + sqrtDisc) / (2 * a);
        if (t1 >= 0 && t1 <= 1) t = t1;
        else if (t2 >= 0 && t2 <= 1) t = t2;
      }
      const pEnter = interpolatePoint(A, B, t);

      if (currentSub.length === 0) currentSub.push(A);
      currentSub.push(pEnter);
      if (currentSub.length >= 2) {
        subStrokes.push(currentSub);
      }
      currentSub = [];
    } else if (inA && !inB) {
      // Exits the circle
      changed = true;
      let t = 0.5;
      if (discriminant >= 0) {
        const sqrtDisc = Math.sqrt(discriminant);
        const t1 = (-b - sqrtDisc) / (2 * a);
        const t2 = (-b + sqrtDisc) / (2 * a);
        if (t2 >= 0 && t2 <= 1) t = t2;
        else if (t1 >= 0 && t1 <= 1) t = t1;
      }
      const pExit = interpolatePoint(A, B, t);
      currentSub = [pExit, B];
    } else {
      // Both inA and inB are inside the circle: wholly excised
      changed = true;
      if (currentSub.length >= 2) {
        subStrokes.push(currentSub);
      }
      currentSub = [];
    }
  }

  // Push final remaining sub-stroke
  if (currentSub.length >= 2) {
    subStrokes.push(currentSub);
  }

  return { subStrokes, changed };
}

/**
 * Selectively erases segments of glyph strokes within an eraser circular radius at (eraserX, eraserY).
 *
 * @param strokes The current array of glyph strokes.
 * @param eraserX Center X coordinate of eraser in canvas space.
 * @param eraserY Center Y coordinate of eraser in canvas space.
 * @param radius Radius of the circular eraser.
 * @returns Object with updated strokes and a boolean indicating if any strokes changed.
 */
export function eraseStrokeSegments(
  strokes: GlyphStroke[],
  eraserX: number,
  eraserY: number,
  radius: number
): { strokes: GlyphStroke[]; changed: boolean } {
  if (!strokes || strokes.length === 0) {
    return { strokes, changed: false };
  }

  let anyChanged = false;
  const resultStrokes: GlyphStroke[] = [];

  for (const stroke of strokes) {
    const { subStrokes, changed } = eraseSingleStroke(stroke, eraserX, eraserY, radius);
    if (changed) {
      anyChanged = true;
    }
    resultStrokes.push(...subStrokes);
  }

  return { strokes: resultStrokes, changed: anyChanged };
}

/**
 * Sweeps the eraser along a continuous line path from (x1, y1) to (x2, y2).
 * This ensures that rapid mouse or stylus drags don't skip over strokes between pointer event frames.
 */
export function eraseStrokeSegmentsAlongPath(
  strokes: GlyphStroke[],
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  radius: number
): { strokes: GlyphStroke[]; changed: boolean } {
  const dist = Math.hypot(x2 - x1, y2 - y1);
  const stepSize = Math.max(4, radius * 0.45);
  const steps = Math.max(1, Math.ceil(dist / stepSize));

  let currentStrokes = strokes;
  let anyChanged = false;

  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const cx = Math.round(x1 + (x2 - x1) * t);
    const cy = Math.round(y1 + (y2 - y1) * t);

    const result = eraseStrokeSegments(currentStrokes, cx, cy, radius);
    if (result.changed) {
      anyChanged = true;
      currentStrokes = result.strokes;
    }
  }

  return { strokes: currentStrokes, changed: anyChanged };
}

/**
 * Removes whole strokes if any of their points fall within radius of (eraserX, eraserY).
 */
export function eraseWholeStrokesAtPoint(
  strokes: GlyphStroke[],
  eraserX: number,
  eraserY: number,
  radius: number
): { strokes: GlyphStroke[]; changed: boolean } {
  if (!strokes || strokes.length === 0) {
    return { strokes, changed: false };
  }

  let anyChanged = false;
  const remaining = strokes.filter((stroke) => {
    for (const pt of stroke) {
      if (Math.hypot(pt.x - eraserX, pt.y - eraserY) <= radius) {
        anyChanged = true;
        return false;
      }
    }
    return true;
  });

  return { strokes: remaining, changed: anyChanged };
}

