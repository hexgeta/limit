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
  title: 'AgoráX - OTC Platform for Pooled HEX Stake Tokens',
  description: 'AgoráX is an OTC platform for trading pooled HEX stake tokens. Trade your HEX stakes with other users in a secure, decentralized environment.',
  icons: {
    icon: [
      {
        url: '/favicon.png',
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
        <script defer data-domain="otc.lookintomaxi.com" src="https://plausible.io/js/script.js"></script>
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
