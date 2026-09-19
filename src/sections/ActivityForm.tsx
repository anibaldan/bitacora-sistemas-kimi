import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Activity, ActivityDraft, CategoryId } from '@/types/activity'
import { useCategories } from '@/lib/categories'
import { todayISO } from '@/lib/bitacora'

const emptyDraft = (categoria: string, subtipo: string): ActivityDraft => ({
  fecha: todayISO(),
  horaInicio: '',
  horaFin: '',
  categoria,
  subtipo,
  sistema: '',
  descripcion: '',
  resultado: '',
  participantes: '',
  tags: '',
})

function draftFrom(a: Activity): ActivityDraft {
  return {
    fecha: a.fecha,
    horaInicio: a.horaInicio ?? '',
    horaFin: a.horaFin ?? '',
    categoria: a.categoria,
    subtipo: a.subtipo,
    sistema: a.sistema,
    descripcion: a.descripcion,
    resultado: a.resultado ?? '',
    participantes: a.participantes ?? '',
    tags: a.tags.join(', '),
  }
}

function toDraft(initial: Activity | ActivityDraft): ActivityDraft {
  if ('id' in initial) return draftFrom(initial)
  return { ...initial }
}

interface Props {
  initial?: Activity | ActivityDraft | null
  onSubmit: (d: ActivityDraft) => void
  onCancel: () => void
}

export function ActivityForm({ initial, onSubmit, onCancel }: Props) {
  const { categories, categoryMeta } = useCategories()
  const defaultCategoria = categories[0]?.id ?? 'otro'
  const defaultSubtipo = categories[0]?.subtipos[0] ?? ''
  const [d, setD] = useState<ActivityDraft>(() =>
    initial ? toDraft(initial) : emptyDraft(defaultCategoria, defaultSubtipo),
  )
  const [prevInitial, setPrevInitial] = useState(initial)

  if (prevInitial !== initial) {
    setPrevInitial(initial)
    setD(initial ? toDraft(initial) : emptyDraft(defaultCategoria, defaultSubtipo))
  }

  const meta = categoryMeta(d.categoria)
  const set = <K extends keyof ActivityDraft>(k: K, v: ActivityDraft[K]) =>
    setD((prev) => ({ ...prev, [k]: v }))

  const handleCategoria = (id: CategoryId) => {
    const m = categoryMeta(id)
    setD((prev) => ({ ...prev, categoria: id, subtipo: m.subtipos[0] }))
  }

  const valid = d.fecha && d.descripcion.trim() && d.sistema.trim()

  const handleSubmit = () => {
    if (!valid) {
      toast.error('Completa al menos la fecha, el sistema y la descripción')
      return
    }
    onSubmit(d)
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="fecha">Fecha *</Label>
          <Input
            id="fecha"
            type="date"
            value={d.fecha}
            onChange={(e) => set('fecha', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="horaInicio">Hora inicio</Label>
          <Input
            id="horaInicio"
            type="time"
            value={d.horaInicio}
            onChange={(e) => set('horaInicio', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="horaFin">Hora fin</Label>
          <Input
            id="horaFin"
            type="time"
            value={d.horaFin}
            onChange={(e) => set('horaFin', e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Categoría *</Label>
          <Select value={d.categoria} onValueChange={(v) => handleCategoria(v as CategoryId)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Subtipo</Label>
          <Select value={d.subtipo} onValueChange={(v) => set('subtipo', v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {meta.subtipos.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="sistema">Sistema / módulo / proyecto *</Label>
        <Input
          id="sistema"
          placeholder="p. ej. Sistema de Gestión de Expedientes — módulo reportes"
          value={d.sistema}
          onChange={(e) => set('sistema', e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="descripcion">Descripción de lo realizado *</Label>
        <Textarea
          id="descripcion"
          rows={4}
          placeholder="Detallá qué hiciste: contexto, cambios, motivo…"
          value={d.descripcion}
          onChange={(e) => set('descripcion', e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="resultado">Resultado / observaciones</Label>
        <Textarea
          id="resultado"
          rows={2}
          placeholder="Conclusión, estado final, pendientes…"
          value={d.resultado}
          onChange={(e) => set('resultado', e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="participantes">Participantes</Label>
          <Input
            id="participantes"
            placeholder="Relevante en reuniones"
            value={d.participantes}
            onChange={(e) => set('participantes', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tags">Etiquetas</Label>
          <Input
            id="tags"
            placeholder="separadas por coma: api, informix, urgente"
            value={d.tags}
            onChange={(e) => set('tags', e.target.value)}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button onClick={handleSubmit}>{initial ? 'Guardar cambios' : 'Registrar actividad'}</Button>
      </div>
    </div>
  )
}
