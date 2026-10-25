import React, { useMemo, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { Directory, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { appFejlecBetoltese, type FuvarRecord, type Gyar, type KiallasRecord, type MunkaidoTetel } from '../../core/data/storage'
import { irodaiMunkafuzetGeneralasa } from './irodaiExcel'
import { ejszakaiTarifaFelirat, szamlazottMennyiseg } from './irodaiAdatok'

interface IrodaiOsszesitoProps {
  fuvarok: FuvarRecord[]
  gyarak?: Gyar[]
  kiallasok?: KiallasRecord[]
  munkaidoTetelek?: MunkaidoTetel[]
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

export function IrodaiOsszesito({ fuvarok, gyarak = [], kiallasok = [], munkaidoTetelek = [] }: IrodaiOsszesitoProps) {
  const [honap, setHonap] = useState('osszes')
  const [hiba, setHiba] = useState('')
  const [uzenet, setUzenet] = useState('')
  const honapLista = useMemo(
    () => Array.from(new Set([
      `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
      ...fuvarok.map((fuvar) => datumKulcs(fuvar.createdAt)),
      ...kiallasok.map((kiallas) => datumKulcs(kiallas.createdAt)),
      ...munkaidoTetelek.filter((tetel) => tetel.tipus === 'muhely').map((tetel) => datumKulcs(tetel.datum))
    ])).sort().reverse(),
    [fuvarok, kiallasok, munkaidoTetelek]
  )
  const szurtFuvarok = useMemo(
    () => fuvarok.filter((fuvar) => honap === 'osszes' || datumKulcs(fuvar.createdAt) === honap),
    [fuvarok, honap]
  )
  const szurtMuhelyTetelek = munkaidoTetelek.filter((tetel) =>
    tetel.tipus === 'muhely' && (honap === 'osszes' || datumKulcs(tetel.datum) === honap)
  )
  const [fejlecNev = '', ...rendszamReszek] = appFejlecBetoltese('').split('|')
  const soforNev = fejlecNev.trim()
  const rendszam = rendszamReszek.join('|').trim()
  const cimke = honap === 'osszes' ? 'Összes fuvar' : honapFelirat(honap)
  const osszesM3 = szurtFuvarok.reduce((osszeg, fuvar) => osszeg + fuvar.m3, 0)
  const osszesBevetel = szurtFuvarok.reduce((osszeg, fuvar) => osszeg + fuvar.total, 0)
  const szurtKiallasok = kiallasok.filter((kiallas) => honap === 'osszes' || datumKulcs(kiallas.createdAt) === honap)
  const kiallasDijOsszesen = szurtKiallasok.reduce((osszeg, kiallas) => osszeg + kiallas.dij, 0)
  const muhelyBevetel = szurtMuhelyTetelek.reduce((osszeg, tetel) => osszeg + tetel.total, 0)
  const teljesBevetel = osszesBevetel + kiallasDijOsszesen + muhelyBevetel

  async function xlsxExportalasa() {
    try {
      const { default: ExcelJS } = await import('exceljs')
      const [nev, ...rendszamReszek] = appFejlecBetoltese('').split('|')
      const munkafuzet = irodaiMunkafuzetGeneralasa(
        ExcelJS,
        szurtFuvarok,
        cimke,
        { nev: nev.trim(), rendszam: rendszamReszek.join('|').trim() },
        gyarak,
        szurtKiallasok,
        szurtMuhelyTetelek
      )
      const tartalom = await munkafuzet.xlsx.writeBuffer()
      const fajl = new Blob([tartalom], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const fajlSoforNev = (soforNev || 'felhasznalo').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '')
      const idobelyeg = new Date().toISOString().replace(/[:.]/g, '-')
      const fajlNev = `beton-fuvar-elszamolas-${fajlSoforNev || 'felhasznalo'}-${fajlDatum(honap)}-${idobelyeg}.xlsx`
      if (window.desktopFiles) {
        const mentesUtvonal = await window.desktopFiles.saveFile(fajlNev, await blobBase64(fajl), 'base64')
        setUzenet(`Az Excel-elszámolás elkészült: ${mentesUtvonal}`)
      } else if (Capacitor.isNativePlatform()) {
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
    if (szurtFuvarok.length === 0 && szurtKiallasok.length === 0 && szurtMuhelyTetelek.length === 0) {
      setHiba('A kiválasztott időszakhoz nincs elszámolható adat, ezért nincs mit PDF-be menteni.')
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
      <p className="hint">Alapból az összes fuvar, kiállás és műhelymunka kerül az elszámolásba. Ha csak egy hónap adataira van szükség, válassz időszakot.</p>
      <label className="field office-month-field">
        Időszak
        <select value={honap} onChange={(event) => { setHonap(event.target.value); setHiba(''); setUzenet('') }}>
          <option value="osszes">Összes adat</option>
          {honapLista.map((kulcs) => (
            <option key={kulcs} value={kulcs}>{honapFelirat(kulcs)}</option>
          ))}
        </select>
      </label>
      <p className="office-summary">{szurtFuvarok.length} fuvar · {szurtKiallasok.length} kiállás · {szurtMuhelyTetelek.length} műhelymunka · {osszesM3.toLocaleString('hu-HU')} m³ · {teljesBevetel.toLocaleString('hu-HU')} Ft</p>
      <div className="backup-actions">
        <button type="button" className="button-primary" disabled={szurtFuvarok.length + szurtKiallasok.length + szurtMuhelyTetelek.length === 0} onClick={xlsxExportalasa}>Excel (.xlsx) letöltése</button>
        <button type="button" className="button-secondary" disabled={szurtFuvarok.length + szurtKiallasok.length + szurtMuhelyTetelek.length === 0} onClick={pdfNyomtatasa}>PDF nyomtatása / mentése</button>
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
              <th>Sofőr</th>
              <th>Rendszám</th>
              <th>Fuvarlevél</th>
              <th>Szállítólevél</th>
              <th>Gyár</th>
              <th>Típus</th>
              <th>m³</th>
              <th>Száml. m³</th>
              <th>Övezet / távolság</th>
              <th>Állásidő</th>
              <th>Éjszakai tarifa</th>
              <th>Egységár</th>
              <th>Összesen</th>
            </tr>
          </thead>
          <tbody>
            {szurtFuvarok.map((fuvar) => (
              <tr key={fuvar.id}>
                <td>{datumSzoveg(fuvar.createdAt)}</td>
                <td>{soforNev}</td>
                <td>{rendszam}</td>
                <td>{fuvar.fuvarszam}</td>
                <td>{fuvar.szallitolevel}</td>
                <td>{fuvar.gyarNev}</td>
                <td>Beton fuvar</td>
                <td>{fuvar.m3} m³</td>
                <td>{szamlazottMennyiseg(fuvar)} m³</td>
                <td>{fuvar.km} km</td>
                <td>{fuvar.allasDb} × 15 perc</td>
                <td>{ejszakaiTarifaFelirat(fuvar)}</td>
                <td>{(fuvar.projektDij ?? fuvar.fuvarAlap).toLocaleString('hu-HU')} Ft</td>
                <td>{fuvar.total.toLocaleString('hu-HU')} Ft</td>
              </tr>
            ))}
          </tbody>
        </table>
        {szurtKiallasok.length > 0 && (
          <>
            <h2>Kiállások</h2>
            <table>
              <thead><tr><th>Dátum</th><th>Sofőr</th><th>Honnan</th><th>Hova</th><th>Díj</th></tr></thead>
              <tbody>{szurtKiallasok.map((kiallas) => (
                <tr key={kiallas.id}>
                  <td>{datumSzoveg(kiallas.createdAt)}</td>
                  <td>{kiallas.driverName}</td>
                  <td>{kiallas.honnan}</td>
                  <td>{kiallas.hova}</td>
                  <td>{kiallas.dij.toLocaleString('hu-HU')} Ft</td>
                </tr>
              ))}</tbody>
            </table>
          </>
        )}
        {szurtMuhelyTetelek.length > 0 && (
          <>
            <h2>Műhelymunka</h2>
            <table>
              <thead><tr><th>Dátum</th><th>Kezdés–zárás</th><th>Időtartam</th><th>Órabér</th><th>Műhelybevétel</th></tr></thead>
              <tbody>{szurtMuhelyTetelek.map((tetel) => (
                <tr key={tetel.id}>
                  <td>{tetel.datum}</td>
                  <td>{tetel.kezdes}–{tetel.zaras}</td>
                  <td>{(tetel.perc / 60).toFixed(2)} óra</td>
                  <td>{tetel.oraber?.toLocaleString('hu-HU') ?? '-'} Ft/óra</td>
                  <td>{tetel.total.toLocaleString('hu-HU')} Ft</td>
                </tr>
              ))}</tbody>
            </table>
          </>
        )}
        <p className="office-print-total">Fuvarbevétel: <strong>{osszesBevetel.toLocaleString('hu-HU')} Ft</strong> · Kiállási díjak: <strong>{kiallasDijOsszesen.toLocaleString('hu-HU')} Ft</strong> · Műhelybevétel: <strong>{muhelyBevetel.toLocaleString('hu-HU')} Ft</strong> · Mindösszesen: <strong>{teljesBevetel.toLocaleString('hu-HU')} Ft</strong></p>
        <p className="office-print-note">Ez a kimutatás elszámolási segédlet, nem adóügyi számla. A hivatalos számlát a számlázóprogramban kell kiállítani.</p>
      </div>
    </section>
  )
}
