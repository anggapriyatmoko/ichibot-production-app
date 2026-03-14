export default function Loading() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Permintaan Barang
        </h1>
        <p className="text-muted-foreground">
          Pantau dan kelola permintaan pengadaan barang dari berbagai divisi
          secara real-time.
        </p>
      </div>

      {/* Skeleton Table */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        {/* Header skeleton */}
        <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-3 justify-between">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-5 h-5 rounded bg-muted animate-pulse shrink-0" />
            <div className="h-5 w-40 bg-muted animate-pulse rounded" />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-9 w-[300px] bg-muted animate-pulse rounded-xl" />
            <div className="h-9 w-[160px] bg-muted animate-pulse rounded-xl" />
            <div className="h-9 w-[140px] bg-muted animate-pulse rounded-xl" />
          </div>
        </div>

        {/* Table header skeleton */}
        <div className="border-b border-border px-4 py-3 flex items-center gap-4">
          <div className="h-3 w-20 bg-muted animate-pulse rounded" />
          <div className="h-3 w-24 bg-muted animate-pulse rounded" />
          <div className="h-3 w-48 bg-muted animate-pulse rounded flex-1" />
          <div className="h-3 w-10 bg-muted animate-pulse rounded" />
          <div className="h-3 w-20 bg-muted animate-pulse rounded" />
        </div>

        {/* Table rows skeleton */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="border-b border-border px-4 py-3.5 flex items-center gap-4">
            <div className="w-20 shrink-0">
              <div className="h-6 w-full bg-muted animate-pulse rounded-full" />
            </div>
            <div className="w-24 shrink-0 space-y-1">
              <div className="h-3.5 w-full bg-muted animate-pulse rounded" />
              <div className="h-2.5 w-3/4 bg-muted animate-pulse rounded" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="h-3.5 w-3/4 bg-muted animate-pulse rounded" />
              <div className="h-2.5 w-1/4 bg-muted animate-pulse rounded" />
            </div>
            <div className="w-10 shrink-0">
              <div className="h-5 w-full bg-muted animate-pulse rounded-md" />
            </div>
            <div className="w-20 shrink-0 flex justify-end gap-1">
              <div className="h-8 w-8 bg-muted animate-pulse rounded-lg" />
              <div className="h-8 w-8 bg-muted animate-pulse rounded-lg" />
              <div className="h-8 w-8 bg-muted animate-pulse rounded-lg" />
            </div>
          </div>
        ))}

        {/* Pagination skeleton */}
        <div className="px-4 py-3 border-t border-border flex items-center justify-between">
          <div className="h-3 w-32 bg-muted animate-pulse rounded" />
          <div className="flex gap-2">
            <div className="h-8 w-8 bg-muted animate-pulse rounded-lg" />
            <div className="h-8 w-8 bg-muted animate-pulse rounded-lg" />
            <div className="h-8 w-8 bg-muted animate-pulse rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
