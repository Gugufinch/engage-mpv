import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Engage — Two Perspectives. One Resolution.',
  description: 'Share your perspective. See theirs. Let AI find common ground.',
  openGraph: {
    title: 'Engage',
    description: 'Two Perspectives. One Resolution.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0D0D1A',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen relative">
        <div className="relative z-10">
          {children}
        </div>
      </body>
    </html>
  );
}
