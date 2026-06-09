'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BarChart3, CheckCircle2, ShieldCheck } from 'lucide-react';
import type { StandardsCoverageSummary } from '@/services/learning-intelligence';

export default function AdminStandardsPage() {
  const [coverage, setCoverage] = useState<StandardsCoverageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    fetch('/api/admin/standards/coverage', { credentials: 'include', cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Failed to load standards coverage.');
        return response.json();
      })
      .then((data) => {
        if (active) setCoverage(data);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load standards coverage.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const stageRows = useMemo(() => (coverage?.rows || []).filter((row) => row.skill === 'all'), [coverage]);

  return (
    <div className="space-y-6">
      <header className="admin-card flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-admin-primary">CEFR quality</p>
          <h1 className="mt-1 text-2xl font-black text-admin-text">Standards Coverage</h1>
          <p className="mt-1 text-sm text-admin-text-muted">A2-C1 coverage by skill, source safety, CEFR reason, can-do goal, and translation status.</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-admin-md" style={{ backgroundImage: 'var(--admin-gradient)' }}>
          <BarChart3 className="h-6 w-6" aria-hidden="true" />
        </div>
      </header>

      {loading ? <div className="admin-card p-6 text-sm font-bold text-admin-text-muted">Loading coverage...</div> : null}
      {error ? <div className="admin-card border-rose-200 bg-rose-50 p-6 text-sm font-bold text-rose-700">{error}</div> : null}

      {coverage && (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Metric label="Words" value={coverage.totals.words} />
            <Metric label="Lessons" value={coverage.totals.lessons} />
            <Metric label="Assessments" value={coverage.totals.assessments} />
            <Metric label="Review needed" value={coverage.totals.qualityNeedsReview} />
            <Metric label="Translations" value={coverage.totals.translationPending} />
          </section>

          <section className="admin-card overflow-hidden">
            <div className="border-b border-admin-border p-4">
              <h2 className="font-black text-admin-text">Stage health</h2>
              <p className="text-sm text-admin-text-muted">Top-level A2-C1 readiness for learner-facing content.</p>
            </div>
            <div className="divide-y divide-admin-border">
              {stageRows.map((row) => <CoverageRow key={`${row.stageId}-${row.skill}`} row={row} />)}
            </div>
          </section>

          <section className="admin-card overflow-auto">
            <div className="border-b border-admin-border p-4">
              <h2 className="font-black text-admin-text">Skill matrix</h2>
              <p className="text-sm text-admin-text-muted">Use this to find gaps before publishing more lessons.</p>
            </div>
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-admin-surface-muted text-xs uppercase text-admin-text-muted">
                <tr>
                  <th className="px-4 py-3">Stage</th>
                  <th className="px-4 py-3">Skill</th>
                  <th className="px-4 py-3">Words</th>
                  <th className="px-4 py-3">Lessons</th>
                  <th className="px-4 py-3">Assessments</th>
                  <th className="px-4 py-3">Missing reason</th>
                  <th className="px-4 py-3">Missing can-do</th>
                  <th className="px-4 py-3">Translation pending</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-admin-border">
                {coverage.rows.map((row) => (
                  <tr key={`${row.stageId}-${row.skill}`} className="text-admin-text">
                    <td className="px-4 py-3 font-bold">{row.cefr}</td>
                    <td className="px-4 py-3">{row.skill}</td>
                    <td className="px-4 py-3">{row.words}</td>
                    <td className="px-4 py-3">{row.lessons}</td>
                    <td className="px-4 py-3">{row.assessments}</td>
                    <td className="px-4 py-3">{row.missingCefrReason}</td>
                    <td className="px-4 py-3">{row.missingCanDo}</td>
                    <td className="px-4 py-3">{row.translationPending}</td>
                    <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="admin-card p-4">
      <p className="text-xs font-black uppercase tracking-wide text-admin-text-muted">{label}</p>
      <p className="mt-1 text-2xl font-black text-admin-text">{value}</p>
    </div>
  );
}

function CoverageRow({ row }: { row: StandardsCoverageSummary['rows'][number] }) {
  return (
    <article className="grid gap-4 p-4 lg:grid-cols-[180px_1fr_auto] lg:items-center">
      <div>
        <p className="font-black text-admin-text">{row.cefr}</p>
        <p className="text-xs font-bold text-admin-text-muted">{row.stageId}</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-4">
        <Mini label="Words" value={row.words} />
        <Mini label="Lessons" value={row.lessons} />
        <Mini label="Assessments" value={row.assessments} />
        <Mini label="Needs review" value={row.qualityNeedsReview + row.translationPending} />
      </div>
      <StatusBadge status={row.status} />
    </article>
  );
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-admin-surface-muted px-3 py-2">
      <p className="text-[11px] font-black uppercase text-admin-text-muted">{label}</p>
      <p className="text-lg font-black text-admin-text">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: StandardsCoverageSummary['rows'][number]['status'] }) {
  const config = status === 'healthy'
    ? { icon: CheckCircle2, className: 'bg-emerald-50 text-emerald-700', label: 'Healthy' }
    : status === 'watch'
      ? { icon: ShieldCheck, className: 'bg-amber-50 text-amber-700', label: 'Watch' }
      : { icon: AlertTriangle, className: 'bg-rose-50 text-rose-700', label: 'Needs work' };
  const Icon = config.icon;
  return (
    <span className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs font-black ${config.className}`}>
      <Icon className="h-4 w-4" aria-hidden="true" /> {config.label}
    </span>
  );
}
