import { useMemo, useState } from 'react'
import {
  Pencil,
  Plus,
  Search,
  Trash2,
  ChevronUp,
  ChevronDown,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Activity, CategoryId } from '@/types/activity'
import { CATEGORIES, categoryMeta } from '@/types/activity'
import {
  filtrosVacios,
  formatFechaCorta,
  matches,
  monthKey,
  monthLabel,
  sortByFecha,
} from '@/lib/bitacora'
import type { Filtros } from '@/lib/bitacora'
import { ActivityForm, type ActivityDraft } from './ActivityForm'

interface Props {
  activities: Activity[]
  onAdd: (d: ActivityDraft) => void
  onUpdate: (id: string, d: ActivityDraft) => void
  onRemove: (id: string) => void
}

export function ActivityList({ activities, onAdd, onUpdate, onRemove }: Props) {
  const [filtros, setFiltros] = useState<Filtros>(filtrosVacios)
  const [asc, setAsc] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Activity | null>(null)
  const [deleting, setDeleting] = useState<Activity | null>(null)

  const sistemas = useMemo(
    () =>
      [...new Set(activities.map((a) => a.sistema).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b, 'es')
      ),
    [activities]
  )

  const filtrados = useMemo(
    () => sortByFecha(activities.filter((a) => matches(a, filtros)), asc),
    [activities, filtros, asc]
  )

  const agrupados = useMemo(() => {
    const map = new Map<string, Activity[]>()
    filtrados.forEach((a) => {
      const k = monthKey(a.fecha)
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(a)
    })
    return [...map.entries()]
  }, [filtrados])

  const hayFiltros = JSON.stringify(filtros) !== JSON.stringify(filtrosVacios)

  const handleSubmit = (d: ActivityDraft) => {
    if (editing) {
      onUpdate(editing.id, d)
      toast.success('Actividad actualizada')
    } else {
      onAdd(d)
      toast.success('Actividad registrada')
    }
    setFormOpen(false)
    setEditing(null)
  }

  const set = (k: keyof Filtros, v: string) => setFiltros((p) => ({ ...p, [k]: v }))

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Buscar en descripciones, sistemas, etiquetas, participantes…"
                value={filtros.texto}
                onChange={(e) => set('texto', e.target.value)}
              />
            </div>
            <Select
              value={filtros.categoria}
              onValueChange={(v) => setFiltros((p) => ({ ...p, categoria: v as CategoryId | 'todas' }))}
            >
              <SelectTrigger className="lg:w-56">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas las categorías</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filtros.sistema || 'todos'}
              onValueChange={(v) => set('sistema', v === 'todos' ? '' : v)}
            >
              <SelectTrigger className="lg:w-56">
                <SelectValue placeholder="Sistema" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los sistemas</SelectItem>
                {sistemas.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Desde</Label>
              <Input type="date" value={filtros.desde} onChange={(e) => set('desde', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Hasta</Label>
              <Input type="date" value={filtros.hasta} onChange={(e) => set('hasta', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Etiqueta</Label>
              <Input
                className="w-40"
                placeholder="p. ej. api"
                value={filtros.tag}
                onChange={(e) => set('tag', e.target.value)}
              />
            </div>
            <Button variant="ghost" size="sm" onClick={() => setFiltros(filtrosVacios)} disabled={!hayFiltros}>
              Limpiar filtros
            </Button>
            <div className="flex-1" />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAsc((v) => !v)}
              title={asc ? 'Orden: antiguas primero' : 'Orden: recientes primero'}
            >
              {asc ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
              {asc ? 'Antiguas primero' : 'Recientes primero'}
            </Button>
            <Button
              onClick={() => {
                setEditing(null)
                setFormOpen(true)
              }}
            >
              <Plus className="h-4 w-4 mr-1" /> Nueva actividad
            </Button>
          </div>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        {filtrados.length} actividad{filtrados.length !== 1 ? 'es' : ''}
        {filtros.texto && <> para «{filtros.texto}»</>}
      </p>

      {/* Timeline agrupada por mes */}
      {agrupados.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {activities.length === 0
              ? 'Todavía no hay actividades registradas. Comenzá cargando tu primera entrada.'
              : 'Ninguna actividad coincide con los filtros aplicados.'}
          </CardContent>
        </Card>
      ) : (
        agrupados.map(([key, items]) => (
          <div key={key} className="relative pl-6">
            <div className="absolute left-[9px] top-2 bottom-0 w-px bg-border" aria-hidden />
            <h3 className="relative mb-3 font-semibold">
              <span className="absolute -left-6 top-1.5 h-3 w-3 rounded-full bg-primary ring-4 ring-background" />
              {monthLabel(key)}
              <Badge variant="secondary" className="ml-2">
                {items.length}
              </Badge>
            </h3>
            <div className="space-y-3 pb-2">
              {items.map((a) => {
                const meta = categoryMeta(a.categoria)
                return (
                  <Card key={a.id} className="relative overflow-hidden">
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${meta.bar}`} />
                    <CardContent className="pt-4 pl-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium">{formatFechaCorta(a.fecha)}</span>
                        {a.horaInicio && (
                          <span className="text-xs text-muted-foreground">
                            {a.horaInicio}
                            {a.horaFin ? ` – ${a.horaFin}` : ''}
                          </span>
                        )}
                        <Badge className={meta.badge}>{meta.label}</Badge>
                        <Badge variant="outline">{a.subtipo}</Badge>
                        <span className="flex-1" />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => {
                            setEditing(a)
                            setFormOpen(true)
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => setDeleting(a)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <p className="mt-2 text-sm font-medium">{a.sistema}</p>
                      <p className="mt-1 text-sm whitespace-pre-wrap text-foreground/90">{a.descripcion}</p>
                      {a.resultado && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          <span className="font-medium">Resultado:</span> {a.resultado}
                        </p>
                      )}
                      {(a.participantes || a.tags.length > 0) && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {a.participantes && (
                            <Badge variant="secondary" className="font-normal">
                              👥 {a.participantes}
                            </Badge>
                          )}
                          {a.tags.map((t) => (
                            <Badge key={t} variant="outline" className="font-normal">
                              #{t}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        ))
      )}

      {/* Dialog crear/editar */}
      <Dialog open={formOpen} onOpenChange={(o) => (setFormOpen(o), !o && setEditing(null))}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar actividad' : 'Nueva actividad'}</DialogTitle>
          </DialogHeader>
          <ActivityForm initial={editing} onSubmit={handleSubmit} onCancel={() => setFormOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Confirmar borrado */}
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta actividad?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará el registro del {deleting ? formatFechaCorta(deleting.fecha) : ''} sobre «
              {deleting?.sistema}». Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleting) onRemove(deleting.id)
                setDeleting(null)
                toast.success('Actividad eliminada')
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
