import { dijszabalyEllenorzese, type Dijszabaly } from '../domain/dijszabaly'

export interface FuvarRecord {
  id: string
  createdAt: string
  fuvarszam: string
  szallitolevel: string
  gyarId: string
  gyarNev: string
  cim: string
  fuvarAlap: number
  zonaLepes: number
  projekt: string
  projektDij: number | null
  m3: number
  minM3?: number
  szamlazottM3?: number
  km: number
  allasDb: number
  betonDij: number
  kmExtra: number
  allasDij: number
  ido?: string
  ejszakaPotlek?: number
  ejszakai?: boolean
  total: number
}

export interface Gyar {
  id: string
  nev: string
  fuvarAlap: number
  zonaLepes: number
  minM3: number
  allasDij: number
  ejszakaiTarifa?: {
    fuvarAlap: number
    zonaLepes: number
  }
  dijszabaly?: Dijszabaly
}

export interface KiallasUtvonal {
  id: string
  honnan: string
  hova: string
  dij: number
}

export interface KiallasRecord extends Omit<KiallasUtvonal, 'id'> {
  id: string
  routeId?: string
  createdAt: string
  driverName: string
  plateNumber: string
}

export interface Projekt {
  nev: string
  arM3: number | null
  gyarId?: string
}

export type MunkaTipus = 'fuvarozas' | 'muhely'

export interface MunkaidoTetel {
  id: string
  createdAt: string
  datum: string
  tipus: MunkaTipus
  kezdes: string
  zaras: string
  perc: number
  oraber: number | null
  total: number
}

export type MunkaidoTetelDraft = Omit<MunkaidoTetel, 'id' | 'createdAt'>

export type FuvarDraft = Omit<FuvarRecord, 'id' | 'createdAt'> & { minM3?: number; createdAt?: string }

export interface Adatmentes {
  formatum: 'beton-fuvar-mentes'
  verzio: 1
  letrehozva: string
  driverName?: string
  plateNumber?: string
  adatok: {
    fuvarok: FuvarRecord[]
    gyarak: Gyar[]
    munkaidoTetelek: MunkaidoTetel[]
    projektek: Projekt[]
    kiallasUtvonalak?: KiallasUtvonal[]
    kiallasok?: KiallasRecord[]
    jelenletiFejlec: { munkaltato: string; dolgozo: string }
    appFejlec: string
  }
}

export const STORAGE_KEY = 'fuvarok_v70'
export const GYAR_STORAGE_KEY = 'gyarak_v70'
export const MUHELY_STORAGE_KEY = 'muhely_tetelek_v70'
export const JELENLETI_FEJLEC_KEY = 'jelenleti_fejlec_v70'
export const APP_FEJLEC_STORAGE_KEY = 'app_fejlec_v70'
export const PROJEKT_STORAGE_KEY = 'projektek_v70'
export const KIAL_UVONALAK_STORAGE_KEY = 'kiallas_utvonalak_v1'
export const KIAL_STORAGE_KEY = 'kiallasok_v1'

export const SOFOR_NEV_ZAR_KEY = 'sofor_nev_zarolt_v1'

export function zarolSoforNev(): string | null {
  const nev = localStorage.getItem(SOFOR_NEV_ZAR_KEY)
  return nev !== null && nev.trim().length > 0 ? nev : null
}

function zarolasAlkalmazasa(fejlec: string): string {
  const nev = zarolSoforNev()
  if (nev === null) return fejlec
  const rendszam = fejlec.split('|').slice(1).join('|').trim()
  return rendszam ? `${nev} | ${rendszam}` : nev
}

