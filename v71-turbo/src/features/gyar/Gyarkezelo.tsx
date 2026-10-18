import React, { useState } from 'react'
import type { Gyar, Projekt } from '../../core/data/storage'
import { ZONA_SAVOK } from '../../core/domain/szamitas'
import { dijszabalyEllenorzese, type Dijszabaly } from '../../core/domain/dijszabaly'
import { Ablak } from '../../ui/components/Ablak'
import { Projektkezelo } from './Projektkezelo'

interface GyarkezeloProps {
  gyarak: Gyar[]
  projektek: Projekt[]
  alapMinM3: number
  alapAllasDij: number
  onSave: (gyarak: Gyar[]) => boolean
  onSaveProjects: (projektek: Projekt[]) => boolean
}

export function Gyarkezelo({ gyarak, projektek, alapMinM3, alapAllasDij, onSave, onSaveProjects }: GyarkezeloProps) {
  const [szerkesztettId, setSzerkesztettId] = useState<string | null>(null)
  const [nev, setNev] = useState('')
  const [fuvarAlap, setFuvarAlap] = useState('')
  const [zonaLepes, setZonaLepes] = useState('')
  const [minM3, setMinM3] = useState(String(alapMinM3))
  const [allasDij, setAllasDij] = useState(String(alapAllasDij))
  const [hiba, setHiba] = useState('')
  const [kiallasBe, setKiallasBe] = useState(false)
  const [kiallasKuszob, setKiallasKuszob] = useState('3')
  const [kiallasKevesebb, setKiallasKevesebb] = useState('')
  const [kiallasTobb, setKiallasTobb] = useState('')
  const [ejszakaBe, setEjszakaBe] = useState(false)
  const [ejszakaKezdet, setEjszakaKezdet] = useState('22:00')
  const [ejszakaVeg, setEjszakaVeg] = useState('06:00')
  const [ejszakaPotlek, setEjszakaPotlek] = useState('')
  const [allasOraBe, setAllasOraBe] = useState(false)
  const [elsoOra, setElsoOra] = useState('')
  const [tovabbiOra, setTovabbiOra] = useState('')

  function dijszabalyUrites(szabaly?: Dijszabaly) {
    setKiallasBe(Boolean(szabaly?.kiallas))
    setKiallasKuszob(String(szabaly?.kiallas?.kuszob ?? 3))
    setKiallasKevesebb(szabaly?.kiallas ? String(szabaly.kiallas.dijKevesebb) : '')
    setKiallasTobb(szabaly?.kiallas ? String(szabaly.kiallas.dijTobb) : '')
    setEjszakaBe(Boolean(szabaly?.ejszaka))
    setEjszakaKezdet(szabaly?.ejszaka?.kezdet ?? '22:00')
    setEjszakaVeg(szabaly?.ejszaka?.veg ?? '06:00')
    setEjszakaPotlek(szabaly?.ejszaka ? String(szabaly.ejszaka.potlek) : '')
    setAllasOraBe(Boolean(szabaly?.allasOra))
    setElsoOra(szabaly?.allasOra ? String(szabaly.allasOra.elsoOra) : '')
    setTovabbiOra(szabaly?.allasOra ? String(szabaly.allasOra.tovabbiOra) : '')
  }

  function ujGyar() {
    setSzerkesztettId(null)
    setNev('')
    setFuvarAlap('')
    setZonaLepes('')
    setMinM3(String(alapMinM3))
    setAllasDij(String(alapAllasDij))
    dijszabalyUrites()
    setHiba('')
  }

  function gyarSzerkesztese(gyar: Gyar) {
    setSzerkesztettId(gyar.id)
    setNev(gyar.nev)
    setFuvarAlap(String(gyar.fuvarAlap))
    setZonaLepes(String(gyar.zonaLepes))
    setMinM3(String(gyar.minM3))
    setAllasDij(String(gyar.allasDij))
    dijszabalyUrites(gyar.dijszabaly)
    setHiba('')
  }

  function mentes(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const tisztaNev = nev.trim()
    const ar = Number(fuvarAlap)
    const lepes = Number(zonaLepes)
    const minimum = Number(minM3)
    const varakozasiDij = Number(allasDij)
    if (!tisztaNev) {
      setHiba('Add meg a gyár nevét.')
      return
    }
    if (!Number.isSafeInteger(ar) || ar <= 0) {
      setHiba('A fuvar alapár pozitív, egész forintösszeg legyen.')
      return
    }
    if (zonaLepes === '' || !Number.isSafeInteger(lepes) || lepes < 0) {
      setHiba('Az övezeti lépés nemnegatív, egész forintösszeg legyen.')
      return
    }
    if (minM3 === '' || !Number.isFinite(minimum) || minimum <= 0) {
      setHiba('A minimum mennyiség pozitív m³ érték legyen.')
      return
    }
    if (allasDij === '' || !Number.isSafeInteger(varakozasiDij) || varakozasiDij < 0) {
      setHiba('Az állásidő díja nemnegatív, egész forintösszeg legyen.')
      return
    }
    if (gyarak.some((gyar) => gyar.id !== szerkesztettId && gyar.nev.trim().toLocaleLowerCase('hu-HU') === tisztaNev.toLocaleLowerCase('hu-HU'))) {
      setHiba('Már van ilyen nevű gyár a listában.')
      return
    }

    let dijszabaly: Dijszabaly | undefined
    try {
      dijszabaly = dijszabalyEllenorzese({
        ...(kiallasBe ? { kiallas: { kuszob: Number(kiallasKuszob), dijKevesebb: Number(kiallasKevesebb), dijTobb: Number(kiallasTobb) } } : {}),
        ...(ejszakaBe ? { ejszaka: { kezdet: ejszakaKezdet, veg: ejszakaVeg, potlek: Number(ejszakaPotlek) } } : {}),
        ...(allasOraBe ? { allasOra: { elsoOra: Number(elsoOra), tovabbiOra: Number(tovabbiOra) } } : {})
      })
    } catch (error) {
      setHiba(error instanceof Error ? `${error.message} Minden díj nemnegatív, egész forintösszeg legyen.` : 'A különleges díjak hibásak.')
      return
    }
    if ((kiallasBe && (kiallasKevesebb === '' || kiallasTobb === '')) || (ejszakaBe && ejszakaPotlek === '') || (allasOraBe && (elsoOra === '' || tovabbiOra === ''))) {
      setHiba('A bekapcsolt különleges díjak minden mezőjét töltsd ki.')
      return
    }

    const dijMezo = dijszabaly ? { dijszabaly } : {}
    const ujLista = szerkesztettId
      ? gyarak.map((gyar) => {
        if (gyar.id !== szerkesztettId) return gyar
        const { dijszabaly: _regi, ...alap } = gyar
        return { ...alap, nev: tisztaNev, fuvarAlap: ar, zonaLepes: lepes, minM3: minimum, allasDij: varakozasiDij, ...dijMezo }
      })
      : [...gyarak, { id: globalThis.crypto?.randomUUID?.() ?? `gyar-${Date.now()}`, nev: tisztaNev, fuvarAlap: ar, zonaLepes: lepes, minM3: minimum, allasDij: varakozasiDij, ...dijMezo }]

    if (!onSave(ujLista)) return
    ujGyar()
  }

  return (
    <details className="factory-disclosure">
      <summary>🏭 Gyárak kezelése · {gyarak.length} db</summary>
      <Ablak title="Gyárak kezelése">
      <p className="hint">Az alapár 0–5 km-re érvényes; a díj minden további övezetben a beállított összeggel nő.</p>
      <div className="factory-list">
        {gyarak.map((gyar) => (
          <div className="factory-row" key={gyar.id}>
            <div>
              <strong>{gyar.nev}</strong>
              <span>Alap: {gyar.fuvarAlap.toLocaleString('hu-HU')} Ft/m³</span>
              <span>Övezeti lépés: +{gyar.zonaLepes.toLocaleString('hu-HU')} Ft/m³</span>
              <span>Minimum mennyiség: {gyar.minM3} m³</span>
              <span>Állásidő: {gyar.dijszabaly?.allasOra
                ? `${gyar.dijszabaly.allasOra.elsoOra.toLocaleString('hu-HU')} Ft az első óra, utána ${gyar.dijszabaly.allasOra.tovabbiOra.toLocaleString('hu-HU')} Ft / megkezdett óra`
                : `${gyar.allasDij.toLocaleString('hu-HU')} Ft / 15 perc`}</span>
              {gyar.dijszabaly?.kiallas && <span>Kiállási díj: {gyar.dijszabaly.kiallas.dijKevesebb.toLocaleString('hu-HU')} Ft ({gyar.dijszabaly.kiallas.kuszob} fuvar alatt), {gyar.dijszabaly.kiallas.dijTobb.toLocaleString('hu-HU')} Ft ({gyar.dijszabaly.kiallas.kuszob} fuvartól)</span>}
              {gyar.dijszabaly?.ejszaka && <span>Éjszakai pótlék: +{gyar.dijszabaly.ejszaka.potlek.toLocaleString('hu-HU')} Ft ({gyar.dijszabaly.ejszaka.kezdet}–{gyar.dijszabaly.ejszaka.veg})</span>}
            </div>
            <button type="button" className="button-secondary" onClick={() => gyarSzerkesztese(gyar)}>Szerkesztés</button>
          </div>
        ))}
      </div>

      <form className="factory-form" onSubmit={mentes}>
        <h2>{szerkesztettId ? 'Gyár adatainak módosítása' : 'Új gyár felvitele'}</h2>
        <label className="field">
          <span>Gyár neve</span>
          <input value={nev} onChange={(event) => setNev(event.target.value)} placeholder="Például: Duna Beton" required />
        </label>
        <label className="field">
          <span>Alap fuvarár 0–5 km-re (Ft/m³)</span>
          <input type="number" min="1" step="1" inputMode="numeric" value={fuvarAlap} onChange={(event) => setFuvarAlap(event.target.value)} placeholder="Például: 18500" required />
        </label>
        <label className="field">
          <span>Övezeti lépés (Ft/m³ övezetenként)</span>
          <input type="number" min="0" step="1" inputMode="numeric" value={zonaLepes} onChange={(event) => setZonaLepes(event.target.value)} placeholder="Például: 700" required />
        </label>
        <label className="field">
          <span>Minimum mennyiség (m³)</span>
          <input type="number" min="0.1" step="0.1" inputMode="decimal" value={minM3} onChange={(event) => setMinM3(event.target.value)} required />
        </label>
        <label className="field">
          <span>Állásidő díja (Ft / 15 perc)</span>
          <input type="number" min="0" step="1" inputMode="numeric" value={allasDij} onChange={(event) => setAllasDij(event.target.value)} required />
        </label>
        <fieldset className="field">
          <legend>Különleges díjak (csak ha erre a gyárra érvényes)</legend>
          <label><input type="checkbox" checked={kiallasBe} onChange={(event) => setKiallasBe(event.target.checked)} /> Kiállási díj (naponta egyszer, a nap fuvarszáma szerint)</label>
          {kiallasBe && (
            <>
              <label className="field"><span>Ennyi fuvartól számít „sok”-nak</span>
                <input type="number" min="1" step="1" value={kiallasKuszob} onChange={(event) => setKiallasKuszob(event.target.value)} /></label>
              <label className="field"><span>Díj, ha kevesebb fuvar volt (Ft)</span>
                <input type="number" min="0" step="1" value={kiallasKevesebb} onChange={(event) => setKiallasKevesebb(event.target.value)} /></label>
              <label className="field"><span>Díj, ha elérte a küszöböt (Ft)</span>
                <input type="number" min="0" step="1" value={kiallasTobb} onChange={(event) => setKiallasTobb(event.target.value)} /></label>
            </>
          )}
          <label><input type="checkbox" checked={ejszakaBe} onChange={(event) => setEjszakaBe(event.target.checked)} /> Éjszakai pótlék (fuvaronként)</label>
          {ejszakaBe && (
            <>
              <label className="field"><span>Kezdete</span>
                <input type="time" value={ejszakaKezdet} onChange={(event) => setEjszakaKezdet(event.target.value)} /></label>
              <label className="field"><span>Vége</span>
                <input type="time" value={ejszakaVeg} onChange={(event) => setEjszakaVeg(event.target.value)} /></label>
              <label className="field"><span>Pótlék (Ft / fuvar)</span>
                <input type="number" min="0" step="1" value={ejszakaPotlek} onChange={(event) => setEjszakaPotlek(event.target.value)} /></label>
            </>
          )}
          <label><input type="checkbox" checked={allasOraBe} onChange={(event) => setAllasOraBe(event.target.checked)} /> Állásidő óradíjjal (a 15 perces helyett)</label>
          {allasOraBe && (
            <>
              <label className="field"><span>Első óra díja (Ft)</span>
                <input type="number" min="0" step="1" value={elsoOra} onChange={(event) => setElsoOra(event.target.value)} /></label>
              <label className="field"><span>Minden további megkezdett óra (Ft)</span>
                <input type="number" min="0" step="1" value={tovabbiOra} onChange={(event) => setTovabbiOra(event.target.value)} /></label>
            </>
          )}
        </fieldset>
        <div className="zone-preview">
          {ZONA_SAVOK.map((zona, index) => (
            <div key={zona.also}>
              <span>{zona.also}–{zona.felso} km</span>
              <strong>{(Number(fuvarAlap || 0) + (index + 1) * Number(zonaLepes || 0)).toLocaleString('hu-HU')} Ft/m³</strong>
            </div>
          ))}
        </div>
        {hiba && <p className="error-text" role="alert">{hiba}</p>}
        <div className="form-actions">
          {szerkesztettId && <button type="button" className="button-secondary" onClick={ujGyar}>Mégse</button>}
          <button type="submit" className="button-primary">{szerkesztettId ? 'Módosítás mentése' : 'Gyár hozzáadása'}</button>
        </div>
      </form>
      <Projektkezelo projektek={projektek} onSave={onSaveProjects} />
      </Ablak>
    </details>
  )
}
