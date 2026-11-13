import React, { useEffect, useRef, useState } from 'react'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Adatmentes } from '../../core/data/storage'
import { adatmentesEllenorzese, adatmentesExportalasa, adatmentesVisszaallitasa } from '../../core/data/storage'
import { mergeBackupChanges } from '../../core/data/backupMerge'
import { showSyncNotification } from '../../core/data/syncNotification'
import {
  backupSnapshot,
  cloudBackupBetoltese,
  cloudBackupMentese,
  syncDontes,
  type CloudBackupRow,
  type SyncMarker
} from '../../core/data/cloudSync'
import config from '../../config/app.config.json'

interface CloudSyncProps {
  onRemoteRestore: () => void
}

interface ProjectConfig {
  url: string
  publicKey: string
}

interface PendingChoice {
  local: Adatmentes
  cloud: CloudBackupRow
  conflicts: string[]
}

const CONFIG_KEY = 'beton_fuvar_cloud_config_v1'
const SYNC_MARKER_PREFIX = 'beton_fuvar_cloud_sync_v1:'
let cachedClient: { url: string; publicKey: string; client: SupabaseClient } | null = null
const BUILD_PROJECT_CONFIG: ProjectConfig = {
  url: import.meta.env.VITE_SUPABASE_URL ?? '',
  publicKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''
}

function supabaseClient(url: string, publicKey: string): SupabaseClient {
  if (cachedClient?.url === url && cachedClient.publicKey === publicKey) return cachedClient.client
  const client = createClient(url, publicKey)
  cachedClient = { url, publicKey, client }
  return client
}

function markerKey(projectUrl: string, userId: string): string {
  return `${SYNC_MARKER_PREFIX}${encodeURIComponent(projectUrl)}:${userId}`
}

function loadMarker(key: string): SyncMarker | null {
  const raw = localStorage.getItem(key)
  if (raw === null) return null
  const parsed: unknown = JSON.parse(raw)
  if (typeof parsed !== 'object' || parsed === null
    || typeof (parsed as SyncMarker).snapshot !== 'string'
    || typeof (parsed as SyncMarker).updatedAt !== 'string') {
    throw new Error('A korábbi felhőszinkron állapota hibás. A helyi adatokat nem módosítottuk.')
  }
  return parsed as SyncMarker
}

function storeMarker(key: string, local: Adatmentes, cloud: CloudBackupRow): void {
  localStorage.setItem(key, JSON.stringify({
    snapshot: backupSnapshot(local),
    updatedAt: cloud.updated_at
  } satisfies SyncMarker))
}

function validProjectConfig(value: unknown): value is ProjectConfig {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Partial<ProjectConfig>
  if (typeof candidate.url !== 'string' || typeof candidate.publicKey !== 'string' || !candidate.publicKey.trim()) return false
  try {
    const url = new URL(candidate.url)
    return url.protocol === 'https:' || url.hostname === 'localhost' || url.hostname === '127.0.0.1'
  } catch {
    return false
  }
}

function backupEllenorzese(value: unknown): Adatmentes {
  return adatmentesEllenorzese(value, config.minM3, config.allasDij)
}

function kezdoSzinkronAlap(backup: Adatmentes): Adatmentes['adatok'] {
  return {
    ...backup.adatok,
    fuvarok: [],
    gyarak: [],
    munkaidoTetelek: [],
    projektek: [],
    kiallasok: [],
    kiallasUtvonalak: [],
    jelenletiFejlec: { munkaltato: '', dolgozo: '' },
    appFejlec: ''
  }
}

