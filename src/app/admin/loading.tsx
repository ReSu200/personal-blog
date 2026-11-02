export default function AdminLoading() {
  return (
    <div className="animate-pulse space-y-5">
      <div className="h-7 w-40 rounded-md bg-muted" />
      <div className="h-4 w-64 rounded bg-muted" />
      <div className="space-y-3">
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="h-16 rounded-xl border border-border/70 bg-card" />
        ))}
      </div>
    </div>
  );
}