// Az első belépéskor rögzíti a sofőr nevét; utána már nem módosítható.
export function soforNevRogzitese(nev: string, rendszam: string): string {
  if (zarolSoforNev() !== null) throw new Error('A sofőr neve már rögzítve van, nem módosítható.')
  const ervenyesNev = nev.trim().replace(/\|/g, ' ').replace(/\s+/g, ' ')
  const ervenyesRendszam = rendszam.trim().replace(/\|/g, ' ')
  if (ervenyesNev.length < 2 || ervenyesNev.length > 50) throw new Error('A név 2–50 karakter hosszú legyen.')
  if (ervenyesRendszam.length > 20) throw new Error('A rendszám legfeljebb 20 karakter lehet.')
  localStorage.setItem(SOFOR_NEV_ZAR_KEY, ervenyesNev)
  const fejlec = ervenyesRendszam ? `${ervenyesNev} | ${ervenyesRendszam}` : ervenyesNev
  localStorage.setItem(APP_FEJLEC_STORAGE_KEY, fejlec)
  return fejlec
}

export function appFejlecBetoltese(alapErtek: string): string {
  const adat = localStorage.getItem(APP_FEJLEC_STORAGE_KEY)
  if (adat === null) return zarolasAlkalmazasa(alapErtek)
  if (adat.trim().length === 0 || adat.length > 80) {
    throw new Error('Az alkalmazás fejlécének mentett neve hibás.')
  }
  return zarolasAlkalmazasa(adat)
}

export function appFejlecMentese(fejlec: string): string {
  const ervenyesFejlec = zarolasAlkalmazasa(fejlec.trim())
  if (ervenyesFejlec.length === 0 || ervenyesFejlec.length > 80) {
    throw new Error('A fejléc neve 1–80 karakter hosszú legyen.')
  }
  localStorage.setItem(APP_FEJLEC_STORAGE_KEY, ervenyesFejlec)
  return ervenyesFejlec
}

export function adatmentesExportalasa(alapGyarak: Gyar[], alapProjektek: string[], alapMinM3: number, alapAllasDij: number, alapAppFejlec: string): Adatmentes {
  const appFejlec = appFejlecBetoltese(alapAppFejlec)
  const [fejlecNev, ...rendszamReszek] = appFejlec.split('|')
  const driverName = fejlecNev.trim() || appFejlec
  const plateNumber = rendszamReszek.join('|').trim()
  return {
    formatum: 'beton-fuvar-mentes',
    verzio: 1,
    letrehozva: new Date().toISOString(),
    driverName,
    ...(plateNumber ? { plateNumber } : {}),
    adatok: {
      fuvarok: betoltes(),
      gyarak: gyarakBetoltese(alapGyarak, alapMinM3, alapAllasDij),
      munkaidoTetelek: muhelyTetelekBetoltese(),
      projektek: projektekBetoltese(alapProjektek),
      kiallasUtvonalak: kiallasUtvonalakBetoltese(),
      kiallasok: kiallasokBetoltese(),
      jelenletiFejlec: jelenletiFejlecBetoltese(),
      appFejlec
    }
  }
}

function ervenyesFejlec(adat: unknown): adat is { munkaltato: string; dolgozo: string } {
  if (typeof adat !== 'object' || adat === null) return false
  const fejlec = adat as { munkaltato?: unknown; dolgozo?: unknown }
  return typeof fejlec.munkaltato === 'string'
    && typeof fejlec.dolgozo === 'string'
}

