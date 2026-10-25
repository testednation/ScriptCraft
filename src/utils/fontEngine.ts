import opentype from 'opentype.js';
import { FontMetadata, GlyphData, GlyphStroke, KerningMap, LigatureData } from '../types/font';
import { skewGlyphStrokes } from './slantCorrection';
export { skewGlyphStrokes };

// Canvas dimension constants
export const CANVAS_SIZE = 800;
export const CANVAS_BASELINE = 600;
export const CANVAS_ASCENDER = 160;
export const CANVAS_CAP_HEIGHT = 240;
export const CANVAS_X_HEIGHT = 400;
export const CANVAS_DESCENDER = 760;
export const CANVAS_ORIGIN_X = 120;

// Convert canvas coordinates to Font units (1000 unitsPerEm)
export function canvasToFontPoint(
  x: number,
  y: number,
  unitsPerEm = 1000
): { x: number; y: number } {
  // 500 canvas px between baseline (600) and ascender (160) = 440px -> 800 font units
  // Scale factor: 800 / 440 ≈ 1.818
  const scale = (unitsPerEm * 0.8) / (CANVAS_BASELINE - CANVAS_ASCENDER);
  const fontX = (x - CANVAS_ORIGIN_X) * scale;
  const fontY = (CANVAS_BASELINE - y) * scale;
  return { x: Math.round(fontX), y: Math.round(fontY) };
}

// Convert Font units back to canvas coordinates
export function fontToCanvasPoint(
  fontX: number,
  fontY: number,
  unitsPerEm = 1000
): { x: number; y: number } {
  const scale = (unitsPerEm * 0.8) / (CANVAS_BASELINE - CANVAS_ASCENDER);
  const x = fontX / scale + CANVAS_ORIGIN_X;
  const y = CANVAS_BASELINE - fontY / scale;
  return { x, y };
}

/**
 * Rotates an array of glyph strokes around a pivot point
 * (defaults to strokes bounding box horizontal center and baseline)
 */
export function rotateGlyphStrokes(
  strokes: GlyphStroke[],
  angleDegrees: number,
  customPivotX?: number,
  customPivotY?: number
): GlyphStroke[] {
  if (!angleDegrees || strokes.length === 0) return strokes;

  const rad = (angleDegrees * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  let pivotX = customPivotX;
  let pivotY = customPivotY;
  if (pivotX === undefined || pivotY === undefined) {
    let minX = Infinity;
    let maxX = -Infinity;
    for (const stroke of strokes) {
      for (const pt of stroke) {
        if (pt.x < minX) minX = pt.x;
        if (pt.x > maxX) maxX = pt.x;
      }
    }
    pivotX = minX !== Infinity ? (minX + maxX) / 2 : CANVAS_ORIGIN_X + 240;
    pivotY = CANVAS_BASELINE;
  }

  return strokes.map((stroke) =>
    stroke.map((pt) => {
      const dx = pt.x - pivotX!;
      const dy = pt.y - pivotY!;
      return {
        ...pt,
        x: Math.round((pivotX! + dx * cos - dy * sin) * 100) / 100,
        y: Math.round((pivotY! + dx * sin + dy * cos) * 100) / 100,
      };
    })
  );
}

/**
 * Mirrors glyph strokes horizontally around horizontal center
 */
export function mirrorStrokesHorizontal(
  strokes: GlyphStroke[],
  customCenterX?: number
): GlyphStroke[] {
  if (!strokes || strokes.length === 0) return [];
  let minX = Infinity;
  let maxX = -Infinity;
  for (const stroke of strokes) {
    for (const pt of stroke) {
      if (pt.x < minX) minX = pt.x;
      if (pt.x > maxX) maxX = pt.x;
    }
  }
  const centerX =
    customCenterX !== undefined
      ? customCenterX
      : minX !== Infinity
      ? (minX + maxX) / 2
      : CANVAS_ORIGIN_X + 240;

  return strokes.map((stroke) =>
    stroke.map((pt) => ({
      ...pt,
      x: Math.round((2 * centerX - pt.x) * 100) / 100,
    }))
  );
}

/**
 * Mirrors glyph strokes vertically around vertical center
 */
export function mirrorStrokesVertical(
  strokes: GlyphStroke[],
  customCenterY?: number
): GlyphStroke[] {
  if (!strokes || strokes.length === 0) return [];
  let minY = Infinity;
  let maxY = -Infinity;
  for (const stroke of strokes) {
    for (const pt of stroke) {
      if (pt.y < minY) minY = pt.y;
      if (pt.y > maxY) maxY = pt.y;
    }
  }
  const centerY =
    customCenterY !== undefined
      ? customCenterY
      : minY !== Infinity
      ? (minY + maxY) / 2
      : (CANVAS_BASELINE + CANVAS_X_HEIGHT) / 2;

  return strokes.map((stroke) =>
    stroke.map((pt) => ({
      ...pt,
      y: Math.round((2 * centerY - pt.y) * 100) / 100,
    }))
  );
}

/**
 * Calculates bounding box of glyph strokes
 */
export function getStrokesBoundingBox(strokes: GlyphStroke[]): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
} | null {
  if (!strokes || strokes.length === 0) return null;
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

  if (minX === Infinity) return null;
  return {
    minX,
    maxX,
    minY,
    maxY,
    width: Math.max(0, maxX - minX),
    height: Math.max(0, maxY - minY),
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
  };
}

