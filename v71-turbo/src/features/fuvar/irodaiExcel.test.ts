import ExcelJS from 'exceljs'
import { describe, expect, it } from 'vitest'
import type { FuvarRecord, MunkaidoTetel } from '../../core/data/storage'
import { irodaiMunkafuzetGeneralasa } from './irodaiExcel'

const fuvar: FuvarRecord = {
  id: 'fuvar-1',
  createdAt: '2026-10-15T08:30:00.000Z',
  fuvarszam: '=1+1',
  szallitolevel: 'SZ-123',
  gyarId: 'gyar-1',
  gyarNev: 'Duna Beton',
  cim: 'Fő utca 1.',
  fuvarAlap: 1000,
  zonaLepes: 500,
  projekt: 'Hídépítés',
  projektDij: null,
  m3: 5.5,
  km: 12.5,
  allasDb: 2,
  betonDij: 2500,
  kmExtra: 500,
  allasDij: 4000,
  total: 8000
}

const muhelyTetel: MunkaidoTetel = {
  id: 'muhely-1',
  createdAt: '2026-10-15T12:00:00.000Z',
  datum: '2026-10-15',
  tipus: 'muhely',
  kezdes: '08:00',
  zaras: '10:00',
  perc: 120,
  oraber: 3000,
  total: 6000
}

