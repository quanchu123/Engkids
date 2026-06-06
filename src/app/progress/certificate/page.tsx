'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Certificate from '@/components/learning/Certificate';
import { useAppStore } from '@/store/useAppStore';
import { buildCertificateData } from '@/lib/certificate';

const NAME_STORAGE_KEY = 'engkids.childName';

export default function CertificatePage() {
  const { progress } = useAppStore();
  const [name, setName] = useState('');

  // Load saved child name from localStorage on mount.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem(NAME_STORAGE_KEY);
    if (saved) setName(saved);
  }, []);

  // Persist child name whenever it changes.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(NAME_STORAGE_KEY, name);
  }, [name]);

  const certData = useMemo(
    () => buildCertificateData(progress, name.trim()),
    [progress, name],
  );

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <>
      <Header />

      {/* Print-specific rules: hide everything except the certificate. */}
      <style>{`
        @page {
          size: landscape;
          margin: 0;
        }
        @media print {
          body * {
            visibility: hidden !important;
          }
          .certificate-print-area,
          .certificate-print-area * {
            visibility: visible !important;
          }
          .certificate-print-area {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      <main className="min-h-screen bg-gradient-to-b from-amber-50 via-pink-50 to-sky-50 pb-24">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <div className="no-print mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">
                Chứng nhận hoàn thành 🎓
              </h1>
              <p className="mt-1 text-sm font-bold text-slate-500">
                Nhập tên bé rồi in hoặc lưu thành PDF để khoe nhé!
              </p>
            </div>
            <Link
              href="/progress"
              className="kid-chip self-start px-4 py-2 text-sm font-bold text-violet-700"
            >
              ← Quay lại tiến độ
            </Link>
          </div>

          <div className="no-print soft-panel mb-6 flex flex-col gap-3 rounded-[1.5rem] p-4 sm:flex-row sm:items-center">
            <label htmlFor="child-name" className="text-sm font-black text-slate-700">
              Tên của bé
            </label>
            <input
              id="child-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Nhập tên bé..."
              maxLength={40}
              className="w-full flex-1 rounded-2xl bg-white px-4 py-3 font-semibold text-slate-700 shadow outline-none"
            />
            <button
              onClick={handlePrint}
              className="rounded-2xl bg-gradient-to-r from-violet-500 to-pink-500 px-6 py-3 text-sm font-black text-white shadow-lg transition-transform hover:-translate-y-0.5"
            >
              In / Lưu PDF 🖨️
            </button>
          </div>

          <div className="toy-panel overflow-hidden rounded-[2rem] p-4 sm:p-6">
            <Certificate
              name={certData.name}
              level={certData.level}
              wordsLearned={certData.wordsLearned}
              storiesCompleted={certData.storiesCompleted}
              totalStars={certData.totalStars}
              dateVi={certData.dateVi}
            />
          </div>
        </div>
      </main>
    </>
  );
}
