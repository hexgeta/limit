import '@/styles/global.css'
import { FontLoader } from '@/components/ui/FontLoader'
import NavBar from '@/components/NavBar'
import Footer from '@/components/Footer'
import { Providers } from '@/components/Providers'
import AppKitProvider from '@/context/AppKitProvider'
import { Toaster } from '@/components/ui/toaster'
import { headers } from 'next/headers'

// Static layout with revalidation
export const revalidate = 2592000; // 30 days in seconds

export const metadata = {
  title: 'AgoráX - Limit Orders on PulseChain',
  description: 'AgoráX is a limit order platform for trading PulseChain tokens.',
  metadataBase: new URL('https://limit.lookintomaxi.com'),
  openGraph: {
    title: 'Limit Pro - Peer-to-peer OTC Pooled HEX Stake Trading',
    description: 'Peer-to-peer OTC pooled HEX stake trading. At scale. On your own terms.',
    url: 'https://limit.lookintomaxi.com',
    siteName: 'Limit Pro',
    images: [
      {
        url: '/opengraph-image.png',
        width: 1200,
        height: 630,
        alt: 'Limit Pro - OTC Platform for Pooled HEX Stake Tokens',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Limit Pro - Peer-to-peer OTC Pooled HEX Stake Trading',
    description: 'Peer-to-peer OTC pooled HEX stake trading. At scale. On your own terms.',
    images: ['/opengraph-image.png'],
  },
  icons: {
    icon: [
      {
        url: '/favicon.svg',
        type: 'image/svg+xml',
      }
    ],
    apple: [
      {
        url: '/favicon-apple.png',
        type: 'image/png',
      }
    ],
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const headersData = await headers();
  const cookies = headersData.get('cookie');

  return (
    <html lang="en" className="font-sans">
      <head>
        <FontLoader weight="regular" priority={true} />
        <FontLoader weight="bold" />
        <script defer data-domain="limit.lookintomaxi.com" src="https://plausible.io/js/script.js"></script>
      </head>
      <body className="min-h-screen bg-black text-white">
        <AppKitProvider cookies={cookies}>
          <Providers>
            <div className="flex flex-col min-h-screen">
              <NavBar />
              <main className="flex-grow">{children}</main>
              <Footer />
            </div>
            <Toaster />
          </Providers>
        </AppKitProvider>
      </body>
    </html>
  )
}
