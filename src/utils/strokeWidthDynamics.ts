import { GlyphPoint, GlyphStroke, PenToolType } from '../types/font';

export interface StrokePointMetric {
  x: number;
  y: number;
  width: number;
  pressure: number;
  normalX: number;
  normalY: number;
  strokeIndex: number;
  pointIndex: number;
  tAlongGlyph: number; // 0 to 1
}

export interface GlyphStrokeMetrics {
  minWidth: number;
  maxWidth: number;
  avgWidth: number;
  dynamicRange: number;
  variationDelta: number;
  totalPoints: number;
  minPoint: StrokePointMetric | null;
  maxPoint: StrokePointMetric | null;
  samples: Array<{ percent: number; width: number; x: number; y: number; strokeIndex: number }>;
}

/**
 * Calibrates raw stylus / pointer pressure according to response curve and gamma.
 */
export function applyPressureCalibration(
  rawPressure: number = 1,
  curve: 'soft' | 'linear' | 'firm' | 'custom' = 'linear',
  gamma: number = 1.0
): number {
  const p = Math.max(0.04, Math.min(1.0, rawPressure));
  if (curve === 'soft') return Math.pow(p, 0.55); // sensitive, easy thick lines
  if (curve === 'firm') return Math.pow(p, 1.65); // requires firm press for broad lines
  if (curve === 'custom' && gamma && gamma > 0) return Math.pow(p, gamma);
  return p;
}

/**
 * Computes the exact pixel width at a stroke point based on penSettings and tangent direction.
 */
export function computeStrokePointWidth(
  baseWidth: number,
  pressure: number = 1,
  tool: PenToolType = 'rollerball',
  pressureSensitivity: boolean = true,
  dx: number = 0,
  dy: number = 1,
  nibAngle: number = 45,
  pressureCurve: 'soft' | 'linear' | 'firm' | 'custom' = 'linear',
  pressureGamma: number = 1.0
): number {
  if (!pressureSensitivity || tool === 'drafting') {
    return Math.max(1, baseWidth);
  }

  const rawPressure = typeof pressure === 'number' && pressure > 0 ? pressure : 1;
  const calibratedPressure = applyPressureCalibration(rawPressure, pressureCurve, pressureGamma);

  if (tool === 'fountain') {
    // Dynamic flex nib: high contrast between light hairlines and heavy swells
    const flex = Math.min(1.9, Math.max(0.4, calibratedPressure * 1.3));
    return Math.max(2, Math.round(baseWidth * flex * 10) / 10);
  }

  if (tool === 'calligraphy') {
    // Chisel nib angle modulation based on customizable nibAngle in degrees
    const len = Math.hypot(dx, dy) || 1;
    const rad = (nibAngle * Math.PI) / 180;
    const dot = Math.abs(Math.cos(rad) * (dx / len) + Math.sin(rad) * (dy / len));
    const chiselMod = 0.25 + 1.25 * (1 - dot);
    const pressMod = Math.min(1.4, Math.max(0.7, calibratedPressure));
    return Math.max(2, Math.round(baseWidth * chiselMod * pressMod * 10) / 10);
  }

  // Rollerball / gel pen: smooth natural pressure curve
  const smooth = Math.min(1.6, Math.max(0.48, calibratedPressure));
  return Math.max(2, Math.round(baseWidth * smooth * 10) / 10);
}

/**
 * Calculates comprehensive width variation metrics across all strokes of a glyph.
 */
