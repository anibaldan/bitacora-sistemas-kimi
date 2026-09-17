import { useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  AlertTriangle,
  Download,
  GitCompare,
  NotebookPen,
  CalendarClock,
  ScrollText,
  Upload,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/ui/sonner'
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
import { useActivities } from '@/hooks/useActivities'
import {
  exportJSON,
  fromDraft,
  importJSON,
  leerUltimoRespaldo,
  marcarRespaldo,
  todayISO,
} from '@/lib/bitacora'
import { ActivityList } from '@/sections/ActivityList'
import { AnnualReport } from '@/sections/AnnualReport'
import { CompareView } from '@/sections/CompareView'

type Vista = 'registros' | 'memoria' | 'comparar'

const NAV: { id: Vista; label: string; icon: typeof NotebookPen }[] = [
  { id: 'registros', label: 'Registros', icon: NotebookPen },
  { id: 'memoria', label: 'Memoria anual', icon: CalendarClock },
  { id: 'comparar', label: 'Comparar períodos', icon: GitCompare },
]

export default function Home() {
  const api = useActivities()
  const [vista, setVista] = useState<Vista>('registros')
  const [confirmImport, setConfirmImport] = useState<string | null>(null)
  const [diasSinRespaldo, setDiasSinRespaldo] = useState<number | null>(() => {
    const last = leerUltimoRespaldo()
    return last == null ? null : Math.floor((Date.now() - last) / (1000 * 60 * 60 * 24))
  })
  const [dismissBackup, setDismissBackup] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleExport = () => {
    const blob = new Blob([exportJSON(api.activities)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bitacora-respaldo-${todayISO()}.json`
    a.click()
    URL.revokeObjectURL(url)
    marcarRespaldo()
    setDiasSinRespaldo(0)
    setDismissBackup(false)
    toast.success('Respaldo descargado')
  }

  const handleFile = async (file: File) => {
    try {
      const text = await file.text()
      importJSON(text) // valida formato
      setConfirmImport(text)
    } catch {
      toast.error('El archivo no tiene un formato válido de bitácora')
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Toaster richColors position="bottom-right" />
      <input
        ref={fileRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void handleFile(f)
          e.target.value = ''
        }}
      />

      {/* Encabezado */}
      <header className="border-b border-border bg-card/60 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-3">
          <ScrollText className="h-5 w-5 text-primary" />
          <div className="leading-tight">
            <h1 className="text-base font-semibold">Bitácora de Sistemas</h1>
            <p className="text-xs text-muted-foreground">
              Registro personal de actividades — área de sistemas
            </p>
          </div>
          <span className="flex-1" />
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-1" /> Respaldo
          </Button>
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4 mr-1" /> Importar
          </Button>
        </div>
        {/* Navegación */}
        <nav className="mx-auto max-w-6xl px-4 flex gap-1">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setVista(id)}
              className={`flex items-center gap-1.5 rounded-t-md px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                vista === id
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </nav>
      </header>

      {diasSinRespaldo != null && diasSinRespaldo >= 7 && !dismissBackup && (
        <div className="mx-auto max-w-6xl px-4 pt-3">
          <div className="flex items-center gap-3 rounded-lg border border-amber-300/70 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 dark:border-amber-700/70 dark:bg-amber-950 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span className="flex-1">
              Hace {diasSinRespaldo} días que no descargás un respaldo. Tus datos viven solo en este
              navegador.
            </span>
            <Button variant="outline" size="sm" onClick={handleExport}>
              Descargar respaldo
            </Button>
            <button
              onClick={() => setDismissBackup(true)}
              aria-label="Cerrar aviso"
              className="text-amber-700 hover:text-amber-900 dark:text-amber-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-6xl px-4 py-6">
        {vista === 'registros' && (
          <ActivityList
            activities={api.activities}
            onAdd={(d) => api.add(fromDraft(d))}
            onUpdate={(id, d) => api.update(id, fromDraft(d))}
            onRemove={api.remove}
          />
        )}
        {vista === 'memoria' && <AnnualReport activities={api.activities} />}
        {vista === 'comparar' && <CompareView activities={api.activities} />}
      </main>

      <AlertDialog open={!!confirmImport} onOpenChange={(o) => !o && setConfirmImport(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Importar respaldo?</AlertDialogTitle>
            <AlertDialogDescription>
              Se reemplazarán los {api.activities.length} registros actuales por los contenidos en
              el archivo. Recomendado: descargá un respaldo antes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!confirmImport) return
                try {
                  const { actividades, descartados } = importJSON(confirmImport)
                  api.replaceAll(actividades)
                  toast.success(
                    descartados > 0
                      ? `Se importaron ${actividades.length} registros (${descartados} descartados)`
                      : `Se importaron ${actividades.length} registros`
                  )
                } catch {
                  toast.error('No se pudo importar el archivo')
                }
                setConfirmImport(null)
              }}
            >
              Importar y reemplazar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
