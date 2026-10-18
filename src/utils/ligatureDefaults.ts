import { GlyphStroke, LigatureData } from '../types/font';
import {
  CANVAS_ASCENDER,
  CANVAS_BASELINE,
  CANVAS_CAP_HEIGHT,
  CANVAS_X_HEIGHT,
} from './fontEngine';

// Helpers to interpolate points
function line(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  steps = 8,
  pressure = 1
): GlyphStroke {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    pts.push({
      x: Math.round(x1 + (x2 - x1) * t),
      y: Math.round(y1 + (y2 - y1) * t),
      pressure,
    });
  }
  return pts;
}

function arc(
  x0: number,
  y0: number,
  cx: number,
  cy: number,
  x1: number,
  y1: number,
  steps = 12,
  pressure = 1
): GlyphStroke {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const inv = 1 - t;
    const x = Math.round(inv * inv * x0 + 2 * inv * t * cx + t * t * x1);
    const y = Math.round(inv * inv * y0 + 2 * inv * t * cy + t * t * y1);
    pts.push({ x, y, pressure });
  }
  return pts;
}

function cubic(
  x0: number,
  y0: number,
  cx1: number,
  cy1: number,
  cx2: number,
  cy2: number,
  x1: number,
  y1: number,
  steps = 16,
  pressure = 1
): GlyphStroke {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const inv = 1 - t;
    const x = Math.round(
      inv * inv * inv * x0 +
        3 * inv * inv * t * cx1 +
        3 * inv * t * t * cx2 +
        t * t * t * x1
    );
    const y = Math.round(
      inv * inv * inv * y0 +
        3 * inv * inv * t * cy1 +
        3 * inv * t * t * cy2 +
        t * t * t * y1
    );
    pts.push({ x, y, pressure });
  }
  return pts;
}

export function generateStarterLigatures(): Record<string, LigatureData> {
  const base = CANVAS_BASELINE; // 600
  const xh = CANVAS_X_HEIGHT; // 400
  const asc = CANVAS_ASCENDER; // 160

  return {
    fi: {
      id: 'fi',
      sequence: 'fi',
      name: 'f_i',
      unicode: 0xfb01,
      advanceWidth: 720,
      description: 'The hood of f sweeps smoothly into the stem of i with unified flow.',
      strokes: [
        // f main stem and arch curving over to dot position of i
        arc(480, asc + 35, 420, asc - 15, 330, asc + 40, 10, 1.2),
        line(330, asc + 40, 330, base, 12, 1.2),
        // Continuous bridging crossbar connecting f to i
        line(240, xh, 520, xh, 12, 1.1),
        // i vertical stem
        line(520, xh, 520, base, 10, 1.1),
      ],
    },
    fl: {
      id: 'fl',
      sequence: 'fl',
      name: 'f_l',
      unicode: 0xfb02,
      advanceWidth: 760,
      description: 'The top terminal of f bridges continuously into the soaring ascender of l.',
      strokes: [
        // f stem
        arc(400, asc + 30, 350, asc - 20, 300, asc + 40, 8, 1.1),
        line(300, asc + 40, 300, base, 12, 1.2),
        // Continuous crossbar to l
        line(230, xh, 520, xh, 10, 1.0),
        // l tall stem with graceful baseline curl
        line(520, asc, 520, base - 25, 14, 1.2),
        arc(520, base - 25, 535, base + 10, 575, base, 8, 1.0),
      ],
    },
    st: {
      id: 'st',
      sequence: 'st',
      name: 's_t',
      unicode: 0xfb06,
      advanceWidth: 740,
      description: 'Historical ligature: top crest of s loops into the crossbar and stem of t.',
      strokes: [
        // s shape
        cubic(370, xh + 30, 320, xh - 15, 260, 470, 320, 500, 10, 1.1),
        cubic(320, 500, 380, 530, 320, base + 15, 260, base - 30, 10, 1.1),
        // High connective loop bridging over from s to t
        cubic(370, xh + 30, 430, xh - 35, 490, xh - 35, 540, xh, 12, 1.1),
        // t vertical stem
        line(540, asc + 40, 540, base - 20, 12, 1.2),
        arc(540, base - 20, 555, base + 10, 590, base, 6, 1.0),
        // t crossbar
        line(460, xh, 610, xh, 8, 1.0),
      ],
    },
    ff: {
      id: 'ff',
      sequence: 'ff',
      name: 'f_f',
      unicode: 0xfb00,
      advanceWidth: 760,
      description: 'Double f sharing a single unified horizontal crossbar.',
      strokes: [
        // Left f
        arc(360, asc + 30, 310, asc - 20, 270, asc + 40, 8, 1.1),
        line(270, asc + 40, 270, base, 12, 1.2),
        // Right f
        arc(570, asc + 30, 520, asc - 20, 480, asc + 40, 8, 1.1),
        line(480, asc + 40, 480, base, 12, 1.2),
        // Shared continuous crossbar
        line(200, xh, 570, xh, 14, 1.1),
      ],
    },
    ft: {
      id: 'ft',
      sequence: 'ft',
      name: 'f_t',
      advanceWidth: 740,
      description: 'The crossbar of f links directly across to form the crossbar of t.',
      strokes: [
        // f stem
        arc(370, asc + 30, 320, asc - 20, 280, asc + 40, 8, 1.1),
        line(280, asc + 40, 280, base, 12, 1.2),
        // Continuous shared crossbar
        line(210, xh, 590, xh, 12, 1.1),
        // t stem
        line(520, asc + 40, 520, base - 20, 12, 1.2),
        arc(520, base - 20, 535, base + 10, 575, base, 6, 1.0),
      ],
    },
    th: {
      id: 'th',
      sequence: 'th',
      name: 't_h',
      advanceWidth: 750,
      description: 'The crossbar of t flows seamlessly into the tall ascender shoulder of h.',
      strokes: [
        // t stem
        line(320, asc + 40, 320, base - 20, 12, 1.2),
        arc(320, base - 20, 335, base + 10, 370, base, 6, 1.0),
        // t crossbar connecting directly to h stem
        line(250, xh, 500, xh, 10, 1.0),
        // h tall stem
        line(500, asc, 500, base, 12, 1.2),
        // h shoulder
        arc(500, 470, 570, xh - 20, 620, 480, 8, 1.1),
        line(620, 480, 620, base, 8, 1.1),
      ],
    },
    oo: {
      id: 'oo',
      sequence: 'oo',
      name: 'o_o',
      advanceWidth: 780,
      description: 'Two cursive circular bowls connected by a high organic bridge.',
      strokes: [
        // First o
        cubic(290, xh, 210, xh + 30, 210, base - 30, 290, base, 12, 1.1),
        cubic(290, base, 370, base - 30, 370, xh + 30, 290, xh, 12, 1.1),
        // Connecting top arch
        arc(360, xh + 15, 420, xh - 15, 475, xh + 15, 8, 1.0),
        // Second o
        cubic(545, xh, 465, xh + 30, 465, base - 30, 545, base, 12, 1.1),
        cubic(545, base, 625, base - 30, 625, xh + 30, 545, xh, 12, 1.1),
      ],
    },
  };
}
