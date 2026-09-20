import type { Activity, ActivityDraft, CategoryId, CategoryMeta } from '@/types/activity'
/* ---------- Fechas ---------- */

export const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

export function parseISO(fecha: string): Date {
  const [y, m, d] = fecha.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function formatFecha(fecha: string): string {
  const d = parseISO(fecha)
  return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`
}

export function formatFechaCorta(fecha: string): string {
  const d = parseISO(fecha)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

export const yearOf = (a: Activity) => parseISO(a.fecha).getFullYear()
export const monthOf = (a: Activity) => parseISO(a.fecha).getMonth()

export function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/* ---------- Respaldos ---------- */

export const LAST_BACKUP_KEY = 'bitacora-sistemas.lastBackup'

export function leerUltimoRespaldo(): number | null {
  try {
    const raw = localStorage.getItem(LAST_BACKUP_KEY)
    return raw ? Number(raw) || null : null
  } catch {
    return null
  }
}

export function marcarRespaldo() {
  try {
    localStorage.setItem(LAST_BACKUP_KEY, String(Date.now()))
  } catch {
    /* sin almacenamiento disponible */
  }
}

/* ---------- Claves de agrupación ---------- */

/** "2026-03" -> "Marzo 2026" */
export function monthKey(fecha: string): string {
  return fecha.slice(0, 7)
}

export function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number)
  return `${MESES[m - 1]} ${y}`
}

/* ---------- Filtrado y búsqueda ---------- */

export interface Filtros {
  texto: string
  categoria: CategoryId | 'todas'
  desde: string
  hasta: string
  sistema: string
  tag: string
}

export const filtrosVacios: Filtros = {
  texto: '',
  categoria: 'todas',
  desde: '',
  hasta: '',
  sistema: '',
  tag: '',
}

export function enRango(a: Activity, desde: string, hasta: string): boolean {
  if (desde && a.fecha < desde) return false
  if (hasta && a.fecha > hasta) return false
  return true
}

export function matches(a: Activity, f: Filtros): boolean {
  if (f.categoria !== 'todas' && a.categoria !== f.categoria) return false
  if (!enRango(a, f.desde, f.hasta)) return false
  if (f.sistema && a.sistema.toLowerCase() !== f.sistema.toLowerCase()) return false
  if (f.tag && !a.tags.some((t) => t.toLowerCase().includes(f.tag.toLowerCase()))) return false
  if (f.texto) {
    const q = f.texto.toLowerCase()
    const blob = [
      a.descripcion,
      a.resultado ?? '',
      a.sistema,
      a.subtipo,
      a.participantes ?? '',
      a.tags.join(' '),
    ]
      .join(' ')
      .toLowerCase()
    if (!blob.includes(q)) return false
  }
  return true
}

export function sortByFecha(list: Activity[], asc = false): Activity[] {
  return [...list].sort((a, b) => (asc ? a.fecha.localeCompare(b.fecha) : b.fecha.localeCompare(a.fecha)))
}

/** Mapea un borrador del formulario a los campos de una actividad, normalizando la entrada. */
export function fromDraft(d: ActivityDraft): Omit<Activity, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    fecha: d.fecha,
    horaInicio: d.horaInicio || undefined,
    horaFin: d.horaFin || undefined,
    categoria: d.categoria,
    subtipo: d.subtipo,
    sistema: d.sistema.trim(),
    descripcion: d.descripcion.trim(),
    resultado: d.resultado.trim() || undefined,
    participantes: d.participantes.trim() || undefined,
    tags: [
      ...new Set(
        d.tags
          .split(',')
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean)
      ),
    ],
  }
}

/* ---------- Estadísticas ---------- */

export interface YearStats {
  year: number
  total: number
  porCategoria: { id: CategoryId; label: string; count: number; pct: number }[]
  /** matriz[mes][categoriaId] = cantidad */
  porMes: Record<number, Partial<Record<CategoryId, number>>>
  mesesConActividad: number
  sistemas: { nombre: string; count: number }[]
  subtiposTop: { nombre: string; count: number }[]
  tagsTop: { nombre: string; count: number }[]
  diasTrabajados: number
}

export function computeYearStats(acts: Activity[], year: number, categorias: CategoryMeta[]): YearStats {
  const delAno = acts.filter((a) => yearOf(a) === year)
  const porCategoria = categorias.map((c) => {
    const count = delAno.filter((a) => a.categoria === c.id).length
    return { id: c.id, label: c.label, count, pct: delAno.length ? Math.round((count / delAno.length) * 100) : 0 }
  })
  const porMes: Record<number, Partial<Record<CategoryId, number>>> = {}
  delAno.forEach((a) => {
    const m = monthOf(a)
    porMes[m] = porMes[m] ?? {}
    porMes[m][a.categoria] = (porMes[m][a.categoria] ?? 0) + 1
  })
  const sistemasMap = new Map<string, number>()
  delAno.forEach((a) => {
    if (a.sistema) sistemasMap.set(a.sistema, (sistemasMap.get(a.sistema) ?? 0) + 1)
  })
  const subMap = new Map<string, number>()
  delAno.forEach((a) => subMap.set(a.subtipo, (subMap.get(a.subtipo) ?? 0) + 1))
  const tagMap = new Map<string, number>()
  delAno.forEach((a) => a.tags.forEach((t) => tagMap.set(t, (tagMap.get(t) ?? 0) + 1)))
  const dias = new Set(delAno.map((a) => a.fecha)).size
  const srt = (m: Map<string, number>) =>
    [...m.entries()]
      .sort((x, y) => y[1] - x[1])
      .map(([nombre, count]) => ({ nombre, count }))
  return {
    year,
    total: delAno.length,
    porCategoria,
    porMes,
    mesesConActividad: Object.keys(porMes).length,
    sistemas: srt(sistemasMap),
    subtiposTop: srt(subMap).slice(0, 8),
    tagsTop: srt(tagMap).slice(0, 10),
    diasTrabajados: dias,
  }
}

/* ---------- Memoria anual en prosa (Markdown) ---------- */

export function generarMemoria(stats: YearStats): string {
  const lines: string[] = []
  lines.push(`# Memoria de actividades ${stats.year}`)
  lines.push('')
  lines.push(
    `Durante el año ${stats.year} se registraron **${stats.total} actividades** en ` +
      `${stats.mesesConActividad} meses distintos (${stats.diasTrabajados} días con actividad registrada).`
  )
  lines.push('')
  lines.push('## Distribución por tipo de actividad')
  lines.push('')
  for (const c of stats.porCategoria) {
    if (c.count > 0) lines.push(`- **${c.label}:** ${c.count} registros (${c.pct} %)`)
  }
  lines.push('')
  if (stats.subtiposTop.length) {
    lines.push('## Trabajos más frecuentes')
    lines.push('')
    stats.subtiposTop.forEach((s) => lines.push(`- ${s.nombre}: ${s.count} registros`))
    lines.push('')
  }
  if (stats.sistemas.length) {
    lines.push('## Sistemas / módulos intervenidos')
    lines.push('')
    stats.sistemas.forEach((s) => lines.push(`- ${s.nombre}: ${s.count} registros`))
    lines.push('')
  }
  lines.push('## Resumen mensual')
  lines.push('')
  for (let m = 0; m < 12; m++) {
    const row = stats.porMes[m]
    if (!row) continue
    const labelPorId = new Map(stats.porCategoria.map((c) => [c.id, c.label.toLowerCase()]))
    const parts = Object.entries(row)
      .filter(([ , v]) => v)
      .map(([id, v]) => `${labelPorId.get(id) ?? 'otras'}: ${v}`)
    lines.push(`- **${MESES[m]}:** ${parts.join(', ')}`)
  }
  lines.push('')
  return lines.join('\n')
}

/* ---------- Exportación / importación ---------- */

export function exportJSON(acts: Activity[], cats: CategoryMeta[] = []): string {
  return JSON.stringify({ app: 'bitacora-sistemas', version: 2, actividades: acts, categorias: cats }, null, 2)
}

export interface ImportResult {
  actividades: Activity[]
  categorias: CategoryMeta[] | null
  descartados: number
}

export function importJSON(raw: string): ImportResult {
  const data = JSON.parse(raw)
  const arr = Array.isArray(data) ? data : data.actividades
  const cats = (!Array.isArray(data) && Array.isArray(data.categorias))
    ? (data.categorias as CategoryMeta[])
    : null
  if (!Array.isArray(arr)) throw new Error('Formato inválido')
  const actividades: Activity[] = []
  let descartados = 0
  for (const a of arr) {
    if (!a || typeof a.id !== 'string' || typeof a.fecha !== 'string' || typeof a.descripcion !== 'string') {
      descartados++
      continue
    }
    const esValido = (v: unknown): v is string => typeof v === 'string'
    const texto = (v: unknown, fallback = '') => (esValido(v) ? v : fallback)
    actividades.push({
      id: a.id,
      fecha: a.fecha,
      horaInicio: esValido(a.horaInicio) ? a.horaInicio : undefined,
      horaFin: esValido(a.horaFin) ? a.horaFin : undefined,
      categoria: texto(a.categoria, 'otro'),
      subtipo: texto(a.subtipo),
      sistema: texto(a.sistema),
      descripcion: a.descripcion,
      resultado: esValido(a.resultado) ? a.resultado : undefined,
      participantes: esValido(a.participantes) ? a.participantes : undefined,
      tags: Array.isArray(a.tags)
        ? [
            ...new Set(
              (a.tags as unknown[])
                .filter((t): t is string => typeof t === 'string')
                .map((t) => t.toLowerCase())
            ),
          ]
        : [],
      createdAt: typeof a.createdAt === 'number' ? a.createdAt : Date.now(),
      updatedAt: typeof a.updatedAt === 'number' ? a.updatedAt : Date.now(),
    })
  }
  return { actividades, categorias: cats, descartados }
}
