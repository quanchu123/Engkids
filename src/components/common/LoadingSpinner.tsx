'use client';

import Image from 'next/image';

interface LoadingSpinnerProps {
  message?: string;
}

export default function LoadingSpinner({ message = 'Đang tải...' }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      {/* Logo with animated ring */}
      <div className="relative">
        <div className="absolute -inset-2 border-[3px] border-purple-200 border-t-purple-500 rounded-full animate-spin" />
        <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 p-2">
          <Image src="/engkids-logo.png" alt="Engkids" fill className="object-contain p-1" />
        </div>
      </div>
      <p className="mt-4 text-gray-500 text-sm font-medium animate-pulse">{message}</p>
    </div>
  );
}