export function adatmentesEllenorzese(adat: unknown, alapMinM3: number, alapAllasDij: number): Adatmentes {
  if (typeof adat !== 'object' || adat === null) {
    throw new Error('A fájl nem érvényes Beton fuvar biztonsági mentés.')
  }
  const mentes = adat as Partial<Adatmentes>
  if (mentes.formatum !== 'beton-fuvar-mentes' || mentes.verzio !== 1
    || typeof mentes.letrehozva !== 'string'
    || (mentes.driverName !== undefined && typeof mentes.driverName !== 'string')
    || (mentes.plateNumber !== undefined && typeof mentes.plateNumber !== 'string')
    || typeof mentes.adatok !== 'object' || mentes.adatok === null) {
    throw new Error('A fájl nem támogatott Beton fuvar mentésformátum.')
  }

  const adatok = mentes.adatok as Partial<Adatmentes['adatok']>
  const fuvarok = adatok.fuvarok
  const gyarak = adatok.gyarak
  const munkaidoTetelek = adatok.munkaidoTetelek
  const projektek = adatok.projektek
  const kiallasUtvonalak = adatok.kiallasUtvonalak ?? []
  const kiallasok = adatok.kiallasok ?? []
  if (!Array.isArray(fuvarok) || !fuvarok.every(ervenyesFuvar)
    || new Set(fuvarok.map((fuvar) => fuvar.id)).size !== fuvarok.length) {
    throw new Error('A mentés fuvarlistája hibás vagy ismétlődő azonosítót tartalmaz.')
  }
  if (!Array.isArray(gyarak)
    || gyarak.some((gyar) => gyarRegiFormatumAtalakitas(gyar, alapMinM3, alapAllasDij) === null)
    || new Set(gyarak.map((gyar) => gyar.id)).size !== gyarak.length) {
    throw new Error('A mentés gyárlistája hibás vagy ismétlődő azonosítót tartalmaz.')
  }
  if (!Array.isArray(munkaidoTetelek)
    || munkaidoTetelek.some((tetel) => regiMunkaidoAtalakitas(tetel) === null)
    || new Set(munkaidoTetelek.map((tetel) => tetel.id)).size !== munkaidoTetelek.length) {
    throw new Error('A mentés munkaidő-listája hibás vagy ismétlődő azonosítót tartalmaz.')
  }
  if (!Array.isArray(projektek) || !projektek.every(ervenyesProjekt)
    || projektek.some((projekt) => projekt.gyarId !== undefined && !gyarak.some((gyar) => gyar.id === projekt.gyarId))
    || new Set(projektek.map(projektKulcs)).size !== projektek.length) {
    throw new Error('A mentés projektlistája hibás, ismeretlen gyárhoz tartozik vagy ugyanazon gyárnál ismétlődő nevet tartalmaz.')
  }
  if (!Array.isArray(kiallasUtvonalak) || !kiallasUtvonalak.every(ervenyesKiallasUtvonal)
    || new Set(kiallasUtvonalak.map((utvonal) => utvonal.id)).size !== kiallasUtvonalak.length) {
    throw new Error('A mentés kiállási útvonal-listája hibás.')
  }
  if (!Array.isArray(kiallasok) || !kiallasok.every(ervenyesKiallas)
    || new Set(kiallasok.map((kiallas) => kiallas.id)).size !== kiallasok.length) {
    throw new Error('A mentés kiállás-listája hibás vagy ismétlődő azonosítót tartalmaz.')
  }
  if (!ervenyesFejlec(adatok.jelenletiFejlec)
    || typeof adatok.appFejlec !== 'string'
    || adatok.appFejlec.trim().length === 0
    || adatok.appFejlec.length > 80) {
    throw new Error('A mentés valamelyik fejlécadata hibás.')
  }

  return {
    formatum: 'beton-fuvar-mentes',
    verzio: 1,
    letrehozva: mentes.letrehozva,
    ...(mentes.driverName !== undefined ? { driverName: mentes.driverName } : {}),
    ...(mentes.plateNumber !== undefined ? { plateNumber: mentes.plateNumber } : {}),
    adatok: {
      fuvarok: fuvarok.map((fuvar) => ({
        ...fuvar,
        cim: fuvar.cim ?? '',
        projektDij: fuvar.projektDij ?? null,
        fuvarAlap: fuvar.fuvarAlap ?? (fuvar as FuvarRecord & { alapAr: number }).alapAr,
        zonaLepes: fuvar.zonaLepes ?? (fuvar as FuvarRecord & { zonaNovegmenyek?: number[] }).zonaNovegmenyek?.find((value) => value > 0) ?? 0
      })),
      gyarak: gyarak.map((gyar) => gyarRegiFormatumAtalakitas(gyar, alapMinM3, alapAllasDij)!),
      munkaidoTetelek: munkaidoTetelek.map((tetel) => regiMunkaidoAtalakitas(tetel)!),
      projektek,
      kiallasUtvonalak,
      kiallasok,
      jelenletiFejlec: adatok.jelenletiFejlec,
      appFejlec: adatok.appFejlec.trim()
    }
  }
}

