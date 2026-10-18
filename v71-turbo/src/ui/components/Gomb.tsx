// GOMBOK - KINÉZET EGY HELYEN
import React from 'react'

interface GombProps {
  aktiv: boolean
  children: React.ReactNode
  onClick?: () => void
}

export function Gomb({ aktiv, children, onClick }: GombProps) {
  return (
    <button onClick={onClick} className={`px-4 py-2.5 rounded-xl text-sm font-bold border transition ${aktiv ? 'bg-black text-white border-black' : 'bg-white text-black border-gray-200'}`}>
      {children}
    </button>
  )
}