export function getGlyphStrokeMetrics(
  strokes: GlyphStroke[],
  baseWidth: number,
  tool: PenToolType = 'rollerball',
  pressureSensitivity: boolean = true
): GlyphStrokeMetrics {
  const allPoints: StrokePointMetric[] = [];
  let totalLength = 0;

  // First pass: compute lengths and tangent vectors
  const strokeSegments: Array<{
    strokeIndex: number;
    points: Array<{ x: number; y: number; pressure: number; dx: number; dy: number; len: number }>;
  }> = [];

  for (let sIdx = 0; sIdx < strokes.length; sIdx++) {
    const stroke = strokes[sIdx];
    if (!stroke || stroke.length === 0) continue;

    const segPts: Array<{ x: number; y: number; pressure: number; dx: number; dy: number; len: number }> = [];

    for (let i = 0; i < stroke.length; i++) {
      const curr = stroke[i];
      let dx = 0;
      let dy = 0;

      if (stroke.length === 1) {
        dx = 0;
        dy = 1;
      } else if (i === 0) {
        dx = stroke[1].x - curr.x;
        dy = stroke[1].y - curr.y;
      } else if (i === stroke.length - 1) {
        dx = curr.x - stroke[i - 1].x;
        dy = curr.y - stroke[i - 1].y;
      } else {
        dx = stroke[i + 1].x - stroke[i - 1].x;
        dy = stroke[i + 1].y - stroke[i - 1].y;
      }

      const dist = i > 0 ? Math.hypot(curr.x - stroke[i - 1].x, curr.y - stroke[i - 1].y) : 0;
      totalLength += dist;
      segPts.push({ x: curr.x, y: curr.y, pressure: curr.pressure ?? 1, dx, dy, len: dist });
    }

    strokeSegments.push({ strokeIndex: sIdx, points: segPts });
  }

  if (strokeSegments.length === 0) {
    return {
      minWidth: baseWidth,
      maxWidth: baseWidth,
      avgWidth: baseWidth,
      dynamicRange: 1,
      variationDelta: 0,
      totalPoints: 0,
      minPoint: null,
      maxPoint: null,
      samples: [],
    };
  }

  let accumulatedDist = 0;
  let minPoint: StrokePointMetric | null = null;
  let maxPoint: StrokePointMetric | null = null;
  let sumWidth = 0;

  for (const seg of strokeSegments) {
    for (let i = 0; i < seg.points.length; i++) {
      const p = seg.points[i];
      accumulatedDist += p.len;
      const t = totalLength > 0 ? accumulatedDist / totalLength : i / Math.max(1, seg.points.length - 1);

      const len = Math.hypot(p.dx, p.dy) || 1;
      const nx = -p.dy / len;
      const ny = p.dx / len;

      const width = computeStrokePointWidth(baseWidth, p.pressure, tool, pressureSensitivity, p.dx, p.dy);
      sumWidth += width;

      const metric: StrokePointMetric = {
        x: p.x,
        y: p.y,
        width,
        pressure: p.pressure,
        normalX: nx,
        normalY: ny,
        strokeIndex: seg.strokeIndex,
        pointIndex: i,
        tAlongGlyph: t,
      };

      allPoints.push(metric);

      if (!minPoint || width < minPoint.width) {
        minPoint = metric;
      }
      if (!maxPoint || width > maxPoint.width) {
        maxPoint = metric;
      }
    }
  }

  const minWidth = minPoint ? minPoint.width : baseWidth;
  const maxWidth = maxPoint ? maxPoint.width : baseWidth;
  const avgWidth = allPoints.length > 0 ? Math.round((sumWidth / allPoints.length) * 10) / 10 : baseWidth;
  const dynamicRange = Math.round((maxWidth / Math.max(0.1, minWidth)) * 10) / 10;
  const variationDelta = Math.round((maxWidth - minWidth) * 10) / 10;

  // Build uniform waveform samples (e.g. 36 sample points)
  const sampleCount = 36;
  const samples: Array<{ percent: number; width: number; x: number; y: number; strokeIndex: number }> = [];

  if (allPoints.length <= sampleCount) {
    for (const pt of allPoints) {
      samples.push({
        percent: Math.round(pt.tAlongGlyph * 100),
        width: pt.width,
        x: pt.x,
        y: pt.y,
        strokeIndex: pt.strokeIndex,
      });
    }
  } else {
    for (let s = 0; s < sampleCount; s++) {
      const targetT = s / (sampleCount - 1);
      // Find closest metric point
      let closest = allPoints[0];
      let minDiff = Math.abs(closest.tAlongGlyph - targetT);
      for (let j = 1; j < allPoints.length; j++) {
        const diff = Math.abs(allPoints[j].tAlongGlyph - targetT);
        if (diff < minDiff) {
          minDiff = diff;
          closest = allPoints[j];
        }
      }
      samples.push({
        percent: Math.round(targetT * 100),
        width: closest.width,
        x: closest.x,
        y: closest.y,
        strokeIndex: closest.strokeIndex,
      });
    }
  }

  return {
    minWidth,
    maxWidth,
    avgWidth,
    dynamicRange,
    variationDelta,
    totalPoints: allPoints.length,
    minPoint,
    maxPoint,
    samples,
  };
}

