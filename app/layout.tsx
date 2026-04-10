import type {Metadata} from 'next';
import { Toaster } from 'sonner';
import './globals.css'; // Global styles
import { ErrorBoundary } from '@/components/layout/ErrorBoundary';
import { Cormorant_Garamond, DM_Sans, DM_Mono, Plus_Jakarta_Sans } from 'next/font/google';

const cormorantGaramond = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '600'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-dm-sans',
});

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-dm-mono',
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-plus-jakarta',
});

export const metadata: Metadata = {
  title: 'EliteSchool OS',
  description: 'EliteSchool OS',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={`${cormorantGaramond.variable} ${dmSans.variable} ${dmMono.variable} ${plusJakartaSans.variable}`}>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="mesh-gradient-bg font-body text-on-surface min-h-screen" suppressHydrationWarning>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
