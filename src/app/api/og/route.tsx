import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { ImageResponse } from 'next/og'

import { campaign, siteConfig } from '@/lib/site'

const logoMarkDataUrl = readFile(
  path.join(process.cwd(), 'public/images/brand/logo-mark.png'),
).then((buf) => `data:image/png;base64,${buf.toString('base64')}`)

/* The OG image is generated per-request at the edge and cannot await the
   database, so the badge falls back to the seeded campaign literal when a
   caller does not pass one explicitly. */

export const runtime = 'nodejs'

const SIZE = { width: 1200, height: 630 }

/**
 * Automatic Open Graph images.
 *
 * /api/og                                     -> brand default
 * /api/og?title=...&eyebrow=...&badge=...     -> per-page card
 *
 * Rendered on demand and cached at the edge for a year, so social crawlers
 * always get a 1200×630 card without us hand-designing one per page.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)

  const title = (searchParams.get('title') ?? siteConfig.tagline).slice(0, 110)
  const eyebrow = (searchParams.get('eyebrow') ?? siteConfig.name).slice(0, 60)
  const badge = (searchParams.get('badge') ?? `${campaign.discountPercent}% OFF · ${campaign.name}`).slice(0, 40)
  const meta = (searchParams.get('meta') ?? 'Faisalabad, Pakistan').slice(0, 70)

  // Keep long headlines legible by stepping the size down.
  const titleSize = title.length > 78 ? 54 : title.length > 48 ? 64 : 76

  const logoSrc = await logoMarkDataUrl

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px 72px',
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 48%, #4338ca 100%)',
          position: 'relative',
        }}
      >
        {/* Glow accents */}
        <div
          style={{
            position: 'absolute',
            top: -160,
            right: -120,
            width: 520,
            height: 520,
            borderRadius: 9999,
            background: 'rgba(168,85,247,0.18)',
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -200,
            left: -140,
            width: 520,
            height: 520,
            borderRadius: 9999,
            background: 'rgba(99,102,241,0.20)',
            display: 'flex',
          }}
        />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 18,
                background: 'rgba(255,255,255,0.10)',
                border: '1px solid rgba(255,255,255,0.18)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoSrc} width={42} height={42} alt="" />

            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 30, fontWeight: 800, color: '#ffffff', letterSpacing: -0.5 }}>
                Globify Tech
              </span>
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: 'rgba(255,255,255,0.55)',
                  letterSpacing: 2.4,
                  textTransform: 'uppercase',
                }}
              >
                Institute
              </span>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '12px 24px',
              borderRadius: 9999,
              background: 'linear-gradient(135deg, #e9d5ff, #a855f7)',
              color: '#1e1b4b',
              fontSize: 22,
              fontWeight: 800,
            }}
          >
            {badge}
          </div>
        </div>

        {/* Headline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1000 }}>
          <span
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: '#c084fc',
              letterSpacing: 3,
              textTransform: 'uppercase',
            }}
          >
            {eyebrow}
          </span>
          <span
            style={{
              fontSize: titleSize,
              fontWeight: 800,
              color: '#ffffff',
              lineHeight: 1.12,
              letterSpacing: -1.6,
            }}
          >
            {title}
          </span>
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid rgba(255,255,255,0.14)',
            paddingTop: 28,
          }}
        >
          <span style={{ fontSize: 24, color: 'rgba(255,255,255,0.62)', fontWeight: 500 }}>
            {meta}
          </span>
          <span style={{ fontSize: 24, color: '#ffffff', fontWeight: 700 }}>globifytech.com</span>
        </div>
      </div>
    ),
    {
      ...SIZE,
      headers: {
        'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable',
      },
    },
  )
}