/**
 * Computes polygon outline points (left boundary and right boundary) in canvas coordinates.
 */
export function generateStrokeContour(
  stroke: GlyphStroke,
  baseWidth: number,
  tool: PenToolType = 'rollerball',
  pressureSensitivity: boolean = true,
  nibAngle: number = 45,
  pressureCurve: 'soft' | 'linear' | 'firm' | 'custom' = 'linear',
  pressureGamma: number = 1.0
): { left: Array<{ x: number; y: number; width: number }>; right: Array<{ x: number; y: number; width: number }> } {
  const left: Array<{ x: number; y: number; width: number }> = [];
  const right: Array<{ x: number; y: number; width: number }> = [];

  if (!stroke || stroke.length === 0) return { left, right };

  for (let i = 0; i < stroke.length; i++) {
    const curr = stroke[i];
    let dx = 0;
    let dy = 0;

    if (stroke.length === 1) {
      dx = 0;
      dy = 1;
    } else if (i === 0) {
      dx = stroke[1].x - curr.x;
      dy = stroke[1].y - curr.y;
    } else if (i === stroke.length - 1) {
      dx = curr.x - stroke[i - 1].x;
      dy = curr.y - stroke[i - 1].y;
    } else {
      dx = stroke[i + 1].x - stroke[i - 1].x;
      dy = stroke[i + 1].y - stroke[i - 1].y;
    }

    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;

    const width = computeStrokePointWidth(
      baseWidth,
      curr.pressure ?? 1,
      tool,
      pressureSensitivity,
      dx,
      dy,
      nibAngle,
      pressureCurve,
      pressureGamma
    );
    const halfW = width / 2;

    left.push({
      x: Math.round(curr.x + nx * halfW),
      y: Math.round(curr.y + ny * halfW),
      width,
    });
    right.push({
      x: Math.round(curr.x - nx * halfW),
      y: Math.round(curr.y - ny * halfW),
      width,
    });
  }

  return { left, right };
}

/**
 * Generates an SVG path string for filled contour polygons of variable width strokes.
 */
export function strokesToContourSvgPath(
  strokes: GlyphStroke[],
  baseWidth: number,
  tool: PenToolType = 'rollerball',
  pressureSensitivity: boolean = true,
  nibAngle: number = 45,
  pressureCurve: 'soft' | 'linear' | 'firm' | 'custom' = 'linear',
  pressureGamma: number = 1.0
): string {
  let svg = '';

  for (const stroke of strokes) {
    if (!stroke || stroke.length === 0) continue;

    if (stroke.length === 1) {
      const w = computeStrokePointWidth(
        baseWidth,
        stroke[0].pressure ?? 1,
        tool,
        pressureSensitivity,
        0,
        1,
        nibAngle,
        pressureCurve,
        pressureGamma
      );
      const r = w / 2;
      svg += `M ${stroke[0].x - r} ${stroke[0].y} ` +
        `a ${r} ${r} 0 1 0 ${r * 2} 0 ` +
        `a ${r} ${r} 0 1 0 ${-r * 2} 0 `;
      continue;
    }

    const { left, right } = generateStrokeContour(
      stroke,
      baseWidth,
      tool,
      pressureSensitivity,
      nibAngle,
      pressureCurve,
      pressureGamma
    );
    if (left.length === 0) continue;

    let d = `M ${left[0].x} ${left[0].y} `;
    for (let i = 1; i < left.length; i++) {
      d += `L ${left[i].x} ${left[i].y} `;
    }
    for (let i = right.length - 1; i >= 0; i--) {
      d += `L ${right[i].x} ${right[i].y} `;
    }
    d += 'Z ';
    svg += d;
  }

  return svg.trim();
}

/**
 * Draws variable-width strokes on HTML5 Canvas.
 */
