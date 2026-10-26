import React, { useCallback, useEffect, useState } from 'react'
import { Bell, BellOff, BellRing } from 'lucide-react'
import {
  currentPushKeys,
  notificationPermission,
  pushSupport,
  showTestNotification,
  subscribePush,
  unsubscribePush
} from '../lib/push'
import { hasOwnerPush, removeOwnerPush, saveOwnerPush } from '../lib/db'

interface OwnerNotificationsProps {
  shopId: string
  // "banner": convite curto na tela Hoje (some depois de ativado). "card": controle completo em Configurações.
  variant: 'banner' | 'card'
}

// Avisos de agendamento novo neste aparelho (push gratuito)
export const OwnerNotifications: React.FC<OwnerNotificationsProps> = ({ shopId, variant }) => {
  const support = pushSupport()
  const [enabled, setEnabled] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const refresh = useCallback(async () => {
    if (support !== 'ok') return setEnabled(false)
    try {
      const keys = await currentPushKeys()
      setEnabled(keys ? await hasOwnerPush(shopId, keys.endpoint) : false)
    } catch {
      setEnabled(false)
    }
  }, [shopId, support])

  useEffect(() => {
    refresh()
  }, [refresh])

  const enable = async () => {
    setBusy(true)
    setMessage('')
    try {
      const keys = await subscribePush()
      await saveOwnerPush(shopId, keys)
      setEnabled(true)
      await showTestNotification().catch(() => {})
    } catch (err) {
      setMessage(
        err instanceof Error && err.message === 'permission_denied'
          ? 'As notificações estão bloqueadas. Libere nas configurações do navegador ou do aparelho e tente de novo.'
          : 'Não foi possível ativar agora. Tente de novo.'
      )
    } finally {
      setBusy(false)
    }
  }

  const disable = async () => {
    setBusy(true)
    try {
      const endpoint = await unsubscribePush()
      if (endpoint) await removeOwnerPush(shopId, endpoint)
      setEnabled(false)
    } finally {
      setBusy(false)
    }
  }

  // O convite curto só aparece enquanto falta ativar
  if (variant === 'banner' && (enabled === null || enabled || support === 'unsupported')) return null

  const blocked = notificationPermission() === 'denied'

  return (
    <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-xs space-y-3">
      <div className="flex items-start gap-3">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
            enabled ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'
          }`}
        >
          {enabled ? <BellRing className="w-5 h-5" /> : blocked ? <BellOff className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
        </div>
        <div className="min-w-0">
          <h4 className="font-bold text-sm text-white">Avisos de novo agendamento</h4>
          <p className="text-slate-400 mt-0.5 leading-relaxed">
            {enabled
              ? 'Ativados neste aparelho: você recebe uma notificação a cada agendamento novo.'
              : 'Receba uma notificação no celular sempre que um cliente marcar um horário.'}
          </p>
        </div>
      </div>

      {support === 'ios-install' && (
        <p className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-slate-200 leading-relaxed">
          No iPhone os avisos só funcionam com o app instalado. Toque no botão do celular lá em cima, siga os passos para
          adicionar na tela de início e ative os avisos abrindo o app por ele.
        </p>
      )}
      {support === 'unsupported' && (
        <p className="text-slate-400">Este navegador não permite notificações. Tente pelo Chrome ou pelo Safari.</p>
      )}
      {message && <p className="text-rose-400">{message}</p>}

      {support === 'ok' && (
        <div className="flex flex-wrap gap-2">
          {enabled ? (
            <>
              <button
                type="button"
                onClick={() => showTestNotification()}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold cursor-pointer"
              >
                Enviar aviso de teste
              </button>
              <button
                type="button"
                onClick={disable}
                disabled={busy}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 font-bold cursor-pointer disabled:opacity-60"
              >
                Desativar
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={enable}
              disabled={busy}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold cursor-pointer active:scale-95 transition-all disabled:opacity-60"
            >
              {busy ? 'Ativando...' : 'Ativar avisos'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
