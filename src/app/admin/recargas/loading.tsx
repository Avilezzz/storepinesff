import { Skeleton, SkeletonFilas } from '@/components/ui/Skeleton'

export default function Cargando() {
  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-7 w-52 rounded-lg" />
      </div>
      <SkeletonFilas n={3} />
    </>
  )
}
