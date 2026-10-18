import { GlyphStroke, HandwritingPreset } from '../types/font';
import {
  CANVAS_ASCENDER,
  CANVAS_BASELINE,
  CANVAS_CAP_HEIGHT,
  CANVAS_X_HEIGHT,
} from './fontEngine';

/**
 * Procedurally generates realistic stroke polylines for handwriting archetypes
 * based on typographic guidelines:
 * Ascender: ~160
 * Cap Height: ~240
 * X-Height: ~400
 * Baseline: ~600
 * Descender: ~760
 */

// Helper to interpolate points
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

// Helper to create bezier arcs
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

// Helper to create cubic curve
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

/**
 * Generate standard letter strokes for preset templates
 */
export function generateArchetypeGlyphs(
  style: 'architect' | 'cursive' | 'bujo' | 'ballpoint' | 'italic'
): Record<string, GlyphStroke[]> {
  const glyphs: Record<string, GlyphStroke[]> = {};

  const base = CANVAS_BASELINE; // 600
  const cap = CANVAS_CAP_HEIGHT; // 240
  const xh = CANVAS_X_HEIGHT; // 400
  const asc = CANVAS_ASCENDER; // 160
  const desc = 740; // Descender

  // Apply slant offset
  const slantOffset = (y: number) => {
    if (style === 'cursive') return Math.round((base - y) * 0.28);
    if (style === 'ballpoint') return Math.round((base - y) * 0.12);
    if (style === 'italic') return Math.round((base - y) * 0.18);
    return 0;
  };

  const p = (x: number, y: number) => ({
    x: x + slantOffset(y),
    y,
  });

  // Uppercase A
  glyphs['A'] = [
    line(p(340, cap).x, cap, p(240, base).x, base, 12, 1.1),
    line(p(340, cap).x, cap, p(440, base).x, base, 12, 1.2),
    line(p(270, 480).x, 480, p(410, 480).x, 480, 8, 0.9),
  ];

  // Uppercase B
  glyphs['B'] = [
    line(p(250, cap).x, cap, p(250, base).x, base, 12, 1.2),
    cubic(
      p(250, cap).x,
      cap,
      p(420, cap - 20).x,
      cap + 40,
      p(420, 430).x,
      400,
      p(250, 430).x,
      430,
      14,
      1.1
    ),
    cubic(
      p(250, 430).x,
      430,
      p(440, 430).x,
      470,
      p(440, base + 20).x,
      base - 30,
      p(250, base).x,
      base,
      14,
      1.1
    ),
  ];

  // Uppercase C
  glyphs['C'] = [
    cubic(
      p(440, cap + 60).x,
      cap + 60,
      p(340, cap - 30).x,
      cap,
      p(230, 420).x,
      420,
      p(230, 480).x,
      480,
      14,
      1.1
    ),
    cubic(
      p(230, 480).x,
      480,
      p(230, base + 20).x,
      base,
      p(350, base + 20).x,
      base,
      p(440, base - 50).x,
      base - 50,
      14,
      1.1
    ),
  ];

  // Uppercase D
  glyphs['D'] = [
    line(p(250, cap).x, cap, p(250, base).x, base, 12, 1.2),
    cubic(
      p(250, cap).x,
      cap,
      p(460, cap - 10).x,
      cap + 40,
      p(460, base + 10).x,
      base - 40,
      p(250, base).x,
      base,
      18,
      1.1
    ),
  ];

  // Uppercase E
  glyphs['E'] = [
    line(p(260, cap).x, cap, p(260, base).x, base, 12, 1.2),
    line(p(260, cap).x, cap, p(420, cap).x, cap, 8, 1.0),
    line(p(260, 430).x, 430, p(380, 430).x, 430, 8, 0.9),
    line(p(260, base).x, base, p(430, base).x, base, 8, 1.0),
  ];

  // Uppercase F
  glyphs['F'] = [
    line(p(260, cap).x, cap, p(260, base).x, base, 12, 1.2),
    line(p(260, cap).x, cap, p(420, cap).x, cap, 8, 1.0),
    line(p(260, 430).x, 430, p(370, 430).x, 430, 8, 0.9),
  ];

  // Uppercase G
  glyphs['G'] = [
    cubic(
      p(430, cap + 60).x,
      cap + 60,
      p(330, cap - 20).x,
      cap,
      p(230, 420).x,
      420,
      p(230, 480).x,
      480,
      14,
      1.1
    ),
    cubic(
      p(230, 480).x,
      480,
      p(230, base + 20).x,
      base,
      p(360, base + 20).x,
      base,
      p(430, base - 60).x,
      base - 60,
      14,
      1.1
    ),
    line(p(430, base - 60).x, base - 60, p(430, 450).x, 450, 8, 1.0),
    line(p(350, 450).x, 450, p(430, 450).x, 450, 6, 1.0),
  ];

  // Uppercase H
  glyphs['H'] = [
    line(p(250, cap).x, cap, p(250, base).x, base, 12, 1.1),
    line(p(420, cap).x, cap, p(420, base).x, base, 12, 1.1),
    line(p(250, 430).x, 430, p(420, 430).x, 430, 8, 1.0),
  ];

  // Uppercase I
  glyphs['I'] = [
    line(p(330, cap).x, cap, p(330, base).x, base, 12, 1.2),
    line(p(260, cap).x, cap, p(400, cap).x, cap, 6, 1.0),
    line(p(260, base).x, base, p(400, base).x, base, 6, 1.0),
  ];

  // Uppercase J
  glyphs['J'] = [
    line(p(380, cap).x, cap, p(380, base - 40).x, base - 40, 12, 1.1),
    arc(
      p(380, base - 40).x,
      base - 40,
      p(380, base + 20).x,
      base + 10,
      p(280, base - 20).x,
      base - 20,
      10,
      1.0
    ),
  ];

  // Uppercase K
  glyphs['K'] = [
    line(p(250, cap).x, cap, p(250, base).x, base, 12, 1.2),
    line(p(420, cap).x, cap, p(250, 450).x, 450, 10, 1.0),
    line(p(270, 430).x, 430, p(430, base).x, base, 10, 1.1),
  ];

  // Uppercase L
  glyphs['L'] = [
    line(p(260, cap).x, cap, p(260, base).x, base, 12, 1.2),
    line(p(260, base).x, base, p(420, base).x, base, 8, 1.1),
  ];

  // Uppercase M
  glyphs['M'] = [
    line(p(230, base).x, base, p(240, cap).x, cap, 12, 1.1),
    line(p(240, cap).x, cap, p(340, base - 40).x, base - 40, 12, 1.1),
    line(p(340, base - 40).x, base - 40, p(430, cap).x, cap, 12, 1.1),
    line(p(430, cap).x, cap, p(440, base).x, base, 12, 1.1),
  ];

  // Uppercase N
  glyphs['N'] = [
    line(p(250, base).x, base, p(250, cap).x, cap, 12, 1.1),
    line(p(250, cap).x, cap, p(420, base).x, base, 14, 1.2),
    line(p(420, base).x, base, p(420, cap).x, cap, 12, 1.1),
  ];

  // Uppercase O
  glyphs['O'] = [
    cubic(
      p(340, cap).x,
      cap,
      p(220, cap + 20).x,
      cap + 40,
      p(220, base - 40).x,
      base - 40,
      p(340, base).x,
      base,
      16,
      1.1
    ),
    cubic(
      p(340, base).x,
      base,
      p(450, base - 40).x,
      base - 40,
      p(450, cap + 40).x,
      cap + 40,
      p(340, cap).x,
      cap,
      16,
      1.1
    ),
  ];

  // Uppercase P
  glyphs['P'] = [
    line(p(250, cap).x, cap, p(250, base).x, base, 12, 1.2),
    cubic(
      p(250, cap).x,
      cap,
      p(430, cap - 10).x,
      cap + 30,
      p(430, 440).x,
      410,
      p(250, 440).x,
      440,
      14,
      1.1
    ),
  ];

  // Uppercase Q
  glyphs['Q'] = [
    ...glyphs['O'],
    line(p(330, base - 40).x, base - 40, p(440, base + 30).x, base + 30, 8, 1.2),
  ];

  // Uppercase R
  glyphs['R'] = [
    line(p(250, cap).x, cap, p(250, base).x, base, 12, 1.2),
    cubic(
      p(250, cap).x,
      cap,
      p(430, cap - 10).x,
      cap + 30,
      p(430, 440).x,
      410,
      p(250, 440).x,
      440,
      14,
      1.1
    ),
    line(p(320, 440).x, 440, p(430, base).x, base, 10, 1.2),
  ];

  // Uppercase S
  glyphs['S'] = [
    cubic(
      p(420, cap + 50).x,
      cap + 50,
      p(340, cap - 20).x,
      cap,
      p(250, 360).x,
      350,
      p(330, 430).x,
      430,
      14,
      1.1
    ),
    cubic(
      p(330, 430).x,
      430,
      p(430, 490).x,
      500,
      p(340, base + 20).x,
      base,
      p(250, base - 50).x,
      base - 50,
      14,
      1.1
    ),
  ];

  // Uppercase T
  glyphs['T'] = [
    line(p(335, cap).x, cap, p(335, base).x, base, 12, 1.2),
    line(p(220, cap).x, cap, p(450, cap).x, cap, 10, 1.1),
  ];

  // Uppercase U
  glyphs['U'] = [
    line(p(250, cap).x, cap, p(250, base - 60).x, base - 60, 10, 1.1),
    arc(
      p(250, base - 60).x,
      base - 60,
      p(335, base + 25).x,
      base + 10,
      p(420, base - 60).x,
      base - 60,
      12,
      1.1
    ),
    line(p(420, base - 60).x, base - 60, p(420, cap).x, cap, 10, 1.1),
  ];

  // Uppercase V
  glyphs['V'] = [
    line(p(240, cap).x, cap, p(335, base).x, base, 12, 1.2),
    line(p(335, base).x, base, p(430, cap).x, cap, 12, 1.1),
  ];

  // Uppercase W
  glyphs['W'] = [
    line(p(220, cap).x, cap, p(280, base).x, base, 10, 1.1),
    line(p(280, base).x, base, p(335, cap + 60).x, cap + 60, 10, 1.1),
    line(p(335, cap + 60).x, cap + 60, p(390, base).x, base, 10, 1.1),
    line(p(390, base).x, base, p(450, cap).x, cap, 10, 1.1),
  ];

  // Uppercase X
  glyphs['X'] = [
    line(p(250, cap).x, cap, p(420, base).x, base, 12, 1.1),
    line(p(420, cap).x, cap, p(250, base).x, base, 12, 1.1),
  ];

  // Uppercase Y
  glyphs['Y'] = [
    line(p(240, cap).x, cap, p(335, 450).x, 450, 10, 1.1),
    line(p(430, cap).x, cap, p(335, 450).x, 450, 10, 1.1),
    line(p(335, 450).x, 450, p(335, base).x, base, 10, 1.2),
  ];

  // Uppercase Z
  glyphs['Z'] = [
    line(p(250, cap).x, cap, p(420, cap).x, cap, 10, 1.1),
    line(p(420, cap).x, cap, p(250, base).x, base, 14, 1.2),
    line(p(250, base).x, base, p(430, base).x, base, 10, 1.1),
  ];

  // Lowercase letters (standard xh = 400, base = 600, asc = 160, desc = 740)
  glyphs['a'] = [
    cubic(
      p(400, xh + 50).x,
      xh + 50,
      p(310, xh - 20).x,
      xh,
      p(240, 500).x,
      500,
      p(310, base).x,
      base,
      14,
      1.1
    ),
    cubic(
      p(310, base).x,
      base,
      p(380, base + 10).x,
      base,
      p(400, 550).x,
      550,
      p(400, xh).x,
      xh,
      12,
      1.1
    ),
    line(p(400, xh).x, xh, p(400, base).x, base, 10, 1.1),
  ];

  glyphs['b'] = [
    line(p(260, asc).x, asc, p(260, base).x, base, 12, 1.2),
    cubic(
      p(260, xh + 20).x,
      xh + 20,
      p(420, xh - 20).x,
      xh + 10,
      p(420, base + 10).x,
      base - 10,
      p(260, base).x,
      base,
      16,
      1.1
    ),
  ];

  glyphs['c'] = [
    cubic(
      p(400, xh + 40).x,
      xh + 40,
      p(320, xh - 20).x,
      xh,
      p(240, 500).x,
      500,
      p(330, base).x,
      base,
      14,
      1.1
    ),
    arc(
      p(330, base).x,
      base,
      p(380, base + 15).x,
      base + 5,
      p(400, base - 25).x,
      base - 25,
      8,
      1.0
    ),
  ];

  glyphs['d'] = [
    line(p(400, asc).x, asc, p(400, base).x, base, 12, 1.2),
    cubic(
      p(400, xh + 20).x,
      xh + 20,
      p(240, xh - 20).x,
      xh + 10,
      p(240, base + 10).x,
      base - 10,
      p(400, base).x,
      base,
      16,
      1.1
    ),
  ];

  glyphs['e'] = [
    line(p(250, 500).x, 500, p(410, 500).x, 500, 8, 1.0),
    cubic(
      p(410, 500).x,
      500,
      p(410, xh - 20).x,
      xh,
      p(240, xh).x,
      480,
      p(260, base - 30).x,
      base - 30,
      14,
      1.1
    ),
    arc(
      p(260, base - 30).x,
      base - 30,
      p(340, base + 15).x,
      base + 5,
      p(410, base - 20).x,
      base - 20,
      8,
      1.0
    ),
  ];

  glyphs['f'] = [
    arc(
      p(400, asc + 30).x,
      asc + 30,
      p(350, asc - 20).x,
      asc,
      p(310, asc + 40).x,
      asc + 40,
      8,
      1.1
    ),
    line(p(310, asc + 40).x, asc + 40, p(310, base).x, base, 12, 1.2),
    line(p(240, xh).x, xh, p(380, xh).x, xh, 6, 1.0),
  ];

  glyphs['g'] = [
    cubic(
      p(400, xh + 30).x,
      xh + 30,
      p(240, xh - 20).x,
      xh + 10,
      p(240, base + 10).x,
      base - 10,
      p(400, base).x,
      base,
      14,
      1.1
    ),
    line(p(400, xh).x, xh, p(400, desc - 30).x, desc - 30, 12, 1.2),
    arc(
      p(400, desc - 30).x,
      desc - 30,
      p(360, desc + 20).x,
      desc + 10,
      p(270, desc - 20).x,
      desc - 20,
      8,
      1.0
    ),
  ];

  glyphs['h'] = [
    line(p(260, asc).x, asc, p(260, base).x, base, 12, 1.2),
    arc(
      p(260, 480).x,
      480,
      p(350, xh - 20).x,
      xh,
      p(400, 480).x,
      480,
      10,
      1.1
    ),
    line(p(400, 480).x, 480, p(400, base).x, base, 8, 1.1),
  ];

  glyphs['i'] = [
    line(p(330, xh).x, xh, p(330, base).x, base, 10, 1.1),
    line(p(330, xh - 60).x, xh - 60, p(330, xh - 50).x, xh - 50, 2, 1.5),
  ];

  glyphs['j'] = [
    line(p(350, xh).x, xh, p(350, desc - 30).x, desc - 30, 12, 1.1),
    arc(
      p(350, desc - 30).x,
      desc - 30,
      p(320, desc + 20).x,
      desc + 10,
      p(240, desc - 20).x,
      desc - 20,
      8,
      1.0
    ),
    line(p(350, xh - 60).x, xh - 60, p(350, xh - 50).x, xh - 50, 2, 1.5),
  ];

  glyphs['k'] = [
    line(p(260, asc).x, asc, p(260, base).x, base, 12, 1.2),
    line(p(390, xh).x, xh, p(260, 520).x, 520, 8, 1.0),
    line(p(280, 500).x, 500, p(400, base).x, base, 8, 1.1),
  ];

  glyphs['l'] = [
    line(p(330, asc).x, asc, p(330, base - 20).x, base - 20, 12, 1.2),
    arc(
      p(330, base - 20).x,
      base - 20,
      p(340, base + 10).x,
      base + 5,
      p(380, base).x,
      base,
      6,
      1.0
    ),
  ];

  glyphs['m'] = [
    line(p(230, xh).x, xh, p(230, base).x, base, 10, 1.1),
    arc(
      p(230, 470).x,
      470,
      p(300, xh - 20).x,
      xh,
      p(340, 480).x,
      480,
      8,
      1.1
    ),
    line(p(340, 480).x, 480, p(340, base).x, base, 8, 1.1),
    arc(
      p(340, 470).x,
      470,
      p(410, xh - 20).x,
      xh,
      p(450, 480).x,
      480,
      8,
      1.1
    ),
    line(p(450, 480).x, 480, p(450, base).x, base, 8, 1.1),
  ];

  glyphs['n'] = [
    line(p(260, xh).x, xh, p(260, base).x, base, 10, 1.1),
    arc(
      p(260, 470).x,
      470,
      p(350, xh - 20).x,
      xh,
      p(400, 480).x,
      480,
      10,
      1.1
    ),
    line(p(400, 480).x, 480, p(400, base).x, base, 8, 1.1),
  ];

  glyphs['o'] = [
    cubic(
      p(330, xh).x,
      xh,
      p(230, xh + 20).x,
      xh + 30,
      p(230, base - 30).x,
      base - 30,
      p(330, base).x,
      base,
      14,
      1.1
    ),
    cubic(
      p(330, base).x,
      base,
      p(430, base - 30).x,
      base - 30,
      p(430, xh + 30).x,
      xh + 30,
      p(330, xh).x,
      xh,
      14,
      1.1
    ),
  ];

  glyphs['p'] = [
    line(p(260, xh).x, xh, p(260, desc).x, desc, 12, 1.2),
    cubic(
      p(260, xh + 10).x,
      xh + 10,
      p(420, xh - 20).x,
      xh + 10,
      p(420, base + 10).x,
      base - 10,
      p(260, base).x,
      base,
      14,
      1.1
    ),
  ];

  glyphs['q'] = [
    line(p(400, xh).x, xh, p(400, desc).x, desc, 12, 1.2),
    cubic(
      p(400, xh + 10).x,
      xh + 10,
      p(240, xh - 20).x,
      xh + 10,
      p(240, base + 10).x,
      base - 10,
      p(400, base).x,
      base,
      14,
      1.1
    ),
  ];

  glyphs['r'] = [
    line(p(260, xh).x, xh, p(260, base).x, base, 10, 1.1),
    arc(
      p(260, 470).x,
      470,
      p(340, xh - 20).x,
      xh,
      p(390, xh + 40).x,
      xh + 40,
      8,
      1.1
    ),
  ];

  glyphs['s'] = [
    cubic(
      p(390, xh + 30).x,
      xh + 30,
      p(330, xh - 15).x,
      xh,
      p(260, 470).x,
      470,
      p(330, 500).x,
      500,
      10,
      1.1
    ),
    cubic(
      p(330, 500).x,
      500,
      p(400, 530).x,
      540,
      p(330, base + 15).x,
      base,
      p(260, base - 30).x,
      base - 30,
      10,
      1.1
    ),
  ];

  glyphs['t'] = [
    line(p(320, asc + 40).x, asc + 40, p(320, base - 20).x, base - 20, 10, 1.2),
    arc(
      p(320, base - 20).x,
      base - 20,
      p(335, base + 10).x,
      base + 5,
      p(370, base).x,
      base,
      6,
      1.0
    ),
    line(p(250, xh).x, xh, p(380, xh).x, xh, 6, 1.0),
  ];

  glyphs['u'] = [
    line(p(260, xh).x, xh, p(260, base - 40).x, base - 40, 8, 1.1),
    arc(
      p(260, base - 40).x,
      base - 40,
      p(330, base + 15).x,
      base + 5,
      p(400, base - 40).x,
      base - 40,
      10,
      1.1
    ),
    line(p(400, xh).x, xh, p(400, base).x, base, 10, 1.1),
  ];

  glyphs['v'] = [
    line(p(250, xh).x, xh, p(330, base).x, base, 10, 1.1),
    line(p(330, base).x, base, p(410, xh).x, xh, 10, 1.1),
  ];

  glyphs['w'] = [
    line(p(230, xh).x, xh, p(280, base).x, base, 8, 1.1),
    line(p(280, base).x, base, p(330, xh + 40).x, xh + 40, 8, 1.1),
    line(p(330, xh + 40).x, xh + 40, p(380, base).x, base, 8, 1.1),
    line(p(380, base).x, base, p(430, xh).x, xh, 8, 1.1),
  ];

  glyphs['x'] = [
    line(p(260, xh).x, xh, p(400, base).x, base, 10, 1.1),
    line(p(400, xh).x, xh, p(260, base).x, base, 10, 1.1),
  ];

  glyphs['y'] = [
    line(p(260, xh).x, xh, p(330, 520).x, 520, 8, 1.1),
    line(p(400, xh).x, xh, p(260, desc).x, desc, 12, 1.2),
  ];

  glyphs['z'] = [
    line(p(260, xh).x, xh, p(400, xh).x, xh, 8, 1.0),
    line(p(400, xh).x, xh, p(260, base).x, base, 10, 1.1),
    line(p(260, base).x, base, p(400, base).x, base, 8, 1.0),
  ];

  // Numerals 0-9
  glyphs['0'] = glyphs['O'];
  glyphs['1'] = [
    line(p(280, cap + 60).x, cap + 60, p(340, cap).x, cap, 6, 1.0),
    line(p(340, cap).x, cap, p(340, base).x, base, 12, 1.2),
    line(p(260, base).x, base, p(420, base).x, base, 6, 1.0),
  ];
  glyphs['2'] = [
    arc(
      p(250, cap + 60).x,
      cap + 60,
      p(340, cap - 30).x,
      cap,
      p(420, cap + 70).x,
      cap + 70,
      12,
      1.1
    ),
    line(p(420, cap + 70).x, cap + 70, p(250, base).x, base, 12, 1.2),
    line(p(250, base).x, base, p(430, base).x, base, 8, 1.1),
  ];
  glyphs['3'] = [
    arc(
      p(260, cap + 20).x,
      cap + 20,
      p(350, cap - 25).x,
      cap,
      p(390, 410).x,
      410,
      10,
      1.1
    ),
    arc(
      p(390, 410).x,
      410,
      p(440, 450).x,
      450,
      p(350, base + 15).x,
      base,
      12,
      1.1
    ),
    line(p(350, base + 15).x, base, p(260, base - 30).x, base - 30, 6, 1.0),
  ];
  glyphs['4'] = [
    line(p(380, cap).x, cap, p(250, 490).x, 490, 10, 1.1),
    line(p(250, 490).x, 490, p(430, 490).x, 490, 8, 1.0),
    line(p(380, cap + 50).x, cap + 50, p(380, base).x, base, 12, 1.2),
  ];
  glyphs['5'] = [
    line(p(410, cap).x, cap, p(280, cap).x, cap, 6, 1.0),
    line(p(280, cap).x, cap, p(270, 440).x, 440, 8, 1.1),
    cubic(
      p(270, 440).x,
      440,
      p(430, 410).x,
      410,
      p(430, base + 20).x,
      base - 10,
      p(260, base - 20).x,
      base - 20,
      14,
      1.1
    ),
  ];
  glyphs['6'] = [
    arc(
      p(410, cap + 50).x,
      cap + 50,
      p(320, cap - 20).x,
      cap,
      p(240, 460).x,
      460,
      12,
      1.1
    ),
    cubic(
      p(240, 460).x,
      460,
      p(230, base + 20).x,
      base,
      p(420, base + 15).x,
      base - 20,
      p(420, 470).x,
      470,
      14,
      1.1
    ),
    arc(
      p(420, 470).x,
      470,
      p(350, 420).x,
      420,
      p(240, 480).x,
      480,
      10,
      1.0
    ),
  ];
  glyphs['7'] = [
    line(p(250, cap).x, cap, p(420, cap).x, cap, 8, 1.0),
    line(p(420, cap).x, cap, p(290, base).x, base, 14, 1.2),
  ];
  glyphs['8'] = [
    arc(
      p(335, 430).x,
      430,
      p(240, cap - 20).x,
      cap,
      p(335, cap).x,
      cap,
      12,
      1.1
    ),
    arc(
      p(335, cap).x,
      cap,
      p(430, cap - 20).x,
      cap,
      p(335, 430).x,
      430,
      12,
      1.1
    ),
    arc(
      p(335, 430).x,
      430,
      p(230, base + 20).x,
      base,
      p(335, base).x,
      base,
      14,
      1.1
    ),
    arc(
      p(335, base).x,
      base,
      p(440, base + 20).x,
      base,
      p(335, 430).x,
      430,
      14,
      1.1
    ),
  ];
  glyphs['9'] = [
    cubic(
      p(420, 440).x,
      440,
      p(420, cap - 20).x,
      cap,
      p(250, cap - 15).x,
      cap + 30,
      p(250, 430).x,
      430,
      14,
      1.1
    ),
    arc(
      p(250, 430).x,
      430,
      p(330, 490).x,
      490,
      p(420, 440).x,
      440,
      10,
      1.0
    ),
    line(p(420, 440).x, 440, p(320, base).x, base, 12, 1.2),
  ];

  // Essential Punctuation
  glyphs['.'] = [line(p(335, base - 10).x, base - 10, p(335, base).x, base, 2, 1.8)];
  glyphs[','] = [
    line(p(335, base - 10).x, base - 10, p(335, base).x, base, 2, 1.6),
    arc(
      p(335, base).x,
      base,
      p(330, base + 25).x,
      base + 20,
      p(310, base + 35).x,
      base + 35,
      6,
      1.0
    ),
  ];
  glyphs['!'] = [
    line(p(335, cap).x, cap, p(335, 490).x, 490, 10, 1.3),
    line(p(335, base - 10).x, base - 10, p(335, base).x, base, 2, 1.8),
  ];
  glyphs['?'] = [
    arc(
      p(260, cap + 50).x,
      cap + 50,
      p(335, cap - 30).x,
      cap,
      p(410, cap + 60).x,
      cap + 60,
      10,
      1.1
    ),
    arc(
      p(410, cap + 60).x,
      cap + 60,
      p(380, 430).x,
      430,
      p(335, 460).x,
      460,
      8,
      1.1
    ),
    line(p(335, 460).x, 460, p(335, 500).x, 500, 6, 1.1),
    line(p(335, base - 10).x, base - 10, p(335, base).x, base, 2, 1.8),
  ];
  glyphs['-'] = [line(p(250, 490).x, 490, p(410, 490).x, 490, 6, 1.0)];
  glyphs['+'] = [
    line(p(250, 490).x, 490, p(410, 490).x, 490, 6, 1.0),
    line(p(330, 410).x, 410, p(330, 570).x, 570, 6, 1.0),
  ];
  glyphs['='] = [
    line(p(250, 460).x, 460, p(410, 460).x, 460, 6, 1.0),
    line(p(250, 520).x, 520, p(410, 520).x, 520, 6, 1.0),
  ];
  glyphs['/'] = [line(p(240, base).x, base, p(420, cap).x, cap, 12, 1.1)];
  glyphs[':'] = [
    line(p(335, 430).x, 430, p(335, 440).x, 440, 2, 1.6),
    line(p(335, base - 10).x, base - 10, p(335, base).x, base, 2, 1.6),
  ];
  glyphs[';'] = [
    line(p(335, 430).x, 430, p(335, 440).x, 440, 2, 1.6),
    line(p(335, base - 10).x, base - 10, p(335, base).x, base, 2, 1.6),
    arc(
      p(335, base).x,
      base,
      p(330, base + 25).x,
      base + 20,
      p(310, base + 35).x,
      base + 35,
      6,
      1.0
    ),
  ];
  glyphs["'"] = [line(p(335, cap).x, cap, p(335, cap + 35).x, cap + 35, 4, 1.4)];
  glyphs['"'] = [
    line(p(310, cap).x, cap, p(310, cap + 35).x, cap + 35, 4, 1.4),
    line(p(360, cap).x, cap, p(360, cap + 35).x, cap + 35, 4, 1.4),
  ];
  glyphs['('] = [
    arc(
      p(370, cap).x,
      cap,
      p(270, 480).x,
      480,
      p(370, base).x,
      base,
      12,
      1.1
    ),
  ];
  glyphs[')'] = [
    arc(
      p(300, cap).x,
      cap,
      p(400, 480).x,
      480,
      p(300, base).x,
      base,
      12,
      1.1
    ),
  ];
  glyphs['&'] = [
    cubic(
      p(410, base).x,
      base,
      p(250, 400).x,
      400,
      p(340, cap - 20).x,
      cap,
      p(340, cap + 40).x,
      cap + 40,
      14,
      1.1
    ),
    cubic(
      p(340, cap + 40).x,
      cap + 40,
      p(330, 440).x,
      440,
      p(240, 520).x,
      520,
      p(340, base).x,
      base,
      14,
      1.1
    ),
    line(p(340, base).x, base, p(420, base - 60).x, base - 60, 8, 1.1),
  ];

  return glyphs;
}

