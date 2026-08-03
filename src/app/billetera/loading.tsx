import { Skeleton, SkeletonFilas } from '@/components/ui/Skeleton'

export default function Cargando() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-9">
      <div className="tarjeta flex flex-col items-center gap-3 px-5 py-8">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-11 w-44" />
        <Skeleton className="h-9 w-52 rounded-lg" />
      </div>
      <Skeleton className="mb-3 mt-7 h-5 w-32" />
      <SkeletonFilas n={4} />
    </div>
  )
}
