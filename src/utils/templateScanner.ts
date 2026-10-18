import { GlyphStroke } from '../types/font';
import {
  CANVAS_ASCENDER,
  CANVAS_BASELINE,
  CANVAS_CAP_HEIGHT,
  CANVAS_SIZE,
  CANVAS_X_HEIGHT,
} from './fontEngine';

export const TEMPLATE_CHARS = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H',
  'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P',
  'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X',
  'Y', 'Z', '0', '1', '2', '3', '4', '5',
  'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h',
  'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p',
  'q', 'r', 's', 't', 'u', 'v', 'w', 'x',
  'y', 'z', '6', '7', '8', '9', '.', '!'
];

export const TEMPLATE_COLS = 8;
export const TEMPLATE_ROWS = 8;

/**
 * Generates a high-resolution printable SVG / Canvas Template Sheet
 */
export function generatePrintableTemplateCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const width = 2480; // A4 300dpi width
  const height = 3508; // A4 300dpi height
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Header
  ctx.fillStyle = '#111827';
  ctx.font = 'bold 64px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('ScriptCraft Handwriting Font Template', 140, 180);

  ctx.fillStyle = '#4b5563';
  ctx.font = '32px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(
    'Fill each box with your natural handwriting using a dark black or blue pen. Keep letters within guides.',
    140,
    240
  );

  // Registration corner markers for automatic scanner alignment
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#111827';
  // Top left
  ctx.strokeRect(100, 100, 40, 40);
  ctx.fillRect(115, 115, 10, 10);
  // Top right
  ctx.strokeRect(width - 140, 100, 40, 40);
  ctx.fillRect(width - 125, 115, 10, 10);
  // Bottom left
  ctx.strokeRect(100, height - 140, 40, 40);
  ctx.fillRect(115, height - 125, 10, 10);
  // Bottom right
  ctx.strokeRect(width - 140, height - 140, 40, 40);
  ctx.fillRect(width - 125, height - 125, 10, 10);

  // Grid coordinates
  const gridStartX = 140;
  const gridStartY = 340;
  const gridWidth = width - 280;
  const gridHeight = height - 520;

  const cellW = gridWidth / TEMPLATE_COLS;
  const cellH = gridHeight / TEMPLATE_ROWS;

  for (let row = 0; row < TEMPLATE_ROWS; row++) {
    for (let col = 0; col < TEMPLATE_COLS; col++) {
      const idx = row * TEMPLATE_COLS + col;
      if (idx >= TEMPLATE_CHARS.length) continue;
      const char = TEMPLATE_CHARS[idx];

      const x = gridStartX + col * cellW;
      const y = gridStartY + row * cellH;

      // Cell border
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, cellW, cellH);

      // Character Label in top left
      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 36px monospace';
      ctx.fillText(char, x + 16, y + 44);

      // Internal guidelines inside each box
      const baselineY = y + cellH * 0.75;
      const xHeightY = y + cellH * 0.5;
      const capHeightY = y + cellH * 0.3;

      // Baseline (solid light gray)
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(x + 10, baselineY);
      ctx.lineTo(x + cellW - 10, baselineY);
      ctx.stroke();

      // X-height (dashed)
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(x + 10, xHeightY);
      ctx.lineTo(x + cellW - 10, xHeightY);
      ctx.stroke();

      // Cap-height (dashed)
      ctx.beginPath();
      ctx.moveTo(x + 10, capHeightY);
      ctx.lineTo(x + cellW - 10, capHeightY);
      ctx.stroke();

      ctx.setLineDash([]);

      // Very faint watermark guide of character
      ctx.fillStyle = '#f1f5f9';
      ctx.font = 'bold 120px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(char, x + cellW / 2, baselineY);
      ctx.textAlign = 'left';
    }
  }

  // Footer instructions
  ctx.fillStyle = '#6b7280';
  ctx.font = '28px sans-serif';
  ctx.fillText(
    'Tip: Scan or photograph in good lighting without strong shadows, then upload to ScriptCraft.',
    140,
    height - 80
  );

  return canvas;
}

/**
 * Download the generated printable template as PNG
 */
export function downloadPrintableTemplate(): void {
  const canvas = generatePrintableTemplateCanvas();
  const link = document.createElement('a');
  link.download = 'ScriptCraft_Handwriting_Template.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
}

/**
 * Extract glyph strokes from an image crop using contour tracing & skeletonization
 */
