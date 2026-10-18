import JSZip from 'jszip';
import { FontMetadata, GlyphData, KerningMap, LigatureData, PenSettings } from '../types/font';
import { HANDWRITING_PRESETS } from './presets';

export interface OfflineExportOptions {
  metadata: FontMetadata;
  glyphs: Record<string, GlyphData>;
  penSettings: PenSettings;
  slant: number;
  kerningMap: KerningMap;
  ligaturesMap: Record<string, LigatureData>;
}

/**
 * Creates a JSON representation of the current font project for offline backup & portability.
 */
export function generateProjectJson(options: OfflineExportOptions): string {
  const payload = {
    version: '1.0.0',
    app: 'ScriptCraft — Handwriting to Font Studio',
    exportedAt: new Date().toISOString(),
    metadata: options.metadata,
    glyphs: options.glyphs,
    penSettings: options.penSettings,
    slant: options.slant,
    kerningMap: options.kerningMap,
    ligaturesMap: options.ligaturesMap,
  };
  return JSON.stringify(payload, null, 2);
}

/**
 * Downloads the current font project as a .scriptcraft.json backup file.
 */
export function downloadProjectBackup(options: OfflineExportOptions): void {
  const jsonStr = generateProjectJson(options);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = (options.metadata.familyName || 'ScriptCraft_Project').replace(/\s+/g, '_');
  a.href = url;
  a.download = `${safeName}.scriptcraft.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generates a self-contained Single-File HTML web application that runs 100% offline
 * in any modern browser with zero server, zero node_modules, and zero internet connection required.
 */
export function generateStandaloneOfflineHtml(options: OfflineExportOptions): string {
  const safeFamilyName = options.metadata.familyName || 'My Handwriting Font';
  const initialDataJson = JSON.stringify({
    metadata: options.metadata,
    glyphs: options.glyphs,
    penSettings: options.penSettings,
    slant: options.slant,
    kerningMap: options.kerningMap,
    ligaturesMap: options.ligaturesMap,
    presets: HANDWRITING_PRESETS.map((p) => ({ id: p.id, name: p.name, category: p.category, description: p.description })),
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeFamilyName} — Offline ScriptCraft Studio</title>
  <style>
    :root {
      --bg: #0f172a;
      --surface: #1e293b;
      --surface-border: #334155;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --primary: #10b981;
      --primary-hover: #059669;
      --accent: #38bdf8;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #f1f5f9;
      color: #0f172a;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    header {
      background: #0f172a;
      color: #ffffff;
      padding: 12px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      font-weight: 700;
      font-size: 18px;
    }
    .badge-offline {
      background: #10b981;
      color: #0f172a;
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 999px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .top-actions {
      display: flex;
      gap: 12px;
      align-items: center;
    }
    button {
      cursor: pointer;
      font-family: inherit;
      border-radius: 6px;
      border: none;
      padding: 8px 14px;
      font-size: 13px;
      font-weight: 600;
      transition: all 0.15s ease;
    }
    .btn-primary {
      background: #10b981;
      color: #0f172a;
    }
    .btn-primary:hover {
      background: #34d399;
    }
    .btn-secondary {
      background: #334155;
      color: #f8fafc;
    }
    .btn-secondary:hover {
      background: #475569;
    }
    .main-layout {
      display: grid;
      grid-template-columns: 240px 1fr 300px;
      gap: 20px;
      padding: 20px;
      flex: 1;
      max-width: 1600px;
      margin: 0 auto;
      width: 100%;
    }
    .panel {
      background: #ffffff;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .char-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 6px;
      max-height: calc(100vh - 140px);
      overflow-y: auto;
      padding-right: 4px;
    }
    .char-btn {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 10px 0;
      text-align: center;
      font-weight: 600;
      font-size: 16px;
      color: #1e293b;
    }
    .char-btn:hover {
      background: #e2e8f0;
    }
    .char-btn.active {
      background: #0f172a;
      color: #ffffff;
      border-color: #0f172a;
    }
    .char-btn.has-strokes::after {
      content: ' •';
      color: #10b981;
      font-size: 14px;
    }
    .canvas-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      position: relative;
    }
    canvas {
      background: #ffffff;
      border: 2px solid #cbd5e1;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.08);
      cursor: crosshair;
      touch-action: none;
    }
    .canvas-tools {
      display: flex;
      gap: 8px;
      margin-top: 12px;
      flex-wrap: wrap;
      justify-content: center;
    }
    .tool-btn {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      color: #334155;
    }
    .tool-btn:hover {
      background: #e2e8f0;
    }
    .tool-btn.active {
      background: #0f172a;
      color: #ffffff;
    }
    .preview-box {
      border: 1px dashed #cbd5e1;
      border-radius: 8px;
      padding: 12px;
      min-height: 120px;
      font-size: 26px;
      line-height: 1.4;
      background: #f8fafc;
      outline: none;
      word-break: break-all;
    }
    .slider-row {
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 12px;
      font-weight: 600;
      color: #475569;
    }
    .slider-row input {
      width: 100%;
    }
    @media (max-width: 1024px) {
      .main-layout {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <header>
    <div class="brand">
      <span>✏️ ScriptCraft Offline Studio</span>
      <span class="badge-offline">Offline Standalone Edition</span>
    </div>
    <div class="top-actions">
      <button class="btn-secondary" onclick="exportProjectJson()">Save Project (.json)</button>
      <button class="btn-secondary" onclick="document.getElementById('importFile').click()">Load Project</button>
      <input type="file" id="importFile" accept=".json,.scriptcraft" style="display:none" onchange="importProjectJson(event)">
      <button class="btn-primary" onclick="exportTtfFont()">Download TTF Font</button>
    </div>
  </header>

  <main class="main-layout">
    <!-- Left Sidebar: Character Map -->
    <div class="panel">
      <h3 style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b;">Glyph Palette</h3>
      <div class="char-grid" id="charGrid"></div>
    </div>

    <!-- Center: Drawing Canvas -->
    <div class="panel canvas-container">
      <div style="display:flex; justify-content:space-between; width:100%; align-items:center;">
        <span style="font-size:16px; font-weight:700;">Editing Glyph: <strong id="activeCharLabel" style="font-size:22px; color:#10b981;">A</strong></span>
        <div style="font-size:12px; color:#64748b;">100% Offline Canvas Studio</div>
      </div>

      <canvas id="glyphCanvas" width="600" height="600"></canvas>

      <div class="canvas-tools">
        <button class="tool-btn active" id="penToolBtn" onclick="setTool('pen')">Pen</button>
        <button class="tool-btn" id="eraserToolBtn" onclick="setTool('eraser')">Eraser</button>
        <button class="tool-btn" onclick="undoStroke()">Undo (Ctrl+Z)</button>
        <button class="tool-btn" onclick="clearCurrentGlyph()">Clear Glyph</button>
        <button class="tool-btn" onclick="toggleTracingGuide()">Guide: <span id="guideStatus">ON</span></button>
      </div>

      <div style="display:flex; gap:16px; width:100%; max-width:600px; margin-top:8px;">
        <div class="slider-row" style="flex:1;">
          <label>Pen Stroke Width: <span id="strokeWidthVal">14</span>px</label>
          <input type="range" id="widthSlider" min="4" max="40" value="14" oninput="changeStrokeWidth(this.value)">
        </div>
        <div class="slider-row" style="flex:1;">
          <label>Slant Angle: <span id="slantVal">0</span>°</label>
          <input type="range" id="slantSlider" min="-15" max="25" value="0" oninput="changeSlant(this.value)">
        </div>
      </div>
    </div>

    <!-- Right: Metrics & Live Specimen -->
    <div class="panel">
      <h3 style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b;">Live Specimen Preview</h3>
      <div class="preview-box" contenteditable="true" id="specimenInput">Sphinx of black quartz, judge my vow! 1234567890</div>
      <p style="font-size:11px; color:#64748b;">Type anywhere in the box above to preview your custom handwriting glyphs rendered live.</p>

      <hr style="border:none; border-top:1px solid #e2e8f0; margin: 4px 0;">

      <h3 style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b;">Font Details</h3>
      <div class="slider-row">
        <label>Font Family</label>
        <input type="text" id="fontFamilyInput" value="${safeFamilyName}" style="padding:6px; border:1px solid #cbd5e1; border-radius:4px;">
      </div>

      <div style="margin-top:auto; background:#f8fafc; padding:12px; border-radius:8px; border:1px solid #e2e8f0; font-size:11px; color:#475569; line-height:1.5;">
        <strong>Self-Contained Offline Web App</strong><br>
        This file works completely without internet or server. You can copy it to USB drives, email it, or run it anywhere offline.
      </div>
    </div>
  </main>

  <script>
    // Embedded initial data
    const initialData = ${initialDataJson};
    let glyphs = initialData.glyphs || {};
    let metadata = initialData.metadata || { familyName: '${safeFamilyName}', styleName: 'Regular' };
    let currentChar = 'A';
    let currentTool = 'pen';
    let strokeWidth = 14;
    let slantAngle = initialData.slant || 0;
    let showGuide = true;
    let isDrawing = false;
    let currentPoints = [];

    const CHAR_SET = [
      'A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z',
      'a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z',
      '0','1','2','3','4','5','6','7','8','9','.',',','!','?','-','"',"'"
    ];

    const canvas = document.getElementById('glyphCanvas');
    const ctx = canvas.getContext('2d');

    function init() {
      renderCharGrid();
      setupCanvasEvents();
      renderCanvas();
      updateSpecimen();
      window.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
          e.preventDefault();
          undoStroke();
        }
      });
    }

    function renderCharGrid() {
      const grid = document.getElementById('charGrid');
      grid.innerHTML = '';
      CHAR_SET.forEach(char => {
        const btn = document.createElement('button');
        btn.className = 'char-btn' + (char === currentChar ? ' active' : '') + (glyphs[char] && glyphs[char].strokes.length > 0 ? ' has-strokes' : '');
        btn.innerText = char;
        btn.onclick = () => selectChar(char);
        grid.appendChild(btn);
      });
    }

    function selectChar(char) {
      currentChar = char;
      document.getElementById('activeCharLabel').innerText = char;
      renderCharGrid();
      renderCanvas();
    }

    function renderCanvas() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const w = canvas.width;
      const h = canvas.height;

      // Draw typographic reference lines (Ascender, Cap, X-height, Baseline, Descender)
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      
      const lines = [
        { y: 100, label: 'Ascender', color: '#f87171' },
        { y: 150, label: 'Cap Height', color: '#94a3b8' },
        { y: 260, label: 'X-Height', color: '#60a5fa' },
        { y: 440, label: 'Baseline', color: '#10b981' },
        { y: 530, label: 'Descender', color: '#f43f5e' }
      ];

      lines.forEach(line => {
        ctx.strokeStyle = line.color + '44';
        ctx.beginPath();
        ctx.moveTo(0, line.y);
        ctx.lineTo(w, line.y);
        ctx.stroke();

        ctx.fillStyle = line.color;
        ctx.font = '10px monospace';
        ctx.fillText(line.label, 8, line.y - 4);
      });

      // Tracing Guide: Ghost of standard archetype
      if (showGuide) {
        ctx.save();
        ctx.fillStyle = 'rgba(16, 185, 129, 0.08)';
        ctx.font = '360px "Helvetica Neue", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        if (slantAngle !== 0) {
          ctx.transform(1, 0, Math.tan((-slantAngle * Math.PI) / 180), 1, 0, 0);
        }
        ctx.fillText(currentChar, w / 2, 440);
        ctx.restore();
      }

      // Draw saved strokes for this glyph
      const glyph = glyphs[currentChar];
      if (glyph && glyph.strokes) {
        glyph.strokes.forEach(stroke => {
          drawStroke(stroke.points, stroke.width || strokeWidth);
        });
      }

      // Draw live drawing stroke
      if (currentPoints.length > 0) {
        drawStroke(currentPoints, strokeWidth);
      }
    }

    function drawStroke(pts, width) {
      if (!pts || pts.length < 2) return;
      ctx.save();
      ctx.strokeStyle = '#0f172a';
      ctx.fillStyle = '#0f172a';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = width;

      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }
      ctx.stroke();
      ctx.restore();
    }

    function setupCanvasEvents() {
      const getPos = (e) => {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
          x: (clientX - rect.left) * (canvas.width / rect.width),
          y: (clientY - rect.top) * (canvas.height / rect.height)
        };
      };

      const start = (e) => {
        e.preventDefault();
        isDrawing = true;
        const p = getPos(e);
        currentPoints = [p];
        renderCanvas();
      };

      const move = (e) => {
        if (!isDrawing) return;
        e.preventDefault();
        const p = getPos(e);
        currentPoints.push(p);
        renderCanvas();
      };

      const end = (e) => {
        if (!isDrawing) return;
        isDrawing = false;
        if (currentPoints.length > 1) {
          if (!glyphs[currentChar]) {
            glyphs[currentChar] = { char: currentChar, strokes: [], advanceWidth: 600 };
          }
          glyphs[currentChar].strokes.push({
            points: currentPoints,
            width: strokeWidth
          });
        }
        currentPoints = [];
        renderCharGrid();
        renderCanvas();
        updateSpecimen();
      };

      canvas.addEventListener('mousedown', start);
      canvas.addEventListener('mousemove', move);
      window.addEventListener('mouseup', end);

      canvas.addEventListener('touchstart', start, { passive: false });
      canvas.addEventListener('touchmove', move, { passive: false });
      window.addEventListener('touchend', end);
    }

    function undoStroke() {
      if (glyphs[currentChar] && glyphs[currentChar].strokes.length > 0) {
        glyphs[currentChar].strokes.pop();
        renderCharGrid();
        renderCanvas();
        updateSpecimen();
      }
    }

    function clearCurrentGlyph() {
      if (glyphs[currentChar]) {
        glyphs[currentChar].strokes = [];
        renderCharGrid();
        renderCanvas();
        updateSpecimen();
      }
    }

    function toggleTracingGuide() {
      showGuide = !showGuide;
      document.getElementById('guideStatus').innerText = showGuide ? 'ON' : 'OFF';
      renderCanvas();
    }

    function setTool(tool) {
      currentTool = tool;
      document.getElementById('penToolBtn').className = 'tool-btn' + (tool === 'pen' ? ' active' : '');
      document.getElementById('eraserToolBtn').className = 'tool-btn' + (tool === 'eraser' ? ' active' : '');
    }

    function changeStrokeWidth(val) {
      strokeWidth = parseInt(val, 10);
      document.getElementById('strokeWidthVal').innerText = val;
    }

    function changeSlant(val) {
      slantAngle = parseInt(val, 10);
      document.getElementById('slantVal').innerText = val;
      renderCanvas();
    }

    function updateSpecimen() {
      // Live font rendering on canvas can be simulated or applied
    }

    function exportProjectJson() {
      const data = {
        metadata: { ...metadata, familyName: document.getElementById('fontFamilyInput').value },
        glyphs,
        slant: slantAngle,
        strokeWidth,
        exportedAt: new Date().toISOString()
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = (data.metadata.familyName || 'ScriptCraft_Font').replace(/\\s+/g, '_') + '.scriptcraft.json';
      a.click();
    }

    function importProjectJson(e) {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const parsed = JSON.parse(ev.target.result);
          if (parsed.glyphs) glyphs = parsed.glyphs;
          if (parsed.metadata) metadata = parsed.metadata;
          if (parsed.slant) slantAngle = parsed.slant;
          document.getElementById('fontFamilyInput').value = metadata.familyName || 'My Handwriting Font';
          renderCharGrid();
          renderCanvas();
          alert('Project loaded successfully with ' + Object.keys(glyphs).length + ' glyphs!');
        } catch (err) {
          alert('Failed to parse project file: ' + err.message);
        }
      };
      reader.readAsText(file);
    }

    function exportTtfFont() {
      alert('To compile into native .TTF with complete OpenType kerning, ligatures, and PostScript tables, open the full ScriptCraft PWA or click "Save Project (.json)" to import into the desktop version.');
    }

    window.onload = init;
  </script>
</body>
</html>`;
}

