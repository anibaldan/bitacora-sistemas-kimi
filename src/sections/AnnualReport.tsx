import { useMemo, useState } from 'react'
import { Copy, Download } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Activity } from '@/types/activity'
import { MESES, computeYearStats, generarMemoria, yearOf } from '@/lib/bitacora'
import { useCategories } from '@/lib/categories'

interface Props {
  activities: Activity[]
}

export function AnnualReport({ activities }: Props) {
  const years = useMemo(
    () => [...new Set(activities.map(yearOf))].sort((a, b) => b - a),
    [activities]
  )
  const [year, setYear] = useState<number | null>(null)

  const { categories, categoryMeta } = useCategories()

  const stats = useMemo(() => {
    const y = year ?? years[0]
    return y == null ? null : computeYearStats(activities, y, categories)
  }, [activities, years, year, categories])

  if (activities.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Registrá actividades para poder generar la memoria anual.
        </CardContent>
      </Card>
    )
  }

  const copiar = async () => {
    if (!stats) return
    await navigator.clipboard.writeText(generarMemoria(stats))
    toast.success('Memoria copiada al portapapeles')
  }

  const descargar = () => {
    if (!stats) return
    const blob = new Blob([generarMemoria(stats)], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `memoria-actividades-${stats.year}.md`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Memoria descargada')
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium">Año</span>
        <Select value={String(year ?? years[0])} onValueChange={(v) => setYear(Number(v))}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="flex-1" />
        <Button variant="outline" size="sm" onClick={copiar}>
          <Copy className="h-4 w-4 mr-1" /> Copiar memoria
        </Button>
        <Button size="sm" onClick={descargar}>
          <Download className="h-4 w-4 mr-1" /> Descargar .md
        </Button>
      </div>

      {stats && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Actividades', value: stats.total },
              { label: 'Meses con actividad', value: `${stats.mesesConActividad} / 12` },
              { label: 'Días trabajados', value: stats.diasTrabajados },
              { label: 'Sistemas intervenidos', value: stats.sistemas.length },
            ].map((k) => (
              <Card key={k.label}>
                <CardContent className="pt-4">
                  <p className="text-2xl font-bold">{k.value}</p>
                  <p className="text-xs text-muted-foreground">{k.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Por categoría</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {stats.porCategoria
                  .filter((c) => c.count > 0)
                  .map((c) => (
                    <div key={c.id}>
                      <div className="flex justify-between text-sm">
                        <span>{c.label}</span>
                        <span className="text-muted-foreground">
                          {c.count} · {c.pct} %
                        </span>
                      </div>
                      <div className="mt-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full ${categoryMeta(c.id).bar}`}
                          style={{ width: `${c.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Sistemas intervenidos</CardTitle>
              </CardHeader>
              <CardContent>
                {stats.sistemas.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin datos.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {stats.sistemas.slice(0, 10).map((s) => (
                      <li key={s.nombre} className="flex justify-between text-sm">
                        <span className="truncate">{s.nombre}</span>
                        <Badge variant="secondary">{s.count}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Matriz mes × categoría</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr>
                      <th className="text-left p-1" />
                      {categories.map((c) => (
                        <th key={c.id} className="p-1 text-center" title={c.label}>
                          <span className={`inline-block h-3 w-3 rounded-full ${c.dot}`} />
                        </th>
                      ))}
                      <th className="p-1 text-center font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MESES.map((m, i) => {
                      const row = stats.porMes[i]
                      if (!row) return null
                      const rowTotal = categories.reduce((acc, c) => acc + (row[c.id] ?? 0), 0)
                      return (
                        <tr key={m} className="border-t border-border/60">
                          <td className="p-1 whitespace-nowrap">{m}</td>
                          {categories.map((c) => (
                            <td key={c.id} className="p-1 text-center">
                              {row[c.id] ?? ''}
                            </td>
                          ))}
                          <td className="p-1 text-center font-medium">{rowTotal}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                  {categories.map((c) => (
                    <span key={c.id} className="flex items-center gap-1 text-xs text-muted-foreground">
                      <span className={`inline-block h-2.5 w-2.5 rounded-full ${c.dot}`} />
                      {c.label}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Trabajos más frecuentes y etiquetas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="mb-1.5 text-xs font-medium text-muted-foreground">Subtipos</p>
                  <div className="flex flex-wrap gap-1.5">
                    {stats.subtiposTop.map((s) => (
                      <Badge key={s.nombre} variant="secondary" className="font-normal">
                        {s.nombre} · {s.count}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-1.5 text-xs font-medium text-muted-foreground">Etiquetas</p>
                  <div className="flex flex-wrap gap-1.5">
                    {stats.tagsTop.length === 0 ? (
                      <span className="text-sm text-muted-foreground">Sin etiquetas.</span>
                    ) : (
                      stats.tagsTop.map((t) => (
                        <Badge key={t.nombre} variant="outline" className="font-normal">
                          #{t.nombre} · {t.count}
                        </Badge>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
