import React, { useState } from 'react';
import {
  Compass,
  Sliders,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Check,
  Sparkles,
  RotateCcw,
  Maximize2,
  Move,
  Layers,
  Ruler,
  Info,
  Ghost,
  Type,
  Grid,
} from 'lucide-react';
import { GlyphStroke } from '../types/font';
import {
  TracingGuideSettings,
  STANDARD_FONT_OPTIONS,
  TracingStandardFont,
  TracingRenderMode,
  TracingColorTheme,
  compareDrawnGlyphWithStandard,
  getThemeColors,
  TRACING_OPACITY_PRESETS,
} from '../utils/tracingGuide';

interface TracingGuideInspectorProps {
  currentChar: string;
  strokes: GlyphStroke[];
  baseWidth: number;
  slant: number;
  settings: TracingGuideSettings;
  setSettings: React.Dispatch<React.SetStateAction<TracingGuideSettings>>;
}

export const TracingGuideInspector: React.FC<TracingGuideInspectorProps> = ({
  currentChar,
  strokes,
  baseWidth,
  slant,
  settings,
  setSettings,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Live proportion analysis comparing user ink to standard form
  const comparison = compareDrawnGlyphWithStandard(currentChar, strokes, settings, baseWidth);
  const themeColors = getThemeColors(settings.colorTheme);

  const updateSetting = <K extends keyof TracingGuideSettings>(
    key: K,
    val: TracingGuideSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: val }));
  };

  const handleResetScaleAndOffset = () => {
    setSettings((prev) => ({
      ...prev,
      scale: 1.0,
      offsetX: 0,
      offsetY: 0,
    }));
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs transition-all">
      {/* Header Bar */}
      <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
              settings.enabled ? 'bg-sky-100 text-sky-700' : 'bg-slate-200 text-slate-500'
            }`}
          >
            <Ghost className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
                Ghost Template Guide
              </span>
              <kbd className="px-1 py-0.2 bg-white border border-slate-200 rounded text-[9px] font-mono text-slate-500" title="Keyboard shortcut: T">
                T
              </kbd>
            </div>
            <p className="text-[10px] text-slate-500 leading-none mt-0.5">
              Semi-transparent Latin archetype for manual handwriting tracing
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Master Toggle Button */}
          <button
            onClick={() => updateSetting('enabled', !settings.enabled)}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
              settings.enabled
                ? 'bg-sky-600 text-white shadow-2xs hover:bg-sky-700'
                : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
            }`}
            title="Toggle Tracing Guide overlay on canvas (T)"
          >
            {settings.enabled ? (
              <>
                <Eye className="w-3.5 h-3.5" />
                <span>Active</span>
              </>
            ) : (
              <>
                <EyeOff className="w-3.5 h-3.5" />
                <span>Hidden</span>
              </>
            )}
          </button>

          <button
            onClick={() => setIsExpanded((prev) => !prev)}
            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
            title={isExpanded ? 'Collapse panel' : 'Expand panel'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 space-y-4 text-xs">
          {/* Standard Form Archetype Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-slate-700 font-semibold flex items-center gap-1">
                <Type className="w-3.5 h-3.5 text-slate-500" />
                <span>Standard Form Archetype</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400 capitalize">
                {STANDARD_FONT_OPTIONS.find((f) => f.id === settings.fontStyle)?.category}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {STANDARD_FONT_OPTIONS.map((opt) => {
                const isSelected = settings.fontStyle === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => updateSetting('fontStyle', opt.id)}
                    className={`p-2 rounded-lg border text-left transition-all ${
                      isSelected
                        ? 'border-sky-500 bg-sky-50/70 text-sky-950 ring-1 ring-sky-300 shadow-2xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs">{opt.name}</span>
                      {isSelected && <Check className="w-3 h-3 text-sky-600 shrink-0" />}
                    </div>
                    <div className="text-[13px] font-semibold tracking-wide text-slate-800 mt-1 truncate" style={{ fontFamily: opt.fontFamily }}>
                      {currentChar} {opt.sampleText.slice(3)}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">
                      {opt.bestFor}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Render Style: Outline, Fill, Dual, Skeleton */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-slate-700 font-semibold flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-slate-500" />
                <span>Overlay Style</span>
              </span>
              <span className="text-[10px] text-slate-400">
                {settings.renderMode === 'ghost-outline' && 'Architectural Outline'}
                {settings.renderMode === 'ghost-fill' && 'Soft Silhouette'}
                {settings.renderMode === 'dual' && 'Fill + Outline'}
                {settings.renderMode === 'skeleton' && 'Outline + Plumb Axis'}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-lg text-center font-medium">
              {[
                { id: 'ghost-outline', label: 'Outline' },
                { id: 'ghost-fill', label: 'Silhouette' },
                { id: 'dual', label: 'Dual' },
                { id: 'skeleton', label: 'Skeleton' },
              ].map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => updateSetting('renderMode', mode.id as TracingRenderMode)}
                  className={`py-1 px-1 rounded text-[11px] transition-colors truncate ${
                    settings.renderMode === mode.id
                      ? 'bg-white text-slate-900 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          {/* Opacity Slider & Presets */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-700 font-medium">Ghost Template Opacity</span>
              <span className="font-mono text-slate-600 tabular-nums">
                {Math.round(settings.opacity * 100)}%
              </span>
            </div>

            <div className="grid grid-cols-4 gap-1 p-0.5 bg-slate-100 rounded-lg text-[10px]">
              {TRACING_OPACITY_PRESETS.map((preset) => {
                const isSelected = Math.abs(settings.opacity - preset.value) < 0.05;
                return (
                  <button
                    key={preset.label}
                    onClick={() => updateSetting('opacity', preset.value)}
                    className={`py-1 px-1 rounded text-center transition-all ${
                      isSelected
                        ? 'bg-sky-600 text-white font-bold shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                    title={`${preset.label} (${Math.round(preset.value * 100)}%): ${preset.hint}`}
                  >
                    <div>{preset.label}</div>
                    <div className="text-[9px] font-mono opacity-80">{Math.round(preset.value * 100)}%</div>
                  </button>
                );
              })}
            </div>

            <input
              type="range"
              min="0.05"
              max="0.60"
              step="0.02"
              value={settings.opacity}
              onChange={(e) => updateSetting('opacity', parseFloat(e.target.value))}
              className="w-full accent-sky-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>Faint (5%)</span>
              <span>Balanced (22%)</span>
              <span>Crisp (60%)</span>
            </div>
          </div>

          {/* Proportion Guides & Slant Sync Toggles */}
          <div className="pt-2 border-t border-slate-100 space-y-2">
            {/* Match Canvas Slant */}
            <label className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer select-none hover:bg-slate-100/60 transition-colors">
              <div className="flex items-center gap-2">
                <Move className="w-3.5 h-3.5 text-amber-600" />
                <div>
                  <span className="font-semibold text-slate-800">Sync with Slant Angle</span>
                  <p className="text-[10px] text-slate-500">
                    Tilts ghost guide to match current {slant}° penmanship slant
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.applySlant}
                onChange={(e) => updateSetting('applySlant', e.target.checked)}
                className="rounded border-slate-300 text-sky-600 focus:ring-0 w-4 h-4"
              />
            </label>

            {/* Proportion Brackets & Width Caliper */}
            <label className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer select-none hover:bg-slate-100/60 transition-colors">
              <div className="flex items-center gap-2">
                <Ruler className="w-3.5 h-3.5 text-sky-600" />
                <div>
                  <span className="font-semibold text-slate-800">Proportion Brackets & Caliper</span>
                  <p className="text-[10px] text-slate-500">
                    Shows standard bounding box and pixel width markers
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.showProportions}
                onChange={(e) => updateSetting('showProportions', e.target.checked)}
                className="rounded border-slate-300 text-sky-600 focus:ring-0 w-4 h-4"
              />
            </label>

            {/* Guideline Intersection Snap Markers */}
            <label className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer select-none hover:bg-slate-100/60 transition-colors">
              <div className="flex items-center gap-2">
                <Grid className="w-3.5 h-3.5 text-emerald-600" />
                <div>
                  <span className="font-semibold text-slate-800">Guideline Intersection Pips</span>
                  <p className="text-[10px] text-slate-500">
                    Visual alignment diamonds on Cap, x-Height & Baseline
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.showGuidelineSnaps}
                onChange={(e) => updateSetting('showGuidelineSnaps', e.target.checked)}
                className="rounded border-slate-300 text-sky-600 focus:ring-0 w-4 h-4"
              />
            </label>
          </div>

          {/* Color Theme Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-slate-700 font-semibold">Guide Tint</span>
              <span className="text-[10px] font-mono text-slate-400 capitalize">
                {settings.colorTheme}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {(
                [
                  { id: 'blueprint', label: 'Blueprint', dot: 'bg-sky-500' },
                  { id: 'indigo', label: 'Indigo', dot: 'bg-indigo-600' },
                  { id: 'slate', label: 'Slate', dot: 'bg-slate-600' },
                  { id: 'emerald', label: 'Emerald', dot: 'bg-emerald-500' },
                  { id: 'amber', label: 'Amber', dot: 'bg-amber-500' },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  onClick={() => updateSetting('colorTheme', t.id as TracingColorTheme)}
                  className={`flex-1 py-1.5 px-1 rounded-md border flex flex-col items-center gap-1 transition-all ${
                    settings.colorTheme === t.id
                      ? 'border-slate-800 bg-slate-50 shadow-2xs ring-1 ring-slate-400'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                  title={`${t.label} guideline color`}
                >
                  <span className={`w-3 h-3 rounded-full ${t.dot}`} />
                  <span className="text-[10px] font-medium text-slate-700 truncate">
                    {t.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Advanced Fine Tuning (Scale & Position Offset) */}
          <div className="pt-2 border-t border-slate-100">
            <button
              onClick={() => setShowAdvanced((prev) => !prev)}
              className="flex items-center justify-between w-full text-slate-600 hover:text-slate-900 font-medium py-1 text-xs"
            >
              <span className="flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-slate-500" />
                <span>Fine Scale & Calibration</span>
              </span>
              <span className="text-[10px] text-slate-400">
                {showAdvanced ? 'Hide' : `${Math.round(settings.scale * 100)}%`}
              </span>
            </button>

            {showAdvanced && (
              <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">Reference Scale</span>
                    <span className="font-mono text-slate-700">{Math.round(settings.scale * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.80"
                    max="1.20"
                    step="0.02"
                    value={settings.scale}
                    onChange={(e) => updateSetting('scale', parseFloat(e.target.value))}
                    className="w-full accent-slate-900 cursor-pointer"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-500">Horizontal Shift</span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <button
                        onClick={() => updateSetting('offsetX', settings.offsetX - 10)}
                        className="px-2 py-1 bg-white border border-slate-200 rounded text-slate-700 hover:bg-slate-100"
                      >
                        -10
                      </button>
                      <span className="flex-1 text-center font-mono text-[11px]">
                        {settings.offsetX}px
                      </span>
                      <button
                        onClick={() => updateSetting('offsetX', settings.offsetX + 10)}
                        className="px-2 py-1 bg-white border border-slate-200 rounded text-slate-700 hover:bg-slate-100"
                      >
                        +10
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500">Vertical Shift</span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <button
                        onClick={() => updateSetting('offsetY', settings.offsetY - 10)}
                        className="px-2 py-1 bg-white border border-slate-200 rounded text-slate-700 hover:bg-slate-100"
                      >
                        -10
                      </button>
                      <span className="flex-1 text-center font-mono text-[11px]">
                        {settings.offsetY}px
                      </span>
                      <button
                        onClick={() => updateSetting('offsetY', settings.offsetY + 10)}
                        className="px-2 py-1 bg-white border border-slate-200 rounded text-slate-700 hover:bg-slate-100"
                      >
                        +10
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-1 flex justify-end">
                  <button
                    onClick={handleResetScaleAndOffset}
                    className="flex items-center gap-1 text-[11px] text-slate-600 hover:text-slate-900 hover:underline"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset Calibration</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Live Proportion Analysis Card */}
          <div className="pt-2 border-t border-slate-100">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Proportion Consistency</span>
                </span>
                {comparison.hasDrawnInk && (
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${
                      comparison.overallMatchScore >= 80
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : comparison.overallMatchScore >= 60
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-rose-100 text-rose-800 border border-rose-200'
                    }`}
                  >
                    {comparison.overallMatchScore}% Match
                  </span>
                )}
              </div>

              {comparison.hasDrawnInk ? (
                <div className="space-y-2">
                  {/* Metric Chips */}
                  <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                    <div className="p-2 bg-white rounded-lg border border-slate-200">
                      <div className="text-slate-500 text-[10px]">Width vs Standard</div>
                      <div className="font-mono font-bold text-slate-800 mt-0.5">
                        {comparison.drawnWidth}px{' '}
                        <span className="text-[10px] text-slate-400 font-normal">
                          / {comparison.standardWidth}px
                        </span>
                      </div>
                      <div className="text-[10px] mt-0.5 font-medium">
                        {comparison.widthAssessment === 'matching' && (
                          <span className="text-emerald-600">✓ Balanced width</span>
                        )}
                        {comparison.widthAssessment === 'narrow' && (
                          <span className="text-amber-600">⇥ {comparison.widthRatioPercent}% (Narrow)</span>
                        )}
                        {comparison.widthAssessment === 'wide' && (
                          <span className="text-blue-600">⇤ {comparison.widthRatioPercent}% (Broad)</span>
                        )}
                      </div>
                    </div>

                    <div className="p-2 bg-white rounded-lg border border-slate-200">
                      <div className="text-slate-500 text-[10px]">Height vs Standard</div>
                      <div className="font-mono font-bold text-slate-800 mt-0.5">
                        {comparison.drawnHeight}px{' '}
                        <span className="text-[10px] text-slate-400 font-normal">
                          / {comparison.standardHeight}px
                        </span>
                      </div>
                      <div className="text-[10px] mt-0.5 font-medium">
                        {comparison.heightAssessment === 'matching' && (
                          <span className="text-emerald-600">✓ Height harmonized</span>
                        )}
                        {comparison.heightAssessment === 'short' && (
                          <span className="text-amber-600">↓ {comparison.heightRatioPercent}% (Short)</span>
                        )}
                        {comparison.heightAssessment === 'tall' && (
                          <span className="text-blue-600">↑ {comparison.heightRatioPercent}% (Tall)</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Feedback Tip */}
                  <p className="text-[11px] leading-relaxed text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="font-medium text-slate-800">Typographer Tip: </span>
                    {comparison.feedbackTip}
                  </p>
                </div>
              ) : (
                <div className="text-[11px] text-slate-500 leading-relaxed">
                  Start drawing '{currentChar}' over the ghosted guide. Real-time proportion and alignment feedback will appear here.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