export type CenteringVerticalMode = 'ascender-descender' | 'ascender-baseline' | 'cap-baseline';

/**
 * Automatically calculates the bounding box of glyph strokes and shifts
 * them so that they are horizontally and vertically centered within the
 * font's metric boundaries.
 */
export function centerGlyphStrokes(
  strokes: GlyphStroke[],
  options?: {
    advanceWidth?: number;
    verticalMode?: CenteringVerticalMode;
    customTargetCenterX?: number;
    customTargetCenterY?: number;
  }
): {
  strokes: GlyphStroke[];
  deltaX: number;
  deltaY: number;
  bbox: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    width: number;
    height: number;
    centerX: number;
    centerY: number;
  } | null;
} {
  const bbox = getStrokesBoundingBox(strokes);
  if (!bbox || strokes.length === 0) {
    return { strokes, deltaX: 0, deltaY: 0, bbox: null };
  }

  // Horizontal metric bounds:
  // Left side bearing is CANVAS_ORIGIN_X (120)
  // Right boundary is CANVAS_ORIGIN_X + advanceWidth * 0.72
  const leftX = CANVAS_ORIGIN_X;
  const advance = options?.advanceWidth ?? 600;
  const rightX = leftX + advance * 0.72;
  const targetCenterX =
    options?.customTargetCenterX !== undefined
      ? options.customTargetCenterX
      : (leftX + rightX) / 2;

  // Vertical metric bounds:
  // Standard typographic em-box boundary is between Ascender (160) and Descender (760)
  let topY = CANVAS_ASCENDER;
  let bottomY = CANVAS_DESCENDER;

  if (options?.verticalMode === 'ascender-baseline') {
    topY = CANVAS_ASCENDER;
    bottomY = CANVAS_BASELINE;
  } else if (options?.verticalMode === 'cap-baseline') {
    topY = CANVAS_CAP_HEIGHT;
    bottomY = CANVAS_BASELINE;
  }

  const targetCenterY =
    options?.customTargetCenterY !== undefined
      ? options.customTargetCenterY
      : (topY + bottomY) / 2;

  const deltaX = Math.round(targetCenterX - bbox.centerX);
  const deltaY = Math.round(targetCenterY - bbox.centerY);

  if (deltaX === 0 && deltaY === 0) {
    return { strokes, deltaX: 0, deltaY: 0, bbox };
  }

  const centeredStrokes = strokes.map((stroke) =>
    stroke.map((pt) => ({
      ...pt,
      x: Math.round((pt.x + deltaX) * 100) / 100,
      y: Math.round((pt.y + deltaY) * 100) / 100,
    }))
  );

  return {
    strokes: centeredStrokes,
    deltaX,
    deltaY,
    bbox,
  };
}

