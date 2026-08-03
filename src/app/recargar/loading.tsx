import { Skeleton } from '@/components/ui/Skeleton'

export default function Cargando() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-9">
      <Skeleton className="h-7 w-44" />
      <Skeleton className="mt-2 h-4 w-full max-w-md" />

      <div className="mt-5 space-y-2.5">
        {[0, 1].map((i) => (
          <div key={i} className="tarjeta space-y-2.5 p-4">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-3/4" />
          </div>
        ))}
      </div>

      <div className="tarjeta mt-5 space-y-4 p-4 sm:p-5">
        <Skeleton className="h-5 w-52" />
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
    </div>
  )
}
