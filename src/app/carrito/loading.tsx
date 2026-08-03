import { Skeleton, SkeletonFilas } from '@/components/ui/Skeleton'

export default function Cargando() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:py-9">
      <Skeleton className="mb-5 h-7 w-36" />
      <div className="grid gap-4 lg:grid-cols-[1fr_19rem]">
        <SkeletonFilas n={3} />
        <div className="tarjeta space-y-3 p-4">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      </div>
    </div>
  )
}
