import React, { useEffect, useMemo, useRef, useState } from 'react'
import { CalendarClock, Check } from 'lucide-react'
import type { Barbershop } from '../types'
import { GRACE_MAX, GRACE_MIN, firstBlockedDate, formatBR, getBillingState, parseGraceInput, todayBR } from '../lib/billing'
import { fetchPlatformSettings, friendlyError, saveGraceDays } from '../lib/db'

interface GraceSettingProps {
  graceDays: number
  barbershops: Barbershop[]
  // chamado com o valor que está valendo no servidor: depois de salvar aqui ou quando outro administrador mudou
  onSaved: (graceDays: number) => void
}

const PRESETS = [0, 3, 7, 10, 15, 30]

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

const PROBLEM: Record<string, string> = {
  empty: 'Digite um número de dias.',
  invalid: 'Use só números.',
  decimal: 'Use um número inteiro de dias, sem vírgula.',
  range: `Use um valor de ${GRACE_MIN} a ${GRACE_MAX} dias.`
}

// Quantos dias de atraso o dono pode ficar sem pagar antes de perder o acesso (vale para todas as contas).
// Mostra o efeito antes de salvar e pede UMA confirmação se a mudança bloquear contas agora ou se for "sem carência".
export const GraceSetting: React.FC<GraceSettingProps> = ({ graceDays, barbershops, onSaved }) => {
  const [text, setText] = useState(String(graceDays))
  const [busy, setBusy] = useState(false)
  const [savedMessage, setSavedMessage] = useState('')
  const [error, setError] = useState('')
  const [today, setToday] = useState(() => todayBR())
  const savedTimer = useRef<number | undefined>(undefined)

  // O valor salvo mudou por fora (outro administrador, recarga): o campo acompanha
  const [seenGrace, setSeenGrace] = useState(graceDays)
  if (graceDays !== seenGrace) {
    setSeenGrace(graceDays)
    setText(String(graceDays))
  }

  // Ao voltar para a aba: o dia do exemplo acompanha e o valor do servidor é relido (outro administrador pode ter mudado)
  useEffect(() => {
    const refresh = () => {
      if (document.hidden) return
      setToday(todayBR())
      fetchPlatformSettings()
        .then((s) => {
          if (s && s.grace_days !== graceDays) onSaved(s.grace_days)
        })
        .catch(() => {})
    }
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [graceDays, onSaved])

  useEffect(() => () => window.clearTimeout(savedTimer.current), [])

  const parsed = parseGraceInput(text)
  const value = parsed.ok ? parsed.value : graceDays
  const changed = parsed.ok && value !== graceDays

  // Quantas contas ficam bloqueadas com cada valor (cálculo igual ao do banco)
  const blockedNow = useMemo(() => barbershops.filter((s) => getBillingState(s, graceDays).status === 'blocked').length, [barbershops, graceDays])
  const blockedWith = useMemo(() => barbershops.filter((s) => getBillingState(s, value).status === 'blocked').length, [barbershops, value])
  const extraBlocked = blockedWith - blockedNow

  const example = firstBlockedDate(today, value)

  const save = async () => {
    if (!parsed.ok) return
    setError('')
    setSavedMessage('')
    const warnings: string[] = []
    if (extraBlocked > 0) warnings.push(`${plural(extraBlocked, 'conta fica bloqueada', 'contas ficam bloqueadas')} agora`)
    if (value === 0) warnings.push('o acesso fecha no dia seguinte ao vencimento para todos os donos')
    if (warnings.length > 0 && !window.confirm(`Com ${plural(value, 'dia', 'dias')} de carência: ${warnings.join(' e ')}. Salvar mesmo assim?`)) return
    setBusy(true)
    try {
      const stored = await saveGraceDays(value)
      setText(String(stored))
      onSaved(stored)
      setSavedMessage('Salvo. Já vale para todos os donos.')
      window.clearTimeout(savedTimer.current)
      savedTimer.current = window.setTimeout(() => setSavedMessage(''), 3500)
    } catch (err) {
      setError(friendlyError(err instanceof Error ? err.message : String(err)))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-labelledby="grace-title" className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4 text-xs">
      <div className="flex items-start gap-2.5">
        <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 shrink-0">
          <CalendarClock className="w-5 h-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h3 id="grace-title" className="font-bold text-sm text-white">
            Carência antes do bloqueio
          </h3>
          <p className="text-slate-400 mt-0.5">
            Dias de atraso que o dono pode ficar sem pagar antes de perder o acesso. Vale para todas as contas, hoje e nas próximas.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="grace-input" className="block text-slate-300 font-semibold mb-1">
            Dias de carência
          </label>
          <input
            id="grace-input"
            name="grace-days"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              setSavedMessage('')
            }}
            aria-invalid={!parsed.ok}
            aria-describedby="grace-effect"
            className="w-28 px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-amber-500 focus:outline-none text-white font-bold text-base"
          />
        </div>
        <button
          type="button"
          onClick={save}
          disabled={busy || !changed}
          className="min-h-[44px] px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black cursor-pointer active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy ? 'Salvando…' : 'Salvar carência'}
        </button>
        {/* região fixa: leitores de tela anunciam o texto quando ele muda */}
        <div role="status" aria-live="polite" className="flex items-center gap-1.5 text-emerald-400 font-bold min-h-[44px]">
          {savedMessage && (
            <>
              <Check className="w-4 h-4" aria-hidden="true" />
              <span>{savedMessage}</span>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Valores usados com frequência">
        {PRESETS.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => {
              setText(String(n))
              setSavedMessage('')
            }}
            aria-pressed={parsed.ok && value === n}
            className={`min-h-[44px] min-w-[44px] px-3 rounded-xl font-bold cursor-pointer transition ${
              parsed.ok && value === n ? 'bg-amber-500 text-slate-950' : 'bg-slate-950 text-slate-300 border border-slate-700 hover:border-amber-500/50'
            }`}
          >
            {n === 0 ? 'Nenhuma' : `${n} dias`}
          </button>
        ))}
      </div>

      <div id="grace-effect" aria-live="polite" className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1 text-slate-300">
        {parsed.ok ? (
          <>
            <p>
              {value === 0
                ? 'Sem carência: o acesso fecha no dia seguinte ao vencimento.'
                : `Com ${plural(value, 'dia', 'dias')} de carência, o acesso fecha no ${value + 1}º dia depois do vencimento.`}{' '}
              <span className="text-slate-400">Quem vence hoje seria bloqueado em {formatBR(example)}.</span>
            </p>
            <p className={extraBlocked > 0 ? 'text-rose-300 font-semibold' : 'text-slate-400'}>
              {blockedWith === 0
                ? 'Nenhuma conta ficaria bloqueada por atraso com este valor.'
                : `${plural(blockedWith, 'conta fica bloqueada', 'contas ficam bloqueadas')} com este valor${changed ? ` (hoje: ${blockedNow})` : ''}.`}
            </p>
          </>
        ) : (
          <p role="alert" className="text-rose-300 font-semibold">
            {PROBLEM[parsed.reason]} A carência continua em {plural(graceDays, 'dia', 'dias')}.
          </p>
        )}
      </div>

      {error && (
        <p role="alert" className="text-rose-300 font-semibold">
          {error}
        </p>
      )}
    </section>
  )
}