/**
 * Expands an array of open polyline strokes with variable thickness into
 * closed 2D polygon outlines suitable for TrueType font contours.
 */
export function strokesToOpenTypePath(
  strokes: GlyphStroke[],
  baseWidth = 14,
  tool: 'fountain' | 'drafting' | 'rollerball' | 'calligraphy' = 'rollerball',
  unitsPerEm = 1000,
  pressureSensitivity = true,
  nibAngle = 45
): opentype.Path {
  const path = new opentype.Path();
  const scale = (unitsPerEm * 0.8) / (CANVAS_BASELINE - CANVAS_ASCENDER);
  const fontBaseWidth = Math.max(16, baseWidth * scale);

  for (const stroke of strokes) {
    if (!stroke || stroke.length === 0) continue;

    // Single click / dot
    if (stroke.length === 1) {
      const p = canvasToFontPoint(stroke[0].x, stroke[0].y, unitsPerEm);
      const dotPressure = pressureSensitivity ? (stroke[0].pressure || 1) : 1.0;
      const r = (fontBaseWidth * dotPressure) / 2;
      // Draw small circle
      path.moveTo(p.x - r, p.y);
      path.bezierCurveTo(p.x - r, p.y + r * 0.552, p.x - r * 0.552, p.y + r, p.x, p.y + r);
      path.bezierCurveTo(p.x + r * 0.552, p.y + r, p.x + r, p.y + r * 0.552, p.x + r, p.y);
      path.bezierCurveTo(p.x + r, p.y - r * 0.552, p.x + r * 0.552, p.y - r, p.x, p.y - r);
      path.bezierCurveTo(p.x - r * 0.552, p.y - r, p.x - r, p.y - r * 0.552, p.x - r, p.y);
      path.close();
      continue;
    }

    // Convert stroke points to font coordinates
    const fontPoints = stroke.map((pt) => {
      const fp = canvasToFontPoint(pt.x, pt.y, unitsPerEm);
      let pressure = pressureSensitivity ? (pt.pressure ?? 1) : 1.0;

      // Tool variations
      if (tool === 'fountain') {
        // Flex nib simulation
        pressure = pressureSensitivity ? Math.min(1.8, Math.max(0.6, pressure * 1.2)) : 1.0;
      } else if (tool === 'drafting') {
        // Strict monoline fineliner
        pressure = 1.0;
      } else if (tool === 'calligraphy') {
        // Chisel nib simulation: thicker on downstrokes, thin on cross strokes
        pressure = 1.0; // Handled in normal orientation
      }
      return { x: fp.x, y: fp.y, pressure };
    });

    // Compute left and right offset boundaries
    const leftSide: { x: number; y: number }[] = [];
    const rightSide: { x: number; y: number }[] = [];

    for (let i = 0; i < fontPoints.length; i++) {
      const curr = fontPoints[i];
      let dx = 0;
      let dy = 0;

      if (i === 0) {
        dx = fontPoints[1].x - curr.x;
        dy = fontPoints[1].y - curr.y;
      } else if (i === fontPoints.length - 1) {
        dx = curr.x - fontPoints[i - 1].x;
        dy = curr.y - fontPoints[i - 1].y;
      } else {
        dx = fontPoints[i + 1].x - fontPoints[i - 1].x;
        dy = fontPoints[i + 1].y - fontPoints[i - 1].y;
      }

      const len = Math.hypot(dx, dy) || 1;
      let nx = -dy / len;
      let ny = dx / len;

      if (tool === 'calligraphy') {
        const rad = (nibAngle * Math.PI) / 180;
        const dot = Math.abs(Math.cos(rad) * (dx / len) + Math.sin(rad) * (dy / len));
        const calligThickness = fontBaseWidth * (0.25 + 1.25 * (1 - dot));
        leftSide.push({
          x: Math.round(curr.x + nx * (calligThickness / 2)),
          y: Math.round(curr.y + ny * (calligThickness / 2)),
        });
        rightSide.push({
          x: Math.round(curr.x - nx * (calligThickness / 2)),
          y: Math.round(curr.y - ny * (calligThickness / 2)),
        });
      } else {
        const halfW = (fontBaseWidth * curr.pressure) / 2;
        leftSide.push({
          x: Math.round(curr.x + nx * halfW),
          y: Math.round(curr.y + ny * halfW),
        });
        rightSide.push({
          x: Math.round(curr.x - nx * halfW),
          y: Math.round(curr.y - ny * halfW),
        });
      }
    }

    // Build closed polygon: Start at leftSide[0], trace to leftSide[N], cap, rightSide[N] down to rightSide[0], cap
    path.moveTo(leftSide[0].x, leftSide[0].y);

    for (let i = 1; i < leftSide.length; i++) {
      path.lineTo(leftSide[i].x, leftSide[i].y);
    }

    // End cap
    const lastR = rightSide[rightSide.length - 1];
    path.lineTo(lastR.x, lastR.y);

    for (let i = rightSide.length - 2; i >= 0; i--) {
      path.lineTo(rightSide[i].x, rightSide[i].y);
    }

    // Start cap and close
    path.lineTo(leftSide[0].x, leftSide[0].y);
    path.close();
  }

  return path;
}

