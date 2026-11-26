// THE WORLD IN ONE DAY — Thursday 26 November 2026.
// Draws a newspaper front page summarising the day's verified world news.
// Node stdlib only. Deterministic: no network, no clock, no randomness.
// Writes /output/entry.png (or $MAKEFUN_OUTPUT_DIR/entry.png).

import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const W = 1024;
const H = 1024;

// ---- palette ----
const NAVY = [11, 31, 75];
const NAVY2 = [16, 44, 102];
const GOLD = [212, 175, 55];
const PAPER = [247, 243, 232];
const INK = [18, 18, 18];
const RED = [178, 34, 34];
const WHITE = [255, 255, 255];
const GREY = [90, 90, 90];
const LIGHT = [232, 226, 210];
const ORANGE = [224, 110, 20];
const TEAL = [15, 118, 110];

// ---- pixel buffer ----
const px = new Uint8Array(W * H * 3);
function fill(r: number, g: number, b: number): void {
  for (let i = 0; i < W * H; i++) {
    px[i * 3] = r; px[i * 3 + 1] = g; px[i * 3 + 2] = b;
  }
}
function rect(x: number, y: number, w: number, h: number, c: number[]): void {
  const x0 = Math.max(0, x), y0 = Math.max(0, y);
  const x1 = Math.min(W, x + w), y1 = Math.min(H, y + h);
  for (let yy = y0; yy < y1; yy++) {
    for (let xx = x0; xx < x1; xx++) {
      const i = (yy * W + xx) * 3;
      px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2];
    }
  }
}
function hline(x: number, y: number, w: number, c: number[]): void { rect(x, y, w, 2, c); }