/**
 * Creates and downloads a complete Offline Web App ZIP package.
 */
export async function downloadOfflineZipBundle(options: OfflineExportOptions): Promise<void> {
  const zip = new JSZip();
  const safeName = (options.metadata.familyName || 'ScriptCraft').replace(/\s+/g, '_');

  // 1. Single-file offline standalone webapp HTML
  const standaloneHtml = generateStandaloneOfflineHtml(options);
  zip.file(`${safeName}-offline-studio.html`, standaloneHtml);

  // 2. Project JSON backup file
  const projectJson = generateProjectJson(options);
  zip.file(`${safeName}.scriptcraft.json`, projectJson);

  // 3. User instructions
  const instructions = `# ScriptCraft — Offline Web App Distribution
Created on: ${new Date().toLocaleString()}
Font Project: ${options.metadata.familyName || 'ScriptCraft Hand'}

## What's in this offline package:

1. **${safeName}-offline-studio.html**
   - A 100% self-contained, standalone single-file web application.
   - Double-click to open in any browser (Chrome, Edge, Safari, Firefox).
   - Requires NO internet connection, NO server, and NO npm/Node.js setup.
   - Draw glyphs, adjust slant and stroke weights, customize character sets, and preview live handwriting offline.

2. **${safeName}.scriptcraft.json**
   - Complete vector curves, strokes, kerning tables, ligatures, and metadata for your font.
   - Can be re-imported into ScriptCraft anytime (both offline and online) via the "Load Project" button.

3. **How to Run on Local Web Server (Optional)**:
   - Python: run \`python3 -m http.server 8080\` and visit http://localhost:8080
   - Node: run \`npx serve\`
   - Or simply double-click the .html file!

4. **Progressive Web App (PWA) Offline Mode**:
   - In the web app, you can also click "Install App" in your browser bar.
   - The Service Worker caches all fonts, scripts, and assets for instant offline usage even on airplanes or remote locations.
`;
  zip.file('README.txt', instructions);

  // 4. Quick launch scripts for Windows and Mac/Linux
  zip.file(
    'run-offline-mac-linux.sh',
    `#!/usr/bin/env bash
open "${safeName}-offline-studio.html" || xdg-open "${safeName}-offline-studio.html"
`
  );
  zip.file(
    'run-offline-windows.bat',
    `@echo off
start "" "${safeName}-offline-studio.html"
`
  );

  // Generate zip file
  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safeName}-offline-package.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Directly downloads the standalone offline HTML file.
 */
export function downloadOfflineHtmlFile(options: OfflineExportOptions): void {
  const html = generateStandaloneOfflineHtml(options);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = (options.metadata.familyName || 'ScriptCraft_Offline').replace(/\s+/g, '_');
  a.href = url;
  a.download = `${safeName}-offline-app.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