export function CloudSync({ onRemoteRestore }: CloudSyncProps) {
  const [projectUrl, setProjectUrl] = useState('')
  const [activeProjectUrl, setActiveProjectUrl] = useState('')
  const [publicKey, setPublicKey] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [client, setClient] = useState<SupabaseClient | null>(null)
  const [userId, setUserId] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [pendingChoice, setPendingChoice] = useState<PendingChoice | null>(null)
  const [busy, setBusy] = useState(false)
  const running = useRef(false)
  const lastConflictNotice = useRef('')
  const restore = useRef(onRemoteRestore)
  restore.current = onRemoteRestore

  useEffect(() => {
    const rawConfig = localStorage.getItem(CONFIG_KEY)
    try {
      const parsed: unknown = rawConfig === null ? BUILD_PROJECT_CONFIG : JSON.parse(rawConfig)
      if (!validProjectConfig(parsed)) throw new Error('A mentett Supabase-beállítás hibás.')
      if (rawConfig === null) localStorage.setItem(CONFIG_KEY, JSON.stringify(parsed))
      setProjectUrl(parsed.url)
      setPublicKey(parsed.publicKey)
      setActiveProjectUrl(parsed.url)
      setClient(supabaseClient(parsed.url, parsed.publicKey))
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Nem sikerült betölteni a Supabase-beállítást.')
    }
  }, [])

  useEffect(() => {
    if (!client) return
    let active = true
    client.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return
      if (sessionError) {
        setError(`Nem sikerült lekérni a Supabase-bejelentkezést: ${sessionError.message}`)
        return
      }
      setUserId(data.session?.user.id ?? '')
      setUserEmail(data.session?.user.email ?? '')
    })
    const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
      if (!active) return
      setUserId(session?.user.id ?? '')
      setUserEmail(session?.user.email ?? '')
      setPendingChoice(null)
    })
    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [client])

  async function remoteRestore(backup: Adatmentes, key: string, cloud: CloudBackupRow) {
    const checked = backupEllenorzese(backup)
    const confirmation = window.confirm(
      `A felhőből ${checked.adatok.fuvarok.length} fuvar és ${checked.adatok.munkaidoTetelek.length} munkaidő-bejegyzés érkezik. ` +
      'Ez lecseréli az eszköz helyi adatait. Folytatod?'
    )
    if (!confirmation) return
    adatmentesVisszaallitasa(checked)
    storeMarker(key, checked, cloud)
    restore.current()
    setPendingChoice(null)
    setMessage('A felhőadatok letöltése és helyi mentése sikerült.')
    showSyncNotification('Új adatok érkeztek', 'A felhőmentés adatai frissültek ezen az eszközön.')
  }

  async function utkozesFeloldasa(resolution: 'local' | 'cloud') {
    if (!pendingChoice || running.current) return
    await synchronize(resolution)
  }

  async function synchronize(resolution?: 'local' | 'cloud') {
    if (!client || !userId || running.current) return
    running.current = true
    setBusy(true)
    setError('')
    try {
      const local = adatmentesExportalasa(config.gyarak, config.projektek, config.minM3, config.allasDij, config.appName)
      const key = markerKey(activeProjectUrl, userId)
      const marker = loadMarker(key)
      const fetchedCloud = await cloudBackupBetoltese(client, userId)
      const cloud = fetchedCloud
        ? { ...fetchedCloud, backup: backupEllenorzese(fetchedCloud.backup) }
        : null
      const decision = syncDontes(local, cloud, marker)

      if (decision === 'unchanged') {
        setPendingChoice(null)
        setMessage('Szinkronban · ellenőrizve most.')
        return
      }
      if (decision === 'download-cloud') {
        if (!cloud) throw new Error('Nem található letölthető felhőmentés.')
        const checked = backupEllenorzese(cloud.backup)
        adatmentesVisszaallitasa(checked)
        storeMarker(key, checked, cloud)
        restore.current()
        setPendingChoice(null)
        setMessage('A másik eszköz újabb adatai letöltődtek.')
        showSyncNotification('Új adatok érkeztek', 'A másik eszköz módosításai letöltődtek.')
        return
      }

      if (decision === 'conflict' || decision === 'initial-choice') {
        if (!cloud) throw new Error('A felhőmentés a döntés közben eltűnt. Indítsd újra a szinkront.')
        const base = marker
          ? backupEllenorzese({
            ...local,
            adatok: JSON.parse(marker.snapshot) as Adatmentes['adatok']
          }).adatok
          : kezdoSzinkronAlap(local)
        const merged = mergeBackupChanges(base, local, cloud.backup, resolution)
        if (merged.conflicts.length > 0 && !resolution) {
          setPendingChoice({ local, cloud, conflicts: merged.conflicts })
          setMessage('')
          if (lastConflictNotice.current !== cloud.updated_at) {
            lastConflictNotice.current = cloud.updated_at
            showSyncNotification('Szinkronütközés', 'Azonos adat eltérően módosult két eszközön. Nyisd meg a felhőszinkront, és válassz mentést.')
          }
          return
        }

        const updated = await cloudBackupMentese(client, userId, merged.value, cloud.updated_at)
        if (!updated) {
          const latest = await cloudBackupBetoltese(client, userId)
          if (!latest) throw new Error('A felhőadat közben megváltozott. Nem történt felülírás; próbáld újra a szinkront.')
          if (merged.conflicts.length === 0) {
            setPendingChoice(null)
            setMessage('A felhőmentés szinkron közben frissült. Nem történt felülírás; a következő ellenőrzés újra összevonja az adatokat.')
            return
          }
          setPendingChoice({
            local,
            cloud: { ...latest, backup: backupEllenorzese(latest.backup) },
            conflicts: merged.conflicts
          })
          setMessage('')
          return
        }
        adatmentesVisszaallitasa(merged.value)
        storeMarker(key, merged.value, updated)
        restore.current()
        setPendingChoice(null)
        setMessage(marker
          ? 'A két eszköz külön módosításai biztonságosan össze lettek fésülve.'
          : 'Az első szinkron megőrizte és összevonta mindkét eszköz külön adatait.')
        showSyncNotification('Adatok összevonva', 'A közös fuvarok, gyárak, projektek és munkaidő-adatok szinkronba kerültek.')
        return
      }

      const updated = await cloudBackupMentese(client, userId, local, cloud?.updated_at ?? null)
      if (!updated) {
        const latest = await cloudBackupBetoltese(client, userId)
        if (!latest) throw new Error('A felhőadat közben megváltozott. Nem történt felülírás; próbáld újra a szinkront.')
        setPendingChoice({ local, cloud: latest, conflicts: [] })
        setMessage('')
        return
      }
      storeMarker(key, local, updated)
      setPendingChoice(null)
      setMessage('A helyi adatok biztonságosan feltöltődtek · szinkronban.')
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : 'A felhőszinkron nem sikerült.')
      setMessage('')
    } finally {
      running.current = false
      setBusy(false)
    }
  }

  useEffect(() => {
    if (!client || !userId) return
    const run = () => { void synchronize() }
    run()
    const interval = window.setInterval(run, 30_000)
    window.addEventListener('online', run)
    window.addEventListener('focus', run)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('online', run)
      window.removeEventListener('focus', run)
    }
  }, [client, userId, activeProjectUrl])

  async function projectConfigMentes(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next = { url: projectUrl.trim().replace(/\/+$/, ''), publicKey: publicKey.trim() }
    if (!validProjectConfig(next)) {
      setError('Adj meg érvényes HTTPS Supabase projekt URL-t és publikus (publishable/anon) kulcsot.')
      return
    }
    try {
      localStorage.setItem(CONFIG_KEY, JSON.stringify(next))
      setProjectUrl(next.url)
      setPublicKey(next.publicKey)
      setClient(supabaseClient(next.url, next.publicKey))
      setActiveProjectUrl(next.url)
      setUserId('')
      setUserEmail('')
      setPendingChoice(null)
      setError('')
      setMessage('A projektbeállítás elmentve ezen az eszközön. Jelentkezz be vagy hozz létre fiókot.')
    } catch (saveError) {
      setError(`Nem sikerült elmenteni a projektbeállítást. ${saveError instanceof Error ? saveError.message : ''}`)
    }
  }

  async function bejelentkezes(ujFiok: boolean) {
    if (!client) {
      setError('Előbb mentsd el a saját Supabase-projekt URL-jét és publikus kulcsát.')
      return
    }
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const eredmeny = ujFiok
        ? await client.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: window.location.origin }
        })
        : await client.auth.signInWithPassword({ email: email.trim(), password })
      if (eredmeny.error) throw new Error(eredmeny.error.message)
      if (ujFiok && !eredmeny.data.session) {
        setMessage('A fiók létrejött. Erősítsd meg az e-mail-címedet, majd jelentkezz be.')
      } else {
        setMessage(ujFiok ? 'A fiók létrejött és bejelentkeztél.' : 'Sikeres bejelentkezés.')
      }
      setPassword('')
    } catch (authError) {
      setError(`A Supabase-művelet nem sikerült. ${authError instanceof Error ? authError.message : 'Ismeretlen hiba.'}`)
    } finally {
      setBusy(false)
    }
  }

  async function kijelentkezes() {
    if (!client) return
    const { error: signOutError } = await client.auth.signOut()
    if (signOutError) {
      setError(`Nem sikerült kijelentkezni. ${signOutError.message}`)
      return
    }
    setPendingChoice(null)
    setMessage('Kijelentkeztél. A helyi adatok megmaradtak ezen az eszközön.')
  }

  return (
    <details className="cloud-sync">
      <summary>Felhőszinkron · saját Supabase-adatbázis</summary>
      <p className="hint">Mentsd helyben is, és szinkronizálj saját Supabase-projekteddel. A jelszót az app nem tárolja; a fuvaradatok automatikusan, 30 másodpercenként, megnyitáskor és hálózat-visszatéréskor szinkronizálódnak.</p>
      <form className="cloud-form" onSubmit={projectConfigMentes}>
        <label className="field">
          Saját Supabase Project URL
          <input type="url" value={projectUrl} onChange={(event) => setProjectUrl(event.target.value)} placeholder="https://projektazonosito.supabase.co" required />
        </label>
        <label className="field">
          Publishable / anon kulcs
          <input type="text" autoComplete="off" value={publicKey} onChange={(event) => setPublicKey(event.target.value)} placeholder="sb_publishable_… vagy anon kulcs" required />
        </label>
        <button type="submit" className="button-secondary">Projekt beállítása</button>
      </form>
      {client && (userId ? (
        <div className="cloud-account">
          <p>Bejelentkezve: <strong>{userEmail}</strong></p>
          <div className="backup-actions">
            <button type="button" className="button-primary" disabled={busy} onClick={() => { void synchronize() }}>Kényszerített szinkron · biztonságos összevonás</button>
            <button type="button" className="button-secondary" disabled={busy} onClick={() => { void kijelentkezes() }}>Kijelentkezés</button>
          </div>
        </div>
      ) : (
        <form className="cloud-form" onSubmit={(event) => { event.preventDefault(); void bejelentkezes(false) }}>
          <label className="field">
            E-mail
            <input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <label className="field">
            Supabase-fiók jelszava
            <input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={6} required />
          </label>
          <div className="backup-actions">
            <button type="submit" className="button-primary" disabled={busy}>Bejelentkezés</button>
            <button type="button" className="button-secondary" disabled={busy} onClick={() => { void bejelentkezes(true) }}>Új fiók létrehozása</button>
          </div>
        </form>
      ))}
      {pendingChoice && (
        <div className="cloud-choice" role="alert">
          <strong>Ugyanazt az adatot mindkét oldalon eltérően módosították. A többi, nem ütköző változás megmarad.</strong>
          <p>Helyi eszköz: {pendingChoice.local.adatok.fuvarok.length} fuvar · felhő: {backupEllenorzese(pendingChoice.cloud.backup).adatok.fuvarok.length} fuvar.</p>
          <p>Válaszd ki, melyik oldal értéke maradjon meg ezeknél: {pendingChoice.conflicts.join('; ')}.</p>
          <div className="backup-actions">
            <button type="button" className="button-primary" disabled={busy} onClick={() => { void utkozesFeloldasa('local') }}>Ütközésnél a helyi érték maradjon</button>
            <button type="button" className="button-secondary" disabled={busy} onClick={() => { void utkozesFeloldasa('cloud') }}>Ütközésnél a felhő értéke maradjon</button>
          </div>
        </div>
      )}
      {message && <p className="backup-message" role="status">{message}</p>}
      {error && <p className="error-text" role="alert">{error}</p>}
      <p className="hint">A projekt URL és publikus kulcs mentődik ezen az eszközön; a jelszó nem. Soha ne illeszd be ide a Supabase secret vagy service_role kulcsot. Az automatikus szinkron csak nyitott appnál fut.</p>
    </details>
  )
}
