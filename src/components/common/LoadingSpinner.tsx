'use client';

import Image from 'next/image';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
}

export default function LoadingSpinner({ size = 'md', message }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-20 h-20',
    lg: 'w-28 h-28',
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[300px]">
      <div className="relative">
        {/* Pulsing glow */}
        <div className={`absolute inset-0 ${sizeClasses[size]} rounded-full bg-gradient-to-r from-purple-400 to-pink-400 blur-xl opacity-30 animate-pulse`} />
        
        {/* Logo with bounce */}
        <div className={`relative ${sizeClasses[size]} animate-bounce`}>
          <Image 
            src="/engkids-logo.png" 
            alt="Engkids" 
            fill 
            className="object-contain"
          />
        </div>
      </div>
      
      {/* Loading dots */}
      <div className="flex gap-1 mt-4">
        <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      
      {message && (
        <p className="mt-4 text-gray-600 font-medium">{message}</p>
      )}
    </div>
  );
}

export function LoadingOverlay({ message = 'Đang tải...' }: { message?: string }) {
  return (
    <div className="fixed inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-3xl p-10 shadow-2xl border-4 border-purple-100">
        <div className="flex flex-col items-center">
          {/* Animated logo with glow */}
          <div className="relative w-24 h-24 mb-6">
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-400 via-pink-400 to-amber-400 blur-2xl opacity-40 animate-pulse" />
            <div className="relative w-full h-full animate-bounce">
              <Image 
                src="/engkids-logo.png" 
                alt="Engkids" 
                fill 
                className="object-contain"
              />
            </div>
          </div>
          
          {/* Rainbow spinner ring */}
          <div className="relative w-16 h-16 mb-4">
            <div className="absolute inset-0 border-4 border-purple-200 rounded-full" />
            <div className="absolute inset-0 border-4 border-t-purple-500 rounded-full animate-spin" />
            <div className="absolute inset-1 border-4 border-t-pink-500 rounded-full animate-spin" style={{ animationDuration: '0.6s', animationDirection: 'reverse' }} />
          </div>
          
          <p className="text-gray-700 font-bold text-lg">{message}</p>
          <p className="text-gray-400 text-sm mt-1">Vui lòng chờ...</p>
          
          {/* Progress dots */}
          <div className="flex gap-1 mt-4">
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" />
            <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '100ms' }} />
            <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
            <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '400ms' }} />
          </div>
        </div>
      </div>
    </div>
  );
}