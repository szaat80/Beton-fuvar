import React, { useState } from 'react'
import type { Projekt } from '../../core/data/storage'

interface ProjektkezeloProps {
  projektek: Projekt[]
  onSave: (projektek: Projekt[]) => boolean
}

export function Projektkezelo({ projektek, onSave }: ProjektkezeloProps) {
  const [szerkesztettNev, setSzerkesztettNev] = useState<string | null>(null)
  const [nev, setNev] = useState('')
  const [arM3, setArM3] = useState('')
  const [hiba, setHiba] = useState('')

  function uresUrlap() {
    setSzerkesztettNev(null)
    setNev('')
    setArM3('')
    setHiba('')
  }

  function szerkesztes(projekt: Projekt) {
    setSzerkesztettNev(projekt.nev)
    setNev(projekt.nev)
    setArM3(projekt.arM3 === null ? '' : String(projekt.arM3))
    setHiba('')
  }

  function mentes(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const tisztaNev = nev.trim()
    const dij = Number(arM3)
    if (!tisztaNev) {
      setHiba('Add meg a projekt nevét.')
      return
    }
    if (arM3 === '' || !Number.isSafeInteger(dij) || dij <= 0) {
      setHiba('A projekt fix m³ díja pozitív, egész forintösszeg legyen.')
      return
    }
    if (projektek.some((projekt) => projekt.nev !== szerkesztettNev
      && projekt.nev.trim().toLocaleLowerCase('hu-HU') === tisztaNev.toLocaleLowerCase('hu-HU'))) {
      setHiba('Már van ilyen nevű projekt a listában.')
      return
    }
    const frissitett = szerkesztettNev
      ? projektek.map((projekt) => projekt.nev === szerkesztettNev ? { nev: tisztaNev, arM3: dij } : projekt)
      : [...projektek, { nev: tisztaNev, arM3: dij }]
    if (!onSave(frissitett)) return
    uresUrlap()
  }

  function torles(projekt: Projekt) {
    if (window.confirm(`Biztosan törlöd a(z) „${projekt.nev}” projektet?`)) {
      if (onSave(projektek.filter((item) => item.nev !== projekt.nev))) uresUrlap()
    }
  }

  return (
    <details className="project-manager">
      <summary>Projektek kezelése · {projektek.length} db</summary>
      <div className="factory-list">
        {projektek.map((projekt) => (
          <div className="factory-row" key={projekt.nev}>
            <div>
              <strong>{projekt.nev}</strong>
              <span>{projekt.arM3 === null
                ? 'Még nincs fix projektár beállítva'
                : `Fix projektár: ${projekt.arM3.toLocaleString('hu-HU')} Ft/m³ · övezet nélkül`}</span>
            </div>
            <div className="record-actions">
              <button type="button" className="button-secondary" onClick={() => szerkesztes(projekt)}>Szerkesztés</button>
              <button type="button" className="button-danger" onClick={() => torles(projekt)}>Törlés</button>
            </div>
          </div>
        ))}
      </div>
      <form className="factory-form" onSubmit={mentes}>
        <h2>{szerkesztettNev ? 'Projekt módosítása' : 'Új projekt felvitele'}</h2>
        <label className="field">
          <span>Projekt neve</span>
          <input value={nev} onChange={(event) => setNev(event.target.value)} placeholder="Például: Hídépítés" required />
        </label>
        <label className="field">
          <span>Fix projektár (Ft/m³, övezet nélkül)</span>
          <input type="number" min="1" step="1" inputMode="numeric" value={arM3} onChange={(event) => setArM3(event.target.value)} placeholder="Például: 12000" required />
        </label>
        {hiba && <p className="error-text" role="alert">{hiba}</p>}
        <div className="form-actions">
          {szerkesztettNev && <button type="button" className="button-secondary" onClick={uresUrlap}>Mégse</button>}
          <button type="submit" className="button-primary">{szerkesztettNev ? 'Projekt mentése' : 'Projekt hozzáadása'}</button>
        </div>
      </form>
    </details>
  )
}
