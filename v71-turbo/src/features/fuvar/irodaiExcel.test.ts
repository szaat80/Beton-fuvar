import ExcelJS from 'exceljs'
import { describe, expect, it } from 'vitest'
import type { FuvarRecord } from '../../core/data/storage'
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
      'Mennyiség (m³)', 'Számlázott m³', 'Övezet / távolság', 'Állásidő', 'Összesen',
      'Cím', 'Projekt', 'Távolság (km)', 'Fuvar alapdíj', 'Övezeti díj', 'Állásdíj', 'Fix fuvardíj', 'Éjszakai pótlék', 'Fuvar ideje'
    ])
    expect(fuvarLap?.getCell('A2').value).toBeInstanceOf(Date)
    expect(fuvarLap?.getCell('A2').numFmt).toBe('dd.mm.yyyy')
    expect(fuvarLap?.getCell('B2').value).toBe('Teszt Elek')
    expect(fuvarLap?.getCell('C2').value).toBe('ABC-123')
    expect(fuvarLap?.getCell('G2').value).toBe(5.5)
    expect(fuvarLap?.getCell('K2').value).toBe(8000)
    expect(fuvarLap?.getCell('R2').value).toBe(1000)
    expect(fuvarLap?.getCell('D2').value).toBe('=1+1')
    expect(fuvarLap?.getCell('D2').type).toBe(ExcelJS.ValueType.String)
    expect(fuvarLap?.autoFilter).toBe('A1:T2')
    expect(osszesitoLap?.getCell('B3').value).toBe(1)
    expect(osszesitoLap?.getCell('B4').value).toBe(5.5)
    expect(osszesitoLap?.getCell('B5').value).toBe(8000)
  })

  it('külön lapon összesíti a napi kiállási díjat és az éjszakai pótlékot', async () => {
    const gyarak = [{
      id: 'gyar-1', nev: 'Duna Beton', fuvarAlap: 1000, zonaLepes: 500, minM3: 4, allasDij: 2000,
      dijszabaly: { kiallas: { kuszob: 2, dijKevesebb: 10000, dijTobb: 20000 } }
    }]
    const fuvarok = [fuvar, { ...fuvar, id: 'fuvar-2', ejszakaPotlek: 3000, total: 11000, ido: '23:10' }]
    const munkafuzet = irodaiMunkafuzetGeneralasa(ExcelJS, fuvarok, 'Összes fuvar', undefined, gyarak)
    const ujraolvasott = new ExcelJS.Workbook()
    await ujraolvasott.xlsx.load(await munkafuzet.xlsx.writeBuffer())

    const kiallasLap = ujraolvasott.getWorksheet('Kiállási díjak')
    expect(kiallasLap?.getCell('C2').value).toBe(2)
    expect(kiallasLap?.getCell('D2').value).toBe(20000)
    const fuvarLap = ujraolvasott.getWorksheet('Fuvarok')
    expect(fuvarLap?.getCell('S3').value).toBe(3000)
    expect(fuvarLap?.getCell('R3').value).toBe(1000)
    expect(ujraolvasott.getWorksheet('Összesítő')?.getCell('B5').value).toBe(8000 + 11000 + 20000)
  })

  it('hibát jelez hibás fuvar dátum esetén', () => {
    expect(() => irodaiMunkafuzetGeneralasa(ExcelJS, [{ ...fuvar, createdAt: 'hibás dátum' }], 'Összes fuvar'))
      .toThrow('Érvénytelen fuvar dátum')
  })
})
