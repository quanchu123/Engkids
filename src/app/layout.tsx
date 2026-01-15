import type { Metadata, Viewport } from 'next';
import { Nunito } from 'next/font/google';
import './globals.css';

// Optimize font loading with next/font
const nunito = Nunito({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '600', '700', '800'],
  display: 'swap',
  variable: '--font-nunito',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#f472b6',
};

export const metadata: Metadata = {
  title: {
    default: 'ComicLingua Kids - Học Tiếng Anh Qua Truyện Tranh',
    template: '%s | ComicLingua Kids',
  },
  description: 'Website học tiếng Anh song ngữ qua truyện tranh dành cho trẻ em. Vừa học vừa chơi với flashcards và mini games.',
  keywords: ['học tiếng anh', 'trẻ em', 'truyện tranh', 'song ngữ', 'từ vựng', 'english for kids'],
  authors: [{ name: 'ComicLingua Team' }],
  robots: 'index, follow',
  openGraph: {
    type: 'website',
    locale: 'vi_VN',
    siteName: 'ComicLingua Kids',
    title: 'ComicLingua Kids - Học Tiếng Anh Qua Truyện Tranh',
    description: 'Học tiếng Anh vui vẻ qua truyện tranh và mini games',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className={nunito.variable}>
      <body className={`${nunito.className} antialiased`}>
        {children}
      </body>
    </html>
  );
}
