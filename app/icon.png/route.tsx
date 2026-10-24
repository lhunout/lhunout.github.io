import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ImageResponse } from 'next/og'
import { ICON } from '@/lib/site'

export const dynamic = 'force-static'

// Satori can't read CSS variables: colors mirror --color-foreground and --color-background.
export async function GET() {
  const archivo = await readFile(join(process.cwd(), 'assets/fonts/Archivo-Black.ttf'))
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: ICON.size * 0.22,
        backgroundColor: '#141413',
        color: '#faf9f5',
        fontFamily: 'Archivo',
        fontSize: ICON.size * 0.47,
        letterSpacing: -ICON.size * 0.023,
      }}
    >
      LH
    </div>,
    {
      width: ICON.size,
      height: ICON.size,
      fonts: [{ name: 'Archivo', data: archivo, weight: 900 }],
    },
  )
}
