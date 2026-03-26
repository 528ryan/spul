import type { Metadata } from 'next'
import { DM_Sans, Calistoga } from 'next/font/google'
import './globals.css'

const dmSans = DM_Sans({
  variable: '--font-dm-sans',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
})

const calistoga = Calistoga({
  variable: '--font-calistoga',
  subsets: ['latin'],
  weight: '400',
})

export const metadata: Metadata = {
  title: 'spul',
  description: 'Dashboard financeiro para e-commerce de produtos 3D impressos',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className={`${dmSans.variable} ${calistoga.variable} h-full antialiased`}>
      <body className="min-h-full bg-bg text-text font-sans">{children}</body>
    </html>
  )
}