/**
 * Generates an SVG path string from strokes for immediate DOM preview
 */
export function strokesToSvgPath(strokes: GlyphStroke[]): string {
  let d = '';
  for (const stroke of strokes) {
    if (!stroke || stroke.length === 0) continue;
    d += `M ${stroke[0].x} ${stroke[0].y} `;
    if (stroke.length === 1) {
      d += `L ${stroke[0].x + 0.1} ${stroke[0].y + 0.1} `;
      continue;
    }
    for (let i = 1; i < stroke.length; i++) {
      d += `L ${stroke[i].x} ${stroke[i].y} `;
    }
  }
  return d.trim();
}

/**
 * Builds an opentype.Font instance from custom glyph records and metadata
 */
export function buildOpenTypeFont(
  metadata: FontMetadata,
  glyphsMap: Record<string, GlyphData>,
  tool: 'fountain' | 'drafting' | 'rollerball' | 'calligraphy' = 'rollerball',
  baseWidth = 14,
  kerningMap: KerningMap = {},
  ligaturesMap: Record<string, LigatureData> = {},
  pressureSensitivity = true,
  nibAngle = 45
): opentype.Font {
  const notdefPath = new opentype.Path();
  // Standard square .notdef glyph
  notdefPath.moveTo(100, 0);
  notdefPath.lineTo(100, 700);
  notdefPath.lineTo(550, 700);
  notdefPath.lineTo(550, 0);
  notdefPath.lineTo(100, 0);
  notdefPath.close();
  // Inner box
  notdefPath.moveTo(150, 50);
  notdefPath.lineTo(500, 50);
  notdefPath.lineTo(500, 650);
  notdefPath.lineTo(150, 650);
  notdefPath.lineTo(150, 50);
  notdefPath.close();

  const notdefGlyph = new opentype.Glyph({
    name: '.notdef',
    unicode: 0,
    advanceWidth: 650,
    path: notdefPath,
  });

  // Space glyph
  const spaceGlyph = new opentype.Glyph({
    name: 'space',
    unicode: 32,
    advanceWidth: 360,
    path: new opentype.Path(),
  });

  const fontGlyphs = [notdefGlyph, spaceGlyph];
  const charToIndex: Record<string, number> = { ' ': 1 };
  const alternateRegistrations: { charIndex: number; altIndices: number[] }[] = [];

  for (const [char, glyphData] of Object.entries(glyphsMap)) {
    if (!glyphData || glyphData.strokes.length === 0) continue;

    const charRotation = glyphData.rotation || 0;
    const charSlant = glyphData.slant || 0;
    let strokesForFont = glyphData.strokes;
    if (charSlant !== 0) {
      strokesForFont = skewGlyphStrokes(strokesForFont, charSlant);
    }
    if (charRotation !== 0) {
      strokesForFont = rotateGlyphStrokes(strokesForFont, charRotation);
    }

    const opPath = strokesToOpenTypePath(
      strokesForFont,
      baseWidth,
      tool,
      metadata.unitsPerEm,
      pressureSensitivity,
      nibAngle
    );

    // Compute character advance width
    let advance = glyphData.advanceWidth;
    if (!advance || advance <= 0) {
      // Automatic estimation based on bounding box
      const bbox = opPath.getBoundingBox();
      if (bbox && bbox.x2 > 0) {
        advance = Math.round(bbox.x2 + 120);
      } else {
        advance = char === char.toUpperCase() ? 650 : 500;
      }
    }

    const opGlyph = new opentype.Glyph({
      name: charToGlyphName(char),
      unicode: char.charCodeAt(0),
      advanceWidth: advance,
      path: opPath,
    });

    fontGlyphs.push(opGlyph);
    charToIndex[char] = fontGlyphs.length - 1;

    // Register alternate glyph variants if provided
    if (glyphData.variants && glyphData.variants.length > 0) {
      const altIndices: number[] = [];
      glyphData.variants.forEach((variant, vIdx) => {
        if (!variant.strokes || variant.strokes.length === 0) return;
        const varRotation = variant.rotation ?? charRotation;
        const varSlant = variant.slant ?? charSlant;
        let varStrokesForFont = variant.strokes;
        if (varSlant !== 0) {
          varStrokesForFont = skewGlyphStrokes(varStrokesForFont, varSlant);
        }
        if (varRotation !== 0) {
          varStrokesForFont = rotateGlyphStrokes(varStrokesForFont, varRotation);
        }

        const varPath = strokesToOpenTypePath(
          varStrokesForFont,
          baseWidth,
          tool,
          metadata.unitsPerEm,
          pressureSensitivity,
          nibAngle
        );
        const varAdvance = variant.advanceWidth || advance;
        const varGlyph = new opentype.Glyph({
          name: `${charToGlyphName(char)}.alt${vIdx + 1}`,
          unicode: 0xe000 + fontGlyphs.length, // Assign to Unicode Private Use Area (PUA) so it can also be accessed directly
          advanceWidth: varAdvance,
          path: varPath,
        });
        fontGlyphs.push(varGlyph);
        altIndices.push(fontGlyphs.length - 1);
      });

      if (altIndices.length > 0) {
        alternateRegistrations.push({
          charIndex: charToIndex[char],
          altIndices,
        });
      }
    }
  }

  // Add custom ligatures to font glyph list
  const ligatureRegistrations: { sequence: string; glyphIndex: number }[] = [];
  for (const lig of Object.values(ligaturesMap)) {
    if (!lig || !lig.strokes || lig.strokes.length === 0) continue;

    const opPath = strokesToOpenTypePath(
      lig.strokes,
      baseWidth,
      tool,
      metadata.unitsPerEm,
      pressureSensitivity,
      nibAngle
    );

    const ligGlyph = new opentype.Glyph({
      name: lig.name || lig.sequence.split('').join('_'),
      unicode: lig.unicode || undefined,
      advanceWidth: lig.advanceWidth || 760,
      path: opPath,
    });

    fontGlyphs.push(ligGlyph);
    ligatureRegistrations.push({
      sequence: lig.sequence,
      glyphIndex: fontGlyphs.length - 1,
    });
  }

  const font = new opentype.Font({
    familyName: metadata.familyName || 'MyHandwriting',
    styleName: metadata.styleName || 'Regular',
    unitsPerEm: metadata.unitsPerEm || 1000,
    ascender: metadata.ascender || 800,
    descender: metadata.descender || -200,
    glyphs: fontGlyphs,
  });

  // Assign kerning pairs
  font.kerningPairs = {};
  for (const [pair, value] of Object.entries(kerningMap)) {
    if (pair.length >= 2 && value !== 0) {
      const leftChar = pair[0];
      const rightChar = pair[1];
      const leftIdx = charToIndex[leftChar];
      const rightIdx = charToIndex[rightChar];
      if (leftIdx !== undefined && rightIdx !== undefined) {
        font.kerningPairs[`${leftIdx},${rightIdx}`] = value;
      }
    }
  }

  // Register OpenType GSUB Ligature substitutions ('liga' feature)
  for (const { sequence, glyphIndex } of ligatureRegistrations) {
    const componentIndices = sequence.split('').map((c) => charToIndex[c]);
    if (componentIndices.every((idx) => idx !== undefined)) {
      try {
        (font.substitution as any).addLigature('liga', {
          sub: componentIndices,
          by: glyphIndex,
        });
      } catch (err) {
        console.warn('Could not register GSUB ligature for:', sequence, err);
      }
    }
  }

  // Register OpenType GSUB Alternate substitutions ('calt' Contextual Alternates and 'salt' Stylistic Alternates)
  for (const { charIndex, altIndices } of alternateRegistrations) {
    if (charIndex !== undefined && altIndices.length > 0) {
      try {
        (font.substitution as any).addAlternate('calt', {
          sub: charIndex,
          by: altIndices,
        });
        (font.substitution as any).addAlternate('salt', {
          sub: charIndex,
          by: altIndices,
        });
      } catch (err) {
        console.warn('Could not register GSUB contextual alternate:', err);
      }
    }
  }

  return font;
}

