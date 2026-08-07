import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #05603a 0%, #01411c 55%, #012a12 100%)',
        }}
      >
        <svg width="132" height="132" viewBox="0 0 48 48">
          <g stroke="#ffffff" strokeOpacity="0.2" strokeWidth="1.2" fill="none">
            <circle cx="24" cy="24" r="15.5" />
            <ellipse cx="24" cy="24" rx="7" ry="15.5" />
            <path d="M9 19h30M9 29h30" />
          </g>
          <path d="M31.2 15.4a10.2 10.2 0 1 0 0 17.2 12.1 12.1 0 1 1 0-17.2Z" fill="#d4af37" />
          <path
            d="m33.9 20.1 1.34 2.9 3.16.38-2.34 2.16.63 3.12-2.79-1.56-2.79 1.56.63-3.12-2.34-2.16 3.16-.38z"
            fill="#d4af37"
          />
        </svg>
      </div>
    ),
    { ...size },
  )
}