export function renderCanvasVariableStrokes(
  ctx: CanvasRenderingContext2D,
  strokes: GlyphStroke[],
  baseWidth: number,
  tool: PenToolType = 'rollerball',
  pressureSensitivity: boolean = true,
  strokeColor: string = '#1e293b',
  nibAngle: number = 45,
  pressureCurve: 'soft' | 'linear' | 'firm' | 'custom' = 'linear',
  pressureGamma: number = 1.0
) {
  for (const stroke of strokes) {
    if (!stroke || stroke.length === 0) continue;

    if (stroke.length === 1) {
      const w = computeStrokePointWidth(
        baseWidth,
        stroke[0].pressure ?? 1,
        tool,
        pressureSensitivity,
        0,
        1,
        nibAngle,
        pressureCurve,
        pressureGamma
      );
      ctx.fillStyle = strokeColor;
      ctx.beginPath();
      ctx.arc(stroke[0].x, stroke[0].y, w / 2, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }

    // Draw segment by segment with round line caps for smooth variable thickness
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = strokeColor;

    for (let i = 1; i < stroke.length; i++) {
      const p0 = stroke[i - 1];
      const p1 = stroke[i];
      const dx = p1.x - p0.x;
      const dy = p1.y - p0.y;

      const w0 = computeStrokePointWidth(
        baseWidth,
        p0.pressure ?? 1,
        tool,
        pressureSensitivity,
        dx,
        dy,
        nibAngle,
        pressureCurve,
        pressureGamma
      );
      const w1 = computeStrokePointWidth(
        baseWidth,
        p1.pressure ?? 1,
        tool,
        pressureSensitivity,
        dx,
        dy,
        nibAngle,
        pressureCurve,
        pressureGamma
      );
      const avgW = (w0 + w1) / 2;

      ctx.beginPath();
      ctx.lineWidth = avgW;
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }
  }
}

/**
 * Draws the visual indicator overlay on the canvas showing stroke width variation,
 * width contours, caliper lines, min/max callouts, and pressure status.
 */
export function drawStrokeWidthVisualIndicator(
  ctx: CanvasRenderingContext2D,
  strokes: GlyphStroke[],
  baseWidth: number,
  tool: PenToolType = 'rollerball',
  pressureSensitivity: boolean = true,
  options: {
    showContours?: boolean;
    showCalipers?: boolean;
    showHeatmap?: boolean;
    showMinMaxBadges?: boolean;
    showCenterline?: boolean;
  } = {}
) {
  const {
    showContours = true,
    showCalipers = true,
    showHeatmap = true,
    showMinMaxBadges = true,
    showCenterline = true,
  } = options;

  const metrics = getGlyphStrokeMetrics(strokes, baseWidth, tool, pressureSensitivity);
  if (metrics.totalPoints === 0) return;

  ctx.save();

  // 1. Draw variable width contour envelopes along both sides of each stroke
  if (showContours) {
    for (const stroke of strokes) {
      if (!stroke || stroke.length < 2) continue;
      const { left, right } = generateStrokeContour(stroke, baseWidth, tool, pressureSensitivity);

      // Translucent filled envelope
      ctx.beginPath();
      ctx.moveTo(left[0].x, left[0].y);
      for (let i = 1; i < left.length; i++) ctx.lineTo(left[i].x, left[i].y);
      for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i].x, right[i].y);
      ctx.closePath();

      if (pressureSensitivity && tool !== 'drafting') {
        ctx.fillStyle = 'rgba(99, 102, 241, 0.08)'; // Indigo tint
        ctx.strokeStyle = 'rgba(99, 102, 241, 0.55)'; // Crisp boundary outline
      } else {
        ctx.fillStyle = 'rgba(100, 116, 139, 0.06)';
        ctx.strokeStyle = 'rgba(100, 116, 139, 0.45)';
      }
      ctx.lineWidth = 1;
      ctx.fill();
      ctx.stroke();
    }
  }

  // 2. Centerline path with directional flow
  if (showCenterline) {
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = pressureSensitivity ? 'rgba(79, 70, 229, 0.4)' : 'rgba(148, 163, 184, 0.5)';
    ctx.setLineDash([3, 4]);

    for (const stroke of strokes) {
      if (!stroke || stroke.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      for (let i = 1; i < stroke.length; i++) {
        ctx.lineTo(stroke[i].x, stroke[i].y);
      }
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  // 3. Caliper crossbars with color-coded heatmap (thin -> cyan, mid -> amber, thick -> purple)
  if (showCalipers || showHeatmap) {
    for (let sIdx = 0; sIdx < strokes.length; sIdx++) {
      const stroke = strokes[sIdx];
      if (!stroke || stroke.length < 2) continue;

      const step = Math.max(1, Math.floor(stroke.length / 10)); // ~8-12 calipers per stroke

      for (let i = 0; i < stroke.length; i += step) {
        const curr = stroke[i];
        let dx = 0;
        let dy = 0;

        if (i === 0) {
          dx = stroke[1].x - curr.x;
          dy = stroke[1].y - curr.y;
        } else if (i === stroke.length - 1) {
          dx = curr.x - stroke[i - 1].x;
          dy = curr.y - stroke[i - 1].y;
        } else {
          dx = stroke[i + 1].x - stroke[i - 1].x;
          dy = stroke[i + 1].y - stroke[i - 1].y;
        }

        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;

        const w = computeStrokePointWidth(baseWidth, curr.pressure ?? 1, tool, pressureSensitivity, dx, dy);
        const halfW = w / 2;

        const lx = curr.x + nx * halfW;
        const ly = curr.y + ny * halfW;
        const rx = curr.x - nx * halfW;
        const ry = curr.y - ny * halfW;

        // Color based on width relative to min/max
        let color = '#6366f1'; // Default indigo
        if (metrics.maxWidth > metrics.minWidth) {
          const ratio = (w - metrics.minWidth) / (metrics.maxWidth - metrics.minWidth);
          if (ratio < 0.33) {
            color = '#06b6d4'; // Cyan (light hairline)
          } else if (ratio < 0.66) {
            color = '#f59e0b'; // Amber (medium)
          } else {
            color = '#ec4899'; // Pink/Purple (heavy swell)
          }
        }

        // Draw cross-section caliper bar
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.moveTo(lx, ly);
        ctx.lineTo(rx, ry);
        ctx.stroke();

        // Small end-ticks
        const tickLen = 3;
        ctx.beginPath();
        ctx.moveTo(lx - ny * tickLen, ly + nx * tickLen);
        ctx.lineTo(lx + ny * tickLen, ly - nx * tickLen);
        ctx.moveTo(rx - ny * tickLen, ry + nx * tickLen);
        ctx.lineTo(rx + ny * tickLen, ry - nx * tickLen);
        ctx.stroke();
      }
    }
  }

  // 4. Min Width & Max Width Pin Badges
  if (showMinMaxBadges) {
    if (pressureSensitivity && metrics.variationDelta > 1 && metrics.minPoint && metrics.maxPoint) {
      // Draw Min Width Callout (Emerald Green)
      drawCalloutBadge(
        ctx,
        metrics.minPoint.x,
        metrics.minPoint.y,
        `Min: ${metrics.minPoint.width}px`,
        '#059669',
        metrics.minPoint.normalX,
        metrics.minPoint.normalY,
        metrics.minPoint.width / 2 + 14
      );

      // Draw Max Width Callout (Violet/Rose)
      drawCalloutBadge(
        ctx,
        metrics.maxPoint.x,
        metrics.maxPoint.y,
        `Max: ${metrics.maxPoint.width}px`,
        '#7c3aed',
        metrics.maxPoint.normalX,
        metrics.maxPoint.normalY,
        metrics.maxPoint.width / 2 + 14
      );
    } else {
      // Monoline / Uniform callout
      const sample = metrics.minPoint || { x: 400, y: 400, normalX: 0, normalY: 1 };
      drawCalloutBadge(
        ctx,
        sample.x,
        sample.y,
        `Uniform: ${baseWidth}px`,
        '#475569',
        sample.normalX,
        sample.normalY,
        baseWidth / 2 + 14
      );
    }
  }

  // 5. Canvas Top-Right Indicator Pill
  drawStatusHeaderPill(ctx, metrics, baseWidth, tool, pressureSensitivity);

  ctx.restore();
}

/**
 * Draws a floating callout pin badge pointing to a specific width location.
 */
function drawCalloutBadge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  label: string,
  color: string,
  nx: number,
  ny: number,
  offsetDist: number
) {
  const targetX = x + nx * offsetDist;
  const targetY = y + ny * offsetDist;

  // Pointer stem line
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.4;
  ctx.moveTo(x, y);
  ctx.lineTo(targetX, targetY);
  ctx.stroke();

  // Target point dot
  ctx.beginPath();
  ctx.fillStyle = color;
  ctx.arc(x, y, 3, 0, Math.PI * 2);
  ctx.fill();

  // Text badge pill
  ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
  const textWidth = ctx.measureText(label).width;
  const pillW = textWidth + 14;
  const pillH = 20;
  const pillX = targetX - pillW / 2;
  const pillY = targetY - pillH / 2;

  // Badge background
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.beginPath();
  ctx.roundRect(pillX, pillY, pillW, pillH, 4);
  ctx.fill();

  // Badge border
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Text
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, targetX, targetY);
}

