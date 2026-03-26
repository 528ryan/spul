// scripts/generate-icons.js
// Generates PWA icons using sharp (bundled with Next.js — no extra install needed)
// Run: node scripts/generate-icons.js

const path = require('path')
const fs = require('fs')

async function main() {
  const sharp = require(path.join(__dirname, '../node_modules/sharp'))
  const outDir = path.join(__dirname, '../public/icons')

  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

  for (const size of [192, 512]) {
    const padding = Math.round(size * 0.2)
    const textSize = Math.round(size * 0.28)
    // 'u' accent x offset — 'sp' is roughly 2 chars wide
    const uX = Math.round(size * 0.435)

    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" fill="#0a0a0c" rx="${Math.round(size * 0.18)}"/>
  <text
    x="${size / 2}"
    y="${size / 2 + textSize * 0.35}"
    font-family="Arial, Helvetica, sans-serif"
    font-weight="700"
    font-size="${textSize}"
    fill="#f5f3ff"
    text-anchor="middle"
    dominant-baseline="middle"
  >spul</text>
  <text
    x="${uX}"
    y="${size / 2 + textSize * 0.35}"
    font-family="Arial, Helvetica, sans-serif"
    font-weight="700"
    font-size="${textSize}"
    fill="#a78bfa"
    text-anchor="middle"
    dominant-baseline="middle"
  >u</text>
</svg>`.trim()

    const outPath = path.join(outDir, `icon-${size}.png`)
    await sharp(Buffer.from(svg)).png().toFile(outPath)
    console.log(`✓ ${outPath}`)
  }
}

main().catch((err) => { console.error(err); process.exit(1) })
