import React, { useEffect, useRef, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  applyOfficeRateSettings,
  loadOfficeRateMarker,
  saveOfficeRateMarker
} from '../../core/data/officeRates'

interface OfficeRateSyncProps {
  onRatesApplied: () => void
  onError: (message: string) => void
}

const projectUrl = import.meta.env.VITE_SUPABASE_URL ?? ''
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  ?? import.meta.env.VITE_SUPABASE_ANON_KEY
  ?? ''

export function OfficeRateSync({ onRatesApplied, onError }: OfficeRateSyncProps) {
  const [status, setStatus] = useState('Irodai árfrissítés ellenőrzése…')
  const running = useRef(false)
  const onRatesAppliedRef = useRef(onRatesApplied)
  const onErrorRef = useRef(onError)
  onRatesAppliedRef.current = onRatesApplied
  onErrorRef.current = onError

  useEffect(() => {
    if (!projectUrl || !publishableKey) {
      setStatus('Irodai árfrissítéshez nincs beállítva szerverkapcsolat.')
      return
    }

    const client = createClient(projectUrl, publishableKey)
    let active = true
    let timer = 0

    async function checkForUpdate() {
      if (running.current) return
      running.current = true
      try {
        const { data: sessionData, error: sessionError } = await client.auth.getSession()
        if (sessionError) throw sessionError
        const userId = sessionData.session?.user.id
        if (!userId) {
          if (active) setStatus('Jelentkezz be az irodai árfrissítés átvételéhez.')
          return
        }

        const { data, error } = await client
          .from('office_rate_updates')
          .select('settings, updated_at')
          .eq('user_id', userId)
          .maybeSingle()
        if (error) {
          if (error.code === '42P01' || error.code === 'PGRST205' || /office_rate_updates/i.test(error.message)) {
            throw new Error('Az irodai árfrissítési tábla még nincs beállítva a szerveren.')
          }
          throw new Error(`Nem sikerült lekérni az irodai árfrissítést: ${error.message}`)
        }
        if (!data) {
          if (active) setStatus('Még nincs új irodai árfrissítés.')
          return
        }
        if (loadOfficeRateMarker(userId) === data.updated_at) {
          if (active) setStatus(`Az irodai árlista naprakész · ${new Date(data.updated_at).toLocaleString('hu-HU')}.`)
          return
        }

        applyOfficeRateSettings(data.settings)
        saveOfficeRateMarker(userId, data.updated_at)
        onRatesAppliedRef.current()
        onErrorRef.current('')
        if (active) setStatus(`Új árlista átvéve az irodától · ${new Date(data.updated_at).toLocaleString('hu-HU')}.`)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Az irodai árfrissítést nem sikerült átvenni.'
        if (active) setStatus(message)
        onErrorRef.current(message)
      } finally {
        running.current = false
      }
    }

    const { data: listener } = client.auth.onAuthStateChange(() => {
      window.setTimeout(() => { void checkForUpdate() }, 0)
    })
    const run = () => { void checkForUpdate() }
    run()
    timer = window.setInterval(run, 60_000)
    window.addEventListener('focus', run)
    window.addEventListener('online', run)

    return () => {
      active = false
      window.clearInterval(timer)
      window.removeEventListener('focus', run)
      window.removeEventListener('online', run)
      listener.subscription.unsubscribe()
    }
  }, [])

  return <p className="hint office-rate-status" role="status" aria-live="polite">{status}</p>
}
