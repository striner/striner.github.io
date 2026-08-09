import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ui, type Locale } from "@/i18n/ui";
import { BRANDS, type BrandId } from "@/lib/palette";
import { generatePattern, type Pattern } from "@/lib/pattern";
import { patternRenderSize, renderExport, renderPattern } from "@/lib/render";

interface Source {
  image: CanvasImageSource;
  width: number;
  height: number;
  name: string;
  thumb: string;
}

const MAX_BEADS = 150;
const DEFAULT_BEADS = 87;

/** Downscale in halving steps so small grids keep detail instead of aliasing. */
function downsample(src: Source, w: number, h: number): ImageData {
  let img: CanvasImageSource = src.image;
  let sw = src.width;
  let sh = src.height;
  while (sw / 2 >= w * 2 && sh / 2 >= h * 2) {
    const c = document.createElement("canvas");
    c.width = Math.round(sw / 2);
    c.height = Math.round(sh / 2);
    const cx = c.getContext("2d")!;
    cx.imageSmoothingQuality = "high";
    cx.drawImage(img, 0, 0, c.width, c.height);
    img = c;
    sw = c.width;
    sh = c.height;
  }
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const ctx = out.getContext("2d", { willReadFrequently: true })!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h);
}

// Built-in sample: a little pixel heart so the app demos without an upload.
const HEART = [
  "..RR..RR..",
  ".RRRR.RRRR",
  "RRPRRRRRRR",
  "RPPRRRRRRR",
  "RPRRRRRRRR",
  ".RRRRRRRR.",
  "..RRRRRR..",
  "...RRRR...",
  "....RR....",
];

async function loadImage(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if ("createImageBitmap" in window) {
    try {
      return await createImageBitmap(file, {
        imageOrientation: "from-image",
      });
    } catch {
      // Fall back to HTMLImageElement decoding below.
    }
  }

  const dataUrl = await readFileAsDataUrl(file);
  const img = new Image();
  img.decoding = "async";
  img.src = dataUrl;
  await img.decode();
  return img;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function makeSample(): Source {
  const scale = 20;
  const w = HEART[0]!.length;
  const h = HEART.length;
  const c = document.createElement("canvas");
  c.width = w * scale;
  c.height = h * scale;
  const ctx = c.getContext("2d")!;
  const fills: Record<string, string> = { R: "#C62A34", P: "#F7CAD7" };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const f = fills[HEART[y]![x]!];
      if (!f) continue;
      ctx.fillStyle = f;
      ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  }
  return {
    image: c,
    width: c.width,
    height: c.height,
    name: "sample-heart",
    thumb: c.toDataURL(),
  };
}

