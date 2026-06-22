import { Metadata } from 'next';
import FreemiumGuard from '@/components/common/FreemiumGuard';

export const metadata: Metadata = {
  title: 'Video Học Tiếng Anh',
  description: 'Xem video học tiếng Anh với phụ đề song ngữ, phù hợp cho trẻ em từ 3-12 tuổi.',
  openGraph: {
    title: 'Video Học Tiếng Anh - Comic Lingua Kids',
    description: 'Xem video học tiếng Anh với phụ đề song ngữ, phù hợp cho trẻ em từ 3-12 tuổi.',
  },
};

export default function VideosLayout({ children }: { children: React.ReactNode }) {
  return <FreemiumGuard>{children}</FreemiumGuard>;
}
