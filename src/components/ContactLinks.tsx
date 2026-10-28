import React from 'react'
import { Mail } from 'lucide-react'
import { SUPPORT_CONTACTS, instagramDisplay, instagramUrl, mailtoUrl, whatsappDisplay, whatsappUrl } from '../lib/contacts'
import { InstagramIcon, WhatsAppIcon } from './BrandIcons'

interface ContactLinksProps {
  // landing: os três canais com o dado visível (rodapé da página inicial)
  // panel: os três canais como botões, para o painel do dono e a tela de bloqueio
  // inline: uma linha de texto discreta ("Precisa de ajuda?"), para telas de entrada
  variant: 'landing' | 'panel' | 'inline'
  // panel: "solid" destaca o WhatsApp em verde; "quiet" deixa os três com o mesmo peso
  emphasis?: 'solid' | 'quiet'
  whatsappMessage?: string
  emailSubject?: string
  emailBody?: string
}

// Avisa quem usa leitor de tela que o link sai da página
const NewTab: React.FC = () => <span className="sr-only"> (abre em nova aba)</span>

// Links clicáveis do suporte: abrem o WhatsApp, o programa de e-mail e o perfil do Instagram.
// É o único componente de contato do app; os dados vêm de src/lib/contacts.ts.
export const ContactLinks: React.FC<ContactLinksProps> = ({
  variant,
  emphasis = 'solid',
  whatsappMessage = 'Olá! Quero saber mais sobre o SuaAgenda.',
  emailSubject = 'Dúvida sobre o SuaAgenda',
  emailBody
}) => {
  const wa = whatsappUrl(whatsappMessage)
  const mail = mailtoUrl(emailSubject, emailBody)
  const ig = instagramUrl()

  if (variant === 'inline') {
    const link = 'inline-flex items-center min-h-[44px] px-2 font-semibold text-amber-400 hover:underline'
    return (
      <p className="flex flex-wrap items-center justify-center gap-x-0.5 text-center text-xs text-slate-400">
        <span className="mr-1">Precisa de ajuda?</span>
        <a href={wa} target="_blank" rel="noopener noreferrer" className={link}>
          WhatsApp
          <NewTab />
        </a>
        <span aria-hidden="true">·</span>
        <a href={mail} className={link}>
          E-mail
        </a>
        <span aria-hidden="true">·</span>
        <a href={ig} target="_blank" rel="noopener noreferrer" className={link}>
          Instagram
          <NewTab />
        </a>
      </p>
    )
  }

  if (variant === 'panel') {
    const secondary =
      'flex-1 min-h-[44px] px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 transition-colors'
    const whatsappClass =
      emphasis === 'solid'
        ? 'w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-95 transition'
        : 'w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition-colors'
    return (
      <div className="space-y-2">
        <a href={wa} target="_blank" rel="noopener noreferrer" className={whatsappClass}>
          <WhatsAppIcon className="w-4 h-4" />
          <span>Falar com o suporte no WhatsApp</span>
          <NewTab />
        </a>
        <div className="flex flex-col sm:flex-row gap-2">
          <a href={mail} className={secondary}>
            <Mail className="w-4 h-4 text-amber-400" aria-hidden="true" />
            <span>Enviar e-mail</span>
          </a>
          <a href={ig} target="_blank" rel="noopener noreferrer" className={secondary}>
            <InstagramIcon className="w-4 h-4 text-amber-400" />
            <span>{instagramDisplay()} no Instagram</span>
            <NewTab />
          </a>
        </div>
      </div>
    )
  }

  return (
    <ul className="lp-contacts">
      <li>
        <a href={wa} target="_blank" rel="noopener noreferrer">
          <WhatsAppIcon className="lp-ico" />
          <span>
            WhatsApp <strong>{whatsappDisplay()}</strong>
            <NewTab />
          </span>
        </a>
      </li>
      <li>
        <a href={mail}>
          <Mail className="lp-ico" aria-hidden="true" />
          <span>
            E-mail <strong>{SUPPORT_CONTACTS.email}</strong>
          </span>
        </a>
      </li>
      <li>
        <a href={ig} target="_blank" rel="noopener noreferrer">
          <InstagramIcon className="lp-ico" />
          <span>
            Instagram <strong>{instagramDisplay()}</strong>
            <NewTab />
          </span>
        </a>
      </li>
    </ul>
  )
}
