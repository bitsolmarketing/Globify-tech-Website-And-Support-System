import type { Metadata } from 'next'
import Link from 'next/link'
import { Award, ShieldCheck, ShieldX } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { verifyCertificate } from '@/lib/data/student'
import { formatDate } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Verify a certificate',
  description: 'Confirm that a Globify Tech Institute certificate is genuine.',
  /* A verification result is about one named person. Useful to whoever holds
     the serial, and not something to leave in a search index. */
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

/**
 * Public certificate verification.
 *
 * The only portal read reachable without signing in, and deliberately narrow:
 * it takes a serial and answers with the name, the course, the date and
 * nothing else. No email address, no marks breakdown, no other certificates
 * held by the same person — an employer checking a credential is entitled to
 * confirm the credential, not to browse the record behind it.
 */
export default async function VerifyCertificatePage({
  params,
}: {
  params: Promise<{ serial: string }>
}) {
  const { serial } = await params
  const certificate = await verifyCertificate(decodeURIComponent(serial))

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:py-24">
      {certificate ? (
        <Card className="border-gold-300 bg-linear-to-br from-gold-50/60 to-white p-7 sm:p-10">
          <div className="flex items-center gap-4">
            <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-linear-to-br from-gold-400 to-gold-600 text-brand-950">
              <Award aria-hidden className="size-7" />
            </span>
            <div>
              <p className="inline-flex items-center gap-1.5 font-sans text-sm font-bold text-emerald-700">
                <ShieldCheck aria-hidden className="size-4" />
                Genuine certificate
              </p>
              <p className="font-sans text-xs text-ink-500">
                Issued by Globify Tech Institute
              </p>
            </div>
          </div>

          <h1 className="mt-7 font-sans text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
            {certificate.studentName}
          </h1>
          <p className="mt-1.5 text-[1.0625rem] text-ink-600">
            completed <span className="font-semibold text-ink-900">{certificate.courseTitle}</span>
          </p>

          <dl className="mt-8 grid gap-5 border-t border-gold-200 pt-6 sm:grid-cols-3">
            <div>
              <dt className="font-sans text-[0.6875rem] font-bold tracking-[0.1em] text-ink-400 uppercase">
                Issued
              </dt>
              <dd className="mt-1 font-sans text-sm font-semibold text-ink-900">
                {formatDate(certificate.issuedAt)}
              </dd>
            </div>
            <div>
              <dt className="font-sans text-[0.6875rem] font-bold tracking-[0.1em] text-ink-400 uppercase">
                Grade
              </dt>
              <dd className="mt-1 font-sans text-sm font-semibold text-ink-900">
                {certificate.grade ?? '—'}
                {certificate.finalScore !== null && ` · ${certificate.finalScore}%`}
              </dd>
            </div>
            <div>
              <dt className="font-sans text-[0.6875rem] font-bold tracking-[0.1em] text-ink-400 uppercase">
                Serial
              </dt>
              <dd className="mt-1 font-mono text-sm font-semibold text-ink-900">
                {certificate.serial}
              </dd>
            </div>
          </dl>
        </Card>
      ) : (
        <Card className="p-7 text-center sm:p-10">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-ink-100 text-ink-500">
            <ShieldX aria-hidden className="size-7" />
          </span>

          <h1 className="mt-6 font-sans text-xl font-extrabold tracking-tight text-ink-900">
            We cannot verify that serial
          </h1>
          <p className="mx-auto mt-2 max-w-md text-[0.9375rem] leading-relaxed text-ink-500">
            No current certificate matches{' '}
            <span className="font-mono font-semibold text-ink-700">
              {decodeURIComponent(serial)}
            </span>
            . Check the serial for typos — the letters O and I are never used, so a zero and a one
            are the likely culprits. A certificate that has been withdrawn will also show here.
          </p>

          <Button asChild variant="secondary" size="md" className="mt-6">
            <Link href="/contact">Contact the institute</Link>
          </Button>
        </Card>
      )}
    </div>
  )
}