describe('irodai Excel export', () => {
  it('hibamentesen újraolvasható, típushelyes és összesített munkafüzetet készít', async () => {
    const munkafuzet = irodaiMunkafuzetGeneralasa(ExcelJS, [fuvar], 'Összes fuvar', { nev: 'Teszt Elek', rendszam: 'ABC-123' })
    const tartalom = await munkafuzet.xlsx.writeBuffer()
    const ujraolvasott = new ExcelJS.Workbook()
    await ujraolvasott.xlsx.load(tartalom)

    const fuvarLap = ujraolvasott.getWorksheet('Fuvarok')
    const osszesitoLap = ujraolvasott.getWorksheet('Összesítő')
    expect(fuvarLap).toBeDefined()
    expect(osszesitoLap).toBeDefined()
    expect((fuvarLap?.getRow(1).values as unknown[]).slice(1)).toEqual([
      'Dátum', 'Sofőr', 'Rendszám', 'Fuvarlevélszám', 'Szállítólevélszám', 'Gyár',
      'Típus', 'Mennyiség (m³)', 'Számlázott m³', 'Övezet / távolság', 'Állásidő',
      'Éjszakai tarifa', 'Egységár', 'Összesen', 'Cím', 'Projekt', 'Távolság (km)',
      'Fuvar alapdíj', 'Övezeti díj', 'Állásdíj', 'Fix fuvardíj', 'Éjszakai pótlék', 'Fuvar ideje'
    ])
    expect(fuvarLap?.getCell('A2').value).toBeInstanceOf(Date)
    expect(fuvarLap?.getCell('A2').numFmt).toBe('dd.mm.yyyy')
    expect(fuvarLap?.getCell('B2').value).toBe('Teszt Elek')
    expect(fuvarLap?.getCell('C2').value).toBe('ABC-123')
    expect(fuvarLap?.getCell('G2').value).toBe('Beton fuvar')
    expect(fuvarLap?.getCell('H2').value).toBe(5.5)
    expect(fuvarLap?.getCell('N2').value).toBe(8000)
    expect(fuvarLap?.getCell('R2').value).toBe(1000)
    expect(fuvarLap?.getCell('L2').value).toBe('Nem')
    expect(fuvarLap?.getCell('D2').value).toBe('=1+1')
    expect(fuvarLap?.getCell('D2').type).toBe(ExcelJS.ValueType.String)
    expect(fuvarLap?.autoFilter).toBe('A1:W2')
    expect(osszesitoLap?.getCell('B3').value).toBe(1)
    expect(osszesitoLap?.getCell('B4').value).toBe(5.5)
    expect(osszesitoLap?.getCell('B5').value).toBe(8000)
  })

  it('külön lapon összesíti a kiállásokat, és az éjszakai tarifát jelöli', async () => {
    const fuvarok = [fuvar, { ...fuvar, id: 'fuvar-2', ejszakai: true, total: 11000 }]
    const kiallasok = [{
      id: 'callout-1', routeId: 'route-1', createdAt: '2026-10-16T21:30:00.000Z',
      driverName: 'Teszt Elek', plateNumber: 'ABC-123', honnan: 'Duna Beton', hova: 'Csepeli Beton', dij: 5000
    }]
    const munkafuzet = irodaiMunkafuzetGeneralasa(ExcelJS, fuvarok, 'Összes fuvar', undefined, [], kiallasok)
    const ujraolvasott = new ExcelJS.Workbook()
    await ujraolvasott.xlsx.load(await munkafuzet.xlsx.writeBuffer())

    const kiallasLap = ujraolvasott.getWorksheet('Kiállások')
    expect(kiallasLap?.getCell('C2').value).toBe('Duna Beton')
    expect(kiallasLap?.getCell('D2').value).toBe('Csepeli Beton')
    expect(kiallasLap?.getCell('E2').value).toBe(5000)
    const fuvarLap = ujraolvasott.getWorksheet('Fuvarok')
    expect(fuvarLap?.getCell('L3').value).toBe('Igen')
    expect(ujraolvasott.getWorksheet('Összesítő')?.getCell('B5').value).toBe(8000 + 11000)
    expect(ujraolvasott.getWorksheet('Összesítő')?.getCell('B6').value).toBe(5000)
    expect(ujraolvasott.getWorksheet('Összesítő')?.getCell('B8').value).toBe(8000 + 11000 + 5000)
  })

  it('külön lapon exportálja a műhelymunkát, és beleszámolja a teljes bevételbe', async () => {
    const kiallasok = [{
      id: 'callout-1', routeId: 'route-1', createdAt: '2026-10-16T21:30:00.000Z',
      driverName: 'Teszt Elek', plateNumber: 'ABC-123', honnan: 'Duna Beton', hova: 'Csepeli Beton', dij: 5000
    }]
    const munkafuzet = irodaiMunkafuzetGeneralasa(ExcelJS, [fuvar], '2026. október', undefined, [], kiallasok, [muhelyTetel])
    const ujraolvasott = new ExcelJS.Workbook()
    await ujraolvasott.xlsx.load(await munkafuzet.xlsx.writeBuffer())

    const muhelyLap = ujraolvasott.getWorksheet('Műhelymunka')
    expect(muhelyLap?.getCell('F2').value).toBe(6000)
    expect(ujraolvasott.getWorksheet('Összesítő')?.getCell('B7').value).toBe(6000)
    expect(ujraolvasott.getWorksheet('Összesítő')?.getCell('B8').value).toBe(8000 + 5000 + 6000)
  })

  it('megőrzi a régi éjszakai pótdíjat és fuvaridőt az irodai munkafüzetben', async () => {
    const legacyFuvar = { ...fuvar, ido: '23:10', ejszakaPotlek: 3000 }
    const munkafuzet = irodaiMunkafuzetGeneralasa(ExcelJS, [legacyFuvar], 'Összes fuvar')
    const ujraolvasott = new ExcelJS.Workbook()
    await ujraolvasott.xlsx.load(await munkafuzet.xlsx.writeBuffer())

    const fuvarLap = ujraolvasott.getWorksheet('Fuvarok')
    expect(fuvarLap?.getCell('L2').value).toBe('Igen')
    expect(fuvarLap?.getCell('V2').value).toBe(3000)
    expect(fuvarLap?.getCell('W2').value).toBe('23:10')
  })

  it('hibát jelez hibás fuvar dátum esetén', () => {
    expect(() => irodaiMunkafuzetGeneralasa(ExcelJS, [{ ...fuvar, createdAt: 'hibás dátum' }], 'Összes fuvar'))
      .toThrow('Érvénytelen fuvar dátum')
  })
})
