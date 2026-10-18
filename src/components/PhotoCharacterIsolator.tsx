import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Upload,
  Sliders,
  CheckCircle2,
  Image as ImageIcon,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RefreshCw,
  Trash2,
  ArrowRight,
  Sparkles,
  Crop,
  Layers,
  ChevronDown,
  ChevronUp,
  FileText,
  Eye,
  Check,
} from 'lucide-react';
import {
  createSampleHandwritingImage,
  DEFAULT_ISOLATOR_OPTIONS,
  isolateCharactersFromImage,
  IsolatedBoundingBox,
  IsolatorOptions,
  traceCropToGlyphStrokes,
} from '../utils/imageIsolator';
import { GlyphStroke } from '../types/font';
import { strokesToSvgPath } from '../utils/fontEngine';

interface PhotoCharacterIsolatorProps {
  onApplyGlyphs: (glyphs: Record<string, GlyphStroke[]>) => void;
  onApplySingleGlyph?: (char: string, strokes: GlyphStroke[]) => void;
  currentChar?: string;
}

const SEQUENCE_PRESETS = [
  { id: 'upper', label: 'A – Z (26)', chars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' },
  { id: 'lower', label: 'a – z (26)', chars: 'abcdefghijklmnopqrstuvwxyz' },
  { id: 'digits', label: '0 – 9 (10)', chars: '0123456789' },
  { id: 'alphanumeric', label: 'A-Z + a-z + 0-9', chars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789' },
];

export const PhotoCharacterIsolator: React.FC<PhotoCharacterIsolatorProps> = ({
  onApplyGlyphs,
  onApplySingleGlyph,
  currentChar = 'A',
}) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [options, setOptions] = useState<IsolatorOptions>(DEFAULT_ISOLATOR_OPTIONS);
  const [boxes, setBoxes] = useState<IsolatedBoundingBox[]>([]);
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'boxes' | 'binary' | 'original'>('boxes');
  const [customSequence, setCustomSequence] = useState<string>('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
  const [zoom, setZoom] = useState<number>(1);
  const [appliedCount, setAppliedCount] = useState<number | null>(null);

  // Manual Crop state
  const [isCropping, setIsCropping] = useState<boolean>(false);
  const [cropStart, setCropStart] = useState<{ x: number; y: number } | null>(null);
  const [cropCurrent, setCropCurrent] = useState<{ x: number; y: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imgElementRef = useRef<HTMLImageElement | null>(null);
  const imageContainerRef = useRef<HTMLDivElement | null>(null);

  // Process the image to isolate characters
  const processImage = useCallback(
    async (src: string, opts: IsolatorOptions) => {
      setIsProcessing(true);
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = src;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });
        imgElementRef.current = img;

        const result = isolateCharactersFromImage(img, opts);

        // Auto-assign characters based on custom sequence or reading order
        const seq = customSequence || 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const updatedBoxes = result.boxes.map((box, idx) => {
          const char = idx < seq.length ? seq[idx] : undefined;
          return {
            ...box,
            assignedChar: char,
          };
        });

        setBoxes(updatedBoxes);
        if (updatedBoxes.length > 0) {
          setSelectedBoxId(updatedBoxes[0].id);
        }
      } catch (err) {
        console.error('Failed to isolate characters:', err);
      } finally {
        setIsProcessing(false);
      }
    },
    [customSequence]
  );

  // Load sample image on initial mount if none loaded
  useEffect(() => {
    const sample = createSampleHandwritingImage();
    setImageSrc(sample);
    processImage(sample, options);
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setImageSrc(dataUrl);
      processImage(dataUrl, options);
    };
    reader.readAsDataURL(file);
  };

  // Paste from clipboard anywhere
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = (event) => {
              const dataUrl = event.target?.result as string;
              setImageSrc(dataUrl);
              processImage(dataUrl, options);
            };
            reader.readAsDataURL(blob);
          }
          break;
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [options, processImage]);

  // Apply a preset sequence to all detected boxes
  const handleApplySequence = (seq: string) => {
    setCustomSequence(seq);
    setBoxes((prev) =>
      prev.map((box, idx) => ({
        ...box,
        assignedChar: idx < seq.length ? seq[idx] : undefined,
      }))
    );
  };

  // Change assignment for a specific box
  const handleAssignChar = (boxId: string, char: string) => {
    setBoxes((prev) =>
      prev.map((b) => (b.id === boxId ? { ...b, assignedChar: char } : b))
    );
  };

  // Adjust baseline offset for a box and recompute strokes
  const handleAdjustBaseline = (boxId: string, delta: number) => {
    if (!imgElementRef.current) return;
    setBoxes((prev) =>
      prev.map((b) => {
        if (b.id !== boxId) return b;
        const newOffset = (b.baselineOffset || 0) + delta;
        const strokes = traceCropToGlyphStrokes(
          imgElementRef.current!,
          { x: b.x, y: b.y, width: b.width, height: b.height },
          options.threshold,
          options.invert,
          newOffset
        );
        return {
          ...b,
          baselineOffset: newOffset,
          strokes,
        };
      })
    );
  };

  // Delete a false-positive box
  const handleDeleteBox = (boxId: string) => {
    setBoxes((prev) => prev.filter((b) => b.id !== boxId));
    if (selectedBoxId === boxId) {
      setSelectedBoxId(null);
    }
  };

  // Apply all assigned characters to font
  const handleApplyAllToFont = () => {
    const toApply: Record<string, GlyphStroke[]> = {};
    for (const box of boxes) {
      if (box.assignedChar && box.strokes && box.strokes.length > 0) {
        toApply[box.assignedChar] = box.strokes;
      }
    }
    const count = Object.keys(toApply).length;
    if (count > 0) {
      onApplyGlyphs(toApply);
      setAppliedCount(count);
      setTimeout(() => setAppliedCount(null), 3000);
    }
  };

  // Apply selected single character to font
  const handleApplySelected = (box: IsolatedBoundingBox) => {
    if (box.assignedChar && box.strokes && box.strokes.length > 0) {
      if (onApplySingleGlyph) {
        onApplySingleGlyph(box.assignedChar, box.strokes);
      } else {
        onApplyGlyphs({ [box.assignedChar]: box.strokes });
      }
      setAppliedCount(1);
      setTimeout(() => setAppliedCount(null), 2500);
    }
  };

  // Manual Crop Pointer Handlers
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isCropping || !imageContainerRef.current) return;
    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;
    setCropStart({ x, y });
    setCropCurrent({ x, y });
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isCropping || !cropStart || !imageContainerRef.current) return;
    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;
    setCropCurrent({ x, y });
  };

  const handleCanvasMouseUp = () => {
    if (!isCropping || !cropStart || !cropCurrent || !imgElementRef.current) {
      setCropStart(null);
      setCropCurrent(null);
      return;
    }

    const x = Math.min(cropStart.x, cropCurrent.x);
    const y = Math.min(cropStart.y, cropCurrent.y);
    const width = Math.abs(cropCurrent.x - cropStart.x);
    const height = Math.abs(cropCurrent.y - cropStart.y);

    if (width > 8 && height > 8) {
      const strokes = traceCropToGlyphStrokes(
        imgElementRef.current,
        { x, y, width, height },
        options.threshold,
        options.invert,
        0
      );

      // Create thumbnail
      const thumbCanvas = document.createElement('canvas');
      thumbCanvas.width = width;
      thumbCanvas.height = height;
      const tCtx = thumbCanvas.getContext('2d');
      if (tCtx) {
        tCtx.drawImage(imgElementRef.current, x, y, width, height, 0, 0, width, height);
      }

      const newBox: IsolatedBoundingBox = {
        id: `manual-iso-${Date.now()}`,
        x,
        y,
        width,
        height,
        pixelCount: Math.round(width * height * 0.3),
        previewDataUrl: thumbCanvas.toDataURL('image/png'),
        strokes,
        assignedChar: currentChar,
        baselineOffset: 0,
      };

      setBoxes((prev) => [newBox, ...prev]);
      setSelectedBoxId(newBox.id);
      setIsCropping(false);
    }

    setCropStart(null);
    setCropCurrent(null);
  };

  const selectedBox = boxes.find((b) => b.id === selectedBoxId);
  const assignedCount = boxes.filter((b) => b.assignedChar).length;

  return (
    <div className="space-y-6">
      {/* Top Controls Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
          >
            <Upload className="w-4 h-4 text-emerald-400" />
            <span>Upload Picture / Scan</span>
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
              processImage(sample, options);
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-medium transition-colors"
            title="Load an authentic cursive specimen note to test"
          >
            <FileText className="w-3.5 h-3.5 text-slate-600" />
            <span>Load Sample Specimen Note</span>
          </button>

          <span className="text-xs text-slate-400 hidden md:inline">
            or paste image anywhere (Ctrl+V)
          </span>
        </div>

        {/* View mode toggle & Manual Crop */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCropping(!isCropping)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
              isCropping
                ? 'bg-amber-500 text-white border-amber-600'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
            title="Click and drag on image to manually isolate any character box"
          >
            <Crop className="w-3.5 h-3.5" />
            <span>{isCropping ? 'Drag to Crop...' : 'Manual Crop Box'}</span>
          </button>

          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs">
            <button
              onClick={() => setViewMode('boxes')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                viewMode === 'boxes'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Boxes Overlay
            </button>
            <button
              onClick={() => setViewMode('original')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                viewMode === 'original'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Photo
            </button>
            <button
              onClick={() => setViewMode('binary')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                viewMode === 'binary'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Ink Mask
            </button>
          </div>
        </div>
      </div>

      {/* Main Studio Area: Image Viewport + Character Tray */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Image Viewport (7 Cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col shadow-sm">
          {/* Viewport Header */}
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-800">
                {isProcessing
                  ? 'Scanning handwriting...'
                  : `${boxes.length} Characters Isolated`}
              </span>
              {isProcessing && (
                <RefreshCw className="w-3.5 h-3.5 text-slate-500 animate-spin" />
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 bg-white border border-slate-200 rounded px-1.5 py-0.5">
                <button
                  onClick={() => setZoom((z) => Math.max(0.4, z - 0.2))}
                  className="p-1 hover:bg-slate-100 rounded text-slate-600"
                  title="Zoom out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] font-mono w-10 text-center text-slate-600">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  onClick={() => setZoom((z) => Math.min(2.5, z + 0.2))}
                  className="p-1 hover:bg-slate-100 rounded text-slate-600"
                  title="Zoom in"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                onClick={() => setZoom(1)}
                className="text-[11px] text-slate-500 hover:text-slate-800 underline"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Canvas Container with Scroll */}
          <div
            ref={imageContainerRef}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            className={`flex-1 min-h-[460px] max-h-[580px] overflow-auto bg-slate-100/70 p-4 flex items-center justify-center relative select-none ${
              isCropping ? 'cursor-crosshair' : 'cursor-default'
            }`}
          >
            {imageSrc ? (
              <div
                className="relative inline-block transition-transform duration-75 origin-top-left"
                style={{ transform: `scale(${zoom})` }}
              >
                <img
                  src={imageSrc}
                  alt="Handwriting scan source"
                  className={`max-w-none block shadow-md rounded border border-slate-300 ${
                    viewMode === 'binary' ? 'contrast-200 brightness-90 grayscale' : ''
                  }`}
                  draggable={false}
                />

                {/* Overlay Bounding Boxes */}
                {viewMode === 'boxes' &&
                  boxes.map((box) => {
                    const isSelected = box.id === selectedBoxId;
                    return (
                      <div
                        key={box.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedBoxId(box.id);
                        }}
                        style={{
                          left: `${box.x}px`,
                          top: `${box.y}px`,
                          width: `${box.width}px`,
                          height: `${box.height}px`,
                        }}
                        className={`absolute border transition-all cursor-pointer group ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-500/20 ring-2 ring-emerald-400 z-20'
                            : 'border-indigo-500/80 bg-indigo-500/10 hover:border-indigo-600 hover:bg-indigo-500/25 z-10'
                        }`}
                        title={`Click to inspect '${box.assignedChar || '?'}'`}
                      >
                        {box.assignedChar && (
                          <div className="absolute -top-3.5 -left-1 px-1 py-0.2 bg-slate-900 text-emerald-400 text-[10px] font-bold font-mono rounded shadow-xs leading-none">
                            {box.assignedChar}
                          </div>
                        )}
                      </div>
                    );
                  })}

                {/* Active Manual Crop Box */}
                {isCropping && cropStart && cropCurrent && (
                  <div
                    style={{
                      left: `${Math.min(cropStart.x, cropCurrent.x)}px`,
                      top: `${Math.min(cropStart.y, cropCurrent.y)}px`,
                      width: `${Math.abs(cropCurrent.x - cropStart.x)}px`,
                      height: `${Math.abs(cropCurrent.y - cropStart.y)}px`,
                    }}
                    className="absolute border-2 border-dashed border-amber-500 bg-amber-500/20 pointer-events-none z-30"
                  />
                )}
              </div>
            ) : (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files?.[0];
                  if (file && file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      const dataUrl = event.target?.result as string;
                      setImageSrc(dataUrl);
                      processImage(dataUrl, options);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                className="py-16 px-6 text-center border-2 border-dashed border-slate-300 rounded-xl bg-slate-50/60 hover:bg-slate-50 transition-colors flex flex-col items-center justify-center space-y-4 cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-16 h-16 rounded-2xl bg-emerald-100/80 border border-emerald-200 text-emerald-700 flex items-center justify-center shadow-xs">
                  <Upload className="w-8 h-8" />
                </div>
                <div className="space-y-1.5 max-w-md">
                  <h3 className="text-base font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
                    Upload a Photo of Your Handwriting
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Click to browse files, drag and drop an image here, or paste from clipboard (Ctrl+V). Works with photos taken on your phone, notebook pages, envelopes, or written cards.
                  </p>
                </div>
                <div className="flex items-center gap-3 pt-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
                  >
                    <Upload className="w-4 h-4 text-emerald-400" />
                    <span>Choose Photo File</span>
                  </button>
                  <button
                    onClick={() => {
                      const sample = createSampleHandwritingImage();
                      setImageSrc(sample);
                      processImage(sample, options);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-medium rounded-lg transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    <span>Try Sample Handwriting Note</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Optical Detection Fine-Tuning Controls */}
          <div className="p-4 bg-white border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            {/* Threshold slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-slate-600">
                <span>Ink Threshold</span>
                <span className="font-mono text-slate-800">{options.threshold}</span>
              </div>
              <input
                type="range"
                min="60"
                max="220"
                value={options.threshold}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  const newOpts = { ...options, threshold: val };
                  setOptions(newOpts);
                  if (imageSrc) processImage(imageSrc, newOpts);
                }}
                className="w-full accent-slate-900"
              />
            </div>

            {/* Minimum area / noise filter */}
            <div className="space-y-1">
              <div className="flex justify-between text-slate-600">
                <span>Noise Filter (Area)</span>
                <span className="font-mono text-slate-800">{options.minArea}px</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                value={options.minArea}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  const newOpts = { ...options, minArea: val };
                  setOptions(newOpts);
                  if (imageSrc) processImage(imageSrc, newOpts);
                }}
                className="w-full accent-slate-900"
              />
            </div>

            {/* Invert toggle & Multi-stroke merger */}
            <div className="flex items-center justify-between gap-2 pt-2">
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 select-none">
                <input
                  type="checkbox"
                  checked={options.invert}
                  onChange={(e) => {
                    const newOpts = { ...options, invert: e.target.checked };
                    setOptions(newOpts);
                    if (imageSrc) processImage(imageSrc, newOpts);
                  }}
                  className="rounded border-slate-300 text-slate-900 focus:ring-0"
                />
                <span>Invert (Light Ink)</span>
              </label>

              <button
                onClick={() => imageSrc && processImage(imageSrc, options)}
                className="flex items-center gap-1 text-slate-700 hover:text-slate-900 font-medium px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 transition-colors"
                title="Re-run connected component extraction"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Re-detect</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Character Tray & Inspector (5 Cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col shadow-sm">
          {/* Header with Auto-Sequence Selector */}
          <div className="p-4 border-b border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
                Isolated Characters ({boxes.length})
              </h3>

              {boxes.length > 0 && (
                <button
                  onClick={handleApplyAllToFont}
                  disabled={assignedCount === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-lg text-xs font-semibold shadow-xs transition-all"
                  title="Apply all mapped characters directly to your font"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Apply All {assignedCount} to Font</span>
                </button>
              )}
            </div>

            {appliedCount !== null && (
              <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-md text-emerald-800 text-xs font-medium flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Successfully added {appliedCount} character glyph(s) to your font!</span>
              </div>
            )}

            {/* Quick Auto-Assign Sequence Buttons */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-mono text-slate-500 uppercase">
                Auto-Assign Sequence:
              </span>
              <div className="flex flex-wrap gap-1">
                {SEQUENCE_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleApplySequence(p.chars)}
                    className="px-2 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Selected Character Inspector Card */}
          {selectedBox && (
            <div className="p-4 bg-amber-50/60 border-b border-amber-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-700">Selected:</span>
                  <input
                    type="text"
                    maxLength={2}
                    value={selectedBox.assignedChar || ''}
                    onChange={(e) => handleAssignChar(selectedBox.id, e.target.value)}
                    placeholder="?"
                    className="w-10 h-8 text-center text-base font-bold bg-white border border-amber-300 rounded font-mono shadow-xs focus:ring-1 focus:ring-amber-500 outline-none"
                  />
                  <span className="text-xs text-slate-500">
                    {selectedBox.assignedChar
                      ? `U+${selectedBox.assignedChar.charCodeAt(0).toString(16).toUpperCase()}`
                      : 'Unassigned'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleApplySelected(selectedBox)}
                    disabled={!selectedBox.assignedChar}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white rounded font-medium shadow-xs"
                  >
                    <span>Apply</span>
                  </button>

                  <button
                    onClick={() => handleDeleteBox(selectedBox.id)}
                    className="p-1 text-rose-500 hover:bg-rose-100 rounded"
                    title="Remove false positive box"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Side-by-side Photo Crop vs Vector Glyph Preview */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white border border-amber-200 rounded-lg p-2 flex flex-col items-center">
                  <span className="text-[10px] font-mono text-slate-400 mb-1">Original Photo Crop</span>
                  <div className="w-20 h-20 flex items-center justify-center overflow-hidden">
                    {selectedBox.previewDataUrl ? (
                      <img
                        src={selectedBox.previewDataUrl}
                        alt="Crop"
                        className="max-w-full max-h-full object-contain"
                      />
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </div>
                </div>

                <div className="bg-white border border-amber-200 rounded-lg p-2 flex flex-col items-center">
                  <span className="text-[10px] font-mono text-slate-400 mb-1">Vectorized Strokes</span>
                  <div className="w-20 h-20 flex items-center justify-center">
                    {selectedBox.strokes && selectedBox.strokes.length > 0 ? (
                      <svg viewBox="0 0 800 800" className="w-full h-full">
                        <path
                          d={strokesToSvgPath(selectedBox.strokes)}
                          fill="none"
                          stroke="#0f172a"
                          strokeWidth="20"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : (
                      <span className="text-xs text-slate-300">No stroke</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Baseline fine tune */}
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-slate-600">Baseline Alignment:</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleAdjustBaseline(selectedBox.id, -20)}
                    className="flex items-center gap-0.5 px-2 py-0.5 bg-white border border-slate-200 rounded hover:bg-slate-50 text-slate-700 font-mono"
                    title="Move strokes up"
                  >
                    <ChevronUp className="w-3 h-3" />
                    <span>Up</span>
                  </button>
                  <button
                    onClick={() => handleAdjustBaseline(selectedBox.id, 20)}
                    className="flex items-center gap-0.5 px-2 py-0.5 bg-white border border-slate-200 rounded hover:bg-slate-50 text-slate-700 font-mono"
                    title="Move strokes down"
                  >
                    <ChevronDown className="w-3 h-3" />
                    <span>Down</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Scrollable Character Cards Grid */}
          <div className="flex-1 p-3 overflow-y-auto max-h-[420px] bg-slate-50/50">
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
              {boxes.map((box) => {
                const isSelected = box.id === selectedBoxId;
                return (
                  <div
                    key={box.id}
                    onClick={() => setSelectedBoxId(box.id)}
                    className={`bg-white rounded-lg border p-2 flex flex-col items-center justify-between relative cursor-pointer transition-all ${
                      isSelected
                        ? 'border-emerald-500 shadow-sm ring-1 ring-emerald-400'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="w-full flex items-center justify-between mb-1">
                      <span className="w-5 h-5 rounded flex items-center justify-center font-mono font-bold text-xs bg-slate-900 text-white">
                        {box.assignedChar || '?'}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteBox(box.id);
                        }}
                        className="text-slate-300 hover:text-rose-500"
                        title="Remove"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Vector or crop thumbnail */}
                    <div className="w-full h-12 flex items-center justify-center overflow-hidden my-1">
                      {box.strokes && box.strokes.length > 0 ? (
                        <svg viewBox="0 0 800 800" className="w-full h-full max-h-12">
                          <path
                            d={strokesToSvgPath(box.strokes)}
                            fill="none"
                            stroke="#0f172a"
                            strokeWidth="24"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </div>

                    <span className="text-[10px] text-slate-400 font-mono">
                      {box.width}×{box.height}px
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
