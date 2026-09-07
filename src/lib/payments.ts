/**
 * Where a student is told to send the fee.
 *
 * These are real financial details, and this repo does not know them. Inventing
 * a plausible IBAN would be worse than having none: it renders as instruction,
 * a student would act on it, and the money would go somewhere or nowhere with
 * the site's name on it. So every account below is read from the environment
 * and simply does not render until it is set — see `.env.example`.
 *
 * With nothing configured, checkout still works end to end. The instructions
 * panel falls back to "ask admissions for the account details" with the real
 * WhatsApp number from `@/lib/site`, the student uploads their receipt exactly
 * as before, and an admin still approves it. That degradation is deliberate:
 * the platform must not be blocked on a value only the institute can supply.
 *
 * Safe to import from client components — nothing here is a secret. These are
 * details printed on an invoice, not credentials, so they are read from plain
 * `NEXT_PUBLIC_*` vars and are visible in the browser bundle by design.
 */
import { contactInfo } from './site'

export type PaymentAccount = {
  method: 'bank_transfer' | 'jazzcash' | 'easypaisa'
  label: string
  /** Bank name, or the wallet's own brand. */
  provider: string
  /** Account title — who the transfer is made out to. */
  accountTitle: string
  /** IBAN for a bank, mobile number for a wallet. */
  accountNumber: string
  /** Only banks have one worth printing. */
  branchCode?: string
}

function read(name: string): string {
  return (process.env[name] ?? '').trim()
}

/**
 * Built at module scope from `NEXT_PUBLIC_*` vars, which Next inlines at build
 * time. An account appears only when both its title and number are set — a
 * half-configured account is treated as unconfigured, because a transfer made
 * against a missing account title is a transfer nobody can reconcile.
 */
export const paymentAccounts: PaymentAccount[] = (
  [
    {
      method: 'bank_transfer',
      label: 'Bank transfer',
      provider: read('NEXT_PUBLIC_PAY_BANK_NAME'),
      accountTitle: read('NEXT_PUBLIC_PAY_BANK_TITLE'),
      accountNumber: read('NEXT_PUBLIC_PAY_BANK_IBAN'),
      branchCode: read('NEXT_PUBLIC_PAY_BANK_BRANCH') || undefined,
    },
    {
      method: 'jazzcash',
      label: 'JazzCash',
      provider: 'JazzCash',
      accountTitle: read('NEXT_PUBLIC_PAY_JAZZCASH_TITLE'),
      accountNumber: read('NEXT_PUBLIC_PAY_JAZZCASH_NUMBER'),
    },
    {
      method: 'easypaisa',
      label: 'Easypaisa',
      provider: 'Easypaisa',
      accountTitle: read('NEXT_PUBLIC_PAY_EASYPAISA_TITLE'),
      accountNumber: read('NEXT_PUBLIC_PAY_EASYPAISA_NUMBER'),
    },
  ] satisfies PaymentAccount[]
).filter((account) => account.accountTitle !== '' && account.accountNumber !== '')

export const hasConfiguredAccounts = paymentAccounts.length > 0

/** Pre-filled WhatsApp link used when no account details are configured. */
export function askForAccountDetailsHref(what: string): string {
  const text = `Assalam o Alaikum! I want to pay for ${what} at Globify Tech Institute. Please send me the account details.`
  return `https://wa.me/${contactInfo.whatsapp}?text=${encodeURIComponent(text)}`
}

/** Human label for a stored `payments.method` value. */
export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  bank_transfer: 'Bank transfer',
  jazzcash: 'JazzCash',
  easypaisa: 'Easypaisa',
  cash: 'Cash at the campus',
}
