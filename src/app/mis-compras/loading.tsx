import { Skeleton, SkeletonFilas } from '@/components/ui/Skeleton'

export default function Cargando() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-9">
      <Skeleton className="mb-5 h-7 w-40" />
      <SkeletonFilas n={4} />
    </div>
  )
}
