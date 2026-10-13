import React from 'react'
import type { FuvarDraft, Projekt } from '../../core/data/storage'
import { szamitas, zonaLepesekSzama, zonaNovegmenyOsszesen, zonaSavNeve } from '../../core/domain/szamitas'
import { Ablak } from '../../ui/components/Ablak'

export interface FuvarFormState {
  fuvarszam: string
  szallitolevel: string
  cim: string
  gyarId: string
  projekt: string
  m3: string
  km: string
  allasDb: number
}

interface FuvarFormProps {
  value: FuvarFormState
  gyarak: Array<{ id: string; nev: string; fuvarAlap: number; zonaLepes: number; minM3: number; allasDij: number }>
  projektek: Projekt[]
  arszabaly: { fuvarFixDij: number; allasDij: number }
  onChange: (value: FuvarFormState) => void
  onSave: (draft: FuvarDraft) => void
  onCancelEdit: () => void
  editing: boolean
}

export function FuvarForm({
  value, gyarak, projektek, arszabaly, onChange, onSave, onCancelEdit, editing
}: FuvarFormProps) {
  const gyar = gyarak.find((item) => item.id === value.gyarId) ?? gyarak[0]
  const projekt = projektek.find((item) => item.nev === value.projekt)
  const projektDij = projekt?.arM3 ?? null
  const fuvarAlap = projektDij ?? gyar?.fuvarAlap ?? 0
  const zonaLepes = projektDij === null ? gyar?.zonaLepes ?? 0 : 0
  const m3 = value.m3 === '' ? NaN : Number(value.m3)
  const km = value.km === '' ? NaN : Number(value.km)
  const ervenyes = gyar !== undefined
    && Number.isFinite(m3) && m3 > 0
    && Number.isFinite(km) && km >= 0 && km <= 60
    && Number.isInteger(value.allasDb) && value.allasDb >= 0 && value.allasDb <= 20
  const elozetes = ervenyes && gyar
    ? szamitas({
      fuvarAlap,
      zonaLepes,
      minM3: gyar.minM3,
      m3,
      km,
      allasDb: value.allasDb,
      allasDij: gyar.allasDij
    }, arszabaly)
    : undefined

  function mentesFuvar() {
    if (!ervenyes || !gyar || !elozetes) return

    onSave({
      ...value,
      gyarNev: gyar.nev,
      fuvarAlap,
      zonaLepes,
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
          <span>Gyár</span>
          <select value={value.gyarId} onChange={(event) => onChange({ ...value, gyarId: event.target.value })}>
            {gyarak.map((item) => <option key={item.id} value={item.id}>{item.nev} — alap: {item.fuvarAlap.toLocaleString('hu-HU')} Ft/m³</option>)}
          </select>
        </label>
        <label className="field">
          <span>Projekt</span>
          <select value={value.projekt} onChange={(event) => onChange({ ...value, projekt: event.target.value })}>
            <option value="">Nincs kiválasztva</option>
            {projektek.map((item) => <option key={item.nev} value={item.nev}>{item.nev}{item.arM3 === null ? '' : ` — ${item.arM3.toLocaleString('hu-HU')} Ft/m³ fix`}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Beton mennyiség (m³)</span>
          <input type="number" min="0.1" step="0.5" inputMode="decimal" value={value.m3} onChange={(event) => onChange({ ...value, m3: event.target.value })} placeholder="Add meg a mennyiséget" />
        </label>
        <label className="field">
          <span>Távolság (km)</span>
          <input type="number" min="0" max="60" step="0.1" inputMode="decimal" value={value.km} onChange={(event) => onChange({ ...value, km: event.target.value })} placeholder="Add meg a távolságot" />
        </label>
      </div>

      <div className="form-subsection">
        <div className="text-xs text-gray-500 mb-2">Állásidő (15 perc / egység)</div>
        <label className="field">
          <span>Állásidő egységei (15 perc)</span>
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
          {projektDij !== null
            ? <small>{projekt?.nev} projekt fix díja: {projektDij.toLocaleString('hu-HU')} Ft/m³ · övezeti díj nélkül</small>
            : <>
              <small>Távolság: {km.toLocaleString('hu-HU')} km · övezet: {zonaSavNeve(km)}</small>
              <small>Fuvarár: {gyar.fuvarAlap.toLocaleString('hu-HU')} + {zonaLepesekSzama(km)} × {gyar.zonaLepes.toLocaleString('hu-HU')} = {(gyar.fuvarAlap + zonaNovegmenyOsszesen(km, gyar.zonaLepes)).toLocaleString('hu-HU')} Ft/m³</small>
            </>}
          <small>{Math.max(gyar.minM3, m3)} m³ számlázott mennyiség</small>
          {value.allasDb > 0 && <small>Állásidő: {value.allasDb} × 15 perc = {elozetes.allasDij.toLocaleString('hu-HU')} Ft</small>}
          <strong>{elozetes.total.toLocaleString('hu-HU')} Ft</strong>
          {m3 < gyar.minM3 && <small>{gyar.nev} minimum számlázott mennyisége {gyar.minM3} m³.</small>}
        </div>
      )}

      <div className="form-actions">
        {editing && <button type="button" className="button-secondary" onClick={onCancelEdit}>Mégse</button>}
        <button type="button" className="button-primary" disabled={!ervenyes} onClick={mentesFuvar}>
          {editing ? 'Módosítások mentése' : 'Fuvar mentése'}
        </button>
      </div>
      {!ervenyes && <p className="hint">A mentéshez adj meg pozitív betonmennyiséget és 0–60 km közötti távolságot.</p>}
    </Ablak>
  )
}
