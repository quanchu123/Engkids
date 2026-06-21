import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Đăng Nhập',
  description: 'Đăng nhập vào Comic Lingua Kids để theo dõi tiến độ học tập của bé.',
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
