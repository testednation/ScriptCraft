import React from 'react';
import { X, Keyboard, Command, ArrowLeft, ArrowRight, CornerDownLeft, Sparkles } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const isMac = typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const modKey = isMac ? '⌘' : 'Ctrl';

  const shortcutGroups = [
    {
      category: 'Workspace Navigation',
      items: [
        { keys: [`${modKey}`, '1'], description: 'Switch to Glyph Studio' },
        { keys: [`${modKey}`, '2'], description: 'Switch to Font Map' },
        { keys: [`${modKey}`, '3'], description: 'Switch to Photo Upload & Scan' },
        { keys: [`${modKey}`, '4'], description: 'Switch to Ligatures Editor' },
        { keys: [`${modKey}`, '5'], description: 'Switch to Kerning Editor' },
        { keys: [`${modKey}`, '6'], description: 'Switch to Handwriting Styles' },
        { keys: [`${modKey}`, '7'], description: 'Switch to AI Penmanship Lab' },
        { keys: [`${modKey}`, '8'], description: 'Switch to Specimen Tester' },
        { keys: [`${modKey}`, '9'], description: 'Switch to Practice Worksheets' },
      ],
    },
    {
      category: 'Glyph Studio Canvas Actions',
      items: [
        { keys: [`${modKey}`, 'Z'], description: 'Undo last stroke' },
        { keys: [`${modKey}`, 'Y'], description: 'Redo stroke (or Shift+Cmd+Z)' },
        { keys: ['←', '→'], description: 'Previous / Next character' },
        { keys: ['U'], description: 'Toggle Underlay reference image on / off' },
        { keys: ['T'], description: 'Toggle Tracing Guide overlay on / off' },
        { keys: ['G'], description: 'Toggle Ghost Path of previous character on / off' },
        { keys: ['B'], description: 'Beautify & smooth active glyph strokes' },
        { keys: ['H'], description: 'Mirror / Flip character horizontally (Left ↔ Right)' },
        { keys: ['V'], description: 'Mirror / Flip character vertically (Top ↕ Bottom)' },
        { keys: ['[', ']'], description: 'Fine-tune character tilt / rotation angle (±1°)' },
        { keys: ['C'], description: 'Center glyph strokes within metric boundaries' },
        { keys: ['F'], description: 'Toggle Focus Mode (high contrast black text & canvas expansion)' },
        { keys: ['Backspace'], description: 'Delete most recent stroke (can be undone with Ctrl+Z)' },
        { keys: ['Esc'], description: 'Close modals, panels & exit Focus Mode' },
      ],
    },
    {
      category: 'Project & Export Actions',
      items: [
        { keys: [`${modKey}`, 'E'], description: 'Open Export TrueType (.ttf) dialog' },
        { keys: [`${modKey}`, 'O'], description: 'Open Offline App & Backup manager' },
        { keys: ['?'], description: 'Toggle this keyboard shortcuts cheatsheet' },
      ],
    },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 border border-indigo-200/80 rounded-xl text-indigo-700">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h3 id="shortcuts-modal-title" className="text-base font-bold text-slate-900">
                Keyboard Shortcuts
              </h3>
              <p className="text-xs text-slate-500">
                Speed up your lettering workflow with quick navigation and canvas actions
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
          {shortcutGroups.map((group) => (
            <div key={group.category} className="space-y-2.5">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">
                {group.category}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {group.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 bg-slate-50/80 rounded-lg border border-slate-200/70 text-xs"
                  >
                    <span className="text-slate-700 font-medium pr-2">{item.description}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      {item.keys.map((k, kIdx) => (
                        <React.Fragment key={kIdx}>
                          <kbd className="min-w-6 text-center px-1.5 py-0.5 text-[11px] font-mono font-semibold text-slate-700 bg-white border border-slate-300 rounded shadow-2xs">
                            {k}
                          </kbd>
                          {kIdx < item.keys.length - 1 && (
                            <span className="text-slate-400 text-[10px]">+</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-200 bg-slate-50 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Shortcuts are active globally unless editing text fields.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 shadow-2xs transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
