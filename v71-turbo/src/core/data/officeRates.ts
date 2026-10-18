import {
  GYAR_STORAGE_KEY,
  PROJEKT_STORAGE_KEY,
  type Gyar,
  type Projekt
} from './storage'
import { dijszabalyEllenorzese } from '../domain/dijszabaly'

export const OFFICE_FUVAR_FIX_KEY = 'office_fuvar_fix_dij_v1'
export const OFFICE_MIN_M3_KEY = 'office_min_m3_v1'
export const OFFICE_ALLAS_DIJ_KEY = 'office_allas_dij_v1'
const RATE_UPDATE_MARKER = 'beton_fuvar_office_rates_v1:'

export interface OfficeRateSettings {
  schemaVersion: 1
  gyarak: Gyar[]
  projektek: Projekt[]
  minM3: number
  allasDij: number
  fuvarFixDij: number
}

export function validateOfficeRateSettings(value: unknown): OfficeRateSettings {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Az irodai árfrissítés formátuma hibás.')
  }
  const candidate = value as Partial<OfficeRateSettings>
  if (candidate.schemaVersion !== 1
    || !Array.isArray(candidate.gyarak) || candidate.gyarak.length === 0
    || !Array.isArray(candidate.projektek)
    || typeof candidate.minM3 !== 'number' || !Number.isFinite(candidate.minM3) || candidate.minM3 <= 0
    || typeof candidate.allasDij !== 'number' || !Number.isSafeInteger(candidate.allasDij) || candidate.allasDij < 0
    || typeof candidate.fuvarFixDij !== 'number' || !Number.isSafeInteger(candidate.fuvarFixDij) || candidate.fuvarFixDij < 0) {
    throw new Error('Az irodai árfrissítés hiányos vagy nem támogatott.')
  }

  const gyarak = candidate.gyarak.map(gyar => {
    if (!gyar || typeof gyar.id !== 'string' || !gyar.id.trim()
      || typeof gyar.nev !== 'string' || !gyar.nev.trim()
      || typeof gyar.fuvarAlap !== 'number' || !Number.isSafeInteger(gyar.fuvarAlap) || gyar.fuvarAlap <= 0
      || typeof gyar.zonaLepes !== 'number' || !Number.isSafeInteger(gyar.zonaLepes) || gyar.zonaLepes < 0
      || typeof gyar.minM3 !== 'number' || !Number.isFinite(gyar.minM3) || gyar.minM3 <= 0
      || typeof gyar.allasDij !== 'number' || !Number.isSafeInteger(gyar.allasDij) || gyar.allasDij < 0) {
      throw new Error('Az irodai árfrissítés egyik gyárának adatai hibásak.')
    }
    const dijszabaly = dijszabalyEllenorzese(gyar.dijszabaly)
    return { id: gyar.id, nev: gyar.nev, fuvarAlap: gyar.fuvarAlap, zonaLepes: gyar.zonaLepes, minM3: gyar.minM3, allasDij: gyar.allasDij, ...(dijszabaly ? { dijszabaly } : {}) }
  })

  const projektek = candidate.projektek.map(projekt => {
    if (!projekt || typeof projekt.nev !== 'string' || !projekt.nev.trim()
      || (projekt.arM3 !== null && (typeof projekt.arM3 !== 'number' || !Number.isSafeInteger(projekt.arM3) || projekt.arM3 <= 0))) {
      throw new Error('Az irodai árfrissítés egyik projektjének adatai hibásak.')
    }
    return { nev: projekt.nev, arM3: projekt.arM3 }
  })

  if (new Set(gyarak.map(gyar => gyar.id)).size !== gyarak.length
    || new Set(gyarak.map(gyar => gyar.nev.toLocaleLowerCase('hu-HU'))).size !== gyarak.length
    || new Set(projektek.map(projekt => projekt.nev.toLocaleLowerCase('hu-HU'))).size !== projektek.length) {
    throw new Error('Az irodai árfrissítés ismétlődő gyárat vagy projektet tartalmaz.')
  }
  return {
    schemaVersion: 1,
    gyarak,
    projektek,
    minM3: candidate.minM3,
    allasDij: candidate.allasDij,
    fuvarFixDij: candidate.fuvarFixDij
  }
}

export function applyOfficeRateSettings(value: unknown): OfficeRateSettings {
  const settings = validateOfficeRateSettings(value)
  const updates = new Map<string, string>([
    [GYAR_STORAGE_KEY, JSON.stringify(settings.gyarak)],
    [PROJEKT_STORAGE_KEY, JSON.stringify(settings.projektek)],
    [OFFICE_FUVAR_FIX_KEY, String(settings.fuvarFixDij)],
    [OFFICE_MIN_M3_KEY, String(settings.minM3)],
    [OFFICE_ALLAS_DIJ_KEY, String(settings.allasDij)]
  ])
  const previous = new Map(Array.from(updates.keys(), key => [key, localStorage.getItem(key)]))

  try {
    for (const [key, entry] of updates) localStorage.setItem(key, entry)
  } catch (error) {
    let rollbackFailed = false
    for (const [key, entry] of previous) {
      try {
        if (entry === null) localStorage.removeItem(key)
        else localStorage.setItem(key, entry)
      } catch {
        rollbackFailed = true
      }
    }
    if (rollbackFailed) throw new Error('Az árfrissítés mentése megszakadt, és a korábbi beállítások teljes visszaállítása sem sikerült.')
    throw new Error(`Nem sikerült elmenteni az árfrissítést; a korábbi beállítások változatlanok maradtak. ${error instanceof Error ? error.message : ''}`)
  }
  return settings
}

export function getOfficeRateMarker(userId: string): string {
  return `${RATE_UPDATE_MARKER}${userId}`
}

export function loadOfficeRateMarker(userId: string): string | null {
  return localStorage.getItem(getOfficeRateMarker(userId))
}

export function saveOfficeRateMarker(userId: string, updatedAt: string): void {
  localStorage.setItem(getOfficeRateMarker(userId), updatedAt)
}
