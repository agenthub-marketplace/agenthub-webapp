import './globals.css'
import { IBM_Plex_Sans, Inter, Libre_Baskerville, Space_Grotesk } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import { LanguageProvider } from '@/lib/i18n'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
})

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ibm-plex-sans',
  display: 'swap',
})

const libreBaskerville = Libre_Baskerville({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-libre-baskerville',
  display: 'swap',
})

export const metadata = {
  title: 'AgentHub - La marketplace des agents IA',
  description: 'Marketplace d’accès à des agents IA spécialisés.',
  icons: { icon: '/logo.png' },
}

export default function RootLayout({ children }) {
  return (
    <html
      lang="fr"
      className={`dark ${inter.variable} ${spaceGrotesk.variable} ${ibmPlexSans.variable} ${libreBaskerville.variable}`}
    >
      <body className="bg-[#080612] text-[#F4EFFA] font-inter antialiased min-h-screen">
        <LanguageProvider>
          {children}
        </LanguageProvider>
        <Toaster />
      </body>
    </html>
  )
}
