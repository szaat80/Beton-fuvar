import type { FuvarRecord, Gyar, KiallasRecord, MunkaidoTetel } from '../../core/data/storage'
import { ejszakaiTarifaFelirat, szamlazottMennyiseg } from './irodaiAdatok'

type ExcelJSConstructor = typeof import('exceljs')

const magyarPenz = '#,##0 "Ft"'

function excelDatum(iso: string): Date {
  const datum = new Date(iso)
  if (Number.isNaN(datum.getTime())) {
    throw new Error(`Érvénytelen fuvar dátum: ${iso}`)
  }
  return new Date(Date.UTC(datum.getFullYear(), datum.getMonth(), datum.getDate()))
}

export function irodaiMunkafuzetGeneralasa(
  ExcelJS: ExcelJSConstructor,
  fuvarok: FuvarRecord[],
  cimke: string,
  sofor: { nev: string; rendszam: string } = { nev: '', rendszam: '' },
  _gyarak: Gyar[] = [],
  kiallasok: KiallasRecord[] = [],
  munkaidoTetelek: MunkaidoTetel[] = []
) {
  const munkafuzet = new ExcelJS.Workbook()
  munkafuzet.creator = 'Beton fuvar'
  munkafuzet.created = new Date()

  const fuvarLap = munkafuzet.addWorksheet('Fuvarok', { views: [{ state: 'frozen', ySplit: 1 }] })
  fuvarLap.columns = [
    { header: 'Dátum', key: 'datum', width: 14, style: { numFmt: 'dd.mm.yyyy' } },
    { header: 'Sofőr', key: 'sofor', width: 24 },
    { header: 'Rendszám', key: 'rendszam', width: 14 },
    { header: 'Fuvarlevélszám', key: 'fuvarszam', width: 20 },
    { header: 'Szállítólevélszám', key: 'szallitolevel', width: 23 },
    { header: 'Gyár', key: 'gyar', width: 30 },
    { header: 'Típus', key: 'tipus', width: 18 },
    { header: 'Mennyiség (m³)', key: 'm3', width: 16, style: { numFmt: '0.##' } },
    { header: 'Számlázott m³', key: 'szamlazottM3', width: 16, style: { numFmt: '0.##' } },
    { header: 'Övezet / távolság', key: 'tavolsagText', width: 20 },
    { header: 'Állásidő', key: 'allasText', width: 18 },
    { header: 'Éjszakai tarifa', key: 'ejszakai', width: 17 },
    { header: 'Egységár', key: 'egysegar', width: 18, style: { numFmt: magyarPenz } },
    { header: 'Összesen', key: 'total', width: 18, style: { numFmt: magyarPenz } },
    { header: 'Cím', key: 'cim', width: 38 },
    { header: 'Projekt', key: 'projekt', width: 24 },
    { header: 'Távolság (km)', key: 'km', width: 16, style: { numFmt: '0.##' } },
    { header: 'Fuvar alapdíj', key: 'fuvarAlap', width: 17, style: { numFmt: magyarPenz } },
    { header: 'Övezeti díj', key: 'kmExtra', width: 17, style: { numFmt: magyarPenz } },
    { header: 'Állásdíj', key: 'allasDij', width: 17, style: { numFmt: magyarPenz } },
    { header: 'Fix fuvardíj', key: 'fuvarFixDij', width: 17, style: { numFmt: magyarPenz } },
    { header: 'Éjszakai pótlék', key: 'ejszakaPotlek', width: 17, style: { numFmt: magyarPenz } },
    { header: 'Fuvar ideje', key: 'ido', width: 13 }
  ]

  for (const fuvar of fuvarok) {
    fuvarLap.addRow({
      datum: excelDatum(fuvar.createdAt),
      sofor: sofor.nev,
      rendszam: sofor.rendszam,
      fuvarszam: fuvar.fuvarszam,
      szallitolevel: fuvar.szallitolevel,
      gyar: fuvar.gyarNev,
      tipus: 'Beton fuvar',
      m3: fuvar.m3,
      szamlazottM3: szamlazottMennyiseg(fuvar),
      tavolsagText: `${fuvar.km} km`,
      allasText: fuvar.allasDb > 0 ? `${fuvar.allasDb} × 15 perc` : 'Nincs',
      ejszakai: ejszakaiTarifaFelirat(fuvar),
      egysegar: fuvar.projektDij ?? fuvar.fuvarAlap,
      total: fuvar.total,
      cim: fuvar.cim,
      projekt: fuvar.projekt,
      km: fuvar.km,
      fuvarAlap: fuvar.fuvarAlap,
      kmExtra: fuvar.kmExtra,
      allasDij: fuvar.allasDij,
      fuvarFixDij: fuvar.total - fuvar.betonDij - fuvar.kmExtra - fuvar.allasDij - (fuvar.ejszakaPotlek ?? 0),
      ejszakaPotlek: fuvar.ejszakaPotlek ?? 0,
      ido: fuvar.ido ?? ''
    })
  }
  const lastColumn = fuvarLap.getColumn(fuvarLap.columnCount).letter
  fuvarLap.autoFilter = { from: 'A1', to: `${lastColumn}${Math.max(1, fuvarok.length + 1)}` }
  fuvarLap.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  fuvarLap.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF111827' } }

  const osszesM3 = fuvarok.reduce((osszeg, fuvar) => osszeg + fuvar.m3, 0)
  const kiallasOsszeg = kiallasok.reduce((osszeg, sor) => osszeg + sor.dij, 0)
  const muhelyOsszeg = munkaidoTetelek.reduce((osszeg, sor) => osszeg + sor.total, 0)
  if (kiallasok.length > 0) {
    const kiallasLap = munkafuzet.addWorksheet('Kiállások', { views: [{ state: 'frozen', ySplit: 1 }] })
    kiallasLap.columns = [
      { header: 'Dátum', key: 'datum', width: 14 },
      { header: 'Sofőr', key: 'sofor', width: 24 },
      { header: 'Honnan', key: 'honnan', width: 28 },
      { header: 'Hova', key: 'hova', width: 28 },
      { header: 'Kiállási díj', key: 'dij', width: 18, style: { numFmt: magyarPenz } }
    ]
    for (const sor of kiallasok) kiallasLap.addRow({
      datum: excelDatum(sor.createdAt),
      sofor: sor.driverName,
      honnan: sor.honnan,
      hova: sor.hova,
      dij: sor.dij
    })
    kiallasLap.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
    kiallasLap.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF111827' } }
  }
  if (munkaidoTetelek.length > 0) {
    const muhelyLap = munkafuzet.addWorksheet('Műhelymunka', { views: [{ state: 'frozen', ySplit: 1 }] })
    muhelyLap.columns = [
      { header: 'Dátum', key: 'datum', width: 14 },
      { header: 'Kezdés', key: 'kezdes', width: 12 },
      { header: 'Zárás', key: 'zaras', width: 12 },
      { header: 'Időtartam (perc)', key: 'perc', width: 18 },
      { header: 'Órabér', key: 'oraber', width: 18, style: { numFmt: magyarPenz } },
      { header: 'Műhelybevétel', key: 'total', width: 18, style: { numFmt: magyarPenz } }
    ]
    for (const sor of munkaidoTetelek) muhelyLap.addRow({
      datum: sor.datum,
      kezdes: sor.kezdes,
      zaras: sor.zaras,
      perc: sor.perc,
      oraber: sor.oraber,
      total: sor.total
    })
    muhelyLap.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
    muhelyLap.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF111827' } }
  }
  const fuvarBevetel = fuvarok.reduce((osszeg, fuvar) => osszeg + fuvar.total, 0)
  const osszesBevetel = fuvarBevetel + kiallasOsszeg + muhelyOsszeg
  const osszesitoLap = munkafuzet.addWorksheet('Összesítő')
  osszesitoLap.addRows([
    ['Fuvar elszámolás', cimke],
    ['Sofőr', sofor.nev ? `${sofor.nev}${sofor.rendszam ? ` | ${sofor.rendszam}` : ''}` : '-'],
    ['Fuvarok száma', fuvarok.length],
    ['Összes mennyiség (m³)', osszesM3],
    ['Fuvarbevétel összesen', fuvarBevetel],
    ['Kiállási díj összesen', kiallasOsszeg],
    ['Műhelybevétel összesen', muhelyOsszeg],
    ['Mindösszesen (fuvar + kiállás + műhely)', osszesBevetel],
    [],
    ['Megjegyzés', 'Ez az elszámolás nem számla; a számlát a számlázóprogramban kell kiállítani.']
  ])
  osszesitoLap.columns = [{ width: 34 }, { width: 82 }]
  osszesitoLap.getRow(1).font = { bold: true, size: 14 }
  osszesitoLap.getCell('B5').numFmt = magyarPenz
  osszesitoLap.getCell('B6').numFmt = magyarPenz
  osszesitoLap.getCell('B7').numFmt = magyarPenz
  osszesitoLap.getCell('B8').numFmt = magyarPenz
  osszesitoLap.getColumn(1).font = { bold: true }

  return munkafuzet
}
