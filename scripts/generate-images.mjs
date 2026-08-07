/**
 * Generates every placeholder asset the site references, as real WebP files.
 *
 * Why generate instead of committing binaries:
 *  - the repo stays text-only and diffable
 *  - `next/image` gets genuine dimensions, so layout shift is impossible
 *  - swapping in real photography later means dropping files into the same
 *    paths; no component changes required
 *
 * Deliberately text-free: SVG text rendering depends on fonts being installed
 * on the build machine, which is not guaranteed on CI. Pure geometry renders
 * identically everywhere.
 *
 * Run: `npm run assets` (also wired to `prebuild`).
 */

import { mkdir, writeFile, access } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import sharp from 'sharp'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(ROOT, 'public', 'images', 'generated')

/* ------------------------------------------------------------------ Palette */

const BRAND = {
  deep: '#012a12',
  green: '#01411c',
  mid: '#05603a',
  bright: '#059669',
  gold: '#d4af37',
  goldLight: '#f4e3a2',
  goldDeep: '#b8912a',
  ink: '#0f172a',
  cloud: '#f7f8fa',
}

/** Deterministic 32-bit string hash — same slug always yields the same art. */
function hash(input) {
  let h = 2166136261
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h)
}

function rand(seed, index) {
  const x = Math.sin(seed * 9301 + index * 49297) * 233280
  return x - Math.floor(x)
}

/* -------------------------------------------------------------- SVG pieces */

