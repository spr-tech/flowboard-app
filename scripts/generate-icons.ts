// Draws Flowboard's raster icons from the logo mark (the light-theme version of src/app/icon.svg):
//   src/app/apple-icon.png      180×180, for iOS home screens
//   src/app/favicon.ico         16, 32 and 48px, for browsers that don't use the SVG icon
//   public/icons/icon-192.png   for the web app manifest (src/app/manifest.ts)
//   public/icons/icon-512.png
//
//   pnpm tsx scripts/generate-icons.ts
//
// Run it again whenever the mark or the brand colours change. Uses sharp, which Next.js already
// depends on; pnpm doesn't hoist it, so it is loaded from next's own dependencies.
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";

import { brandColours } from "../src/utilities/constants/brandColours";
import { packIco } from "../src/utilities/helpers/icoFile";

type Sharp = (input: Buffer) => { resize: (size: number) => { png: () => { toBuffer: () => Promise<Buffer> } } };
const nextRequire = createRequire(createRequire(import.meta.url).resolve("next/package.json"));
const sharp = nextRequire("sharp") as Sharp;

const { espresso, vermilion, lime, cream } = brandColours;

/**
 * The mark as an SVG. `padding` (in 30-unit mark space) leaves room around the tile, which
 * the manifest's maskable icons and iOS (which rounds the corners itself) need.
 */
function markSvg({ padding = 0, square = false } = {}): string {
  const size = 30 + padding * 2;
  const background = padding > 0 ? `<rect width="${size}" height="${size}" fill="${espresso}"/>` : "";
  const tileRadius = square ? 0 : 9;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
  ${background}
  <g transform="translate(${padding} ${padding})">
    <rect width="30" height="30" rx="${tileRadius}" fill="${espresso}"/>
    <rect x="7" y="7" width="4" height="16" rx="2" fill="${vermilion}"/>
    <rect x="13" y="7" width="4" height="11" rx="2" fill="${lime}"/>
    <rect x="19" y="7" width="4" height="7" rx="2" fill="${cream}"/>
  </g>
</svg>`;
}

async function png(svg: string, size: number): Promise<Buffer> {
  return sharp(Buffer.from(svg)).resize(size).png().toBuffer();
}

async function main() {
  const rounded = markSvg();
  // Full-bleed espresso with the bars centred: iOS and maskable launchers crop their own shape.
  const fullBleed = markSvg({ padding: 4, square: true });

  writeFileSync("src/app/apple-icon.png", await png(fullBleed, 180));

  const icoSizes = [16, 32, 48];
  const icoImages = await Promise.all(icoSizes.map(async (size) => ({ size, png: await png(rounded, size) })));
  writeFileSync("src/app/favicon.ico", packIco(icoImages));

  mkdirSync("public/icons", { recursive: true });
  writeFileSync("public/icons/icon-192.png", await png(rounded, 192));
  writeFileSync("public/icons/icon-512.png", await png(rounded, 512));
  writeFileSync("public/icons/icon-maskable-512.png", await png(fullBleed, 512));

  console.info("Icons written: src/app/apple-icon.png, src/app/favicon.ico, public/icons/*.png");
}

void main();
