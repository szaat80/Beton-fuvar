import { describe, expect, it } from 'vitest'
import type { Adatmentes } from './storage'
import { mergeBackupChanges } from './backupMerge'

const mentes = (fuvarok: Adatmentes['adatok']['fuvarok'], appFejlec = 'Teszt'): Adatmentes => ({
  formatum: 'beton-fuvar-mentes',
  verzio: 1,
  letrehozva: '2026-10-15T10:00:00.000Z',
  adatok: {
    fuvarok,
    gyarak: [],
    munkaidoTetelek: [],
    projektek: [],
    kiallasok: [],
    kiallasUtvonalak: [],
    jelenletiFejlec: { munkaltato: '', dolgozo: '' },
    appFejlec
  }
})

const fuvar = (id: string, fuvarszam = id) => ({
  id,
  createdAt: '2026-10-15T10:00:00.000Z',
  fuvarszam,
  szallitolevel: '',
  gyarId: 'gyar',
  gyarNev: 'Gyár',
  cim: '',
  fuvarAlap: 1000,
  zonaLepes: 0,
  projekt: '',
  projektDij: null,
  m3: 1,
  km: 0,
  allasDb: 0,
  betonDij: 1000,
  kmExtra: 0,
  allasDij: 0,
  total: 1000
})

describe('felhőmentések biztonságos egyesítése', () => {
  it('egyesíti a két eszközön külön létrejött fuvarokat', () => {
    const base = mentes([])
    const local = mentes([fuvar('local')])
    const cloud = mentes([fuvar('cloud')])

    const result = mergeBackupChanges(base.adatok, local, cloud)

    expect(result.conflicts).toEqual([])
    expect(result.value.adatok.fuvarok.map((item) => item.id)).toEqual(['local', 'cloud'])
  })

  it('azonos nevű, de külön gyárhoz tartozó projekteket külön rekordként egyesít', () => {
    const base = mentes([])
    const local = mentes([])
    local.adatok.projektek = [{ nev: 'Lakópark', arM3: 12000, gyarId: 'duna' }]
    const cloud = mentes([])
    cloud.adatok.projektek = [{ nev: 'Lakópark', arM3: 14000, gyarId: 'elem' }]

    const result = mergeBackupChanges(base.adatok, local, cloud)

    expect(result.conflicts).toEqual([])
    expect(result.value.adatok.projektek).toEqual([
      { nev: 'Lakópark', arM3: 12000, gyarId: 'duna' },
      { nev: 'Lakópark', arM3: 14000, gyarId: 'elem' }
    ])
  })

  it('megtartja az egyik eszköz módosítását, ha a másik nem módosította ugyanazt a rekordot', () => {
    const original = fuvar('trip', 'eredeti')
    const base = mentes([original])
    const local = mentes([fuvar('trip', 'helyi')])
    const cloud = mentes([original])

    const result = mergeBackupChanges(base.adatok, local, cloud)

    expect(result.conflicts).toEqual([])
    expect(result.value.adatok.fuvarok[0].fuvarszam).toBe('helyi')
  })

  it('ütközésnek jelzi az ugyanazon fuvar eltérő módosítását', () => {
    const base = mentes([fuvar('trip', 'eredeti')])
    const local = mentes([fuvar('trip', 'helyi')])
    const cloud = mentes([fuvar('trip', 'felhő')])

    const result = mergeBackupChanges(base.adatok, local, cloud)

    expect(result.conflicts).toEqual(['fuvarok: trip'])
  })

  it('ütközésnek jelzi a törlés és módosítás ütközését', () => {
    const base = mentes([fuvar('trip')])
    const local = mentes([])
    const cloud = mentes([fuvar('trip', 'felhőben módosított')])

    const result = mergeBackupChanges(base.adatok, local, cloud)

    expect(result.conflicts).toEqual(['fuvarok: trip'])
  })

  it('első szinkronkor összevonja a külön rekordokat anélkül, hogy az egyiket lecserélné', () => {
    const base = mentes([])
    const local = mentes([fuvar('telefon')])
    const cloud = mentes([fuvar('windows')])

    const result = mergeBackupChanges(base.adatok, local, cloud)

    expect(result.conflicts).toEqual([])
    expect(result.value.adatok.fuvarok.map((item) => item.id)).toEqual(['telefon', 'windows'])
  })

  it.each(['local', 'cloud'] as const)('csak az ütköző rekordnál alkalmazza a %s választást', (resolution) => {
    const base = mentes([fuvar('kozos'), fuvar('valtozatlan')], '')
    const local = mentes([fuvar('kozos', 'telefon'), fuvar('valtozatlan'), fuvar('csak-telefon')], 'Helyi')
    const cloud = mentes([fuvar('kozos', 'Windows'), fuvar('valtozatlan'), fuvar('csak-windows')], 'Felhő')

    const result = mergeBackupChanges(base.adatok, local, cloud, resolution)

    expect(result.conflicts).toEqual(['fuvarok: kozos', 'appFejlec'])
    expect(result.value.adatok.fuvarok.map((item) => item.fuvarszam)).toContain('valtozatlan')
    expect(result.value.adatok.fuvarok.map((item) => item.id)).toContain('csak-telefon')
    expect(result.value.adatok.fuvarok.map((item) => item.id)).toContain('csak-windows')
    expect(result.value.adatok.fuvarok.find((item) => item.id === 'kozos')?.fuvarszam)
      .toBe(resolution === 'local' ? 'telefon' : 'Windows')
    expect(result.value.adatok.appFejlec).toBe(resolution === 'local' ? 'Helyi' : 'Felhő')
  })

  it('összefésüli a kiállásokat és jelzi a fejlécbeállítás ütközését', () => {
    const callOut = { id: 'route-1', honnan: 'A', hova: 'B', dij: 1000, createdAt: '2026-10-15T10:00:00.000Z', driverName: 'Teszt', plateNumber: 'ABC-123' }
    const base = mentes([])
    const local = mentes([], 'Helyi fejléc')
    local.adatok.kiallasok = [callOut]
    const cloud = mentes([], 'Másik fejléc')

    const result = mergeBackupChanges(base.adatok, local, cloud)

    expect(result.value.adatok.kiallasok).toEqual([callOut])
    expect(result.conflicts).toEqual(['appFejlec'])
  })
})
