import { BRANDS } from "./palette";
import { hexToRgb } from "./color";
import type { Pattern } from "./pattern";

const BOARD_BG = "#F8FAFC";
const GUIDE_INTERVAL = 10;

export function patternRenderSize(
  pattern: Pick<Pattern, "width" | "height">,
  cell: number
): { width: number; height: number } {
  const gutter = coordGutter(cell);
  return {
    width: pattern.width * cell + gutter * 2,
    height: pattern.height * cell + gutter * 2,
  };
}

export interface RenderOptions {
  cell: number;
  grid: boolean;
  /** When set, beads of every other color are faded out. */
  highlight?: number | null;
}

export function renderPattern(
  ctx: CanvasRenderingContext2D,
  pattern: Pattern,
  opts: RenderOptions
): void {
  const { width, height, cells } = pattern;
  const colors = BRANDS[pattern.brand].colors;
  const { cell, grid, highlight = null } = opts;
  const gutter = coordGutter(cell);
  const boardW = width * cell;
  const boardH = height * cell;
  const W = boardW + gutter * 2;
  const H = boardH + gutter * 2;

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, W, H);

  paintCoordinates(ctx, width, height, cell, gutter);

  ctx.save();
  ctx.translate(gutter, gutter);

  ctx.fillStyle = BOARD_BG;
  ctx.fillRect(0, 0, boardW, boardH);

  paintEmptyBoard(ctx, width, height, cell);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pi = cells[y * width + x]!;
      if (pi < 0) continue;

      const color = colors[pi]!;
      const faded = highlight !== null && pi !== highlight;
      ctx.globalAlpha = faded ? 0.12 : 1;
      ctx.fillStyle = color.hex;
      ctx.fillRect(
        x * cell + 1,
        y * cell + 1,
        Math.max(0, cell - 2),
        Math.max(0, cell - 2)
      );

      if (cell >= 12 && !faded) {
        ctx.fillStyle = readableTextColor(color.hex);
        ctx.font = `${Math.max(8, Math.floor(cell * 0.38))}px system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(
          displayCode(color.code),
          x * cell + cell / 2,
          y * cell + cell / 2
        );
      }
      ctx.globalAlpha = 1;
    }
  }

  if (grid) {
    paintGrid(ctx, width, height, cell);
  }

  ctx.restore();
}

function coordGutter(cell: number): number {
  return Math.max(26, Math.ceil(cell * 1.8));
}

function paintCoordinates(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  cell: number,
  gutter: number
): void {
  const boardW = width * cell;
  const boardH = height * cell;
  const fontSize = Math.max(9, Math.min(18, Math.floor(cell * 0.78)));

  ctx.fillStyle = "#F8FAFC";
  ctx.fillRect(gutter, 0, boardW, gutter);
  ctx.fillRect(gutter, gutter + boardH, boardW, gutter);
  ctx.fillRect(0, gutter, gutter, boardH);
  ctx.fillRect(gutter + boardW, gutter, gutter, boardH);

  ctx.strokeStyle = "rgba(15,23,42,0.22)";
  ctx.lineWidth = 1;
  ctx.strokeRect(gutter + 0.5, gutter + 0.5, boardW, boardH);

  ctx.fillStyle = "#0F172A";
  ctx.font = `700 ${fontSize}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (let x = 0; x < width; x++) {
    const label = String(x + 1);
    const cx = gutter + x * cell + cell / 2;
    ctx.fillText(label, cx, gutter / 2);
    ctx.fillText(label, cx, gutter + boardH + gutter / 2);
  }

  for (let y = 0; y < height; y++) {
    const label = String(y + 1);
    const cy = gutter + y * cell + cell / 2;
    ctx.fillText(label, gutter / 2, cy);
    ctx.fillText(label, gutter + boardW + gutter / 2, cy);
  }
}

function paintEmptyBoard(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  cell: number
): void {
  if (cell < 6) return;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? "#FFFFFF" : "#EEF2F6";
      ctx.fillRect(x * cell, y * cell, cell, cell);
    }
  }
}

function paintGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  cell: number
): void {
  ctx.lineWidth = 1;
  for (let x = 0; x <= width; x++) {
    const guide = x % GUIDE_INTERVAL === 0 && x > 0 && x < width;
    ctx.strokeStyle = guide
      ? "rgba(234,88,12,0.45)"
      : "rgba(15,23,42,0.12)";
    ctx.beginPath();
    ctx.moveTo(x * cell + 0.5, 0);
    ctx.lineTo(x * cell + 0.5, height * cell);
    ctx.stroke();
  }
  for (let y = 0; y <= height; y++) {
    const guide = y % GUIDE_INTERVAL === 0 && y > 0 && y < height;
    ctx.strokeStyle = guide
      ? "rgba(234,88,12,0.45)"
      : "rgba(15,23,42,0.12)";
    ctx.beginPath();
    ctx.moveTo(0, y * cell + 0.5);
    ctx.lineTo(width * cell, y * cell + 0.5);
    ctx.stroke();
  }
}

function readableTextColor(hex: string): string {
  const [r, g, b] = hexToRgb(hex);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.62
    ? "rgba(15,23,42,0.9)"
    : "rgba(255,255,255,0.92)";
}

function displayCode(code: string): string {
  return code.startsWith("80-") ? code.slice(3) : code;
}

/** Render pattern plus a bead-count legend into a fresh canvas for download. */
export function renderExport(pattern: Pattern, cell = 24): HTMLCanvasElement {
  const colors = BRANDS[pattern.brand].colors;
  const pad = 24;
  const cols = Math.max(1, Math.min(3, Math.ceil(pattern.used.length / 17)));
  const rowH = 30;
  const colW = 240;
  const legendRows = Math.ceil(pattern.used.length / cols);
  const legendH = legendRows * rowH + pad;
  const patternSize = patternRenderSize(pattern, cell);
  const W = Math.max(patternSize.width + pad * 2, cols * colW + pad * 2);
  const H = patternSize.height + legendH + pad * 2 + 20;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.translate(pad, pad);
  renderPattern(ctx, pattern, { cell, grid: true });
  ctx.restore();

  ctx.font = "600 15px system-ui, sans-serif";
  ctx.textBaseline = "middle";
  const top = patternSize.height + pad + 30;
  pattern.used.forEach((u, i) => {
    const cx = pad + Math.floor(i / legendRows) * colW;
    const cy = top + (i % legendRows) * rowH;
    ctx.fillStyle = colors[u.index]!.hex;
    ctx.beginPath();
    ctx.arc(cx + 10, cy, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.stroke();
    ctx.fillStyle = "#111";
    ctx.fillText(`${colors[u.index]!.name} × ${u.count}`, cx + 28, cy);
  });
  return canvas;
}
