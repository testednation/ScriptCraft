import React, { useState, useRef } from 'react';
import {
  Download,
  Upload,
  Sliders,
  CheckCircle2,
  FileText,
  Camera,
  RefreshCw,
  ArrowRight,
  Eye,
  Crop,
  Layers,
  Sparkles,
  Grid,
} from 'lucide-react';
import {
  downloadPrintableTemplate,
  sliceTemplateGrid,
  TEMPLATE_CHARS,
  traceStrokesFromCanvas,
} from '../utils/templateScanner';
import { GlyphStroke } from '../types/font';
import { strokesToSvgPath } from '../utils/fontEngine';
import { PhotoCharacterIsolator } from './PhotoCharacterIsolator';

interface TemplateScanViewProps {
  onApplyScannedGlyphs: (scanned: Record<string, GlyphStroke[]>) => void;
  onApplySingleGlyph: (char: string, strokes: GlyphStroke[]) => void;
  currentChar: string;
}

export const TemplateScanView: React.FC<TemplateScanViewProps> = ({
  onApplyScannedGlyphs,
  onApplySingleGlyph,
  currentChar,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'photo' | 'grid'>('photo');

  // Grid scan states
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [threshold, setThreshold] = useState<number>(140);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scannedGlyphs, setScannedGlyphs] = useState<Record<string, GlyphStroke[]>>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setUploadedImage(dataUrl);
      processGridImage(dataUrl, threshold);
    };
    reader.readAsDataURL(file);
  };

  const processGridImage = async (dataUrl: string, thresh: number) => {
    setIsProcessing(true);
    const img = new Image();
    img.src = dataUrl;
    img.onload = async () => {
      try {
        const results = await sliceTemplateGrid(img, thresh);
        setScannedGlyphs(results);
      } catch (err) {
        console.error('Error slicing grid:', err);
      } finally {
        setIsProcessing(false);
      }
    };
  };

  const handleThresholdChange = (val: number) => {
    setThreshold(val);
    if (uploadedImage) {
      processGridImage(uploadedImage, val);
    }
  };

  const handleApplyAllGrid = () => {
    onApplyScannedGlyphs(scannedGlyphs);
  };

  const scannedCount = Object.keys(scannedGlyphs).length;

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-200">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-slate-500">
            <span>Physical to Digital</span>
            <span aria-hidden="true">·</span>
            <span>Computer Vision & OCR Segmentation</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 font-['Plus_Jakarta_Sans']">
            Import Picture & Isolate Characters
          </h1>
          <p className="text-slate-600 text-sm leading-relaxed">
            Upload any picture of your handwriting—from notebook pages, envelopes, napkins, or Reddit handwriting posts. Our computer vision engine identifies ink blobs, isolates individual characters, and traces them into vector font glyphs.
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="flex items-center p-1 bg-slate-200/80 rounded-xl shrink-0 self-start md:self-auto">
          <button
            onClick={() => setActiveSubTab('photo')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeSubTab === 'photo'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Camera className="w-4 h-4 text-emerald-600" />
            <span>Photo & Document Isolator</span>
          </button>

          <button
            onClick={() => setActiveSubTab('grid')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeSubTab === 'grid'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Grid className="w-4 h-4 text-indigo-600" />
            <span>Printable 8×8 Grid Sheet</span>
          </button>
        </div>
      </div>

      {/* Mode A: Photo Character Isolator */}
      {activeSubTab === 'photo' && (
        <PhotoCharacterIsolator
          onApplyGlyphs={onApplyScannedGlyphs}
          onApplySingleGlyph={onApplySingleGlyph}
          currentChar={currentChar}
        />
      )}

      {/* Mode B: Printable Grid Sheet Scanner */}
      {activeSubTab === 'grid' && (
        <div className="space-y-8">
          {/* 3 Step Workflow Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Step 1 */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 flex flex-col justify-between shadow-xs">
              <div className="space-y-2">
                <span className="text-xs font-mono text-slate-400 font-semibold">01. DOWNLOAD</span>
                <h3 className="text-sm font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
                  Printable 64-Box Character Sheet
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  High-resolution A4 grid sheet with baseline guides, x-height marks, and optical registration corners.
                </p>
              </div>
              <button
                onClick={downloadPrintableTemplate}
                className="flex items-center justify-center gap-2 w-full py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-lg text-xs font-medium transition-colors"
              >
                <Download className="w-4 h-4 text-slate-700" />
                <span>Download Grid Sheet (PNG)</span>
              </button>
            </div>

            {/* Step 2 */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 flex flex-col justify-between shadow-xs">
              <div className="space-y-2">
                <span className="text-xs font-mono text-slate-400 font-semibold">02. WRITE</span>
                <h3 className="text-sm font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
                  Inscribe with Your Pen
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Use a dark black or deep blue pen (fountain pen, gel rollerball, or marker). Keep strokes within the box guidelines.
                </p>
              </div>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-600">
                Tip: Photograph in even daylight without heavy phone shadows.
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 flex flex-col justify-between shadow-xs">
              <div className="space-y-2">
                <span className="text-xs font-mono text-slate-400 font-semibold">03. UPLOAD & EXTRACT</span>
                <h3 className="text-sm font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
                  Auto-Crop & Vectorize Grid
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Upload your photo. ScriptCraft extracts each cell, normalizes baselines, and traces into vectors.
                </p>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 w-full py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-colors shadow-sm"
              >
                <Upload className="w-4 h-4" />
                <span>Select Grid Scan / Photo</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </div>

          {/* Uploaded Grid Image Processing Area */}
          {uploadedImage && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Grid Sheet Processing & Vectorization
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isProcessing
                      ? 'Analyzing ink contours and baselines...'
                      : `Detected ${scannedCount} character glyphs from grid`}
                  </p>
                </div>

                {/* Threshold adjustment */}
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-slate-600">Ink Threshold: {threshold}</span>
                  <input
                    type="range"
                    min="60"
                    max="220"
                    value={threshold}
                    onChange={(e) => handleThresholdChange(Number(e.target.value))}
                    className="w-32 accent-slate-900"
                  />
                  <button
                    onClick={() => processGridImage(uploadedImage, threshold)}
                    className="p-1.5 text-slate-500 hover:text-slate-800 rounded hover:bg-slate-100"
                    title="Re-run analysis"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Scanned Character Grid Preview */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 font-mono uppercase tracking-wider">
                    Recognized Glyphs ({scannedCount})
                  </span>
                  {scannedCount > 0 && (
                    <button
                      onClick={handleApplyAllGrid}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-all"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Apply All {scannedCount} Glyphs to Font</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3 max-h-96 overflow-y-auto p-3 bg-slate-50 rounded-lg border border-slate-200">
                  {TEMPLATE_CHARS.map((char) => {
                    const strokes = scannedGlyphs[char];
                    const hasGlyph = strokes && strokes.length > 0;

                    return (
                      <div
                        key={char}
                        className={`aspect-square rounded-lg border p-2 flex flex-col items-center justify-between relative bg-white ${
                          hasGlyph ? 'border-slate-300 shadow-sm' : 'border-dashed border-slate-200 opacity-40'
                        }`}
                      >
                        <span className="text-[10px] font-mono font-bold text-slate-400 self-start">
                          {char}
                        </span>
                        <div className="w-full flex-1 flex items-center justify-center overflow-hidden">
                          {hasGlyph ? (
                            <svg viewBox="0 0 800 800" className="w-full h-full max-h-12">
                              <path
                                d={strokesToSvgPath(strokes)}
                                fill="none"
                                stroke="#0f172a"
                                strokeWidth="16"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          ) : (
                            <span className="text-xs text-slate-300">—</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
