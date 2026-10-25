import { GlyphStroke } from '../types/font';

export interface PressureHeatmapStats {
  min: number;
  max: number;
  avg: number;
  minThickness: number;
  maxThickness: number;
  avgThickness: number;
  pointCount: number;
}

export type PressureColorPalette = 'light-to-dark' | 'ink-density' | 'thermal' | 'penmanship-spectrum';

/**
 * Maps a pen pressure value (0.0 to 1.5+) to a color gradient.
 * Default 'light-to-dark':
 *  - Low pressure (0.0 - 0.35): Light pastel periwinkle / soft sky (#e0e7ff -> #93c5fd)
 *  - Mid pressure (0.35 - 0.75): Medium vibrant cobalt / royal indigo (#6366f1 -> #4f46e5)
 *  - High pressure (0.75 - 1.05): Deep dark navy / midnight blue (#1e1b4b -> #172554)
 *  - Heavy swell (1.05+): Deepest dark obsidian black (#09090b -> #020617)
 */
export function getPressureHeatmapColor(
  pressure: number,
  alpha: number = 0.9,
  palette: PressureColorPalette = 'light-to-dark'
): string {
  const p = Math.max(0, pressure);

  if (palette === 'penmanship-spectrum') {
    // Calligraphic Penmanship Spectrum:
    // Low (<0.35): Champagne Gold (#fef08a -> #eab308) [Delicate Hairlines & Entry flourishes]
    // Mid (0.35-0.75): Jade Emerald (#34d399 -> #059669) [Balanced ascenders & transitional stems]
    // High (0.75-1.1): Royal Cobalt Sapphire (#3b82f6 -> #1d4ed8) [Controlled downstroke swells]
    // Max (1.1+): Crimson Velvet (#ef4444 -> #881337) [Heavy accent stems & terminals]
    if (p < 0.35) {
      const t = p / 0.35;
      const r = Math.round(254 + t * (234 - 254));
      const g = Math.round(240 + t * (179 - 240));
      const b = Math.round(138 + t * (8 - 138));
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    } else if (p < 0.75) {
      const t = (p - 0.35) / 0.4;
      const r = Math.round(52 + t * (5 - 52));
      const g = Math.round(211 + t * (150 - 211));
      const b = Math.round(153 + t * (105 - 153));
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    } else if (p < 1.1) {
      const t = (p - 0.75) / 0.35;
      const r = Math.round(59 + t * (29 - 59));
      const g = Math.round(130 + t * (78 - 130));
      const b = Math.round(246 + t * (216 - 246));
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    } else {
      const t = Math.min(1, (p - 1.1) / 0.4);
      const r = Math.round(239 + t * (136 - 239));
      const g = Math.round(68 + t * (19 - 68));
      const b = Math.round(68 + t * (55 - 68));
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
  }

  if (palette === 'ink-density') {
    // Pure monochrome light-to-dark: light silver gray -> dark charcoal -> pitch black
    const t = Math.min(1.0, p / 1.35);
    const gray = Math.round(228 - t * (228 - 14));
    return `rgba(${gray}, ${gray}, ${Math.min(255, gray + 6)}, ${alpha})`;
  }

  if (palette === 'thermal') {
    // Chromatic thermal: Cyan -> Green -> Orange -> Crimson
    if (p < 0.35) {
      const t = p / 0.35;
      const r = Math.round(6 + t * (56 - 6));
      const g = Math.round(182 + t * (189 - 182));
      const b = Math.round(212 + t * (248 - 212));
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    } else if (p < 0.7) {
      const t = (p - 0.35) / 0.35;
      const r = Math.round(16 + t * (132 - 16));
      const g = Math.round(185 + t * (204 - 185));
      const b = Math.round(129 + t * (22 - 129));
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    } else if (p < 1.05) {
      const t = (p - 0.7) / 0.35;
      const r = Math.round(245 + t * (249 - 245));
      const g = Math.round(158 + t * (115 - 158));
      const b = Math.round(11 + t * (22 - 11));
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    } else {
      const t = Math.min(1, (p - 1.05) / 0.45);
      const r = Math.round(239 + t * (190 - 239));
      const g = Math.round(68 + t * (18 - 68));
      const b = Math.round(68 + t * (60 - 68));
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
  }

  // Primary Default: 'light-to-dark' color gradient from light (low pressure) to dark (high pressure)
  if (p < 0.35) {
    // 0.0 -> Very Light Periwinkle (#e0e7ff), 0.35 -> Soft Sky Blue (#93c5fd)
    const t = p / 0.35;
    const r = Math.round(224 + t * (147 - 224));
    const g = Math.round(231 + t * (197 - 231));
    const b = Math.round(255 + t * (253 - 255));
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  } else if (p < 0.75) {
    // 0.35 -> Soft Sky Blue (#93c5fd), 0.75 -> Vibrant Indigo (#4f46e5)
    const t = (p - 0.35) / 0.4;
    const r = Math.round(147 + t * (79 - 147));
    const g = Math.round(197 + t * (70 - 197));
    const b = Math.round(253 + t * (229 - 253));
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  } else if (p < 1.1) {
    // 0.75 -> Vibrant Indigo (#4f46e5), 1.1 -> Deep Midnight Navy (#1e1b4b)
    const t = (p - 0.75) / 0.35;
    const r = Math.round(79 + t * (30 - 79));
    const g = Math.round(70 + t * (27 - 70));
    const b = Math.round(229 + t * (75 - 229));
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  } else {
    // 1.1 -> Deep Midnight Navy (#1e1b4b), 1.45+ -> Darkest Obsidian Black (#020617)
    const t = Math.min(1, (p - 1.1) / 0.35);
    const r = Math.round(30 + t * (2 - 30));
    const g = Math.round(27 + t * (6 - 27));
    const b = Math.round(75 + t * (23 - 75));
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}

/**
 * Computes min, max, avg pressure stats and rendered pixel thicknesses across all strokes.
 */
export function computeStrokesPressureStats(
  strokes: GlyphStroke[],
  baseWidth: number = 14
): PressureHeatmapStats {
  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  let pointCount = 0;

  for (const stroke of strokes) {
    for (const pt of stroke) {
      const p = pt.pressure !== undefined ? pt.pressure : 1.0;
      if (p < min) min = p;
      if (p > max) max = p;
      sum += p;
      pointCount++;
    }
  }

  if (pointCount === 0) {
    return {
      min: 0,
      max: 0,
      avg: 0,
      minThickness: 0,
      maxThickness: 0,
      avgThickness: 0,
      pointCount: 0,
    };
  }

  const minP = Math.round(min * 100) / 100;
  const maxP = Math.round(max * 100) / 100;
  const avgP = Math.round((sum / pointCount) * 100) / 100;

  return {
    min: minP,
    max: maxP,
    avg: avgP,
    minThickness: Math.round(minP * baseWidth * 10) / 10,
    maxThickness: Math.round(maxP * baseWidth * 10) / 10,
    avgThickness: Math.round(avgP * baseWidth * 10) / 10,
    pointCount,
  };
}

export interface PenmanshipMetrics {
  consistencyScore: number; // 0 - 100%
  consistencyRating: 'Masterful Control' | 'High Regularity' | 'Developing Rhythm' | 'Variable Tremor';
  hairlinePercentage: number; // % < 0.40
  midPercentage: number; // % 0.40 - 0.85
  swellPercentage: number; // % > 0.85
  contrastRatio: number; // max / min pressure contrast
  tremorCount: number; // abrupt pressure jumps
  stdDev: number;
  recommendation: string;
}

/**
 * Evaluates penmanship consistency across stroke downstroke swells, hairlines, and rhythm.
 */
export function computePenmanshipConsistency(strokes: GlyphStroke[]): PenmanshipMetrics {
  let count = 0;
  let sum = 0;
  let min = Infinity;
  let max = -Infinity;
  let hairlines = 0;
  let mids = 0;
  let swells = 0;
  let tremors = 0;
  const pressures: number[] = [];

  for (const stroke of strokes) {
    for (let i = 0; i < stroke.length; i++) {
      const pt = stroke[i];
      const p = pt.pressure !== undefined ? pt.pressure : 1.0;
      pressures.push(p);
      sum += p;
      count++;
      if (p < min) min = p;
      if (p > max) max = p;
      if (p < 0.4) hairlines++;
      else if (p <= 0.85) mids++;
      else swells++;

      if (i > 0) {
        const prevPt = stroke[i - 1];
        const prevP = prevPt && typeof prevPt.pressure === 'number' ? prevPt.pressure : 1.0;
        const diff = Math.abs(p - prevP);
        if (diff > 0.42) {
          tremors++;
        }
      }
    }
  }

  if (count === 0) {
    return {
      consistencyScore: 100,
      consistencyRating: 'High Regularity',
      hairlinePercentage: 0,
      midPercentage: 0,
      swellPercentage: 0,
      contrastRatio: 1,
      tremorCount: 0,
      stdDev: 0,
      recommendation: 'Draw strokes on the canvas to evaluate penmanship pressure consistency.',
    };
  }

  const mean = sum / count;
  let varianceSum = 0;
  for (const p of pressures) {
    varianceSum += Math.pow(p - mean, 2);
  }
  const stdDev = Math.sqrt(varianceSum / count);

  // Consistency score calculation
  const tremorPenalty = Math.min(30, tremors * 7);
  let score = 100 - tremorPenalty;
  if (stdDev > 0.42) {
    score -= (stdDev - 0.42) * 55;
  }
  score = Math.max(35, Math.min(99, Math.round(score)));

  let rating: PenmanshipMetrics['consistencyRating'] = 'Developing Rhythm';
  if (score >= 90) rating = 'Masterful Control';
  else if (score >= 75) rating = 'High Regularity';
  else if (score >= 55) rating = 'Developing Rhythm';
  else rating = 'Variable Tremor';

  const hairlinePct = Math.round((hairlines / count) * 100);
  const midPct = Math.round((mids / count) * 100);
  const swellPct = Math.round((swells / count) * 100);
  const contrastRatio = min > 0 ? Math.round((max / Math.max(0.1, min)) * 10) / 10 : 1.0;

  let recommendation = '';
  if (tremors > 2) {
    recommendation = `${tremors} sudden pressure spikes detected. Slow down your stroke cadence to maintain a uniform calligraphic taper.`;
  } else if (hairlinePct < 15 && contrastRatio < 2.0) {
    recommendation = 'Pressure is mostly uniform. Lighten your hand on upward curves to build expressive calligraphic contrast.';
  } else if (swellPct > 60) {
    recommendation = 'Heavy hand detected across stems. Relax your grip on entry flourishes to avoid ink heaviness.';
  } else if (score >= 88) {
    recommendation = 'Exceptional penmanship rhythm! Downstroke swells and delicate hairlines show consistent muscle memory.';
  } else {
    recommendation = 'Solid rhythm. Focus on matching parallel stem pressures for balanced typographical color.';
  }

  return {
    consistencyScore: score,
    consistencyRating: rating,
    hairlinePercentage: hairlinePct,
    midPercentage: midPct,
    swellPercentage: swellPct,
    contrastRatio,
    tremorCount: tremors,
    stdDev: Math.round(stdDev * 100) / 100,
    recommendation,
  };
}

export interface PressureOverlayOptions {
  palette?: PressureColorPalette;
  showNumericBadges?: boolean;
  showGlow?: boolean;
  showUnderlineHalo?: boolean;
  alpha?: number;
  showSwellCalipers?: boolean;
  showTremorWarnings?: boolean;
  thicknessScale?: number; // 0.8 to 2.5x magnification for visual balance inspection
  renderThicknessEnvelopes?: boolean;
  liveCursorPt?: { x: number; y: number; pressure?: number } | null;
}

/**
 * Renders the visual pressure overlay to highlight areas of varying pen pressure,
 * using a color gradient from light (low pressure) to dark (high pressure).
 */
export function renderPressureHeatmapLayer(
  ctx: CanvasRenderingContext2D,
  strokes: GlyphStroke[],
  baseWidth: number,
  options: PressureOverlayOptions = {}
) {
  const {
    palette = 'light-to-dark',
    showNumericBadges = true,
    showGlow = true,
    showUnderlineHalo = true,
    alpha = 0.88,
    showSwellCalipers = true,
    showTremorWarnings = true,
  } = options;

  if (!strokes || strokes.length === 0) return;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // 1. Subtle outline halo so light (low pressure) areas stay legible against ivory paper
  if (showUnderlineHalo) {
    for (const stroke of strokes) {
      if (stroke.length < 2) continue;
      for (let i = 1; i < stroke.length; i++) {
        const p0 = stroke[i - 1];
        const p1 = stroke[i];
        const avgP = ((p0.pressure ?? 1) + (p1.pressure ?? 1)) / 2;
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.strokeStyle = 'rgba(15, 23, 42, 0.18)';
        ctx.lineWidth = Math.max(5, baseWidth * avgP * 1.05 + 3.5);
        ctx.stroke();
      }
    }
  }

  // 2. Soft glowing ambient under-layer
  if (showGlow) {
    for (const stroke of strokes) {
      if (stroke.length < 2) continue;
      for (let i = 1; i < stroke.length; i++) {
        const p0 = stroke[i - 1];
        const p1 = stroke[i];
        const avgP = ((p0.pressure ?? 1) + (p1.pressure ?? 1)) / 2;
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.strokeStyle = getPressureHeatmapColor(avgP, 0.22, palette);
        ctx.lineWidth = Math.max(10, baseWidth * avgP * 1.5);
        ctx.stroke();
      }
    }
  }

  const tScale = options.thicknessScale ?? 1.25;

  // 3. Smooth continuous gradient stroke segments with dynamic varying thicknesses
  for (const stroke of strokes) {
    if (!stroke || stroke.length === 0) continue;

    if (stroke.length === 1) {
      const pt = stroke[0];
      const p = pt.pressure ?? 1.0;
      const r = Math.max(3, (baseWidth * p * tScale) / 2);
      ctx.fillStyle = getPressureHeatmapColor(p, alpha, palette);
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }

    for (let i = 1; i < stroke.length; i++) {
      const p0 = stroke[i - 1];
      const p1 = stroke[i];
      const p0Val = p0.pressure ?? 1.0;
      const p1Val = p1.pressure ?? 1.0;
      const w0 = Math.max(3, baseWidth * p0Val * tScale);
      const w1 = Math.max(3, baseWidth * p1Val * tScale);

      const dx = p1.x - p0.x;
      const dy = p1.y - p0.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;

      const grad = ctx.createLinearGradient(p0.x, p0.y, p1.x, p1.y);
      grad.addColorStop(0, getPressureHeatmapColor(p0Val, alpha, palette));
      grad.addColorStop(1, getPressureHeatmapColor(p1Val, alpha, palette));

      // Draw tapered variable-thickness polygon connecting p0 to p1
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(p0.x + nx * (w0 / 2), p0.y + ny * (w0 / 2));
      ctx.lineTo(p1.x + nx * (w1 / 2), p1.y + ny * (w1 / 2));
      ctx.lineTo(p1.x - nx * (w1 / 2), p1.y - ny * (w1 / 2));
      ctx.lineTo(p0.x - nx * (w0 / 2), p0.y - ny * (w0 / 2));
      ctx.closePath();
      ctx.fill();

      // Rounded joint caps to ensure continuous seamless curve envelope
      ctx.beginPath();
      ctx.arc(p0.x, p0.y, w0 / 2, 0, Math.PI * 2);
      ctx.fill();

      if (i === stroke.length - 1) {
        ctx.beginPath();
        ctx.arc(p1.x, p1.y, w1 / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // 4. Pressure caliper beads and numerical percentage badges
  if (showNumericBadges) {
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const stroke of strokes) {
      if (stroke.length < 2) continue;

      // Sample along the stroke at regular intervals
      const step = Math.max(5, Math.floor(stroke.length / 5));
      for (let i = 0; i < stroke.length; i += step) {
        const pt = stroke[i];
        const p = pt.pressure ?? 1.0;
        const color = getPressureHeatmapColor(p, 1.0, palette);
        const isLowPressure = p < 0.45;

        // Bead circle
        ctx.fillStyle = isLowPressure ? '#ffffff' : color;
        ctx.strokeStyle = isLowPressure ? color : '#ffffff';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Numeric pill badge
        const label = `${Math.round(p * 100)}%`;
        const metrics = ctx.measureText(label);
        const badgeW = metrics.width + 7;
        const badgeH = 14;
        const badgeX = pt.x + 8;
        const badgeY = pt.y - 8;

        // Background box
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(badgeX - 2, badgeY - 7, badgeW, badgeH, 3);
        ctx.fill();
        ctx.stroke();

        // Value text
        ctx.fillStyle = isLowPressure ? '#93c5fd' : '#ffffff';
        ctx.fillText(label, badgeX + badgeW / 2 - 2, badgeY);
      }
    }
  }

  // 5. Downstroke Max Swell Calipers (identifies peak pressure locations to refine downstroke consistency across stems)
  if (showSwellCalipers) {
    for (const stroke of strokes) {
      if (stroke.length < 5) continue;
      for (let i = 2; i < stroke.length - 2; i++) {
        const pt = stroke[i];
        const p = pt.pressure ?? 1.0;
        if (p >= 0.85) {
          const pPrev = stroke[i - 1].pressure ?? 1.0;
          const pNext = stroke[i + 1].pressure ?? 1.0;
          if (p >= pPrev && p >= pNext) {
            const pPrev2 = stroke[i - 2].pressure ?? 1.0;
            const pNext2 = stroke[i + 2].pressure ?? 1.0;
            if (p >= pPrev2 && p >= pNext2) {
              const dx = stroke[i + 1].x - stroke[i - 1].x;
              const dy = stroke[i + 1].y - stroke[i - 1].y;
              const len = Math.hypot(dx, dy) || 1;
              const nx = -dy / len;
              const ny = dx / len;
              const caliperLen = Math.max(7, (baseWidth * p) / 2 + 4);

              // Transverse caliper line
              ctx.strokeStyle = '#f59e0b'; // Amber 500
              ctx.lineWidth = 1.8;
              ctx.beginPath();
              ctx.moveTo(pt.x - nx * caliperLen, pt.y - ny * caliperLen);
              ctx.lineTo(pt.x + nx * caliperLen, pt.y + ny * caliperLen);
              ctx.stroke();

              // Center diamond
              ctx.fillStyle = '#d97706';
              ctx.beginPath();
              ctx.moveTo(pt.x, pt.y - 3.5);
              ctx.lineTo(pt.x + 3.5, pt.y);
              ctx.lineTo(pt.x, pt.y + 3.5);
              ctx.lineTo(pt.x - 3.5, pt.y);
              ctx.closePath();
              ctx.fill();
            }
          }
        }
      }
    }
  }

  // 6. Tremor / Abrupt Pressure Jump Markers
  if (showTremorWarnings) {
    for (const stroke of strokes) {
      if (stroke.length < 2) continue;
      for (let i = 1; i < stroke.length; i++) {
        const pt = stroke[i];
        const prevPt = stroke[i - 1];
        const p = pt.pressure ?? 1.0;
        const prevP = prevPt.pressure ?? 1.0;
        if (Math.abs(p - prevP) > 0.42) {
          // Sharp jump indicator
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([2, 2]);
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 7, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  // 7. Live Cursor Line-Weight Reticle & Dynamic Readout
  if (options.liveCursorPt) {
    const curPt = options.liveCursorPt;
    const curP = curPt.pressure ?? 1.0;
    const curThickness = Math.max(3, baseWidth * curP * tScale);
    const curRadius = curThickness / 2;
    const curColor = getPressureHeatmapColor(curP, 1.0, palette);

    // Dynamic width circle around cursor
    ctx.strokeStyle = curColor;
    ctx.lineWidth = 2.0;
    ctx.setLineDash([3, 2]);
    ctx.beginPath();
    ctx.arc(curPt.x, curPt.y, Math.max(4, curRadius), 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Outer glow ring
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.arc(curPt.x, curPt.y, Math.max(4, curRadius) + 2.5, 0, Math.PI * 2);
    ctx.stroke();

    // Center pivot dot
    ctx.fillStyle = curColor;
    ctx.beginPath();
    ctx.arc(curPt.x, curPt.y, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Floating line-weight badge
    const badgeLabel = `${Math.round(curThickness)}px · ${Math.round(curP * 100)}%`;
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const textW = ctx.measureText(badgeLabel).width;
    const badgeX = curPt.x + Math.max(8, curRadius + 5);
    const badgeY = curPt.y - Math.max(8, curRadius + 5);

    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.strokeStyle = curColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(badgeX - 3, badgeY - 7, textW + 8, 14, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.fillText(badgeLabel, badgeX + 1, badgeY);
  }

  ctx.restore();
}

/**
 * Balances, smooths, and normalizes pen pressure across all strokes of a glyph,
 * evening out abrupt hand tremors while preserving expressive downstroke swells.
 */
export function balanceStrokesPressure(
  strokes: GlyphStroke[],
  options: {
    targetAverage?: number; // default 0.85
    smoothRadius?: number; // window size, default 3
    contrastBoost?: number; // default 1.0
  } = {}
): GlyphStroke[] {
  if (!strokes || strokes.length === 0) return [];
  const { targetAverage = 0.85, smoothRadius = 3, contrastBoost = 1.0 } = options;

  // First pass: compute current average pressure
  let totalP = 0;
  let count = 0;
  for (const s of strokes) {
    for (const pt of s) {
      totalP += pt.pressure ?? 1.0;
      count++;
    }
  }
  const currentAvg = count > 0 ? totalP / count : 1.0;
  const avgScale = currentAvg > 0 ? targetAverage / currentAvg : 1.0;

  return strokes.map((stroke) => {
    if (stroke.length <= 1) return stroke;

    return stroke.map((pt, i) => {
      // 1. Moving average window for smooth pressure transitions
      let windowSum = 0;
      let windowCount = 0;
      for (
        let k = Math.max(0, i - smoothRadius);
        k <= Math.min(stroke.length - 1, i + smoothRadius);
        k++
      ) {
        windowSum += stroke[k].pressure ?? 1.0;
        windowCount++;
      }
      const smoothedP = windowCount > 0 ? windowSum / windowCount : (pt.pressure ?? 1.0);

      // 2. Normalize towards target average
      let balancedP = smoothedP * (0.65 + 0.35 * avgScale);

      // 3. Optional contrast boost: separate downstrokes from hairlines
      if (contrastBoost !== 1.0) {
        if (balancedP > targetAverage) {
          balancedP = targetAverage + (balancedP - targetAverage) * contrastBoost;
        } else {
          balancedP = targetAverage - (targetAverage - balancedP) * contrastBoost;
        }
      }

      // Clamp to ergonomic range (0.22 delicate hairline to 1.45 full downstroke bloom)
      balancedP = Math.max(0.22, Math.min(1.45, Math.round(balancedP * 100) / 100));

      return {
        ...pt,
        pressure: balancedP,
      };
    });
  });
}

/**
 * Boosts dynamic pen pressure contrast between hairlines (<0.40) and downstroke swells (>0.90)
 */
export function boostStrokesPressureContrast(strokes: GlyphStroke[]): GlyphStroke[] {
  return balanceStrokesPressure(strokes, { contrastBoost: 1.35, targetAverage: 0.85 });
}

export interface CrossCharacterWeightMetrics {
  currentChar: string;
  currentAvgPressure: number;
  currentAvgThickness: number;
  fontAvgPressure: number;
  fontAvgThickness: number;
  relativeWeightRatio: number; // e.g. 1.05 = +5% heavier than font average
  weightDifferencePercent: number; // e.g. +5 or -12
  weightCategory: 'Light / Thin' | 'Balanced Regular' | 'Heavy / Bold';
  comparedGlyphCount: number;
  recommendation: string;
  charBreakdown: { char: string; avgThickness: number; avgPressure: number; strokeCount: number }[];
}

/**
 * Computes cross-character line-weight and stroke pressure balance across the entire font,
 * comparing the current active glyph against all other drawn characters.
 */
export function computeCrossCharacterWeightDistribution(
  glyphs: Record<string, { strokes?: GlyphStroke[] }>,
  currentChar: string,
  baseWidth: number = 14
): CrossCharacterWeightMetrics {
  const charStats: { char: string; avgThickness: number; avgPressure: number; strokeCount: number }[] = [];
  let fontTotalPressureSum = 0;
  let fontTotalPoints = 0;

  for (const [char, glyph] of Object.entries(glyphs)) {
    if (!glyph || !glyph.strokes || glyph.strokes.length === 0) continue;
    let charSum = 0;
    let charPts = 0;

    for (const stroke of glyph.strokes) {
      for (const pt of stroke) {
        const p = pt.pressure !== undefined ? pt.pressure : 1.0;
        charSum += p;
        charPts++;
      }
    }

    if (charPts > 0) {
      const avgP = Math.round((charSum / charPts) * 100) / 100;
      const avgThick = Math.round(avgP * baseWidth * 10) / 10;
      charStats.push({
        char,
        avgThickness: avgThick,
        avgPressure: avgP,
        strokeCount: glyph.strokes.length,
      });

      fontTotalPressureSum += charSum;
      fontTotalPoints += charPts;
    }
  }

  const currentGlyphStat = charStats.find((s) => s.char === currentChar);
  const curAvgP = currentGlyphStat ? currentGlyphStat.avgPressure : 0.85;
  const curAvgThick = currentGlyphStat ? currentGlyphStat.avgThickness : Math.round(0.85 * baseWidth * 10) / 10;

  const fontAvgP = fontTotalPoints > 0 ? Math.round((fontTotalPressureSum / fontTotalPoints) * 100) / 100 : 0.85;
  const fontAvgThick = Math.round(fontAvgP * baseWidth * 10) / 10;

  const relativeWeightRatio = fontAvgP > 0 ? Math.round((curAvgP / fontAvgP) * 100) / 100 : 1.0;
  const diffPercent = Math.round((relativeWeightRatio - 1.0) * 100);

  let category: CrossCharacterWeightMetrics['weightCategory'] = 'Balanced Regular';
  if (diffPercent < -15) category = 'Light / Thin';
  else if (diffPercent > 15) category = 'Heavy / Bold';

  let recommendation = '';
  if (charStats.length <= 1) {
    recommendation = `Draw strokes for '${currentChar}' and additional characters to establish a font-wide weight baseline.`;
  } else if (diffPercent > 20) {
    recommendation = `'${currentChar}' is ${diffPercent}% heavier than your font average (${fontAvgThick}px). Consider lightening stroke pressure or using 'Balance Pressure'.`;
  } else if (diffPercent < -20) {
    recommendation = `'${currentChar}' is ${Math.abs(diffPercent)}% lighter than your font average (${fontAvgThick}px). Add downstroke pressure on main stems for optical consistency.`;
  } else {
    recommendation = `'${currentChar}' optical weight is well-harmonized with font average (within ±${Math.abs(diffPercent)}% of ${fontAvgThick}px).`;
  }

  // Sort breakdown by difference from font average
  const sortedBreakdown = [...charStats].sort((a, b) => b.avgThickness - a.avgThickness);

  return {
    currentChar,
    currentAvgPressure: curAvgP,
    currentAvgThickness: curAvgThick,
    fontAvgPressure: fontAvgP,
    fontAvgThickness: fontAvgThick,
    relativeWeightRatio,
    weightDifferencePercent: diffPercent,
    weightCategory: category,
    comparedGlyphCount: charStats.length,
    recommendation,
    charBreakdown: sortedBreakdown,
  };
}


