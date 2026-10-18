import { GlyphStroke } from '../types/font';
import {
  CANVAS_ASCENDER,
  CANVAS_BASELINE,
  CANVAS_CAP_HEIGHT,
  CANVAS_DESCENDER,
  CANVAS_ORIGIN_X,
  CANVAS_SIZE,
  CANVAS_X_HEIGHT,
} from './fontEngine';

export interface IsolatedBoundingBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  pixelCount: number;
  assignedChar?: string;
  previewDataUrl?: string;
  strokes?: GlyphStroke[];
  baselineOffset?: number; // manual fine-tune offset in font units
}

export interface IsolatorOptions {
  threshold: number; // 0 - 255 (default ~130)
  minArea: number; // minimum pixels to count as ink (default 25)
  maxArea?: number; // maximum pixels (to filter full page borders)
  invert: boolean; // if true, treat white/light as ink
  mergeAdjacent: boolean; // merge dots on i, j, accents, and crossbars
  smoothRadius: number; // polyline smoothing
}

export const DEFAULT_ISOLATOR_OPTIONS: IsolatorOptions = {
  threshold: 135,
  minArea: 30,
  invert: false,
  mergeAdjacent: true,
  smoothRadius: 1,
};

/**
 * Creates an authentic sample handwriting image with A-Z, a-z, and 0-9
 * on archival lined paper so users can test picture isolation right away.
 */
export function createSampleHandwritingImage(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 1600;
  canvas.height = 1100;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Archival warm paper background
  ctx.fillStyle = '#faf8f2';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Faint French Seyès / ruled lines
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.28)';
  ctx.lineWidth = 1.5;
  for (let y = 160; y < canvas.height - 40; y += 140) {
    ctx.beginPath();
    ctx.moveTo(80, y);
    ctx.lineTo(canvas.width - 80, y);
    ctx.stroke();

    // Dotted guide
    ctx.strokeStyle = 'rgba(203, 213, 225, 0.35)';
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.moveTo(80, y - 50);
    ctx.lineTo(canvas.width - 80, y - 50);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.28)';
  }

  // Header notes
  ctx.fillStyle = '#64748b';
  ctx.font = 'italic 28px "Caveat", "Playfair Display", Georgia, serif';
  ctx.fillText('Natural Penmanship Specimen — r/Handwriting Study #42', 90, 80);

  ctx.fillStyle = '#1e293b'; // Natural fountain pen ink
  ctx.font = '72px "Caveat", "Cedarville Cursive", cursive, serif';

  // Line 1: Uppercase A - M
  const line1 = 'A B C D E F G H I J K L M';
  ctx.fillText(line1, 100, 240);

  // Line 2: Uppercase N - Z
  const line2 = 'N O P Q R S T U V W X Y Z';
  ctx.fillText(line2, 100, 380);

  // Line 3: Lowercase a - m
  const line3 = 'a b c d e f g h i j k l m';
  ctx.fillText(line3, 100, 520);

  // Line 4: Lowercase n - z
  const line4 = 'n o p q r s t u v w x y z';
  ctx.fillText(line4, 100, 660);

  // Line 5: Numerals & sample phrase
  const line5 = '0 1 2 3 4 5 6 7 8 9 ! ? &';
  ctx.fillText(line5, 100, 800);

  // Line 6: Quote
  ctx.font = 'italic 46px "Caveat", cursive, serif';
  ctx.fillStyle = '#334155';
  ctx.fillText('"The quick brown fox jumps gracefully over the lazy dog."', 100, 940);

  return canvas.toDataURL('image/png');
}

/**
 * Connected Component Labeling and Character Isolation from any Canvas or Image
 */
