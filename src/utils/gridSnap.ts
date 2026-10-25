import { GlyphStroke } from '../types/font';

export interface GridSnapSettings {
  enabled: boolean;
  gridSize: number; // Pitch in canvas pixels, default 20px
  snapEndpointsOnly: boolean; // default true (aligns stroke start and end points)
  magneticThreshold: number; // Magnetic snap radius in pixels, default 16px
  showGridLines: boolean; // default true
  showIntersectionDots: boolean; // default true
  majorGridEvery: number; // default 5 (every 5th line is accented)
}

export const DEFAULT_GRID_SNAP_SETTINGS: GridSnapSettings = {
  enabled: false,
  gridSize: 20,
  snapEndpointsOnly: true,
  magneticThreshold: 16,
  showGridLines: true,
  showIntersectionDots: true,
  majorGridEvery: 5,
};

/**
 * Snaps a single point to the nearest grid intersection if within magneticThreshold
 */
export function snapPointToGrid(
  pt: { x: number; y: number; pressure?: number },
  gridSize: number,
  threshold: number = 16
): { point: { x: number; y: number; pressure?: number }; snapped: boolean; targetX: number; targetY: number } {
  const targetX = Math.round(pt.x / gridSize) * gridSize;
  const targetY = Math.round(pt.y / gridSize) * gridSize;
  const dist = Math.hypot(pt.x - targetX, pt.y - targetY);

  if (threshold <= 0 || dist <= threshold) {
    return {
      point: {
        x: targetX,
        y: targetY,
        pressure: pt.pressure ?? 1.0,
      },
      snapped: true,
      targetX,
      targetY,
    };
  }

  return {
    point: { ...pt },
    snapped: false,
    targetX,
    targetY,
  };
}

/**
 * Snaps the start and end points (endpoints) of a single stroke to the grid
 */
export function snapStrokeEndpoints(
  stroke: GlyphStroke,
  gridSize: number,
  threshold: number = 16,
  endpointsOnly: boolean = true
): { stroke: GlyphStroke; startSnapped: boolean; endSnapped: boolean } {
  if (!stroke || stroke.length === 0) {
    return { stroke: [], startSnapped: false, endSnapped: false };
  }

  if (stroke.length === 1) {
    const res = snapPointToGrid(stroke[0], gridSize, threshold);
    return {
      stroke: [res.point],
      startSnapped: res.snapped,
      endSnapped: res.snapped,
    };
  }

  const result = stroke.map((p) => ({ ...p }));

  if (endpointsOnly) {
    // Snap only start and end points
    const startRes = snapPointToGrid(result[0], gridSize, threshold);
    result[0] = startRes.point;

    const endRes = snapPointToGrid(result[result.length - 1], gridSize, threshold);
    result[result.length - 1] = endRes.point;

    return {
      stroke: result,
      startSnapped: startRes.snapped,
      endSnapped: endRes.snapped,
    };
  }

  // Snap all points in the stroke
  let startSnapped = false;
  let endSnapped = false;
  const allSnapped = result.map((p, idx) => {
    const res = snapPointToGrid(p, gridSize, threshold);
    if (idx === 0) startSnapped = res.snapped;
    if (idx === result.length - 1) endSnapped = res.snapped;
    return res.point;
  });

  return {
    stroke: allSnapped,
    startSnapped,
    endSnapped,
  };
}

/**
 * Snaps all stroke endpoints in a glyph to the configured grid
 */
export function snapGlyphStrokesEndpoints(
  strokes: GlyphStroke[],
  gridSize: number,
  threshold: number = 16,
  endpointsOnly: boolean = true
): { strokes: GlyphStroke[]; snappedEndpointsCount: number; totalEndpoints: number } {
  if (!strokes || strokes.length === 0) {
    return { strokes: [], snappedEndpointsCount: 0, totalEndpoints: 0 };
  }

  let snappedCount = 0;
  let totalEndpoints = 0;

  const modifiedStrokes = strokes.map((stroke) => {
    if (stroke.length === 0) return stroke;
    totalEndpoints += stroke.length === 1 ? 1 : 2;

    const { stroke: snappedStroke, startSnapped, endSnapped } = snapStrokeEndpoints(
      stroke,
      gridSize,
      threshold,
      endpointsOnly
    );

    if (stroke.length === 1) {
      if (startSnapped) snappedCount++;
    } else {
      if (startSnapped) snappedCount++;
      if (endSnapped) snappedCount++;
    }

    return snappedStroke;
  });

  return {
    strokes: modifiedStrokes,
    snappedEndpointsCount: snappedCount,
    totalEndpoints,
  };
}

/**
 * Computes alignment statistics for endpoints against the grid pitch
 */
