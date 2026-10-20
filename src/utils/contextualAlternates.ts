import { GlyphData, GlyphPoint, GlyphStroke, GlyphVariant } from '../types/font';
import { CANVAS_BASELINE, getStrokesBoundingBox, rotateGlyphStrokes } from './fontEngine';

export type HumanVariationLevel = 'subtle' | 'balanced' | 'expressive';

export interface ContextualAlternateOptions {
  level?: HumanVariationLevel; // 'subtle' (~4%), 'balanced' (~8%), 'expressive' (~15%)
  count?: number; // 1, 2, or 3 variants
  enableTiltDrift?: boolean; // ±1° to ±3.5°
  enableBaselineDrift?: boolean; // ±2px to ±5px
  enableSmoothMorphing?: boolean; // organic harmonic wave displacement
  enableLoopBreathing?: boolean; // micro width/height aspect variation
  enableTerminalFlourish?: boolean; // subtle variation in stroke exit sweep
  enablePressureDynamics?: boolean; // subtle point pressure variation
  seed?: number; // optional random seed
}

// Frequent repeating letters in English and Latin alphabets that benefit most from contextual alternates
export const FREQUENT_CONTEXTUAL_LETTERS = [
  'e', 't', 'a', 'o', 'i', 'n', 's', 'r', 'l', 'd', 'c', 'u', 'm', 'p'
];

interface PersonaSpec {
  name: string;
  tiltAngle: number;
  widthFactor: number;
  heightFactor: number;
  baselineOffset: number;
  waveAmplitude: number;
  waveFrequency: number;
  flourishSweep: number;
  pressureBias: number;
  tag: string;
}

/**
 * Returns distinct humanization personas for successive alternate variants.
 */
function getVariantPersona(variantIndex: number, multiplier: number, seed: number): PersonaSpec {
  // Pseudo-random jitter based on seed and index
  const jitter = (val: number, range: number) => {
    const r = Math.sin(seed * 997 + variantIndex * 313 + val * 17) * 0.5 + 0.5;
    return (r - 0.5) * range;
  };

  if (variantIndex === 0) {
    // Persona 1: Relaxed & Casual (gentle right tilt, slightly wider breath, subtle baseline lift)
    const tilt = +(1.8 + jitter(1, 0.6)) * multiplier;
    return {
      name: 'Relaxed & Casual',
      tiltAngle: Math.round(tilt * 10) / 10,
      widthFactor: 1 + (0.03 + jitter(2, 0.015)) * multiplier,
      heightFactor: 1 - (0.01 + jitter(3, 0.01)) * multiplier,
      baselineOffset: -(2.5 + jitter(4, 1.0)) * multiplier, // Lift slightly above baseline
      waveAmplitude: 3.5 * multiplier,
      waveFrequency: 1.0,
      flourishSweep: 4.0 * multiplier,
      pressureBias: 0.04 * multiplier,
      tag: `Tilt +${Math.round(tilt)}° · Relaxed loop`,
    };
  } else if (variantIndex === 1) {
    // Persona 2: Swift & Compact (slight upright lean, tight loops, crisp terminal)
    const tilt = -(1.4 + jitter(5, 0.6)) * multiplier;
    return {
      name: 'Swift & Compact',
      tiltAngle: Math.round(tilt * 10) / 10,
      widthFactor: 1 - (0.035 + jitter(6, 0.015)) * multiplier,
      heightFactor: 1 + (0.02 + jitter(7, 0.01)) * multiplier,
      baselineOffset: +(1.5 + jitter(8, 0.8)) * multiplier, // Sits grounded on baseline
      waveAmplitude: 2.8 * multiplier,
      waveFrequency: 1.5,
      flourishSweep: -3.0 * multiplier,
      pressureBias: -0.05 * multiplier,
      tag: `Tilt ${Math.round(tilt)}° · Compact width`,
    };
  } else {
    // Persona 3: Expressive & Dynamic (flowing flourish, dynamic curve breath)
    const tilt = +(2.8 + jitter(9, 0.8)) * multiplier;
    return {
      name: 'Expressive Flourish',
      tiltAngle: Math.round(tilt * 10) / 10,
      widthFactor: 1 + (0.04 + jitter(10, 0.02)) * multiplier,
      heightFactor: 1 + (0.015 + jitter(11, 0.01)) * multiplier,
      baselineOffset: +(2.0 + jitter(12, 1.2)) * multiplier,
      waveAmplitude: 4.8 * multiplier,
      waveFrequency: 2.0,
      flourishSweep: 6.5 * multiplier,
      pressureBias: 0.08 * multiplier,
      tag: `Tilt +${Math.round(tilt)}° · Extended flourish`,
    };
  }
}

/**
 * Deep clones stroke arrays
 */