export function traceStrokesFromCanvas(
  sourceCanvas: HTMLCanvasElement,
  threshold = 128
): GlyphStroke[] {
  const ctx = sourceCanvas.getContext('2d');
  if (!ctx) return [];

  const w = sourceCanvas.width;
  const h = sourceCanvas.height;
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  // Binarize
  const binary: Uint8Array = new Uint8Array(w * h);
  let minX = w;
  let maxX = 0;
  let minY = h;
  let maxY = 0;
  let inkPixelCount = 0;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];

      // Luminance
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      // Ink is dark and opaque
      if (a > 100 && lum < threshold) {
        binary[y * w + x] = 1;
        inkPixelCount++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      } else {
        binary[y * w + x] = 0;
      }
    }
  }

  if (inkPixelCount < 10 || maxX <= minX || maxY <= minY) {
    return [];
  }

  // Margin buffer
  const boxW = maxX - minX;
  const boxH = maxY - minY;

  // Map detected bounding box into standard canvas guidelines
  // Target height is around 400px (baseline to ascender)
  const targetH = CANVAS_BASELINE - CANVAS_ASCENDER; // 440px
  const scale = Math.min(2.5, Math.max(0.4, targetH / boxH));

  const targetBaseline = CANVAS_BASELINE;
  const targetCenterX = CANVAS_SIZE / 2;

  // Center the ink
  const offsetX = targetCenterX - (minX + boxW / 2) * scale;
  const offsetY = targetBaseline - maxY * scale;

  // Simple scanline vectorizer into connected runs
  const strokes: GlyphStroke[] = [];
  const visited = new Uint8Array(w * h);

  // Find ink components and trace paths
  for (let y = minY; y <= maxY; y += 2) {
    let currentStroke: { x: number; y: number; pressure: number }[] = [];

    for (let x = minX; x <= maxX; x += 2) {
      const idx = y * w + x;
      if (binary[idx] && !visited[idx]) {
        visited[idx] = 1;
        const ptX = Math.round(x * scale + offsetX);
        const ptY = Math.round(y * scale + offsetY);

        if (ptX >= 40 && ptX <= CANVAS_SIZE - 40 && ptY >= 40 && ptY <= CANVAS_SIZE - 40) {
          currentStroke.push({ x: ptX, y: ptY, pressure: 1.0 });
        }
      } else if (currentStroke.length > 0) {
        if (currentStroke.length >= 3) {
          strokes.push(currentStroke);
        }
        currentStroke = [];
      }
    }

    if (currentStroke.length >= 3) {
      strokes.push(currentStroke);
    }
  }

  return strokes;
}

/**
 * Slices an uploaded template image into 64 cells and extracts characters
 */
export async function sliceTemplateGrid(
  imageElement: HTMLImageElement,
  threshold = 140
): Promise<Record<string, GlyphStroke[]>> {
  const result: Record<string, GlyphStroke[]> = {};

  const canvas = document.createElement('canvas');
  canvas.width = imageElement.naturalWidth || imageElement.width;
  canvas.height = imageElement.naturalHeight || imageElement.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return result;
  ctx.drawImage(imageElement, 0, 0);

  // Estimate grid margins (assuming ~5% margin for headers/borders)
  const marginX = canvas.width * 0.055;
  const marginY = canvas.height * 0.10;
  const gridW = canvas.width - marginX * 2;
  const gridH = canvas.height - marginY - canvas.height * 0.06;

  const cellW = gridW / TEMPLATE_COLS;
  const cellH = gridH / TEMPLATE_ROWS;

  const cellCanvas = document.createElement('canvas');
  const cellCtx = cellCanvas.getContext('2d');
  if (!cellCtx) return result;

  for (let row = 0; row < TEMPLATE_ROWS; row++) {
    for (let col = 0; col < TEMPLATE_COLS; col++) {
      const idx = row * TEMPLATE_COLS + col;
      if (idx >= TEMPLATE_CHARS.length) continue;
      const char = TEMPLATE_CHARS[idx];

      const cropX = marginX + col * cellW + cellW * 0.08;
      const cropY = marginY + row * cellH + cellH * 0.15;
      const cropW = cellW * 0.84;
      const cropH = cellH * 0.80;

      cellCanvas.width = Math.round(cropW);
      cellCanvas.height = Math.round(cropH);

      cellCtx.clearRect(0, 0, cellCanvas.width, cellCanvas.height);
      cellCtx.drawImage(
        canvas,
        cropX,
        cropY,
        cropW,
        cropH,
        0,
        0,
        cellCanvas.width,
        cellCanvas.height
      );

      const strokes = traceStrokesFromCanvas(cellCanvas, threshold);
      if (strokes.length > 0) {
        result[char] = strokes;
      }
    }
  }

  return result;
}
