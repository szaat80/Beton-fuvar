import type { FuvarRecord } from '../../core/data/storage'

export function szamlazottMennyiseg(fuvar: FuvarRecord): number {
  return fuvar.szamlazottM3 ?? Math.max(fuvar.minM3 ?? 0, fuvar.m3)
}

export function ejszakaiTarifaFelirat(fuvar: FuvarRecord): string {
  if (fuvar.ejszakai === true || (fuvar.ejszakaPotlek ?? 0) > 0) return 'Igen'
  if (fuvar.ejszakai === undefined && (fuvar.ido !== undefined || fuvar.ejszakaPotlek !== undefined)) {
    return 'Nincs adat'
  }
  return 'Nem'
}
