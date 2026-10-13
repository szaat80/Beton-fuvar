import React, { useMemo, useState } from 'react'
import type { MunkaidoTetel } from '../../core/data/storage'
import { Ablak } from '../../ui/components/Ablak'

interface JelenletiIvProps {
  bejegyzesek: MunkaidoTetel[]
  munkaltato: string
  dolgozo: string
  onFejlecValtozas: (fejlec: { munkaltato: string; dolgozo: string }) => void
}

function aktualisHonap(): string {
  const datum = new Date()
  return `${datum.getFullYear()}-${String(datum.getMonth() + 1).padStart(2, '0')}`
}

export function JelenletiIv({ bejegyzesek, munkaltato, dolgozo, onFejlecValtozas }: JelenletiIvProps) {
  const [honap, setHonap] = useState(aktualisHonap)
  const haviBejegyzesek = useMemo(
    () => new Map(bejegyzesek.filter((tetel) => tetel.datum.startsWith(honap)).map((tetel) => [tetel.datum, tetel])),
    [bejegyzesek, honap]
  )
  const osszesPerc = [...haviBejegyzesek.values()].reduce((osszeg, tetel) => osszeg + tetel.perc, 0)

  return (
    <details className="attendance-disclosure">
      <summary>Jelenléti ív</summary>
      <Ablak title="Jelenléti ív">
        <div className="attendance-controls">
          <label className="field">
            <span>Munkáltató</span>
            <input value={munkaltato} onChange={(event) => onFejlecValtozas({ munkaltato: event.target.value, dolgozo })} />
          </label>
          <label className="field">
            <span>Dolgozó</span>
            <input value={dolgozo} onChange={(event) => onFejlecValtozas({ munkaltato, dolgozo: event.target.value })} />
          </label>
          <label className="field">
            <span>Hónap</span>
            <input type="month" value={honap} onChange={(event) => setHonap(event.target.value)} />
          </label>
          <button type="button" className="button-primary" onClick={() => window.print()}>Jelenléti ív nyomtatása</button>
        </div>

        <div className="attendance-print-area">
          <h2>JELENLÉTI ÍV</h2>
          <div className="attendance-header">
            <div className="attendance-employer"><strong>Munkáltató</strong><span>{munkaltato}</span></div>
            <div><strong>Dátum</strong><span>{honap}</span></div>
            <div><strong>Dolgozó</strong><span>{dolgozo}</span></div>
          </div>
          <div className="attendance-columns">
            {[0, 16].map((offset) => (
              <table className="attendance-table" key={offset}>
                <tbody>
                  {Array.from({ length: 16 }, (_, index) => {
                    const nap = offset + index + 1
                    const datum = `${honap}-${String(nap).padStart(2, '0')}`
                    const tetel = nap <= 31 ? haviBejegyzesek.get(datum) : undefined
                    return (
                      <React.Fragment key={nap}>
                        <tr>
                          <th rowSpan={2}>{nap}.</th>
                          <td>Érkezett</td>
                          <td>{tetel?.kezdes ?? ''}</td>
                          <td />
                          <td />
                        </tr>
                        <tr>
                          <td>Távozott</td>
                          <td>{tetel?.zaras ?? ''}</td>
                          <td />
                          <td />
                        </tr>
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            ))}
          </div>
          <div className="attendance-total">Ledolgozott idő összesen: {(osszesPerc / 60).toFixed(2)} óra</div>
        </div>
      </Ablak>
    </details>
  )
}
