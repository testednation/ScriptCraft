import { GlyphData, KerningMap } from '../types/font';

export interface ProjectHistorySnapshot {
  glyphs: Record<string, GlyphData>;
  kerningMap: KerningMap;
  timestamp: number;
  action?: string;
}

export interface HistoryManagerState {
  undoStack: ProjectHistorySnapshot[];
  redoStack: ProjectHistorySnapshot[];
}

const MAX_HISTORY_STEPS = 50;

/**
 * Deep clones glyphs dictionary to ensure immutable history snapshots.
 */
export function cloneGlyphsMap(glyphs: Record<string, GlyphData>): Record<string, GlyphData> {
  const result: Record<string, GlyphData> = {};
  for (const [char, glyph] of Object.entries(glyphs)) {
    result[char] = {
      ...glyph,
      strokes: glyph.strokes.map((stroke) =>
        stroke.map((pt) => ({
          x: pt.x,
          y: pt.y,
          pressure: pt.pressure,
        }))
      ),
      variants: glyph.variants
        ? glyph.variants.map((v) => ({
            ...v,
            strokes: v.strokes.map((stroke) =>
              stroke.map((pt) => ({
                x: pt.x,
                y: pt.y,
                pressure: pt.pressure,
              }))
            ),
          }))
        : undefined,
    };
  }
  return result;
}

/**
 * Deep clones kerning map.
 */
export function cloneKerningMap(kerning: KerningMap): KerningMap {
  return { ...kerning };
}

/**
 * Creates an immutable snapshot of current project state.
 */
export function createProjectSnapshot(
  glyphs: Record<string, GlyphData>,
  kerningMap: KerningMap,
  action?: string
): ProjectHistorySnapshot {
  return {
    glyphs: cloneGlyphsMap(glyphs),
    kerningMap: cloneKerningMap(kerningMap),
    timestamp: Date.now(),
    action,
  };
}
