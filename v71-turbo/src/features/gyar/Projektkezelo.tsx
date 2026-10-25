import React, { useState } from 'react'
import type { Gyar, Projekt } from '../../core/data/storage'

interface ProjektkezeloProps {
  projektek: Projekt[]
  gyarak: Gyar[]
  onSave: (projektek: Projekt[]) => boolean
}

export function Projektkezelo({ projektek, gyarak, onSave }: ProjektkezeloProps) {
  const [szerkesztettProjekt, setSzerkesztettProjekt] = useState<Projekt | null>(null)
  const [gyarId, setGyarId] = useState('')
  const [nev, setNev] = useState('')
  const [arM3, setArM3] = useState('')
  const [hiba, setHiba] = useState('')

  function uresUrlap() {
    setSzerkesztettProjekt(null)
    setGyarId(gyarak[0]?.id ?? '')
    setNev('')
    setArM3('')
    setHiba('')
  }

  function szerkesztes(projekt: Projekt) {
    setSzerkesztettProjekt(projekt)
    setGyarId(projekt.gyarId ?? '')
    setNev(projekt.nev)
    setArM3(projekt.arM3 === null ? '' : String(projekt.arM3))
    setHiba('')
  }

  function mentes(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const tisztaNev = nev.trim()
    const dij = arM3 === '' ? null : Number(arM3)
    if (!gyarak.some((gyar) => gyar.id === gyarId)) {
      setHiba('Válaszd ki, melyik gyárhoz tartozik a projekt.')
      return
    }
    if (!tisztaNev) {
      setHiba('Add meg a projekt nevét.')
      return
    }
    if (dij !== null && (!Number.isSafeInteger(dij) || dij <= 0)) {
      setHiba('A projekt fix m³ díja pozitív, egész forintösszeg legyen, vagy hagyd üresen.')
      return
    }
    if (projektek.some((projekt) => projekt !== szerkesztettProjekt
      && projekt.gyarId === gyarId
      && projekt.nev.trim().toLocaleLowerCase('hu-HU') === tisztaNev.toLocaleLowerCase('hu-HU'))) {
      setHiba('Már van ilyen nevű projekt ennél a gyárnál.')
      return
    }
    const frissitett = szerkesztettProjekt
      ? projektek.map((projekt) => projekt === szerkesztettProjekt
        ? { nev: tisztaNev, arM3: dij, gyarId }
        : projekt)
      : [...projektek, { nev: tisztaNev, arM3: dij, gyarId }]
    if (!onSave(frissitett)) return
    uresUrlap()
  }

  function torles(projekt: Projekt) {
    if (window.confirm(`Biztosan törlöd a(z) „${projekt.nev}” projektet?`)) {
      if (onSave(projektek.filter((item) => item !== projekt))) uresUrlap()
    }
  }

  const hozzarendeletlen = projektek.filter((projekt) => !projekt.gyarId || !gyarak.some((gyar) => gyar.id === projekt.gyarId))

  return (
    <details className="project-manager">
      <summary>Projektek gyáranként · {projektek.length} db</summary>
      <p className="hint">Minden projekt egy gyárhoz tartozik; fuvarrögzítéskor csak az adott gyár projektjei jelennek meg.</p>
      {gyarak.map((gyar) => {
        const gyarProjektjei = projektek.filter((projekt) => projekt.gyarId === gyar.id)
        return (
          <section className="factory-project-group" key={gyar.id} aria-label={`${gyar.nev} projektjei`}>
            <h3>{gyar.nev} · {gyarProjektjei.length} projekt</h3>
            {gyarProjektjei.length === 0
              ? <p className="hint">Ehhez a gyárhoz még nincs projekt rendelve.</p>
              : (
                <div className="factory-list">
                  {gyarProjektjei.map((projekt) => (
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
              )}
            <button type="button" className="button-secondary" onClick={() => {
              uresUrlap()
              setGyarId(gyar.id)
            }}>+ Projekt hozzáadása ehhez a gyárhoz</button>
          </section>
        )
      })}
      {hozzarendeletlen.length > 0 && (
        <section className="factory-project-group" aria-label="Gyárhoz nem rendelt projektek">
          <h3>Gyárhoz nem rendelt régi projektek · {hozzarendeletlen.length} db</h3>
          <p className="hint">A korábban közös projektlistában szereplő elemeket rendeld hozzá a megfelelő gyárhoz.</p>
          <div className="factory-list">
            {hozzarendeletlen.map((projekt) => (
              <div className="factory-row" key={projekt.nev}>
                <div>
                  <strong>{projekt.nev}</strong>
                  <span>{projekt.arM3 === null
                    ? 'Nincs fix projektár'
                    : `Fix projektár: ${projekt.arM3.toLocaleString('hu-HU')} Ft/m³`}</span>
                </div>
                <div className="record-actions">
                  <button type="button" className="button-secondary" onClick={() => szerkesztes(projekt)}>Gyárhoz rendelés</button>
                  <button type="button" className="button-danger" onClick={() => torles(projekt)}>Törlés</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      <form className="factory-form" onSubmit={mentes}>
        <h2>{szerkesztettProjekt ? 'Projekt módosítása' : 'Új projekt felvitele'}</h2>
        <label className="field">
          <span>Projektet kezelő gyár</span>
          <select value={gyarId} onChange={(event) => setGyarId(event.target.value)} required>
            <option value="" disabled>Válassz gyárat</option>
            {gyarak.map((gyar) => <option key={gyar.id} value={gyar.id}>{gyar.nev}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Projekt neve</span>
          <input value={nev} onChange={(event) => setNev(event.target.value)} placeholder="Például: Hídépítés" required />
        </label>
        <label className="field">
          <span>Fix projektár (Ft/m³, opcionális)</span>
          <input type="number" min="1" step="1" inputMode="numeric" value={arM3} onChange={(event) => setArM3(event.target.value)} placeholder="Üresen hagyva a gyár alapára érvényes" />
        </label>
        {hiba && <p className="error-text" role="alert">{hiba}</p>}
        <div className="form-actions">
          {szerkesztettProjekt && <button type="button" className="button-secondary" onClick={uresUrlap}>Mégse</button>}
          <button type="submit" className="button-primary">{szerkesztettProjekt ? 'Projekt mentése' : 'Projekt hozzáadása'}</button>
        </div>
      </form>
    </details>
  )
}