// 5 Community Presets
export const HANDWRITING_PRESETS: HandwritingPreset[] = [
  {
    id: 'architect',
    name: 'Architect Drafter 0.5',
    category: 'Technical Drafting',
    tagline: 'Frank Lloyd Wright style draftsman print',
    description:
      'Rigorous, clean geometric lettering with zero slant, crisp right angles, and structured horizontal crossbars. A staple on r/Handwriting for engineers and blueprints.',
    authorNote: 'Simulates a 0.5mm Rotring technical fineliner on drafting vellum.',
    penType: 'drafting',
    slant: 0,
    strokeWidth: 12,
    glyphs: generateArchetypeGlyphs('architect'),
  },
  {
    id: 'spencerian',
    name: 'Spencerian Script 1890',
    category: 'American Cursive',
    tagline: 'Flowing rhythmic loops & 25° slant',
    description:
      'Classic 19th-century American cursive with generous ascender loops, rhythmic downstroke pressure, and continuous hand flow.',
    authorNote: 'Simulates a flexible dip fountain pen with Diamine Oxblood ink.',
    penType: 'fountain',
    slant: 24,
    strokeWidth: 16,
    glyphs: generateArchetypeGlyphs('cursive'),
  },
  {
    id: 'bujo',
    name: 'Neat Journal Sans',
    category: 'Bullet Journal',
    tagline: 'Minimalist rounded monoline lettering',
    description:
      'Beloved by bullet journalers and studygram creators: perfectly upright, friendly circular bowls, and clean uniform strokes.',
    authorNote: 'Simulates a 0.38mm Sakura Pigma Micron pen.',
    penType: 'rollerball',
    slant: 0,
    strokeWidth: 13,
    glyphs: generateArchetypeGlyphs('bujo'),
  },
  {
    id: 'ballpoint',
    name: 'Quick Coffee Jotter',
    category: 'Casual Daily',
    tagline: 'Organic relaxed handwriting with natural speed',
    description:
      'The authentic feel of quick grocery lists, cafe notebook thoughts, and personal notes. Balanced between cursive connections and casual print.',
    authorNote: 'Simulates a Parker Jotter medium ballpoint with natural organic tilt.',
    penType: 'rollerball',
    slant: 10,
    strokeWidth: 14,
    glyphs: generateArchetypeGlyphs('ballpoint'),
  },
  {
    id: 'italic',
    name: 'Chiseled Broad Nib',
    category: 'Calligraphy',
    tagline: 'Dynamic stroke contrast & 45° nib angle',
    description:
      'Chiseled calligraphy hand featuring thick downstrokes, delicate hairlines, and refined architectural serifs.',
    authorNote: 'Simulates a 2.4mm Pilot Parallel chisel nib pen.',
    penType: 'calligraphy',
    slant: 12,
    strokeWidth: 20,
    glyphs: generateArchetypeGlyphs('italic'),
  },
];
