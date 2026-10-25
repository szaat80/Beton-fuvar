import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { Gyar, Projekt } from '../../core/data/storage'
import { FuvarForm } from './FuvarForm'

const gyarak: Gyar[] = [
  { id: 'duna', nev: 'Duna Beton', fuvarAlap: 18000, zonaLepes: 700, minM3: 4, allasDij: 2000 },
  { id: 'elem', nev: 'Elem Beton', fuvarAlap: 19000, zonaLepes: 700, minM3: 4, allasDij: 2000 }
]

const projektek: Projekt[] = [
  { nev: 'Duna projekt', arM3: 12000, gyarId: 'duna' },
  { nev: 'Elem projekt', arM3: 14000, gyarId: 'elem' }
]

describe('FuvarForm project choices', () => {
  it('only lists projects assigned to the currently selected factory', () => {
    const html = renderToStaticMarkup(
      <FuvarForm
        value={{
          fuvarszam: '',
          szallitolevel: '',
          cim: '',
          gyarId: 'duna',
          projekt: '',
          m3: '4',
          km: '5',
          allasDb: 0,
          ejszakai: false,
          datum: '2026-10-25'
        }}
        gyarak={gyarak}
        projektek={projektek}
        onChange={vi.fn()}
        onSave={vi.fn()}
        onCancelEdit={vi.fn()}
        editing={false}
      />
    )

    expect(html).toContain('Duna projekt')
    expect(html).not.toContain('Elem projekt')
  })
})
