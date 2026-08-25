#!/usr/bin/env node
/**
 * Points public/images/uploads at a directory outside the versioned build
 * tree, when one is configured.
 *
 * This host builds every deploy into a fresh directory
 * (hbuilds/versions/<uuid>/) and eventually prunes old ones. Anything
 * `saveUploadedImage()` writes under public/images/uploads/ during one
 * version's runtime lives only inside that version's own checkout — the
 * moment the next deploy swaps `current` to a new one, which starts with an
 * empty, gitignored public/images/uploads, the file is orphaned and
 * eventually deleted along with the old version directory.
 *
 * Symlinking public/images/uploads to a directory outside hbuilds/versions/
 * makes every version, past and future, read and write the same files.
 *
 * A no-op without UPLOADS_DIR set — local dev, or any host that hasn't
 * configured it, keeps public/images/uploads as a plain directory.
 */
import { lstatSync, mkdirSync, readlinkSync, rmSync, symlinkSync } from 'node:fs'
import path from 'node:path'

const target = process.env.UPLOADS_DIR?.trim()
if (!target) process.exit(0)

const linkPath = path.join(process.cwd(), 'public', 'images', 'uploads')

mkdirSync(target, { recursive: true })
mkdirSync(path.dirname(linkPath), { recursive: true })

const existing = lstatSync(linkPath, { throwIfNoEntry: false })
if (existing?.isSymbolicLink() && readlinkSync(linkPath) === target) {
  process.exit(0)
}
if (existing) rmSync(linkPath, { recursive: true, force: true })

symlinkSync(target, linkPath)
console.log(`[uploads] public/images/uploads -> ${target}`)
