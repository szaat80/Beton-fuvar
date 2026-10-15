import React, { useMemo, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { Directory, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import type { FuvarRecord } from '../../core/data/storage'
import { irodaiMunkafuzetGeneralasa } from './irodaiExcel'

interface IrodaiOsszesitoProps {
  fuvarok: FuvarRecord[]
}

function datumKulcs(iso: string): string {
  return iso.slice(0, 7)
}

function datumSzoveg(iso: string): string {
  const datum = new Date(iso)
  return Number.isNaN(datum.getTime()) ? iso : new Intl.DateTimeFormat('hu-HU', { dateStyle: 'short' }).format(datum)
}

function honapFelirat(honap: string): string {
  const [ev, honapSzam] = honap.split('-').map(Number)
  return new Intl.DateTimeFormat('hu-HU', { year: 'numeric', month: 'long' }).format(new Date(ev, honapSzam - 1, 1))
}

function fajlDatum(honap: string): string {
  return honap === 'osszes' ? 'osszes' : honap
}

function blobBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const eredmeny = reader.result
      if (typeof eredmeny !== 'string') {
        reject(new Error('Az Excel-fájl kódolása nem sikerült.'))
        return
      }
      resolve(eredmeny.slice(eredmeny.indexOf(',') + 1))
    }
    reader.onerror = () => reject(reader.error ?? new Error('Az Excel-fájl olvasása nem sikerült.'))
    reader.readAsDataURL(blob)
  })
}

