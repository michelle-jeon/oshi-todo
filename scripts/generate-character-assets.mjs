import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const outDir = path.join(process.cwd(), "public", "assets", "characters");

const variants = [
  { id: "blue", label: "블루", outfit: "#4f7cff", accent: "#d7e3ff" },
  { id: "mint", label: "민트", outfit: "#2f9f8f", accent: "#c7f2e9" },
  { id: "coral", label: "코랄", outfit: "#d85f45", accent: "#ffd1c6" },
  { id: "gold", label: "골드", outfit: "#d8a333", accent: "#ffe7a6" },
  { id: "violet", label: "바이올렛", outfit: "#7b5cd6", accent: "#ddd3ff" }
];

function catSvg({ outfit, accent }) {
  return `
  <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="#201c18" stroke-width="11" stroke-linecap="round" stroke-linejoin="round">
      <path fill="${outfit}" d="M146 478c7-108 45-169 110-169s103 61 110 169H146z"/>
      <path fill="${accent}" d="M213 340l43 39 43-39v53l-43 32-43-32z"/>
      <path fill="#f4d0a1" d="M139 189c0-73 47-126 117-126s117 53 117 126c0 70-45 121-117 121s-117-51-117-121z"/>
      <path fill="#f4d0a1" d="M153 105L99 50l-2 103z"/>
      <path fill="#f4d0a1" d="M359 105l54-55 2 103z"/>
      <path fill="#f09f76" d="M129 94l-13-26 27 14z" stroke="none"/>
      <path fill="#f09f76" d="M383 94l13-26-27 14z" stroke="none"/>
      <path fill="${accent}" d="M220 80c8-19 28-30 52-28 21 2 37 13 45 29-31-9-63-10-97-1z"/>
      <path fill="${accent}" d="M156 173c25-25 54-38 88-40" opacity=".9"/>
      <path fill="${accent}" d="M356 173c-25-25-54-38-88-40" opacity=".9"/>
      <path d="M216 196h.1M296 196h.1"/>
      <path fill="#201c18" d="M246 225l10 10 10-10z" stroke="none"/>
      <path d="M256 236v16M228 254c14 12 28 12 28-2 0 14 14 14 28 2"/>
      <path d="M178 228l-39-12M178 249l-41 4M334 228l39-12M334 249l41 4"/>
    </g>
  </svg>`;
}

await fs.mkdir(outDir, { recursive: true });

for (const variant of variants) {
  await sharp(Buffer.from(catSvg(variant)))
    .png()
    .toFile(path.join(outDir, `cat-pattern-${variant.id}.png`));
}
