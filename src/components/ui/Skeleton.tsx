/**
 * Bloques de carga. Se dibujan con la misma geometría que el contenido real
 * para que la página no dé un salto cuando llegan los datos.
 */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-panel2 ${className}`} />
}

export function SkeletonTarjetas({ n = 6 }: { n?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="tarjeta overflow-hidden">
          <Skeleton className="aspect-4/5 w-full rounded-none" />
          <div className="space-y-2.5 p-3">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-9 w-full rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function SkeletonFilas({ n = 5 }: { n?: number }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="tarjeta flex items-center gap-4 p-4">
          <Skeleton className="h-11 w-11 shrink-0 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
          </div>
          <Skeleton className="h-6 w-20" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonKpis({ n = 4 }: { n?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="tarjeta space-y-2 p-4">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-24" />
        </div>
      ))}
    </div>
  )
}
