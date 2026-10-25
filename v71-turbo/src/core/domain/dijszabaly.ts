// Gyáranként beállítható különleges díjak: kiállási díj, éjszakai pótlék, óradíjas állásidő.

export interface KiallasiDij {
  kuszob: number
  dijKevesebb: number
  dijTobb: number
}

export interface EjszakaiPotlek {
  kezdet: string
  veg: string
  potlek: number
}

export interface AllasOraDij {
  elsoOra: number
  tovabbiOra: number
}

export interface Dijszabaly {
  kiallas?: KiallasiDij
  ejszaka?: EjszakaiPotlek
  allasOra?: AllasOraDij
}

const IDO_MINTA = /^([01]\d|2[0-3]):[0-5]\d$/

function egeszFt(ertek: unknown): ertek is number {
  return typeof ertek === 'number' && Number.isSafeInteger(ertek) && ertek >= 0
}

export function dijszabalyEllenorzese(adat: unknown): Dijszabaly | undefined {
  if (adat === undefined || adat === null) return undefined
  if (typeof adat !== 'object' || Array.isArray(adat)) throw new Error('A díjszabály formátuma hibás.')
  const forras = adat as Dijszabaly
  const eredmeny: Dijszabaly = {}
  if (forras.kiallas) {
    const { kuszob, dijKevesebb, dijTobb } = forras.kiallas
    if (!Number.isInteger(kuszob) || kuszob < 1 || kuszob > 99 || !egeszFt(dijKevesebb) || !egeszFt(dijTobb)) {
      throw new Error('A kiállási díj adatai hibásak.')
    }
    eredmeny.kiallas = { kuszob, dijKevesebb, dijTobb }
  }
  if (forras.ejszaka) {
    const { kezdet, veg, potlek } = forras.ejszaka
    if (!IDO_MINTA.test(kezdet) || !IDO_MINTA.test(veg) || !egeszFt(potlek)) {
      throw new Error('Az éjszakai pótlék adatai hibásak.')
    }
    eredmeny.ejszaka = { kezdet, veg, potlek }
  }
  if (forras.allasOra) {
    const { elsoOra, tovabbiOra } = forras.allasOra
    if (!egeszFt(elsoOra) || !egeszFt(tovabbiOra)) throw new Error('Az óradíjas állásidő adatai hibásak.')
    eredmeny.allasOra = { elsoOra, tovabbiOra }
  }
  return Object.keys(eredmeny).length > 0 ? eredmeny : undefined
}

export function ejszakaiE(ido: string | undefined, szabaly: EjszakaiPotlek | undefined): boolean {
  if (!ido || !szabaly || !IDO_MINTA.test(ido)) return false
  const { kezdet, veg } = szabaly
  if (kezdet === veg) return false
  // Az éjszakai sáv átnyúlhat éjfélen (pl. 22:00–06:00).
  return kezdet < veg ? ido >= kezdet && ido < veg : ido >= kezdet || ido < veg
}

export function ejszakaiPotlek(ido: string | undefined, szabaly: Dijszabaly | undefined): number {
  return ejszakaiE(ido, szabaly?.ejszaka) ? szabaly?.ejszaka?.potlek ?? 0 : 0
}

// Az első megkezdett óra egy díj, minden további megkezdett óra a másik díj.
export function allasidoDij(allasDb: number, allasDijNegyedora: number, szabaly: Dijszabaly | undefined): number {
  if (allasDb <= 0) return 0
  if (!szabaly?.allasOra) return allasDb * allasDijNegyedora
  const orak = Math.ceil((allasDb * 15) / 60)
  return szabaly.allasOra.elsoOra + (orak - 1) * szabaly.allasOra.tovabbiOra
}

export interface KiallasiSor {
  datum: string
  gyarNev: string
  fuvarDb: number
  dij: number
}

interface KiallasiFuvar {
  createdAt: string
  gyarId: string
  gyarNev: string
}

function helyiDatum(iso: string): string {
  const datum = new Date(iso)
  return [
    datum.getFullYear(),
    String(datum.getMonth() + 1).padStart(2, '0'),
    String(datum.getDate()).padStart(2, '0')
  ].join('-')
}

// Gyáranként és naponta egyszer jár a kiállási díj; a fuvarok száma dönti el, melyik ár érvényes.
export function kiallasiDijak(
  fuvarok: KiallasiFuvar[],
  gyarak: Array<{ id: string; nev: string; dijszabaly?: Dijszabaly }>
): KiallasiSor[] {
  const csoportok = new Map<string, KiallasiSor & { kuszob: number }>()
  for (const fuvar of fuvarok) {
    const gyar = gyarak.find((item) => item.id === fuvar.gyarId)
    const kiallas = gyar?.dijszabaly?.kiallas
    if (!gyar || !kiallas) continue
    const datum = helyiDatum(fuvar.createdAt)
    const kulcs = `${datum}|${gyar.id}`
    const sor = csoportok.get(kulcs) ?? { datum, gyarNev: gyar.nev, fuvarDb: 0, dij: 0, kuszob: kiallas.kuszob }
    sor.fuvarDb += 1
    sor.dij = sor.fuvarDb >= kiallas.kuszob ? kiallas.dijTobb : kiallas.dijKevesebb
    csoportok.set(kulcs, sor)
  }
  return [...csoportok.values()]
    .map(({ kuszob: _kuszob, ...sor }) => sor)
    .sort((a, b) => a.datum.localeCompare(b.datum) || a.gyarNev.localeCompare(b.gyarNev, 'hu'))
}
