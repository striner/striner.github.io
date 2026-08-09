export const locales = ["en", "zh"] as const;
export type Locale = (typeof locales)[number];

const en = {
  // page shell
  title: "striner Perler — Bead Pattern Maker",
  metaDesc:
    "Turn any image into a fuse-bead pattern with 7 bead-accurate color systems (Perler, MARD, COCO, Hama, Artkal), pegboard grids and a bead shopping list.",
  subtitle: "Turn any image into a fuse-bead pattern",
  footer:
    "Everything runs in your browser — images never leave your device. 7 complete color systems: Perler (103), MARD 221 & 291, COCO 291, Hama, Artkal S and Artkal Mini — 1,392 colors in total. Standard pegboards are 29×29 pegs; midi beads are 5 mm, mini beads 2.6 mm.",
  switchLabel: "中文",
  switchHref: "/striner/perler/zh/",
  switchLang: "zh",

  // image card
  imageTitle: "Image",
  imageDesc: "Upload a picture to turn into a bead pattern.",
  dropHint: "Drop an image here or click to browse",
  chooseImage: "Choose image",
  trySample: "Try sample",

  // settings card
  settingsTitle: "Pattern settings",
  brand: "Bead brand",
  brandOption: (label: string, n: number) => `${label} · ${n} colors`,
  widthBeads: "Width in beads",
  zoom: "Zoom",
  dithering: "Dithering",
  gridLines: "Grid & pegboard lines",
  download: "Download pattern PNG",

  // pattern card
  patternTitle: "Bead pattern",
  pegs: (w: number, h: number) => `${w} × ${h} pegs`,
  beads: (n: string) => `${n} beads`,
  colorsUsed: (n: number) => `${n} colors`,
  pegboards: (n: number) => `${n} pegboard${n === 1 ? "" : "s"} (29×29)`,
  sizeCm: (w: string, h: string) => `≈ ${w} × ${h} cm`,
  emptyState: "Upload an image (or try the sample) to see your pattern.",

  // legend card
  legendTitle: "Bead shopping list",
  legendDesc: "Click a color to highlight where it goes on the board.",
};

export type Dict = typeof en;

const zh: Dict = {
  title: "striner Perler — 拼豆图纸生成器",
  metaDesc:
    "把任意图片变成拼豆图纸：支持 Perler、MARD 221/291、COCO 291、Hama、Artkal 共 7 套色卡精准配色，含拼板网格和配豆清单，全部在浏览器本地完成。",
  subtitle: "把任意图片变成拼豆图纸",
  footer:
    "所有处理都在你的浏览器中完成——图片不会上传。支持 7 套完整色卡：Perler（103 色）、MARD 221 与 291、COCO 291、Hama、Artkal 中豆与 Artkal Mini，共 1,392 色。标准拼板为 29×29 孔；中豆直径 5 毫米，小豆 2.6 毫米。",
  switchLabel: "English",
  switchHref: "/striner/perler/",
  switchLang: "en",

  imageTitle: "图片",
  imageDesc: "上传一张图片，生成拼豆图纸。",
  dropHint: "拖拽图片到这里，或点击选择",
  chooseImage: "选择图片",
  trySample: "试试示例",

  settingsTitle: "图纸设置",
  brand: "拼豆品牌",
  brandOption: (label, n) => `${label} · ${n} 色`,
  widthBeads: "宽度（豆数）",
  zoom: "缩放",
  dithering: "仿色（抖动）",
  gridLines: "网格与拼板参考线",
  download: "下载图纸 PNG",

  patternTitle: "拼豆图纸",
  pegs: (w, h) => `${w} × ${h} 孔`,
  beads: (n) => `${n} 颗豆`,
  colorsUsed: (n) => `${n} 种颜色`,
  pegboards: (n) => `${n} 块拼板（29×29）`,
  sizeCm: (w, h) => `≈ ${w} × ${h} 厘米`,
  emptyState: "上传图片（或试试示例），即可预览图纸。",

  legendTitle: "配豆清单",
  legendDesc: "点击颜色，高亮它在图纸中的位置。",
};

export const ui: Record<Locale, Dict> = { en, zh };
