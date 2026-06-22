import { Metadata } from 'next';
import FreemiumGuard from '@/components/common/FreemiumGuard';

export const metadata: Metadata = {
  title: 'Nhạc Tiếng Anh',
  description: 'Nghe nhạc và bài hát tiếng Anh vui nhộn, giúp trẻ em học tiếng Anh qua âm nhạc.',
  openGraph: {
    title: 'Nhạc Tiếng Anh - Comic Lingua Kids',
    description: 'Nghe nhạc và bài hát tiếng Anh vui nhộn, giúp trẻ em học tiếng Anh qua âm nhạc.',
  },
};

export default function MusicLayout({ children }: { children: React.ReactNode }) {
  return <FreemiumGuard>{children}</FreemiumGuard>;
}
