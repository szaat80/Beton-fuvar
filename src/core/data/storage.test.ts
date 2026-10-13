// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  adatmentesEllenorzese,
  adatmentesExportalasa,
  adatmentesVisszaallitasa,
  type Adatmentes,
  type FuvarRecord,
  type Gyar,
  type MunkaidoTetel,
  type Projekt,
  STORAGE_KEY,
  GYAR_STORAGE_KEY,
  MUHELY_STORAGE_KEY,
  PROJEKT_STORAGE_KEY,
  JELENLETI_FEJLEC_KEY,
  APP_FEJLEC_STORAGE_KEY
} from './storage'

const alapGyar: Gyar = {
  id: 'gyar-1',
  nev: 'Teszt Beton',
  fuvarAlap: 18000,
  zonaLepes: 700,
  minM3: 4,
  allasDij: 2000
}

const alapProjekt: Projekt = { nev: 'Teszt projekt', arM3: 1200 }

const tesztFuvar: FuvarRecord = {
  id: 'fuvar-1',
  createdAt: '2026-10-13T07:00:00.000Z',
  fuvarszam: 'F-001',
  szallitolevel: 'SZ-001',
  gyarId: 'gyar-1',
  gyarNev: 'Teszt Beton',
  cim: 'Teszt utca 1.',
  fuvarAlap: 18000,
  zonaLepes: 700,
  projekt: 'Teszt projekt',
  projektDij: 1200,
  m3: 4,
  km: 10,
  allasDb: 1,
  betonDij: 72000,
  kmExtra: 2800,
  allasDij: 2000,
  total: 121800
}

const munkaido: MunkaidoTetel = {
  id: 'munka-1',
  createdAt: '2026-10-13T07:00:00.000Z',
  datum: '2026-10-13',
  tipus: 'fuvarozas',
  kezdes: '07:00',
  zaras: '15:00',
  perc: 480,
  oraber: null,
  total: 0
}

function tesztMentes(modositas: Partial<Adatmentes['adatok']> = {}): Adatmentes {
  return {
    formatum: 'beton-fuvar-mentes',
    verzio: 1,
    letrehozva: '2026-10-13T08:00:00.000Z',
    adatok: {
      fuvarok: [tesztFuvar],
      gyarak: [alapGyar],
      munkaidoTetelek: [munkaido],
      projektek: [alapProjekt],
      jelenletiFejlec: { munkaltato: 'Teszt Kft.', dolgozo: 'Kolléga' },
      appFejlec: 'Teszt alkalmazás',
      ...modositas
    }
  }
}

describe('biztonsági mentés', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('exportálja a fuvarokat, gyárakat, projekteket, munkaidőt és fejléceket', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([tesztFuvar]))
    localStorage.setItem(GYAR_STORAGE_KEY, JSON.stringify([alapGyar]))
    localStorage.setItem(MUHELY_STORAGE_KEY, JSON.stringify([munkaido]))
    localStorage.setItem(PROJEKT_STORAGE_KEY, JSON.stringify([alapProjekt]))
    localStorage.setItem(JELENLETI_FEJLEC_KEY, JSON.stringify({ munkaltato: 'Teszt Kft.', dolgozo: 'Kolléga' }))
    localStorage.setItem(APP_FEJLEC_STORAGE_KEY, 'Teszt alkalmazás')

    const exportAdat = adatmentesExportalasa([alapGyar], ['Alap projekt'], 4, 2000, 'Alap fejléc')

    expect(exportAdat.formatum).toBe('beton-fuvar-mentes')
    expect(exportAdat.verzio).toBe(1)
    expect(exportAdat.adatok.fuvarok).toEqual([tesztFuvar])
    expect(exportAdat.adatok.gyarak).toEqual([alapGyar])
    expect(exportAdat.adatok.munkaidoTetelek).toEqual([munkaido])
    expect(exportAdat.adatok.projektek).toEqual([alapProjekt])
    expect(exportAdat.adatok.jelenletiFejlec.dolgozo).toBe('Kolléga')
    expect(exportAdat.adatok.appFejlec).toBe('Teszt alkalmazás')
  })

  it('elutasítja az érvénytelen mentést anélkül, hogy módosítaná a meglévő adatokat', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([tesztFuvar]))
    const hibasMentes = tesztMentes({ fuvarok: [{ ...tesztFuvar, total: Number.NaN }] })

    expect(() => adatmentesEllenorzese(hibasMentes, 4, 2000)).toThrow('fuvarlistája hibás')
    expect(localStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify([tesztFuvar]))
  })

  it('teljesen visszaállítja az összes támogatott adattípust', () => {
    adatmentesVisszaallitasa(tesztMentes())

    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')).toEqual([tesztFuvar])
    expect(JSON.parse(localStorage.getItem(GYAR_STORAGE_KEY) ?? '[]')).toEqual([alapGyar])
    expect(JSON.parse(localStorage.getItem(MUHELY_STORAGE_KEY) ?? '[]')).toEqual([munkaido])
    expect(JSON.parse(localStorage.getItem(PROJEKT_STORAGE_KEY) ?? '[]')).toEqual([alapProjekt])
    expect(JSON.parse(localStorage.getItem(JELENLETI_FEJLEC_KEY) ?? '{}')).toEqual({ munkaltato: 'Teszt Kft.', dolgozo: 'Kolléga' })
    expect(localStorage.getItem(APP_FEJLEC_STORAGE_KEY)).toBe('Teszt alkalmazás')
  })

  it('visszagörgeti a már elmentett kulcsokat, ha az import írás közben meghiúsul', () => {
    const regiFuvarok = JSON.stringify([{ ...tesztFuvar, id: 'regi-fuvar' }])
    localStorage.setItem(STORAGE_KEY, regiFuvarok)
    const eredetiSetItem = Storage.prototype.setItem
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
      if (key === PROJEKT_STORAGE_KEY) throw new DOMException('Quota exceeded', 'QuotaExceededError')
      return eredetiSetItem.call(this, key, value)
    })

    expect(() => adatmentesVisszaallitasa(tesztMentes())).toThrow('a korábbi mentés változatlan maradt')
    expect(localStorage.getItem(STORAGE_KEY)).toBe(regiFuvarok)
    expect(localStorage.getItem(GYAR_STORAGE_KEY)).toBeNull()
    expect(localStorage.getItem(MUHELY_STORAGE_KEY)).toBeNull()
    expect(localStorage.getItem(PROJEKT_STORAGE_KEY)).toBeNull()
    expect(localStorage.getItem(JELENLETI_FEJLEC_KEY)).toBeNull()
    expect(localStorage.getItem(APP_FEJLEC_STORAGE_KEY)).toBeNull()
    setItemSpy.mockRestore()
  })
})
