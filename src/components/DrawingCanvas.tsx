import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { DrawingSettings, EchoStroke, StrokePoint } from '../types/echo';
import {
  clearCanvasLayer,
  redrawAllStrokes,
  renderEchoStroke,
} from '../utils/echoRenderer';

interface DrawingCanvasProps {
  strokes: EchoStroke[];
  settings: DrawingSettings;
  onCommitStroke: (stroke: EchoStroke) => void;
  onCanvasInteract: () => void;
  onDimensionsChange: (width: number, height: number) => void;
}

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  strokes,
  settings,
  onCommitStroke,
  onCanvasInteract,
  onDimensionsChange,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const baseCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const activeCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const sizeRef = useRef<{ width: number; height: number; dpr: number }>({
    width: typeof window !== 'undefined' ? window.innerWidth : 1440,
    height: typeof window !== 'undefined' ? window.innerHeight : 900,
    dpr: typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
  });

  const lastRenderedCountRef = useRef<number>(0);
  const strokesRef = useRef<EchoStroke[]>(strokes);
  strokesRef.current = strokes;

  // Active gesture state kept in refs for zero-latency pointer tracking
  const activePointerIdRef = useRef<number | null>(null);
  const activePointsRef = useRef<StrokePoint[]>([]);
  const activeSettingsRef = useRef<DrawingSettings>(settings);
  const activeSeedRef = useRef<number>(0);
  const lastSampleRef = useRef<{ x: number; y: number; time: number; speed: number; arcLength: number } | null>(null);

  const [isDrawing, setIsDrawing] = useState(false);

  const syncCanvasDimensions = useCallback(() => {
    const container = containerRef.current;
    const baseCanvas = baseCanvasRef.current;
    const activeCanvas = activeCanvasRef.current;
    if (!container || !baseCanvas || !activeCanvas) return;

    const rect = container.getBoundingClientRect();
    const cssWidth = Math.max(1, Math.round(rect.width));
    const cssHeight = Math.max(1, Math.round(rect.height));
    const dpr = Math.min(2.5, window.devicePixelRatio || 1);

    sizeRef.current = { width: cssWidth, height: cssHeight, dpr };
    onDimensionsChange(cssWidth, cssHeight);

    const pixelWidth = Math.round(cssWidth * dpr);
    const pixelHeight = Math.round(cssHeight * dpr);

    if (baseCanvas.width !== pixelWidth || baseCanvas.height !== pixelHeight) {
      baseCanvas.width = pixelWidth;
      baseCanvas.height = pixelHeight;
    }

    if (activeCanvas.width !== pixelWidth || activeCanvas.height !== pixelHeight) {
      activeCanvas.width = pixelWidth;
      activeCanvas.height = pixelHeight;
    }

    const baseCtx = baseCanvas.getContext('2d');
    if (baseCtx) {
      redrawAllStrokes(baseCtx, strokesRef.current, cssWidth, cssHeight, dpr);
      lastRenderedCountRef.current = strokesRef.current.length;
    }
  }, [onDimensionsChange]);

  useEffect(() => {
    syncCanvasDimensions();
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      syncCanvasDimensions();
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, [syncCanvasDimensions]);

  // Keep committed base canvas synchronized with strokes array
  useEffect(() => {
    const baseCanvas = baseCanvasRef.current;
    if (!baseCanvas) return;
    const ctx = baseCanvas.getContext('2d');
    if (!ctx) return;

    const { width, height, dpr } = sizeRef.current;
    const prevCount = lastRenderedCountRef.current;
    const nextCount = strokes.length;

    if (nextCount === prevCount + 1 && nextCount > 0) {
      // Fast incremental stamp of the newly committed stroke
      const latestStroke = strokes[nextCount - 1];
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      renderEchoStroke(ctx, latestStroke, width * 0.5, height * 0.5);
      ctx.restore();
    } else if (nextCount !== prevCount) {
      // Undo, clear, or bulk reset -> full deterministic redraw
      redrawAllStrokes(ctx, strokes, width, height, dpr);
    }

    lastRenderedCountRef.current = nextCount;
  }, [strokes]);

  const drawActiveStroke = useCallback(() => {
    const activeCanvas = activeCanvasRef.current;
    if (!activeCanvas) return;
    const ctx = activeCanvas.getContext('2d');
    if (!ctx) return;

    const { width, height, dpr } = sizeRef.current;
    clearCanvasLayer(ctx, width, height, false);

    const points = activePointsRef.current;
    if (points.length === 0) return;

    const s = activeSettingsRef.current;
    const previewStroke: EchoStroke = {
      id: 'active',
      seed: activeSeedRef.current,
      points,
      color: s.color,
      lineWidth: s.lineWidth,
      echoCount: s.echoCount,
      symmetry: s.symmetry,
      luminance: s.luminance,
    };

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    renderEchoStroke(ctx, previewStroke, width * 0.5, height * 0.5);
    ctx.restore();
  }, []);

  const toCanvasLocal = (clientX: number, clientY: number) => {
    const canvas = activeCanvasRef.current;
    if (!canvas) return { x: clientX, y: clientY };
    const rect = canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    if (activePointerIdRef.current !== null) return;

    onCanvasInteract();

    const canvas = activeCanvasRef.current;
    if (canvas) {
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        // Ignore if pointer capture is unsupported
      }
    }

    activePointerIdRef.current = e.pointerId;
    activeSettingsRef.current = { ...settings };
    activeSeedRef.current = Math.random() * Math.PI * 2;

    const { width, height } = sizeRef.current;
    const cx = width * 0.5;
    const cy = height * 0.5;
    const local = toCanvasLocal(e.clientX, e.clientY);
    const now = performance.now();

    const initialPoint: StrokePoint = {
      dx: local.x - cx,
      dy: local.y - cy,
      speed: 0.15,
      arcLength: 0,
    };

    activePointsRef.current = [initialPoint];
    lastSampleRef.current = {
      x: local.x,
      y: local.y,
      time: now,
      speed: 0.15,
      arcLength: 0,
    };

    setIsDrawing(true);
    drawActiveStroke();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activePointerIdRef.current !== e.pointerId) return;
    const prev = lastSampleRef.current;
    if (!prev) return;

    const { width, height } = sizeRef.current;
    const cx = width * 0.5;
    const cy = height * 0.5;
    const local = toCanvasLocal(e.clientX, e.clientY);

    const dxMove = local.x - prev.x;
    const dyMove = local.y - prev.y;
    const dist = Math.hypot(dxMove, dyMove);

    // Filter sub-pixel micro-jitter so curves stay velvety smooth
    if (dist < 1.5) return;

    const now = performance.now();
    const dt = Math.max(1, now - prev.time);
    const instantSpeed = dist / dt; // px/ms

    // Smooth exponential filter for organic velocity dispersion
    const smoothedSpeed = prev.speed * 0.72 + instantSpeed * 0.28;
    const nextArcLength = prev.arcLength + dist;

    const nextPoint: StrokePoint = {
      dx: local.x - cx,
      dy: local.y - cy,
      speed: smoothedSpeed,
      arcLength: nextArcLength,
    };

    activePointsRef.current.push(nextPoint);
    lastSampleRef.current = {
      x: local.x,
      y: local.y,
      time: now,
      speed: smoothedSpeed,
      arcLength: nextArcLength,
    };

    drawActiveStroke();
  };

  const finishStroke = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activePointerIdRef.current !== e.pointerId) return;

    const canvas = activeCanvasRef.current;
    if (canvas) {
      try {
        if (canvas.hasPointerCapture(e.pointerId)) {
          canvas.releasePointerCapture(e.pointerId);
        }
      } catch {
        // Ignore release errors
      }
    }

    activePointerIdRef.current = null;
    lastSampleRef.current = null;

    const points = activePointsRef.current;
    activePointsRef.current = [];
    setIsDrawing(false);

    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        clearCanvasLayer(ctx, sizeRef.current.width, sizeRef.current.height, false);
      }
    }

    if (points.length > 0) {
      const s = activeSettingsRef.current;
      onCommitStroke({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        seed: activeSeedRef.current,
        points,
        color: s.color,
        lineWidth: s.lineWidth,
        echoCount: s.echoCount,
        symmetry: s.symmetry,
        luminance: s.luminance,
      });
    }
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 w-full h-full bg-[#080808] overflow-hidden select-none"
    >
      <canvas
        ref={baseCanvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />
      <canvas
        ref={activeCanvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishStroke}
        onPointerCancel={finishStroke}
        className="absolute inset-0 w-full h-full touch-none cursor-crosshair mix-blend-screen"
        aria-label="Zone de dessin génératif"
      />

      {/* Whisper-quiet center mark only when symmetry mode is active */}
      {settings.symmetry !== 'libre' && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-white/15"
        />
      )}

      {/* Minimalist initial invitation, disappears permanently once user starts drawing */}
      {strokes.length === 0 && !isDrawing && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 flex items-center justify-center"
        >
          <p className="text-xs font-light tracking-wider text-white/25 select-none">
            Dessinez librement
          </p>
        </div>
      )}
    </div>
  );
};
