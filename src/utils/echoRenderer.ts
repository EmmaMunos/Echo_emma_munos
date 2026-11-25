import type { EchoStroke, PaletteColor, StrokePoint } from '../types/echo';

export const CANVAS_BG_HEX = '#080808';

export const ECHO_PALETTE: PaletteColor[] = [
  { id: 'bleu', label: 'Bleu', hex: '#67E8F9' },
  { id: 'blanc', label: 'Blanc', hex: '#F5F5F5' },
  { id: 'rose', label: 'Rose', hex: '#F9A8D4' },
  { id: 'vert', label: 'Vert', hex: '#4ADE80' },
  { id: 'orange', label: 'Orange', hex: '#FB923C' },
  { id: 'jaune', label: 'Jaune', hex: '#FDE68A' },
  { id: 'violet', label: 'Violet', hex: '#C4B5FD' },
];

const RADIAL_SECTORS = 6;
const MAX_SPLINE_SAMPLES = 220;

interface Vec2 {
  x: number;
  y: number;
}

interface RibbonSample {
  x: number;
  y: number;
  speed: number;
  arcLength: number;
  tx: number;
  ty: number;
  nx: number;
  ny: number;
  curvature: number;
}

interface ColorTones {
  auraColor: string;
  rimColor: string;
  whiteCore: string;
}

const smokeSpriteCache = new Map<string, HTMLCanvasElement>();

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function parseHexRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  const num = parseInt(full, 16);
  if (Number.isNaN(num)) return [244, 244, 246];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) * 0.5;
  if (max === min) return [0, 0, l];

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  return [h / 6, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }
  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, h) * 255),
    Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  ];
}

/**
 * Derive saturated neon smoke aura, rim, and white-hot core tones from any palette hex.
 */
function deriveColorTones(hex: string): ColorTones {
  const [r, g, b] = parseHexRgb(hex);
  const [h, s, l] = rgbToHsl(r, g, b);

  const chroma = Math.max(r, g, b) - Math.min(r, g, b);
  const isNeutral = chroma < 18 || s < 0.12;
  const auraL = isNeutral ? 0.8 : clamp(l * 0.65, 0.44, 0.58);
  const auraS = isNeutral ? 0 : 1.0;
  const [ar, ag, ab] = hslToRgb(h, auraS, auraL);

  const hotR = Math.round(lerp(r, 255, 0.88));
  const hotG = Math.round(lerp(g, 255, 0.88));
  const hotB = Math.round(lerp(b, 255, 0.88));

  return {
    auraColor: `rgb(${ar}, ${ag}, ${ab})`,
    rimColor: hex,
    whiteCore: `rgb(${hotR}, ${hotG}, ${hotB})`,
  };
}

/**
 * Build & cache a soft radial smoke puff sprite for GPU-accelerated misty neon diffusion.
 */
