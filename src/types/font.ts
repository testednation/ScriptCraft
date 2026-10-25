export interface GlyphPoint {
  x: number;
  y: number;
  pressure?: number;
}

export type GlyphStroke = GlyphPoint[];

export interface GlyphVariant {
  id: string; // e.g. 'v1', 'v2'
  name?: string; // e.g. 'Alternate 1', 'Flourished', 'Compact'
  strokes: GlyphStroke[];
  advanceWidth?: number;
  leftBearing?: number;
  rightBearing?: number;
  rotation?: number; // Character-specific tilt / rotation angle in degrees
  slant?: number; // Character-specific skew / slant correction angle in degrees
}

export interface GlyphData {
  char: string;
  unicode: number;
  strokes: GlyphStroke[];
  advanceWidth: number;
  leftBearing: number;
  rightBearing: number;
  lastModified: number;
  variants?: GlyphVariant[];
  rotation?: number; // Character-specific tilt / rotation angle in degrees
  slant?: number; // Character-specific skew / slant correction angle in degrees
}

export interface FontMetadata {
  familyName: string;
  styleName: string;
  designer: string;
  version: string;
  description: string;
  unitsPerEm: number;
  ascender: number;
  descender: number;
  capHeight: number;
  xHeight: number;
}

export type PenToolType = 'fountain' | 'drafting' | 'rollerball' | 'calligraphy';

export interface PenSettings {
  tool: PenToolType;
  baseWidth: number;
  smoothing: number; // 0 to 1
  angle?: number; // Calligraphy nib angle in degrees (e.g. 45°, 30°, 52°)
  pressureSensitivity: boolean;
  pressureCurve?: 'soft' | 'linear' | 'firm' | 'custom';
  pressureGamma?: number; // 0.4 (soft) to 2.2 (firm)
}

export interface HandwritingPreset {
  id: string;
  name: string;
  category: string;
  tagline: string;
  description: string;
  authorNote: string;
  penType: string;
  slant: number;
  strokeWidth: number;
  glyphs: Record<string, GlyphStroke[]>;
}

export interface AIAnalysisResult {
  styleName: string;
  penmanshipClass: string;
  characteristics: {
    slantDegrees: number;
    strokeWeight: string;
    xHeightRatio: number;
    spacing: string;
    loopiness: string;
  };
  communityFeedback: string;
  suggestedPen: string;
  detectedLetters: string[];
}

export interface KerningPair {
  left: string;
  right: string;
  value: number; // in font units (typically -200 to +150)
}

export type KerningMap = Record<string, number>; // e.g. { "AV": -70, "Te": -40 }

export interface LigatureData {
  id: string; // e.g. "fi", "fl", "st"
  sequence: string; // character sequence e.g. "fi"
  name: string; // glyph name e.g. "f_i"
  unicode?: number; // optional Unicode standard point e.g. 0xFB01
  strokes: GlyphStroke[];
  advanceWidth: number;
  description: string;
}

