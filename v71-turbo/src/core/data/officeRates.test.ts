import { beforeEach, describe, expect, it } from 'vitest'
import { GYAR_STORAGE_KEY, KIAL_UVONALAK_STORAGE_KEY, PROJEKT_STORAGE_KEY } from './storage'
import {
  applyOfficeRateSettings,
  OFFICE_ALLAS_DIJ_KEY,
  OFFICE_MIN_M3_KEY,
  validateOfficeRateSettings
} from './officeRates'

const values = new Map<string, string>()
globalThis.localStorage = {
  getItem: key => values.get(key) ?? null,
  setItem: (key, value) => { values.set(key, String(value)) },
  removeItem: key => { values.delete(key) },
  clear: () => { values.clear() },
  key: index => Array.from(values.keys())[index] ?? null,
  get length() { return values.size }
} as Storage

const settings = {
  schemaVersion: 1 as const,
  gyarak: [{ id: 'duna', nev: 'Duna Beton', fuvarAlap: 18500, zonaLepes: 700, minM3: 4, allasDij: 2000 }],
  projektek: [{ nev: 'Hídépítés', arM3: 12000, gyarId: 'duna' }],
  kiallasUtvonalak: [{ id: 'r1', honnan: 'Duna Beton', hova: 'Csepeli Beton', dij: 5000 }],
  minM3: 4,
  allasDij: 2000
}

describe('office rate updates', () => {
  beforeEach(() => localStorage.clear())

  it('only applies factories, projects, and call-out routes to local settings', () => {
    localStorage.setItem('fuvarok_v70', '[{"id":"trip"}]')
    localStorage.setItem('muhely_tetelek_v70', '[{"id":"work"}]')
    applyOfficeRateSettings(settings)

    expect(JSON.parse(localStorage.getItem(GYAR_STORAGE_KEY) ?? '[]')).toEqual(settings.gyarak)
    expect(JSON.parse(localStorage.getItem(PROJEKT_STORAGE_KEY) ?? '[]')).toEqual(settings.projektek)
    expect(JSON.parse(localStorage.getItem(KIAL_UVONALAK_STORAGE_KEY) ?? '[]')).toEqual(settings.kiallasUtvonalak)
    expect(localStorage.getItem(OFFICE_MIN_M3_KEY)).toBe('4')
    expect(localStorage.getItem(OFFICE_ALLAS_DIJ_KEY)).toBe('2000')
    expect(localStorage.getItem('fuvarok_v70')).toBe('[{"id":"trip"}]')
    expect(localStorage.getItem('muhely_tetelek_v70')).toBe('[{"id":"work"}]')
  })

  it('rejects malformed rate updates before touching local storage', () => {
    expect(() => validateOfficeRateSettings({ ...settings, gyarak: [] })).toThrow()
    expect(localStorage.length).toBe(0)
  })

  it('rejects projects linked to factories missing from the rate update', () => {
    expect(() => validateOfficeRateSettings({
      ...settings,
      projektek: [{ nev: 'Hídépítés', arM3: 12000, gyarId: 'ismeretlen' }]
    })).toThrow('ismeretlen gyárhoz')
    expect(localStorage.length).toBe(0)
  })

  it('restores previous rate settings if storage fails during application', () => {
    localStorage.setItem(GYAR_STORAGE_KEY, '[{"id":"old"}]')
    const originalSet = localStorage.setItem.bind(localStorage)
    let failOnce = true
    localStorage.setItem = (key, value) => {
      if (key === PROJEKT_STORAGE_KEY && failOnce) {
        failOnce = false
        throw new DOMException('Storage full', 'QuotaExceededError')
      }
      originalSet(key, value)
    }
    expect(() => applyOfficeRateSettings(settings)).toThrow(/korábbi beállítások változatlanok/)
    expect(localStorage.getItem(GYAR_STORAGE_KEY)).toBe('[{"id":"old"}]')
  })
})
