import React, { useCallback, useEffect, useState } from 'react'
import { Bell, BellOff, BellRing } from 'lucide-react'
import { currentPushKeys, notificationPermission, pushSupport, subscribePush, unsubscribePush } from '../lib/push'
import { hasAdminPush, removeAdminPush, saveAdminPush, sendAdminTestPush } from '../lib/db'

// Avisos no celular do administrador: uma notificação a cada novo cadastro de negócio, e nenhuma outra
export const AdminNotifications: React.FC = () => {
  const support = pushSupport()
  const [enabled, setEnabled] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [failed, setFailed] = useState(false)

  const refresh = useCallback(async () => {
    if (support !== 'ok') return setEnabled(false)
    try {
      const keys = await currentPushKeys()
      setEnabled(keys ? await hasAdminPush(keys.endpoint) : false)
    } catch {
      setEnabled(false)
    }
  }, [support])

  useEffect(() => {
    refresh()
  }, [refresh])

  const say = (text: string, bad = false) => {
    setMessage(text)
    setFailed(bad)
  }

  const enable = async () => {
    setBusy(true)
    say('')
    try {
      const keys = await subscribePush()
      await saveAdminPush(keys)
      setEnabled(true)
      say('Avisos ativados! Toque em "Enviar aviso de teste" para conferir.')
    } catch (err) {
      say(
        err instanceof Error && err.message === 'permission_denied'
          ? 'As notificações estão bloqueadas. Libere nas configurações do aparelho e tente de novo.'
          : 'Não foi possível ativar agora. Tente de novo.',
        true
      )
    } finally {
      setBusy(false)
    }
  }

  const sendTest = async () => {
    setBusy(true)
    say('')
    try {
      await sendAdminTestPush()
      say('Aviso enviado! Ele deve aparecer em alguns segundos. Se não aparecer, confira a permissão de notificações do app.')
    } catch {
      say('Não foi possível enviar o teste agora. Tente de novo.', true)
    } finally {
      setBusy(false)
    }
  }

  const disable = async () => {
    setBusy(true)
    try {
      const endpoint = await unsubscribePush()
      if (endpoint) await removeAdminPush(endpoint)
      setEnabled(false)
    } finally {
      setBusy(false)
    }
  }

  const blocked = notificationPermission() === 'denied'

  return (
    <section aria-labelledby="avisos-cadastro" className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-xs space-y-3">
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${enabled ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'}`}>
          {enabled ? <BellRing className="w-5 h-5" /> : blocked ? <BellOff className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
        </div>
        <div className="min-w-0">
          <h2 id="avisos-cadastro" className="font-bold text-sm text-white">Avisos de novo cadastro</h2>
          <p className="text-slate-400 mt-0.5 leading-relaxed">
            {enabled
              ? 'Ativados neste aparelho: você recebe uma notificação quando um novo negócio se cadastra. Nenhum outro aviso.'
              : 'Receba no celular uma notificação sempre que um novo negócio se cadastrar. Nenhum outro aviso.'}
          </p>
        </div>
      </div>

      {support === 'ios-install' && (
        <p className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-slate-200 leading-relaxed">
          No iPhone os avisos só funcionam com o app instalado. No Safari, toque em Compartilhar e em "Adicionar à Tela de Início", e
          ative os avisos abrindo o app por esse ícone.
        </p>
      )}
      {support === 'unsupported' && <p className="text-slate-400">Este navegador não permite notificações. Tente pelo Chrome ou pelo Safari.</p>}
      <p role="status" className={failed ? 'text-rose-400' : 'text-slate-300'}>
        {message}
      </p>

      {support === 'ok' && (
        <div className="flex flex-wrap gap-2">
          {enabled ? (
            <>
              <button type="button" onClick={sendTest} disabled={busy} className="min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold cursor-pointer disabled:opacity-60">
                Enviar aviso de teste
              </button>
              <button type="button" onClick={disable} disabled={busy} className="min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 font-bold cursor-pointer disabled:opacity-60">
                Desativar
              </button>
            </>
          ) : (
            <button type="button" onClick={enable} disabled={busy} className="min-h-[44px] px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold cursor-pointer active:scale-95 transition disabled:opacity-60">
              {busy ? 'Ativando…' : 'Ativar avisos'}
            </button>
          )}
        </div>
      )}
    </section>
  )
}
