import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ImageResponse } from 'next/og'
import { personalInfo } from '@/data/cv-data'
import { SHARE_IMAGE, SITE_URL } from '@/lib/site'

export const dynamic = 'force-static'

// Satori can't read CSS variables: these mirror the light palette in globals.css.
const INK = '#141413'
const MUTED = '#73726c'
const CLAY = '#c6613f'

const font = (file: string) => readFile(join(process.cwd(), 'assets/fonts', file))

export async function GET() {
  const [archivo, dmSans, geistMono] = await Promise.all([
    font('Archivo-Black.ttf'),
    font('DMSans-Medium.ttf'),
    font('GeistMono-Regular.ttf'),
  ])

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '72px 88px',
        backgroundColor: '#faf9f5',
        backgroundImage:
          'radial-gradient(ellipse 70% 60% at 100% 0%, rgba(198, 97, 63, 0.16), transparent 70%)',
        color: INK,
        fontFamily: 'DM Sans',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          fontFamily: 'Geist Mono',
          fontSize: 24,
          letterSpacing: 3,
          color: MUTED,
        }}
      >
        <div style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: '#788c5d' }} />
        {personalInfo.location.toUpperCase()} ·
        <span style={{ color: CLAY }}>{personalInfo.availability.toUpperCase()}</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontFamily: 'Archivo', fontSize: 132, letterSpacing: -5, lineHeight: 1 }}>
          {personalInfo.name}
        </div>
        <div style={{ marginTop: 28, fontSize: 44 }}>{personalInfo.title}</div>
        <div style={{ marginTop: 18, fontFamily: 'Geist Mono', fontSize: 26, color: MUTED }}>
          {personalInfo.tagline}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 18,
          fontFamily: 'Geist Mono',
          fontSize: 24,
          color: MUTED,
        }}
      >
        <div style={{ width: 56, height: 4, backgroundColor: CLAY }} />
        {SITE_URL.replace('https://', '')}
      </div>
    </div>,
    {
      width: SHARE_IMAGE.width,
      height: SHARE_IMAGE.height,
      fonts: [
        { name: 'Archivo', data: archivo, weight: 900 },
        { name: 'DM Sans', data: dmSans, weight: 500 },
        { name: 'Geist Mono', data: geistMono, weight: 400 },
      ],
    },
  )
}
