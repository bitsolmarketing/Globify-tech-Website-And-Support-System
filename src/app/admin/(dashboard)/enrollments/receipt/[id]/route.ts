import { readFile } from 'node:fs/promises'

import { auth } from '@/auth'
import { getPaymentById } from '@/lib/data/enrollments'
import { resolveReceiptPath } from '@/lib/receipts'

/**
 * Serves a payment receipt to a signed-in administrator.
 *
 * Receipts are stored outside `public/` precisely so that they cannot be
 * fetched without passing through here — see `@/lib/receipts`. The middleware
 * already gates `/admin/*`, but this re-checks: a route handler is its own
 * endpoint, and inheriting authorisation from a matcher config is exactly the
 * assumption that stops holding the first time that config is edited.
 *
 * Only the payment id appears in the URL. The filename on disk is never
 * exposed, so there is nothing to guess and nothing to replay.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== 'admin') {
    return new Response('Not authorised', { status: 401 })
  }

  const { id } = await params
  const payment = await getPaymentById(id)

  if (!payment?.proofPath) {
    return new Response('Not found', { status: 404 })
  }

  const filePath = resolveReceiptPath(payment.proofPath)
  if (!filePath) {
    console.error(`[receipts] payment ${id} has an unusable proof_path`)
    return new Response('Not found', { status: 404 })
  }

  try {
    const file = await readFile(filePath)

    return new Response(new Uint8Array(file), {
      headers: {
        'Content-Type': 'image/webp',
        /* `private` keeps it out of any shared proxy cache, and `no-store`
           keeps it off disk in the admin's browser — a receipt should not
           outlive the tab it was reviewed in. */
        'Cache-Control': 'private, no-store, max-age=0',
        'Content-Disposition': `inline; filename="receipt-${payment.reference}.webp"`,
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    /* A row pointing at a file that is gone is worth a log line: it usually
       means RECEIPTS_DIR was not carried across a deploy. */
    console.error(`[receipts] could not read the receipt for payment ${id}`, error)
    return new Response('Not found', { status: 404 })
  }
}
