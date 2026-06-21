export default function AdminLoading(): JSX.Element {
  return (
    <div className="admin-theme max-w-5xl mx-auto p-6 space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="admin-card flex items-center justify-between p-4">
        <div className="h-6 w-32 bg-admin-surface-muted rounded" />
        <div className="h-9 w-24 bg-admin-surface-muted rounded-lg" />
      </div>

      {/* Content skeleton */}
      <div className="admin-card p-6 space-y-4">
        <div className="h-5 w-48 bg-admin-surface-muted rounded" />
        <div className="grid md:grid-cols-2 gap-4">
          <div className="h-10 bg-admin-surface-muted rounded-lg" />
          <div className="h-10 bg-admin-surface-muted rounded-lg" />
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="h-24 bg-admin-surface-muted rounded-lg" />
          <div className="h-24 bg-admin-surface-muted rounded-lg" />
          <div className="h-24 bg-admin-surface-muted rounded-lg" />
        </div>
      </div>
    </div>
  );
}
