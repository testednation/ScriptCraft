import { jsPDF } from 'jspdf';
import { FontMetadata, GlyphData, PenSettings } from '../types/font';
import { RulingStyle, TracingMode } from '../components/WorksheetStudio';

export interface WorksheetPdfOptions {
  metadata: FontMetadata;
  glyphs: Record<string, GlyphData>;
  liveFontFamily: string;
  penSettings: PenSettings;
  rulingStyle: RulingStyle;
  tracingMode: TracingMode;
  practiceText: string;
  paperFormat: 'letter' | 'a4';
  paperTone: 'ivory' | 'white' | 'sepia';
  lineHeight: number; // e.g. 36 - 64
  customSlant: number; // 0 - 60
  repeatLines: number; // lines per page, e.g. 6 - 10
  showStudentHeader: boolean;
  pageCount?: number; // 1 to 3
  ghostOpacity?: number; // 0.1 to 0.6
  onProgress?: (progress: number, statusText: string) => void;
}

// Color schemes for paper tones
const PAPER_TONES = {
  ivory: '#fcfbf7',
  white: '#ffffff',
  sepia: '#f7f2e8',
};

// DPI scale for crisp print vector/raster output
const DPI = 300;
const PT_PER_INCH = 72;
const SCALE_FACTOR = DPI / PT_PER_INCH; // ~4.1667

interface PageDimensions {
  widthPt: number;
  heightPt: number;
  widthPx: number;
  heightPx: number;
}

function getPageDimensions(format: 'letter' | 'a4'): PageDimensions {
  if (format === 'a4') {
    // 210 x 297 mm = 595.28 x 841.89 pt
    const widthPt = 595.28;
    const heightPt = 841.89;
    return {
      widthPt,
      heightPt,
      widthPx: Math.round(widthPt * SCALE_FACTOR),
      heightPx: Math.round(heightPt * SCALE_FACTOR),
    };
  }
  // US Letter 8.5 x 11 in = 612 x 792 pt
  const widthPt = 612;
  const heightPt = 792;
  return {
    widthPt,
    heightPt,
    widthPx: Math.round(widthPt * SCALE_FACTOR),
    heightPx: Math.round(heightPt * SCALE_FACTOR),
  };
}

/**
 * Draws standard ruled lines for a single row band on a 2D canvas
 */
