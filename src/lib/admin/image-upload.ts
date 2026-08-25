import 'server-only'

import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import sharp from 'sharp'

export type UploadResult = { ok: true; path: string } | { ok: false; error: string }

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'])

/**
 * Re-encodes an admin-picked file to WebP and writes it under
 * `public/images/uploads/<subfolder>`, gitignored so the file lives only on
 * the server's disk — same treatment as the placeholder art in
 * `scripts/generate-images.mjs` and `courses/actions.ts`'s `uploadCourseImage`.
 *
 * `subfolder` must always be a literal at the call site, never a value from
 * the client — it goes straight into a filesystem path.
 */
export async function saveUploadedImage(
  file: File,
  subfolder: string,
  maxSize: { width: number; height: number } = { width: 1600, height: 1600 },
): Promise<UploadResult> {
  if (!ALLOWED_TYPES.has(file.type)) {
    return { ok: false, error: 'Choose a JPEG, PNG, WebP, AVIF or GIF image.' }
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: 'That image is too large — the limit is 8MB.' }
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    const webp = await sharp(buffer)
      .rotate()
      .resize(maxSize.width, maxSize.height, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer()

    const dir = path.join(process.cwd(), 'public', 'images', 'uploads', subfolder)
    await mkdir(dir, { recursive: true })

    const filename = `${randomUUID()}.webp`
    await writeFile(path.join(dir, filename), webp)

    return { ok: true, path: `/images/uploads/${subfolder}/${filename}` }
  } catch (error) {
    console.error(`[admin] image upload failed (${subfolder})`, error)
    const message =
      error instanceof Error ? error.message : 'Could not process that image. Try a different file.'
    return { ok: false, error: message }
  }
}
