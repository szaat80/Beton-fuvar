import { useMemo } from 'react'
import type { FuvarRecord, MunkaidoTetel } from '../../core/data/storage'

interface Props {
  fuvarok: FuvarRecord[]
  munkaidoTetelek: MunkaidoTetel[]
}

const ft = (n: number) => `${Math.round(n).toLocaleString('hu-HU')} Ft`

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return <div className="spark-empty">Legalább 2 fuvar után grafikon jelenik meg</div>
  const max = Math.max(...values, 1)
  const w = 240
  const h = 64
  const pts = values.map((v, i) => [(i / (values.length - 1)) * w, h - 6 - (v / max) * (h - 14)] as const)
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img" aria-label="Utolsó fuvarok bevétele">
      <defs>
        <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="currentColor" stopOpacity="0.45" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L${w} ${h} L0 ${h} Z`} fill="url(#spark-fill)" />
      <path d={line} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="3.5" fill="currentColor" />
    </svg>
  )
}

export function Dashboard({ fuvarok, munkaidoTetelek }: Props) {
  const stat = useMemo(() => {
    const fuvarBevetel = fuvarok.reduce((s, f) => s + f.total, 0)
    const muhely = munkaidoTetelek.filter((t) => t.tipus === 'muhely').reduce((s, t) => s + t.total, 0)
    const m3 = fuvarok.reduce((s, f) => s + (Number(f.m3) || 0), 0)
    const km = fuvarok.reduce((s, f) => s + (Number(f.km) || 0), 0)
    const trend = [...fuvarok].reverse().slice(-14).map((f) => f.total)
    return { fuvarBevetel, muhely, m3, km, trend, osszes: fuvarBevetel + muhely }
  }, [fuvarok, munkaidoTetelek])

  return (
    <section className="bento" aria-label="Áttekintés">
      <article className="tile tile-hero">
        <span className="tile-label">Összes bevétel</span>
        <strong className="tile-big">{ft(stat.osszes)}</strong>
        <Sparkline values={stat.trend} />
      </article>
      <article className="tile">
        <span className="tile-label">Fuvar</span>
        <strong className="tile-num">{fuvarok.length}<small> db</small></strong>
        <span className="tile-sub">{ft(stat.fuvarBevetel)}</span>
      </article>
      <article className="tile">
        <span className="tile-label">Műhely</span>
        <strong className="tile-num">{ft(stat.muhely)}</strong>
      </article>
      <article className="tile">
        <span className="tile-label">Beton</span>
        <strong className="tile-num">{stat.m3.toLocaleString('hu-HU', { maximumFractionDigits: 1 })}<small> m³</small></strong>
      </article>
      <article className="tile">
        <span className="tile-label">Megtett út</span>
        <strong className="tile-num">{stat.km.toLocaleString('hu-HU', { maximumFractionDigits: 0 })}<small> km</small></strong>
      </article>
    </section>
  )
}
