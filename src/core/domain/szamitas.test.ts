import { describe, expect, it } from 'vitest'
import { szamitas, zonaLepesekSzama, zonaNovegmenyOsszesen, zonaSavNeve } from './szamitas'

describe('övezeti távolság', () => {
  it.each([
    [0, 0, '0–5 km'],
    [5, 0, '0–5 km'],
    [5.1, 1, '5–10 km'],
    [10, 1, '5–10 km'],
    [10.1, 2, '10–15 km'],
    [60, 11, '55–60 km']
  ])('%s km → %s zónalépés, %s', (km, lepesek, sav) => {
    expect(zonaLepesekSzama(km)).toBe(lepesek)
    expect(zonaSavNeve(km)).toBe(sav)
  })

  it('60 km felett is legfeljebb a legfelső zónalépést alkalmazza', () => {
    expect(zonaLepesekSzama(75)).toBe(11)
    expect(zonaNovegmenyOsszesen(75, 700)).toBe(7700)
  })
})

describe('fuvarár-kalkuláció', () => {
  it('a gyári minimum mennyiséggel számol, ha a fuvar ennél kisebb', () => {
    expect(szamitas({
      fuvarAlap: 18000,
      zonaLepes: 700,
      minM3: 4,
      m3: 3,
      km: 0,
      allasDb: 0,
      allasDij: 2000
    })).toEqual({
      szamlazottM3: 4,
      betonDij: 72000,
      zonaFtPerM3: 0,
      kmExtra: 0,
      allasDij: 0,
      total: 117000
    })
  })

  it('a távolsági zónát, állásidőt és fix fuvardíjat összesíti', () => {
    expect(szamitas({
      fuvarAlap: 18000,
      zonaLepes: 700,
      minM3: 4,
      m3: 5,
      km: 10.1,
      allasDb: 2,
      allasDij: 2000
    }, { fuvarFixDij: 45000 })).toEqual({
      szamlazottM3: 5,
      betonDij: 90000,
      zonaFtPerM3: 1400,
      kmExtra: 7000,
      allasDij: 4000,
      total: 146000
    })
  })
})
