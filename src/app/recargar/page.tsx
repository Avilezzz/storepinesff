import { supabaseServer } from '@/lib/supabase'
import FormRecarga, { type Banco } from '@/components/FormRecarga'
import CuentaBancaria from '@/components/CuentaBancaria'

export const dynamic = 'force-dynamic'

export default async function Recargar() {
  type Cuenta = {
    id: number; banco: string; tipo_cuenta: string; numero_cuenta: string
    titular: string; identificacion: string; email_contacto: string | null
  }

  const sb = await supabaseServer()
  const [{ data: bancosRaw }, { count }] = await Promise.all([
    sb.from('bank_accounts')
      .select('id, banco, tipo_cuenta, numero_cuenta, titular, identificacion, email_contacto')
      .eq('activo', true).order('orden'),
    sb.from('topup_requests').select('id', { count: 'exact', head: true }).eq('estado', 'PENDIENTE'),
  ])

  const bancos = bancosRaw as Cuenta[] | null

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-9">
      <h1 className="titulo">Recargar saldo</h1>
      <p className="mt-1.5 text-sm leading-relaxed text-tenue">
        Transfiere a cualquiera de estas cuentas y sube el comprobante.
        Acreditamos tu saldo apenas lo verifiquemos.
      </p>

      <div className="mt-5 space-y-2.5">
        {(bancos ?? []).map((b) => <CuentaBancaria key={b.id} cuenta={b} />)}
      </div>

      <FormRecarga bancos={(bancos as Banco[]) ?? []} pendientes={count ?? 0} />
    </div>
  )
}
