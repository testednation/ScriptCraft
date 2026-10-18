import React from 'react';
import { Download, ArrowRight, Layers, Sparkles, Feather, Pen } from 'lucide-react';
import { HANDWRITING_PRESETS } from '../utils/presets';
import { HandwritingPreset } from '../types/font';
import { strokesToSvgPath } from '../utils/fontEngine';

interface CommunityPresetsProps {
  onLoadPreset: (preset: HandwritingPreset) => void;
  onDirectDownloadPreset: (preset: HandwritingPreset) => void;
  activePresetId?: string;
}

export const CommunityPresets: React.FC<CommunityPresetsProps> = ({
  onLoadPreset,
  onDirectDownloadPreset,
  activePresetId,
}) => {
  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
      {/* Editorial Header */}
      <div className="space-y-3 max-w-2xl">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-slate-500">
          <span>r/Handwriting Styles</span>
          <span aria-hidden="true">·</span>
          <span>Community Archetypes</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 font-['Plus_Jakarta_Sans']">
          Handwriting Disciplines & Presets
        </h1>
        <p className="text-slate-600 text-sm leading-relaxed">
          Curated handwriting styles inspired by the most admired disciplines on r/Handwriting. Load any preset into your workspace to tweak individual letters, or download the TrueType font immediately.
        </p>
      </div>

      {/* Preset Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {HANDWRITING_PRESETS.map((preset) => {
          const isCurrent = activePresetId === preset.id;
          // Sample preview characters: A, B, C, g, f, &
          const previewChars = ['A', 'B', 'f', 'g', 'h', '&'];

          return (
            <div
              key={preset.id}
              className={`flex flex-col justify-between bg-white rounded-xl border p-6 transition-all ${
                isCurrent
                  ? 'border-slate-900 shadow-md ring-1 ring-slate-900'
                  : 'border-slate-200 hover:border-slate-400 hover:shadow-sm'
              }`}
            >
              <div className="space-y-4">
                {/* Meta */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-slate-500 uppercase tracking-wider">
                    {preset.category}
                  </span>
                  <span className="text-xs font-mono text-slate-400 tabular-nums">
                    {preset.slant}° slant · {preset.penType}
                  </span>
                </div>

                {/* Title */}
                <div>
                  <h3 className="text-lg font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
                    {preset.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">{preset.tagline}</p>
                </div>

                {/* Handwritten Specimen Box */}
                <div className="h-32 bg-amber-50/40 rounded-lg border border-amber-200/50 p-3 flex items-center justify-center relative overflow-hidden">
                  <div className="flex items-center justify-center gap-3 w-full">
                    {previewChars.map((char) => {
                      const strokes = preset.glyphs[char];
                      if (!strokes) return null;
                      return (
                        <div key={char} className="w-12 h-16 flex items-center justify-center">
                          <svg viewBox="0 0 800 800" className="w-full h-full">
                            <path
                              d={strokesToSvgPath(strokes)}
                              fill="none"
                              stroke="#0f172a"
                              strokeWidth={preset.strokeWidth}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </div>
                      );
                    })}
                  </div>

                  <span className="absolute bottom-1.5 right-2 text-[10px] font-mono text-slate-400">
                    vector preview
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">{preset.description}</p>

                <div className="p-2.5 rounded bg-slate-50 border border-slate-200 text-[11px] text-slate-500 leading-normal">
                  <span className="font-semibold text-slate-700">Pen setup:</span> {preset.authorNote}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 pt-6 mt-6 border-t border-slate-100">
                <button
                  onClick={() => onLoadPreset(preset)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  <span>Load into Studio</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => onDirectDownloadPreset(preset)}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-sm"
                  title="Download .TTF"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>.TTF</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