export function adatmentesVisszaallitasa(mentes: Adatmentes): void {
  const ujAdatok = new Map<string, string>([
    [STORAGE_KEY, JSON.stringify(mentes.adatok.fuvarok)],
    [GYAR_STORAGE_KEY, JSON.stringify(mentes.adatok.gyarak)],
    [MUHELY_STORAGE_KEY, JSON.stringify(mentes.adatok.munkaidoTetelek)],
    [PROJEKT_STORAGE_KEY, JSON.stringify(mentes.adatok.projektek)],
    [KIAL_UVONALAK_STORAGE_KEY, JSON.stringify(mentes.adatok.kiallasUtvonalak ?? [])],
    [KIAL_STORAGE_KEY, JSON.stringify(mentes.adatok.kiallasok ?? [])],
    [JELENLETI_FEJLEC_KEY, JSON.stringify(mentes.adatok.jelenletiFejlec)],
    [APP_FEJLEC_STORAGE_KEY, zarolasAlkalmazasa(mentes.adatok.appFejlec)]
  ])
  const regiAdatok = new Map(Array.from(ujAdatok.keys(), (key) => [key, localStorage.getItem(key)]))
  try {
    for (const [key, value] of ujAdatok) localStorage.setItem(key, value)
  } catch (error) {
    let visszaallitasHiba = false
    for (const [key, value] of regiAdatok) {
      try {
        if (value === null) localStorage.removeItem(key)
        else localStorage.setItem(key, value)
      } catch {
        visszaallitasHiba = true
      }
    }
    if (visszaallitasHiba) {
      throw new Error('A visszaállítás félbeszakadt, és a korábbi adatok teljes visszaállítása sem sikerült. Ne zárd be az alkalmazást; ellenőrizd a mentett adatokat.')
    }
    throw new Error(`Nem sikerült visszaállítani az adatokat; a korábbi mentés változatlan maradt. ${error instanceof Error ? error.message : ''}`)
  }
}

function gyarRegiFormatumAtalakitas(adat: unknown, alapMinM3: number, alapAllasDij: number): Gyar | null {
  if (typeof adat !== 'object' || adat === null) return null
  const gyar = adat as Partial<Gyar>
  const regiAlap = (adat as { alap?: unknown }).alap
  const fuvarAlap = gyar.fuvarAlap ?? regiAlap
  const minM3 = gyar.minM3 ?? alapMinM3
  const allasDij = gyar.allasDij ?? alapAllasDij
  if (typeof gyar.id !== 'string'
    || typeof gyar.nev !== 'string'
    || gyar.nev.trim().length === 0
    || typeof fuvarAlap !== 'number'
    || !Number.isFinite(fuvarAlap)
    || fuvarAlap <= 0
    || typeof minM3 !== 'number'
    || !Number.isFinite(minM3)
    || minM3 <= 0
    || typeof allasDij !== 'number'
    || !Number.isSafeInteger(allasDij)
    || allasDij < 0) return null
  const regiNovegmenyek = (adat as { zonaNovegmenyek?: unknown }).zonaNovegmenyek
  const zonaLepes = gyar.zonaLepes
    ?? (Array.isArray(regiNovegmenyek)
      ? regiNovegmenyek.find((value) => typeof value === 'number' && value > 0) ?? 0
      : 0)
  if (typeof zonaLepes !== 'number' || !Number.isSafeInteger(zonaLepes) || zonaLepes < 0) {
    return null
  }
  let ejszakaiTarifa: Gyar['ejszakaiTarifa']
  if (gyar.ejszakaiTarifa !== undefined) {
    const tarifa = gyar.ejszakaiTarifa
    if (!tarifa || !Number.isSafeInteger(tarifa.fuvarAlap) || tarifa.fuvarAlap <= 0
      || !Number.isSafeInteger(tarifa.zonaLepes) || tarifa.zonaLepes < 0) return null
    ejszakaiTarifa = { fuvarAlap: tarifa.fuvarAlap, zonaLepes: tarifa.zonaLepes }
  }
  let dijszabaly: Dijszabaly | undefined
  try {
    dijszabaly = dijszabalyEllenorzese(gyar.dijszabaly)
  } catch {
    return null
  }
  return { id: gyar.id, nev: gyar.nev, fuvarAlap, zonaLepes, minM3, allasDij, ...(ejszakaiTarifa ? { ejszakaiTarifa } : {}), ...(dijszabaly ? { dijszabaly } : {}) }
}

