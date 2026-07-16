'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Crown, Lock } from 'lucide-react';
import Header from '@/components/layout/Header';

interface PremiumStoryLockProps {
  titleEn: string;
  titleVi: string;
  coverImage?: string;
}

export default function PremiumStoryLock({ titleEn, titleVi, coverImage }: PremiumStoryLockProps) {
  const hasCover = Boolean(
    coverImage && (coverImage.startsWith('http') || coverImage.startsWith('data:')),
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 via-white to-amber-50">
      <Header />
      <main className="mx-auto flex max-w-lg flex-col items-center px-4 py-10 text-center">
        <div className="relative mb-6 h-48 w-48 overflow-hidden rounded-3xl bg-slate-100 shadow-lg ring-4 ring-amber-200">
          {hasCover ? (
            <Image
              src={coverImage!}
              alt={titleEn}
              fill
              className="object-cover blur-[1px] scale-105"
              sizes="192px"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-5xl">📖</div>
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/35">
            <Lock className="text-white" size={40} aria-hidden />
          </div>
        </div>

        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-amber-800">
          <Crown size={14} aria-hidden />
          Premium
        </div>
        <h1 className="text-2xl font-black text-slate-900">{titleEn}</h1>
        <p className="mt-1 text-slate-600">{titleVi}</p>
        <p className="mt-4 text-sm font-semibold text-slate-500">
          Truyện này chỉ dành cho tài khoản Premium. Nâng cấp để đọc song ngữ đầy đủ, học từ vựng và chơi game kèm truyện.
        </p>

        <div className="mt-8 flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/pricing"
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-3 text-sm font-black text-white shadow-lg"
          >
            <Crown size={16} aria-hidden />
            Nâng cấp Premium
          </Link>
          <Link
            href="/stories"
            className="inline-flex min-h-[48px] items-center justify-center rounded-2xl bg-white px-6 py-3 text-sm font-black text-slate-700 ring-1 ring-slate-200"
          >
            Quay lại kho truyện
          </Link>
        </div>
      </main>
    </div>
  );
}
