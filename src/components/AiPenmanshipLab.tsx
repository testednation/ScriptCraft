import React, { useState, useRef } from 'react';
import {
  Sparkles,
  Upload,
  RefreshCw,
  Compass,
  Sliders,
  CheckCircle2,
  PenTool,
  MessageSquare,
  AlertCircle,
  FileImage,
} from 'lucide-react';
import { AIAnalysisResult } from '../types/font';

interface AiPenmanshipLabProps {
  onApplyStyleTraits: (traits: { slant: number; strokeWidth: number; styleName: string }) => void;
}

export const AiPenmanshipLab: React.FC<AiPenmanshipLabProps> = ({ onApplyStyleTraits }) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AIAnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sample quick images to try out
  const sampleStyles = [
    {
      name: 'Architect Drafter Sample',
      desc: 'Crisp all-caps technical lettering with zero slant',
      slant: 0,
      weight: 'Medium',
      pen: '0.5mm Fineliner',
      styleName: 'Blueprint Architectural Print',
      feedback:
        'Exemplary baseline discipline and uniform cap height. The horizontal crossbars are straight and confident, characteristic of high-end drafting standards. A hallmark of classic r/Handwriting technical lettering.',
    },
    {
      name: 'Spencerian Cursive Sample',
      desc: 'American 19th century cursive with 24° slant',
      slant: 24,
      weight: 'Variable / Flex',
      pen: 'Fountain Pen (Fine Flexible Nib)',
      styleName: 'Spencerian Heirloom Script',
      feedback:
        'Gorgeous flowing rhythm with consistent 24-degree slant angles. Ascender loops on letters like l, h, and b show gentle oval symmetry. Keep up the muscular arm movement across long sentences.',
    },
    {
      name: 'Bullet Journal Sans Sample',
      desc: 'Modern rounded monoline hand lettering',
      slant: 0,
      weight: 'Light',
      pen: '0.38mm Gel Pen',
      styleName: 'Minimalist BuJo Sans',
      feedback:
        'Crisp, clean geometric roundness with excellent letter spacing. The circular bowls on a, b, and d are wonderfully consistent, making extended notes very easy on the eyes.',
    },
  ];

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      setImagePreview(dataUrl);
      analyzeImage(dataUrl, file.type);
    };
    reader.readAsDataURL(file);
  };

  const analyzeImage = async (base64Data: string, mimeType: string) => {
    setIsAnalyzing(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/analyze-handwriting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64Data,
          mimeType: mimeType || 'image/png',
        }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || 'Server returned an error');
      }

      setAnalysisResult(json.data);
    } catch (err: unknown) {
      console.error('Error during AI analysis:', err);
      const msg = err instanceof Error ? err.message : 'Analysis failed';
      setErrorMsg(
        msg.includes('GEMINI_API_KEY')
          ? 'Gemini API key is not configured on the server. You can still test with the preset samples below!'
          : `Handwriting analysis failed: ${msg}`
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApply = (result: AIAnalysisResult) => {
    let width = 14;
    if (result.characteristics.strokeWeight === 'Bold') width = 20;
    if (result.characteristics.strokeWeight === 'Light') width = 10;
    if (result.characteristics.strokeWeight === 'Ultra-Light') width = 8;

    onApplyStyleTraits({
      slant: result.characteristics.slantDegrees || 0,
      strokeWidth: width,
      styleName: result.styleName || 'Custom Handwritten',
    });
  };

  const loadPresetSample = (sample: (typeof sampleStyles)[0]) => {
    setAnalysisResult({
      styleName: sample.styleName,
      penmanshipClass: sample.name,
      characteristics: {
        slantDegrees: sample.slant,
        strokeWeight: sample.weight,
        xHeightRatio: 50,
        spacing: 'Balanced',
        loopiness: sample.slant > 15 ? 'High / Flourished' : 'Moderate',
      },
      communityFeedback: sample.feedback,
      suggestedPen: sample.pen,
      detectedLetters: ['A', 'h', 'e', 'l', 'o', 't', 'd'],
    });
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-10">
      {/* Editorial Header */}
      <div className="space-y-3 max-w-2xl">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-slate-500">
          <span>r/Handwriting Coach</span>
          <span aria-hidden="true">·</span>
          <span>Vision Analysis Engine</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 font-['Plus_Jakarta_Sans']">
          AI Penmanship & Style Analysis
        </h1>
        <p className="text-slate-600 text-sm leading-relaxed">
          Upload any photograph of your handwriting (or handwriting from a letter, journal, or r/Handwriting post). Our vision model analyzes penmanship metrics—slant, stroke weight, ascender ratios, and pen types—and provides constructive community-style feedback.
        </p>
      </div>

      {/* Upload & Sample Selector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Box */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
            Upload Handwriting Photo
          </h2>

          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 hover:border-slate-400 rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer bg-slate-50/50 hover:bg-slate-50 transition-colors relative overflow-hidden min-h-[220px]"
          >
            {imagePreview ? (
              <img
                src={imagePreview}
                alt="Uploaded handwriting"
                className="max-h-52 object-contain rounded-md"
              />
            ) : (
              <>
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="text-center">
                  <p className="text-xs font-semibold text-slate-800">
                    Click to upload notebook photo or handwriting sample
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">PNG, JPG, WEBP up to 20MB</p>
                </div>
              </>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {isAnalyzing && (
            <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200">
              <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
              <span>Analyzing pen angle, stroke dynamics, and penmanship metrics...</span>
            </div>
          )}

          {errorMsg && (
            <div className="flex items-start gap-2 text-xs text-rose-700 bg-rose-50 p-3 rounded-lg border border-rose-200">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Quick Demo Samples */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
            Or Test with r/Handwriting Samples
          </h3>
          <p className="text-xs text-slate-500">
            Click any archetype to see the exact penmanship breakdown and metrics:
          </p>

          <div className="space-y-2.5">
            {sampleStyles.map((s) => (
              <button
                key={s.name}
                onClick={() => loadPresetSample(s)}
                className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-slate-400 hover:bg-slate-50 transition-all space-y-1"
              >
                <div className="text-xs font-semibold text-slate-900">{s.name}</div>
                <div className="text-[11px] text-slate-500">{s.desc}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Analysis Results Display */}
      {analysisResult && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 lg:p-8 space-y-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
            <div>
              <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                Penmanship Profile
              </span>
              <h2 className="text-2xl font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
                {analysisResult.styleName}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Classification: {analysisResult.penmanshipClass}
              </p>
            </div>

            <button
              onClick={() => handleApply(analysisResult)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-all shadow-sm shrink-0"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Apply Metrics to Active Font</span>
            </button>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
              <span className="text-[11px] font-mono text-slate-500 uppercase">Slant Angle</span>
              <p className="text-lg font-bold text-slate-900 font-mono tabular-nums">
                {analysisResult.characteristics.slantDegrees}°
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
              <span className="text-[11px] font-mono text-slate-500 uppercase">Stroke Weight</span>
              <p className="text-lg font-bold text-slate-900">
                {analysisResult.characteristics.strokeWeight}
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
              <span className="text-[11px] font-mono text-slate-500 uppercase">Spacing</span>
              <p className="text-lg font-bold text-slate-900">
                {analysisResult.characteristics.spacing}
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
              <span className="text-[11px] font-mono text-slate-500 uppercase">Loop Formation</span>
              <p className="text-lg font-bold text-slate-900">
                {analysisResult.characteristics.loopiness}
              </p>
            </div>
          </div>

          {/* Constructive Community Critique */}
          <div className="p-5 bg-amber-50/60 border border-amber-200/80 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-900 font-['Plus_Jakarta_Sans']">
              <MessageSquare className="w-4 h-4 text-amber-600" />
              <span>r/Handwriting Community Critique & Feedback</span>
            </div>
            <p className="text-xs text-amber-950 leading-relaxed font-sans">
              "{analysisResult.communityFeedback}"
            </p>
          </div>

          {/* Recommended Pen Setup */}
          <div className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700">
            <PenTool className="w-5 h-5 text-slate-900 shrink-0" />
            <div>
              <span className="font-semibold text-slate-900">Ideal Pen Match: </span>
              <span>{analysisResult.suggestedPen}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
