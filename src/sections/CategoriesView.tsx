import { useMemo, useState } from 'react'
import {
  FolderTree,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useCategories } from '@/lib/categories'
import type { CategoriaPatch } from '@/lib/categories'
import type { CategoryId } from '@/types/activity'

interface Paleta {
  id: string
  badge: string
  dot: string
  bar: string
}

const PALETAS: Paleta[] = [
  { id: 'azul', badge: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300', dot: 'bg-blue-500', bar: 'bg-blue-500' },
  { id: 'violeta', badge: 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300', dot: 'bg-violet-500', bar: 'bg-violet-500' },
  { id: 'rosa', badge: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300', dot: 'bg-rose-500', bar: 'bg-rose-500' },
  { id: 'ambar', badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300', dot: 'bg-amber-500', bar: 'bg-amber-500' },
  { id: 'verde', badge: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300', dot: 'bg-green-500', bar: 'bg-green-500' },
]
interface Formulario {
  label: string
  icon: string
  badge: string
  dot: string
  bar: string
  subtipos: string
}

const VACIO: Formulario = {
  label: '',
  icon: 'tag',
  badge: PALETAS[0].badge,
  dot: PALETAS[0].dot,
  bar: PALETAS[0].bar,
  subtipos: '',
}
export function CategoriesView() {
  const {
    categories,
    counts,
    addCategory,
    updateCategory,
    removeCategory,
  } = useCategories()

  const [dialogo, setDialogo] = useState<'crear' | 'editar' | null>(null)
  const [editandoId, setEditandoId] = useState<CategoryId | null>(null)
  const [form, setForm] = useState<Formulario>(VACIO)
  const [porBorrar, setPorBorrar] = useState<CategoryId | null>(null)

  const total = useMemo(
    () => categories.reduce((acc, c) => acc + (counts[c.id] ?? 0), 0),
    [categories, counts],
  )

  function abrirCrear() {
    setForm(VACIO)
    setEditandoId(null)
    setDialogo('crear')
  }

  function abrirEditar(id: CategoryId) {
    const c = categories.find((x) => x.id === id)
    if (!c) return
    setForm({
      label: c.label,
      icon: c.icon,
      badge: c.badge,
      dot: c.dot,
      bar: c.bar,
      subtipos: c.subtipos.join('\n'),
    })
    setEditandoId(id)
    setDialogo('editar')
  }
  function guardar() {
    const label = form.label.trim()
    if (!label) {
      toast.error('El nombre no puede quedar vací­o')
      return
    }
    const patch: CategoriaPatch = {
      label,
      icon: form.icon,
      badge: form.badge,
      dot: form.dot,
      bar: form.bar,
      subtipos: form.subtipos
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
    }
    if (dialogo === 'crear') {
      addCategory(patch)
      toast.success('Categorí­a creada')
    } else if (editandoId) {
      updateCategory(editandoId, patch)
      toast.success('Categorí­a actualizada')
    }
    setDialogo(null)
  }

  function confirmarBorrado() {
    if (!porBorrar) return
    if (removeCategory(porBorrar)) {
      toast.success('Categoría eliminada')
    } else {
      toast.error('No se puede eliminar: tiene registros asociados')
    }
    setPorBorrar(null)
  }
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <FolderTree className="h-5 w-5 text-primary" />
              Categorí­as
            </CardTitle>
            <CardDescription>
              {categories.length} categorí­as · {total} registros
            </CardDescription>
          </div>
          <Button size="sm" onClick={abrirCrear}>
            <Plus className="mr-1 h-4 w-4" />
            Nueva
          </Button>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Todaví­a no hay categorí­as. Creá la primera.
            </p>
          )}
          {categories.map((c) => {
            const n = counts[c.id] ?? 0
            return (
              <div
                key={c.id}
                className="flex items-start justify-between gap-2 rounded-lg border p-3"
              >
                <div className="min-w-0 space-y-1">
                  <span className={`inline-flex items-center gap-1.5 ${c.dot} h-2 w-2 rounded-full`} />
                  <Badge className={c.badge}>{c.label}</Badge>
                  {c.subtipos.length > 0 && (
                    <p className="truncate text-xs text-muted-foreground">
                      {c.subtipos.join(' · ')}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {n} {n === 1 ? 'registro' : 'registros'}
                  </p>
                </div>
                          <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => abrirEditar(c.id)}
                    aria-label={`Editar ${c.label}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={() => setPorBorrar(c.id)}
                    disabled={n > 0}
                    aria-label={`Eliminar ${c.label}`}
                    title={n > 0 ? 'Tiene registros: no se puede eliminar' : 'Eliminar'}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>
      <Dialog open={dialogo !== null} onOpenChange={(o) => !o && setDialogo(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialogo === 'editar' ? 'Editar categorí­a' : 'Nueva categorí­a'}
            </DialogTitle>
            <DialogDescription>
              Elegí­ nombre, colores y opcionalmente subtipos separados por lí­nea.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="cat-label">Nombre</Label>
              <Input
                id="cat-label"
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder="p. ej. Backend"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-1.5">
                {PALETAS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() =>
                      setForm({ ...form, badge: p.badge, dot: p.dot, bar: p.bar })
                    }
                    className={`h-6 w-6 rounded-full ${p.dot} ${
                      form.dot === p.dot ? 'ring-2 ring-ring ring-offset-1' : ''
                    }`}
                    aria-label={`Color ${p.id}`}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cat-sub">Subtipos (uno por lí­nea)</Label>
              <Textarea
                id="cat-sub"
                value={form.subtipos}
                onChange={(e) => setForm({ ...form, subtipos: e.target.value })}
                placeholder={'Incidencias\nReleases\nMaintenimiento'}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogo(null)}>
              Cancelar
            </Button>
            <Button onClick={guardar} disabled={!form.label.trim()}>
              {dialogo === 'editar' ? 'Guardar cambios' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Confirmación de borrado de categoría */}
      <AlertDialog open={porBorrar !== null} onOpenChange={(o) => !o && setPorBorrar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta categoría?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarBorrado}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>      
    </div>
  )
}