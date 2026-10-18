import { GlyphData } from '../types/font';
import { CANVAS_ASCENDER, CANVAS_BASELINE, CANVAS_SIZE } from './fontEngine';

export type SpacingPreset = 'tight' | 'balanced' | 'airy';

export interface SpacingResult {
  leftBearing: number;
  rightBearing: number;
  advanceWidth: number;
}

/**
 * Calculates optical left and right side bearings for a glyph based on its stroke geometry.
 */
export function calculateGlyphBearing(
  glyph: GlyphData,
  baseWidth = 14,
  preset: SpacingPreset = 'balanced',
  unitsPerEm = 1000
): SpacingResult {
  if (!glyph.strokes || glyph.strokes.length === 0) {
    const defaultAdvance = glyph.char === ' ' ? 360 : 600;
    return {
      leftBearing: 80,
      rightBearing: 80,
      advanceWidth: defaultAdvance,
    };
  }

  // Calculate canvas bounding box
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const stroke of glyph.strokes) {
    for (const pt of stroke) {
      if (pt.x < minX) minX = pt.x;
      if (pt.x > maxX) maxX = pt.x;
      if (pt.y < minY) minY = pt.y;
      if (pt.y > maxY) maxY = pt.y;
    }
  }

  if (minX === Infinity || maxX === -Infinity) {
    return { leftBearing: 80, rightBearing: 80, advanceWidth: 600 };
  }

  // Account for stroke thickness
  const halfStroke = baseWidth / 2;
  const strokeMinX = Math.max(0, minX - halfStroke);
  const strokeMaxX = Math.min(CANVAS_SIZE, maxX + halfStroke);
  const canvasWidth = strokeMaxX - strokeMinX;

  // Conversion scale to font units
  const scale = (unitsPerEm * 0.8) / (CANVAS_BASELINE - CANVAS_ASCENDER);
  const fontDrawnWidth = Math.round(canvasWidth * scale);

  // Preset multiplier
  const multiplier = preset === 'tight' ? 0.75 : preset === 'airy' ? 1.3 : 1.0;

  // Base bearing range: 60 to 90 font units
  let baseLSB = 75 * multiplier;
  let baseRSB = 75 * multiplier;

  const c = glyph.char;

  // Typographic optical adjustments:
  // 1. Diagonal overhangs (A, V, W, Y, v, w, y) have large negative side pockets
  if (['A', 'V', 'W', 'Y', 'v', 'w', 'y'].includes(c)) {
    baseLSB *= 0.75;
    baseRSB *= 0.75;
  }
  // 2. T, F, P have top overhangs and empty lower side space
  else if (['T', 'F', 'P'].includes(c)) {
    baseLSB *= 0.8;
    baseRSB *= 0.7;
  }
  // 3. Rounded bowls (O, C, G, o, c, e, 0) curve away from the margin line
  else if (['O', 'C', 'G', 'Q', 'o', 'c', 'e', '0', 's', 'S'].includes(c)) {
    baseLSB *= 0.85;
    baseRSB *= 0.85;
  }
  // 4. Straight vertical stems (H, I, M, N, l, 1) need full solid breathing room
  else if (['H', 'I', 'M', 'N', 'l', '1'].includes(c)) {
    baseLSB *= 1.05;
    baseRSB *= 1.05;
  }
  // 5. Narrow punctuation (period, comma, colon)
  else if (['.', ',', ':', ';', '!', "'", '"'].includes(c)) {
    baseLSB = Math.max(40, 50 * multiplier);
    baseRSB = Math.max(60, 80 * multiplier); // Extra right bearing for word flow
  }

  const finalLSB = Math.round(Math.max(30, baseLSB));
  const finalRSB = Math.round(Math.max(30, baseRSB));
  const finalAdvance = Math.round(finalLSB + fontDrawnWidth + finalRSB);

  return {
    leftBearing: finalLSB,
    rightBearing: finalRSB,
    advanceWidth: finalAdvance,
  };
}

/**
 * Batch calculates and applies optical side bearings to all glyphs in the collection.
 */
export function autoCalculateAllBearings(
  glyphs: Record<string, GlyphData>,
  baseWidth = 14,
  preset: SpacingPreset = 'balanced',
  unitsPerEm = 1000
): Record<string, GlyphData> {
  const updated: Record<string, GlyphData> = {};

  for (const [char, glyph] of Object.entries(glyphs)) {
    if (!glyph) continue;
    const { leftBearing, rightBearing, advanceWidth } = calculateGlyphBearing(
      glyph,
      baseWidth,
      preset,
      unitsPerEm
    );

    updated[char] = {
      ...glyph,
      leftBearing,
      rightBearing,
      advanceWidth,
      lastModified: Date.now(),
    };
  }

  return updated;
}