function getSmokePuffSprite(auraRgb: string): HTMLCanvasElement {
  const cached = smokeSpriteCache.get(auraRgb);
  if (cached) return cached;

  const size = 128;
  const half = size * 0.5;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    const match = auraRgb.match(/\d+/g);
    const r = match ? Number(match[0]) : 244;
    const g = match ? Number(match[1]) : 244;
    const b = match ? Number(match[2]) : 246;

    const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
    grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.55)`);
    grad.addColorStop(0.28, `rgba(${r}, ${g}, ${b}, 0.24)`);
    grad.addColorStop(0.62, `rgba(${r}, ${g}, ${b}, 0.06)`);
    grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }

  smokeSpriteCache.set(auraRgb, canvas);
  return canvas;
}

/**
 * Smooth raw pointer samples while preserving start and end tips.
 */
function smoothRawPoints(points: StrokePoint[]): StrokePoint[] {
  const n = points.length;
  if (n <= 2) return points;

  let current = points.map((p) => ({ ...p }));

  for (let pass = 0; pass < 3; pass++) {
    const next = current.map((p) => ({ ...p }));
    for (let i = 1; i < n - 1; i++) {
      const prev = current[i - 1];
      const curr = current[i];
      const nxt = current[i + 1];
      next[i].dx = prev.dx * 0.25 + curr.dx * 0.5 + nxt.dx * 0.25;
      next[i].dy = prev.dy * 0.25 + curr.dy * 0.5 + nxt.dy * 0.25;
      next[i].speed = prev.speed * 0.25 + curr.speed * 0.5 + nxt.speed * 0.25;
    }
    current = next;
  }

  let acc = 0;
  current[0].arcLength = 0;
  for (let i = 1; i < n; i++) {
    acc += Math.hypot(current[i].dx - current[i - 1].dx, current[i].dy - current[i - 1].dy);
    current[i].arcLength = acc;
  }

  return current;
}

function catmullRom(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  );
}

/**
 * Resample smoothed trajectory along a C1-continuous Catmull-Rom spline,
 * computing tangents, normals, and smoothed curvature.
 */
function buildSplineRibbonSamples(rawPoints: StrokePoint[]): RibbonSample[] {
  const smoothed = smoothRawPoints(rawPoints);
  const n = smoothed.length;
  if (n === 0) return [];
  if (n === 1) {
    return [
      {
        x: smoothed[0].dx,
        y: smoothed[0].dy,
        speed: smoothed[0].speed,
        arcLength: 0,
        tx: 1,
        ty: 0,
        nx: 0,
        ny: 1,
        curvature: 0,
      },
    ];
  }

  const totalApproxLen = smoothed[n - 1].arcLength;
  const targetStep = Math.max(5.5, totalApproxLen / MAX_SPLINE_SAMPLES);

  const dense: Array<{ x: number; y: number; speed: number; arcLength: number }> = [];

  for (let i = 0; i < n - 1; i++) {
    const p0 = smoothed[Math.max(0, i - 1)];
    const p1 = smoothed[i];
    const p2 = smoothed[i + 1];
    const p3 = smoothed[Math.min(n - 1, i + 2)];

    const segLen = Math.hypot(p2.dx - p1.dx, p2.dy - p1.dy);
    const steps = Math.max(1, Math.min(20, Math.ceil(segLen / targetStep)));

    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      const x = catmullRom(p0.dx, p1.dx, p2.dx, p3.dx, t);
      const y = catmullRom(p0.dy, p1.dy, p2.dy, p3.dy, t);
      const speed = lerp(p1.speed, p2.speed, t);
      dense.push({ x, y, speed, arcLength: 0 });
    }
  }

  const last = smoothed[n - 1];
  dense.push({ x: last.dx, y: last.dy, speed: last.speed, arcLength: 0 });

  let arc = 0;
  for (let i = 1; i < dense.length; i++) {
    arc += Math.hypot(dense[i].x - dense[i - 1].x, dense[i].y - dense[i - 1].y);
    dense[i].arcLength = arc;
  }

  const m = dense.length;
  const samples: RibbonSample[] = new Array(m);
  let prevTx = 1;
  let prevTy = 0;

  for (let i = 0; i < m; i++) {
    const a = dense[Math.max(0, i - 1)];
    const b = dense[Math.min(m - 1, i + 1)];
    const vx = b.x - a.x;
    const vy = b.y - a.y;
    const len = Math.hypot(vx, vy);

    let tx = prevTx;
    let ty = prevTy;
    if (len > 0.0005) {
      tx = vx / len;
      ty = vy / len;
      prevTx = tx;
      prevTy = ty;
    }

    samples[i] = {
      x: dense[i].x,
      y: dense[i].y,
      speed: dense[i].speed,
      arcLength: dense[i].arcLength,
      tx,
      ty,
      nx: -ty,
      ny: tx,
      curvature: 0,
    };
  }

  const rawCurv = new Array<number>(m).fill(0);
  for (let i = 1; i < m - 1; i++) {
    const p = samples[i - 1];
    const nxt = samples[i + 1];
    const dot = clamp(p.tx * nxt.tx + p.ty * nxt.ty, -1, 1);
    const angle = Math.acos(dot);
    const ds = Math.max(1, nxt.arcLength - p.arcLength);
    rawCurv[i] = angle / ds;
  }

  const windowRadius = 5;
  for (let i = 0; i < m; i++) {
    let sum = 0;
    let count = 0;
    for (let j = Math.max(0, i - windowRadius); j <= Math.min(m - 1, i + windowRadius); j++) {
      sum += rawCurv[j];
      count++;
    }
    samples[i].curvature = count > 0 ? sum / count : 0;
  }

  return samples;
}

/**
 * Trace a silky-smooth quadratic Bezier curve through a point array.
 */
function traceSmoothCurve(ctx: CanvasRenderingContext2D, pts: Vec2[]): void {
  const n = pts.length;
  if (n < 2) return;

  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);

  if (n === 2) {
    ctx.lineTo(pts[1].x, pts[1].y);
    return;
  }

  for (let i = 1; i < n - 1; i++) {
    const midX = (pts[i].x + pts[i + 1].x) * 0.5;
    const midY = (pts[i].y + pts[i + 1].y) * 0.5;
    ctx.quadraticCurveTo(pts[i].x, pts[i].y, midX, midY);
  }
  ctx.lineTo(pts[n - 1].x, pts[n - 1].y);
}

/**
 * Trace a seamless closed polygon formed by `edgeA` forward and `edgeB` backward.
 */
function traceClosedRibbon(ctx: CanvasRenderingContext2D, edgeA: Vec2[], edgeB: Vec2[]): void {
  if (edgeA.length < 2 || edgeB.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(edgeA[0].x, edgeA[0].y);
  for (let i = 1; i < edgeA.length - 1; i++) {
    const midX = (edgeA[i].x + edgeA[i + 1].x) * 0.5;
    const midY = (edgeA[i].y + edgeA[i + 1].y) * 0.5;
    ctx.quadraticCurveTo(edgeA[i].x, edgeA[i].y, midX, midY);
  }
  ctx.lineTo(edgeA[edgeA.length - 1].x, edgeA[edgeA.length - 1].y);

  for (let i = edgeB.length - 1; i >= 1; i--) {
    const midX = (edgeB[i].x + edgeB[i - 1].x) * 0.5;
    const midY = (edgeB[i].y + edgeB[i - 1].y) * 0.5;
    ctx.quadraticCurveTo(edgeB[i].x, edgeB[i].y, midX, midY);
  }
  ctx.lineTo(edgeB[0].x, edgeB[0].y);
  ctx.closePath();
}

/**
 * Render a smoky neon ribbon ("néon fumé"):
 * - Billowing misty radial smoke clouds diffusing around the path (zero internal filaments)
 * - Soft translucent neon veil between twisting borders
 * - Luminous neon edge glow and crisp bright neon core threads
 */
function renderSmokyNeonRibbon(
  ctx: CanvasRenderingContext2D,
  samples: RibbonSample[],
  tones: ColorTones,
  lineWidth: number,
  intensity: number,
  seedPhase: number,
  widthScale: number,
  alphaScale: number
): void {
  const m = samples.length;
  if (m === 0) return;

  const smokeSprite = getSmokePuffSprite(tones.auraColor);

  // Single click / tap: soft smoky neon puff
  if (m === 1) {
    const p = samples[0];
    const puffR = Math.max(14, (16 + lineWidth * 2.8) * widthScale);
    ctx.save();
    ctx.globalAlpha = clamp(0.65 * intensity * alphaScale, 0, 0.95);
    ctx.drawImage(smokeSprite, p.x - puffR, p.y - puffR, puffR * 2, puffR * 2);

    const coreGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, puffR * 0.35);
    coreGrad.addColorStop(0, tones.whiteCore);
    coreGrad.addColorStop(0.5, tones.rimColor);
    coreGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(p.x, p.y, puffR * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  const totalLen = Math.max(1, samples[m - 1].arcLength);
  const baseHalfWidth = (7.5 + lineWidth * 2.4) * widthScale;

  const edgeA: Vec2[] = new Array(m);
  const edgeB: Vec2[] = new Array(m);
  const auraOuterA: Vec2[] = new Array(m);
  const auraOuterB: Vec2[] = new Array(m);
  const auraMidA: Vec2[] = new Array(m);
  const auraMidB: Vec2[] = new Array(m);
  const centerPts: Vec2[] = new Array(m);
  const puffRadii = new Array<number>(m);
  const tapers = new Array<number>(m);

  let phi = seedPhase * 0.7;

  for (let i = 0; i < m; i++) {
    const s = samples[i];
    const u = s.arcLength / totalLen;
    const ds = i > 0 ? s.arcLength - samples[i - 1].arcLength : 0;

    // Smooth taper at start & end tips
    const taper = Math.pow(Math.sin(Math.PI * clamp(u, 0, 1)), 0.48);
    tapers[i] = taper;

    const speedNorm = clamp(s.speed / 2.2, 0, 1);
    const speedFactor = lerp(1.14, 0.76, speedNorm);

    // Sweeping 3D twist along curves
    phi += ds * (0.0044 + s.curvature * 0.88);

    const w =
      baseHalfWidth *
      taper *
      speedFactor *
      (0.88 + 0.16 * Math.sin(s.arcLength * 0.012 + seedPhase));

    const cosPhi = Math.cos(phi);
    const sinPhi = Math.sin(phi);

    const centerWave = w * 0.18 * Math.sin(s.arcLength * 0.011 + seedPhase * 1.2);
    const cx = s.x + s.nx * centerWave;
    const cy = s.y + s.ny * centerWave;
    centerPts[i] = { x: cx, y: cy };

    const halfSpanN = w * cosPhi;
    const halfSpanT = w * 0.16 * sinPhi;

    edgeA[i] = {
      x: cx + s.nx * halfSpanN + s.tx * halfSpanT,
      y: cy + s.ny * halfSpanN + s.ty * halfSpanT,
    };
    edgeB[i] = {
      x: cx - s.nx * halfSpanN - s.tx * halfSpanT,
      y: cy - s.ny * halfSpanN - s.ty * halfSpanT,
    };

    const absWidth = Math.max(w * 0.4, Math.abs(halfSpanN));
    const signN = halfSpanN >= 0 ? 1 : -1;

    const out1 = absWidth * 2.2 + 7 * taper;
    const out2 = absWidth * 1.45 + 3.5 * taper;

    auraOuterA[i] = { x: cx + s.nx * signN * out1, y: cy + s.ny * signN * out1 };
    auraOuterB[i] = { x: cx - s.nx * signN * out1, y: cy - s.ny * signN * out1 };
    auraMidA[i] = { x: cx + s.nx * signN * out2, y: cy + s.ny * signN * out2 };
    auraMidB[i] = { x: cx - s.nx * signN * out2, y: cy - s.ny * signN * out2 };

    puffRadii[i] =
      (absWidth * 1.65 + (14 + lineWidth * 1.4) * taper) *
      (0.85 + 0.22 * Math.sin(s.arcLength * 0.025 + seedPhase * 2.1));
  }

  const effAlpha = clamp(intensity * alphaScale, 0.05, 1.65);

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Pass 1: Misty billowing neon smoke clouds (overlapping radial smoke puffs along the trajectory)
  const puffStepDist = Math.max(10, baseHalfWidth * 0.55);
  let lastPuffArc = -puffStepDist;
  for (let i = 0; i < m; i++) {
    const s = samples[i];
    if (s.arcLength - lastPuffArc < puffStepDist && i !== m - 1) continue;
    lastPuffArc = s.arcLength;

    const r = puffRadii[i];
    if (r < 2) continue;

    // Gentle organic smoke drift off the spine so the haze billows naturally
    const drift = r * 0.22 * Math.sin(s.arcLength * 0.029 + seedPhase * 1.7);
    const px = centerPts[i].x + s.nx * drift;
    const py = centerPts[i].y + s.ny * drift;

    ctx.globalAlpha = clamp(0.11 * effAlpha * (0.4 + 0.6 * tapers[i]), 0, 0.32);
    ctx.drawImage(smokeSprite, px - r, py - r, r * 2, r * 2);
  }

  // Pass 2: Soft continuous neon aura envelopes & smoky translucent body (no internal filaments)
  ctx.fillStyle = tones.auraColor;
  ctx.globalAlpha = clamp(0.036 * effAlpha, 0, 0.22);
  traceClosedRibbon(ctx, auraOuterA, auraOuterB);
  ctx.fill();

  ctx.globalAlpha = clamp(0.062 * effAlpha, 0, 0.3);
  traceClosedRibbon(ctx, auraMidA, auraMidB);
  ctx.fill();

  ctx.globalAlpha = clamp(0.11 * effAlpha, 0, 0.42);
  traceClosedRibbon(ctx, edgeA, edgeB);
  ctx.fill();

  // Pass 3: Soft diffused neon glow along both edges
  const edges = [edgeA, edgeB];
  for (let e = 0; e < 2; e++) {
    const edgePts = edges[e];

    // Wide misty neon bloom
    ctx.strokeStyle = tones.auraColor;
    ctx.globalAlpha = clamp(0.16 * effAlpha, 0, 0.48);
    ctx.lineWidth = Math.max(6, 7.0 + lineWidth * 0.42 * widthScale);
    traceSmoothCurve(ctx, edgePts);
    ctx.stroke();

    // Saturated neon edge glow
    ctx.strokeStyle = tones.rimColor;
    ctx.globalAlpha = clamp(0.34 * effAlpha, 0, 0.76);
    ctx.lineWidth = Math.max(2.2, 2.5 + lineWidth * 0.16 * widthScale);
    traceSmoothCurve(ctx, edgePts);
    ctx.stroke();
  }

  // Pass 4: Crisp luminous white-neon core threads (softened at the tips)
  const tipStart = Math.min(m - 1, Math.floor(m * 0.09));
  const tipEnd = Math.max(tipStart + 1, Math.ceil(m * 0.91));

  for (let e = 0; e < 2; e++) {
    const edgePts = edges[e];

    ctx.strokeStyle = tones.whiteCore;
    ctx.globalAlpha = clamp(0.24 * effAlpha, 0, 0.6);
    ctx.lineWidth = Math.max(0.95, 1.0 + lineWidth * 0.05 * widthScale);
    traceSmoothCurve(ctx, edgePts);
    ctx.stroke();

    if (tipEnd - tipStart >= 2) {
      const bodyPts = edgePts.slice(tipStart, tipEnd + 1);
      ctx.strokeStyle = tones.whiteCore;
      ctx.globalAlpha = clamp(0.45 * effAlpha, 0, 0.85);
      ctx.lineWidth = Math.max(1.15, 1.25 + lineWidth * 0.065 * widthScale);
      traceSmoothCurve(ctx, bodyPts);
      ctx.stroke();
    }
  }
}

/**
 * Generate offset ribbon trajectories for echoes 0..(echoCount-1) and render them.
 */
function renderEchoRibbonSet(
  ctx: CanvasRenderingContext2D,
  baseSamples: RibbonSample[],
  stroke: EchoStroke
): void {
  const count = Math.max(1, Math.min(12, Math.round(stroke.echoCount)));
  const intensity = clamp(stroke.luminance, 0.25, 1.5);
  const tones = deriveColorTones(stroke.color);
  const echoDensityScale = count === 1 ? 1.0 : 1 / Math.pow(count, 0.38);

  // Primary smoky neon ribbon (k = 0)
  renderSmokyNeonRibbon(
    ctx,
    baseSamples,
    tones,
    stroke.lineWidth,
    intensity,
    stroke.seed,
    1.0,
    echoDensityScale
  );

  if (count === 1 || baseSamples.length === 0) {
    return;
  }

  const maxTier = Math.ceil((count - 1) / 2);

  for (let k = 1; k < count; k++) {
    const side = k % 2 === 1 ? 1 : -1;
    const tier = Math.ceil(k / 2);
    const tierRatio = tier / Math.max(1, maxTier);
    const echoPhase = stroke.seed + k * 1.29;

    const echoSamples: RibbonSample[] = new Array(baseSamples.length);
    const totalLen = Math.max(1, baseSamples[baseSamples.length - 1].arcLength);

    for (let i = 0; i < baseSamples.length; i++) {
      const s = baseSamples[i];
      const u = s.arcLength / totalLen;
      const tipBlend = Math.pow(Math.sin(Math.PI * clamp(u, 0, 1)), 0.4);

      const speedSpread = lerp(12, 64, clamp(s.speed / 2.2, 0, 1)) + stroke.lineWidth * 2.2;
      const wave = Math.sin(s.arcLength * 0.011 + echoPhase);
      const tangWave = Math.cos(s.arcLength * 0.009 + echoPhase * 1.25);

      const normalDisp =
        side * speedSpread * tierRatio * (0.72 + 0.28 * wave) * (0.2 + 0.8 * tipBlend);
      const tangDisp = speedSpread * tierRatio * 0.15 * tangWave * tipBlend;

      echoSamples[i] = {
        ...s,
        x: s.x + s.nx * normalDisp + s.tx * tangDisp,
        y: s.y + s.ny * normalDisp + s.ty * tangDisp,
      };
    }

    const widthScale = Math.max(0.52, 0.84 - tierRatio * 0.26);
    const alphaScale = echoDensityScale * Math.max(0.4, 0.78 - tierRatio * 0.28);

    renderSmokyNeonRibbon(
      ctx,
      echoSamples,
      tones,
      stroke.lineWidth,
      intensity,
      echoPhase,
      widthScale,
      alphaScale
    );
  }
}

/**
 * Render a complete EchoStroke onto a CanvasRenderingContext2D centered at (cx, cy).
 */
export function renderEchoStroke(
  ctx: CanvasRenderingContext2D,
  stroke: EchoStroke,
  cx: number,
  cy: number
): void {
  if (stroke.points.length === 0) return;

  const baseSamples = buildSplineRibbonSamples(stroke.points);
  if (baseSamples.length === 0) return;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  if (stroke.symmetry === 'libre') {
    ctx.save();
    ctx.translate(cx, cy);
    renderEchoRibbonSet(ctx, baseSamples, stroke);
    ctx.restore();
  } else if (stroke.symmetry === 'miroir') {
    ctx.save();
    ctx.translate(cx, cy);
    renderEchoRibbonSet(ctx, baseSamples, stroke);
    ctx.restore();

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(-1, 1);
    renderEchoRibbonSet(ctx, baseSamples, stroke);
    ctx.restore();
  } else {
    const step = (Math.PI * 2) / RADIAL_SECTORS;
    for (let s = 0; s < RADIAL_SECTORS; s++) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(s * step);
      renderEchoRibbonSet(ctx, baseSamples, stroke);
      ctx.restore();
    }
  }

  ctx.restore();
}

/**
 * Clear a canvas context with solid #080808 background or transparent.
 */
export function clearCanvasLayer(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  fillBackground: boolean
): void {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (fillBackground) {
    ctx.fillStyle = CANVAS_BG_HEX;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  } else {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  }
  ctx.restore();
  void width;
  void height;
}

/**
 * Redraw the entire stroke history onto a canvas sized to (cssWidth x cssHeight) at given dpr.
 */
export function redrawAllStrokes(
  ctx: CanvasRenderingContext2D,
  strokes: EchoStroke[],
  cssWidth: number,
  cssHeight: number,
  dpr: number
): void {
  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = CANVAS_BG_HEX;
  ctx.fillRect(0, 0, cssWidth, cssHeight);

  const cx = cssWidth * 0.5;
  const cy = cssHeight * 0.5;

  for (let i = 0; i < strokes.length; i++) {
    renderEchoStroke(ctx, strokes[i], cx, cy);
  }

  ctx.restore();
}

/**
 * Export the current composition as a crisp PNG data URL on solid #080808 background.
 */
export function exportCompositionToPng(
  strokes: EchoStroke[],
  cssWidth: number,
  cssHeight: number
): string {
  const exportScale = Math.min(2, window.devicePixelRatio || 1);
  const offscreen = document.createElement('canvas');
  offscreen.width = Math.max(1, Math.round(cssWidth * exportScale));
  offscreen.height = Math.max(1, Math.round(cssHeight * exportScale));

  const ctx = offscreen.getContext('2d');
  if (!ctx) {
    return '';
  }

  redrawAllStrokes(ctx, strokes, cssWidth, cssHeight, exportScale);
  return offscreen.toDataURL('image/png');
}
