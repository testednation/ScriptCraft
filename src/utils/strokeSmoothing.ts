import { GlyphPoint, GlyphStroke, GlyphData } from '../types/font';
import { CANVAS_BASELINE, CANVAS_DESCENDER } from './fontEngine';

/**
 * Chaikin's algorithm for corner-cutting smoothing of vector strokes.
 * Produces smooth, fluid handwriting curves without hand-shake micro-wobbles.
 */
export function chaikinSmoothStroke(stroke: GlyphStroke, iterations = 1): GlyphStroke {
  if (stroke.length <= 2) return stroke;

  let current = stroke;

  for (let it = 0; it < iterations; it++) {
    const next: GlyphPoint[] = [];
    next.push(current[0]); // Keep start point

    for (let i = 0; i < current.length - 1; i++) {
      const p0 = current[i];
      const p1 = current[i + 1];

      // Q = 0.75*p0 + 0.25*p1
      const q: GlyphPoint = {
        x: Math.round(0.75 * p0.x + 0.25 * p1.x),
        y: Math.round(0.75 * p0.y + 0.25 * p1.y),
        pressure:
          p0.pressure !== undefined && p1.pressure !== undefined
            ? Math.round((0.75 * p0.pressure + 0.25 * p1.pressure) * 100) / 100
            : p0.pressure ?? 1,
      };

      // R = 0.25*p0 + 0.75*p1
      const r: GlyphPoint = {
        x: Math.round(0.25 * p0.x + 0.75 * p1.x),
        y: Math.round(0.25 * p0.y + 0.75 * p1.y),
        pressure:
          p0.pressure !== undefined && p1.pressure !== undefined
            ? Math.round((0.25 * p0.pressure + 0.75 * p1.pressure) * 100) / 100
            : p1.pressure ?? 1,
      };

      next.push(q);
      next.push(r);
    }

    next.push(current[current.length - 1]); // Keep end point
    current = next;
  }

  return current;
}

/**
 * Filter out high-frequency hand tremors and mouse jitter.
 * Removes points that jitter back and forth within a small threshold.
 */
export function removeTremorJitter(stroke: GlyphStroke, minDistance = 3): GlyphStroke {
  if (stroke.length <= 2) return stroke;

  const result: GlyphPoint[] = [stroke[0]];

  for (let i = 1; i < stroke.length - 1; i++) {
    const prev = result[result.length - 1];
    const curr = stroke[i];
    const dist = Math.hypot(curr.x - prev.x, curr.y - prev.y);

    if (dist >= minDistance) {
      result.push(curr);
    }
  }

  // Always keep the final point
  result.push(stroke[stroke.length - 1]);
  return result;
}

/**
 * Taper entrance and exit pressures to emulate fountain pen nib landing and lifting.
 */
export function applyNaturalPenTapers(stroke: GlyphStroke): GlyphStroke {
  if (stroke.length <= 2) return stroke;

  return stroke.map((pt, idx) => {
    let pressure = pt.pressure ?? 1;

    // First 3 points taper in
    if (idx === 0) pressure = Math.min(pressure, 0.45);
    else if (idx === 1) pressure = Math.min(pressure, 0.7);
    else if (idx === 2) pressure = Math.min(pressure, 0.88);

    // Last 3 points taper out (flick)
    const fromEnd = stroke.length - 1 - idx;
    if (fromEnd === 0) pressure = Math.min(pressure, 0.35);
    else if (fromEnd === 1) pressure = Math.min(pressure, 0.6);
    else if (fromEnd === 2) pressure = Math.min(pressure, 0.85);

    return { ...pt, pressure };
  });
}

/**
 * Real-time point stabilization for live drawing.
 * Computes an exponentially smoothed target point from the incoming raw pointer position.
 * @param rawPt The current raw point received from pointer event
 * @param lastPt The previous smoothed point in the active stroke
 * @param smoothing Smoothing factor from 0 (Raw) to 1 (Stabilized)
 * @returns Stabilized point or null if distance is below the micro-jitter threshold
 */
export function stabilizePointRealtime(
  rawPt: GlyphPoint,
  lastPt: GlyphPoint,
  smoothing: number
): GlyphPoint | null {
  const s = Math.max(0, Math.min(1, smoothing));
  if (s === 0) {
    // 100% Raw: capture every raw tremor, only filter exact duplicate positions
    if (Math.hypot(rawPt.x - lastPt.x, rawPt.y - lastPt.y) < 1.2) return null;
    return rawPt;
  }

  // Adaptive exponential filter:
  // s = 0.2 -> alpha = 0.85 (responsive, light tremor reduction)
  // s = 0.5 -> alpha = 0.55 (natural cursive stabilization)
  // s = 0.8 -> alpha = 0.28 (silky smooth)
  // s = 1.0 -> alpha = 0.12 (heavy calligraphic stabilizer)
  const alpha = Math.max(0.12, 1.0 - s * 0.85);

  const targetX = Math.round(lastPt.x + (rawPt.x - lastPt.x) * alpha);
  const targetY = Math.round(lastPt.y + (rawPt.y - lastPt.y) * alpha);

  // Dynamic distance threshold to eliminate micro-jitter without losing fast curves
  const minDist = 1.8 + s * 3.5;
  if (Math.hypot(targetX - lastPt.x, targetY - lastPt.y) < minDist) {
    return null;
  }

  let finalPressure = rawPt.pressure ?? 1;
  if (lastPt.pressure !== undefined && rawPt.pressure !== undefined) {
    finalPressure = Math.round((lastPt.pressure * (1 - alpha) + rawPt.pressure * alpha) * 100) / 100;
  }

  return {
    x: targetX,
    y: targetY,
    pressure: finalPressure,
  };
}