function cloneStrokes(strokes: GlyphStroke[]): GlyphStroke[] {
  if (!strokes) return [];
  return strokes.map((stroke) =>
    stroke.map((pt) => ({
      x: pt.x,
      y: pt.y,
      pressure: pt.pressure !== undefined ? pt.pressure : 1,
    }))
  );
}

/**
 * Generates automated contextual alternate variants for a given glyph based on its base strokes.
 */
export function generateContextualVariants(
  glyph: GlyphData,
  options?: ContextualAlternateOptions
): GlyphVariant[] {
  if (!glyph || !glyph.strokes || glyph.strokes.length === 0) {
    return [];
  }

  const level = options?.level || 'balanced';
  const count = Math.min(3, Math.max(1, options?.count ?? 2));
  const enableTiltDrift = options?.enableTiltDrift ?? true;
  const enableBaselineDrift = options?.enableBaselineDrift ?? true;
  const enableSmoothMorphing = options?.enableSmoothMorphing ?? true;
  const enableLoopBreathing = options?.enableLoopBreathing ?? true;
  const enableTerminalFlourish = options?.enableTerminalFlourish ?? true;
  const enablePressureDynamics = options?.enablePressureDynamics ?? true;
  const seed = options?.seed ?? (glyph.char.charCodeAt(0) * 41 + 137);

  // Multipliers based on human variation intensity level
  const multiplier = level === 'subtle' ? 0.6 : level === 'expressive' ? 1.6 : 1.0;

  const baseBbox = getStrokesBoundingBox(glyph.strokes);
  if (!baseBbox) return [];

  const centerX = baseBbox.centerX;
  const baseline = CANVAS_BASELINE;
  const variants: GlyphVariant[] = [];

  for (let vIdx = 0; vIdx < count; vIdx++) {
    const persona = getVariantPersona(vIdx, multiplier, seed + vIdx * 73);
    const strokes = cloneStrokes(glyph.strokes);

    // 1. Process each stroke with low-frequency harmonic displacement & scaling
    const modifiedStrokes: GlyphStroke[] = strokes.map((stroke, sIdx) => {
      if (stroke.length === 0) return [];
      if (stroke.length === 1) {
        // Single dot: apply small offset
        const p = stroke[0];
        const dy = enableBaselineDrift ? persona.baselineOffset : 0;
        return [{ ...p, y: p.y + dy }];
      }

      // Compute total cumulative length along the stroke for normalized parameter t
      const distances: number[] = [0];
      for (let i = 1; i < stroke.length; i++) {
        const d = Math.hypot(stroke[i].x - stroke[i - 1].x, stroke[i].y - stroke[i - 1].y);
        distances.push(distances[i - 1] + d);
      }
      const totalLen = distances[distances.length - 1] || 1;

      const isLastStroke = sIdx === strokes.length - 1;

      return stroke.map((pt, i) => {
        const t = distances[i] / totalLen; // 0.0 at start, 1.0 at end
        let newX = pt.x;
        let newY = pt.y;

        // A. Loop & Aspect Ratio Breathing (scale around horizontal center and baseline)
        if (enableLoopBreathing) {
          const dx = pt.x - centerX;
          const dy = pt.y - baseline;
          newX = centerX + dx * persona.widthFactor;
          newY = baseline + dy * persona.heightFactor;
        }

        // B. Smooth harmonic morphing (sine wave clamped at stroke endpoints so terminals stay anchored)
        if (enableSmoothMorphing && stroke.length > 2) {
          // Zero at start (t=0) and near zero at end (t=1), peaking smoothly in the belly of the stroke
          const envelope = Math.sin(t * Math.PI);

          // Estimate stroke tangent vector
          const prevPt = stroke[Math.max(0, i - 1)];
          const nextPt = stroke[Math.min(stroke.length - 1, i + 1)];
          const tx = nextPt.x - prevPt.x;
          const ty = nextPt.y - prevPt.y;
          const tLen = Math.hypot(tx, ty) || 1;

          // Normal vector perpendicular to trajectory
          const nx = -ty / tLen;
          const ny = tx / tLen;

          const wavePhase = t * Math.PI * persona.waveFrequency + (vIdx * 0.7);
          const waveDisp = Math.sin(wavePhase) * persona.waveAmplitude * envelope;

          newX += nx * waveDisp;
          newY += ny * waveDisp;
        }

        // C. Terminal flourish sweep (applies only to the trailing exit of the last stroke)
        if (enableTerminalFlourish && isLastStroke && t > 0.75) {
          const exitT = (t - 0.75) / 0.25; // 0 at t=0.75, 1 at t=1.0
          const sweepAmt = exitT * exitT * persona.flourishSweep;
          newX += sweepAmt;
          newY -= sweepAmt * 0.4;
        }

        // D. Baseline drift
        if (enableBaselineDrift) {
          newY += persona.baselineOffset;
        }

        // E. Pressure dynamics
        let newPressure = pt.pressure !== undefined ? pt.pressure : 0.85;
        if (enablePressureDynamics) {
          const pressureWave = Math.sin(t * Math.PI * 2 + vIdx) * 0.08 * multiplier;
          newPressure = Math.min(1.0, Math.max(0.4, newPressure * (1 + persona.pressureBias + pressureWave)));
        }

        return {
          x: Math.round(newX * 100) / 100,
          y: Math.round(newY * 100) / 100,
          pressure: Math.round(newPressure * 1000) / 1000,
        };
      });
    });

    // 2. Apply tilt drift around baseline pivot if enabled
    let finalStrokes = modifiedStrokes;
    const finalRotation = enableTiltDrift ? persona.tiltAngle : 0;
    if (finalRotation !== 0) {
      finalStrokes = rotateGlyphStrokes(modifiedStrokes, finalRotation, centerX, baseline);
    }

    // 3. Compute variant advance width
    const baseAdvance = glyph.advanceWidth || 600;
    const varAdvance = enableLoopBreathing
      ? Math.round(baseAdvance * (1 + (persona.widthFactor - 1) * 0.7))
      : baseAdvance;

    variants.push({
      id: `var_auto_${Date.now()}_${vIdx + 1}`,
      name: `Variant ${vIdx + 2} (${persona.name})`,
      strokes: finalStrokes,
      advanceWidth: varAdvance,
      rotation: 0, // already baked into coordinate transforms with tilt drift
    });
  }

  return variants;
}