function ervenyesKiallasUtvonal(adat: unknown): adat is KiallasUtvonal {
  if (typeof adat !== 'object' || adat === null || Array.isArray(adat)) return false
  const utvonal = adat as Partial<KiallasUtvonal>
  return typeof utvonal.id === 'string' && utvonal.id.trim().length > 0
    && typeof utvonal.honnan === 'string' && utvonal.honnan.trim().length > 0
    && typeof utvonal.hova === 'string' && utvonal.hova.trim().length > 0
    && utvonal.honnan !== utvonal.hova
    && typeof utvonal.dij === 'number' && Number.isSafeInteger(utvonal.dij) && utvonal.dij >= 0
}

function ervenyesKiallas(adat: unknown): adat is KiallasRecord {
  if (!ervenyesKiallasUtvonal(adat)) return false
  const kiallas = adat as Partial<KiallasRecord>
  return typeof kiallas.createdAt === 'string' && !Number.isNaN(Date.parse(kiallas.createdAt))
    && (kiallas.routeId === undefined || typeof kiallas.routeId === 'string')
    && typeof kiallas.driverName === 'string'
    && typeof kiallas.plateNumber === 'string'
}

export function kiallasUtvonalakBetoltese(): KiallasUtvonal[] {
  const raw = localStorage.getItem(KIAL_UVONALAK_STORAGE_KEY)
  if (raw === null) return []
  const parsed: unknown = JSON.parse(raw)
  if (!Array.isArray(parsed) || !parsed.every(ervenyesKiallasUtvonal)) {
    throw new Error('A mentett kiállási útvonal-lista hibás.')
  }
  return parsed
}

export function kiallasokBetoltese(): KiallasRecord[] {
  const raw = localStorage.getItem(KIAL_STORAGE_KEY)
  if (raw === null) return []
  const parsed: unknown = JSON.parse(raw)
  if (!Array.isArray(parsed) || !parsed.every(ervenyesKiallas)) {
    throw new Error('A mentett kiálláslista hibás.')
  }
  return parsed
}

