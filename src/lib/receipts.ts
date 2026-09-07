import 'server-only'

import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import sharp from 'sharp'

/**
 * Payment receipts, stored outside the web root.
 *
 * Every other upload in this app is content the institute wants the world to
 * see, so `saveUploadedImage` writes into `public/images/uploads` and the file
 * is served straight off disk. A receipt is the opposite: it is a screenshot of
 * somebody's banking app, carrying their name, their account number and a
 * transaction id. Anything under `public/` is readable by anyone who has the
 * URL, with no session and no log — and a UUID filename is not access control,
 * it is a password that gets pasted into WhatsApp threads and support emails.
 *
 * So receipts live in their own directory, never served statically, and reach
 * the admin through `/admin/enrollments/receipt/<paymentId>`, which checks for
 * an admin session on every request.
 *
 * `RECEIPTS_DIR` should be set to a path outside the deploy checkout, for the
 * same reason `UPLOADS_DIR` is — this host builds each deploy into a fresh
 * directory, so anything written inside the checkout is orphaned by the next
 * one. Without it, receipts land in `.private/receipts` at the project root,
 * which is correct for local development and lossy on the server.
 */
export function receiptsDir(): string {
  const configured = process.env.RECEIPTS_DIR?.trim()
  return configured || path.join(process.cwd(), '.private', 'receipts')
}

export type ReceiptSaveResult = { ok: true; filename: string } | { ok: false; error: string }

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'])

/**
 * Re-encodes an uploaded receipt to WebP and stores it privately.
 *
 * Returns the bare filename, never a path. What goes in `payments.proof_path`
 * is therefore incapable of pointing anywhere — no directory component survives
 * to be replayed at read time, which is half of why the serving route can
 * safely take an id from the URL.
 *
 * Re-encoding through sharp is also a sanitiser: whatever the browser labelled
 * the file, what reaches disk is a real raster image with no EXIF, no embedded
 * payload and no original container. A file that is not an image fails here.
 */
export async function saveReceiptImage(file: File): Promise<ReceiptSaveResult> {
  if (!ALLOWED_TYPES.has(file.type)) {
    return { ok: false, error: 'Attach a JPEG, PNG, WebP, AVIF or GIF image.' }
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: 'That image is too large — the limit is 8MB.' }
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    const webp = await sharp(buffer)
      .rotate()
      .resize(1400, 1400, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer()

    const dir = receiptsDir()
    await mkdir(dir, { recursive: true })

    const filename = `${randomUUID()}.webp`
    await writeFile(path.join(dir, filename), webp)

    return { ok: true, filename }
  } catch (error) {
    console.error('[receipts] upload failed', error)
    return { ok: false, error: 'Could not process that image. Try a different file.' }
  }
}

/**
 * Resolves a stored `proof_path` to a file on disk.
 *
 * `path.basename` is the whole defence and it is deliberate: whatever is in the
 * column, only its last segment is used, so a value that somehow became
 * `../../.env` resolves to `.env` inside the receipts directory and simply does
 * not exist. The check afterwards refuses anything that is not the uuid-webp
 * shape this module writes.
 */
export function resolveReceiptPath(storedName: string): string | null {
  const filename = path.basename(storedName)
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/.test(filename)) {
    return null
  }

  return path.join(receiptsDir(), filename)
}
