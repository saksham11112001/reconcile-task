import type { Metadata } from 'next'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
import { ToastContainer } from '@/components/ui/Toast'
import './globals.css'

export const metadata: Metadata = {
  title: 'Reconcile',
  description: 'Bank reconciliation for CA firms',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          {children}
          <ToastContainer />
        </ThemeProvider>
      </body>
    </html>
  )
}
