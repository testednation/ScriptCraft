import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Upload,
  Crop,
  Sliders,
  Check,
  RefreshCw,
  Image as ImageIcon,
  Sparkles,
  ChevronUp,
  ChevronDown,
  FileText,
} from 'lucide-react';
import { GlyphStroke } from '../types/font';
import {
  createSampleHandwritingImage,
  traceCropToGlyphStrokes,
} from '../utils/imageIsolator';
import { strokesToSvgPath } from '../utils/fontEngine';

interface SingleCharCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentChar: string;
  onApplyStrokes: (strokes: GlyphStroke[]) => void;
  initialImageSrc?: string | null;
}

export const SingleCharCropModal: React.FC<SingleCharCropModalProps> = ({
  isOpen,
  onClose,
  currentChar,
  onApplyStrokes,
  initialImageSrc,
}) => {
  const [imageSrc, setImageSrc] = useState<string | null>(initialImageSrc || null);
  const [threshold, setThreshold] = useState<number>(135);
  const [invert, setInvert] = useState<boolean>(false);
  const [baselineOffset, setBaselineOffset] = useState<number>(0);
  const [previewStrokes, setPreviewStrokes] = useState<GlyphStroke[]>([]);
  const [cropRect, setCropRect] = useState<{ x: number; y: number; width: number; height: number }>({
    x: 100,
    y: 180,
    width: 80,
    height: 100,
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);

  // Load sample image if none provided
  useEffect(() => {
    if (isOpen && !imageSrc) {
      if (initialImageSrc) {
        setImageSrc(initialImageSrc);
      } else {
        const sample = createSampleHandwritingImage();
        setImageSrc(sample);
      }
    }
  }, [isOpen, initialImageSrc]);

  // Recalculate vector preview whenever crop or settings change
  const updatePreview = () => {
    if (!imgRef.current) return;
    const strokes = traceCropToGlyphStrokes(
      imgRef.current,
      cropRect,
      threshold,
      invert,
      baselineOffset
    );
    setPreviewStrokes(strokes);
  };

  useEffect(() => {
    if (imageSrc && imgRef.current?.complete) {
      updatePreview();
    }
  }, [cropRect, threshold, invert, baselineOffset]);

  const handleImageLoaded = () => {
    if (!imgRef.current) return;
    // Set an initial crop box in the upper area
    const nw = imgRef.current.naturalWidth || 800;
    const nh = imgRef.current.naturalHeight || 600;
    setCropRect({
      x: Math.round(nw * 0.08),
      y: Math.round(nh * 0.16),
      width: Math.round(nw * 0.08),
      height: Math.round(nh * 0.14),
    });
    setTimeout(updatePreview, 50);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setImageSrc(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  // Pointer drag to define crop box
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setIsDragging(true);
    setDragStart({ x, y });
    setCropRect({ x, y, width: 20, height: 20 });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !dragStart || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const curX = e.clientX - rect.left;
    const curY = e.clientY - rect.top;

    const x = Math.min(dragStart.x, curX);
    const y = Math.min(dragStart.y, curY);
    const width = Math.max(15, Math.abs(curX - dragStart.x));
    const height = Math.max(15, Math.abs(curY - dragStart.y));

    setCropRect({ x, y, width, height });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragStart(null);
    updatePreview();
  };

  const handleApply = () => {
    if (previewStrokes.length > 0) {
      onApplyStrokes(previewStrokes);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-4xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
              {currentChar}
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
                Isolate Character '{currentChar}' from Picture
              </h2>
              <p className="text-xs text-slate-500">
                Drag a crop box over any letter in your photo to trace it into font strokes
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          {/* Top upload action bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Picture</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />

              <button
                onClick={() => {
                  const sample = createSampleHandwritingImage();
                  setImageSrc(sample);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors"
              >
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                <span>Sample Specimen</span>
              </button>
            </div>

            <span className="text-xs text-slate-500 font-mono">
              Click & drag on image to reposition crop box
            </span>
          </div>

          {/* Side by side: Crop Image Area & Live Vector Preview */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Image Canvas with draggable Crop Box (8 cols) */}
            <div className="md:col-span-8 bg-slate-100 rounded-xl p-3 border border-slate-200 flex flex-col items-center justify-center min-h-[360px] overflow-hidden">
              {imageSrc ? (
                <div
                  ref={containerRef}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  className="relative inline-block cursor-crosshair select-none max-w-full max-h-[380px] overflow-auto shadow-sm"
                >
                  <img
                    ref={imgRef}
                    src={imageSrc}
                    alt="Source"
                    onLoad={handleImageLoaded}
                    className="max-w-full max-h-[360px] object-contain block pointer-events-none"
                    draggable={false}
                  />

                  {/* Crop box overlay */}
                  <div
                    style={{
                      left: `${cropRect.x}px`,
                      top: `${cropRect.y}px`,
                      width: `${cropRect.width}px`,
                      height: `${cropRect.height}px`,
                    }}
                    className="absolute border-2 border-emerald-500 bg-emerald-500/25 pointer-events-none shadow-sm"
                  >
                    <div className="absolute -top-5 -left-1 bg-slate-900 text-emerald-400 text-[10px] font-mono px-1 py-0.5 rounded">
                      Crop: {currentChar}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-slate-400 py-10 space-y-2">
                  <ImageIcon className="w-10 h-10 mx-auto text-slate-300" />
                  <p className="text-sm">Upload a handwriting picture to crop and isolate</p>
                </div>
              )}
            </div>

            {/* Right: Live Vector Preview & Fine-Tuning (4 cols) */}
            <div className="md:col-span-4 space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <div>
                  <span className="text-xs font-semibold text-slate-900 uppercase font-mono tracking-wider block mb-2">
                    Vectorized Glyph Preview
                  </span>
                  <div className="aspect-square bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-center relative overflow-hidden">
                    {previewStrokes.length > 0 ? (
                      <svg viewBox="0 0 800 800" className="w-full h-full">
                        <path
                          d={strokesToSvgPath(previewStrokes)}
                          fill="none"
                          stroke="#0f172a"
                          strokeWidth="20"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : (
                      <div className="text-center text-slate-400 text-xs">
                        <p>No ink detected</p>
                        <p className="text-[11px] mt-1">Adjust crop or threshold</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Threshold Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>Ink Threshold:</span>
                    <span className="font-mono text-slate-800">{threshold}</span>
                  </div>
                  <input
                    type="range"
                    min="60"
                    max="220"
                    value={threshold}
                    onChange={(e) => setThreshold(Number(e.target.value))}
                    className="w-full accent-slate-900"
                  />
                </div>

                {/* Invert check */}
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 select-none">
                  <input
                    type="checkbox"
                    checked={invert}
                    onChange={(e) => setInvert(e.target.checked)}
                    className="rounded border-slate-300 text-slate-900 focus:ring-0"
                  />
                  <span>Invert (Light ink on dark paper)</span>
                </label>

                {/* Baseline fine-tune */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-slate-600">Baseline Alignment:</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setBaselineOffset((o) => o - 20)}
                      className="flex items-center gap-0.5 px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-mono"
                    >
                      <ChevronUp className="w-3 h-3" />
                      <span>Up</span>
                    </button>
                    <button
                      onClick={() => setBaselineOffset((o) => o + 20)}
                      className="flex items-center gap-0.5 px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-mono"
                    >
                      <ChevronDown className="w-3 h-3" />
                      <span>Down</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Apply Button */}
              <button
                onClick={handleApply}
                disabled={previewStrokes.length === 0}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Place into '{currentChar}' on Canvas</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
