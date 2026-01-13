import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ComicLingua Kids - Học Tiếng Anh Qua Truyện Tranh',
  description: 'Website học tiếng Anh song ngữ qua truyện tranh dành cho trẻ em. Vừa học vừa chơi với flashcards và mini games.',
  keywords: ['học tiếng anh', 'trẻ em', 'truyện tranh', 'song ngữ', 'từ vựng'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
