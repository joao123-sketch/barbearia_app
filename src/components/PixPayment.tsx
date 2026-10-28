import React, { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Check, Copy } from 'lucide-react'
import type { PlatformSettings } from '../lib/platform'
import { buildPixPayload } from '../lib/pix'
import { formatMoney } from '../lib/billing'

interface PixPaymentProps {
  platform: PlatformSettings
  amount: number // valor da mensalidade desta conta
}

// QR Code e "copia e cola" gerados na hora, já com o valor da conta (o cliente só confirma no banco)
export const PixPayment: React.FC<PixPaymentProps> = ({ platform, amount }) => {
  const [qr, setQr] = useState('')
  const [copied, setCopied] = useState<'code' | 'key' | null>(null)

  const payload = platform.pix_key ? buildPixPayload({ key: platform.pix_key, name: platform.pix_name, amount }) : ''

  useEffect(() => {
    if (!payload) {
      setQr('')
      return
    }
    let cancelled = false
    QRCode.toDataURL(payload, { margin: 1, width: 360, errorCorrectionLevel: 'M' })
      .then((url) => !cancelled && setQr(url))
      .catch(() => !cancelled && setQr(''))
    return () => {
      cancelled = true
    }
  }, [payload])

  const copy = async (what: 'code' | 'key') => {
    try {
      await navigator.clipboard.writeText(what === 'code' ? payload : platform.pix_key)
      setCopied(what)
      setTimeout(() => setCopied(null), 2000)
    } catch {
      // sem permissão de área de transferência: a chave continua visível para copiar manualmente
    }
  }

  if (!payload) return <p className="text-xs text-slate-400">O PIX ainda não foi configurado. Fale com o suporte.</p>

  return (
    <div className="space-y-3 text-center">
      <p className="text-xs font-bold text-slate-300">
        Pague <span className="text-amber-300">R$ {formatMoney(amount)}</span> apontando a câmera para o QR Code:
      </p>

      <div className="flex justify-center">
        <div className="p-2.5 rounded-2xl bg-white shadow-xl border-2 border-amber-500/40 inline-block">
          {qr ? (
            <img src={qr} alt={`QR Code PIX de R$ ${formatMoney(amount)}`} width={192} height={192} className="w-48 h-48 object-contain rounded-xl" />
          ) : (
            <div className="w-48 h-48 flex items-center justify-center text-slate-500 text-xs">Gerando QR Code…</div>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => copy('code')}
        className="w-full max-w-sm mx-auto px-3 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition cursor-pointer"
      >
        {copied === 'code' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        <span>{copied === 'code' ? 'Código copiado!' : 'Copiar PIX copia e cola'}</span>
      </button>

      <div className="space-y-1 text-xs">
        <p className="text-slate-400 text-[11px]">Ou pague pela chave PIX (digite o valor R$ {formatMoney(amount)}):</p>
        <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800 max-w-sm mx-auto">
          <span className="font-mono font-bold text-amber-300 text-xs truncate">{platform.pix_key}</span>
          <button
            type="button"
            onClick={() => copy('key')}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1 cursor-pointer shrink-0"
          >
            {copied === 'key' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied === 'key' ? 'Copiado!' : 'Copiar'}</span>
          </button>
        </div>
        <p className="text-[10px] text-slate-500 pt-1">
          Titular: {platform.pix_name}
          {platform.pix_bank ? ` (${platform.pix_bank})` : ''}
        </p>
      </div>
    </div>
  )
}
