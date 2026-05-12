import './globals.css'
import { Toaster } from '@/components/ui/sonner'
import { LanguageProvider } from '@/lib/i18n'

export const metadata = {
  title: 'AgentHub — L’agent IA qui correspond à vos besoins',
  description: 'Marketplace de location d’agents IA spécialisés.',
  icons: { icon: '/logo.png' },
}

export default function RootLayout({ children }) {
  return (
    <html lang="fr" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-[#080612] text-[#F4EFFA] font-inter antialiased min-h-screen">
        <LanguageProvider>
          {children}
        </LanguageProvider>
        <Toaster />
      </body>
    </html>
  )
}