function meshBackground(seed, w, h, palette) {
  const [a, b, c] = palette
  const blobs = Array.from({ length: 5 }, (_, i) => {
    const cx = rand(seed, i * 3 + 1) * w
    const cy = rand(seed, i * 3 + 2) * h
    const r = (0.22 + rand(seed, i * 3 + 3) * 0.3) * Math.min(w, h)
    const fill = [a, b, c, BRAND.gold, BRAND.bright][i % 5]
    const opacity = 0.18 + rand(seed, i + 40) * 0.3
    return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="${fill}" opacity="${opacity.toFixed(2)}" />`
  }).join('')

  return `
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${a}" />
        <stop offset="55%" stop-color="${b}" />
        <stop offset="100%" stop-color="${c}" />
      </linearGradient>
      <filter id="soften" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="${(Math.min(w, h) * 0.09).toFixed(1)}" />
      </filter>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#bg)" />
    <g filter="url(#soften)">${blobs}</g>
  `
}

function gridOverlay(w, h, step, opacity = 0.07) {
  const lines = []
  for (let x = step; x < w; x += step) {
    lines.push(`<line x1="${x}" y1="0" x2="${x}" y2="${h}" />`)
  }
  for (let y = step; y < h; y += step) {
    lines.push(`<line x1="0" y1="${y}" x2="${w}" y2="${y}" />`)
  }
  return `<g stroke="#ffffff" stroke-opacity="${opacity}" stroke-width="1">${lines.join('')}</g>`
}

/** Crescent + star, positioned and scaled. Our recurring brand motif. */
function crescentStar(cx, cy, scale, fill, opacity = 1) {
  return `
    <g transform="translate(${cx} ${cy}) scale(${scale})" fill="${fill}" opacity="${opacity}">
      <path d="M14 -20a20 20 0 1 0 0 40 24 24 0 1 1 0-40Z" />
      <path d="m19.5 -8 2.7 5.8 6.3.8-4.7 4.3 1.3 6.2-5.6-3.1-5.6 3.1 1.3-6.2-4.7-4.3 6.3-.8z" />
    </g>
  `
}

/** Abstract "course tile" motif — varies per seed so no two cards look alike. */
function abstractMotif(seed, w, h) {
  const kind = hash(String(seed)) % 4
  const cx = w * 0.72
  const cy = h * 0.4
  const unit = Math.min(w, h) * 0.11

  if (kind === 0) {
    // Concentric arcs
    return Array.from({ length: 4 }, (_, i) => {
      const r = unit * (1.1 + i * 0.65)
      return `<circle cx="${cx}" cy="${cy}" r="${r.toFixed(1)}" fill="none" stroke="${BRAND.goldLight}" stroke-opacity="${(0.5 - i * 0.09).toFixed(2)}" stroke-width="${(unit * 0.12).toFixed(1)}" stroke-dasharray="${(r * 1.4).toFixed(0)} ${(r * 0.7).toFixed(0)}" />`
    }).join('')
  }

  if (kind === 1) {
    // Stacked rounded bars
    return Array.from({ length: 4 }, (_, i) => {
      const bw = unit * (2.4 - i * 0.4)
      return `<rect x="${(cx - bw / 2).toFixed(1)}" y="${(cy - unit * 2 + i * unit * 1.05).toFixed(1)}" width="${bw.toFixed(1)}" height="${(unit * 0.62).toFixed(1)}" rx="${(unit * 0.31).toFixed(1)}" fill="${i === 1 ? BRAND.gold : '#ffffff'}" opacity="${i === 1 ? 0.9 : 0.28 + i * 0.06}" />`
    }).join('')
  }

  if (kind === 2) {
    // Rotated square lattice
    return Array.from({ length: 3 }, (_, i) => {
      const s = unit * (3.2 - i * 0.85)
      return `<rect x="${(cx - s / 2).toFixed(1)}" y="${(cy - s / 2).toFixed(1)}" width="${s.toFixed(1)}" height="${s.toFixed(1)}" rx="${(s * 0.22).toFixed(1)}" fill="none" stroke="${i === 0 ? BRAND.goldLight : '#ffffff'}" stroke-opacity="${(0.55 - i * 0.13).toFixed(2)}" stroke-width="${(unit * 0.14).toFixed(1)}" transform="rotate(${15 + i * 12} ${cx} ${cy})" />`
    }).join('')
  }

  // Node graph
  const nodes = Array.from({ length: 6 }, (_, i) => {
    const angle = (i / 6) * Math.PI * 2 + rand(seed, i) * 0.6
    const radius = unit * (1.5 + rand(seed, i + 9) * 1.3)
    return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius }
  })
  const edges = nodes
    .map(
      (n, i) =>
        `<line x1="${cx}" y1="${cy}" x2="${n.x.toFixed(1)}" y2="${n.y.toFixed(1)}" stroke="#ffffff" stroke-opacity="0.3" stroke-width="${(unit * 0.07).toFixed(1)}" />` +
        `<line x1="${n.x.toFixed(1)}" y1="${n.y.toFixed(1)}" x2="${nodes[(i + 1) % nodes.length].x.toFixed(1)}" y2="${nodes[(i + 1) % nodes.length].y.toFixed(1)}" stroke="#ffffff" stroke-opacity="0.16" stroke-width="${(unit * 0.05).toFixed(1)}" />`,
    )
    .join('')
  const dots = nodes
    .map(
      (n, i) =>
        `<circle cx="${n.x.toFixed(1)}" cy="${n.y.toFixed(1)}" r="${(unit * (0.2 + rand(seed, i + 20) * 0.16)).toFixed(1)}" fill="${i % 3 === 0 ? BRAND.gold : '#ffffff'}" opacity="0.85" />`,
    )
    .join('')
  return `${edges}${dots}<circle cx="${cx}" cy="${cy}" r="${(unit * 0.42).toFixed(1)}" fill="${BRAND.goldLight}" />`
}

/* -------------------------------------------------------------- Templates */

function courseArt(slug, w = 1200, h = 750) {
  const seed = hash(slug)
  const palettes = [
    [BRAND.deep, BRAND.green, BRAND.mid],
    [BRAND.green, BRAND.mid, BRAND.deep],
    [BRAND.mid, BRAND.bright, BRAND.green],
    [BRAND.deep, BRAND.mid, BRAND.green],
  ]
  const palette = palettes[seed % palettes.length]

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    ${meshBackground(seed, w, h, palette)}
    ${gridOverlay(w, h, 60, 0.06)}
    ${abstractMotif(seed, w, h)}
    ${crescentStar(w * 0.13, h * 0.78, Math.min(w, h) / 300, BRAND.gold, 0.42)}
    <rect width="${w}" height="${h}" fill="url(#bg)" opacity="0.06" />
  </svg>`
}

function galleryArt(index, w = 1200, h = 900) {
  const seed = hash(`gallery-${index}`)
  const palettes = [
    [BRAND.green, BRAND.mid, BRAND.deep],
    [BRAND.cloud, '#d9e5dd', '#a9c6b6'],
    [BRAND.deep, BRAND.green, BRAND.bright],
    ['#e8eef0', '#cbd9d2', BRAND.mid],
  ]
  const palette = palettes[seed % palettes.length]
  const light = seed % palettes.length === 1 || seed % palettes.length === 3

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    ${meshBackground(seed, w, h, palette)}
    ${gridOverlay(w, h, 72, light ? 0.16 : 0.05)}
    ${abstractMotif(seed + 7, w, h)}
    ${crescentStar(w * 0.16, h * 0.82, Math.min(w, h) / 340, light ? BRAND.goldDeep : BRAND.gold, 0.35)}
  </svg>`
}

function blogArt(slug, w = 1200, h = 630) {
  const seed = hash(`blog-${slug}`)
  const palette = [BRAND.deep, BRAND.green, BRAND.mid]

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    ${meshBackground(seed, w, h, palette)}
    ${gridOverlay(w, h, 54, 0.07)}
    ${abstractMotif(seed, w, h)}
    <g opacity="0.5">${crescentStar(w * 0.12, h * 0.5, Math.min(w, h) / 260, BRAND.gold)}</g>
  </svg>`
}

/** Avatar: soft gradient disc with an abstract bust silhouette. */
function avatarArt(key, size = 400) {
  const seed = hash(`avatar-${key}`)
  const hues = [
    [BRAND.mid, BRAND.green],
    [BRAND.bright, BRAND.mid],
    [BRAND.green, BRAND.deep],
    [BRAND.goldDeep, BRAND.green],
    [BRAND.mid, BRAND.deep],
  ]
  const [a, b] = hues[seed % hues.length]
  const cx = size / 2

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <defs>
      <linearGradient id="av" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${a}" />
        <stop offset="100%" stop-color="${b}" />
      </linearGradient>
    </defs>
    <rect width="${size}" height="${size}" fill="url(#av)" />
    <circle cx="${cx}" cy="${size * 0.38}" r="${size * 0.155}" fill="#ffffff" opacity="0.9" />
    <path d="M ${size * 0.2} ${size} a ${size * 0.3} ${size * 0.3} 0 0 1 ${size * 0.6} 0 Z" fill="#ffffff" opacity="0.9" />
    <circle cx="${size * 0.82}" cy="${size * 0.18}" r="${size * 0.06}" fill="${BRAND.gold}" opacity="0.75" />
  </svg>`
}

function logoArt(size = 512) {
  const r = size * 0.27
  const pad = size * 0.5
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <defs>
      <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${BRAND.mid}" />
        <stop offset="55%" stop-color="${BRAND.green}" />
        <stop offset="100%" stop-color="${BRAND.deep}" />
      </linearGradient>
      <linearGradient id="lgold" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${BRAND.goldLight}" />
        <stop offset="50%" stop-color="${BRAND.gold}" />
        <stop offset="100%" stop-color="${BRAND.goldDeep}" />
      </linearGradient>
    </defs>
    <rect width="${size}" height="${size}" rx="${size * 0.22}" fill="url(#lg)" />
    <g stroke="#ffffff" stroke-opacity="0.18" stroke-width="${size * 0.012}" fill="none">
      <circle cx="${pad}" cy="${pad}" r="${r * 1.2}" />
      <ellipse cx="${pad}" cy="${pad}" rx="${r * 0.54}" ry="${r * 1.2}" />
      <line x1="${pad - r * 1.2}" y1="${pad - r * 0.42}" x2="${pad + r * 1.2}" y2="${pad - r * 0.42}" />
      <line x1="${pad - r * 1.2}" y1="${pad + r * 0.42}" x2="${pad + r * 1.2}" y2="${pad + r * 0.42}" />
    </g>
    ${crescentStar(size * 0.54, size * 0.5, size / 105, 'url(#lgold)')}
  </svg>`
}

/* ------------------------------------------------------------------ Runner */

const COURSE_SLUGS = [
  'full-stack-development-with-ai',
  'digital-media-marketing-with-ai',
  'social-media-marketing-with-ai',
  'tiktok-shop',
  'facebook-automation-and-monetization',
  'graphic-designing',
  'video-editing',
]

const BLOG_SLUGS = [
  '14-august-azadi-sale-50-percent-off-professional-courses',
  'why-learning-ai-in-pakistan-is-essential-in-2026',
  'top-digital-skills-that-can-change-your-future',
  'best-ai-courses-in-faisalabad',
  'digital-marketing-career-guide',
  'freelancing-roadmap-for-beginners',
  'graphic-designing-career-opportunities',
  'web-development-trends-in-pakistan',
  'celebrate-independence-by-investing-in-yourself',
  'limited-time-50-percent-off-azadi-offer',
]

const AUTHOR_SLUGS = [
  'usman-rafiq',
  'ayesha-siddiqui',
  'hassan-mehmood',
  'zainab-khan',
  'bilal-ahmed',
]

async function ensureDir(dir) {
  await mkdir(dir, { recursive: true })
}

async function exists(file) {
  try {
    await access(file)
    return true
  } catch {
    return false
  }
}

async function render(svg, outPath, { width, height, quality = 82 }) {
  if (process.env.FORCE_ASSETS !== '1' && (await exists(outPath))) return false

  const buffer = await sharp(Buffer.from(svg))
    .resize(width, height, { fit: 'cover' })
    .webp({ quality, effort: 5 })
    .toBuffer()

  await writeFile(outPath, buffer)
  return true
}

/**
 * Wrap a PNG buffer in an ICO container.
 *
 * Browsers request /favicon.ico implicitly even when a <link> tag points
 * elsewhere, so shipping a real one avoids a 404 on every cold visit.
 * PNG-in-ICO is valid and understood by every browser still in use.
 */
function pngToIco(png, size) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0) // reserved
  header.writeUInt16LE(1, 2) // type: icon
  header.writeUInt16LE(1, 4) // image count

  const entry = Buffer.alloc(16)
  entry.writeUInt8(size >= 256 ? 0 : size, 0) // width  (0 == 256)
  entry.writeUInt8(size >= 256 ? 0 : size, 1) // height
  entry.writeUInt8(0, 2) // palette colours
  entry.writeUInt8(0, 3) // reserved
  entry.writeUInt16LE(1, 4) // colour planes
  entry.writeUInt16LE(32, 6) // bits per pixel
  entry.writeUInt32LE(png.length, 8) // payload size
  entry.writeUInt32LE(header.length + entry.length, 12) // payload offset

  return Buffer.concat([header, entry, png])
}

