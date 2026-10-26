import React, { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  inputClassName?: string
}

// Campo de senha com o botão de mostrar/ocultar: evita errar a digitação, principalmente no celular
export const PasswordInput: React.FC<Props> = ({ inputClassName = '', className = '', ...rest }) => {
  const [visible, setVisible] = useState(false)
  return (
    <div className={`relative ${className}`}>
      <input
        {...rest}
        type={visible ? 'text' : 'password'}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        className={`${inputClassName} pr-12`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
        className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
      >
        {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  )
}