export function isolateCharactersFromImage(
  imageSource: HTMLImageElement | HTMLCanvasElement,
  options: Partial<IsolatorOptions> = {}
): {
  boxes: IsolatedBoundingBox[];
  binaryCanvas: HTMLCanvasElement;
  width: number;
  height: number;
} {
  const opts = { ...DEFAULT_ISOLATOR_OPTIONS, ...options };

  // Prepare source canvas
  const canvas = document.createElement('canvas');
  const w = 'naturalWidth' in imageSource ? imageSource.naturalWidth || imageSource.width : imageSource.width;
  const h = 'naturalHeight' in imageSource ? imageSource.naturalHeight || imageSource.height : imageSource.height;

  // Max dimension downscale for fast responsive web processing if image is huge (e.g. 4000x3000)
  const maxDim = 1800;
  const scale = Math.min(1, maxDim / Math.max(w, h));
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    return {
      boxes: [],
      binaryCanvas: canvas,
      width: canvas.width,
      height: canvas.height,
    };
  }

  ctx.drawImage(imageSource, 0, 0, canvas.width, canvas.height);
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;
  const totalPixels = canvas.width * canvas.height;

  // Step 1: Binarization with Luminance calculation
  const binary = new Uint8Array(totalPixels);
  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const a = data[idx + 3];

    if (a < 80) {
      binary[i] = 0;
      continue;
    }

    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    const isInk = opts.invert ? lum > opts.threshold : lum < opts.threshold;
    binary[i] = isInk ? 1 : 0;
  }

  // Step 2: Connected Component Labeling using 8-connectivity Breadth-First-Search
  const visited = new Uint8Array(totalPixels);
  const rawBoxes: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    pixels: number;
    points: { x: number; y: number }[];
  }[] = [];

  const width = canvas.width;
  const height = canvas.height;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const startIdx = y * width + x;
      if (!binary[startIdx] || visited[startIdx]) continue;

      // Start new component flood-fill
      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;
      let pixelCount = 0;
      const points: { x: number; y: number }[] = [];

      const queue: number[] = [startIdx];
      visited[startIdx] = 1;

      while (queue.length > 0) {
        const curIdx = queue.pop()!;
        const cy = Math.floor(curIdx / width);
        const cx = curIdx % width;

        pixelCount++;
        points.push({ x: cx, y: cy });

        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;

        // Check 8 neighbors
        for (let dy = -1; dy <= 1; dy++) {
          const ny = cy + dy;
          if (ny < 0 || ny >= height) continue;

          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = cx + dx;
            if (nx < 0 || nx >= width) continue;

            const nIdx = ny * width + nx;
            if (binary[nIdx] && !visited[nIdx]) {
              visited[nIdx] = 1;
              queue.push(nIdx);
            }
          }
        }
      }

      // Filter out dust, stray specks, and enormous sheet borders
      const boxW = maxX - minX + 1;
      const boxH = maxY - minY + 1;
      const isNoise = pixelCount < opts.minArea || (boxW <= 2 && boxH <= 2);
      const isFullBorder = boxW > width * 0.96 && boxH > height * 0.96;

      if (!isNoise && !isFullBorder) {
        rawBoxes.push({ minX, minY, maxX, maxY, pixels: pixelCount, points });
      }
    }
  }

  // Step 3: Heuristic Multi-Stroke Character Merger
  // Merges dots (like i, j), umlauts/accents (e.g. é, ö), quotation marks, and overlapping strokes
  let merged = [...rawBoxes];
  if (opts.mergeAdjacent) {
    let changed = true;
    while (changed) {
      changed = false;
      const nextMerged: typeof rawBoxes = [];
      const used = new Set<number>();

      for (let i = 0; i < merged.length; i++) {
        if (used.has(i)) continue;
        let b1 = merged[i];

        for (let j = i + 1; j < merged.length; j++) {
          if (used.has(j)) continue;
          const b2 = merged[j];

          const w1 = b1.maxX - b1.minX + 1;
          const h1 = b1.maxY - b1.minY + 1;
          const w2 = b2.maxX - b2.minX + 1;
          const h2 = b2.maxY - b2.minY + 1;

          // Check if horizontally aligned and vertically close (like dot over i or j)
          const horizOverlap =
            Math.min(b1.maxX, b2.maxX) - Math.max(b1.minX, b2.minX);
          const vertDist =
            Math.max(b1.minY, b2.minY) - Math.min(b1.maxY, b2.maxY);

          const isDotOrAccent =
            horizOverlap > -Math.min(w1, w2) * 0.5 &&
            vertDist >= 0 &&
            vertDist < Math.max(h1, h2) * 0.75 &&
            (Math.min(w1, w2) < Math.max(w1, w2) * 0.6 || Math.min(h1, h2) < Math.max(h1, h2) * 0.6);

          // Check if bounding boxes overlap or touch significantly (like crossed 't' or disconnected stroke)
          const overlapX =
            Math.min(b1.maxX, b2.maxX) >= Math.max(b1.minX, b2.minX) - 4;
          const overlapY =
            Math.min(b1.maxY, b2.maxY) >= Math.max(b1.minY, b2.minY) - 4;
          const isOverlappingStrokes =
            overlapX && overlapY && Math.abs((b1.minY + b1.maxY) / 2 - (b2.minY + b2.maxY) / 2) < Math.max(h1, h2) * 0.8;

          if (isDotOrAccent || isOverlappingStrokes) {
            b1 = {
              minX: Math.min(b1.minX, b2.minX),
              minY: Math.min(b1.minY, b2.minY),
              maxX: Math.max(b1.maxX, b2.maxX),
              maxY: Math.max(b1.maxY, b2.maxY),
              pixels: b1.pixels + b2.pixels,
              points: [...b1.points, ...b2.points],
            };
            used.add(j);
            changed = true;
          }
        }

        nextMerged.push(b1);
      }
      merged = nextMerged;
    }
  }

  // Step 4: Sort in Natural Reading Order (Line by Line, Left to Right)
  // Compute average line height
  const avgHeight =
    merged.length > 0
      ? merged.reduce((sum, b) => sum + (b.maxY - b.minY + 1), 0) / merged.length
      : 50;

  // Group by vertical bands
  merged.sort((a, b) => {
    const centerAy = (a.minY + a.maxY) / 2;
    const centerBy = (b.minY + b.maxY) / 2;
    const lineDiff = Math.abs(centerAy - centerBy);

    // If on roughly the same line (within half average height), sort left-to-right
    if (lineDiff < avgHeight * 0.55) {
      return a.minX - b.minX;
    }
    return centerAy - centerBy;
  });

  // Step 5: Convert into Isolated Bounding Boxes with Vector Strokes and Thumbnails
  const binaryCanvas = document.createElement('canvas');
  binaryCanvas.width = width;
  binaryCanvas.height = height;
  const bCtx = binaryCanvas.getContext('2d');
  if (bCtx) {
    const bImg = bCtx.createImageData(width, height);
    for (let i = 0; i < totalPixels; i++) {
      const idx = i * 4;
      if (binary[i]) {
        bImg.data[idx] = 15;
        bImg.data[idx + 1] = 23;
        bImg.data[idx + 2] = 42;
        bImg.data[idx + 3] = 255;
      } else {
        bImg.data[idx] = 255;
        bImg.data[idx + 1] = 255;
        bImg.data[idx + 2] = 255;
        bImg.data[idx + 3] = 0;
      }
    }
    bCtx.putImageData(bImg, 0, 0);
  }

  const boxes: IsolatedBoundingBox[] = merged.map((b, idx) => {
    const boxW = b.maxX - b.minX + 1;
    const boxH = b.maxY - b.minY + 1;
    const padding = Math.max(4, Math.round(Math.min(boxW, boxH) * 0.12));

    const cropX = Math.max(0, b.minX - padding);
    const cropY = Math.max(0, b.minY - padding);
    const cropW = Math.min(width - cropX, boxW + padding * 2);
    const cropH = Math.min(height - cropY, boxH + padding * 2);

    // Create thumbnail preview
    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = cropW;
    thumbCanvas.height = cropH;
    const tCtx = thumbCanvas.getContext('2d');
    if (tCtx) {
      tCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
    }
    const previewDataUrl = thumbCanvas.toDataURL('image/png');

    // Vectorize strokes from the binary ink points
    const strokes = vectorizeInkPoints(
      b.points,
      b.minX,
      b.minY,
      boxW,
      boxH,
      0 // baseline offset default
    );

    return {
      id: `char-iso-${idx}-${Date.now().toString(36)}`,
      x: cropX,
      y: cropY,
      width: cropW,
      height: cropH,
      pixelCount: b.pixels,
      previewDataUrl,
      strokes,
      baselineOffset: 0,
    };
  });

  return {
    boxes,
    binaryCanvas,
    width,
    height,
  };
}

