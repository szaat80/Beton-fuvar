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
    const munkafuzet = irodaiMunkafuzetGeneralasa(ExcelJS, [fuvar], 'Összes fuvar')
    const tartalom = await munkafuzet.xlsx.writeBuffer()
    const ujraolvasott = new ExcelJS.Workbook()
    await ujraolvasott.xlsx.load(tartalom)

    const fuvarLap = ujraolvasott.getWorksheet('Fuvarok')
    const osszesitoLap = ujraolvasott.getWorksheet('Összesítő')
    expect(fuvarLap).toBeDefined()
    expect(osszesitoLap).toBeDefined()
    expect(fuvarLap?.getCell('A2').value).toBeInstanceOf(Date)
    expect(fuvarLap?.getCell('A2').numFmt).toBe('dd.mm.yyyy')
    expect(fuvarLap?.getCell('G2').value).toBe(5.5)
    expect(fuvarLap?.getCell('N2').value).toBe(8000)
    expect(fuvarLap?.getCell('B2').value).toBe('=1+1')
    expect(fuvarLap?.getCell('B2').type).toBe(ExcelJS.ValueType.String)
    expect(fuvarLap?.autoFilter).toBe('A1:N2')
    expect(osszesitoLap?.getCell('B2').value).toBe(1)
    expect(osszesitoLap?.getCell('B3').value).toBe(5.5)
    expect(osszesitoLap?.getCell('B4').value).toBe(8000)
  })

  it('hibát jelez hibás fuvar dátum esetén', () => {
    expect(() => irodaiMunkafuzetGeneralasa(ExcelJS, [{ ...fuvar, createdAt: 'hibás dátum' }], 'Összes fuvar'))
      .toThrow('Érvénytelen fuvar dátum')
  })
})
