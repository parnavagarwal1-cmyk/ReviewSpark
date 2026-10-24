import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'ReviewSpark — Admin',
    template: '%s | ReviewSpark',
  },
  description:
    'ReviewSpark: AI-powered Google review generation platform. ' +
    'Generate QR codes to help your customers leave Google reviews effortlessly.',
  robots: { index: false, follow: false }, // Admin tool — no public indexing
  icons: {
    icon: '/favicon.ico',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