/**
 * Draws top status pill on canvas displaying current pressure sensitivity mode and dynamic range.
 */
function drawStatusHeaderPill(
  ctx: CanvasRenderingContext2D,
  metrics: GlyphStrokeMetrics,
  baseWidth: number,
  tool: PenToolType,
  pressureSensitivity: boolean
) {
  const pad = 12;
  const x = 780 - pad;
  const y = pad + 14;

  let text = '';
  let badgeColor = '#475569';
  let bgColor = 'rgba(255, 255, 255, 0.92)';

  if (!pressureSensitivity || tool === 'drafting') {
    text = `Pressure OFF • Uniform ${baseWidth}px (Monoline)`;
    badgeColor = '#64748b';
  } else {
    text = `Pressure Active • ${metrics.minWidth}px – ${metrics.maxWidth}px (${metrics.dynamicRange}× dynamic)`;
    badgeColor = '#4f46e5';
  }

  ctx.font = '600 11px system-ui, -apple-system, sans-serif';
  const textWidth = ctx.measureText(text).width;
  const boxW = textWidth + 24;
  const boxH = 24;
  const boxX = x - boxW;
  const boxY = y;

  // Background
  ctx.fillStyle = bgColor;
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxW, boxH, 6);
  ctx.fill();

  // Border
  ctx.strokeStyle = 'rgba(203, 213, 225, 0.8)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Indicator light dot
  ctx.beginPath();
  ctx.fillStyle = pressureSensitivity && tool !== 'drafting' ? '#10b981' : '#94a3b8';
  ctx.arc(boxX + 12, boxY + boxH / 2, 4, 0, Math.PI * 2);
  ctx.fill();

  // Label
  ctx.fillStyle = badgeColor;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, boxX + 22, boxY + boxH / 2);
}

