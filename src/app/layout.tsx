import type { Metadata, Viewport } from 'next';
import './globals.css';
import { NotificationProvider } from '@/context/NotificationContext';

export const metadata: Metadata = {
  title: 'SmartSiswa - Sistem Presensi Siswa SD/MI Berbasis QR Code',
  description:
    'SmartSiswa - Platform presensi siswa SD/MI profesional dengan kartu ID berbasis QR Code, multi-sekolah, dan pencetakan terpusat.',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/logo.svg', type: 'image/svg+xml' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/logo.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/logo.svg',
    apple: [
      { url: '/icon-192.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'SmartSiswa',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#1d4ed8',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>
        <NotificationProvider>{children}</NotificationProvider>
      </body>
    </html>
  );
}

