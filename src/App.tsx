/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { BottomBar } from './components/BottomBar';
import { ConfirmClearModal } from './components/ConfirmClearModal';
import { DrawingCanvas } from './components/DrawingCanvas';
import { SettingsPanel } from './components/SettingsPanel';
import { TopBar } from './components/TopBar';
import type { DrawingSettings, EchoStroke } from './types/echo';
import { ECHO_PALETTE, exportCompositionToPng } from './utils/echoRenderer';

type ActivePopover = 'none' | 'thickness' | 'settings';

export default function App() {
  const [strokes, setStrokes] = useState<EchoStroke[]>([]);
  const [settings, setSettings] = useState<DrawingSettings>({
    color: ECHO_PALETTE[0].hex,
    lineWidth: 5,
    echoCount: 4,
    symmetry: 'libre',
    luminance: 1.0,
  });
  const [activePopover, setActivePopover] = useState<ActivePopover>('none');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const canvasDimensionsRef = useRef<{ width: number; height: number }>({
    width: typeof window !== 'undefined' ? window.innerWidth : 1440,
    height: typeof window !== 'undefined' ? window.innerHeight : 900,
  });

  const handleDimensionsChange = useCallback((width: number, height: number) => {
    canvasDimensionsRef.current = { width, height };
  }, []);

  const handleCommitStroke = useCallback((stroke: EchoStroke) => {
    setStrokes((prev) => [...prev, stroke]);
  }, []);

  const handleUndo = useCallback(() => {
    setStrokes((prev) => (prev.length > 0 ? prev.slice(0, -1) : prev));
  }, []);

  const handleRequestClear = useCallback(() => {
    setActivePopover('none');
    setShowClearConfirm(true);
  }, []);

  const handleConfirmClear = useCallback(() => {
    setStrokes([]);
    setShowClearConfirm(false);
  }, []);

  const handleExportPng = useCallback(() => {
    setActivePopover('none');
    const { width, height } = canvasDimensionsRef.current;
    const dataUrl = exportCompositionToPng(strokes, width, height);
    if (!dataUrl) return;

    const link = document.createElement('a');
    const now = new Date();
    const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
      now.getDate()
    ).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(
      now.getMinutes()
    ).padStart(2, '0')}`;
    link.download = `echo-${stamp}.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [strokes]);

  const handleUpdateSettings = useCallback((partial: Partial<DrawingSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  }, []);

  const handleCanvasInteract = useCallback(() => {
    setActivePopover((prev) => (prev !== 'none' ? 'none' : prev));
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showClearConfirm) {
          setShowClearConfirm(false);
        } else if (activePopover !== 'none') {
          setActivePopover('none');
        }
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activePopover, showClearConfirm, handleUndo]);

  return (
    <main className="relative w-full h-full bg-[#080808] overflow-hidden">
      <DrawingCanvas
        strokes={strokes}
        settings={settings}
        onCommitStroke={handleCommitStroke}
        onCanvasInteract={handleCanvasInteract}
        onDimensionsChange={handleDimensionsChange}
      />

      <TopBar
        canUndo={strokes.length > 0}
        hasStrokes={strokes.length > 0}
        onUndo={handleUndo}
        onRequestClear={handleRequestClear}
        onExportPng={handleExportPng}
      />

      <SettingsPanel
        isOpen={activePopover === 'settings'}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onClose={() => setActivePopover('none')}
      />

      <BottomBar
        selectedColor={settings.color}
        lineWidth={settings.lineWidth}
        activePopover={activePopover}
        onSelectColor={(hex) => handleUpdateSettings({ color: hex })}
        onChangeLineWidth={(lineWidth) => handleUpdateSettings({ lineWidth })}
        onToggleThickness={() =>
          setActivePopover((prev) => (prev === 'thickness' ? 'none' : 'thickness'))
        }
        onToggleSettings={() =>
          setActivePopover((prev) => (prev === 'settings' ? 'none' : 'settings'))
        }
      />

      <ConfirmClearModal
        isOpen={showClearConfirm}
        onCancel={() => setShowClearConfirm(false)}
        onConfirm={handleConfirmClear}
      />
    </main>
  );
}
