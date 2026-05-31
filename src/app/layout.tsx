import type { Metadata, Viewport } from 'next';
import { Nunito } from 'next/font/google';
import './globals.css';
import RouterLoading from '@/components/common/RouterLoading';
import UserProgressSync from '@/components/common/UserProgressSync';

// Self-hosted via next/font (downloaded at build time, no runtime CDN call).
// Includes the Vietnamese subset so diacritics render identically on every device.
const appFont = Nunito({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '600', '700', '800', '900'],
  display: 'swap',
  variable: '--font-app',
  fallback: ['Trebuchet MS', 'Segoe UI', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#f472b6',
};

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  ),
  title: {
    default: 'Engkids - Học Tiếng Anh Vui!',
    template: '%s | Engkids',
  },
  description: 'Website học tiếng Anh song ngữ qua truyện tranh dành cho trẻ em. Vừa học vừa chơi với flashcards và mini games.',
  keywords: ['học tiếng anh', 'trẻ em', 'truyện tranh', 'song ngữ', 'từ vựng', 'english for kids'],
  authors: [{ name: 'Engkids Team' }],
  robots: 'index, follow',
  icons: {
    icon: [
      { url: '/engkids-logo.png', type: 'image/png' },
    ],
    apple: '/engkids-logo.png',
    shortcut: '/engkids-logo.png',
  },
  openGraph: {
    type: 'website',
    locale: 'vi_VN',
    siteName: 'Engkids',
    title: 'Engkids - Học Tiếng Anh Vui!',
    description: 'Học tiếng Anh vui vẻ qua truyện tranh và mini games',
    images: [{ url: '/engkids-logo.png', width: 800, height: 800, alt: 'Engkids Logo' }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className={appFont.variable}>
      <body className="antialiased">
        <RouterLoading />
        <UserProgressSync />
        {children}
      </body>
    </html>
  );
}
