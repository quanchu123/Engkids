export default function AdminLoading(): JSX.Element {
  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="h-6 w-32 bg-slate-200 rounded" />
        <div className="h-9 w-24 bg-slate-200 rounded-lg" />
      </div>

      {/* Content skeleton */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
        <div className="h-5 w-48 bg-slate-200 rounded" />
        <div className="grid md:grid-cols-2 gap-4">
          <div className="h-10 bg-slate-100 rounded-lg" />
          <div className="h-10 bg-slate-100 rounded-lg" />
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="h-24 bg-slate-100 rounded-lg" />
          <div className="h-24 bg-slate-100 rounded-lg" />
          <div className="h-24 bg-slate-100 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