// ---- 5x7 bitmap font (rows are 5-bit values, bit 4 = leftmost pixel) ----
const FONT: Record<string, number[]> = {
  A: [0x0e, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  B: [0x1e, 0x11, 0x11, 0x1e, 0x11, 0x11, 0x1e],
  C: [0x0e, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0e],
  D: [0x1e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1e],
  E: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x1f],
  F: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x10],
  G: [0x0e, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0f],
  H: [0x11, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  I: [0x0e, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0e],
  J: [0x07, 0x02, 0x02, 0x02, 0x02, 0x12, 0x0c],
  K: [0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11],
  L: [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1f],
  M: [0x11, 0x1b, 0x15, 0x15, 0x11, 0x11, 0x11],
  N: [0x11, 0x19, 0x15, 0x13, 0x11, 0x11, 0x11],
  O: [0x0e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  P: [0x1e, 0x11, 0x11, 0x1e, 0x10, 0x10, 0x10],
  Q: [0x0e, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0d],
  R: [0x1e, 0x11, 0x11, 0x1e, 0x14, 0x12, 0x11],
  S: [0x0f, 0x10, 0x10, 0x0e, 0x01, 0x01, 0x1e],
  T: [0x1f, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
  U: [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  V: [0x11, 0x11, 0x11, 0x11, 0x11, 0x0a, 0x04],
  W: [0x11, 0x11, 0x11, 0x15, 0x15, 0x1b, 0x11],
  X: [0x11, 0x11, 0x0a, 0x04, 0x0a, 0x11, 0x11],
  Y: [0x11, 0x11, 0x0a, 0x04, 0x04, 0x04, 0x04],
  Z: [0x1f, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1f],
  "0": [0x0e, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0e],
  "1": [0x04, 0x0c, 0x04, 0x04, 0x04, 0x04, 0x0e],
  "2": [0x0e, 0x11, 0x01, 0x06, 0x08, 0x10, 0x1f],
  "3": [0x1f, 0x02, 0x04, 0x02, 0x01, 0x11, 0x0e],
  "4": [0x02, 0x06, 0x0a, 0x12, 0x1f, 0x02, 0x02],
  "5": [0x1f, 0x10, 0x1e, 0x01, 0x01, 0x11, 0x0e],
  "6": [0x06, 0x08, 0x10, 0x1e, 0x11, 0x11, 0x0e],
  "7": [0x1f, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
  "8": [0x0e, 0x11, 0x11, 0x0e, 0x11, 0x11, 0x0e],
  "9": [0x0e, 0x11, 0x11, 0x0f, 0x01, 0x02, 0x0c],
  " ": [0, 0, 0, 0, 0, 0, 0],
  ".": [0, 0, 0, 0, 0, 0x0c, 0x0c],
  ",": [0, 0, 0, 0, 0x0c, 0x04, 0x08],
  ":": [0, 0x0c, 0x0c, 0, 0x0c, 0x0c, 0],
  ";": [0, 0x0c, 0x0c, 0, 0x0c, 0x04, 0x08],
  "-": [0, 0, 0, 0x1f, 0, 0, 0],
  "'": [0x04, 0x04, 0x08, 0, 0, 0, 0],
  "(": [0x02, 0x04, 0x08, 0x08, 0x08, 0x04, 0x02],
  ")": [0x08, 0x04, 0x02, 0x02, 0x02, 0x04, 0x08],
  "/": [0x01, 0x01, 0x02, 0x04, 0x08, 0x10, 0x10],
  "%": [0x19, 0x19, 0x02, 0x04, 0x08, 0x13, 0x13],
  "&": [0x0c, 0x12, 0x14, 0x08, 0x15, 0x12, 0x0d],
  "+": [0, 0x04, 0x04, 0x1f, 0x04, 0x04, 0],
  "!": [0x04, 0x04, 0x04, 0x04, 0x04, 0, 0x04],
  "?": [0x0e, 0x11, 0x01, 0x02, 0x04, 0, 0x04],
  "=": [0, 0, 0x1f, 0, 0x1f, 0, 0],
};

function textWidth(s: string, scale: number): number {
  return s.length * 6 * scale - scale;
}
function drawText(x: number, y: number, s: string, scale: number, c: number[]): void {
  const up = s.toUpperCase();
  for (let ci = 0; ci < up.length; ci++) {
    const g = FONT[up[ci]] ?? FONT["?"];
    for (let r = 0; r < 7; r++) {
      const row = g[r];
      for (let col = 0; col < 5; col++) {
        if (row & (1 << (4 - col))) {
          rect(x + ci * 6 * scale + col * scale, y + r * scale, scale, scale, c);
        }
      }
    }
  }
}
function drawCentered(cx: number, y: number, s: string, scale: number, c: number[]): void {
  drawText(cx - Math.floor(textWidth(s, scale) / 2), y, s, scale, c);
}
// Greedy word wrap; returns lines that fit maxWidth at scale.
function wrap(s: string, scale: number, maxWidth: number): string[] {
  const words = s.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const t = cur ? cur + " " + w : w;
    if (textWidth(t, scale) <= maxWidth) {
      cur = t;
    } else {
      if (cur) lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}
function drawWrapped(x: number, y: number, s: string, scale: number, maxWidth: number, c: number[], lh: number): number {
  const lines = wrap(s, scale, maxWidth);
  for (let i = 0; i < lines.length; i++) drawText(x, y + i * lh, lines[i], scale, c);
  return y + lines.length * lh;
}

// ---- pictograms (geometric, drawn with rects) ----
// Flame: stacked orange/red blocks forming a flame silhouette.
function flame(x: number, y: number, s: number): void {
  rect(x + 3 * s, y + 0 * s, 2 * s, 2 * s, ORANGE);
  rect(x + 2 * s, y + 2 * s, 4 * s, 2 * s, ORANGE);
  rect(x + 1 * s, y + 4 * s, 6 * s, 2 * s, RED);
  rect(x + 0 * s, y + 6 * s, 8 * s, 2 * s, RED);
  rect(x + 2 * s, y + 4 * s, 2 * s, 2 * s, GOLD);
  rect(x + 1 * s, y + 6 * s, 3 * s, 2 * s, GOLD);
}
// Jet: fuselage + wings + tail.
function jet(x: number, y: number, s: number, c: number[]): void {
  rect(x + 0 * s, y + 3 * s, 10 * s, 2 * s, c);
  rect(x + 8 * s, y + 2 * s, 3 * s, 4 * s, c);
  rect(x + 3 * s, y + 1 * s, 2 * s, 6 * s, c);
  rect(x + 4 * s, y + 5 * s, 2 * s, 3 * s, c);
  rect(x + 0 * s, y + 0 * s, 2 * s, 2 * s, c);
}
// Refinery: towers + tank + flame.
function refinery(x: number, y: number, s: number): void {
  rect(x + 0 * s, y + 3 * s, 2 * s, 5 * s, INK);
  rect(x + 3 * s, y + 1 * s, 2 * s, 7 * s, INK);
  rect(x + 6 * s, y + 4 * s, 4 * s, 4 * s, INK);
  rect(x + 3 * s, y + 0 * s, 2 * s, 1 * s, ORANGE);
}
// Coins / tariff: stacked coins with %.
function coins(x: number, y: number, s: number): void {
  rect(x + 0 * s, y + 6 * s, 6 * s, 2 * s, GOLD);
  rect(x + 1 * s, y + 4 * s, 6 * s, 2 * s, GOLD);
  rect(x + 2 * s, y + 2 * s, 6 * s, 2 * s, GOLD);
  rect(x + 6 * s, y + 0 * s, 4 * s, 2 * s, RED);
}
// Radiation trefoil-ish: centre dot + three wedges.
function atom(x: number, y: number, s: number): void {
  rect(x + 4 * s, y + 4 * s, 2 * s, 2 * s, RED);
  rect(x + 4 * s, y + 0 * s, 2 * s, 3 * s, RED);
  rect(x + 0 * s, y + 6 * s, 3 * s, 2 * s, RED);
  rect(x + 7 * s, y + 6 * s, 3 * s, 2 * s, RED);
  rect(x + 2 * s, y + 2 * s, 2 * s, 2 * s, RED);
  rect(x + 6 * s, y + 2 * s, 2 * s, 2 * s, RED);
}
// Cross / grave marker rows: death toll.
function crosses(x: number, y: number, s: number): void {
  for (let i = 0; i < 3; i++) {
    const cx = x + i * 3 * s;
    rect(cx + s, y + 0, s, 4 * s, GREY);
    rect(cx, y + s, 3 * s, s, GREY);
    rect(cx, y + 5 * s, 3 * s, s, GREY);
  }
}
// Rocket: body + fins + flame.
function rocket(x: number, y: number, s: number): void {
  rect(x + 4 * s, y + 0 * s, 2 * s, 5 * s, NAVY2);
  rect(x + 3 * s, y + 1 * s, 4 * s, 4 * s, NAVY2);
  rect(x + 2 * s, y + 5 * s, 2 * s, 2 * s, RED);
  rect(x + 6 * s, y + 5 * s, 2 * s, 2 * s, RED);
  rect(x + 4 * s, y + 7 * s, 2 * s, 2 * s, ORANGE);
}
// Balloon: round balloon + basket.
function balloon(x: number, y: number, s: number): void {
  rect(x + 2 * s, y + 0 * s, 6 * s, 5 * s, RED);
  rect(x + 1 * s, y + 1 * s, 8 * s, 3 * s, RED);
  rect(x + 4 * s, y + 5 * s, 2 * s, 2 * s, INK);
  rect(x + 3 * s, y + 7 * s, 4 * s, 2 * s, GOLD);
}
// Guitar: neck + body.
function guitar(x: number, y: number, s: number): void {
  rect(x + 0 * s, y + 1 * s, 7 * s, 2 * s, GOLD);
  rect(x + 6 * s, y + 3 * s, 4 * s, 5 * s, RED);
  rect(x + 7 * s, y + 4 * s, 2 * s, 3 * s, INK);
}
// Chess knight-ish: board squares + piece.
function chess(x: number, y: number, s: number): void {
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if ((r + c) % 2 === 0) rect(x + c * 2 * s, y + r * 2 * s, 2 * s, 2 * s, INK);
    }
  }
  rect(x + 9 * s, y + 1 * s, 2 * s, 6 * s, NAVY2);
  rect(x + 8 * s, y + 0 * s, 4 * s, 2 * s, NAVY2);
}

// ---- PNG encoder (stdlib zlib + own CRC32) ----
const CRC_TABLE: number[] = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c >>> 0;
}
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}
function encodePNG(): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type RGB
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0;
    raw.set(px.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---- layout ----
fill(PAPER[0], PAPER[1], PAPER[2]);
// Outer border
rect(0, 0, W, 10, NAVY);
rect(0, H - 10, W, 10, NAVY);
rect(0, 0, 10, H, NAVY);
rect(W - 10, 0, 10, H, NAVY);

// Masthead
rect(10, 10, W - 20, 138, NAVY);
drawCentered(512, 28, "THE WORLD IN ONE DAY", 5, WHITE);
drawCentered(512, 84, "THURSDAY, 26 NOVEMBER 2026", 3, GOLD);
hline(40, 128, W - 80, GOLD);

// Lead story panel (Cairo)
const LX = 28, LY = 162, LW = 968, LH = 218;
rect(LX, LY, LW, LH, WHITE);
rect(LX, LY, LW, 6, RED);
drawText(LX + 24, LY + 22, "LEAD - CAIRO, EGYPT", 2, RED);
flame(LX + 830, LY + 30, 9);
drawText(LX + 24, LY + 52, "FUEL TANKER FIRE", 4, INK);
drawText(LX + 24, LY + 96, "KILLS AT LEAST 31", 4, INK);
drawWrapped(LX + 24, LY + 148, "Tanker overturns on the Cairo ring road and bursts into flames; 21 injured, cars engulfed.", 2, 780, GREY, 20);

// Grid 2 rows x 3 cols
type Cell = { tag: string; head: string; body: string; pic: (x: number, y: number) => void };
const cells: Cell[] = [
  {
    tag: "UKRAINE - RUSSIA",
    head: "UKRAINE HITS RUSSIAN AIR BASE",
    body: "Five jets hit at Savasleyka: three MiG-31s and two Su-34s, Kyiv says.",
    pic: (x, y) => jet(x, y, 4, NAVY2),
  },
  {
    tag: "SAUDI ARABIA",
    head: "HOUTHIS CLAIM REFINERY STRIKE",
    body: "Ras Tanura, the kingdom's largest refinery, hit, Houthis say; smoke seen by satellite.",
    pic: (x, y) => refinery(x, y, 4),
  },
  {
    tag: "TRADE - USA",
    head: "US PROPOSES TARIFFS ON 14 PARTNERS",
    body: "Section 301 duties target excess capacity; China faces up to 45% in all.",
    pic: (x, y) => coins(x, y, 4),
  },
  {
    tag: "NORTH KOREA",
    head: "KIM ORDERS WIDER NUCLEAR DEPLOYMENT",
    body: "Kim calls for tactical nuclear weapons across more domains, KCNA reports.",
    pic: (x, y) => atom(x, y, 4),
  },
  {
    tag: "RUSSIA - UKRAINE",
    head: "LEAK PUTS RUSSIAN WAR DEAD AT 490,334",
    body: "Leaked Rosstat records analysed by BBC and Mediazona; true toll may top 700,000.",
    pic: (x, y) => crosses(x, y, 4),
  },
  {
    tag: "SPACE",
    head: "FIRST PAKISTANI ASTRONAUT REACHES TIANGONG",
    body: "Muhammad Zeeshan Ali docks aboard Shenzhou-24, first foreign visitor to the station.",
    pic: (x, y) => rocket(x, y, 4),
  },
];
const GX = 28, GY = 396, CW = 312, CH = 214, CGAP = 16;
for (let i = 0; i < 6; i++) {
  const col = i % 3;
  const row = Math.floor(i / 3);
  const x = GX + col * (CW + CGAP);
  const y = GY + row * (CH + CGAP);
  const c = cells[i];
  rect(x, y, CW, CH, WHITE);
  rect(x, y, CW, 4, NAVY);
  drawText(x + 14, y + 14, c.tag, 2, RED);
  c.pic(x + CW - 62, y + 12);
  const hy = drawWrapped(x + 14, y + 44, c.head, 2, CW - 28, INK, 20);
  drawWrapped(x + 14, hy + 8, c.body, 2, CW - 28, GREY, 20);
}

// Also-today strip
const AY = 856;
rect(28, AY, 968, 108, NAVY2);
drawText(48, AY + 12, "ALSO TODAY", 2, GOLD);
balloon(48, AY + 38, 3);
drawText(96, AY + 40, "MACY'S PARADE MOVED TO SATURDAY - FIRST POSTPONEMENT EVER", 2, WHITE);
guitar(48, AY + 62, 3);
drawText(96, AY + 64, "ANDY TAYLOR, DURAN DURAN GUITARIST, DIES AT 65", 2, WHITE);
chess(48, AY + 86, 2);
drawText(96, AY + 88, "CHESS: GUKESH-SINDAROV GAME 2 ENDS IN 20-MOVE DRAW", 2, WHITE);

// Footer
drawCentered(512, 978, "SOURCES: BBC - CNN - REUTERS", 2, INK);
drawCentered(512, 1000, "ONE DAY. THE WHOLE WORLD. 26 NOVEMBER 2026.", 1, GREY);

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "entry.png"), encodePNG());
