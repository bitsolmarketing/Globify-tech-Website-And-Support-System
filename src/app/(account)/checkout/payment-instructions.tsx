import { Building2, Info, Smartphone } from 'lucide-react'

import { Card } from '@/components/ui/card'
import { askForAccountDetailsHref, paymentAccounts } from '@/lib/payments'
import { formatPKR } from '@/lib/utils'

/**
 * Where to send the money.
 *
 * Renders whatever accounts are configured in the environment and degrades to
 * "ask us on WhatsApp" when none are — see the note at the top of
 * `@/lib/payments` for why no account details are hardcoded anywhere in this
 * repo. The fallback is a working path, not an error state: the institute has
 * always taken fees this way, and the receipt upload below is unaffected.
 */
export function PaymentInstructions({ amount, what }: { amount: number; what: string }) {
  return (
    <Card className="p-6 sm:p-7">
      <h2 className="font-sans text-lg font-extrabold tracking-tight text-ink-900">
        1. Send {formatPKR(amount)}
      </h2>

      {paymentAccounts.length > 0 ? (
        <>
          <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-600">
            Transfer the fee to any one of these, then upload the receipt below.
          </p>

          <ul className="mt-5 grid gap-3">
            {paymentAccounts.map((account) => (
              <li
                key={account.method}
                className="rounded-xl bg-ink-50/70 p-4 ring-1 ring-hairline ring-inset"
              >
                <div className="flex items-center gap-2">
                  {account.method === 'bank_transfer' ? (
                    <Building2 aria-hidden className="size-4 text-brand-700" />
                  ) : (
                    <Smartphone aria-hidden className="size-4 text-brand-700" />
                  )}
                  <p className="font-sans text-sm font-bold text-ink-900">
                    {account.provider || account.label}
                  </p>
                </div>

                <dl className="mt-3 grid gap-1.5 text-[0.875rem]">
                  <div className="flex flex-wrap gap-x-2">
                    <dt className="text-ink-500">Account title</dt>
                    <dd className="font-semibold text-ink-900">{account.accountTitle}</dd>
                  </div>
                  <div className="flex flex-wrap gap-x-2">
                    <dt className="text-ink-500">
                      {account.method === 'bank_transfer' ? 'IBAN' : 'Number'}
                    </dt>
                    {/* Selectable and monospaced — this gets copied by hand into
                        a banking app, where one wrong character loses the money. */}
                    <dd className="font-mono font-semibold tracking-tight text-ink-900 select-all">
                      {account.accountNumber}
                    </dd>
                  </div>
                  {account.branchCode && (
                    <div className="flex flex-wrap gap-x-2">
                      <dt className="text-ink-500">Branch code</dt>
                      <dd className="font-mono font-semibold text-ink-900">{account.branchCode}</dd>
                    </div>
                  )}
                </dl>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div className="mt-4 flex items-start gap-3 rounded-xl bg-gold-50 p-4 ring-1 ring-gold-200 ring-inset">
          <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-gold-700" />
          <div className="text-[0.875rem] leading-relaxed text-gold-900">
            <p className="font-semibold">Ask us for the account details</p>
            <p className="mt-1">
              Message admissions on WhatsApp and we will send you the bank, JazzCash or Easypaisa
              details straight away. You can pay at the campus instead if that is easier.
            </p>
            <a
              href={askForAccountDetailsHref(what)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block font-semibold underline underline-offset-4"
            >
              Ask on WhatsApp
            </a>
          </div>
        </div>
      )}

      <p className="mt-5 text-[0.8125rem] leading-relaxed text-ink-500">
        Paid at the campus counter? Choose &ldquo;Cash at the campus&rdquo; below — you do not need a
        screenshot.
      </p>
    </Card>
  )
}
