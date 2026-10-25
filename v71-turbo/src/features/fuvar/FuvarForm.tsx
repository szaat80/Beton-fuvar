import React from 'react'
import type { FuvarDraft, Gyar, Projekt } from '../../core/data/storage'
import { szamitas, zonaLepesekSzama, zonaNovegmenyOsszesen, zonaSavNeve } from '../../core/domain/szamitas'
import { Ablak } from '../../ui/components/Ablak'
import { ikonok } from '../../ui/theme/ikon'

export interface FuvarFormState {
  fuvarszam: string
  szallitolevel: string
  cim: string
  gyarId: string
  projekt: string
  m3: string
  km: string
  allasDb: number
  ejszakai: boolean
  datum: string
}

interface FuvarFormProps {
  value: FuvarFormState
  gyarak: Gyar[]
  projektek: Projekt[]
  onChange: (value: FuvarFormState) => void
  onSave: (draft: FuvarDraft) => void
  onCancelEdit: () => void
  editing: boolean
}

export function FuvarForm({
  value, gyarak, projektek, onChange, onSave, onCancelEdit, editing
}: FuvarFormProps) {
  const gyar = gyarak.find((item) => item.id === value.gyarId) ?? gyarak[0]
  const gyarProjektek = projektek.filter((item) => item.gyarId === gyar?.id)
  const regiProjekt = editing
    ? projektek.find((item) => !item.gyarId && item.nev === value.projekt)
    : undefined
  const projekt = gyarProjektek.find((item) => item.nev === value.projekt) ?? regiProjekt
  const projektDij = projekt?.arM3 ?? null
  const hasNightRate = projektDij === null && gyar?.ejszakaiTarifa !== undefined
  const useNightRate = hasNightRate && value.ejszakai
  const fuvarAlap = projektDij ?? (useNightRate ? gyar?.ejszakaiTarifa?.fuvarAlap : gyar?.fuvarAlap) ?? 0
  const zonaLepes = projektDij === null
    ? (useNightRate ? gyar?.ejszakaiTarifa?.zonaLepes : gyar?.zonaLepes) ?? 0
    : 0
  const m3 = value.m3 === '' ? NaN : Number(value.m3)
  const km = value.km === '' ? NaN : Number(value.km)
  const ervenyes = gyar !== undefined
    && /^\d{4}-\d{2}-\d{2}$/.test(value.datum)
    && Number.isFinite(m3) && m3 > 0
    && Number.isFinite(km) && km >= 0 && km <= 60
    && Number.isInteger(value.allasDb) && value.allasDb >= 0 && value.allasDb <= 20
    && (!value.ejszakai || hasNightRate)
  const elozetes = ervenyes && gyar
    ? szamitas({
      fuvarAlap,
      zonaLepes,
      minM3: gyar.minM3,
      m3,
      km,
      allasDb: value.allasDb,
      allasDij: gyar.allasDij
    })
    : undefined

  function mentesFuvar() {
    if (!ervenyes || !gyar || !elozetes) return

    const { datum, ...urlapAdat } = value
    const letrehozva = new Date(`${datum}T12:00:00`)
    onSave({
      ...urlapAdat,
      ...(Number.isNaN(letrehozva.getTime()) ? {} : { createdAt: letrehozva.toISOString() }),
      gyarNev: gyar.nev,
      fuvarAlap,
      zonaLepes,
      ejszakai: useNightRate,
      projektDij,
      minM3: gyar.minM3,
      m3,
      km,
      ...elozetes
    })
  }

  return (
    <Ablak title={editing ? 'Fuvar szerkesztése' : 'Új fuvar'}>
      <div className="form-grid">
        <label className="field">
          <span>Fuvarlevél száma</span>
          <input value={value.fuvarszam} onChange={(event) => onChange({ ...value, fuvarszam: event.target.value })} placeholder="Opcionális" />
        </label>
        <label className="field">
          <span>Szállítólevél száma</span>
          <input value={value.szallitolevel} onChange={(event) => onChange({ ...value, szallitolevel: event.target.value })} placeholder="Opcionális" />
        </label>
        <label className="field">
          <span>Kiszállítás címe</span>
          <input value={value.cim} onChange={(event) => onChange({ ...value, cim: event.target.value })} placeholder="Utca, házszám, település" autoComplete="street-address" />
        </label>
        <label className="field">
          <span className="field-label"><img src={ikonok.gyar} alt="" />Gyár</span>
          <select value={gyar?.id ?? ''} onChange={(event) => onChange({ ...value, gyarId: event.target.value, projekt: '', ejszakai: false })}>
            {gyarak.map((item) => <option key={item.id} value={item.id}>{item.nev} — alap: {item.fuvarAlap.toLocaleString('hu-HU')} Ft/m³</option>)}
          </select>
        </label>
        <label className="field">
          <span className="field-label"><img src={ikonok.projekt} alt="" />Projekt</span>
          <select value={value.projekt} onChange={(event) => {
            const selectedProject = gyarProjektek.find((item) => item.nev === event.target.value)
            onChange({
              ...value,
              projekt: event.target.value,
              ...(selectedProject && selectedProject.arM3 !== null ? { ejszakai: false } : {})
            })
          }}>
            <option value="">Nincs kiválasztva</option>
            {regiProjekt && <option value={regiProjekt.nev}>{regiProjekt.nev} — régi, még nincs gyárhoz rendelve</option>}
            {gyarProjektek.map((item) => <option key={item.nev} value={item.nev}>{item.nev}{item.arM3 === null ? '' : ` — ${item.arM3.toLocaleString('hu-HU')} Ft/m³ fix`}</option>)}
          </select>
          {gyarProjektek.length === 0 && !regiProjekt && <small className="hint">Ehhez a gyárhoz még nincs projekt rendelve.</small>}
        </label>
        <label className="field">
          <span className="field-label"><img src={ikonok.m3} alt="" />Beton mennyiség (m³)</span>
          <input type="number" min="0.1" step="0.5" inputMode="decimal" value={value.m3} onChange={(event) => onChange({ ...value, m3: event.target.value })} placeholder="Add meg a mennyiséget" />
        </label>
        <label className="field">
          <span>Fuvar napja</span>
          <input type="date" value={value.datum} onChange={(event) => onChange({ ...value, datum: event.target.value })} required />
        </label>
        {projektDij === null && (
        <label className="field night-rate-toggle">
          <span>Éjszakai díjszabás</span>
          <span><input type="checkbox" checked={value.ejszakai} onChange={(event) => onChange({ ...value, ejszakai: event.target.checked })} /> Éjszakai övezeti árak használata</span>
        </label>
        )}
        <label className="field">
          <span className="field-label"><img src={ikonok.km} alt="" />Távolság (km)</span>
          <input type="number" min="0" max="60" step="0.1" inputMode="decimal" value={value.km} onChange={(event) => onChange({ ...value, km: event.target.value })} placeholder="Add meg a távolságot" />
        </label>
      </div>

      <div className="form-subsection">
        <div className="field-label text-xs text-gray-500 mb-2"><img src={ikonok.allas} alt="" />Állásidő (15 perc / egység)</div>
        <label className="field">
          <span className="field-label"><img src={ikonok.allas} alt="" />Állásidő egységei (15 perc)</span>
          <select value={value.allasDb} onChange={(event) => onChange({ ...value, allasDb: Number(event.target.value) })}>
            {Array.from({ length: 21 }, (_, number) => (
              <option key={number} value={number}>{number === 0 ? 'Nincs állásidő' : `${number} × 15 perc (${number / 4} óra)`}</option>
            ))}
          </select>
        </label>
      </div>

      {ervenyes && gyar && elozetes && (
        <div className="quote-summary" aria-live="polite">
          <span>Számított végösszeg</span>
          {useNightRate && <small className="chip" style={{ fontWeight: 700 }}>🌙 ÉJSZAKAI ÖVEZETI DÍJSZABÁS</small>}
          {projektDij !== null
            ? <small>{projekt?.nev} projekt fix díja: {projektDij.toLocaleString('hu-HU')} Ft/m³ · övezeti díj nélkül</small>
            : <>
              <small>Távolság: {km.toLocaleString('hu-HU')} km · övezet: {zonaSavNeve(km)}</small>
              <small>Fuvarár: {fuvarAlap.toLocaleString('hu-HU')} + {zonaLepesekSzama(km)} × {zonaLepes.toLocaleString('hu-HU')} = {(fuvarAlap + zonaNovegmenyOsszesen(km, zonaLepes)).toLocaleString('hu-HU')} Ft/m³</small>
            </>}
          <small>{Math.max(gyar.minM3, m3)} m³ számlázott mennyiség</small>
          {value.allasDb > 0 && <small>Állásidő: {value.allasDb * 15} perc = {elozetes.allasDij.toLocaleString('hu-HU')} Ft</small>}
          <strong>{elozetes.total.toLocaleString('hu-HU')} Ft</strong>
          {m3 < gyar.minM3 && <small>{gyar.nev} minimum számlázott mennyisége {gyar.minM3} m³.</small>}
        </div>
      )}

      <div className="form-actions">
        <button type="button" className="button-secondary" onClick={onCancelEdit}>Mégse / vissza</button>
        <button type="button" className="button-primary" disabled={!ervenyes} onClick={mentesFuvar}>
          {editing ? 'Módosítások mentése' : 'Fuvar mentése'}
        </button>
      </div>
      {value.ejszakai && !hasNightRate
        ? <p className="error-text" role="alert">Ehhez a gyárhoz még nincs éjszakai tarifa. Kérd az irodát, hogy küldje ki az éjszakai övezeti árakat.</p>
        : !ervenyes && <p className="hint">A mentéshez adj meg pozitív betonmennyiséget és 0–60 km közötti távolságot.</p>}
    </Ablak>
  )
}
