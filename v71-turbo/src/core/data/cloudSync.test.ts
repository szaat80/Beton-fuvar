import { describe, expect, it } from 'vitest'
import type { Adatmentes } from './storage'
import { syncDontes } from './cloudSync'

const helyi: Adatmentes = {
  formatum: 'beton-fuvar-mentes',
  verzio: 1,
  letrehozva: '2026-10-15T10:00:00.000Z',
  adatok: {
    fuvarok: [],
    gyarak: [],
    munkaidoTetelek: [],
    projektek: [],
    jelenletiFejlec: { munkaltato: '', dolgozo: '' },
    appFejlec: 'Teszt'
  }
}

describe('felhőszinkron döntés', () => {
  it('feltöltést választ, ha még nincs felhőmentés', () => {
    expect(syncDontes(helyi, null, null)).toBe('upload-local')
  })

  it('első kapcsoláskor rákérdez, ha már létezik felhőmentés', () => {
    expect(syncDontes(helyi, { backup: helyi, updated_at: '2026-10-15T10:00:00.000Z' }, null))
      .toBe('initial-choice')
  })

  it('csak helyi változáskor feltöltést választ', () => {
    const korabbi = { ...helyi, adatok: { ...helyi.adatok, appFejlec: 'Régi' } }
    const marker = { snapshot: JSON.stringify(korabbi.adatok), updatedAt: 'v1' }
    expect(syncDontes(helyi, { backup: korabbi, updated_at: 'v1' }, marker)).toBe('upload-local')
  })

  it('csak felhőváltozáskor letöltést választ', () => {
    const marker = { snapshot: JSON.stringify(helyi.adatok), updatedAt: 'v1' }
    expect(syncDontes(helyi, { backup: helyi, updated_at: 'v2' }, marker)).toBe('download-cloud')
  })

  it('mindkét oldali változáskor nem ír felül automatikusan', () => {
    const korabbi = { ...helyi, adatok: { ...helyi.adatok, appFejlec: 'Régi' } }
    const marker = { snapshot: JSON.stringify(korabbi.adatok), updatedAt: 'v1' }
    expect(syncDontes(helyi, { backup: helyi, updated_at: 'v2' }, marker)).toBe('conflict')
  })

  it('változatlan állapotnál nem végez felesleges írást', () => {
    const marker = { snapshot: JSON.stringify(helyi.adatok), updatedAt: 'v1' }
    expect(syncDontes(helyi, { backup: helyi, updated_at: 'v1' }, marker)).toBe('unchanged')
  })
})