export function computeGridAlignmentMetrics(
  strokes: GlyphStroke[],
  gridSize: number,
  tolerance: number = 2
): {
  alignedEndpoints: number;
  totalEndpoints: number;
  alignmentPercentage: number;
} {
  if (!strokes || strokes.length === 0) {
    return { alignedEndpoints: 0, totalEndpoints: 0, alignmentPercentage: 100 };
  }

  let aligned = 0;
  let total = 0;

  for (const s of strokes) {
    if (s.length === 0) continue;
    const ptsToCheck = s.length === 1 ? [s[0]] : [s[0], s[s.length - 1]];

    for (const pt of ptsToCheck) {
      total++;
      const nearestX = Math.round(pt.x / gridSize) * gridSize;
      const nearestY = Math.round(pt.y / gridSize) * gridSize;
      const dx = Math.abs(pt.x - nearestX);
      const dy = Math.abs(pt.y - nearestY);
      if (dx <= tolerance && dy <= tolerance) {
        aligned++;
      }
    }
  }

  const percentage = total > 0 ? Math.round((aligned / total) * 100) : 100;
  return {
    alignedEndpoints: aligned,
    totalEndpoints: total,
    alignmentPercentage: percentage,
  };
}

/**
 * Renders the geometric grid lines, magnetic intersection nodes, and live snapping crosshairs on the canvas
 */
export function drawCanvasGridOverlay(
  ctx: CanvasRenderingContext2D,
  gridSize: number,
  options: {
    width?: number;
    height?: number;
    hoverPt?: { x: number; y: number } | null;
    magneticThreshold?: number;
    showIntersectionDots?: boolean;
    majorGridEvery?: number;
    accentColor?: string;
  } = {}
) {
  const {
    width = 800,
    height = 800,
    hoverPt = null,
    magneticThreshold = 16,
    showIntersectionDots = true,
    majorGridEvery = 5,
    accentColor = '#6366f1',
  } = options;

  if (gridSize <= 0) return;

  ctx.save();

  // 1. Minor grid lines (very delicate)
  ctx.lineWidth = 0.75;
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.16)'; // slate-400 at 16% opacity

  ctx.beginPath();
  for (let x = gridSize; x < width; x += gridSize) {
    // Skip major lines for now
    if ((x / gridSize) % majorGridEvery !== 0) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
  }
  for (let y = gridSize; y < height; y += gridSize) {
    if ((y / gridSize) % majorGridEvery !== 0) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
  }
  ctx.stroke();

  // 2. Major grid lines (subtly accented)
  const majorSize = gridSize * majorGridEvery;
  ctx.lineWidth = 1.0;
  ctx.strokeStyle = 'rgba(99, 102, 241, 0.22)'; // indigo-500 at 22% opacity

  ctx.beginPath();
  for (let x = majorSize; x < width; x += majorSize) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
  }
  for (let y = majorSize; y < height; y += majorSize) {
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
  }
  ctx.stroke();

  // 3. Optional intersection dots at grid vertices
  if (showIntersectionDots && gridSize >= 15) {
    ctx.fillStyle = 'rgba(100, 116, 139, 0.35)';
    for (let x = gridSize; x < width; x += gridSize) {
      const isMajorX = (x / gridSize) % majorGridEvery === 0;
      for (let y = gridSize; y < height; y += gridSize) {
        const isMajorY = (y / gridSize) % majorGridEvery === 0;
        const radius = isMajorX && isMajorY ? 1.6 : 1.0;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // 4. Live magnetic snapping reticle if hovering or drawing near an intersection
  if (hoverPt) {
    const snap = snapPointToGrid(hoverPt, gridSize, magneticThreshold);
    if (snap.snapped) {
      // Draw magnetic attraction halo
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 1.6;
      ctx.setLineDash([2, 2]);

      ctx.beginPath();
      ctx.arc(snap.targetX, snap.targetY, 7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Magnetic crosshair at target
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(snap.targetX - 9, snap.targetY);
      ctx.lineTo(snap.targetX + 9, snap.targetY);
      ctx.moveTo(snap.targetX, snap.targetY - 9);
      ctx.lineTo(snap.targetX, snap.targetY + 9);
      ctx.stroke();

      // Connector guideline from current pointer to snapped intersection
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.6)';
      ctx.lineWidth = 1.0;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(hoverPt.x, hoverPt.y);
      ctx.lineTo(snap.targetX, snap.targetY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Coordinate tooltip badge
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      const label = `Snap [${snap.targetX}, ${snap.targetY}]`;
      const textMetrics = ctx.measureText(label);
      const badgeW = textMetrics.width + 8;
      const badgeH = 15;
      const badgeX = snap.targetX + 10;
      const badgeY = snap.targetY - 10;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY - badgeH, badgeW, badgeH, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#a5b4fc';
      ctx.fillText(label, badgeX + 4, badgeY - 3);
    }
  }

  ctx.restore();
}
