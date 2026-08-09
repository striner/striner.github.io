import { BRANDS, type BeadColor, type BrandId } from "./palette";

export type RGB = [number, number, number];
export type Lab = [number, number, number];

export function hexToRgb(hex: string): RGB {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

// Darken a hex color; used to paint the bead's center hole.
export function shadeHex(hex: string, factor: number): string {
  const [r, g, b] = hexToRgb(hex);
  const c = (v: number) =>
    Math.round(v * factor)
      .toString(16)
      .padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

export function rgbToLab(r: number, g: number, b: number): Lab {
  const lin = (v: number) => {
    v /= 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const rl = lin(r),
    gl = lin(g),
    bl = lin(b);
  // sRGB D65 → XYZ, normalized to reference white
  let x = (rl * 0.4124564 + gl * 0.3575761 + bl * 0.1804375) / 0.95047;
  let y = rl * 0.2126729 + gl * 0.7151522 + bl * 0.072175;
  let z = (rl * 0.0193339 + gl * 0.119192 + bl * 0.9503041) / 1.08883;
  const f = (t: number) =>
    t > 0.008856 ? Math.cbrt(t) : t * 7.787 + 16 / 116;
  x = f(x);
  y = f(y);
  z = f(z);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

const rad = Math.PI / 180;

export function ciede2000(l1: Lab, l2: Lab): number {
  const [L1, a1, b1] = l1;
  const [L2, a2, b2] = l2;
  const C1 = Math.hypot(a1, b1);
  const C2 = Math.hypot(a2, b2);
  const Cb = (C1 + C2) / 2;
  const Cb7 = Math.pow(Cb, 7);
  const G = 0.5 * (1 - Math.sqrt(Cb7 / (Cb7 + Math.pow(25, 7))));
  const ap1 = a1 * (1 + G);
  const ap2 = a2 * (1 + G);
  const Cp1 = Math.hypot(ap1, b1);
  const Cp2 = Math.hypot(ap2, b2);
  const hp1 = Cp1 === 0 ? 0 : (Math.atan2(b1, ap1) / rad + 360) % 360;
  const hp2 = Cp2 === 0 ? 0 : (Math.atan2(b2, ap2) / rad + 360) % 360;
  const dL = L2 - L1;
  const dC = Cp2 - Cp1;
  let dhp = 0;
  if (Cp1 * Cp2 !== 0) {
    dhp = hp2 - hp1;
    if (dhp > 180) dhp -= 360;
    else if (dhp < -180) dhp += 360;
  }
  const dH = 2 * Math.sqrt(Cp1 * Cp2) * Math.sin((dhp / 2) * rad);
  const Lbp = (L1 + L2) / 2;
  const Cbp = (Cp1 + Cp2) / 2;
  let hbp = hp1 + hp2;
  if (Cp1 * Cp2 !== 0) {
    if (Math.abs(hp1 - hp2) > 180) hbp += hbp < 360 ? 360 : -360;
    hbp /= 2;
  }
  const T =
    1 -
    0.17 * Math.cos((hbp - 30) * rad) +
    0.24 * Math.cos(2 * hbp * rad) +
    0.32 * Math.cos((3 * hbp + 6) * rad) -
    0.2 * Math.cos((4 * hbp - 63) * rad);
  const dTheta = 30 * Math.exp(-Math.pow((hbp - 275) / 25, 2));
  const Cbp7 = Math.pow(Cbp, 7);
  const RC = 2 * Math.sqrt(Cbp7 / (Cbp7 + Math.pow(25, 7)));
  const SL =
    1 + (0.015 * Math.pow(Lbp - 50, 2)) / Math.sqrt(20 + Math.pow(Lbp - 50, 2));
  const SC = 1 + 0.045 * Cbp;
  const SH = 1 + 0.015 * Cbp * T;
  const RT = -Math.sin(2 * dTheta * rad) * RC;
  return Math.sqrt(
    Math.pow(dL / SL, 2) +
      Math.pow(dC / SC, 2) +
      Math.pow(dH / SH, 2) +
      RT * (dC / SC) * (dH / SH)
  );
}

interface Matcher {
  lab: Lab[];
  rgb: RGB[];
  whiteIndex: number | null;
  cache: Map<number, number>;
}

const matchers = new Map<BrandId, Matcher>();

function getMatcher(brand: BrandId): Matcher {
  let m = matchers.get(brand);
  if (!m) {
    const colors = BRANDS[brand].colors;
    m = {
      lab: colors.map((c) => {
        const [r, g, b] = hexToRgb(c.hex);
        return rgbToLab(r, g, b);
      }),
      rgb: colors.map((c) => hexToRgb(c.hex)),
      whiteIndex: findWhiteIndex(colors),
      cache: new Map(),
    };
    matchers.set(brand, m);
  }
  return m;
}

function findWhiteIndex(colors: readonly BeadColor[]): number | null {
  let best = -1;
  let bestScore = Infinity;
  for (let i = 0; i < colors.length; i++) {
    const color = colors[i]!;
    const [r, g, b] = hexToRgb(color.hex);
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const chroma = max - min;
    const codeOrName = `${color.code} ${color.name}`.toLowerCase();
    const isNamedWhite =
      codeOrName.includes("white") ||
      codeOrName.includes("极白") ||
      codeOrName.includes("淡白");

    if (isNamedWhite || (min >= 232 && chroma <= 18)) {
      const score = (255 - (r + g + b) / 3) + chroma * 2 - (isNamedWhite ? 20 : 0);
      if (score < bestScore) {
        best = i;
        bestScore = score;
      }
    }
  }
  return best >= 0 ? best : null;
}

export function paletteRgb(brand: BrandId): RGB[] {
  return getMatcher(brand).rgb;
}

export function whiteBeadIndex(brand: BrandId): number | null {
  return getMatcher(brand).whiteIndex;
}

/** Index of the perceptually nearest bead color within a brand's palette. */
export function nearestBead(
  brand: BrandId,
  r: number,
  g: number,
  b: number
): number {
  r = Math.max(0, Math.min(255, Math.round(r)));
  g = Math.max(0, Math.min(255, Math.round(g)));
  b = Math.max(0, Math.min(255, Math.round(b)));
  const key = (r << 16) | (g << 8) | b;
  const m = getMatcher(brand);
  const hit = m.cache.get(key);
  if (hit !== undefined) return hit;
  const lab = rgbToLab(r, g, b);
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < m.lab.length; i++) {
    const d = ciede2000(lab, m.lab[i]!);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  m.cache.set(key, best);
  return best;
}