async function writeFavicon() {
  const target = path.join(ROOT, 'public', 'favicon.ico')
  if (process.env.FORCE_ASSETS !== '1' && (await exists(target))) return false

  const png = await sharp(Buffer.from(logoArt(256)))
    .resize(48, 48, { fit: 'cover' })
    .png({ compressionLevel: 9 })
    .toBuffer()

  await writeFile(target, pngToIco(png, 48))
  return true
}

async function main() {
  const dirs = ['brand', 'courses', 'gallery', 'blog', 'authors', 'students'].map((d) =>
    path.join(OUT, d),
  )
  await Promise.all(dirs.map(ensureDir))

  let written = 0

  if (await writeFavicon()) written += 1

  // Brand logo (also used by Organization JSON-LD)
  if (await render(logoArt(512), path.join(OUT, 'brand', 'logo.webp'), { width: 512, height: 512, quality: 92 })) {
    written += 1
  }

  // Courses
  for (const slug of COURSE_SLUGS) {
    if (
      await render(courseArt(slug), path.join(OUT, 'courses', `${slug}.webp`), {
        width: 1200,
        height: 750,
      })
    ) {
      written += 1
    }
  }

  // Blog covers
  for (const slug of BLOG_SLUGS) {
    if (
      await render(blogArt(slug), path.join(OUT, 'blog', `${slug}.webp`), {
        width: 1200,
        height: 630,
      })
    ) {
      written += 1
    }
  }

  // Gallery
  for (let i = 1; i <= 12; i += 1) {
    const name = `gallery-${String(i).padStart(2, '0')}.webp`
    if (await render(galleryArt(i), path.join(OUT, 'gallery', name), { width: 1200, height: 900 })) {
      written += 1
    }
  }

  // Instructor / author avatars
  for (const slug of AUTHOR_SLUGS) {
    if (
      await render(avatarArt(slug), path.join(OUT, 'authors', `${slug}.webp`), {
        width: 400,
        height: 400,
        quality: 88,
      })
    ) {
      written += 1
    }
  }

  // Student avatars
  for (let i = 1; i <= 12; i += 1) {
    const name = `student-${String(i).padStart(2, '0')}.webp`
    if (
      await render(avatarArt(name), path.join(OUT, 'students', name), {
        width: 240,
        height: 240,
        quality: 86,
      })
    ) {
      written += 1
    }
  }

  console.log(
    written === 0
      ? '✓ Placeholder assets already present (set FORCE_ASSETS=1 to regenerate).'
      : `✓ Generated ${written} WebP asset${written === 1 ? '' : 's'} in public/images/generated`,
  )
}

main().catch((error) => {
  console.error('✗ Asset generation failed:', error)
  process.exit(1)
})
