import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL('https://rugby-move.vercel.app'),
  title: {
    default: 'RugbyMove | Rugby tactical playbook',
    template: '%s | RugbyMove',
  },
  description: 'Create, animate, and share Rugby Union tactical plays.',
  openGraph: {
    type: 'website',
    siteName: 'RugbyMove',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