/**
 * Maps standard characters to standard OpenType glyph names
 */
export function charToGlyphName(char: string): string {
  if (/[a-zA-Z0-9]/.test(char)) {
    return char;
  }
  const map: Record<string, string> = {
    '!': 'exclam',
    '"': 'quotedbl',
    '#': 'numbersign',
    $: 'dollar',
    '%': 'percent',
    '&': 'ampersand',
    "'": 'quotesingle',
    '(': 'parenleft',
    ')': 'parenright',
    '*': 'asterisk',
    '+': 'plus',
    ',': 'comma',
    '-': 'hyphen',
    '.': 'period',
    '/': 'slash',
    ':': 'colon',
    ';': 'semicolon',
    '<': 'less',
    '=': 'equal',
    '>': 'greater',
    '?': 'question',
    '@': 'at',
    '[': 'bracketleft',
    '\\': 'backslash',
    ']': 'bracketright',
    '^': 'asciicircum',
    _: 'underscore',
    '`': 'grave',
    '{': 'braceleft',
    '|': 'bar',
    '}': 'braceright',
    '~': 'asciitilde',
  };
  return map[char] || `uni${char.charCodeAt(0).toString(16).padStart(4, '0')}`;
}

/**
 * Installs the generated font in the browser runtime dynamically
 */
export async function registerLiveFontFace(
  font: opentype.Font,
  familyUniqueId: string
): Promise<string> {
  try {
    const arrayBuffer = font.toArrayBuffer();
    const blob = new Blob([arrayBuffer], { type: 'font/ttf' });
    const fontUrl = URL.createObjectURL(blob);
    const fontFace = new FontFace(familyUniqueId, `url(${fontUrl})`);
    const loadedFace = await fontFace.load();
    document.fonts.add(loadedFace);
    return familyUniqueId;
  } catch (err) {
    console.error('Failed to register live FontFace in browser:', err);
    return 'sans-serif';
  }
}
