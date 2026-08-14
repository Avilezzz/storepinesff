'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Upload, CheckCircle2, Loader2, FileImage, X } from 'lucide-react'
import { toast } from 'sonner'
import { supabaseBrowser } from '@/lib/supabase-client'
import { aCentavos, usd, mensajeError, hoyEcuador } from '@/lib/format'

export type Banco = { id: number; banco: string }

const MINIMO = 200          // $2.00 en centavos
const MAX_BYTES = 5 * 1024 * 1024
const ATAJOS = [200, 500, 1000, 2000]

export default function FormRecarga({ bancos, pendientes }: { bancos: Banco[]; pendientes: number }) {
  const sb = supabaseBrowser()
  const router = useRouter()
  const [monto, setMonto] = useState('')
  const [banco, setBanco] = useState(bancos[0]?.banco ?? '')
  const [referencia, setReferencia] = useState('')
  const [fechaTr, setFechaTr] = useState(hoyEcuador)
  const [nota, setNota] = useState('')
  const [archivo, setArchivo] = useState<File | null>(null)
  const [ok, setOk] = useState(false)
  const [enviando, setEnviando] = useState(false)

  const cents = aCentavos(monto)
  const bloqueado = pendientes >= 3
  const hoy = hoyEcuador()

  async function enviar(e: React.FormEvent) {
    e.preventDefault()

    if (cents === null)           return toast.error('Escribe un monto válido, por ejemplo 2.00')
    if (cents < MINIMO)           return toast.error(`El monto mínimo de recarga es ${usd(MINIMO)}.`)
    if (!archivo)                 return toast.error('Adjunta la foto o el PDF del comprobante.')
    if (archivo.size > MAX_BYTES) return toast.error('El archivo pesa más de 5 MB.')

    setEnviando(true)

    const { data: auth } = await sb.auth.getUser()
    const uid = auth.user!.id
    const ext = archivo.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    // La ruta arranca con el uid: la policy de Storage exige que cada quien
    // escriba solo dentro de su propia carpeta.
    const ruta = `${uid}/${Date.now()}.${ext}`

    const { error: errSubida } = await sb.storage
      .from('comprobantes')
      .upload(ruta, archivo, { contentType: archivo.type, upsert: false })

    if (errSubida) {
      setEnviando(false)
      return toast.error(`No se pudo subir el comprobante: ${errSubida.message}`)
    }

    const { error: errFila } = await sb.from('topup_requests').insert({
      user_id: uid,
      amount_cents: cents,
      banco,
      numero_referencia: referencia.trim(),
      fecha_transferencia: fechaTr,
      comprobante_path: ruta,
      nota_usuario: nota.trim() || null,
    })

    setEnviando(false)
    if (errFila) return toast.error(mensajeError(errFila.message))

    setOk(true)
    setMonto(''); setReferencia(''); setNota(''); setArchivo(null)
    toast.success('Solicitud enviada')
    router.refresh()
  }

  if (ok) {
    return (
      <div className="tarjeta mt-5 flex flex-col items-center gap-3 px-6 py-10 text-center">
        <CheckCircle2 size={30} strokeWidth={1.5} className="text-ok" />
        <p className="subtitulo">Solicitud enviada</p>
        <p className="max-w-sm text-sm leading-relaxed text-tenue">
          Vamos a verificar tu transferencia. Cuando se apruebe, el saldo aparecerá
          en tu billetera y te llegará un aviso.
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <button onClick={() => setOk(false)} className="btn btn-suave">Enviar otra</button>
          <Link href="/billetera" className="btn btn-primario">Ir a mi billetera</Link>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={enviar} className="tarjeta mt-5 space-y-4 p-4 sm:p-5">
      <div>
        <h2 className="subtitulo">Reporta tu transferencia</h2>
        <p className="mt-0.5 text-xs text-tenue">Todos los campos son obligatorios salvo la nota.</p>
      </div>

      {bloqueado && (
        <p className="rounded-lg bg-alerta/10 px-3 py-2.5 text-sm leading-relaxed text-alerta">
          Ya tienes 3 solicitudes en revisión. Espera a que se resuelvan para enviar otra.
        </p>
      )}

      <div>
        <label className="mb-1.5 block text-xs font-medium text-tenue">Monto transferido (USD)</label>
        <input className="campo" inputMode="decimal" required placeholder="2.00"
          value={monto} onChange={(e) => setMonto(e.target.value)} />
        <div className="sin-barra mt-2 flex gap-1.5 overflow-x-auto">
          {ATAJOS.map((c) => (
            <button key={c} type="button" onClick={() => setMonto((c / 100).toFixed(2))}
              className={`chip shrink-0 border px-2.5 py-1.5 transition ${
                cents === c ? 'border-marca bg-marca/10 text-marca' : 'border-linea bg-panel2 text-tenue'}`}>
              {usd(c)}
            </button>
          ))}
          <span className="flex shrink-0 items-center pl-1 text-[11px] text-tenue">mín. {usd(MINIMO)}</span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-tenue">Banco de destino</label>
          <select className="campo" value={banco} onChange={(e) => setBanco(e.target.value)} required>
            {bancos.map((b) => <option key={b.id} value={b.banco}>{b.banco}</option>)}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-tenue">Fecha de la transferencia</label>
          <input type="date" className="campo" required max={hoy}
            value={fechaTr} onChange={(e) => setFechaTr(e.target.value)} />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-tenue">N.º de documento o referencia</label>
        <input className="campo" required placeholder="Ej. 887766"
          value={referencia} onChange={(e) => setReferencia(e.target.value)} />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-tenue">Comprobante</label>

        {archivo ? (
          <div className="flex items-center gap-2.5 rounded-lg border border-linea bg-panel2 px-3 py-2.5">
            <FileImage size={17} className="shrink-0 text-marca" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">{archivo.name}</p>
              <p className="text-[11px] text-tenue">{(archivo.size / 1024).toFixed(0)} KB</p>
            </div>
            <button type="button" onClick={() => setArchivo(null)} className="btn-icono" aria-label="Quitar archivo">
              <X size={16} />
            </button>
          </div>
        ) : (
          <label className="flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border border-dashed border-linea bg-panel2 px-4 py-7 text-center transition hover:border-marca/50">
            <Upload size={19} className="text-tenue" />
            <span className="text-sm font-medium">Toca para subir</span>
            <span className="text-[11px] text-tenue">Imagen o PDF, máximo 5 MB</span>
            <input type="file" required accept="image/*,application/pdf" className="hidden"
              onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} />
          </label>
        )}
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-tenue">Nota para el administrador (opcional)</label>
        <textarea className="campo resize-none" rows={2} value={nota} onChange={(e) => setNota(e.target.value)} />
      </div>

      <button disabled={enviando || bloqueado} className="btn btn-primario w-full">
        {enviando ? <><Loader2 size={15} className="animate-spin" /> Enviando…</>
          : cents ? `Solicitar recarga de ${usd(cents)}` : 'Enviar solicitud'}
      </button>
    </form>
  )
}
