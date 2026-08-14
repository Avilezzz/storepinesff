import { Skeleton, SkeletonTarjetas } from '@/components/ui/Skeleton'

export default function Cargando() {
  return (
    <>
      <section className="aura border-b border-linea px-4 pb-5 pt-4 sm:pb-6 sm:pt-5">
        <div className="mx-auto max-w-6xl">
          <Skeleton className="h-[9.5rem] w-full rounded-2xl sm:h-[10.5rem]" />
          <div className="mt-3 flex justify-center gap-1.5">
            <Skeleton className="h-1.5 w-5 rounded-full" />
            <Skeleton className="h-1.5 w-1.5 rounded-full" />
            <Skeleton className="h-1.5 w-1.5 rounded-full" />
            <Skeleton className="h-1.5 w-1.5 rounded-full" />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8">
        <Skeleton className="mb-4 h-6 w-40" />
        <SkeletonTarjetas n={6} />
      </section>
    </>
  )
}
