import React from 'react';
import FreemiumGuard from '@/components/common/FreemiumGuard';

export default function RoadmapLayout({ children }: { children: React.ReactNode }) {
  return <FreemiumGuard>{children}</FreemiumGuard>;
}
