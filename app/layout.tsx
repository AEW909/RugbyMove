import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL('https://rugbyslate.com'),
  title: {
    default: 'RugbySlate | Rugby tactical playbook',
    template: '%s | RugbySlate',
  },
  description: 'Create, animate, and share Rugby Union tactical plays.',
  openGraph: {
    type: 'website',
    siteName: 'RugbySlate',
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
