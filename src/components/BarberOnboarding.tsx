import React, { useEffect, useState } from 'react'
import { Scissors, Store, User, Mail, Lock, Phone, Sparkles, Calendar } from 'lucide-react'
import type { BusinessType } from '../types'
import { accountExists, signUp, trialAlreadyUsed, useSession } from '../lib/auth'
import { PasswordInput } from './PasswordInput'
import { defaultWorkingHours, fetchMonthlyFee, friendlyError, registerBarbershop, saveWorkingHours } from '../lib/db'
import { getTerms } from '../lib/terms'
import { INVALID_MOBILE_MESSAGE, formatPhoneInput, isValidEmail, isValidMobile, normalizeEmail, normalizePhone, toWaNumber } from '../lib/phone'
import { SITE_URL, SUPPORT_EMAIL, SUPPORT_WHATSAPP } from '../lib/platform'
import { TRIAL_DAYS, formatMoney } from '../lib/billing'
import { findFreeSlug, slugify } from '../lib/slug'
import { buildShopTheme, getModeFor, shopThemeAttrs, useShopChrome } from '../lib/shopTheme'

interface BarberOnboardingProps {
  onBack: () => void
  onRegistered: () => Promise<void>
}

// Campos com 16px: abaixo disso o iPhone dá zoom ao tocar no campo
const fieldClass =
  'w-full px-3.5 py-3 rounded-xl bg-slate-800 border border-slate-700 focus:border-amber-500 focus:outline-none text-white text-base'