/**
 * Helper to add natural calligraphic pressure variation to strokes
 * (great for strokes drawn with standard mouse or uniform presets).
 */
export function enhanceStrokesWithDynamicPressure(strokes: GlyphStroke[]): GlyphStroke[] {
  return strokes.map((stroke) => {
    if (!stroke || stroke.length === 0) return stroke;
    if (stroke.length === 1) return [{ ...stroke[0], pressure: 1.0 }];

    const n = stroke.length;
    return stroke.map((pt, i) => {
      // Progress along stroke: 0 to 1
      const progress = i / (n - 1);

      // Taper at start and end
      let taper = 1.0;
      if (progress < 0.15) {
        taper = 0.5 + 0.5 * (progress / 0.15);
      } else if (progress > 0.85) {
        taper = 0.5 + 0.5 * ((1 - progress) / 0.15);
      }

      // Downstroke swell: if movement is downward (dy > 0), increase pressure
      let dirMod = 1.0;
      if (i > 0) {
        const dy = pt.y - stroke[i - 1].y;
        const dx = pt.x - stroke[i - 1].x;
        const dist = Math.hypot(dx, dy) || 1;
        const downwardness = dy / dist; // 1 for pure down, -1 for pure up
        if (downwardness > 0.3) {
          dirMod = 1.0 + downwardness * 0.45; // up to 1.45x
        } else if (downwardness < -0.3) {
          dirMod = 0.75; // hairlines on upstrokes
        }
      }

      const newPressure = Math.round(Math.min(1.8, Math.max(0.4, taper * dirMod)) * 100) / 100;
      return { ...pt, pressure: newPressure };
    });
  });
}
