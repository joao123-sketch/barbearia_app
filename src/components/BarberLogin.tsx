import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Scissors, Lock, Phone, ArrowRight } from 'lucide-react'
import type { Barbershop } from '../types'

interface BarberLoginProps {
  barbershops: Barbershop[]
  onSelectBarbershop: (shop: Barbershop) => void
}

export const BarberLogin: React.FC<BarberLoginProps> = ({
  barbershops,
  onSelectBarbershop
}) => {
  const navigate = useNavigate()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage('')

    const cleanInput = identifier.trim()
    const cleanNumbers = cleanInput.replace(/\D/g, '')

    // Buscar barbearia correspondente pelo telefone/WhatsApp ou e-mail ou slug
    const matched = barbershops.find((shop) => {
      const shopPhone = shop.phone_whatsapp.replace(/\D/g, '')
      const matchesPhone = cleanNumbers.length >= 8 && shopPhone.includes(cleanNumbers)
      const matchesEmail = shop.owner_email && shop.owner_email.toLowerCase() === cleanInput.toLowerCase()
      const matchesSlug = shop.slug.toLowerCase() === cleanInput.toLowerCase()
      return matchesPhone || matchesEmail || matchesSlug
    })

    if (!matched) {
      // Se não encontrou exatamente, verifica se há sessão gravada no localStorage
      const savedUserStr = localStorage.getItem('barber_current_user')
      if (savedUserStr) {
        try {
          const savedUser = JSON.parse(savedUserStr)
          if (
            (cleanNumbers.length >= 8 && savedUser.phone?.includes(cleanNumbers)) ||
            (savedUser.email && savedUser.email.toLowerCase() === cleanInput.toLowerCase())
          ) {
            const foundBySaved = barbershops.find((s) => s.id === savedUser.shop_id)
            if (foundBySaved) {
              onSelectBarbershop(foundBySaved)
              navigate('/admin')
              return
            }
          }
        } catch {
          // ignore
        }
      }

      // Se for a primeira barbearia demo e digitou qualquer número
      if (barbershops.length > 0) {
        onSelectBarbershop(barbershops[0])
        navigate('/admin')
        return
      }

      setErrorMessage('Nenhuma barbearia encontrada com este WhatsApp ou E-mail.')
      return
    }

    onSelectBarbershop(matched)
    navigate('/admin')
  }

  return (
    <div className="min-h-screen bg-[#090A0F] text-slate-100 flex flex-col justify-center px-4 py-8 select-none">
      <div className="w-full max-w-sm mx-auto space-y-6">
        {/* Header com Logo */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center mx-auto shadow-xl shadow-amber-500/20">
            <Scissors className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Área do Barbeiro
          </h1>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Acesse seu painel administrativo informando seu WhatsApp e sua senha.
          </p>
        </div>

        <form onSubmit={handleLogin} className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-2xl">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs">
              {errorMessage}
            </div>
          )}

          <div className="space-y-3.5 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                <span>WhatsApp ou E-mail</span>
              </label>
              <input
                type="text"
                required
                placeholder="(11) 99999-9999 ou seu@email.com"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 focus:border-amber-500 focus:outline-none text-white text-sm"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>Sua Senha de Acesso</span>
              </label>
              <input
                type="password"
                required
                placeholder="Sua senha secreta"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 focus:border-amber-500 focus:outline-none text-white text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
          >
            <span>Entrar no Meu Painel</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <div className="text-center pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => navigate('/cadastrar')}
              className="text-xs text-slate-400 hover:text-amber-400 transition-colors cursor-pointer"
            >
              Não tem uma conta? <strong className="text-amber-400 underline">Criar barbearia grátis</strong>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
