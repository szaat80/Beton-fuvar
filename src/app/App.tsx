import React, { useEffect, useRef, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import config from '../config/app.config.json'
import { adatmentesEllenorzese, adatmentesExportalasa, adatmentesVisszaallitasa, appFejlecBetoltese, appFejlecMentese, betoltes, gyarakBetoltese, gyarakMentese, jelenletiFejlecBetoltese, jelenletiFejlecMentese, mentes, muhelyTetelMentese, muhelyTetelTorlese, muhelyTetelekBetoltese, projektekBetoltese, projektekMentese, torles } from '../core/data/storage'
import type { FuvarDraft, FuvarRecord, Gyar, MunkaidoTetel, MunkaidoTetelDraft, Projekt } from '../core/data/storage'
import { FuvarForm } from '../features/fuvar/FuvarForm'
import type { FuvarFormState } from '../features/fuvar/FuvarForm'
import { IrodaiOsszesito } from '../features/fuvar/IrodaiOsszesito'
import { Gyarkezelo } from '../features/gyar/Gyarkezelo'
import { MunkaidoAblak } from '../features/munkaido/Munkaido'
import { JelenletiIv } from '../features/munkaido/JelenletiIv'
import { Ablak } from '../ui/components/Ablak'
import { ikonok } from '../ui/theme/ikon'
import { betu } from '../ui/theme/betu'

const uresFuvar = (): FuvarFormState => ({
  fuvarszam: '',
  szallitolevel: '',
  cim: '',
  gyarId: config.gyarak[0]?.id ?? '',
  projekt: '',
  m3: '',
  km: '',
  allasDb: 0
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

export default function App() {
  const [fuvarok, setFuvarok] = useState<FuvarRecord[]>([])
  const [munkaidoTetelek, setMunkaidoTetelek] = useState<MunkaidoTetel[]>([])
  const [jelenletiFejlec, setJelenletiFejlec] = useState({ munkaltato: '', dolgozo: '' })
  const [appFejlec, setAppFejlec] = useState(config.appName)
  const [appFejlecSzerkesztese, setAppFejlecSzerkesztese] = useState(false)
  const [appFejlecPiszkozat, setAppFejlecPiszkozat] = useState(config.appName)
  const [gyarak, setGyarak] = useState<Gyar[]>([])
  const [projektek, setProjektek] = useState<Projekt[]>([])
  const [urlap, setUrlap] = useState<FuvarFormState>(uresFuvar)
  const [szerkesztettId, setSzerkesztettId] = useState<string | null>(null)
  const [hiba, setHiba] = useState('')
  const [mentesUzenet, setMentesUzenet] = useState('')
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
      const fejlec = appFejlecMentese(appFejlecPiszkozat)
      setAppFejlec(fejlec)
      setAppFejlecPiszkozat(fejlec)
      setAppFejlecSzerkesztese(false)
      setHiba('')
    } catch (error) {
      setHiba(`Nem sikerült elmenteni az alkalmazás fejlécét. ${hibaSzoveg(error)}`)
    }
  }

  async function adatmentesMegosztasa() {
    try {
      const mentesAdat = adatmentesExportalasa(config.gyarak, config.projektek, config.minM3, config.allasDij, config.appName)
      const fajlNev = `beton-fuvar-mentes-${new Date().toISOString().slice(0, 10)}.json`
      const tartalom = JSON.stringify(mentesAdat, null, 2)
      if (Capacitor.isNativePlatform()) {
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
      setMentesUzenet('A biztonsági mentés elkészült. A fájl érzékeny fuvar- és munkaidő-adatokat tartalmaz; csak megbízható címzettel oszd meg.')
      setHiba('')
    } catch (error) {
      setHiba(`Nem sikerült elkészíteni vagy megosztani a biztonsági mentést. ${hibaSzoveg(error)}`)
      setMentesUzenet('')
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
      allasDb: record.allasDb
    })
    setSzerkesztettId(record.id)
    setHiba('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
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
    setSzerkesztettId(null)
    setUrlap(uresFuvar())
    setHiba('')
  }

  return (
    <div className="app-shell" style={{ fontFamily: betu.family }}>
      <header className="app-header">
        <div className="app-header-identity">
          {appFejlecSzerkesztese ? (
            <form className="app-header-edit" onSubmit={appFejlecMentesKezelese}>
              <label className="sr-only" htmlFor="app-header-name">Alkalmazás fejlécének neve</label>
              <input
                id="app-header-name"
                aria-label="Alkalmazás fejlécének neve"
                maxLength={80}
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
                    setAppFejlecPiszkozat(appFejlec)
                    setAppFejlecSzerkesztese(false)
                  }}
                >
                  Mégse
                </button>
              </div>
            </form>
          ) : (
            <div className="app-header-title-row">
              <div className="font-bold text-sm app-header-title">{appFejlec}</div>
              <button
                type="button"
                className="app-header-action"
                aria-label="Fejléc nevének szerkesztése"
                onClick={() => {
                  setAppFejlecPiszkozat(appFejlec)
                  setAppFejlecSzerkesztese(true)
                }}
              >
                Szerkesztés
              </button>
            </div>
          )}
          <div className="header-subtitle">Fuvarnyilvántartás · eszközön mentve</div>
        </div>
        <span className="offline-badge">Offline használható</span>
      </header>

      <main className="app-content">
        {hiba && <div className="error-banner" role="alert">{hiba}</div>}

        <FuvarForm
          value={urlap}
          gyarak={gyarak}
          projektek={projektek}
          arszabaly={config}
          onChange={setUrlap}
          onSave={mentesKezelese}
          onCancelEdit={szerkesztesMegszakitasa}
          editing={szerkesztettId !== null}
        />

        <Gyarkezelo
          gyarak={gyarak}
          projektek={projektek}
          alapMinM3={config.minM3}
          alapAllasDij={config.allasDij}
          onSave={gyarakKezelese}
          onSaveProjects={projektekKezelese}
        />

        <details className="optional-feature">
          <summary>{ikonok.allas} Munkaidő-számoló (opcionális)</summary>
          <MunkaidoAblak bejegyzesek={munkaidoTetelek} onSaveWork={munkaidoMentesKezelese} />
        </details>

        <JelenletiIv
          bejegyzesek={munkaidoTetelek}
          munkaltato={jelenletiFejlec.munkaltato}
          dolgozo={jelenletiFejlec.dolgozo}
          onFejlecValtozas={jelenletiFejlecKezelese}
        />

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
                  {record.fuvarszam && <div>Fuvarlevél: {record.fuvarszam}</div>}
                  {record.szallitolevel && <div>Szállítólevél: {record.szallitolevel}</div>}
                  {record.cim && <div>Kiszállítás címe: {record.cim}</div>}
                  <div>{record.gyarNev}{record.projekt ? ` · ${record.projekt}` : ''}</div>
                  <div>{record.m3} m³ · {record.km} km · állás: {record.allasDb} × 15 perc</div>
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

        <IrodaiOsszesito fuvarok={fuvarok} />

        <section className="backup-tools" aria-labelledby="backup-heading">
          <div className="section-heading">
            <h1 id="backup-heading">Biztonsági mentés</h1>
          </div>
          <p className="hint">Az adatok átviteléhez készíts mentést, majd a másik eszközön töltsd be. A visszaállítás lecseréli az ottani adatokat.</p>
          <div className="backup-actions">
            <button type="button" className="button-primary" onClick={adatmentesMegosztasa}>Mentés megosztása / letöltése</button>
            <button type="button" className="button-secondary" onClick={() => importFajlRef.current?.click()}>Mentés betöltése</button>
            <input
              ref={importFajlRef}
              className="backup-file-input"
              type="file"
              accept="application/json,.json"
              aria-label="Biztonsági mentés fájl kiválasztása"
              onChange={adatmentesBetoltese}
            />
          </div>
          {mentesUzenet && <p className="backup-message" role="status">{mentesUzenet}</p>}
        </section>

        <footer className="app-footer">
          A fuvarok ezen az eszközön maradnak meg. Másik eszközre nem szinkronizálódnak.
        </footer>
      </main>
    </div>
  )
}
