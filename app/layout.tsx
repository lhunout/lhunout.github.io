import type { Metadata, Viewport } from 'next'
import { Archivo, DM_Sans, Literata, Geist_Mono } from 'next/font/google'
import './globals.css'
import ChatBot from '@/components/ChatBot'
import CommandPalette from '@/components/CommandPalette'
import ScrollProgress from '@/components/ScrollProgress'
import CvPreviewProvider from '@/components/CvPreview'
import Footer from '@/components/Footer'
import Navigation from '@/components/Navigation'
import SmoothScroll from '@/components/SmoothScroll'
import { personalInfo, workExperience } from '@/data/cv-data'
import { ICON, SHARE_IMAGE, SITE_URL } from '@/lib/site'
import { THEME_SCRIPT } from '@/lib/theme-script'

// Free stand-ins for anthropic.com's proprietary fonts: Literata for display,
// DM Sans for body text, Geist Mono for labels. Archivo is only for the hero name.
const archivo = Archivo({ subsets: ['latin'], variable: '--font-archivo', display: 'swap' })
const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-body', display: 'swap' })
const literata = Literata({ subsets: ['latin'], variable: '--font-serif', display: 'swap' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono', display: 'swap' })

const shareTitle = `${personalInfo.name} - ${personalInfo.title}`

export const metadata: Metadata = {
  // Without it, relative OG/Twitter images resolve against localhost.
  metadataBase: new URL(SITE_URL),
  title: shareTitle,
  description: personalInfo.description,
  authors: [{ name: personalInfo.name }],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
    title: shareTitle,
    description: personalInfo.description,
    siteName: `${personalInfo.name} Portfolio`,
    images: [{ ...SHARE_IMAGE, alt: shareTitle }],
  },
  twitter: {
    card: 'summary_large_image',
    title: shareTitle,
    description: personalInfo.description,
    images: [{ url: SHARE_IMAGE.url, alt: shareTitle }],
  },
  icons: { icon: { url: ICON.url, type: 'image/png' }, apple: ICON.url },
}

// Browser UI on mobile and Discord embed accent; values mirror --color-background.
export const viewport: Viewport = {
  // Android Chrome shrinks the layout when the keyboard opens, so the full-screen
  // chat stays above it instead of being pushed up. iOS ignores it (see ChatBot).
  interactiveWidget: 'resizes-content',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#faf9f5' },
    { media: '(prefers-color-scheme: dark)', color: '#1f1e1d' },
  ],
}

const personSchema = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: personalInfo.name,
  jobTitle: workExperience[0].positions[0].title,
  description: personalInfo.description,
  email: personalInfo.email,
  address: { '@type': 'PostalAddress', addressLocality: 'Paris', addressCountry: 'France' },
  url: SITE_URL,
  sameAs: [personalInfo.github, personalInfo.linkedin],
  knowsAbout: personalInfo.expertise,
  worksFor: { '@type': 'Organization', name: workExperience[0].company },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // Font variables go on <html>: Tailwind's preflight resolves font-family
    // there, so variables scoped to <body> would fall back to system fonts.
    // suppressHydrationWarning: THEME_SCRIPT adds the `dark` class before React hydrates.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${archivo.variable} ${dmSans.variable} ${literata.variable} ${geistMono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }}
        />
      </head>
      <body className="font-sans antialiased">
        <SmoothScroll>
          <CvPreviewProvider>
            <ScrollProgress />
            <Navigation />
            <main className="min-h-screen">{children}</main>
            <Footer />
            <CommandPalette />
            <ChatBot />
          </CvPreviewProvider>
        </SmoothScroll>
      </body>
    </html>
  )
}
