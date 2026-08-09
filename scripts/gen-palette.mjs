// Regenerates src/lib/palette.ts from public bead color datasets:
//   - Perler: community-maintained beadcolors dataset (github.com/maxcleme/beadcolors)
//   - MARD 221/291, COCO 291, Hama, Artkal S, Artkal Mini: bitbead.app charts
//     (www.bitbead.app/en/colors)
// Run: node scripts/gen-palette.mjs
import { writeFileSync } from "node:fs";

function familyOf(name) {
  if (/pearl/i.test(name)) return "pearl";
  if (/glitter|sparkle/i.test(name)) return "glitter";
  if (/glow|luminous/i.test(name)) return "glow";
  if (/transparent|translucent|\bclear\b/i.test(name)) return "translucent";
  if (/neon|fluor/i.test(name)) return "neon";
  if (/metallic|silver(?!\w)|copper|bronze/i.test(name)) return "metallic";
  if (/stripe/i.test(name)) return "striped";
  if (/speckle|tweed|marble/i.test(name)) return "other";
  return "solid";
}

// natural sort by code: series letters, then numeric part
function byCode(a, b) {
  const [, as, an] = a.code.match(/^([A-Za-z]+)[ -]?(\d+)/) ?? [, a.code, 0];
  const [, bs, bn] = b.code.match(/^([A-Za-z]+)[ -]?(\d+)/) ?? [, b.code, 0];
  return as.localeCompare(bs) || +an - +bn;
}

// ---- Perler (beadcolors CSVs; RGB measured from physical beads) ----

const BEADCOLORS = "https://beadcolors.eremes.xyz/raw";

async function fetchCsv(name) {
  const res = await fetch(`${BEADCOLORS}/${name}.csv`);
  if (!res.ok) throw new Error(`${name}.csv: HTTP ${res.status}`);
  return (await res.text())
    .trim()
    .split(/\r?\n/)
    .map((line) => {
      const [code, colorName, r, g, b] = line.split(",");
      return { code, name: colorName.trim(), r: +r, g: +g, b: +b };
    });
}

const rgbHex = (c) =>
  "#" +
  [c.r, c.g, c.b]
    .map((v) => v.toString(16).padStart(2, "0").toUpperCase())
    .join("");

const norm = (n) => n.toLowerCase().replace(/[^a-z0-9]/g, "");

async function perlerColors() {
  const midi = await fetchCsv("perler");
  const mini = await fetchCsv("perler_mini");
  const byName = new Map();
  for (const c of midi)
    if (!byName.has(norm(c.name))) byName.set(norm(c.name), c);
  for (const c of mini)
    if (!byName.has(norm(c.name))) byName.set(norm(c.name), c);
  return [...byName.values()]
    .map((c) => ({
      code: c.code,
      name: c.name,
      hex: rgbHex(c),
      family: familyOf(c.name),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// ---- bitbead.app charts ----

async function bitbeadColors(slug) {
  const res = await fetch(`https://www.bitbead.app/en/colors/${slug}`);
  if (!res.ok) throw new Error(`bitbead ${slug}: HTTP ${res.status}`);
  const html = await res.text();
  const cardRe =
    /font-mono font-medium text-ink-primary">([^<]{1,20})<\/span>[\s\S]{0,300}?class="truncate font-medium text-body">([^<]{1,80})<\/div><div class="font-mono text-body">(#[0-9A-Fa-f]{6})/g;
  const out = [];
  let m;
  while ((m = cardRe.exec(html))) {
    const name = m[2].replace(/&amp;/g, "&").replace(/&#x27;/g, "'").trim();
    out.push({
      code: m[1].trim(),
      name,
      hex: m[3].toUpperCase(),
      family: familyOf(name),
    });
  }
  if (!out.length) throw new Error(`bitbead ${slug}: no cards scraped`);
  if (out.length !== new Set(out.map((c) => c.code)).size)
    throw new Error(`bitbead ${slug}: duplicate codes scraped`);
  return out.sort(byCode);
}

// ---- brand registry ----

const BITBEAD_BRANDS = [
  { id: "mard221", constName: "MARD221_COLORS", label: "MARD 221", slug: "mard", pitchMm: 5 },
  { id: "mard291", constName: "MARD291_COLORS", label: "MARD 291", slug: "mard-291", pitchMm: 2.6 },
  { id: "coco291", constName: "COCO291_COLORS", label: "COCO 291", slug: "coco", pitchMm: 2.6 },
  { id: "hama", constName: "HAMA_COLORS", label: "Hama", slug: "hama", pitchMm: 5 },
  { id: "artkalS", constName: "ARTKAL_S_COLORS", label: "Artkal S", slug: "artkal", pitchMm: 5 },
  { id: "artkalMini", constName: "ARTKAL_MINI_COLORS", label: "Artkal Mini", slug: "artkal-mini", pitchMm: 2.6 },
];

const entry = (c) =>
  `  { code: "${c.code}", name: "${c.name.replace(/"/g, '\\"')}", hex: "${c.hex}", family: "${c.family}" },`;

const perler = await perlerColors();
const scraped = [];
for (const b of BITBEAD_BRANDS) {
  scraped.push({ ...b, colors: await bitbeadColors(b.slug) });
}

const arrays = [
  `export const PERLER_COLORS: BeadColor[] = [\n${perler.map(entry).join("\n")}\n];`,
  ...scraped.map(
    (b) =>
      `export const ${b.constName}: BeadColor[] = [\n${b.colors.map(entry).join("\n")}\n];`
  ),
].join("\n\n");

const brandLines = [
  `  perler: { label: "Perler", pitchMm: 5, colors: PERLER_COLORS },`,
  ...scraped.map(
    (b) =>
      `  ${b.id}: { label: "${b.label}", pitchMm: ${b.pitchMm}, colors: ${b.constName} },`
  ),
].join("\n");

writeFileSync(
  new URL("../src/lib/palette.ts", import.meta.url),
  `export type BeadFamily =
  | "solid"
  | "pearl"
  | "translucent"
  | "neon"
  | "metallic"
  | "glitter"
  | "glow"
  | "striped"
  | "other";

export interface BeadColor {
  /** Brand color code (Perler product code / chart series code). */
  code: string;
  name: string;
  hex: string;
  family: BeadFamily;
}

export interface Brand {
  label: string;
  /** Bead pitch in mm: 5 = midi, 2.6 = mini. */
  pitchMm: number;
  colors: BeadColor[];
}

// GENERATED FILE — do not edit by hand. Regenerate: node scripts/gen-palette.mjs
//
// Perler: complete current catalog, measured RGB from the community-maintained
// beadcolors dataset (github.com/maxcleme/beadcolors).
// All other systems: complete charts from bitbead.app (www.bitbead.app/en/colors).

${arrays}

export const BRANDS = {
${brandLines}
} as const satisfies Record<string, Brand>;

export type BrandId = keyof typeof BRANDS;
`
);

console.log(
  `palette.ts written: Perler ${perler.length} + ${scraped
    .map((b) => `${b.label} ${b.colors.length}`)
    .join(" + ")}`
);
