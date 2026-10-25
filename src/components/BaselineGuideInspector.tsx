import React from 'react';
import {
  Sliders,
  RotateCcw,
  AlignVerticalSpaceAround,
  ArrowDownToLine,
  X,
  Sparkles,
  Eye,
  Check,
} from 'lucide-react';
import { CANVAS_BASELINE, CANVAS_CAP_HEIGHT, CANVAS_SIZE } from '../utils/fontEngine';

export interface GuideConfig {
  baseline: number;
  capHeight: number;
  showOvershoot: boolean;
  baselineColor: string;
  capHeightColor: string;
  lineWidth: number;
}

interface BaselineGuideInspectorProps {
  config: GuideConfig;
  onChange: React.Dispatch<React.SetStateAction<GuideConfig>>;
  onSnapToBaseline?: () => void;
  onClose: () => void;
  currentChar: string;
}

const PRESETS = [
  {
    name: 'Standard',
    capHeight: CANVAS_CAP_HEIGHT, // 240
    baseline: CANVAS_BASELINE, // 600
    description: '360px Cap · Standard 3:5 body ratio',
  },
  {
    name: 'Tall Display',
    capHeight: 170,
    baseline: 600,
    description: '430px Cap · Dramatic vertical elegance',
  },
  {
    name: 'Compact',
    capHeight: 290,
    baseline: 600,
    description: '310px Cap · Dense, readable small caps',
  },
  {
    name: 'High Baseline',
    capHeight: 210,
    baseline: 540,
    description: 'Generous headroom for cursive descenders',
  },
  {
    name: 'Deep Baseline',
    capHeight: 260,
    baseline: 660,
    description: 'Grounded base for tall ascender loops',
  },
];

const BASELINE_COLORS = [
  { label: 'Rose Red', value: '#ef4444' },
  { label: 'Indigo', value: '#6366f1' },
  { label: 'Emerald', value: '#10b981' },
  { label: 'Amber', value: '#f59e0b' },
  { label: 'Obsidian', value: '#0f172a' },
];

const CAP_COLORS = [
  { label: 'Royal Blue', value: '#3b82f6' },
  { label: 'Violet', value: '#8b5cf6' },
  { label: 'Cyan', value: '#06b6d4' },
  { label: 'Slate', value: '#64748b' },
  { label: 'Amber', value: '#d97706' },
];

