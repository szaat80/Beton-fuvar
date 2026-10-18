import React, { useEffect, useRef, useState } from 'react'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Adatmentes } from '../../core/data/storage'
import { adatmentesEllenorzese, adatmentesExportalasa, adatmentesVisszaallitasa } from '../../core/data/storage'
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
  kind: 'initial' | 'conflict'
  local: Adatmentes
  cloud: CloudBackupRow
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
  }

  async function valasztottCloudLetoltese() {
    if (!pendingChoice || running.current) return
    running.current = true
    setBusy(true)
    setError('')
    try {
      await remoteRestore(
        backupEllenorzese(pendingChoice.cloud.backup),
        markerKey(activeProjectUrl, userId),
        pendingChoice.cloud
      )
    } catch (restoreError) {
      setError(restoreError instanceof Error ? restoreError.message : 'A felhőadatok letöltése nem sikerült.')
    } finally {
      running.current = false
      setBusy(false)
    }
  }

  async function synchronize(choice?: 'upload' | 'download') {
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
      const decision = choice
        ? (choice === 'upload' ? 'upload-local' : 'download-cloud')
        : syncDontes(local, cloud, marker)

      if (decision === 'initial-choice' || decision === 'conflict') {
        if (!cloud) throw new Error('A felhőmentés a döntés közben eltűnt. Indítsd újra a szinkront.')
        setPendingChoice({ kind: decision === 'initial-choice' ? 'initial' : 'conflict', local, cloud })
        setMessage('')
        return
      }
      if (decision === 'unchanged') {
        setPendingChoice(null)
        setMessage('Szinkronban · ellenőrizve most.')
        return
      }
      if (decision === 'download-cloud') {
        if (!cloud) throw new Error('Nem található letölthető felhőmentés.')
        const checked = backupEllenorzese(cloud.backup)
        if (!marker) {
          setPendingChoice({ kind: 'initial', local, cloud })
          return
        }
        adatmentesVisszaallitasa(checked)
        storeMarker(key, checked, cloud)
        restore.current()
        setPendingChoice(null)
        setMessage('A másik eszköz újabb adatai letöltődtek.')
        return
      }

      const updated = await cloudBackupMentese(client, userId, local, cloud?.updated_at ?? null)
      if (!updated) {
        const latest = await cloudBackupBetoltese(client, userId)
        if (!latest) throw new Error('A felhőadat közben megváltozott. Nem történt felülírás; próbáld újra a szinkront.')
        setPendingChoice({ kind: marker ? 'conflict' : 'initial', local, cloud: latest })
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
            <button type="button" className="button-primary" disabled={busy} onClick={() => { void synchronize() }}>Szinkronizálás most</button>
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
          <strong>{pendingChoice.kind === 'initial' ? 'Első szinkron: válaszd ki, melyik mentés legyen az alap.' : 'Eltérő módosítás van mindkét eszközön; automatikusan nem írjuk felül.'}</strong>
          <p>Helyi eszköz: {pendingChoice.local.adatok.fuvarok.length} fuvar · felhő: {backupEllenorzese(pendingChoice.cloud.backup).adatok.fuvarok.length} fuvar.</p>
          <div className="backup-actions">
            <button type="button" className="button-primary" disabled={busy} onClick={() => { void synchronize('upload') }}>Helyi adatok feltöltése</button>
            <button type="button" className="button-secondary" disabled={busy} onClick={() => { void valasztottCloudLetoltese() }}>Felhőadatok letöltése</button>
          </div>
        </div>
      )}
      {message && <p className="backup-message" role="status">{message}</p>}
      {error && <p className="error-text" role="alert">{error}</p>}
      <p className="hint">A projekt URL és publikus kulcs mentődik ezen az eszközön; a jelszó nem. Soha ne illeszd be ide a Supabase secret vagy service_role kulcsot. Az automatikus szinkron csak nyitott appnál fut.</p>
    </details>
  )
}
