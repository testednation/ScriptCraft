import { GlyphData, GlyphStroke } from '../types/font';
import {
  CANVAS_ASCENDER,
  CANVAS_BASELINE,
  CANVAS_CAP_HEIGHT,
  CANVAS_ORIGIN_X,
  CANVAS_X_HEIGHT,
  getStrokesBoundingBox,
} from './fontEngine';

export const OPTICAL_OVERSHOOT_PX = 8; // ~2% optical overshoot for round curves

export interface NormalizationOptions {
  centerHorizontally?: boolean; // Center glyph horizontally between side bearings
  snapBaseline?: boolean; // Snap base to font baseline
  opticalOvershoot?: boolean; // 8px optical overshoot for round-bottomed glyphs (o, c, e, s, a...)
  harmonizeHeight?: boolean; // Harmonize body heights to typographic x-height / cap-height
  harmonizeTolerance?: number; // Max scale adjustment allowed (default 0.18 = ±18%)
}

export interface NormalizationResult {
  strokes: GlyphStroke[];
  deltaX: number;
  deltaY: number;
  scale: number;
  isRound: boolean;
  overshootApplied: boolean;
  char: string;
}

export interface BatchNormalizationReport {
  totalProcessed: number;
  normalizedCount: number;
  overshootCount: number;
  scaledCount: number;
  charsUpdated: string[];
}

// Flat-bottomed characters that should sit flush on the baseline
const FLAT_BASE_CHARS = new Set([
  'b', 'd', 'f', 'h', 'i', 'k', 'l', 'm', 'n', 'r', 't', 'u', 'w', 'x', 'z',
  'B', 'D', 'E', 'F', 'H', 'I', 'K', 'L', 'M', 'N', 'P', 'R', 'T', 'Z',
  '1', '4', '7'
]);

// Round-bottomed characters that optically require overshoot below the baseline
const ROUND_BASE_CHARS = new Set([
  'a', 'c', 'e', 'g', 'o', 'q', 's',
  'C', 'G', 'J', 'O', 'Q', 'S', 'U',
  '0', '3', '5', '6', '8', '9'
]);

// Lowercase letters with standard descenders
const DESCENDER_CHARS = new Set(['g', 'j', 'p', 'q', 'y']);

// Standard lowercase body letters that define x-height
const BODY_LOWERCASE_CHARS = new Set([
  'a', 'c', 'e', 'm', 'n', 'o', 'r', 's', 'u', 'v', 'w', 'x', 'z'
]);

// Uppercase capital letters that define cap-height
const CAP_CHARS = new Set([
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
  'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'
]);

export function isFlatBaseChar(char: string): boolean {
  return FLAT_BASE_CHARS.has(char);
}

export function isRoundBaseChar(char: string): boolean {
  return ROUND_BASE_CHARS.has(char);
}

export function isDescenderChar(char: string): boolean {
  return DESCENDER_CHARS.has(char);
}

export function isBodyLowercaseChar(char: string): boolean {
  return BODY_LOWERCASE_CHARS.has(char);
}

export function isCapChar(char: string): boolean {
  return CAP_CHARS.has(char);
}

/**
 * Normalizes strokes for a single glyph according to typographic rules:
 * - Center horizontally between side bearings
 * - Snap baseline (with optical overshoot if curved)
 * - Harmonize height towards standard x-height / cap-height
 */
