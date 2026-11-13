import type { Adatmentes } from './storage'

type BackupData = Adatmentes['adatok']
type MergeResult<T> = { value: T; conflicts: string[] }
type ConflictResolution = 'local' | 'cloud'

function stableString(value: unknown): string {
  if (value === undefined) return 'undefined'
  if (Array.isArray(value)) return `[${value.map(stableString).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${stableString((value as Record<string, unknown>)[key])}`
    ).join(',')}}`
  }
  return JSON.stringify(value)
}

function mergeRecords<T>(
  label: string,
  base: T[],
  local: T[],
  cloud: T[],
  keyOf: (record: T) => string,
  resolution?: ConflictResolution
): MergeResult<T[]> {
  const index = (records: T[]) => {
    const result = new Map(records.map((record) => [keyOf(record), record]))
    if (result.size !== records.length) throw new Error(`Ismétlődő azonosító található a(z) ${label} listában.`)
    return result
  }
  const baseByKey = index(base)
  const localByKey = index(local)
  const cloudByKey = index(cloud)
  const keys = new Set([...localByKey.keys(), ...cloudByKey.keys(), ...baseByKey.keys()])
  const value: T[] = []
  const conflicts: string[] = []

  for (const key of keys) {
    const baseRecord = baseByKey.get(key)
    const localRecord = localByKey.get(key)
    const cloudRecord = cloudByKey.get(key)
    const localChanged = stableString(localRecord) !== stableString(baseRecord)
    const cloudChanged = stableString(cloudRecord) !== stableString(baseRecord)

    if (localChanged && cloudChanged && stableString(localRecord) !== stableString(cloudRecord)) {
      conflicts.push(`${label}: ${key}`)
      const selected = resolution === 'cloud' ? cloudRecord : localRecord
      if (selected !== undefined) value.push(selected)
      continue
    }

    const selected = localChanged ? localRecord : cloudRecord
    if (selected !== undefined) value.push(selected)
  }

  return { value, conflicts }
}

function mergeValue<K extends 'appFejlec' | 'jelenletiFejlec'>(
  key: K,
  base: BackupData[K],
  local: BackupData[K],
  cloud: BackupData[K],
  resolution?: ConflictResolution
): MergeResult<BackupData[K]> {
  const localChanged = stableString(local) !== stableString(base)
  const cloudChanged = stableString(cloud) !== stableString(base)
  if (localChanged && cloudChanged && stableString(local) !== stableString(cloud)) {
    return { value: resolution === 'cloud' ? cloud : local, conflicts: [key] }
  }
  return { value: localChanged ? local : cloud, conflicts: [] }
}

export function mergeBackupChanges(
  base: BackupData,
  local: Adatmentes,
  cloud: Adatmentes,
  resolution?: ConflictResolution
): MergeResult<Adatmentes> {
  const baseData = base
  const localData = local.adatok
  const cloudData = cloud.adatok
  const fuvarok = mergeRecords('fuvarok', baseData.fuvarok, localData.fuvarok, cloudData.fuvarok, (item) => item.id, resolution)
  const gyarak = mergeRecords('gyárak', baseData.gyarak, localData.gyarak, cloudData.gyarak, (item) => item.id, resolution)
  const munkaido = mergeRecords(
    'munkaidő-bejegyzések',
    baseData.munkaidoTetelek,
    localData.munkaidoTetelek,
    cloudData.munkaidoTetelek,
    (item) => item.id,
    resolution
  )
  const projektek = mergeRecords(
    'projektek',
    baseData.projektek,
    localData.projektek,
    cloudData.projektek,
    (item) => `${item.gyarId ?? ''}:${item.nev.trim().toLocaleLowerCase('hu-HU')}`,
    resolution
  )
  const kiallasok = mergeRecords(
    'kiállások',
    baseData.kiallasok ?? [],
    localData.kiallasok ?? [],
    cloudData.kiallasok ?? [],
    (item) => item.id,
    resolution
  )
  const kiallasUtvonalak = mergeRecords(
    'kiállási útvonalak',
    baseData.kiallasUtvonalak ?? [],
    localData.kiallasUtvonalak ?? [],
    cloudData.kiallasUtvonalak ?? [],
    (item) => item.id,
    resolution
  )
  const appFejlec = mergeValue('appFejlec', baseData.appFejlec, localData.appFejlec, cloudData.appFejlec, resolution)
  const jelenletiFejlec = mergeValue(
    'jelenletiFejlec',
    baseData.jelenletiFejlec,
    localData.jelenletiFejlec,
    cloudData.jelenletiFejlec,
    resolution
  )

  const conflicts = [
    ...fuvarok.conflicts,
    ...gyarak.conflicts,
    ...munkaido.conflicts,
    ...projektek.conflicts,
    ...kiallasok.conflicts,
    ...kiallasUtvonalak.conflicts,
    ...appFejlec.conflicts,
    ...jelenletiFejlec.conflicts
  ]
  return {
    value: {
      ...local,
      adatok: {
        ...localData,
        fuvarok: fuvarok.value,
        gyarak: gyarak.value,
        munkaidoTetelek: munkaido.value,
        projektek: projektek.value,
        kiallasok: kiallasok.value,
        kiallasUtvonalak: kiallasUtvonalak.value,
        appFejlec: appFejlec.value,
        jelenletiFejlec: jelenletiFejlec.value
      }
    },
    conflicts
  }
}
