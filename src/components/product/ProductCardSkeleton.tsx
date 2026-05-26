// Reusable skeleton loader for ProductCard — used during initial data fetch
export function ProductCardSkeleton() {
  return (
    <div className="bg-branco rounded-lg overflow-hidden shadow-sm border border-cinza-claro flex flex-col animate-pulse">
      {/* Image skeleton */}
      <div className="relative aspect-square bg-cinza-claro" />

      {/* Info content skeleton */}
      <div className="p-5 flex-grow flex flex-col justify-between space-y-4">
        <div className="space-y-2">
          <div className="h-2.5 bg-cinza-claro rounded w-1/3" />
          <div className="h-4 bg-cinza-claro rounded w-4/5" />
          <div className="h-4 bg-cinza-claro rounded w-2/3" />
        </div>
        <div className="flex items-center justify-between pt-2">
          <div className="h-5 bg-cinza-claro rounded w-24" />
          <div className="h-8 w-8 bg-cinza-claro rounded" />
        </div>
      </div>
    </div>
  );
}
