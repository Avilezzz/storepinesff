import { Skeleton, SkeletonTarjetas } from '@/components/ui/Skeleton'

export default function Cargando() {
  return (
    <>
      <section className="aura flex flex-col items-center gap-3 border-b border-linea px-4 py-10 sm:py-14">
        <Skeleton className="h-9 w-64 sm:h-11 sm:w-80" />
        <Skeleton className="h-4 w-full max-w-md" />
        <Skeleton className="h-4 w-48" />
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8">
        <Skeleton className="mb-4 h-6 w-40" />
        <SkeletonTarjetas n={6} />
      </section>
    </>
  )
}
