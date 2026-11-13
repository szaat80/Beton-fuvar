import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { FuvarRecord } from '../../core/data/storage'
import { Dashboard } from './Dashboard'

describe('Dashboard', () => {
  it('hides the traveled-distance tile while retaining other trip totals', () => {
    const fuvar: FuvarRecord = {
      id: 'test-1',
      createdAt: '2026-10-25T08:00:00.000Z',
      fuvarszam: '',
      szallitolevel: '',
      gyarId: 'gyar-1',
      gyarNev: 'Teszt gyár',
      cim: '',
      fuvarAlap: 18000,
      zonaLepes: 700,
      projekt: '',
      projektDij: null,
      m3: 6,
      km: 18,
      allasDb: 0,
      betonDij: 108000,
      kmExtra: 0,
      allasDij: 0,
      total: 125000
    }
    const html = renderToStaticMarkup(
      <Dashboard
        fuvarok={[fuvar]}
        munkaidoTetelek={[]}
      />
    )

    expect(html).not.toContain('Megtett út')
    expect(html).not.toContain('km')
    expect(html).toContain('125')
    expect(html).toContain('<small> m³</small>')
    expect(html).toContain('>6<small>')
  })
})
