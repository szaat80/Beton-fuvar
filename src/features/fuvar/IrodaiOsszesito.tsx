import React, { useMemo, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { Directory, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import type { FuvarRecord } from '../../core/data/storage'

interface IrodaiOsszesitoProps {
  fuvarok: FuvarRecord[]
}

const magyarPenz = '#,##0 "Ft"'

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
  const [honap, setHonap] = useState(() => {
    const most = new Date()
    return `${most.getFullYear()}-${String(most.getMonth() + 1).padStart(2, '0')}`
  })
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
      const munkafuzet = new ExcelJS.Workbook()
      munkafuzet.creator = 'Beton fuvar'
      munkafuzet.created = new Date()
      const fuvarLap = munkafuzet.addWorksheet('Fuvarok', { views: [{ state: 'frozen', ySplit: 1 }] })
      fuvarLap.columns = [
        { header: 'Dátum', key: 'datum', width: 14 },
        { header: 'Fuvarlevél száma', key: 'fuvarszam', width: 20 },
        { header: 'Szállítólevél száma', key: 'szallitolevel', width: 23 },
        { header: 'Gyár', key: 'gyar', width: 30 },
        { header: 'Projekt', key: 'projekt', width: 24 },
        { header: 'Kiszállítás címe', key: 'cim', width: 38 },
        { header: 'Mennyiség (m³)', key: 'm3', width: 16 },
        { header: 'Távolság (km)', key: 'km', width: 16 },
        { header: 'Állásidő (15 perc)', key: 'allasDb', width: 19 },
        { header: 'Fuvar alapdíj', key: 'fuvarAlap', width: 17, style: { numFmt: magyarPenz } },
        { header: 'Betondíj', key: 'betonDij', width: 17, style: { numFmt: magyarPenz } },
        { header: 'Övezeti díj', key: 'kmExtra', width: 17, style: { numFmt: magyarPenz } },
        { header: 'Állásdíj', key: 'allasDij', width: 17, style: { numFmt: magyarPenz } },
        { header: 'Összesen', key: 'total', width: 18, style: { numFmt: magyarPenz } }
      ]
      for (const fuvar of szurtFuvarok) {
        fuvarLap.addRow({
          datum: datumSzoveg(fuvar.createdAt),
          fuvarszam: fuvar.fuvarszam,
          szallitolevel: fuvar.szallitolevel,
          gyar: fuvar.gyarNev,
          projekt: fuvar.projekt,
          cim: fuvar.cim,
          m3: fuvar.m3,
          km: fuvar.km,
          allasDb: fuvar.allasDb,
          fuvarAlap: fuvar.fuvarAlap,
          betonDij: fuvar.betonDij,
          kmExtra: fuvar.kmExtra,
          allasDij: fuvar.allasDij,
          total: fuvar.total
        })
      }
      fuvarLap.autoFilter = { from: 'A1', to: `N${Math.max(1, szurtFuvarok.length + 1)}` }
      fuvarLap.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
      fuvarLap.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF111827' } }

      const osszesitoLap = munkafuzet.addWorksheet('Összesítő')
      osszesitoLap.addRows([
        ['Fuvar elszámolás', cimke],
        ['Fuvarok száma', szurtFuvarok.length],
        ['Összes mennyiség (m³)', osszesM3],
        ['Fuvarbevétel összesen', osszesBevetel],
        [],
        ['Megjegyzés', 'Ez az elszámolás nem számla; a számlát a számlázóprogramban kell kiállítani.']
      ])
      osszesitoLap.columns = [{ width: 34 }, { width: 82 }]
      osszesitoLap.getRow(1).font = { bold: true, size: 14 }
      osszesitoLap.getCell('B4').numFmt = magyarPenz
      osszesitoLap.getColumn(1).font = { bold: true }

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
      <p className="hint">Válassz időszakot, majd készíts Excel-táblázatot vagy nyomtatható PDF-et az irodának.</p>
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
