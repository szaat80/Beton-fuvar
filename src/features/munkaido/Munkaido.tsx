import React, { useState } from 'react'
import type { MunkaidoTetel, MunkaidoTetelDraft, MunkaTipus } from '../../core/data/storage'
import { Ablak } from '../../ui/components/Ablak'
import { ikonok } from '../../ui/theme/ikon'

interface MunkaidoProps {
  bejegyzesek: MunkaidoTetel[]
  onSaveWork: (tetel: MunkaidoTetelDraft) => boolean
}

function maiDatum(): string {
  const datum = new Date()
  const helyi = new Date(datum.getTime() - datum.getTimezoneOffset() * 60000)
  return helyi.toISOString().slice(0, 10)
}

export function MunkaidoAblak({ bejegyzesek, onSaveWork }: MunkaidoProps) {
  const [tipus, setTipus] = useState<MunkaTipus>('fuvarozas')
  const [datum, setDatum] = useState(maiDatum)
  const [kezdes, setKezdes] = useState('')
  const [zaras, setZaras] = useState('')
  const [oraber, setOraber] = useState('')
  const [hiba, setHiba] = useState('')

  function munkaidoPercben(): number | null {
    if (!kezdes || !zaras) return null
    const [kezdesOra, kezdesPerc] = kezdes.split(':').map(Number)
    const [zarasOra, zarasPerc] = zaras.split(':').map(Number)
    let perc = (zarasOra * 60 + zarasPerc) - (kezdesOra * 60 + kezdesPerc)
    if (perc < 0) perc += 24 * 60
    return perc
  }

  const perc = munkaidoPercben()
  const ervenyesOraber = oraber !== '' && Number.isSafeInteger(Number(oraber)) && Number(oraber) > 0
  const dij = tipus === 'muhely' && perc !== null && ervenyesOraber
    ? Math.round(perc * Number(oraber) / 60)
    : null

  const meglevo = bejegyzesek.find((bejegyzes) => bejegyzes.datum === datum)

  function meglevoBetoltese() {
    if (!meglevo) return
    setTipus(meglevo.tipus)
    setKezdes(meglevo.kezdes)
    setZaras(meglevo.zaras)
    setOraber(meglevo.oraber === null ? '' : String(meglevo.oraber))
    setHiba('')
  }

  function munkaidoMentese() {
    if (perc === null || perc <= 0 || (tipus === 'muhely' && (!ervenyesOraber || dij === null))) {
      setHiba('Adj meg érvényes dátumot, kezdést és zárást; műhely esetén pozitív órabért is.')
      return
    }
    const sikeres = onSaveWork({
      datum,
      tipus,
      kezdes,
      zaras,
      perc,
      oraber: tipus === 'muhely' ? Number(oraber) : null,
      total: tipus === 'muhely' ? dij ?? 0 : 0
    })
    if (sikeres) {
      setKezdes('')
      setZaras('')
      setOraber('')
      setHiba('')
    }
  }

  return (
    <Ablak title={<span className="label-with-icon"><img src={ikonok.munkaido} alt="" />Munkaidő-számoló</span>}>
      <div className="space-y-3">
        <label className="field">
          <span>Munka típusa</span>
          <select value={tipus} onChange={(event) => {
            const valasztott = event.target.value
            if (valasztott === 'fuvarozas' || valasztott === 'muhely') setTipus(valasztott)
            setHiba('')
          }}>
            <option value="fuvarozas">Fuvarozás</option>
            <option value="muhely">Műhely</option>
          </select>
        </label>

        <label className="field">
          <span>Nap</span>
          <input type="date" value={datum} onChange={(event) => setDatum(event.target.value)} />
        </label>

        <div className="form-grid">
          <label className="field">
            <span>Kezdés</span>
            <input type="time" value={kezdes} onChange={(event) => setKezdes(event.target.value)} />
          </label>
          <label className="field">
            <span>Zárás</span>
            <input type="time" value={zaras} onChange={(event) => setZaras(event.target.value)} />
          </label>
        </div>

        {tipus === 'muhely' && (
          <label className="field">
            <span>Órabér (Ft/óra)</span>
            <input
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              value={oraber}
              onChange={(event) => setOraber(event.target.value)}
              placeholder="Add meg a műhely órabérét"
            />
          </label>
        )}

        {perc !== null && (
          <div className="quote-summary" aria-live="polite">
            <span>{tipus === 'fuvarozas' ? 'Fuvarozási munkaidő' : 'Műhely munkaidő'}</span>
            <strong>{(perc / 60).toFixed(2)} óra ({perc} perc)</strong>
            <small>{kezdes}–{zaras} · szünetlevonás nélkül</small>
            {tipus === 'fuvarozas' && <small>Ehhez a munkaidőhöz nem tartozik díjszámítás.</small>}
            {tipus === 'muhely' && dij !== null && (
              <>
                <small>Műhelydíj: {(perc / 60).toFixed(2)} óra × {Number(oraber).toLocaleString('hu-HU')} Ft/óra</small>
                <strong>{dij.toLocaleString('hu-HU')} Ft · külön műhelybevétel</strong>
              </>
            )}
          </div>
        )}

        {meglevo && (
          <div className="attendance-existing" role="status">
            <p className="hint">Erre a napra már van {meglevo.tipus === 'muhely' ? 'műhely' : 'fuvarozási'} bejegyzés. Mentéskor a napi jelenléti sort frissíted.</p>
            <button type="button" className="button-secondary" onClick={meglevoBetoltese}>Napi bejegyzés betöltése</button>
          </div>
        )}
        {hiba && <p className="error-text" role="alert">{hiba}</p>}
        <div className="form-actions">
          <button
            type="button"
            className="button-primary"
            disabled={!datum || perc === null || perc <= 0 || (tipus === 'muhely' && dij === null)}
            onClick={munkaidoMentese}
          >
            {meglevo ? 'Napi jelenlét frissítése' : 'Jelenlét mentése'}
          </button>
        </div>
        {perc === null && <p className="hint">Az időeredményhez add meg a kezdést és a zárást.</p>}
      </div>
    </Ablak>
  )
}