function drawRulingLines(
  ctx: CanvasRenderingContext2D,
  rulingStyle: RulingStyle,
  rowLeft: number,
  rowRight: number,
  rowTop: number,
  rowBottom: number,
  rowHeight: number,
  customSlant: number
) {
  const rowWidth = rowRight - rowLeft;

  // 1. Slant guidelines overlay (if customSlant > 0)
  if (customSlant > 0) {
    ctx.save();
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1 * SCALE_FACTOR;
    ctx.globalAlpha = 0.35;
    ctx.setLineDash([4 * SCALE_FACTOR, 6 * SCALE_FACTOR]);

    const rad = (customSlant * Math.PI) / 180;
    const slantDx = rowHeight * Math.tan(rad);
    const spacing = Math.max(35 * SCALE_FACTOR, rowHeight * 0.65);

    // Cover full range including left overshoot
    const minX = rowLeft - Math.abs(slantDx) * 2;
    const maxX = rowRight + Math.abs(slantDx) * 2;

    for (let x = minX; x <= maxX; x += spacing) {
      ctx.beginPath();
      ctx.moveTo(x, rowBottom);
      ctx.lineTo(x + slantDx, rowTop);
      ctx.stroke();
    }
    ctx.restore();
  }

  // 2. Specific Ruling System Guidelines
  ctx.save();

  if (rulingStyle === 'primary') {
    // Primary / Kindergarten with Dotted Midline
    const headlineY = rowTop + rowHeight * 0.22;
    const midlineY = rowTop + rowHeight * 0.52;
    const baselineY = rowTop + rowHeight * 0.82;
    const descenderY = rowTop + rowHeight * 1.05;

    // Top Headline: Solid Blue
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 1.6 * SCALE_FACTOR;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.moveTo(rowLeft, headlineY);
    ctx.lineTo(rowRight, headlineY);
    ctx.stroke();

    // Midline: Dashed Amber/Gold
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.4 * SCALE_FACTOR;
    ctx.globalAlpha = 0.85;
    ctx.setLineDash([8 * SCALE_FACTOR, 6 * SCALE_FACTOR]);
    ctx.beginPath();
    ctx.moveTo(rowLeft, midlineY);
    ctx.lineTo(rowRight, midlineY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Baseline: Solid Red
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 2.0 * SCALE_FACTOR;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.moveTo(rowLeft, baselineY);
    ctx.lineTo(rowRight, baselineY);
    ctx.stroke();

    // Descender line: Dotted Light Blue
    ctx.strokeStyle = '#93c5fd';
    ctx.lineWidth = 1.0 * SCALE_FACTOR;
    ctx.globalAlpha = 0.5;
    ctx.setLineDash([4 * SCALE_FACTOR, 4 * SCALE_FACTOR]);
    ctx.beginPath();
    ctx.moveTo(rowLeft, descenderY);
    ctx.lineTo(rowRight, descenderY);
    ctx.stroke();
    ctx.setLineDash([]);
  } else if (rulingStyle === 'seyes') {
    // French Ruled (Grands Carreaux / Seyès)
    // 8mm main lines with 2mm auxiliary lines
    const mainUpperY = rowTop + rowHeight * 0.2;
    const mainBaselineY = rowTop + rowHeight * 0.8;

    // Major baseline: Deep indigo
    ctx.strokeStyle = '#4338ca';
    ctx.lineWidth = 2.0 * SCALE_FACTOR;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.moveTo(rowLeft, mainBaselineY);
    ctx.lineTo(rowRight, mainBaselineY);
    ctx.stroke();

    // Major upper headline: Indigo
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 1.6 * SCALE_FACTOR;
    ctx.globalAlpha = 0.75;
    ctx.beginPath();
    ctx.moveTo(rowLeft, mainUpperY);
    ctx.lineTo(rowRight, mainUpperY);
    ctx.stroke();

    // 2mm auxiliary lines
    ctx.strokeStyle = '#818cf8';
    ctx.lineWidth = 0.9 * SCALE_FACTOR;
    ctx.globalAlpha = 0.4;

    const step = (mainBaselineY - mainUpperY) / 4;
    for (let i = -1; i <= 5; i++) {
      if (i === 0 || i === 4) continue; // skip main lines
      const y = mainUpperY + i * step;
      if (y >= rowTop && y <= rowBottom + step * 0.5) {
        ctx.beginPath();
        ctx.moveTo(rowLeft, y);
        ctx.lineTo(rowRight, y);
        ctx.stroke();
      }
    }

    // Vertical 8mm grid lines across the row
    const vertStep = (mainBaselineY - mainUpperY) * 1.25;
    ctx.strokeStyle = '#a5b4fc';
    ctx.lineWidth = 0.8 * SCALE_FACTOR;
    ctx.globalAlpha = 0.35;
    for (let x = rowLeft; x <= rowRight; x += vertStep) {
      ctx.beginPath();
      ctx.moveTo(x, rowTop);
      ctx.lineTo(x, rowBottom);
      ctx.stroke();
    }
  } else if (rulingStyle === 'spencerian' || rulingStyle === 'copperplate') {
    // Proportional calligraphy ruling with slant lines
    const ascenderRatio = rulingStyle === 'spencerian' ? 0.25 : 0.22;
    const waistRatio = rulingStyle === 'spencerian' ? 0.55 : 0.5;
    const baselineRatio = rulingStyle === 'spencerian' ? 0.85 : 0.82;
    const descenderRatio = rulingStyle === 'spencerian' ? 1.15 : 1.12;

    const ascY = rowTop + rowHeight * ascenderRatio;
    const waistY = rowTop + rowHeight * waistRatio;
    const baseY = rowTop + rowHeight * baselineRatio;
    const descY = rowTop + rowHeight * descenderRatio;

    // Ascender line (dashed)
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.0 * SCALE_FACTOR;
    ctx.globalAlpha = 0.55;
    ctx.setLineDash([5 * SCALE_FACTOR, 5 * SCALE_FACTOR]);
    ctx.beginPath();
    ctx.moveTo(rowLeft, ascY);
    ctx.lineTo(rowRight, ascY);
    ctx.stroke();

    // Waist / x-height line
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.2 * SCALE_FACTOR;
    ctx.globalAlpha = 0.7;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(rowLeft, waistY);
    ctx.lineTo(rowRight, waistY);
    ctx.stroke();

    // Baseline (solid, prominent)
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.0 * SCALE_FACTOR;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.moveTo(rowLeft, baseY);
    ctx.lineTo(rowRight, baseY);
    ctx.stroke();

    // Descender line (dashed)
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.0 * SCALE_FACTOR;
    ctx.globalAlpha = 0.55;
    ctx.setLineDash([5 * SCALE_FACTOR, 5 * SCALE_FACTOR]);
    ctx.beginPath();
    ctx.moveTo(rowLeft, descY);
    ctx.lineTo(rowRight, descY);
    ctx.stroke();
    ctx.setLineDash([]);
  } else if (rulingStyle === 'college') {
    // College Ruled (Standard 7.1mm lines with vertical margin)
    const baseY = rowTop + rowHeight * 0.82;

    // Horizontal ruled line
    ctx.strokeStyle = '#93c5fd';
    ctx.lineWidth = 1.4 * SCALE_FACTOR;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.moveTo(rowLeft, baseY);
    ctx.lineTo(rowRight, baseY);
    ctx.stroke();

    // Vertical pink/red margin rule
    const marginX = rowLeft + 70 * SCALE_FACTOR;
    ctx.strokeStyle = '#f87171';
    ctx.lineWidth = 1.4 * SCALE_FACTOR;
    ctx.globalAlpha = 0.75;
    ctx.beginPath();
    ctx.moveTo(marginX, rowTop);
    ctx.lineTo(marginX, rowBottom);
    ctx.stroke();
  } else if (rulingStyle === 'dotgrid') {
    // 5mm Dot Grid Matrix
    const dotSpacing = 20 * SCALE_FACTOR;
    ctx.fillStyle = '#64748b';
    ctx.globalAlpha = 0.55;
    const dotRadius = 1.4 * SCALE_FACTOR;

    for (let y = rowTop + 8 * SCALE_FACTOR; y <= rowBottom - 8 * SCALE_FACTOR; y += dotSpacing) {
      for (let x = rowLeft; x <= rowRight; x += dotSpacing) {
        ctx.beginPath();
        ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (rulingStyle === 'architect') {
    // Technical Square Drafting Grid
    const gridStep = 18 * SCALE_FACTOR;
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 0.8 * SCALE_FACTOR;
    ctx.globalAlpha = 0.8;

    // Minor horizontal & vertical
    for (let y = rowTop; y <= rowBottom; y += gridStep) {
      ctx.beginPath();
      ctx.moveTo(rowLeft, y);
      ctx.lineTo(rowRight, y);
      ctx.stroke();
    }
    for (let x = rowLeft; x <= rowRight; x += gridStep) {
      ctx.beginPath();
      ctx.moveTo(x, rowTop);
      ctx.lineTo(x, rowBottom);
      ctx.stroke();
    }

    // Baseline accent
    const baseY = rowTop + rowHeight * 0.82;
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.6 * SCALE_FACTOR;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(rowLeft, baseY);
    ctx.lineTo(rowRight, baseY);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Renders a single printable worksheet page onto a canvas
 */
async function renderPageToCanvas(
  options: WorksheetPdfOptions,
  pageIndex: number,
  totalPages: number,
  pageText: string
): Promise<HTMLCanvasElement> {
  const {
    metadata,
    liveFontFamily,
    rulingStyle,
    tracingMode,
    paperFormat,
    paperTone,
    lineHeight,
    customSlant,
    repeatLines,
    showStudentHeader,
  } = options;

  const dims = getPageDimensions(paperFormat);
  const canvas = document.createElement('canvas');
  canvas.width = dims.widthPx;
  canvas.height = dims.heightPx;

  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Could not get 2D canvas context');

  // Fill background tone
  ctx.fillStyle = PAPER_TONES[paperTone] || PAPER_TONES.ivory;
  ctx.fillRect(0, 0, dims.widthPx, dims.heightPx);

  // Outer printable margins (0.6 inch / 43 pt padding)
  const marginX = 42 * SCALE_FACTOR;
  const marginTop = 40 * SCALE_FACTOR;
  const marginBottom = 36 * SCALE_FACTOR;
  const contentWidth = dims.widthPx - marginX * 2;

  let currentY = marginTop;

  // 1. Draw Student Header if requested
  if (showStudentHeader) {
    ctx.save();
    // Font family & worksheet title
    ctx.fillStyle = '#0f172a';
    ctx.font = `bold ${14 * SCALE_FACTOR}px "Plus Jakarta Sans", sans-serif`;
    ctx.fillText(
      `${metadata.familyName || 'ScriptCraft Studio'} · Penmanship Practice Worksheet`,
      marginX,
      currentY + 14 * SCALE_FACTOR
    );

    // Subtitle / ruling metadata
    ctx.fillStyle = '#64748b';
    ctx.font = `${9.5 * SCALE_FACTOR}px "Plus Jakarta Sans", sans-serif`;
    const slantText = customSlant > 0 ? ` · Slant: ${customSlant}°` : '';
    ctx.fillText(
      `Ruling: ${rulingStyle.toUpperCase()} · Mode: ${tracingMode.toUpperCase()}${slantText} · Scale: ${lineHeight}pt`,
      marginX,
      currentY + 28 * SCALE_FACTOR
    );

    // Student fields on right
    ctx.fillStyle = '#475569';
    ctx.font = `${10 * SCALE_FACTOR}px "Plus Jakarta Sans", sans-serif`;
    const headerRight = dims.widthPx - marginX;

    // Score line
    ctx.fillText('Score: ______', headerRight - 85 * SCALE_FACTOR, currentY + 14 * SCALE_FACTOR);
    // Date line
    ctx.fillText('Date: ____________', headerRight - 220 * SCALE_FACTOR, currentY + 14 * SCALE_FACTOR);
    // Name line
    ctx.fillText('Name: ________________________', headerRight - 440 * SCALE_FACTOR, currentY + 14 * SCALE_FACTOR);

    // Separator line
    currentY += 40 * SCALE_FACTOR;
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1 * SCALE_FACTOR;
    ctx.beginPath();
    ctx.moveTo(marginX, currentY);
    ctx.lineTo(dims.widthPx - marginX, currentY);
    ctx.stroke();
    currentY += 16 * SCALE_FACTOR;
    ctx.restore();
  } else {
    currentY += 10 * SCALE_FACTOR;
  }

  // 2. Calculate practice row vertical distribution
  const footerHeight = 30 * SCALE_FACTOR;
  const availableContentHeight = dims.heightPx - currentY - marginBottom - footerHeight;
  const rowCount = Math.max(3, Math.min(14, repeatLines));
  const rowBandHeight = Math.min(
    availableContentHeight / rowCount,
    lineHeight * 2.2 * SCALE_FACTOR
  );
  const rowInnerHeight = rowBandHeight * 0.85;

  // Wait for font to be ready for text rendering
  try {
    await document.fonts.ready;
  } catch (e) {
    // non-fatal
  }

  const textFontSize = rowInnerHeight * 0.58;
  const textBaselineOffset = rowInnerHeight * 0.78;

  // 3. Render each practice row
  for (let i = 0; i < rowCount; i++) {
    const rowTop = currentY + i * rowBandHeight;
    const rowBottom = rowTop + rowInnerHeight;
    const rowLeft = marginX;
    const rowRight = dims.widthPx - marginX;

    // Draw Ruling guidelines
    drawRulingLines(
      ctx,
      rulingStyle,
      rowLeft,
      rowRight,
      rowTop,
      rowBottom,
      rowInnerHeight,
      customSlant
    );

    // Determine tracing state for this row
    const isExemplarRow = i === 0 && tracingMode === 'exemplar';
    const isBlankRow =
      tracingMode === 'blank' || (tracingMode === 'exemplar' && i > 0);
    const isGhostRow = tracingMode === 'ghost' || isExemplarRow;
    const isDottedRow = tracingMode === 'dotted';

    // Render Sample Text Trace if not a blank row
    if (!isBlankRow && pageText.trim().length > 0) {
      ctx.save();
      const textX =
        rulingStyle === 'college'
          ? rowLeft + 85 * SCALE_FACTOR
          : rowLeft + 16 * SCALE_FACTOR;
      const textY = rowTop + textBaselineOffset;

      ctx.font = `${textFontSize}px "${liveFontFamily}", cursive, sans-serif`;
      ctx.textBaseline = 'alphabetic';

      if (isExemplarRow) {
        // Dark exemplar solid guide
        ctx.fillStyle = '#0f172a';
        ctx.fillText(pageText, textX, textY);
      } else if (isDottedRow) {
        // Dotted trace outline
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = Math.max(1.5, 1.2 * SCALE_FACTOR);
        ctx.setLineDash([3 * SCALE_FACTOR, 4 * SCALE_FACTOR]);
        ctx.strokeText(pageText, textX, textY);
        // faint background fill for readability
        ctx.fillStyle = 'rgba(100, 116, 139, 0.12)';
        ctx.fillText(pageText, textX, textY);
      } else if (isGhostRow) {
        // Light ghost tint for tracing
        const opacity = options.ghostOpacity ?? 0.28;
        ctx.fillStyle = `rgba(71, 85, 105, ${opacity})`;
        ctx.fillText(pageText, textX, textY);
      }

      ctx.restore();
    }
  }

  // 4. Draw Footer
  const footerY = dims.heightPx - marginBottom;
  ctx.save();
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 0.8 * SCALE_FACTOR;
  ctx.beginPath();
  ctx.moveTo(marginX, footerY - 14 * SCALE_FACTOR);
  ctx.lineTo(dims.widthPx - marginX, footerY - 14 * SCALE_FACTOR);
  ctx.stroke();

  ctx.fillStyle = '#94a3b8';
  ctx.font = `${8 * SCALE_FACTOR}px "Plus Jakarta Sans", monospace`;
  ctx.fillText(
    `Generated with ScriptCraft Studio · TrueType Font Foundry & Handwriting Practice`,
    marginX,
    footerY
  );

  const pageLabel = `Page ${pageIndex + 1} of ${totalPages}`;
  const pageLabelWidth = ctx.measureText(pageLabel).width;
  ctx.fillText(pageLabel, (dims.widthPx - pageLabelWidth) / 2, footerY);

  const disciplineLabel = `Target: Daily 15-min muscle memory discipline`;
  const discWidth = ctx.measureText(disciplineLabel).width;
  ctx.fillText(disciplineLabel, dims.widthPx - marginX - discWidth, footerY);
  ctx.restore();

  return canvas;
}

/**
 * Standard drills for multi-page practice packets
 */
export const MULTIPAGE_PACKET_DRILLS = [
  'Sphinx of black quartz, judge my vow.',
  'The quick brown fox jumps over the lazy dog.',
  'Aa Bb Cc Dd Ee Ff Gg Hh Ii Jj Kk Ll Mm Nn Oo Pp Qq Rr Ss Tt Uu Vv Ww Xx Yy Zz',
  '0 1 2 3 4 5 6 7 8 9 · Daily 15-minute muscle memory discipline',
  'Patience and rhythm turn simple strokes into living art.',
];

/**
 * Main export function: Compiles high-resolution canvas sheets into a standalone PDF
 * and initiates an immediate browser download.
 */
export async function generateWorksheetPdf(options: WorksheetPdfOptions): Promise<void> {
  const {
    metadata,
    paperFormat,
    practiceText,
    pageCount = 1,
    onProgress,
  } = options;

  onProgress?.(10, 'Initializing PDF document...');

  const dims = getPageDimensions(paperFormat);
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: paperFormat === 'letter' ? 'letter' : 'a4',
    compress: true,
  });

  const totalPages = Math.max(1, Math.min(5, pageCount));

  for (let p = 0; p < totalPages; p++) {
    const pagePercent = Math.round(15 + (p / totalPages) * 75);
    onProgress?.(
      pagePercent,
      `Rendering high-resolution vector worksheet (Page ${p + 1} of ${totalPages})...`
    );

    // Determine text for this page
    let currentText = practiceText;
    if (totalPages > 1) {
      if (p === 0) currentText = practiceText;
      else if (p === 1) currentText = MULTIPAGE_PACKET_DRILLS[2]; // Aa - Zz Alphabet drill
      else if (p === 2) currentText = MULTIPAGE_PACKET_DRILLS[3]; // Numerals drill
      else currentText = MULTIPAGE_PACKET_DRILLS[p % MULTIPAGE_PACKET_DRILLS.length];
    }

    // Render to high-DPI canvas
    const pageCanvas = await renderPageToCanvas(options, p, totalPages, currentText);

    // Convert to compressed high-quality JPEG
    const imgData = pageCanvas.toDataURL('image/jpeg', 0.94);

    if (p > 0) {
      doc.addPage(paperFormat === 'letter' ? 'letter' : 'a4', 'portrait');
    }

    doc.addImage(imgData, 'JPEG', 0, 0, dims.widthPt, dims.heightPt, undefined, 'FAST');
  }

  onProgress?.(95, 'Finalizing PDF file...');

  // Safe file name
  const sanitizedName = (metadata.familyName || 'Handwriting')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `${sanitizedName}_Practice_Worksheet.pdf`;

  // Trigger download
  doc.save(filename);

  onProgress?.(100, 'PDF successfully downloaded!');
}