/**
 * Batch generates contextual alternates for a collection of glyphs.
 */
export function batchGenerateContextualAlternates(
  glyphs: Record<string, GlyphData>,
  charList?: string[],
  options?: ContextualAlternateOptions
): Record<string, GlyphVariant[]> {
  const targetChars = charList && charList.length > 0
    ? charList
    : Object.keys(glyphs).filter((c) => glyphs[c]?.strokes?.length > 0);

  const results: Record<string, GlyphVariant[]> = {};

  for (const char of targetChars) {
    const glyphData = glyphs[char];
    if (!glyphData || !glyphData.strokes || glyphData.strokes.length === 0) continue;

    const variants = generateContextualVariants(glyphData, options);
    if (variants.length > 0) {
      results[char] = variants;
    }
  }

  return results;
}

/**
 * Simulates human contextual alternate cycling in a text string.
 * When a character repeats within a short distance, it automatically
 * cycles to alternate variants, preventing identical robotic letters.
 */
export function substituteContextualAlternates(
  text: string,
  glyphs: Record<string, GlyphData>
): Array<{
  char: string;
  variantId: string;
  strokes: GlyphStroke[];
  advanceWidth: number;
  rotation: number;
  isAlternate: boolean;
  variantName: string;
}> {
  const result: Array<{
    char: string;
    variantId: string;
    strokes: GlyphStroke[];
    advanceWidth: number;
    rotation: number;
    isAlternate: boolean;
    variantName: string;
  }> = [];

  // Tracks recent usage count of each character to cycle smoothly
  const recentCounts: Record<string, number> = {};

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const glyphData = glyphs[char];

    if (!glyphData || !glyphData.strokes || glyphData.strokes.length === 0) {
      result.push({
        char,
        variantId: 'primary',
        strokes: glyphData?.strokes || [],
        advanceWidth: glyphData?.advanceWidth || 600,
        rotation: glyphData?.rotation || 0,
        isAlternate: false,
        variantName: 'Standard',
      });
      continue;
    }

    const variants = (glyphData.variants || []).filter((v) => v.strokes && v.strokes.length > 0);
    const count = recentCounts[char] || 0;
    recentCounts[char] = count + 1;

    // If character has variants and has appeared recently, cycle to alternate
    if (variants.length > 0) {
      const cycleIndex = count % (variants.length + 1);
      if (cycleIndex > 0) {
        const selectedVariant = variants[cycleIndex - 1];
        result.push({
          char,
          variantId: selectedVariant.id,
          strokes: selectedVariant.strokes,
          advanceWidth: selectedVariant.advanceWidth || glyphData.advanceWidth || 600,
          rotation: selectedVariant.rotation || 0,
          isAlternate: true,
          variantName: selectedVariant.name || `Variant ${cycleIndex + 1}`,
        });
        continue;
      }
    }

    // Default to primary standard form
    result.push({
      char,
      variantId: 'primary',
      strokes: glyphData.strokes,
      advanceWidth: glyphData.advanceWidth || 600,
      rotation: glyphData.rotation || 0,
      isAlternate: false,
      variantName: 'Standard',
    });
  }

  return result;
}
