/**
 * Bloques de carga. Se dibujan con la misma geometría que el contenido real
 * para que la página no dé un salto cuando llegan los datos.
 */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-panel2 ${className}`} />
}

export function SkeletonTarjetas({ n = 6 }: { n?: number }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="tarjeta space-y-4 p-5">
          <div className="flex items-start justify-between">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-10 w-full rounded-lg" />
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