export const BaselineGuideInspector: React.FC<BaselineGuideInspectorProps> = ({
  config,
  onChange,
  onSnapToBaseline,
  onClose,
  currentChar,
}) => {
  const capDistance = config.baseline - config.capHeight;
  const descenderRoom = CANVAS_SIZE - config.baseline;

  const handleReset = () => {
    onChange((prev) => ({
      ...prev,
      baseline: CANVAS_BASELINE,
      capHeight: CANVAS_CAP_HEIGHT,
      baselineColor: '#ef4444',
      capHeightColor: '#3b82f6',
      showOvershoot: true,
    }));
  };

  return (
    <div className="bg-white border-b border-indigo-100 shadow-xs px-6 py-3 transition-all animate-in slide-in-from-top-1 duration-150">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Title and current readouts */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 font-mono uppercase tracking-wider">
            <AlignVerticalSpaceAround className="w-3.5 h-3.5 text-indigo-600" />
            <span>Alignment Guides</span>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200 font-bold">
              Baseline: {config.baseline}px
            </span>
            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 font-bold">
              Cap-Height: {config.capHeight}px
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
              Total Cap: {capDistance}px
            </span>
          </div>
        </div>

        {/* Preset quick buttons */}
        <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-md border border-slate-200">
          <span className="text-[10px] font-semibold text-slate-500 px-1 font-mono uppercase">
            Presets:
          </span>
          {PRESETS.map((preset) => {
            const isActive =
              config.baseline === preset.baseline && config.capHeight === preset.capHeight;
            return (
              <button
                key={preset.name}
                onClick={() =>
                  onChange((prev) => ({
                    ...prev,
                    baseline: preset.baseline,
                    capHeight: preset.capHeight,
                  }))
                }
                className={`px-1.5 py-0.5 text-[11px] font-medium rounded transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-2xs font-semibold'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80'
                }`}
                title={preset.description}
              >
                {preset.name}
              </button>
            );
          })}
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors ml-auto"
          title="Close Alignment Guides Panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Sliders and Fine-Tuning Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-3 pt-3 border-t border-slate-100 text-xs">
        {/* Baseline Slider */}
        <div className="space-y-1.5 bg-rose-50/40 p-2.5 rounded-lg border border-rose-100">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-rose-950 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: config.baselineColor }} />
              Horizontal Baseline
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() =>
                  onChange((prev) => ({ ...prev, baseline: Math.max(450, prev.baseline - 5) }))
                }
                className="w-5 h-5 flex items-center justify-center rounded bg-white hover:bg-rose-100 border border-rose-200 text-rose-800 font-bold"
                title="Nudge baseline up (-5px)"
              >
                -
              </button>
              <span className="font-mono font-bold text-rose-900 w-11 text-center tabular-nums">
                {config.baseline}px
              </span>
              <button
                onClick={() =>
                  onChange((prev) => ({ ...prev, baseline: Math.min(750, prev.baseline + 5) }))
                }
                className="w-5 h-5 flex items-center justify-center rounded bg-white hover:bg-rose-100 border border-rose-200 text-rose-800 font-bold"
                title="Nudge baseline down (+5px)"
              >
                +
              </button>
            </div>
          </div>
          <input
            type="range"
            min="450"
            max="750"
            step="1"
            value={config.baseline}
            onChange={(e) =>
              onChange((prev) => ({ ...prev, baseline: parseInt(e.target.value, 10) }))
            }
            className="w-full accent-rose-600 cursor-pointer"
          />
          <div className="flex items-center justify-between text-[10px] text-rose-700/80 font-mono">
            <span>High (450px)</span>
            <span>Descender: {descenderRoom}px</span>
            <span>Low (750px)</span>
          </div>
        </div>

        {/* Cap-Height Slider */}
        <div className="space-y-1.5 bg-blue-50/40 p-2.5 rounded-lg border border-blue-100">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-blue-950 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: config.capHeightColor }} />
              Horizontal Cap-Height
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() =>
                  onChange((prev) => ({ ...prev, capHeight: Math.max(100, prev.capHeight - 5) }))
                }
                className="w-5 h-5 flex items-center justify-center rounded bg-white hover:bg-blue-100 border border-blue-200 text-blue-800 font-bold"
                title="Nudge cap-height up (-5px)"
              >
                -
              </button>
              <span className="font-mono font-bold text-blue-900 w-11 text-center tabular-nums">
                {config.capHeight}px
              </span>
              <button
                onClick={() =>
                  onChange((prev) => ({
                    ...prev,
                    capHeight: Math.min(config.baseline - 80, prev.capHeight + 5),
                  }))
                }
                className="w-5 h-5 flex items-center justify-center rounded bg-white hover:bg-blue-100 border border-blue-200 text-blue-800 font-bold"
                title="Nudge cap-height down (+5px)"
              >
                +
              </button>
            </div>
          </div>
          <input
            type="range"
            min="100"
            max={config.baseline - 80}
            step="1"
            value={config.capHeight}
            onChange={(e) =>
              onChange((prev) => ({ ...prev, capHeight: parseInt(e.target.value, 10) }))
            }
            className="w-full accent-blue-600 cursor-pointer"
          />
          <div className="flex items-center justify-between text-[10px] text-blue-700/80 font-mono">
            <span>Tall (100px)</span>
            <span>Capital Span: {capDistance}px</span>
            <span>Low ({config.baseline - 80}px)</span>
          </div>
        </div>

        {/* Optical Overshoot & Line Settings */}
        <div className="space-y-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex flex-col justify-between">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={config.showOvershoot}
              onChange={(e) =>
                onChange((prev) => ({ ...prev, showOvershoot: e.target.checked }))
              }
              className="rounded border-slate-300 text-indigo-600 focus:ring-0"
            />
            <span className="font-medium text-slate-800">
              Optical Overshoot (±8px)
            </span>
          </label>
          <p className="text-[10px] text-slate-500 leading-tight">
            Subtle guide bands for curved letters (O, C, S, Q) that optically extend past flat lines.
          </p>

          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200/80">
            <span className="text-slate-600 font-medium">Guide Width:</span>
            <div className="flex items-center gap-1">
              {[1, 1.8, 2.5].map((w) => (
                <button
                  key={w}
                  onClick={() => onChange((prev) => ({ ...prev, lineWidth: w }))}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                    config.lineWidth === w
                      ? 'bg-slate-900 text-white font-bold'
                      : 'bg-white border text-slate-600'
                  }`}
                >
                  {w}px
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions: Snap to Baseline & Reset */}
        <div className="p-2.5 bg-indigo-50/50 rounded-lg border border-indigo-100 flex flex-col justify-between space-y-2">
          {onSnapToBaseline && (
            <button
              onClick={onSnapToBaseline}
              className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-all shadow-2xs"
              title={`Align lowest points of '${currentChar}' directly to ${config.baseline}px baseline`}
            >
              <ArrowDownToLine className="w-3.5 h-3.5" />
              <span>Snap '{currentChar}' to Baseline</span>
            </button>
          )}

          <div className="flex items-center justify-between pt-1 border-t border-indigo-100/80">
            <span className="text-[10px] text-slate-500">Restore default metrics:</span>
            <button
              onClick={handleReset}
              className="flex items-center gap-1 px-2 py-1 rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] transition-colors"
              title="Reset baseline to 600px and cap-height to 240px"
            >
              <RotateCcw className="w-3 h-3 text-slate-500" />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
