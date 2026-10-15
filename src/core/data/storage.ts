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
  km: number
  allasDb: number
  betonDij: number
  kmExtra: number
  allasDij: number
  total: number
}

export interface Gyar {
  id: string
  nev: string
  fuvarAlap: number
  zonaLepes: number
  minM3: number
  allasDij: number
}

export interface Projekt {
  nev: string
  arM3: number | null
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

export type FuvarDraft = Omit<FuvarRecord, 'id' | 'createdAt'>

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

export function appFejlecBetoltese(alapErtek: string): string {
  const adat = localStorage.getItem(APP_FEJLEC_STORAGE_KEY)
  if (adat === null) return alapErtek
  if (adat.trim().length === 0 || adat.length > 80) {
    throw new Error('Az alkalmazás fejlécének mentett neve hibás.')
  }
  return adat
}

export function appFejlecMentese(fejlec: string): string {
  const ervenyesFejlec = fejlec.trim()
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
    || new Set(projektek.map((projekt) => projekt.nev.trim().toLocaleLowerCase('hu-HU'))).size !== projektek.length) {
    throw new Error('A mentés projektlistája hibás vagy ismétlődő nevet tartalmaz.')
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
    [JELENLETI_FEJLEC_KEY, JSON.stringify(mentes.adatok.jelenletiFejlec)],
    [APP_FEJLEC_STORAGE_KEY, mentes.adatok.appFejlec]
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
  return { id: gyar.id, nev: gyar.nev, fuvarAlap, zonaLepes, minM3, allasDij }
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
    && typeof fuvarAlap === 'number' && Number.isFinite(fuvarAlap)
    && (record.projektDij === undefined || record.projektDij === null
      || (typeof record.projektDij === 'number' && Number.isSafeInteger(record.projektDij) && record.projektDij > 0))
    && typeof zonaLepes === 'number' && Number.isSafeInteger(zonaLepes) && zonaLepes >= 0
    && typeof record.projekt === 'string'
    && typeof record.m3 === 'number' && Number.isFinite(record.m3)
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
    createdAt: regi?.createdAt ?? new Date().toISOString()
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
  const regi = id ? lista.find((tetel) => tetel.id === id) : lista.find((tetel) => tetel.datum === draft.datum)
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
    && (projekt.arM3 === null
      || (typeof projekt.arM3 === 'number' && Number.isSafeInteger(projekt.arM3) && projekt.arM3 > 0))
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
    || new Set(projektek.map((projekt) => projekt.nev.trim().toLocaleLowerCase('hu-HU'))).size !== projektek.length) {
    throw new Error('A projektlista érvénytelen vagy ismétlődő nevet tartalmaz, ezért nem mentettem el.')
  }
  localStorage.setItem(PROJEKT_STORAGE_KEY, JSON.stringify(projektek))
  return projektek
}
