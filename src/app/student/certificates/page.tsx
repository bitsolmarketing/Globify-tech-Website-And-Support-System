import type { Metadata } from 'next'
import { Award, ShieldCheck } from 'lucide-react'

import { AdminPageHeader as PageHeader } from '@/components/admin/page-header'
import { PortalEmpty, formatDateTime } from '@/components/portal/ui'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { listStudentCertificates } from '@/lib/data/student'
import {
  MIN_ATTENDANCE_FOR_CERTIFICATE,
  MIN_SCORE_FOR_CERTIFICATE,
} from '@/lib/portal/grading'
import { requireStudentAccount } from '@/lib/portal/session'
import { absoluteUrl } from '@/lib/utils'

export const metadata: Metadata = { title: 'Certificates' }

export default async function StudentCertificatesPage() {
  const { id } = await requireStudentAccount()
  const certificates = await listStudentCertificates(id)

  return (
    <>
      <PageHeader
        title="Certificates"
        description="Certificates issued for courses you have completed."
      />

      {certificates.length === 0 ? (
        <PortalEmpty
          title="No certificates yet"
          description={`A certificate is issued once you finish the curriculum, reach ${MIN_SCORE_FOR_CERTIFICATE}% overall and ${MIN_ATTENDANCE_FOR_CERTIFICATE}% attendance, and all your work has been marked.`}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {certificates.map((certificate) => {
            const revoked = certificate.revokedAt !== null

            return (
              <Card
                key={certificate.id}
                className={
                  revoked ? 'p-6 opacity-70' : 'border-gold-300 bg-linear-to-br from-gold-50/60 to-white p-6'
                }
              >
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={
                      revoked
                        ? 'grid size-11 shrink-0 place-items-center rounded-2xl bg-ink-100 text-ink-500'
                        : 'grid size-11 shrink-0 place-items-center rounded-2xl bg-linear-to-br from-gold-400 to-gold-600 text-brand-950'
                    }
                  >
                    <Award aria-hidden className="size-5" />
                  </span>

                  {revoked ? (
                    <Badge variant="outline" size="sm">
                      Withdrawn
                    </Badge>
                  ) : (
                    <Badge variant="gold" size="sm">
                      {certificate.grade}
                    </Badge>
                  )}
                </div>

                <h2 className="mt-4 font-sans text-lg font-bold tracking-tight text-ink-900">
                  {certificate.courseTitle}
                </h2>
                <p className="mt-1 font-sans text-[0.875rem] text-ink-600">
                  Awarded to {certificate.studentName}
                  {certificate.batchName ? ` · ${certificate.batchName}` : ''}
                </p>

                <dl className="mt-5 grid gap-3 border-t border-hairline pt-4 sm:grid-cols-2">
                  <div>
                    <dt className="font-sans text-[0.6875rem] font-bold tracking-[0.1em] text-ink-400 uppercase">
                      Final score
                    </dt>
                    <dd className="mt-0.5 font-sans text-sm font-bold text-ink-900">
                      {certificate.finalScore === null ? '—' : `${certificate.finalScore}%`}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-sans text-[0.6875rem] font-bold tracking-[0.1em] text-ink-400 uppercase">
                      Issued
                    </dt>
                    <dd className="mt-0.5 font-sans text-sm text-ink-900">
                      {formatDateTime(certificate.issuedAt)}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="font-sans text-[0.6875rem] font-bold tracking-[0.1em] text-ink-400 uppercase">
                      Serial
                    </dt>
                    <dd className="mt-0.5 font-mono text-sm font-semibold tracking-wide text-ink-900">
                      {certificate.serial}
                    </dd>
                  </div>
                </dl>

                {revoked ? (
                  <p className="mt-4 font-sans text-[0.8125rem] text-ink-500">
                    This certificate was withdrawn on {formatDateTime(certificate.revokedAt!)}.
                    Speak to the office if you think that is a mistake.
                  </p>
                ) : (
                  <p className="mt-4 inline-flex items-start gap-1.5 font-sans text-[0.8125rem] text-ink-500">
                    <ShieldCheck aria-hidden className="mt-px size-3.5 shrink-0" />
                    <span>
                      Anyone can confirm this at{' '}
                      <span className="font-semibold text-ink-700">
                        {absoluteUrl(`/verify/${certificate.serial}`)}
                      </span>
                      .
                    </span>
                  </p>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </>
  )
}
