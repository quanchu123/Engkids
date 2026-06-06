'use client';

import { CertificateLevel } from '@/lib/certificate';

interface CertificateProps {
  name: string;
  level: CertificateLevel;
  wordsLearned: number;
  storiesCompleted: number;
  totalStars: number;
  dateVi: string;
}

const TIER_ACCENT: Record<CertificateLevel['tier'], { border: string; ribbon: string; label: string }> = {
  bronze: { border: '#cd7f32', ribbon: 'linear-gradient(135deg, #e8a872, #cd7f32)', label: '#8a5320' },
  silver: { border: '#9ca3af', ribbon: 'linear-gradient(135deg, #d7dbe0, #9ca3af)', label: '#5b6470' },
  gold: { border: '#e0a400', ribbon: 'linear-gradient(135deg, #ffd54a, #e0a400)', label: '#8a6400' },
  diamond: { border: '#38bdf8', ribbon: 'linear-gradient(135deg, #a5f3fc, #38bdf8)', label: '#0369a1' },
};

export default function Certificate({
  name,
  level,
  wordsLearned,
  storiesCompleted,
  totalStars,
  dateVi,
}: CertificateProps) {
  const accent = TIER_ACCENT[level.tier];

  return (
    <div
      className="certificate-print-area"
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '1000px',
        margin: '0 auto',
        aspectRatio: '297 / 210',
        background: '#fffdf6',
        color: '#1f2937',
        borderRadius: '18px',
        boxShadow: '0 18px 50px rgba(0,0,0,0.12)',
        overflow: 'hidden',
      }}
    >
      {/* Decorative outer border */}
      <div
        style={{
          position: 'absolute',
          inset: '14px',
          border: `6px double ${accent.border}`,
          borderRadius: '12px',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: '24px',
          border: `2px solid ${accent.border}`,
          borderRadius: '8px',
          opacity: 0.5,
          pointerEvents: 'none',
        }}
      />

      {/* Corner flourishes */}
      {([
        { top: '30px', left: '30px' },
        { top: '30px', right: '30px' },
        { bottom: '30px', left: '30px' },
        { bottom: '30px', right: '30px' },
      ] as const).map((pos, index) => (
        <div
          key={index}
          style={{
            position: 'absolute',
            fontSize: '26px',
            opacity: 0.6,
            ...pos,
          }}
        >
          ✦
        </div>
      ))}

      <div
        style={{
          position: 'relative',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          textAlign: 'center',
          padding: '46px 56px',
        }}
      >
        {/* Branding */}
        <div>
          <div
            style={{
              fontSize: '0.95rem',
              fontWeight: 800,
              letterSpacing: '0.35em',
              textTransform: 'uppercase',
              color: accent.label,
            }}
          >
            Engkids
          </div>
          <h1
            style={{
              marginTop: '6px',
              fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
              fontWeight: 900,
              letterSpacing: '0.06em',
              color: '#7c3aed',
            }}
          >
            GIẤY CHỨNG NHẬN
          </h1>
          <p style={{ marginTop: '4px', fontSize: '0.95rem', fontWeight: 600, color: '#6b7280' }}>
            Chứng nhận hoàn thành chương trình học tiếng Anh
          </p>
        </div>

        {/* Recipient */}
        <div>
          <p style={{ fontSize: '0.9rem', fontWeight: 600, color: '#6b7280' }}>Trao tặng cho</p>
          <p
            style={{
              marginTop: '8px',
              fontSize: 'clamp(2rem, 6vw, 3.4rem)',
              fontWeight: 900,
              color: '#1f2937',
              lineHeight: 1.1,
            }}
          >
            {name || 'Bé yêu'}
          </p>
          <div
            style={{
              marginTop: '12px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 20px',
              borderRadius: '999px',
              background: accent.ribbon,
              color: '#1f2937',
              fontWeight: 800,
              fontSize: '1.05rem',
              boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
            }}
          >
            <span style={{ fontSize: '1.5rem' }}>{level.emoji}</span>
            {level.titleVi}
          </div>
        </div>

        {/* Stats */}
        <div
          style={{
            display: 'flex',
            gap: '36px',
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          <Stat value={wordsLearned} label="Từ đã học" />
          <Stat value={storiesCompleted} label="Truyện hoàn thành" />
          <Stat value={totalStars} label="Tổng sao" />
        </div>

        {/* Footer / signature */}
        <div
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: '24px',
          }}
        >
          <div style={{ textAlign: 'left', minWidth: '160px' }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1f2937' }}>{dateVi}</div>
            <div style={{ marginTop: '4px', fontSize: '0.78rem', color: '#6b7280' }}>Ngày cấp</div>
          </div>
          <div style={{ textAlign: 'right', minWidth: '200px' }}>
            <div
              style={{
                fontFamily: 'cursive',
                fontSize: '1.35rem',
                fontWeight: 700,
                color: '#7c3aed',
              }}
            >
              Engkids
            </div>
            <div
              style={{
                marginTop: '4px',
                borderTop: '1.5px solid #9ca3af',
                paddingTop: '6px',
                fontSize: '0.78rem',
                color: '#6b7280',
              }}
            >
              Engkids - Học tiếng Anh vui
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '2rem', fontWeight: 900, color: '#7c3aed' }}>{value}</div>
      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#6b7280' }}>{label}</div>
    </div>
  );
}
