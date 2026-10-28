import React, { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, Check } from 'lucide-react'
import { adminFetchAlerts, adminResolveAlert, friendlyError, type AdminAlert } from '../lib/db'

const REFRESH_MS = 60000

// Avisos de falha do pagamento automático para o administrador. Some quando você marca como resolvido.
export const MasterAlerts: React.FC = () => {
  const [alerts, setAlerts] = useState<AdminAlert[]>([])

  const load = useCallback(async () => {
    try {
      setAlerts(await adminFetchAlerts())
    } catch {
      // a migração dos alertas pode não ter sido aplicada ainda: o painel segue sem eles
      setAlerts([])
    }
  }, [])

  useEffect(() => {
    load()
    const timer = window.setInterval(() => {
      if (!document.hidden) load()
    }, REFRESH_MS)
    return () => window.clearInterval(timer)
  }, [load])

  const resolve = async (id: number) => {
    try {
      await adminResolveAlert(id)
      await load()
    } catch (err) {
      alert(friendlyError(err instanceof Error ? err.message : String(err)))
    }
  }

  if (alerts.length === 0) return null

  return (
    <section aria-label="Alertas do pagamento automático" className="space-y-2">
      {alerts.map((a) => (
        <div key={a.id} role="alert" className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/50 text-xs space-y-2">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="font-bold text-sm text-rose-200">{a.message}</p>
              <p className="text-slate-400 mt-1">
                {a.occurrences > 1 ? `Aconteceu ${a.occurrences} vezes. ` : ''}
                Último aviso em {new Date(a.last_at).toLocaleString('pt-BR')}.
              </p>
              {a.detail && <p className="text-slate-500 mt-1 break-words font-mono text-[11px]">{a.detail}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={() => resolve(a.id)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Marcar como resolvido</span>
          </button>
        </div>
      ))}
    </section>
  )
}