export function normalizeGlyphStrokes(
  char: string,
  strokes: GlyphStroke[],
  advanceWidth: number = 600,
  options: NormalizationOptions = {}
): NormalizationResult {
  const {
    centerHorizontally = true,
    snapBaseline = true,
    opticalOvershoot = true,
    harmonizeHeight = false,
    harmonizeTolerance = 0.18,
  } = options;

  const bbox = getStrokesBoundingBox(strokes);
  if (!bbox || strokes.length === 0) {
    return {
      strokes,
      deltaX: 0,
      deltaY: 0,
      scale: 1,
      isRound: false,
      overshootApplied: false,
      char,
    };
  }

  const isRound = isRoundBaseChar(char);
  const isDesc = isDescenderChar(char);
  const isBody = isBodyLowercaseChar(char);
  const isCap = isCapChar(char);

  let scale = 1.0;
  let currentStrokes = strokes;

  // 1. Harmonize height if enabled
  if (harmonizeHeight && bbox.height > 40) {
    let targetH = 0;
    if (isBody) {
      targetH = CANVAS_BASELINE - CANVAS_X_HEIGHT; // 200px
    } else if (isCap) {
      targetH = CANVAS_BASELINE - CANVAS_CAP_HEIGHT; // 360px
    }

    if (targetH > 0) {
      const rawScale = targetH / bbox.height;
      const minScale = 1 - harmonizeTolerance;
      const maxScale = 1 + harmonizeTolerance;
      scale = Math.max(minScale, Math.min(maxScale, rawScale));

      if (Math.abs(scale - 1.0) > 0.02) {
        // Scale vertically & horizontally around stroke center
        const cx = bbox.centerX;
        const cy = bbox.maxY; // anchor near base
        currentStrokes = currentStrokes.map((stroke) =>
          stroke.map((pt) => ({
            ...pt,
            x: Math.round((cx + (pt.x - cx) * scale) * 100) / 100,
            y: Math.round((cy + (pt.y - cy) * scale) * 100) / 100,
          }))
        );
      }
    }
  }

  // Recalculate bounding box after possible scale
  const updatedBBox = getStrokesBoundingBox(currentStrokes) || bbox;

  // 2. Baseline alignment & optical overshoot
  let deltaY = 0;
  let overshootApplied = false;

  if (snapBaseline) {
    if (!isDesc) {
      let targetBaseline = CANVAS_BASELINE;
      if (opticalOvershoot && isRound) {
        targetBaseline += OPTICAL_OVERSHOOT_PX;
        overshootApplied = true;
      }
      deltaY = Math.round(targetBaseline - updatedBBox.maxY);
    } else {
      // For descender characters (g, p, y, q, j):
      // The descender should extend below baseline, so align approximately 65% height mark to baseline
      const estimatedBaselineTarget = CANVAS_BASELINE + OPTICAL_OVERSHOOT_PX;
      // Estimate baseline from top 65% of glyph
      const bodyBaseY = updatedBBox.minY + updatedBBox.height * 0.65;
      deltaY = Math.round(estimatedBaselineTarget - bodyBaseY);
    }
  }

  // 3. Horizontal centering
  let deltaX = 0;
  if (centerHorizontally) {
    const leftX = CANVAS_ORIGIN_X;
    const rightX = leftX + advanceWidth * 0.72;
    const targetCenterX = (leftX + rightX) / 2;
    deltaX = Math.round(targetCenterX - updatedBBox.centerX);
  }

  // Apply delta shifts
  const shiftedStrokes = currentStrokes.map((stroke) =>
    stroke.map((pt) => ({
      ...pt,
      x: Math.round((pt.x + deltaX) * 100) / 100,
      y: Math.round((pt.y + deltaY) * 100) / 100,
    }))
  );

  return {
    strokes: shiftedStrokes,
    deltaX,
    deltaY,
    scale,
    isRound,
    overshootApplied,
    char,
  };
}

/**
 * Batch normalizes all completed glyphs across the typeface.
 */
export function batchNormalizeAllGlyphs(
  glyphs: Record<string, GlyphData>,
  options: NormalizationOptions = {}
): { updatedGlyphs: Record<string, GlyphData>; report: BatchNormalizationReport } {
  const updatedGlyphs: Record<string, GlyphData> = { ...glyphs };
  let totalProcessed = 0;
  let normalizedCount = 0;
  let overshootCount = 0;
  let scaledCount = 0;
  const charsUpdated: string[] = [];

  for (const [char, glyphData] of Object.entries(glyphs)) {
    if (!glyphData || !glyphData.strokes || glyphData.strokes.length === 0) continue;

    totalProcessed++;
    const res = normalizeGlyphStrokes(char, glyphData.strokes, glyphData.advanceWidth, options);

    // Also normalize any alternate variants
    let updatedVariants = glyphData.variants;
    if (glyphData.variants && glyphData.variants.length > 0) {
      updatedVariants = glyphData.variants.map((v) => {
        if (!v.strokes || v.strokes.length === 0) return v;
        const vRes = normalizeGlyphStrokes(
          char,
          v.strokes,
          v.advanceWidth || glyphData.advanceWidth,
          options
        );
        return {
          ...v,
          strokes: vRes.strokes,
        };
      });
    }

    if (res.deltaX !== 0 || res.deltaY !== 0 || res.scale !== 1.0) {
      normalizedCount++;
      charsUpdated.push(char);
      if (res.overshootApplied) overshootCount++;
      if (res.scale !== 1.0) scaledCount++;

      updatedGlyphs[char] = {
        ...glyphData,
        strokes: res.strokes,
        variants: updatedVariants,
        lastModified: Date.now(),
      };
    }
  }

  return {
    updatedGlyphs,
    report: {
      totalProcessed,
      normalizedCount,
      overshootCount,
      scaledCount,
      charsUpdated,
    },
  };
}
