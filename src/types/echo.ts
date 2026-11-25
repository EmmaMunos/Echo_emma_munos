export type SymmetryMode = 'libre' | 'miroir' | 'radial';

export interface PaletteColor {
  id: string;
  label: string;
  hex: string;
}

export interface StrokePoint {
  /** Horizontal offset from canvas center in CSS pixels */
  dx: number;
  /** Vertical offset from canvas center in CSS pixels */
  dy: number;
  /** Exponentially smoothed gesture speed in CSS px/ms */
  speed: number;
  /** Cumulative arc length along the stroke in CSS px */
  arcLength: number;
}

export interface DrawingSettings {
  color: string;
  lineWidth: number;
  echoCount: number;
  symmetry: SymmetryMode;
  /** Luminous intensity multiplier (0.25 to 1.5, default 1.0) */
  luminance: number;
}

export interface EchoStroke {
  id: string;
  seed: number;
  points: StrokePoint[];
  color: string;
  lineWidth: number;
  echoCount: number;
  symmetry: SymmetryMode;
  luminance: number;
}
