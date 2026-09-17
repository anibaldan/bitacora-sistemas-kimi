import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Minus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Activity, CategoryId } from '@/types/activity'
import { CATEGORIES } from '@/types/activity'
import { monthKey, monthLabel } from '@/lib/bitacora'

interface Props {
  activities: Activity[]
}

interface Periodo {
  desde: string
  hasta: string
}

function enPeriodo(a: Activity, p: Periodo): boolean {
  if (p.desde && a.fecha < p.desde) return false
  if (p.hasta && a.fecha > p.hasta) return false
  return true
}

function resumen(acts: Activity[]) {
  const porCat = new Map<CategoryId, number>()
  const porMes = new Map<string, number>()
  const sistemas = new Set<string>()
  const tags = new Set<string>()
  acts.forEach((a) => {
    porCat.set(a.categoria, (porCat.get(a.categoria) ?? 0) + 1)
    const k = monthKey(a.fecha)
    porMes.set(k, (porMes.get(k) ?? 0) + 1)
    if (a.sistema) sistemas.add(a.sistema.toLowerCase())
    a.tags.forEach((t) => tags.add(t.toLowerCase()))
  })
  return { porCat, porMes, sistemas, tags, total: acts.length }
}

export function CompareView({ activities }: Props) {
  const [a, setA] = useState<Periodo>({ desde: '', hasta: '' })
  const [b, setB] = useState<Periodo>({ desde: '', hasta: '' })

  const { ra, rb } = useMemo(() => {
    const pa = activities.filter((x) => enPeriodo(x, a))
    const pb = activities.filter((x) => enPeriodo(x, b))
    return { ra: resumen(pa), rb: resumen(pb) }
  }, [activities, a, b])

  if (activities.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Registrá actividades para poder comparar períodos.
        </CardContent>
      </Card>
    )
  }

  const delta = (x: number, y: number) => {
    const d = x - y
    if (d > 0) return { icon: <ArrowUp className="h-4 w-4 text-green-600" />, text: `+${d}` }
    if (d < 0) return { icon: <ArrowDown className="h-4 w-4 text-red-600" />, text: `${d}` }
    return { icon: <Minus className="h-4 w-4 text-muted-foreground" />, text: '0' }
  }

  const sistemaComunes = [...ra.sistemas].filter((s) => rb.sistemas.has(s))
  const soloA = [...ra.sistemas].filter((s) => !rb.sistemas.has(s))
  const soloB = [...rb.sistemas].filter((s) => !ra.sistemas.has(s))

  const inputs = (p: Periodo, setP: (p: Periodo) => void, titulo: string) => (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{titulo}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Desde</Label>
          <Input type="date" value={p.desde} onChange={(e) => setP({ ...p, desde: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Hasta</Label>
          <Input type="date" value={p.hasta} onChange={(e) => setP({ ...p, hasta: e.target.value })} />
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {inputs(a, setA, 'Período A')}
        {inputs(b, setB, 'Período B')}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Comparación por categoría</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="pb-2 font-medium">Categoría</th>
                <th className="pb-2 text-right font-medium">Período A</th>
                <th className="pb-2 text-right font-medium">Período B</th>
                <th className="pb-2 text-right font-medium">Δ (A − B)</th>
              </tr>
            </thead>
            <tbody>
              {CATEGORIES.map((c) => {
                const va = ra.porCat.get(c.id) ?? 0
                const vb = rb.porCat.get(c.id) ?? 0
                const d = delta(va, vb)
                return (
                  <tr key={c.id} className="border-t border-border/60">
                    <td className="py-1.5">{c.label}</td>
                    <td className="py-1.5 text-right">{va}</td>
                    <td className="py-1.5 text-right">{vb}</td>
                    <td className="py-1.5 text-right">
                      <span className="inline-flex items-center gap-1 justify-end">
                        {d.icon} {d.text}
                      </span>
                    </td>
                  </tr>
                )
              })}
              <tr className="border-t-2 border-border font-medium">
                <td className="py-1.5">Total</td>
                <td className="py-1.5 text-right">{ra.total}</td>
                <td className="py-1.5 text-right">{rb.total}</td>
                <td className="py-1.5 text-right">
                  {(() => {
                    const d = delta(ra.total, rb.total)
                    return (
                      <span className="inline-flex items-center gap-1 justify-end">
                        {d.icon} {d.text}
                      </span>
                    )
                  })()}
                </td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Actividad mensual — Período A</CardTitle>
          </CardHeader>
          <CardContent>
            {[...ra.porMes.entries()].length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin actividades en el período.</p>
            ) : (
              <ul className="space-y-1.5">
                {[...ra.porMes.entries()]
                  .sort((x, y) => x[0].localeCompare(y[0]))
                  .map(([k, v]) => (
                    <li key={k} className="flex justify-between text-sm">
                      <span>{monthLabel(k)}</span>
                      <Badge variant="secondary">{v}</Badge>
                    </li>
                  ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Actividad mensual — Período B</CardTitle>
          </CardHeader>
          <CardContent>
            {[...rb.porMes.entries()].length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin actividades en el período.</p>
            ) : (
              <ul className="space-y-1.5">
                {[...rb.porMes.entries()]
                  .sort((x, y) => x[0].localeCompare(y[0]))
                  .map(([k, v]) => (
                    <li key={k} className="flex justify-between text-sm">
                      <span>{monthLabel(k)}</span>
                      <Badge variant="secondary">{v}</Badge>
                    </li>
                  ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sistemas en común y diferencias</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">En ambos períodos ({sistemaComunes.length})</p>
            <div className="flex flex-wrap gap-1.5">
              {sistemaComunes.length === 0 ? (
                <span className="text-sm text-muted-foreground">Ninguno.</span>
              ) : (
                sistemaComunes.map((s) => (
                  <Badge key={s} variant="secondary" className="font-normal">
                    {s}
                  </Badge>
                ))
              )}
            </div>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">Solo en A ({soloA.length})</p>
            <div className="flex flex-wrap gap-1.5">
              {soloA.length === 0 ? (
                <span className="text-sm text-muted-foreground">Ninguno.</span>
              ) : (
                soloA.map((s) => (
                  <Badge key={s} variant="outline" className="font-normal">
                    {s}
                  </Badge>
                ))
              )}
            </div>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">Solo en B ({soloB.length})</p>
            <div className="flex flex-wrap gap-1.5">
              {soloB.length === 0 ? (
                <span className="text-sm text-muted-foreground">Ninguno.</span>
              ) : (
                soloB.map((s) => (
                  <Badge key={s} variant="outline" className="font-normal">
                    {s}
                  </Badge>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
