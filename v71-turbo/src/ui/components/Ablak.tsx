// ABLAK ALAP - ÚJ ABLAKOT ITT MÁSOLSZ
import React from 'react'

export function Ablak({ title, children }: { title: React.ReactNode, children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border p-4 mb-3 ablak">
      <div className="ablak-title">{title}</div>
      {children}
    </div>
  )
}

// Példa: új ablak hozzáadása
// export function UjAblakom() { return <Ablak title="Új funkció">...</Ablak> }