/**
 * Vectorizes ink points of an isolated character into smooth font polylines
 * mapped to standard canvas coordinates (baseline 600, ascender 160)
 */
export function vectorizeInkPoints(
  points: { x: number; y: number }[],
  minX: number,
  minY: number,
  boxW: number,
  boxH: number,
  baselineOffset = 0
): GlyphStroke[] {
  if (points.length === 0 || boxW <= 0 || boxH <= 0) return [];

  // Create local character grid
  const pad = 2;
  const gw = boxW + pad * 2;
  const gh = boxH + pad * 2;
  const grid = new Uint8Array(gw * gh);

  for (const pt of points) {
    const lx = pt.x - minX + pad;
    const ly = pt.y - minY + pad;
    if (lx >= 0 && lx < gw && ly >= 0 && ly < gh) {
      grid[ly * gw + lx] = 1;
    }
  }

  // Calculate target scaling and position in font space (800x800)
  // Typical cap height is ~440px (600 baseline - 160 ascender)
  const targetH = CANVAS_BASELINE - CANVAS_ASCENDER; // 440px
  const scale = Math.min(3.8, Math.max(0.4, (targetH * 0.95) / Math.max(boxH, 30)));

  const targetBaseline = CANVAS_BASELINE + baselineOffset;
  const targetCenterX = CANVAS_SIZE / 2;

  // Center horizontally, anchor on baseline
  const offsetX = targetCenterX - (boxW * scale) / 2;
  const offsetY = targetBaseline - boxH * scale;

  // Extract scanline strokes and boundary contours
  const strokes: GlyphStroke[] = [];
  const visited = new Uint8Array(gw * gh);

  // Scanline tracing with step of 2-3px for natural handwriting stroke resolution
  const step = Math.max(2, Math.floor(scale * 1.2));

  for (let ly = 0; ly < gh; ly += step) {
    let currentStroke: { x: number; y: number; pressure: number }[] = [];

    for (let lx = 0; lx < gw; lx += step) {
      const idx = ly * gw + lx;
      if (grid[idx] && !visited[idx]) {
        visited[idx] = 1;

        const fontX = Math.round((lx - pad) * scale + offsetX);
        const fontY = Math.round((ly - pad) * scale + offsetY);

        // Keep inside canvas bounds
        if (fontX >= 30 && fontX <= CANVAS_SIZE - 30 && fontY >= 30 && fontY <= CANVAS_SIZE - 30) {
          currentStroke.push({ x: fontX, y: fontY, pressure: 1.0 });
        }
      } else if (currentStroke.length > 0) {
        if (currentStroke.length >= 2) {
          strokes.push(currentStroke);
        }
        currentStroke = [];
      }
    }

    if (currentStroke.length >= 2) {
      strokes.push(currentStroke);
    }
  }

  // If scanlines produced very few strokes (e.g. thin vertical lines like 'l', '1', 'I'),
  // add a vertical column scan to capture crisp vertical stems
  if (strokes.length <= 1) {
    for (let lx = 0; lx < gw; lx += step) {
      let currentStroke: { x: number; y: number; pressure: number }[] = [];

      for (let ly = 0; ly < gh; ly += step) {
        const idx = ly * gw + lx;
        if (grid[idx] && !visited[idx]) {
          visited[idx] = 1;
          const fontX = Math.round((lx - pad) * scale + offsetX);
          const fontY = Math.round((ly - pad) * scale + offsetY);
          if (fontX >= 30 && fontX <= CANVAS_SIZE - 30 && fontY >= 30 && fontY <= CANVAS_SIZE - 30) {
            currentStroke.push({ x: fontX, y: fontY, pressure: 1.0 });
          }
        } else if (currentStroke.length > 0) {
          if (currentStroke.length >= 2) {
            strokes.push(currentStroke);
          }
          currentStroke = [];
        }
      }
      if (currentStroke.length >= 2) {
        strokes.push(currentStroke);
      }
    }
  }

  return strokes;
}

