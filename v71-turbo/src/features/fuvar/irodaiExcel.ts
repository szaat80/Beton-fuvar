import type { FuvarRecord, Gyar } from '../../core/data/storage'
import { kiallasiDijak } from '../../core/domain/dijszabaly'

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
  gyarak: Gyar[] = []
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
    { header: 'Mennyiség (m³)', key: 'm3', width: 16, style: { numFmt: '0.##' } },
    { header: 'Számlázott m³', key: 'szamlazottM3', width: 16, style: { numFmt: '0.##' } },
    { header: 'Övezet / távolság', key: 'tavolsagText', width: 20 },
    { header: 'Állásidő', key: 'allasText', width: 18 },
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
      m3: fuvar.m3,
      szamlazottM3: fuvar.m3,
      tavolsagText: `${fuvar.km} km`,
      allasText: fuvar.allasDb > 0 ? `${fuvar.allasDb} × 15 perc` : 'Nincs',
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
  fuvarLap.autoFilter = { from: 'A1', to: `T${Math.max(1, fuvarok.length + 1)}` }
  fuvarLap.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  fuvarLap.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF111827' } }

  const osszesM3 = fuvarok.reduce((osszeg, fuvar) => osszeg + fuvar.m3, 0)
  const kiallasok = kiallasiDijak(fuvarok, gyarak)
  const kiallasOsszeg = kiallasok.reduce((osszeg, sor) => osszeg + sor.dij, 0)
  if (kiallasok.length > 0) {
    const kiallasLap = munkafuzet.addWorksheet('Kiállási díjak', { views: [{ state: 'frozen', ySplit: 1 }] })
    kiallasLap.columns = [
      { header: 'Dátum', key: 'datum', width: 14 },
      { header: 'Gyár', key: 'gyar', width: 30 },
      { header: 'Fuvarok száma', key: 'db', width: 16 },
      { header: 'Kiállási díj', key: 'dij', width: 18, style: { numFmt: magyarPenz } }
    ]
    for (const sor of kiallasok) kiallasLap.addRow({ datum: sor.datum, gyar: sor.gyarNev, db: sor.fuvarDb, dij: sor.dij })
    kiallasLap.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
    kiallasLap.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF111827' } }
  }
  const fuvarBevetel = fuvarok.reduce((osszeg, fuvar) => osszeg + fuvar.total, 0)
  const osszesBevetel = fuvarBevetel + kiallasOsszeg
  const osszesitoLap = munkafuzet.addWorksheet('Összesítő')
  osszesitoLap.addRows([
    ['Fuvar elszámolás', cimke],
    ['Sofőr', sofor.nev ? `${sofor.nev}${sofor.rendszam ? ` | ${sofor.rendszam}` : ''}` : '-'],
    ['Fuvarok száma', fuvarok.length],
    ['Összes mennyiség (m³)', osszesM3],
    ['Fuvarbevétel összesen', osszesBevetel],
    ['Ebből kiállási díj', kiallasOsszeg],
    [],
    ['Megjegyzés', 'Ez az elszámolás nem számla; a számlát a számlázóprogramban kell kiállítani.']
  ])
  osszesitoLap.columns = [{ width: 34 }, { width: 82 }]
  osszesitoLap.getRow(1).font = { bold: true, size: 14 }
  osszesitoLap.getCell('B5').numFmt = magyarPenz
  osszesitoLap.getCell('B6').numFmt = magyarPenz
  osszesitoLap.getColumn(1).font = { bold: true }

  return munkafuzet
}
