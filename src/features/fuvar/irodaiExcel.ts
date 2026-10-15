import type { FuvarRecord } from '../../core/data/storage'

type ExcelJSConstructor = typeof import('exceljs').default

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
  cimke: string
) {
  const munkafuzet = new ExcelJS.Workbook()
  munkafuzet.creator = 'Beton fuvar'
  munkafuzet.created = new Date()

  const fuvarLap = munkafuzet.addWorksheet('Fuvarok', { views: [{ state: 'frozen', ySplit: 1 }] })
  fuvarLap.columns = [
    { header: 'Dátum', key: 'datum', width: 14, style: { numFmt: 'dd.mm.yyyy' } },
    { header: 'Fuvarlevél száma', key: 'fuvarszam', width: 20 },
    { header: 'Szállítólevél száma', key: 'szallitolevel', width: 23 },
    { header: 'Gyár', key: 'gyar', width: 30 },
    { header: 'Projekt', key: 'projekt', width: 24 },
    { header: 'Kiszállítás címe', key: 'cim', width: 38 },
    { header: 'Mennyiség (m³)', key: 'm3', width: 16, style: { numFmt: '0.##' } },
    { header: 'Távolság (km)', key: 'km', width: 16, style: { numFmt: '0.##' } },
    { header: 'Állásidő (15 perc)', key: 'allasDb', width: 19, style: { numFmt: '0' } },
    { header: 'Fuvar alapdíj', key: 'fuvarAlap', width: 17, style: { numFmt: magyarPenz } },
    { header: 'Betondíj', key: 'betonDij', width: 17, style: { numFmt: magyarPenz } },
    { header: 'Övezeti díj', key: 'kmExtra', width: 17, style: { numFmt: magyarPenz } },
    { header: 'Állásdíj', key: 'allasDij', width: 17, style: { numFmt: magyarPenz } },
    { header: 'Összesen', key: 'total', width: 18, style: { numFmt: magyarPenz } }
  ]

  for (const fuvar of fuvarok) {
    fuvarLap.addRow({
      datum: excelDatum(fuvar.createdAt),
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
  fuvarLap.autoFilter = { from: 'A1', to: `N${Math.max(1, fuvarok.length + 1)}` }
  fuvarLap.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  fuvarLap.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF111827' } }

  const osszesM3 = fuvarok.reduce((osszeg, fuvar) => osszeg + fuvar.m3, 0)
  const osszesBevetel = fuvarok.reduce((osszeg, fuvar) => osszeg + fuvar.total, 0)
  const osszesitoLap = munkafuzet.addWorksheet('Összesítő')
  osszesitoLap.addRows([
    ['Fuvar elszámolás', cimke],
    ['Fuvarok száma', fuvarok.length],
    ['Összes mennyiség (m³)', osszesM3],
    ['Fuvarbevétel összesen', osszesBevetel],
    [],
    ['Megjegyzés', 'Ez az elszámolás nem számla; a számlát a számlázóprogramban kell kiállítani.']
  ])
  osszesitoLap.columns = [{ width: 34 }, { width: 82 }]
  osszesitoLap.getRow(1).font = { bold: true, size: 14 }
  osszesitoLap.getCell('B4').numFmt = magyarPenz
  osszesitoLap.getColumn(1).font = { bold: true }

  return munkafuzet
}