export function kiallasMentes(utvonal: KiallasUtvonal, driverName: string, plateNumber: string): KiallasRecord[] {
  if (!ervenyesKiallasUtvonal(utvonal)) throw new Error('A kiválasztott kiállási útvonal hibás.')
  const record: KiallasRecord = {
    ...utvonal,
    id: globalThis.crypto?.randomUUID?.() ?? `kiallas-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    routeId: utvonal.id,
    createdAt: new Date().toISOString(),
    driverName,
    plateNumber
  }
  const updated = [record, ...kiallasokBetoltese()]
  localStorage.setItem(KIAL_STORAGE_KEY, JSON.stringify(updated))
  return updated
}

export function kiallasTorles(id: string): KiallasRecord[] {
  const updated = kiallasokBetoltese().filter((record) => record.id !== id)
  localStorage.setItem(KIAL_STORAGE_KEY, JSON.stringify(updated))
  return updated
}

export function gyarakBetoltese(alapGyarak: Gyar[], alapMinM3: number, alapAllasDij: number): Gyar[] {
  const adat = localStorage.getItem(GYAR_STORAGE_KEY)
  if (adat === null) return alapGyarak

  const parsed: unknown = JSON.parse(adat)
  if (!Array.isArray(parsed)) {
    throw new Error('A mentett gyárlista hibás formátumú. A korábbi adatokat megőriztem.')
  }
  const atalakitott = parsed.map((gyar) => gyarRegiFormatumAtalakitas(gyar, alapMinM3, alapAllasDij))
  if (atalakitott.some((gyar) => gyar === null)) {
    throw new Error('A mentett gyárlista hibás formátumú. A korábbi adatokat megőriztem.')
  }
  return atalakitott as Gyar[]
}

export function gyarakMentese(gyarak: Gyar[]): Gyar[] {
  if (!gyarak.every((gyar) => gyarRegiFormatumAtalakitas(gyar, 4, 2000) !== null)) {
    throw new Error('A gyárlista érvénytelen adatot tartalmaz, ezért nem mentettem el.')
  }
  localStorage.setItem(GYAR_STORAGE_KEY, JSON.stringify(gyarak))
  return gyarak
}

function ervenyesFuvar(adat: unknown): adat is FuvarRecord {
  if (typeof adat !== 'object' || adat === null) return false
  const record = adat as Partial<FuvarRecord>
  const fuvarAlap = record.fuvarAlap ?? (adat as { alapAr?: unknown }).alapAr
  const regiNovegmenyek = (adat as { zonaNovegmenyek?: unknown }).zonaNovegmenyek
  const zonaLepes = record.zonaLepes
    ?? (Array.isArray(regiNovegmenyek)
      ? regiNovegmenyek.find((value) => typeof value === 'number' && value > 0) ?? 0
      : 0)
  return typeof record.id === 'string'
    && typeof record.createdAt === 'string'
    && typeof record.fuvarszam === 'string'
    && typeof record.szallitolevel === 'string'
    && typeof record.gyarId === 'string'
    && typeof record.gyarNev === 'string'
    && (record.cim === undefined || typeof record.cim === 'string')
    && (record.ido === undefined || typeof record.ido === 'string')
    && (record.ejszakaPotlek === undefined || (typeof record.ejszakaPotlek === 'number' && Number.isFinite(record.ejszakaPotlek)))
    && typeof fuvarAlap === 'number' && Number.isFinite(fuvarAlap)
    && (record.projektDij === undefined || record.projektDij === null
      || (typeof record.projektDij === 'number' && Number.isSafeInteger(record.projektDij) && record.projektDij > 0))
    && typeof zonaLepes === 'number' && Number.isSafeInteger(zonaLepes) && zonaLepes >= 0
    && typeof record.projekt === 'string'
    && typeof record.m3 === 'number' && Number.isFinite(record.m3)
    && (record.minM3 === undefined || (typeof record.minM3 === 'number' && Number.isFinite(record.minM3) && record.minM3 > 0))
    && (record.szamlazottM3 === undefined || (typeof record.szamlazottM3 === 'number' && Number.isFinite(record.szamlazottM3) && record.szamlazottM3 > 0))
    && typeof record.km === 'number' && Number.isFinite(record.km)
    && typeof record.allasDb === 'number' && Number.isSafeInteger(record.allasDb) && record.allasDb >= 0 && record.allasDb <= 20
    && typeof record.betonDij === 'number' && Number.isFinite(record.betonDij)
    && typeof record.kmExtra === 'number' && Number.isFinite(record.kmExtra)
    && typeof record.allasDij === 'number' && Number.isFinite(record.allasDij)
    && typeof record.total === 'number' && Number.isFinite(record.total)
}

function beolvasLista(): FuvarRecord[] {
  const adat = localStorage.getItem(STORAGE_KEY)
  if (adat === null) return []

  const parsed: unknown = JSON.parse(adat)
  if (!Array.isArray(parsed)) {
    throw new Error('A mentett fuvarlista formátuma hibás. Az adatok megőrzése érdekében nem írtam felül.')
  }
  if (!parsed.every(ervenyesFuvar)) {
    throw new Error('A mentett fuvarok régi vagy hibás formátumúak. A mentett adatokat megőriztem.')
  }
  return parsed as FuvarRecord[]
}

export function betoltes(): FuvarRecord[] {
  return beolvasLista().map((record) => {
    const fuvarAlap = record.fuvarAlap ?? (record as FuvarRecord & { alapAr?: number }).alapAr
    const legacy = record as FuvarRecord & { zonaNovegmenyek?: number[] }
    const zonaLepes = record.zonaLepes
      ?? legacy.zonaNovegmenyek?.find((value) => value > 0)
      ?? 0
    return { ...record, cim: record.cim ?? '', projektDij: record.projektDij ?? null, fuvarAlap, zonaLepes }
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function mentes(fuvar: FuvarDraft, id?: string): FuvarRecord[] {
  const lista = beolvasLista()
  const regi = id ? lista.find((item) => item.id === id) : undefined
  const ujAzonosito = globalThis.crypto?.randomUUID?.()
    ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
  const rekord: FuvarRecord = {
    ...fuvar,
    fuvarAlap: fuvar.fuvarAlap,
    id: regi?.id ?? ujAzonosito,
    createdAt: fuvar.createdAt ?? regi?.createdAt ?? new Date().toISOString()
  }
  const ujLista = regi
    ? lista.map((item) => item.id === id ? rekord : item)
    : [rekord, ...lista]

  localStorage.setItem(STORAGE_KEY, JSON.stringify(ujLista))
  return betoltes()
}

export function torles(id: string): FuvarRecord[] {
  const ujLista = beolvasLista().filter((item) => item.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ujLista))
  return betoltes()
}

function ervenyesMunkaidoTetel(adat: unknown): adat is MunkaidoTetel {
  if (typeof adat !== 'object' || adat === null) return false
  const tetel = adat as Partial<MunkaidoTetel>
  return typeof tetel.id === 'string'
    && typeof tetel.createdAt === 'string'
    && typeof tetel.datum === 'string'
    && /^\d{4}-\d{2}-\d{2}$/.test(tetel.datum)
    && (tetel.tipus === 'fuvarozas' || tetel.tipus === 'muhely')
    && typeof tetel.kezdes === 'string'
    && typeof tetel.zaras === 'string'
    && typeof tetel.perc === 'number' && Number.isFinite(tetel.perc) && tetel.perc > 0
    && (tetel.oraber === null || (typeof tetel.oraber === 'number' && Number.isSafeInteger(tetel.oraber) && tetel.oraber > 0))
    && typeof tetel.total === 'number' && Number.isFinite(tetel.total) && tetel.total >= 0
}

function regiMunkaidoAtalakitas(adat: unknown): MunkaidoTetel | null {
  if (typeof adat !== 'object' || adat === null) return null
  const regi = adat as Partial<MunkaidoTetel> & { oraber?: number; datum?: string }
  const createdAt = regi.createdAt
  const datum = regi.datum ?? (typeof createdAt === 'string' ? createdAt.slice(0, 10) : '')
  const tetel: MunkaidoTetel = {
    id: regi.id ?? '',
    createdAt: createdAt ?? '',
    datum,
    tipus: regi.tipus ?? 'muhely',
    kezdes: regi.kezdes ?? '',
    zaras: regi.zaras ?? '',
    perc: regi.perc ?? 0,
    oraber: regi.oraber ?? null,
    total: regi.total ?? 0
  }
  return ervenyesMunkaidoTetel(tetel) ? tetel : null
}

export function muhelyTetelekBetoltese(): MunkaidoTetel[] {
  const adat = localStorage.getItem(MUHELY_STORAGE_KEY)
  if (adat === null) return []

  const parsed: unknown = JSON.parse(adat)
  if (!Array.isArray(parsed)) {
    throw new Error('A mentett munkaidő-bejegyzések formátuma hibás. A korábbi adatokat megőriztem.')
  }
  const atalakitott = parsed.map(regiMunkaidoAtalakitas)
  if (atalakitott.some((tetel) => tetel === null)) {
    throw new Error('A mentett munkaidő-bejegyzések formátuma hibás. A korábbi adatokat megőriztem.')
  }
  return (atalakitott as MunkaidoTetel[]).sort((a, b) => b.datum.localeCompare(a.datum))
}

export function muhelyTetelMentese(draft: MunkaidoTetelDraft, id?: string): MunkaidoTetel[] {
  const lista = muhelyTetelekBetoltese()
  const regi = id ? lista.find((tetel) => tetel.id === id) : lista.find((tetel) => tetel.datum === draft.datum && tetel.tipus === draft.tipus)
  const azonosito = globalThis.crypto?.randomUUID?.()
    ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
  const tetel: MunkaidoTetel = {
    ...draft,
    id: regi?.id ?? azonosito,
    createdAt: regi?.createdAt ?? new Date().toISOString()
  }
  const ujLista = regi
    ? lista.map((item) => item.id === regi.id ? tetel : item)
    : [tetel, ...lista]
  localStorage.setItem(MUHELY_STORAGE_KEY, JSON.stringify(ujLista))
  return muhelyTetelekBetoltese()
}

export function muhelyTetelTorlese(id: string): MunkaidoTetel[] {
  const ujLista = muhelyTetelekBetoltese().filter((tetel) => tetel.id !== id)
  localStorage.setItem(MUHELY_STORAGE_KEY, JSON.stringify(ujLista))
  return muhelyTetelekBetoltese()
}

export function jelenletiFejlecBetoltese(): { munkaltato: string; dolgozo: string } {
  const adat = localStorage.getItem(JELENLETI_FEJLEC_KEY)
  if (adat === null) return { munkaltato: '', dolgozo: '' }
  const parsed: unknown = JSON.parse(adat)
  if (typeof parsed !== 'object' || parsed === null
    || typeof (parsed as { munkaltato?: unknown }).munkaltato !== 'string'
    || typeof (parsed as { dolgozo?: unknown }).dolgozo !== 'string') {
    throw new Error('A jelenléti ív fejlécének mentett adata hibás.')
  }
  return parsed as { munkaltato: string; dolgozo: string }
}

export function jelenletiFejlecMentese(fejlec: { munkaltato: string; dolgozo: string }): void {
  localStorage.setItem(JELENLETI_FEJLEC_KEY, JSON.stringify(fejlec))
}

function ervenyesProjekt(adat: unknown): adat is Projekt {
  if (typeof adat !== 'object' || adat === null) return false
  const projekt = adat as Partial<Projekt>
  return typeof projekt.nev === 'string'
    && projekt.nev.trim().length > 0
    && (projekt.gyarId === undefined || (typeof projekt.gyarId === 'string' && projekt.gyarId.trim().length > 0))
    && (projekt.arM3 === null
      || (typeof projekt.arM3 === 'number' && Number.isSafeInteger(projekt.arM3) && projekt.arM3 > 0))
}

function projektKulcs(projekt: Projekt): string {
  return `${projekt.gyarId ?? ''}:${projekt.nev.trim().toLocaleLowerCase('hu-HU')}`
}

export function projektekBetoltese(alapNevek: string[]): Projekt[] {
  const adat = localStorage.getItem(PROJEKT_STORAGE_KEY)
  if (adat === null) return alapNevek.map((nev) => ({ nev, arM3: null }))
  const parsed: unknown = JSON.parse(adat)
  if (!Array.isArray(parsed) || !parsed.every(ervenyesProjekt)) {
    throw new Error('A mentett projektlista hibás formátumú. A korábbi adatokat megőriztem.')
  }
  return parsed
}

export function projektekMentese(projektek: Projekt[]): Projekt[] {
  if (!projektek.every(ervenyesProjekt)
    || new Set(projektek.map(projektKulcs)).size !== projektek.length) {
    throw new Error('A projektlista érvénytelen vagy ugyanazon gyárhoz ismétlődő nevet tartalmaz, ezért nem mentettem el.')
  }
  localStorage.setItem(PROJEKT_STORAGE_KEY, JSON.stringify(projektek))
  return projektek
}