export default function PerlerStudio({
  locale = "en",
}: {
  locale?: Locale;
}) {
  const t = ui[locale];
  const [source, setSource] = useState<Source | null>(null);
  const [brand, setBrand] = useState<BrandId>("mard221");
  const [beadsAcross, setBeadsAcross] = useState(DEFAULT_BEADS);
  const [dither, setDither] = useState(false);
  const [grid, setGrid] = useState(true);
  const [cell, setCell] = useState(14);
  const [highlight, setHighlight] = useState<number | null>(null);
  const [pattern, setPattern] = useState<Pattern | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const fileInputId = useId();

  const loadFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    try {
      const bmp = await loadImage(file);
      setSource((prev) => {
        if (prev?.thumb.startsWith("blob:")) URL.revokeObjectURL(prev.thumb);
        return {
          image: bmp,
          width: bmp.width,
          height: bmp.height,
          name: file.name.replace(/\.[^.]+$/, ""),
          thumb: URL.createObjectURL(file),
        };
      });
      setHighlight(null);
    } catch {
      // unsupported image format; ignore
    }
  }, []);

  // Recompute the pattern whenever the source or knobs change.
  useEffect(() => {
    if (!source) return;
    const w = Math.min(beadsAcross, MAX_BEADS);
    const h = Math.max(
      1,
      Math.min(MAX_BEADS, Math.round((w * source.height) / source.width))
    );
    const id = requestAnimationFrame(() => {
      try {
        setPattern(generatePattern(downsample(source, w, h), { dither, brand }));
      } catch (error) {
        console.error("Failed to generate bead pattern", error);
        setPattern(null);
      }
    });
    return () => cancelAnimationFrame(id);
  }, [source, beadsAcross, dither, brand]);

  // Paint the visible canvas.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !pattern) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const size = patternRenderSize(pattern, cell);
    canvas.width = size.width * dpr;
    canvas.height = size.height * dpr;
    canvas.style.width = `${size.width}px`;
    canvas.style.height = `${size.height}px`;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);
    renderPattern(ctx, pattern, { cell, grid, highlight });
  }, [pattern, cell, grid, highlight]);

  const download = useCallback(() => {
    if (!pattern || !source) return;
    renderExport(pattern).toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${source.name}-perler-pattern.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    });
  }, [pattern, source]);

  const boards = pattern
    ? Math.ceil(pattern.width / 29) * Math.ceil(pattern.height / 29)
    : 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      {/* ---- Controls ---- */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t.imageTitle}</CardTitle>
            <CardDescription>{t.imageDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileRef.current?.click()}
              onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const f = e.dataTransfer.files[0];
                if (f) void loadFile(f);
              }}
              className={`flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-4 text-center text-sm transition-colors ${
                dragOver
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-muted-foreground/50"
              }`}
            >
              {source ? (
                <img
                  src={source.thumb}
                  alt={source.name}
                  className="max-h-32 max-w-full rounded border object-contain"
                />
              ) : (
                <>
                  <span className="text-2xl">🖼️</span>
                  <span className="text-muted-foreground">{t.dropHint}</span>
                </>
              )}
            </div>
            <input
              id={fileInputId}
              ref={fileRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void loadFile(f);
                e.target.value = "";
              }}
            />
            <div className="flex gap-2">
              <Button
                asChild
                className="flex-1"
              >
                <label htmlFor={fileInputId} className="cursor-pointer">
                  {t.chooseImage}
                </label>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setSource(makeSample())}
              >
                {t.trySample}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.settingsTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>{t.brand}</Label>
              <Select
                value={brand}
                onValueChange={(v) => {
                  setBrand(v as BrandId);
                  setHighlight(null);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(
                    Object.entries(BRANDS) as [
                      BrandId,
                      (typeof BRANDS)[BrandId],
                    ][]
                  ).map(([id, b]) => (
                    <SelectItem key={id} value={id}>
                      {t.brandOption(b.label, b.colors.length)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="beads">{t.widthBeads}</Label>
                <span className="text-sm tabular-nums text-muted-foreground">
                  {beadsAcross}
                </span>
              </div>
              <Slider
                id="beads"
                min={10}
                max={MAX_BEADS}
                step={1}
                value={[beadsAcross]}
                onValueChange={([v]) => setBeadsAcross(v!)}
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="zoom">{t.zoom}</Label>
                <span className="text-sm tabular-nums text-muted-foreground">
                  {cell}px
                </span>
              </div>
              <Slider
                id="zoom"
                min={5}
                max={28}
                step={1}
                value={[cell]}
                onValueChange={([v]) => setCell(v!)}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <Label htmlFor="dither">{t.dithering}</Label>
              <Switch
                id="dither"
                checked={dither}
                onCheckedChange={setDither}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="grid">{t.gridLines}</Label>
              <Switch id="grid" checked={grid} onCheckedChange={setGrid} />
            </div>
            <Separator />
            <Button
              className="w-full"
              disabled={!pattern}
              onClick={download}
            >
              {t.download}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* ---- Pattern + legend ---- */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>{t.patternTitle}</CardTitle>
              {pattern && (
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">
                    {t.pegs(pattern.width, pattern.height)}
                  </Badge>
                  <Badge variant="secondary">
                    {t.beads(pattern.totalBeads.toLocaleString())}
                  </Badge>
                  <Badge variant="secondary">
                    {t.colorsUsed(pattern.used.length)}
                  </Badge>
                  {BRANDS[pattern.brand].pitchMm === 5 && (
                    <Badge variant="secondary">{t.pegboards(boards)}</Badge>
                  )}
                  <Badge variant="secondary">
                    {t.sizeCm(
                      ((pattern.width * BRANDS[pattern.brand].pitchMm) / 10).toFixed(1),
                      ((pattern.height * BRANDS[pattern.brand].pitchMm) / 10).toFixed(1)
                    )}
                  </Badge>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {pattern ? (
              <div className="max-h-[70vh] overflow-auto rounded-lg border bg-[#FAFAF8] p-2">
                <canvas ref={canvasRef} />
              </div>
            ) : (
              <div className="flex h-64 items-center justify-center text-muted-foreground">
                {t.emptyState}
              </div>
            )}
          </CardContent>
        </Card>

        {pattern && (
          <Card>
            <CardHeader>
              <CardTitle>{t.legendTitle}</CardTitle>
              <CardDescription>{t.legendDesc}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {pattern.used.map((u) => {
                  const c = BRANDS[pattern.brand].colors[u.index]!;
                  const active = highlight === u.index;
                  return (
                    <button
                      key={u.index}
                      type="button"
                      title={`${c.code} · ${c.hex}`}
                      onClick={() =>
                        setHighlight(active ? null : u.index)
                      }
                      className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                        active
                          ? "border-primary bg-primary/10"
                          : "hover:bg-muted"
                      }`}
                    >
                      <span
                        className="inline-block size-4 rounded-full border border-black/20"
                        style={{ backgroundColor: c.hex }}
                      />
                      <span>{c.name}</span>
                      <span className="tabular-nums text-muted-foreground">
                        ×{u.count.toLocaleString()}
                      </span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