export function IrodaiOsszesito({ fuvarok }: IrodaiOsszesitoProps) {
  const [honap, setHonap] = useState('osszes')
  const [hiba, setHiba] = useState('')
  const [uzenet, setUzenet] = useState('')
  const honapLista = useMemo(
    () => Array.from(new Set([
      `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
      ...fuvarok.map((fuvar) => datumKulcs(fuvar.createdAt))
    ])).sort().reverse(),
    [fuvarok]
  )
  const szurtFuvarok = useMemo(
    () => fuvarok.filter((fuvar) => honap === 'osszes' || datumKulcs(fuvar.createdAt) === honap),
    [fuvarok, honap]
  )
  const cimke = honap === 'osszes' ? 'Összes fuvar' : honapFelirat(honap)
  const osszesM3 = szurtFuvarok.reduce((osszeg, fuvar) => osszeg + fuvar.m3, 0)
  const osszesBevetel = szurtFuvarok.reduce((osszeg, fuvar) => osszeg + fuvar.total, 0)

  async function xlsxExportalasa() {
    try {
      const { default: ExcelJS } = await import('exceljs')
      const munkafuzet = irodaiMunkafuzetGeneralasa(ExcelJS, szurtFuvarok, cimke)
      const tartalom = await munkafuzet.xlsx.writeBuffer()
      const fajl = new Blob([tartalom], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const fajlNev = `beton-fuvar-elszamolas-${fajlDatum(honap)}.xlsx`
      if (Capacitor.isNativePlatform()) {
        const uri = await Filesystem.writeFile({
          path: fajlNev,
          data: await blobBase64(fajl),
          directory: Directory.Cache
        })
        await Share.share({
          title: 'Fuvar elszámolás',
          dialogTitle: 'Excel-elszámolás megosztása',
          files: [uri.uri]
        })
        setUzenet('Az Excel-elszámolás megosztási ablaka megnyílt.')
      } else {
        const url = URL.createObjectURL(fajl)
        const letoltes = document.createElement('a')
        letoltes.href = url
        letoltes.download = fajlNev
        document.body.append(letoltes)
        letoltes.click()
        letoltes.remove()
        window.setTimeout(() => URL.revokeObjectURL(url), 1000)
        setUzenet('Az Excel-elszámolás letöltése elindult.')
      }
      setHiba('')
    } catch (error) {
      setHiba(`Nem sikerült elkészíteni az Excel-elszámolást. ${error instanceof Error ? error.message : 'Ismeretlen hiba.'}`)
      setUzenet('')
    }
  }

  function pdfNyomtatasa() {
    if (szurtFuvarok.length === 0) {
      setHiba('A kiválasztott időszakhoz nincs fuvar, ezért nincs mit PDF-be menteni.')
      setUzenet('')
      return
    }
    try {
      document.body.dataset.printMode = 'office'
      window.addEventListener('afterprint', () => {
        delete document.body.dataset.printMode
      }, { once: true })
      window.print()
      window.setTimeout(() => {
        delete document.body.dataset.printMode
      }, 60000)
      setHiba('')
      setUzenet('A nyomtatási ablakban válaszd a „Mentés PDF-ként” lehetőséget.')
    } catch (error) {
      delete document.body.dataset.printMode
      setHiba(`Nem sikerült megnyitni a PDF-nyomtatást. ${error instanceof Error ? error.message : 'Ismeretlen hiba.'}`)
      setUzenet('')
    }
  }

  return (
    <section className="office-export" aria-labelledby="office-export-heading">
      <div className="section-heading">
        <h1 id="office-export-heading">Irodai elszámolás</h1>
      </div>
      <p className="hint">Alapból az összes fuvar kerül az Excelbe. Ha csak egy hónap adataira van szükség, válassz időszakot; a dátumok és összegek Excelben rendezhető, számolható értékek.</p>
      <label className="field office-month-field">
        Időszak
        <select value={honap} onChange={(event) => { setHonap(event.target.value); setHiba(''); setUzenet('') }}>
          <option value="osszes">Összes fuvar</option>
          {honapLista.map((kulcs) => (
            <option key={kulcs} value={kulcs}>{honapFelirat(kulcs)}</option>
          ))}
        </select>
      </label>
      <p className="office-summary">{szurtFuvarok.length} fuvar · {osszesM3.toLocaleString('hu-HU')} m³ · {osszesBevetel.toLocaleString('hu-HU')} Ft</p>
      <div className="backup-actions">
        <button type="button" className="button-primary" disabled={szurtFuvarok.length === 0} onClick={xlsxExportalasa}>Excel (.xlsx) letöltése</button>
        <button type="button" className="button-secondary" disabled={szurtFuvarok.length === 0} onClick={pdfNyomtatasa}>PDF nyomtatása / mentése</button>
      </div>
      {hiba && <p className="error-text" role="alert">{hiba}</p>}
      {uzenet && <p className="backup-message" role="status">{uzenet}</p>}

      <div className="office-print-area">
        <h1>FUVAR ELSZÁMOLÁS</h1>
        <p>Időszak: {cimke}</p>
        <p>Fuvarok: {szurtFuvarok.length} · Mennyiség: {osszesM3.toLocaleString('hu-HU')} m³</p>
        <table>
          <thead>
            <tr>
              <th>Dátum</th>
              <th>Fuvarlevél</th>
              <th>Szállítólevél</th>
              <th>Gyár / projekt</th>
              <th>Kiszállítás címe</th>
              <th>Mennyiség</th>
              <th>Távolság</th>
              <th>Állásidő</th>
              <th>Összesen</th>
            </tr>
          </thead>
          <tbody>
            {szurtFuvarok.map((fuvar) => (
              <tr key={fuvar.id}>
                <td>{datumSzoveg(fuvar.createdAt)}</td>
                <td>{fuvar.fuvarszam}</td>
                <td>{fuvar.szallitolevel}</td>
                <td>{fuvar.gyarNev}{fuvar.projekt ? ` / ${fuvar.projekt}` : ''}</td>
                <td>{fuvar.cim}</td>
                <td>{fuvar.m3} m³</td>
                <td>{fuvar.km} km</td>
                <td>{fuvar.allasDb} × 15 perc</td>
                <td>{fuvar.total.toLocaleString('hu-HU')} Ft</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="office-print-total">Fuvarbevétel összesen: <strong>{osszesBevetel.toLocaleString('hu-HU')} Ft</strong></p>
        <p className="office-print-note">Ez a kimutatás elszámolási segédlet, nem adóügyi számla. A hivatalos számlát a számlázóprogramban kell kiállítani.</p>
      </div>
    </section>
  )
}
