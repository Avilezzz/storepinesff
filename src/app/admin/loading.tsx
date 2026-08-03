import { Skeleton, SkeletonKpis, SkeletonFilas } from '@/components/ui/Skeleton'

export default function Cargando() {
  return (
    <>
      <Skeleton className="mb-4 h-7 w-32" />
      <SkeletonKpis n={4} />
      <div className="mt-2.5"><SkeletonKpis n={4} /></div>
      <Skeleton className="mb-3 mt-7 h-5 w-36" />
      <SkeletonFilas n={4} />
    </>
  )
}