/**
 * Finalizes and relaxes a drawn stroke based on smoothing level.
 * When smoothing is 0 (Raw), returns stroke unmodified.
 * When smoothing > 0, removes jitter, applies Chaikin smoothing and natural pen tapers.
 */
export function finalizeStrokeWithSmoothing(
  stroke: GlyphStroke,
  smoothing: number
): GlyphStroke {
  if (stroke.length <= 2 || smoothing < 0.15) {
    return stroke; // Keep raw authentic path
  }

  const s = Math.max(0, Math.min(1, smoothing));
  let result = stroke;

  // Step 1: Remove tremor jitter with threshold proportional to smoothing
  const jitterDist = 1.5 + s * 3.0;
  result = removeTremorJitter(result, jitterDist);

  // Step 2: Chaikin smoothing
  const iterations = s >= 0.7 ? 2 : 1;
  result = chaikinSmoothStroke(result, iterations);

  // Step 3: Natural pen tapers if smoothing is moderate to high
  if (s >= 0.35) {
    result = applyNaturalPenTapers(result);
  }

  return result;
}

/**
 * Snaps the lowest points of a glyph to the typographic baseline.
 * If the glyph naturally rests on the baseline (not descenders like g, p, y, q, j),
 * aligns its bottom-most resting contact points to CANVAS_BASELINE.
 */
export function snapGlyphToBaseline(
  char: string,
  strokes: GlyphStroke[],
  targetBaseline = CANVAS_BASELINE
): GlyphStroke[] {
  if (strokes.length === 0) return strokes;

  // Characters with natural descenders that go below the baseline
  const descenderChars = new Set(['g', 'j', 'p', 'q', 'y', ',', ';']);
  if (descenderChars.has(char)) {
    // For descenders, do not force the lowest point to baseline
    return strokes;
  }

  // Find lowest point (max Y in canvas coordinate system where Y increases downwards)
  let maxY = -Infinity;
  for (const stroke of strokes) {
    for (const pt of stroke) {
      if (pt.y > maxY) maxY = pt.y;
    }
  }

  if (maxY === -Infinity) return strokes;

  // If already close to baseline (within 80px), shift smoothly
  const dy = targetBaseline - maxY;
  if (Math.abs(dy) > 120) return strokes; // Too far, user may have drawn punctuation or high element

  return strokes.map((stroke) =>
    stroke.map((pt) => ({
      ...pt,
      y: Math.round(pt.y + dy),
    }))
  );
}

/**
 * Full beautifier pipeline for a set of strokes:
 * 1. Tremor removal
 * 2. Chaikin curve smoothing
 * 3. Entrance/exit pen tapers
 */
export function beautifyGlyphStrokes(
  char: string,
  strokes: GlyphStroke[],
  options: {
    smoothIterations?: number;
    removeJitter?: boolean;
    snapBaseline?: boolean;
    addTapers?: boolean;
  } = {}
): GlyphStroke[] {
  const {
    smoothIterations = 1,
    removeJitter = true,
    snapBaseline = true,
    addTapers = true,
  } = options;

  let processed = strokes.map((s) => [...s]);

  // Step 1: Remove tremor jitter
  if (removeJitter) {
    processed = processed.map((s) => removeTremorJitter(s, 3.5));
  }

  // Step 2: Chaikin smoothing
  if (smoothIterations > 0) {
    processed = processed.map((s) => chaikinSmoothStroke(s, smoothIterations));
  }

  // Step 3: Natural pen tapers
  if (addTapers) {
    processed = processed.map((s) => applyNaturalPenTapers(s));
  }

  // Step 4: Baseline snapping
  if (snapBaseline) {
    processed = snapGlyphToBaseline(char, processed);
  }

  return processed;
}

/**
 * Batch beautify all glyphs in the entire font.
 */
export function batchBeautifyAllGlyphs(
  glyphs: Record<string, GlyphData>,
  options: {
    smoothIterations?: number;
    removeJitter?: boolean;
    snapBaseline?: boolean;
  } = {}
): Record<string, GlyphData> {
  const result: Record<string, GlyphData> = {};

  for (const [char, glyph] of Object.entries(glyphs)) {
    if (!glyph || glyph.strokes.length === 0) {
      result[char] = glyph;
      continue;
    }

    const beautifiedStrokes = beautifyGlyphStrokes(char, glyph.strokes, options);

    // Also beautify variants if present
    const beautifiedVariants = glyph.variants?.map((v) => ({
      ...v,
      strokes: beautifyGlyphStrokes(char, v.strokes, options),
    }));

    result[char] = {
      ...glyph,
      strokes: beautifiedStrokes,
      variants: beautifiedVariants,
      lastModified: Date.now(),
    };
  }

  return result;
}
