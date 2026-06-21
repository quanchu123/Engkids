import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Kho Truyện',
  description: 'Đọc truyện tranh song ngữ Anh-Việt, học từ vựng qua truyện kể thú vị dành cho trẻ em.',
  openGraph: {
    title: 'Kho Truyện - Comic Lingua Kids',
    description: 'Đọc truyện tranh song ngữ Anh-Việt, học từ vựng qua truyện kể thú vị dành cho trẻ em.',
  },
};

export default function StoriesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