/**
 * Traces a user-defined manual crop rectangle on an image into font strokes
 */
export function traceCropToGlyphStrokes(
  sourceImage: HTMLImageElement | HTMLCanvasElement,
  crop: { x: number; y: number; width: number; height: number },
  threshold = 135,
  invert = false,
  baselineOffset = 0
): GlyphStroke[] {
  const cropCanvas = document.createElement('canvas');
  cropCanvas.width = Math.max(10, Math.round(crop.width));
  cropCanvas.height = Math.max(10, Math.round(crop.height));
  const ctx = cropCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return [];

  ctx.drawImage(
    sourceImage,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    cropCanvas.width,
    cropCanvas.height
  );

  const imgData = ctx.getImageData(0, 0, cropCanvas.width, cropCanvas.height);
  const data = imgData.data;
  const points: { x: number; y: number }[] = [];

  let minX = cropCanvas.width;
  let maxX = 0;
  let minY = cropCanvas.height;
  let maxY = 0;

  for (let y = 0; y < cropCanvas.height; y++) {
    for (let x = 0; x < cropCanvas.width; x++) {
      const idx = (y * cropCanvas.width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];

      if (a < 80) continue;

      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      const isInk = invert ? lum > threshold : lum < threshold;

      if (isInk) {
        points.push({ x, y });
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (points.length < 15 || maxX <= minX || maxY <= minY) {
    return [];
  }

  return vectorizeInkPoints(
    points,
    minX,
    minY,
    maxX - minX + 1,
    maxY - minY + 1,
    baselineOffset
  );
}
