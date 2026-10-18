import { flushSync } from 'react-dom'
import React, { useEffect, useRef, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import config from '../config/app.config.json'
import { adatmentesEllenorzese, adatmentesExportalasa, adatmentesVisszaallitasa, appFejlecBetoltese, appFejlecMentese, betoltes, gyarakBetoltese, gyarakMentese, jelenletiFejlecBetoltese, jelenletiFejlecMentese, mentes, muhelyTetelMentese, muhelyTetelTorlese, muhelyTetelekBetoltese, projektekBetoltese, projektekMentese, soforNevRogzitese, torles, zarolSoforNev } from '../core/data/storage'
import type { FuvarDraft, FuvarRecord, Gyar, MunkaidoTetel, MunkaidoTetelDraft, Projekt } from '../core/data/storage'
import { FuvarForm } from '../features/fuvar/FuvarForm'
import type { FuvarFormState } from '../features/fuvar/FuvarForm'
import { IrodaiOsszesito } from '../features/fuvar/IrodaiOsszesito'
import { Gyarkezelo } from '../features/gyar/Gyarkezelo'
import { MunkaidoAblak } from '../features/munkaido/Munkaido'
import { JelenletiIv } from '../features/munkaido/JelenletiIv'
import { CloudSync } from '../features/cloud/CloudSync'
import { OfficeRateSync } from '../features/cloud/OfficeRateSync'
import { OFFICE_ALLAS_DIJ_KEY, OFFICE_FUVAR_FIX_KEY, OFFICE_MIN_M3_KEY } from '../core/data/officeRates'
import { Ablak } from '../ui/components/Ablak'
import { Dashboard } from '../features/dashboard/Dashboard'
import { ikonok } from '../ui/theme/ikon'
import { betu } from '../ui/theme/betu'

const UTOLSO_MENTES_KULCS = 'utolso_mentes_v1'
const HET_MS = 7 * 24 * 60 * 60 * 1000

const helyiNap = (datum: Date) =>
  `${datum.getFullYear()}-${String(datum.getMonth() + 1).padStart(2, '0')}-${String(datum.getDate()).padStart(2, '0')}`
const maiNap = () => helyiNap(new Date())

const aktualisIdo = () => {
  const most = new Date()
  return `${String(most.getHours()).padStart(2, '0')}:${String(most.getMinutes()).padStart(2, '0')}`
}

const uresFuvar = (): FuvarFormState => ({
  fuvarszam: '',
  szallitolevel: '',
  cim: '',
  gyarId: config.gyarak[0]?.id ?? '',
  projekt: '',
  m3: '',
  km: '',
  allasDb: 0,
  ido: aktualisIdo(),
  datum: maiNap()
})

function hibaSzoveg(error: unknown): string {
  return error instanceof Error ? error.message : 'Ismeretlen hiba történt az adatok kezelésekor.'
}

function datumFormazasa(iso: string): string {
  const datum = new Date(iso)
  return Number.isNaN(datum.getTime())
    ? 'Ismeretlen dátum'
    : new Intl.DateTimeFormat('hu-HU', { dateStyle: 'medium', timeStyle: 'short' }).format(datum)
}

const FULEK = [
  { id: 'fuvar', nev: 'Fuvar', ikon: '🚚' },
  { id: 'gyar', nev: 'Gyárak', ikon: '🏭' },
  { id: 'munka', nev: 'Munkaidő', ikon: '⏱️' },
  { id: 'osszes', nev: 'Összesítő', ikon: '📊' },
  { id: 'mentes', nev: 'Mentés', ikon: '☁️' }
] as const
type FulId = (typeof FULEK)[number]['id']

export default function App() {
  const [ful, setFul] = useState<FulId>('fuvar')
  const fulValtas = (id: FulId) => {
    if (!document.startViewTransition) return setFul(id)
    document.startViewTransition(() => flushSync(() => setFul(id)))
  }
  const [fuvarok, setFuvarok] = useState<FuvarRecord[]>([])
  const [munkaidoTetelek, setMunkaidoTetelek] = useState<MunkaidoTetel[]>([])
  const [jelenletiFejlec, setJelenletiFejlec] = useState({ munkaltato: '', dolgozo: '' })
  const [appFejlec, setAppFejlec] = useState(config.appName)
  const [appFejlecSzerkesztese, setAppFejlecSzerkesztese] = useState(false)
  const [appFejlecPiszkozat, setAppFejlecPiszkozat] = useState(config.appName)
  const [zarolNev, setZarolNev] = useState<string | null>(() => zarolSoforNev())
  const [elsoNev, setElsoNev] = useState(() => {
    const nev = localStorage.getItem('app_fejlec_v70')?.split('|')[0].trim() ?? ''
    return nev === config.appName ? '' : nev
  })
  const [elsoRendszam, setElsoRendszam] = useState(() => localStorage.getItem('app_fejlec_v70')?.split('|').slice(1).join('|').trim() ?? '')
  const [elsoHiba, setElsoHiba] = useState('')
  const [gyarak, setGyarak] = useState<Gyar[]>([])
  const [projektek, setProjektek] = useState<Projekt[]>([])
  const [fuvarFixDij, setFuvarFixDij] = useState(() => {
    const stored = localStorage.getItem(OFFICE_FUVAR_FIX_KEY)
    const value = stored === null ? config.fuvarFixDij : Number(stored)
    return Number.isSafeInteger(value) && value >= 0 ? value : config.fuvarFixDij
  })
  const [alapMinM3, setAlapMinM3] = useState(() => {
    const stored = localStorage.getItem(OFFICE_MIN_M3_KEY)
    const value = stored === null ? config.minM3 : Number(stored)
    return Number.isFinite(value) && value > 0 ? value : config.minM3
  })
  const [alapAllasDij, setAlapAllasDij] = useState(() => {
    const stored = localStorage.getItem(OFFICE_ALLAS_DIJ_KEY)
    const value = stored === null ? config.allasDij : Number(stored)
    return Number.isSafeInteger(value) && value >= 0 ? value : config.allasDij
  })
  const [urlap, setUrlap] = useState<FuvarFormState>(uresFuvar)
  const [szerkesztettId, setSzerkesztettId] = useState<string | null>(null)
  const [panelNyitva, setPanelNyitva] = useState(false)
  const [hiba, setHiba] = useState('')
  const [mentesUzenet, setMentesUzenet] = useState('')
  const [mentesRegi, setMentesRegi] = useState(false)

  useEffect(() => {
    const utolso = Number(localStorage.getItem(UTOLSO_MENTES_KULCS) ?? 0)
    if (Date.now() - utolso < HET_MS || betoltes().length === 0) return
    if (window.desktopFiles) void adatmentesMegosztasa()
    else setMentesRegi(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const importFajlRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    try {
      setFuvarok(betoltes())
    } catch (error) {
      setHiba(`Nem sikerült betölteni a mentett fuvarokat. ${hibaSzoveg(error)}`)
    }
    try {
      setMunkaidoTetelek(muhelyTetelekBetoltese())
    } catch (error) {
      setHiba(`Nem sikerült betölteni a munkaidő-bejegyzéseket. ${hibaSzoveg(error)}`)
    }
    try {
      setJelenletiFejlec(jelenletiFejlecBetoltese())
    } catch (error) {
      setHiba(`Nem sikerült betölteni a jelenléti ív fejlécét. ${hibaSzoveg(error)}`)
    }
    try {
      const fejlec = appFejlecBetoltese(config.appName)
      setAppFejlec(fejlec)
      setAppFejlecPiszkozat(fejlec)
    } catch (error) {
      setHiba(`Nem sikerült betölteni az alkalmazás fejlécét. ${hibaSzoveg(error)}`)
    }
    try {
      setGyarak(gyarakBetoltese(config.gyarak, config.minM3, config.allasDij))
    } catch (error) {
      setHiba(`Nem sikerült betölteni a mentett gyárakat. ${hibaSzoveg(error)}`)
    }
    try {
      setProjektek(projektekBetoltese(config.projektek))
    } catch (error) {
      setHiba(`Nem sikerült betölteni a mentett projekteket. ${hibaSzoveg(error)}`)
    }
  }, [])

  function gyarakKezelese(ujGyarak: Gyar[]): boolean {
    try {
      setGyarak(gyarakMentese(ujGyarak))
      setHiba('')
      return true
    } catch (error) {
      setHiba(`Nem sikerült elmenteni a gyárlistát. ${hibaSzoveg(error)}`)
      return false
    }
  }

  function projektekKezelese(ujProjektek: Projekt[]): boolean {
    try {
      setProjektek(projektekMentese(ujProjektek))
      setHiba('')
      return true
    } catch (error) {
      setHiba(`Nem sikerült elmenteni a projektlistát. ${hibaSzoveg(error)}`)
      return false
    }
  }

  function munkaidoMentesKezelese(draft: MunkaidoTetelDraft): boolean {
    try {
      setMunkaidoTetelek(muhelyTetelMentese(draft))
      setHiba('')
      return true
    } catch (error) {
      setHiba(`Nem sikerült elmenteni a jelenléti bejegyzést. ${hibaSzoveg(error)}`)
      return false
    }
  }

  function jelenletiFejlecKezelese(fejlec: { munkaltato: string; dolgozo: string }) {
    try {
      jelenletiFejlecMentese(fejlec)
      setJelenletiFejlec(fejlec)
      setHiba('')
    } catch (error) {
      setHiba(`Nem sikerült elmenteni a jelenléti ív fejlécét. ${hibaSzoveg(error)}`)
    }
  }

  function appFejlecMentesKezelese(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      const fejlec = appFejlecMentese(zarolNev === null ? appFejlecPiszkozat : `${zarolNev} | ${appFejlecPiszkozat}`)
      setAppFejlec(fejlec)
      setAppFejlecPiszkozat(fejlec)
      setAppFejlecSzerkesztese(false)
      setHiba('')
    } catch (error) {
      setHiba(`Nem sikerült elmenteni az alkalmazás fejlécét. ${hibaSzoveg(error)}`)
    }
  }

  function elsoBelepesKezelese(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      const fejlec = soforNevRogzitese(elsoNev, elsoRendszam)
      setZarolNev(zarolSoforNev())
      setAppFejlec(fejlec)
      setAppFejlecPiszkozat(fejlec)
      setElsoHiba('')
    } catch (error) {
      setElsoHiba(hibaSzoveg(error))
    }
  }

  async function adatmentesMegosztasa() {
    try {
      const mentesAdat = adatmentesExportalasa(config.gyarak, config.projektek, config.minM3, config.allasDij, config.appName)
      const azonosito = [mentesAdat.driverName, mentesAdat.plateNumber]
        .filter(Boolean)
        .join('-')
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9-]+/g, '-')
        .replace(/^-+|-+$/g, '')
      const idobelyeg = mentesAdat.letrehozva.replace('T', '-').replace(/[:.]/g, '-')
      const fajlNev = `beton-fuvar-mentes-${azonosito || 'felhasznalo'}-${idobelyeg}.json`
      const tartalom = JSON.stringify(mentesAdat, null, 2)
      if (window.desktopFiles) {
        const mentesUtvonal = await window.desktopFiles.saveFile(fajlNev, tartalom)
        setMentesUzenet(`A biztonsági mentés elkészült: ${mentesUtvonal}`)
      } else if (Capacitor.isNativePlatform()) {
        const { uri } = await Filesystem.writeFile({
          path: fajlNev,
          data: tartalom,
          directory: Directory.Cache,
          encoding: Encoding.UTF8
        })
        await Share.share({
          title: 'Beton fuvar biztonsági mentés',
          dialogTitle: 'Biztonsági mentés megosztása',
          files: [uri]
        })
      } else {
        const fajl = new Blob([tartalom], { type: 'application/json;charset=utf-8' })
        const url = URL.createObjectURL(fajl)
        const letoltes = document.createElement('a')
        letoltes.href = url
        letoltes.download = fajlNev
        document.body.append(letoltes)
        letoltes.click()
        letoltes.remove()
        window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      }
      if (!window.desktopFiles) setMentesUzenet('A biztonsági mentés elkészült. A fájl érzékeny fuvar- és munkaidő-adatokat tartalmaz; csak megbízható címzettel oszd meg.')
      localStorage.setItem(UTOLSO_MENTES_KULCS, String(Date.now()))
      setMentesRegi(false)
      setHiba('')
    } catch (error) {
      setHiba(`Nem sikerült elkészíteni vagy megosztani a biztonsági mentést. ${hibaSzoveg(error)}`)
      setMentesUzenet('')
    }
  }

  function cloudAdatokFrissitese() {
    try {
      setFuvarok(betoltes())
      setGyarak(gyarakBetoltese(config.gyarak, config.minM3, config.allasDij))
      setProjektek(projektekBetoltese(config.projektek))
      setMunkaidoTetelek(muhelyTetelekBetoltese())
      setJelenletiFejlec(jelenletiFejlecBetoltese())
      const fejlec = appFejlecBetoltese(config.appName)
      setAppFejlec(fejlec)
      setAppFejlecPiszkozat(fejlec)
      setSzerkesztettId(null)
      setUrlap(uresFuvar())
      setHiba('')
    } catch (error) {
      setHiba(`A felhőadatok frissültek, de a képernyő újratöltése nem sikerült. ${hibaSzoveg(error)}`)
    }
  }

  function irodaiArfrissitesAlkalmazasa() {
    try {
      setGyarak(gyarakBetoltese(config.gyarak, config.minM3, config.allasDij))
      setProjektek(projektekBetoltese(config.projektek))
      const stored = localStorage.getItem(OFFICE_FUVAR_FIX_KEY)
      if (stored !== null) {
        const value = Number(stored)
        if (!Number.isSafeInteger(value) || value < 0) throw new Error('A kiküldött fuvar fix díja hibás.')
        setFuvarFixDij(value)
      }
      const minM3Stored = localStorage.getItem(OFFICE_MIN_M3_KEY)
      if (minM3Stored !== null) {
        const value = Number(minM3Stored)
        if (!Number.isFinite(value) || value <= 0) throw new Error('A kiküldött minimum m³ hibás.')
        setAlapMinM3(value)
      }
      const allasDijStored = localStorage.getItem(OFFICE_ALLAS_DIJ_KEY)
      if (allasDijStored !== null) {
        const value = Number(allasDijStored)
        if (!Number.isSafeInteger(value) || value < 0) throw new Error('A kiküldött alapértelmezett állásdíj hibás.')
        setAlapAllasDij(value)
      }

      setHiba('')
    } catch (error) {
      setHiba(`Az irodai árfrissítés megérkezett, de a beállítások betöltése nem sikerült. ${hibaSzoveg(error)}`)
    }
  }

  async function adatmentesBetoltese(event: React.ChangeEvent<HTMLInputElement>) {
    const fajl = event.target.files?.[0]
    if (!fajl) return
    try {
      const fajlTartalom = await fajl.text()
      const mentesAdat = adatmentesEllenorzese(JSON.parse(fajlTartalom) as unknown, config.minM3, config.allasDij)
      if (!window.confirm(`A mentés ${new Date(mentesAdat.letrehozva).toLocaleString('hu-HU')} időpontban készült.\n\nA visszaállítás lecseréli ezen az eszközön az összes fuvar-, gyár-, projekt-, jelenléti és fejlécadatot. Folytatod?`)) return
      adatmentesVisszaallitasa(mentesAdat)
      setFuvarok(betoltes())
      setGyarak(gyarakBetoltese(config.gyarak, config.minM3, config.allasDij))
      setProjektek(projektekBetoltese(config.projektek))
      setMunkaidoTetelek(muhelyTetelekBetoltese())
      setJelenletiFejlec(jelenletiFejlecBetoltese())
      const fejlec = appFejlecBetoltese(config.appName)
      setAppFejlec(fejlec)
      setAppFejlecPiszkozat(fejlec)
      setSzerkesztettId(null)
      setUrlap(uresFuvar())
      setMentesUzenet('A biztonsági mentés adatai sikeresen visszaálltak erre az eszközre.')
      setHiba('')
    } catch (error) {
      setHiba(`Nem sikerült betölteni a biztonsági mentést. ${hibaSzoveg(error)}`)
      setMentesUzenet('')
    } finally {
      event.target.value = ''
    }

  }

  function munkaidoTorlesKezelese(tetel: MunkaidoTetel) {
    if (!window.confirm(`Biztosan törlöd a ${tetel.datum} napi jelenléti bejegyzést?`)) return
    try {
      setMunkaidoTetelek(muhelyTetelTorlese(tetel.id))
      setHiba('')
    } catch (error) {
      setHiba(`Nem sikerült törölni a jelenléti bejegyzést. ${hibaSzoveg(error)}`)
    }
  }

  function mentesKezelese(draft: FuvarDraft) {
    try {
      setFuvarok(mentes(draft, szerkesztettId ?? undefined))
      setUrlap(uresFuvar())
      setSzerkesztettId(null)
      setPanelNyitva(false)
      setHiba('')
    } catch (error) {
      setHiba(`Nem sikerült elmenteni a fuvart. ${hibaSzoveg(error)}`)
    }
  }

  function szerkesztes(record: FuvarRecord) {
    setUrlap({
      fuvarszam: record.fuvarszam,
      szallitolevel: record.szallitolevel,
      cim: record.cim,
      gyarId: record.gyarId,
      projekt: record.projekt,
      m3: String(record.m3),
      km: String(record.km),
      allasDb: record.allasDb,
      ido: record.ido ?? new Date(record.createdAt).toTimeString().slice(0, 5),
      datum: helyiNap(new Date(record.createdAt))
    })
    setSzerkesztettId(record.id)
    setPanelNyitva(true)
    setHiba('')
  }

  function torlesKezelese(record: FuvarRecord) {
    const azonositó = record.fuvarszam || record.szallitolevel || datumFormazasa(record.createdAt)
    if (!window.confirm(`Biztosan törlöd ezt a fuvart (${azonositó})?`)) return
    try {
      setFuvarok(torles(record.id))
      if (szerkesztettId === record.id) {
        setSzerkesztettId(null)
        setUrlap(uresFuvar())
      }
      setHiba('')
    } catch (error) {
      setHiba(`Nem sikerült törölni a fuvart. ${hibaSzoveg(error)}`)
    }
  }

  function szerkesztesMegszakitasa() {
    setPanelNyitva(false)
    setSzerkesztettId(null)
    setUrlap(uresFuvar())
    setHiba('')
  }

  return (
    <div className="app-shell" style={{ fontFamily: betu.family }}>
      {zarolNev === null && (
        <div role="dialog" aria-modal="true" aria-label="Sofőr azonosítása" style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <form onSubmit={elsoBelepesKezelese} style={{ background: '#fff', color: '#111', borderRadius: 12, padding: 20, maxWidth: 380, width: '100%', display: 'grid', gap: 10 }}>
            <h2 style={{ margin: 0 }}>Üdv! Ki vagy?</h2>
            <p style={{ margin: 0 }}>Add meg a teljes neved. Ez minden mentésen és Excelen látszik, és később <b>nem módosítható</b>.</p>
            <input aria-label="Sofőr neve" placeholder="Teljes név" maxLength={50} autoFocus value={elsoNev} onChange={(event) => setElsoNev(event.target.value)} />
            <input aria-label="Rendszám" placeholder="Rendszám (később átírható)" maxLength={20} value={elsoRendszam} onChange={(event) => setElsoRendszam(event.target.value)} />
            {elsoHiba && <div role="alert" style={{ color: '#b00020' }}>{elsoHiba}</div>}
            <button type="submit">Név rögzítése</button>
          </form>
        </div>
      )}
      <header className="app-header">
        <div className="app-header-identity">
          {appFejlecSzerkesztese ? (
            <form className="app-header-edit" onSubmit={appFejlecMentesKezelese}>
              <label className="sr-only" htmlFor="app-header-name">{zarolNev === null ? 'Alkalmazás fejlécének neve' : 'Rendszám'}</label>
              {zarolNev !== null && <div className="font-bold text-sm">{zarolNev} |</div>}
              <input
                id="app-header-name"
                aria-label={zarolNev === null ? 'Alkalmazás fejlécének neve' : 'Rendszám'}
                maxLength={zarolNev === null ? 80 : 20}
                autoFocus
                value={appFejlecPiszkozat}
                onChange={(event) => setAppFejlecPiszkozat(event.target.value)}
              />
              <div className="app-header-edit-actions">
                <button type="submit" className="app-header-action">Mentés</button>
                <button
                  type="button"
                  className="app-header-action"
                  onClick={() => {
                    setAppFejlecPiszkozat(zarolNev === null ? appFejlec : appFejlec.split('|').slice(1).join('|').trim())
                    setAppFejlecSzerkesztese(false)
                  }}
                >
                  Mégse
                </button>
              </div>
            </form>
          ) : (
            <div className="app-header-title-row">
              <div className="app-header-brand">
                <img src={ikonok.fuvar} alt="" className="app-brand-icon" />
                <div className="font-bold text-sm app-header-title">{appFejlec}</div>
              </div>
              <button
                type="button"
                className="app-header-action"
                aria-label={zarolNev === null ? 'Fejléc nevének szerkesztése' : 'Rendszám szerkesztése'}
                onClick={() => {
                  setAppFejlecPiszkozat(zarolNev === null ? appFejlec : appFejlec.split('|').slice(1).join('|').trim())
                  setAppFejlecSzerkesztese(true)
                }}
              >
                {zarolNev === null ? 'Szerkesztés' : 'Rendszám'}
              </button>
            </div>
          )}
          <div className="header-subtitle">Fuvarnyilvántartás · eszközön mentve</div>
        </div>
        <span className="offline-badge">Offline használható</span>
      </header>

      <main className="app-content">
        {hiba && <div className="error-banner" role="alert">{hiba}</div>}

        <div className="tab-panel" data-tab="fuvar" hidden={ful !== 'fuvar'}>
          <Dashboard fuvarok={fuvarok} munkaidoTetelek={munkaidoTetelek} />
        <div className="sheet" data-open={panelNyitva} role="dialog" aria-label="Fuvar űrlap">
          <button type="button" className="sheet-backdrop" aria-label="Bezárás" tabIndex={-1} onClick={szerkesztesMegszakitasa} />
          <div className="sheet-body">
            <button type="button" className="sheet-close" aria-label="Bezárás" onClick={szerkesztesMegszakitasa}>✕</button>
            <FuvarForm
              value={urlap}
              gyarak={gyarak}
              projektek={projektek}
              arszabaly={{ ...config, fuvarFixDij }}
              onChange={setUrlap}
              onSave={mentesKezelese}
              onCancelEdit={szerkesztesMegszakitasa}
              editing={szerkesztettId !== null}
            />
          </div>
        </div>
        <button type="button" className="fab" onClick={() => setPanelNyitva(true)} hidden={ful !== 'fuvar' || panelNyitva}>
          <span aria-hidden="true">＋</span> Új fuvar
        </button>
        <section aria-labelledby="saved-heading">
          <div className="section-heading">
            <h1 id="saved-heading">Mentett fuvarok</h1>
            <span>{fuvarok.length} db</span>
          </div>
          {fuvarok.length === 0 ? (
            <div className="empty-state">
              <strong>Még nincs mentett fuvar</strong>
              <p>Az első fuvar csak akkor jelenik meg itt, ha kitöltöd és elmented.</p>
            </div>
          ) : (
            <div className="record-list">
              {fuvarok.map((record) => (
                <Ablak key={record.id} title={record.fuvarszam || record.szallitolevel || 'Fuvar'}>
                  <div className="record-meta">{datumFormazasa(record.createdAt)}</div>
                  <div className="chips">
                    <span className="chip chip-accent">{record.gyarNev}</span>
                    {record.projekt && <span className="chip">{record.projekt}</span>}
                    <span className="chip">{record.m3} m³</span>
                    <span className="chip">{record.km} km</span>
                    {(record.ejszakaPotlek ?? 0) > 0 && <span className="chip">🌙 éjszakai</span>}
                    {record.allasDb > 0 && <span className="chip">állás {record.allasDb}×15′</span>}
                  </div>
                  {record.fuvarszam && <div>Fuvarlevél: {record.fuvarszam}</div>}
                  {record.szallitolevel && <div>Szállítólevél: {record.szallitolevel}</div>}
                  {record.cim && <div>📍 {record.cim}</div>}
                  <div className="record-total">{record.total.toLocaleString('hu-HU')} Ft</div>
                  <div className="record-actions">
                    <button type="button" className="button-secondary" onClick={() => szerkesztes(record)}>Szerkesztés</button>
                    <button type="button" className="button-danger" onClick={() => torlesKezelese(record)}>Törlés</button>
                  </div>
                </Ablak>
              ))}
            </div>
          )}
        </section>
        </div>
        <div className="tab-panel" data-tab="gyar" hidden={ful !== 'gyar'}>
        <Gyarkezelo
          gyarak={gyarak}
          projektek={projektek}
          alapMinM3={alapMinM3}
          alapAllasDij={alapAllasDij}
          onSave={gyarakKezelese}
          onSaveProjects={projektekKezelese}
        />
        </div>
        <div className="tab-panel" data-tab="munka" hidden={ful !== 'munka'}>
        <details className="optional-feature">
          <summary><img src={ikonok.munkaido} alt="" />Munkaidő-számoló (opcionális)</summary>
          <MunkaidoAblak bejegyzesek={munkaidoTetelek} onSaveWork={munkaidoMentesKezelese} />
        </details>

        <JelenletiIv
          bejegyzesek={munkaidoTetelek}
          munkaltato={jelenletiFejlec.munkaltato}
          dolgozo={jelenletiFejlec.dolgozo}
          onFejlecValtozas={jelenletiFejlecKezelese}
        />
        </div>
        <div className="tab-panel" data-tab="osszes" hidden={ful !== 'osszes'}>
        <section aria-labelledby="income-heading">
          <div className="section-heading">
            <h1 id="income-heading">Bevételek</h1>
          </div>
          <div className="income-summary">
            <div><span>Fuvarbevétel</span><strong>{fuvarok.reduce((osszeg, fuvar) => osszeg + fuvar.total, 0).toLocaleString('hu-HU')} Ft</strong></div>
            <div><span>Műhelybevétel</span><strong>{munkaidoTetelek.filter((tetel) => tetel.tipus === 'muhely').reduce((osszeg, tetel) => osszeg + tetel.total, 0).toLocaleString('hu-HU')} Ft</strong></div>
          </div>
          {munkaidoTetelek.some((tetel) => tetel.tipus === 'muhely') && (
            <div className="record-list mt-4">
              {munkaidoTetelek.filter((tetel) => tetel.tipus === 'muhely').map((tetel) => (
                <Ablak key={tetel.id} title="Műhelymunka">
                  <div className="record-meta">{tetel.datum}</div>
                  <div>{tetel.kezdes}–{tetel.zaras} · {(tetel.perc / 60).toFixed(2)} óra × {tetel.oraber?.toLocaleString('hu-HU')} Ft/óra</div>
                  <div className="record-total">{tetel.total.toLocaleString('hu-HU')} Ft · külön műhelybevétel</div>
                  <div className="record-actions">
                    <button type="button" className="button-danger" onClick={() => munkaidoTorlesKezelese(tetel)}>Törlés</button>
                  </div>
                </Ablak>
              ))}
            </div>
          )}
        </section>
        <IrodaiOsszesito fuvarok={fuvarok} gyarak={gyarak} />
        </div>
        <div className="tab-panel" data-tab="mentes" hidden={ful !== 'mentes'}>
        <CloudSync onRemoteRestore={cloudAdatokFrissitese} />
        <OfficeRateSync onRatesApplied={irodaiArfrissitesAlkalmazasa} onError={setHiba} />

        <section className="backup-tools" aria-labelledby="backup-heading">
          <div className="section-heading">
            <h1 id="backup-heading">Biztonsági mentés</h1>
          </div>
          <p className="hint">Az adatok átviteléhez készíts mentést, majd a másik eszközön töltsd be. A visszaállítás lecseréli az ottani adatokat.</p>
          <div className="backup-actions">
            <button type="button" className="button-primary" onClick={adatmentesMegosztasa}>Mentés megosztása / letöltése</button>
            <button type="button" className="button-secondary" onClick={() => importFajlRef.current?.click()}>Mentés betöltése</button>
            {window.desktopFiles && <button type="button" className="button-secondary" onClick={() => void window.desktopFiles?.openBackupFolder().catch((error: unknown) => setHiba(`Nem sikerült megnyitni a mentések mappáját. ${hibaSzoveg(error)}`))}>Mentések mappájának megnyitása</button>}
            <input
              ref={importFajlRef}
              className="backup-file-input"
              type="file"
              accept="application/json,.json"
              aria-label="Biztonsági mentés fájl kiválasztása"
              onChange={adatmentesBetoltese}
            />
          </div>
          {mentesRegi && <p className="backup-message" role="alert">Több mint egy hete nem készült biztonsági mentés. Kérlek, készíts egyet a mentés gombbal!</p>}
          {mentesUzenet && <p className="backup-message" role="status">{mentesUzenet}</p>}
        </section>
        </div>
        <footer className="app-footer">
          A fuvarok helyben is mentődnek. Felhőszinkron csak a saját Supabase-projekt beállítása és a bejelentkezés után működik.
        </footer>
      </main>

      <nav className="tabbar" aria-label="Fő navigáció">
        {FULEK.map((f) => (
          <button key={f.id} type="button" className="tab-btn" aria-current={ful === f.id ? 'page' : undefined} onClick={() => fulValtas(f.id)}>
            <span className="tab-ico" aria-hidden="true">{f.ikon}</span>
            <span>{f.nev}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
