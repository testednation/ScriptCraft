import { GlyphStroke } from '../types/font';

export interface PressureHeatmapStats {
  min: number;
  max: number;
  avg: number;
  pointCount: number;
}

/**
 * Maps a pressure value (0.0 to 1.5+) to a vibrant CSS/Canvas chromatic color.
 * Low (0.0 - 0.35): Cool Cyan / Azure (feather light / hairline upstroke)
 * Mid (0.35 - 0.75): Lush Emerald / Lime (balanced steady flow)
 * High (0.75 - 1.05): Warm Amber / Orange (firm downstroke pressure)
 * Heavy (1.05+): Crimson / Magenta (maximum expressive swell)
 */
export function getPressureHeatmapColor(pressure: number, alpha: number = 0.9): string {
  // Clamp and normalize
  const p = Math.max(0, pressure);

  if (p < 0.35) {
    // 0.0 -> Cyan (#06b6d4), 0.35 -> Sky Blue (#38bdf8)
    const t = p / 0.35;
    const r = Math.round(6 + t * (56 - 6));
    const g = Math.round(182 + t * (189 - 182));
    const b = Math.round(212 + t * (248 - 212));
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  } else if (p < 0.7) {
    // 0.35 -> Emerald (#10b981), 0.7 -> Lime (#84cc16)
    const t = (p - 0.35) / 0.35;
    const r = Math.round(16 + t * (132 - 16));
    const g = Math.round(185 + t * (204 - 185));
    const b = Math.round(129 + t * (22 - 129));
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  } else if (p < 1.05) {
    // 0.7 -> Amber (#f59e0b), 1.05 -> Vivid Orange (#f97316)
    const t = (p - 0.7) / 0.35;
    const r = Math.round(245 + t * (249 - 245));
    const g = Math.round(158 + t * (115 - 158));
    const b = Math.round(11 + t * (22 - 11));
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  } else {
    // 1.05 -> Bright Crimson (#ef4444), 1.4+ -> Deep Scarlet (#be123c)
    const t = Math.min(1, (p - 1.05) / 0.45);
    const r = Math.round(239 + t * (190 - 239));
    const g = Math.round(68 + t * (18 - 68));
    const b = Math.round(68 + t * (60 - 68));
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}

/**
 * Computes min, max, avg pressure stats across all strokes.
 */
export function computeStrokesPressureStats(strokes: GlyphStroke[]): PressureHeatmapStats {
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
    return { min: 0, max: 0, avg: 0, pointCount: 0 };
  }

  return {
    min: Math.round(min * 100) / 100,
    max: Math.round(max * 100) / 100,
    avg: Math.round((sum / pointCount) * 100) / 100,
    pointCount,
  };
}

/**
 * Renders the pressure intensity heatmap visualization layer directly onto HTML5 canvas.
 */
export function renderPressureHeatmapLayer(
  ctx: CanvasRenderingContext2D,
  strokes: GlyphStroke[],
  baseWidth: number,
  options: {
    showNumericBadges?: boolean;
    showGlow?: boolean;
    alpha?: number;
  } = {}
) {
  const { showNumericBadges = true, showGlow = true, alpha = 0.88 } = options;

  if (!strokes || strokes.length === 0) return;

  ctx.save();

  // 1. First pass: Soft glowing halo under high pressure points
  if (showGlow) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const stroke of strokes) {
      if (stroke.length < 2) continue;
      for (let i = 1; i < stroke.length; i++) {
        const p0 = stroke[i - 1];
        const p1 = stroke[i];
        const avgP = ((p0.pressure ?? 1) + (p1.pressure ?? 1)) / 2;
        if (avgP > 0.6) {
          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(p1.x, p1.y);
          ctx.strokeStyle = getPressureHeatmapColor(avgP, 0.25);
          ctx.lineWidth = Math.max(12, baseWidth * avgP * 1.6);
          ctx.stroke();
        }
      }
    }
  }

  // 2. Second pass: Chromatic heat segments
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (const stroke of strokes) {
    if (!stroke || stroke.length === 0) continue;

    if (stroke.length === 1) {
      const pt = stroke[0];
      const p = pt.pressure ?? 1.0;
      ctx.fillStyle = getPressureHeatmapColor(p, alpha);
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, Math.max(4, (baseWidth * p) / 2), 0, Math.PI * 2);
      ctx.fill();
      continue;
    }

    for (let i = 1; i < stroke.length; i++) {
      const p0 = stroke[i - 1];
      const p1 = stroke[i];
      const avgP = ((p0.pressure ?? 1) + (p1.pressure ?? 1)) / 2;

      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.strokeStyle = getPressureHeatmapColor(avgP, alpha);
      ctx.lineWidth = Math.max(3, baseWidth * avgP * 0.95);
      ctx.stroke();
    }
  }

  // 3. Third pass: Pressure peak & valley caliper beads with values
  if (showNumericBadges) {
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const stroke of strokes) {
      if (stroke.length < 2) continue;

      // Sample along the stroke at regular intervals
      const step = Math.max(6, Math.floor(stroke.length / 5));
      for (let i = 0; i < stroke.length; i += step) {
        const pt = stroke[i];
        const p = pt.pressure ?? 1.0;
        const color = getPressureHeatmapColor(p, 1.0);

        // Circular bead
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Numeric pill badge
        const label = `${Math.round(p * 100)}%`;
        const metrics = ctx.measureText(label);
        const badgeW = metrics.width + 6;
        const badgeH = 13;
        const badgeX = pt.x + 8;
        const badgeY = pt.y - 8;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(badgeX - 2, badgeY - 6, badgeW, badgeH);

        ctx.fillStyle = color;
        ctx.fillText(label, badgeX + badgeW / 2 - 2, badgeY);
      }
    }
  }

  ctx.restore();
}
