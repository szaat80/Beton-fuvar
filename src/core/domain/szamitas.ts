// CORE - SOHA NE BÁNTSD, EZ A MOTOR
// A gyár alapára és az elért övezetek növekménye m³-rel szorzódik.

export interface FuvarInput {
  fuvarAlap: number
  zonaLepes: number
  minM3: number
  m3: number
  km: number
  allasDb: number
  allasDij: number
}

export interface Arszabaly {
  fuvarFixDij: number
}

const alapArszabaly: Arszabaly = {
  fuvarFixDij: 45000
}

export const ZONA_SAVOK = Array.from({ length: 11 }, (_, index) => ({
  also: (index + 1) * 5,
  felso: (index + 2) * 5
}))

export function zonaLepesekSzama(km: number): number {
  if (km <= 5) return 0
  return Math.min(ZONA_SAVOK.length, Math.ceil((km - 5) / 5))
}

export function zonaSavNeve(km: number): string {
  if (km <= 5) return '0–5 km'
  const zonaSzam = zonaLepesekSzama(km)
  const zona = ZONA_SAVOK[zonaSzam - 1]
  return `${zona.also}–${zona.felso} km`
}

export function zonaNovegmenyOsszesen(km: number, zonaLepes: number): number {
  return zonaLepesekSzama(km) * zonaLepes
}

export function szamitas(input: FuvarInput, arszabaly: Arszabaly = alapArszabaly) {
  const szamlazottM3 = Math.max(input.minM3, input.m3)
  const betonDij = szamlazottM3 * input.fuvarAlap
  const zonaFtPerM3 = zonaNovegmenyOsszesen(input.km, input.zonaLepes)
  const kmExtra = szamlazottM3 * zonaFtPerM3
  const allasDij = input.allasDb * input.allasDij
  const total = betonDij + kmExtra + allasDij + arszabaly.fuvarFixDij
  return {
    szamlazottM3,
    betonDij,
    zonaFtPerM3,
    kmExtra,
    allasDij,
    total
  }
}