export const BarberOnboarding: React.FC<BarberOnboardingProps> = ({ onBack, onRegistered }) => {
  // Já logado (criou a conta mas não terminou o negócio): não pede e-mail e senha de novo
  const { session } = useSession()
  const loggedEmail = session?.user.email
  const [submitting, setSubmitting] = useState(false)

  // Só o essencial: o resto (endereço, logo, tema, slogan, Instagram, equipe) fica para o painel
  const [businessType, setBusinessType] = useState<BusinessType | null>(null)
  const [ownerName, setOwnerName] = useState('')
  const [shopName, setShopName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const terms = getTerms(businessType ?? undefined)

  const [baseFee, setBaseFee] = useState<number | null>(null)
  useEffect(() => {
    fetchMonthlyFee().then(setBaseFee).catch(() => setBaseFee(null))
  }, [])

  // Visual neutro até o dono escolher outro no painel
  useShopChrome('neutro', getModeFor('neutro', null))

  // Conta já existente com este WhatsApp ou e-mail: sugere entrar em vez de cadastrar de novo
  const [existing, setExisting] = useState<'phone' | 'email' | null>(null)
  useEffect(() => {
    const phoneOk = isValidMobile(phone)
    const emailOk = !loggedEmail && isValidEmail(email)
    if (!phoneOk && !emailOk) {
      setExisting(null)
      return
    }
    // Resposta de uma consulta antiga (número que já foi trocado) não pode mais mexer no aviso
    let stale = false
    const timer = window.setTimeout(async () => {
      let found: 'phone' | 'email' | null = null
      if (phoneOk && (await accountExists(phone, undefined))) found = 'phone'
      else if (emailOk && (await accountExists(undefined, email))) found = 'email'
      if (!stale) setExisting(found)
    }, 400)
    return () => {
      stale = true
      window.clearTimeout(timer)
    }
  }, [phone, email, loggedEmail])
  const existingAccount = existing !== null
  const existingByPhone = existing === 'phone'

  // Este WhatsApp ou e-mail já usou o teste grátis (conta apagada antes, por exemplo)? Avisa antes de criar
  const [trialUsed, setTrialUsed] = useState(false)
  useEffect(() => {
    const phoneOk = isValidMobile(phone)
    const emailToCheck = loggedEmail ?? email
    const emailOk = isValidEmail(emailToCheck)
    if (!phoneOk && !emailOk) {
      setTrialUsed(false)
      return
    }
    let stale = false
    const timer = window.setTimeout(() => {
      trialAlreadyUsed(phoneOk ? phone : undefined, emailOk ? emailToCheck : undefined)
        .then((used) => !stale && setTrialUsed(used))
        .catch(() => !stale && setTrialUsed(false))
    }, 400)
    return () => {
      stale = true
      window.clearTimeout(timer)
    }
  }, [phone, email, loggedEmail])

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value
    setPhone((prev) => formatPhoneInput(next, prev))
  }

  const handleFinishRegistration = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!businessType) {
      alert('Escolha se o seu negócio é uma barbearia ou um salão de beleza.')
      return
    }
    if (!ownerName.trim()) {
      alert('Por favor, informe o seu nome completo.')
      return
    }
    if (!shopName.trim()) {
      alert('Por favor, informe o nome do seu negócio.')
      return
    }
    if (!isValidMobile(phone)) {
      alert(INVALID_MOBILE_MESSAGE)
      return
    }
    if (!loggedEmail && !isValidEmail(email)) {
      alert('Informe um e-mail válido. Ele é usado para recuperar a sua senha.')
      return
    }
    if (!loggedEmail && password.length < 6) {
      alert('Crie uma senha com no mínimo 6 caracteres.')
      return
    }

    setSubmitting(true)
    try {
      // Confere de novo com o banco, com o número e e-mail que estão no formulário agora (o aviso na tela pode estar atrasado)
      const phoneTaken = await accountExists(phone, undefined)
      const emailTaken = !phoneTaken && !loggedEmail && (await accountExists(undefined, email))
      if (phoneTaken || emailTaken) {
        setExisting(phoneTaken ? 'phone' : 'email')
        alert(
          `Já existe uma conta com ${phoneTaken ? 'este WhatsApp' : 'este e-mail'}. Toque em "Entrar" para acessar a sua conta.`
        )
        setSubmitting(false)
        return
      }
      setExisting(null)

      // 1) cria o login (e-mail + senha) se ainda não estiver logado
      if (!loggedEmail) await signUp(email, password)

      // 2) o banco cria o negócio: 20 dias grátis, ou pagamento antes se este WhatsApp ou e-mail já usou o teste
      const shopId = await registerBarbershop(
        {
          business_type: businessType,
          name: shopName.trim(),
          slug: await findFreeSlug(shopName),
          owner_name: ownerName.trim(),
          slogan: terms.defaultSlogan,
          phone_whatsapp: normalizePhone(phone),
          style_preset: 'neutro'
        },
        []
      )

      // 3) horário de funcionamento inicial (o dono ajusta depois no painel)
      await saveWorkingHours(shopId, defaultWorkingHours())
      await onRegistered()
    } catch (err) {
      alert(friendlyError(err instanceof Error ? err.message : String(err)))
      setSubmitting(false)
    }
  }

  const previewSlug = slugify(shopName)

  return (
    <div
      {...shopThemeAttrs('neutro')}
      style={buildShopTheme('neutro', getModeFor('neutro', null))}
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center px-4 py-6 transition-colors"
    >
      <div className="w-full max-w-lg mx-auto space-y-5">
        <div className="text-center space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Cadastre seu negócio</h1>
          <p className="text-sm font-bold text-amber-400">{TRIAL_DAYS} dias grátis · sem cartão · sem fidelidade</p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Leva menos de 1 minuto. Endereço, logo e o resto você completa depois, direto no seu painel.
          </p>
        </div>

        <form onSubmit={handleFinishRegistration} className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-2xl">
          {/* TIPO DE NEGÓCIO */}
          <div className="space-y-2">
            <p className="text-slate-200 font-semibold flex items-center gap-1.5 text-sm">
              <Store className="w-4 h-4 text-amber-400" />
              <span>Qual é o seu negócio? *</span>
            </p>
            <div className="grid grid-cols-2 gap-2">
              {([
                { id: 'barbearia', label: 'Barbearia', icon: '💈' },
                { id: 'salao', label: 'Salão de Beleza', icon: '💇‍♀️' }
              ] as const).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setBusinessType(opt.id)}
                  className={`p-3 rounded-xl border text-center transition cursor-pointer ${
                    businessType === opt.id
                      ? 'bg-slate-900 border-amber-400 ring-2 ring-amber-400/30 shadow-lg'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <span className="text-xl block">{opt.icon}</span>
                  <span className={`text-sm font-bold ${businessType === opt.id ? 'text-white' : 'text-slate-300'}`}>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3.5 text-sm">
            <div>
              <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5" htmlFor="onb-nome">
                <User className="w-3.5 h-3.5 text-amber-400" />
                <span>Seu nome *</span>
              </label>
              <input name="name" autoComplete="name" id="onb-nome"
                type="text"
                required
                placeholder="Ex: Carlos Eduardo Silva"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className={fieldClass}
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5" htmlFor="onb-negocio">
                <Scissors className="w-3.5 h-3.5 text-amber-400" />
                <span>{`Nome ${businessType === 'salao' ? 'do Salão' : businessType === 'barbearia' ? 'da Barbearia' : 'do Negócio'} *`}</span>
              </label>
              <input name="shop-name" autoComplete="organization" id="onb-negocio"
                type="text"
                required
                placeholder={businessType === 'salao' ? 'Ex: Studio Bela Vida' : 'Ex: Barbearia Black Diamond'}
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className={fieldClass}
              />
              {previewSlug && (
                <p className="mt-1.5 text-[11px] text-slate-400 break-all">
                  Seu link de agendamento: <span className="font-mono text-amber-300">{SITE_URL.replace('https://', '')}/b/{previewSlug}</span>
                  <br />
                  <span className="text-slate-500">Você pode mudar o link depois, no painel.</span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5" htmlFor="onb-fone">
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                <span>WhatsApp com DDD *</span>
              </label>
              <input name="phone" autoComplete="tel-national" id="onb-fone"
                type="tel"
                inputMode="numeric"
                required
                placeholder="(11) 99999-9999"
                value={phone}
                onChange={handlePhoneChange}
                className={`${fieldClass} font-mono`}
              />
            </div>

            {!loggedEmail && (
              <div>
                <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5" htmlFor="onb-email">
                  <Mail className="w-3.5 h-3.5 text-blue-400" />
                  <span>E-mail *</span>
                </label>
                <input name="email" autoComplete="email" id="onb-email"
                  type="email"
                  required
                  placeholder="seuemail@gmail.com"
                  value={email}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  inputMode="email"
                  onChange={(e) => setEmail(normalizeEmail(e.target.value))}
                  className={fieldClass}
                />
              </div>
            )}

            {!loggedEmail && (
              <div>
                <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5" htmlFor="onb-senha">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Criar senha de acesso *</span>
                </label>
                <PasswordInput name="password" id="onb-senha"
                  required
                  autoComplete="new-password"
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  inputClassName={fieldClass}
                />
                <span className="text-[11px] text-amber-300/80 mt-1 block">Você entra com seu e-mail ou WhatsApp e esta senha.</span>
              </div>
            )}

            {trialUsed && !existingAccount && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/40 text-xs text-slate-200 leading-relaxed">
                <strong className="text-amber-300">Este WhatsApp ou e-mail já usou o teste grátis.</strong> Você pode criar a
                conta normalmente, mas sem os {TRIAL_DAYS} dias grátis: o acesso é liberado depois do pagamento da primeira
                mensalidade{baseFee !== null ? ` (R$ ${formatMoney(baseFee)})` : ''}. Depois de criar, você paga por PIX ou
                fala com o nosso suporte por{' '}
                <a href={`mailto:${SUPPORT_EMAIL}`} className="text-amber-300 underline">e-mail</a> ou{' '}
                <a
                  href={`https://wa.me/${toWaNumber(SUPPORT_WHATSAPP)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-300 underline"
                >
                  WhatsApp
                </a>
                .
              </div>
            )}

            {existingAccount && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/40 text-xs space-y-2">
                <p className="text-slate-200">
                  Já existe uma conta com {existingByPhone ? 'este WhatsApp' : 'este e-mail'}. Que tal entrar nela?
                </p>
                <button
                  type="button"
                  onClick={onBack}
                  className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs cursor-pointer active:scale-95 transition"
                >
                  Entrar na minha conta
                </button>
              </div>
            )}
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-1">
            <p className="text-slate-200 font-semibold flex items-center gap-1.5 text-sm">
              <Calendar className="w-4 h-4 text-amber-400" />
              <span>{TRIAL_DAYS} dias grátis para testar</span>
            </p>
            <p className="text-xs text-slate-300">
              Depois, a mensalidade é de <strong className="text-amber-400">{baseFee !== null ? `R$ ${formatMoney(baseFee)}` : 'o valor da mensalidade'}</strong>, paga antecipadamente por PIX a cada 30 dias. Sem fidelidade.
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-black text-base flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 active:scale-95 transition cursor-pointer disabled:opacity-60"
          >
            <Sparkles className="w-4 h-4" />
            <span>{submitting ? 'Criando sua conta…' : 'Criar minha conta'}</span>
          </button>

          <div className="text-center pt-1">
            <button
              type="button"
              onClick={onBack}
              className="text-sm text-slate-400 hover:text-amber-400 transition-colors cursor-pointer"
            >
              Já tem conta? <strong className="text-amber-400 underline">Entrar</strong>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
