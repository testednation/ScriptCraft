import React from 'react';
import {
  Eye,
  EyeOff,
  Upload,
  Trash2,
  RotateCcw,
  Maximize2,
  Sliders,
  Sparkles,
  Contrast,
  Move,
  X,
} from 'lucide-react';

export interface UnderlayState {
  src: string | null;
  visible: boolean;
  opacity: number;
  scale: number;
  offsetX: number;
  offsetY: number;
  grayscale: boolean;
  invert?: boolean;
}

export type ComplexSampleType = 'italic' | 'blackletter' | 'kanji' | 'flourished';

interface UnderlayInspectorProps {
  underlay: UnderlayState;
  setUnderlay: React.Dispatch<React.SetStateAction<UnderlayState>>;
  onUploadClick: () => void;
  onLoadSample: (type?: ComplexSampleType) => void;
  onClose: () => void;
  currentChar: string;
}

export const UnderlayInspector: React.FC<UnderlayInspectorProps> = ({
  underlay,
  setUnderlay,
  onUploadClick,
  onLoadSample,
  onClose,
  currentChar,
}) => {
  const handleResetAlignment = () => {
    setUnderlay((prev) => ({
      ...prev,
      scale: 1.0,
      offsetX: 0,
      offsetY: 0,
    }));
  };

  const handleClearUnderlay = () => {
    setUnderlay({
      src: null,
      visible: true,
      opacity: 0.45,
      scale: 1.0,
      offsetX: 0,
      offsetY: 0,
      grayscale: true,
      invert: false,
    });
  };

  return (
    <div className="bg-white border-b border-indigo-100 shadow-xs px-6 py-3 transition-all animate-in slide-in-from-top-1 duration-150">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Left: Title & File controls */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-950 font-mono uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
            <span>Tracing Reference</span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={onUploadClick}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-md transition-colors shadow-2xs"
              title="Upload reference photo, pencil sketch, gothic script, or complex character scan"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{underlay.src ? 'Replace Photo' : 'Import Reference Image'}</span>
            </button>

            {/* Complex Character Shape Sample Presets */}
            <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-md border border-slate-200">
              <span className="text-[10px] font-semibold text-slate-500 px-1 font-mono uppercase">Samples:</span>
              <button
                onClick={() => onLoadSample('italic')}
                className="px-1.5 py-0.5 text-[11px] font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/80 rounded transition-colors shadow-2xs"
                title={`Load elegant italic calligraphy reference for '${currentChar}'`}
              >
                Italic '{currentChar}'
              </button>
              <button
                onClick={() => onLoadSample('blackletter')}
                className="px-1.5 py-0.5 text-[11px] font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/80 rounded transition-colors shadow-2xs"
                title={`Load ornate gothic blackletter textura for '${currentChar}'`}
              >
                Gothic
              </button>
              <button
                onClick={() => onLoadSample('kanji')}
                className="px-1.5 py-0.5 text-[11px] font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/80 rounded transition-colors shadow-2xs"
                title="Load complex multi-stroke Kanji character (繁 / 龍) for intricate stroke tracing"
              >
                Kanji (繁)
              </button>
              <button
                onClick={() => onLoadSample('flourished')}
                className="px-1.5 py-0.5 text-[11px] font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/80 rounded transition-colors shadow-2xs"
                title={`Load heavily flourished calligraphic swashes for '${currentChar}'`}
              >
                Flourish
              </button>
            </div>

            {underlay.src && (
              <button
                onClick={() => setUnderlay((prev) => ({ ...prev, visible: !prev.visible }))}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border transition-colors ${
                  underlay.visible
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}
                title="Toggle reference underlay visibility [U]"
              >
                {underlay.visible ? (
                  <>
                    <Eye className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Visible</span>
                  </>
                ) : (
                  <>
                    <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                    <span>Hidden</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Center: Sliders (Opacity, Scale, Grayscale, Invert, Nudges) */}
        {underlay.src && (
          <div className="flex items-center gap-4 flex-wrap">
            {/* Opacity */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-slate-600">Opacity:</span>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={underlay.opacity}
                onChange={(e) =>
                  setUnderlay((prev) => ({ ...prev, opacity: parseFloat(e.target.value) }))
                }
                className="w-20 accent-indigo-600 cursor-pointer"
              />
              <span className="text-[11px] font-mono text-slate-600 tabular-nums w-8">
                {Math.round(underlay.opacity * 100)}%
              </span>
            </div>

            {/* Scale */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-slate-600">Scale:</span>
              <input
                type="range"
                min="0.3"
                max="2.5"
                step="0.05"
                value={underlay.scale}
                onChange={(e) =>
                  setUnderlay((prev) => ({ ...prev, scale: parseFloat(e.target.value) }))
                }
                className="w-20 accent-indigo-600 cursor-pointer"
              />
              <span className="text-[11px] font-mono text-slate-600 tabular-nums w-10">
                {underlay.scale.toFixed(2)}x
              </span>
            </div>

            {/* Offset X & Y Nudges */}
            <div className="flex items-center gap-1 text-[11px] text-slate-600">
              <span className="font-medium mr-0.5">Nudge:</span>
              <button
                onClick={() => setUnderlay((prev) => ({ ...prev, offsetX: prev.offsetX - 20 }))}
                className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-mono text-[10px]"
                title="Nudge Left"
              >
                ←
              </button>
              <button
                onClick={() => setUnderlay((prev) => ({ ...prev, offsetX: prev.offsetX + 20 }))}
                className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-mono text-[10px]"
                title="Nudge Right"
              >
                →
              </button>
              <button
                onClick={() => setUnderlay((prev) => ({ ...prev, offsetY: prev.offsetY - 20 }))}
                className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-mono text-[10px]"
                title="Nudge Up"
              >
                ↑
              </button>
              <button
                onClick={() => setUnderlay((prev) => ({ ...prev, offsetY: prev.offsetY + 20 }))}
                className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-mono text-[10px]"
                title="Nudge Down"
              >
                ↓
              </button>
            </div>

            {/* Grayscale High Contrast */}
            <button
              onClick={() => setUnderlay((prev) => ({ ...prev, grayscale: !prev.grayscale }))}
              className={`flex items-center gap-1 px-2 py-1 text-[11px] rounded border transition-colors ${
                underlay.grayscale
                  ? 'bg-slate-900 text-white border-slate-900 font-semibold'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
              title="High contrast monochrome tracing filter"
            >
              <Contrast className="w-3 h-3" />
              <span>B&W</span>
            </button>

            {/* Invert Filter */}
            <button
              onClick={() => setUnderlay((prev) => ({ ...prev, invert: !prev.invert }))}
              className={`flex items-center gap-1 px-2 py-1 text-[11px] rounded border transition-colors ${
                underlay.invert
                  ? 'bg-indigo-900 text-white border-indigo-900 font-semibold'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
              title="Invert dark/light tones for high-visibility tracing"
            >
              <span>Invert</span>
            </button>

            {/* Reset Alignment */}
            <button
              onClick={handleResetAlignment}
              className="flex items-center gap-1 px-2 py-1 text-[11px] text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded border border-slate-200 transition-colors"
              title="Reset scale to 1.0x and center position"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Center</span>
            </button>

            {/* Remove */}
            <button
              onClick={handleClearUnderlay}
              className="flex items-center gap-1 px-2 py-1 text-[11px] text-rose-600 hover:bg-rose-50 rounded border border-rose-200 transition-colors"
              title="Remove underlay reference image"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear</span>
            </button>
          </div>
        )}

        {/* Close inspector */}
        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors ml-auto"
          title="Close Underlay Panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
