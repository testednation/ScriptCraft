import React from 'react';
import {
  Ghost,
  Eye,
  EyeOff,
  Sliders,
  Layers,
  ArrowRight,
  Sparkles,
  X,
  Compass,
  Check,
} from 'lucide-react';

export interface GhostPathSettings {
  enabled: boolean;
  referenceChar?: string; // If undefined, automatically uses previous character in sequence
  placement: 'overlay' | 'adjacent';
  showGuidelines: boolean;
  opacity: number;
  color: string;
}

interface GhostPathInspectorProps {
  settings: GhostPathSettings;
  setSettings: React.Dispatch<React.SetStateAction<GhostPathSettings>>;
  currentChar: string;
  prevChar: string;
  hasStrokes: boolean;
  onClose: () => void;
}

const COLOR_PRESETS = [
  { id: 'indigo', name: 'Indigo', hex: '#6366f1' },
  { id: 'cyan', name: 'Cyan', hex: '#06b6d4' },
  { id: 'rose', name: 'Rose', hex: '#f43f5e' },
  { id: 'amber', name: 'Amber', hex: '#f59e0b' },
  { id: 'slate', name: 'Slate', hex: '#64748b' },
];

export const GhostPathInspector: React.FC<GhostPathInspectorProps> = ({
  settings,
  setSettings,
  currentChar,
  prevChar,
  hasStrokes,
  onClose,
}) => {
  const activeRefChar = settings.referenceChar || prevChar;

  // Standard typographer's control characters for proportions
  const quickRefChars = [
    { label: `Previous ('${prevChar}')`, char: prevChar },
    { label: "Arch 'n'", char: 'n' },
    { label: "Bowl 'o'", char: 'o' },
    { label: "Cap 'H'", char: 'H' },
    { label: "Cap 'O'", char: 'O' },
  ];

  return (
    <div className="bg-white border-b border-violet-100 shadow-xs px-6 py-2.5 transition-all animate-in slide-in-from-top-1 duration-150">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Left: Title & Reference Character selection */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs font-bold text-violet-950 font-mono uppercase tracking-wider">
            <Ghost className="w-3.5 h-3.5 text-violet-600 animate-pulse" />
            <span>Ghost Path Reference</span>
          </div>

          <div className="flex items-center gap-1.5 bg-violet-50/80 p-0.5 rounded-lg border border-violet-200/80">
            {quickRefChars.map((item) => (
              <button
                key={item.char}
                onClick={() =>
                  setSettings((prev) => ({
                    ...prev,
                    referenceChar: item.char === prevChar ? undefined : item.char,
                  }))
                }
                className={`px-2 py-0.5 rounded text-xs transition-colors ${
                  activeRefChar === item.char
                    ? 'bg-violet-700 text-white font-semibold shadow-2xs'
                    : 'text-violet-900 hover:bg-violet-100 font-medium'
                }`}
                title={`Ghost reference character: ${item.label}`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {!hasStrokes && (
            <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-medium">
              Note: '{activeRefChar}' has no strokes yet.
            </span>
          )}
        </div>

        {/* Center: Placement & Guidelines & Opacity & Color */}
        <div className="flex items-center gap-4 flex-wrap text-xs text-slate-700">
          {/* Placement mode: Overlay vs Adjacent */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-md">
            <button
              onClick={() => setSettings((prev) => ({ ...prev, placement: 'overlay' }))}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                settings.placement === 'overlay'
                  ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Overlay reference character directly at same origin to compare shapes & heights"
            >
              Overlay
            </button>
            <button
              onClick={() => setSettings((prev) => ({ ...prev, placement: 'adjacent' }))}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                settings.placement === 'adjacent'
              ? 'bg-white text-slate-900 font-semibold shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Place reference character to the left to test rhythm & cursive spacing"
            >
              Adjacent Left
            </button>
          </div>

          {/* Baseline & Height Projection lines toggle */}
          <button
            onClick={() =>
              setSettings((prev) => ({ ...prev, showGuidelines: !prev.showGuidelines }))
            }
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border transition-colors ${
              settings.showGuidelines
                ? 'bg-violet-50 text-violet-800 border-violet-300 font-medium'
                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
            }`}
            title="Toggle baseline and peak height projection guide lines"
          >
            <Compass className="w-3.5 h-3.5 text-violet-600" />
            <span>Height & Baseline Guides: {settings.showGuidelines ? 'ON' : 'OFF'}</span>
          </button>

          {/* Opacity slider */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium text-slate-500">Opacity:</span>
            <input
              type="range"
              min="0.1"
              max="0.75"
              step="0.05"
              value={settings.opacity}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, opacity: parseFloat(e.target.value) }))
              }
              className="w-16 accent-violet-600 cursor-pointer"
            />
            <span className="text-[11px] font-mono tabular-nums text-slate-600 w-7">
              {Math.round(settings.opacity * 100)}%
            </span>
          </div>

          {/* Color Presets */}
          <div className="flex items-center gap-1">
            {COLOR_PRESETS.map((c) => (
              <button
                key={c.id}
                onClick={() => setSettings((prev) => ({ ...prev, color: c.hex }))}
                style={{ backgroundColor: c.hex }}
                className={`w-4 h-4 rounded-full border transition-transform ${
                  settings.color === c.hex
                    ? 'ring-2 ring-violet-500 ring-offset-1 scale-110'
                    : 'opacity-70 hover:opacity-100'
                }`}
                title={`Ghost color: ${c.name}`}
              />
            ))}
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors ml-auto"
          title="Close Ghost Path Panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
