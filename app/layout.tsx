import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Real or Fake?',
  description: 'Can you tell who\'s real?',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full" style={{ background: '#0a0a0a' }}>
        <div className="mobile-frame">
          {children}
        </div>
      </body>
    </html>
  )
}
