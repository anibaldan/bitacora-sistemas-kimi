import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Activity, CategoryId, CategoryMeta } from '@/types/activity'
import { DEFAULT_CATEGORIES, FALLBACK_CATEGORY } from '@/types/activity'

const STORAGE_KEY = 'bitacora-sistemas.categorias.v1'

export interface Palette {
  id: string
  badge: string
  dot: string
  bar: string
}

export const CATEGORY_PALETTES: Palette[] = [
  { id: 'blue', badge: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300', dot: 'bg-blue-500', bar: 'bg-blue-500' },
  { id: 'violet', badge: 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300', dot: 'bg-violet-500', bar: 'bg-violet-500' },
  { id: 'amber', badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300', dot: 'bg-amber-500', bar: 'bg-amber-500' },
  { id: 'green', badge: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300', dot: 'bg-green-500', bar: 'bg-green-500' },
  { id: 'cyan', badge: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300', dot: 'bg-cyan-500', bar: 'bg-cyan-500' },
  { id: 'rose', badge: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300', dot: 'bg-rose-500', bar: 'bg-rose-500' },
  { id: 'orange', badge: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300', dot: 'bg-orange-500', bar: 'bg-orange-500' },
  { id: 'teal', badge: 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300', dot: 'bg-teal-500', bar: 'bg-teal-500' },
  { id: 'slate', badge: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300', dot: 'bg-slate-500', bar: 'bg-slate-500' },
]

function esMeta(valor: unknown): valor is CategoryMeta {
  if (!valor || typeof valor !== 'object') return false
  const c = valor as Record<string, unknown>
  return (
    typeof c.id === 'string' &&
    typeof c.label === 'string' &&
    typeof c.icon === 'string' &&
    typeof c.badge === 'string' &&
    typeof c.dot === 'string' &&
    typeof c.bar === 'string' &&
    Array.isArray(c.subtipos) &&
    c.subtipos.every((s) => typeof s === 'string')
  )
}

function cargarCategorias(): CategoryMeta[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.every(esMeta)) return parsed as CategoryMeta[]
    }
  } catch {
    /* seed con las predeterminadas */
  }
  return DEFAULT_CATEGORIES
}

function nuevoId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return `c-${crypto.randomUUID()}`
  return `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

export type CategoriaPatch = Omit<CategoryMeta, 'id'>

interface CategoriesContextValue {
  categories: CategoryMeta[]
  categoryMeta: (id: CategoryId) => CategoryMeta
  counts: Record<string, number>
  addCategory: (patch: CategoriaPatch) => CategoryMeta
  updateCategory: (id: CategoryId, patch: CategoriaPatch) => void
  removeCategory: (id: CategoryId) => boolean
}

const CategoriesContext = createContext<CategoriesContextValue | null>(null)

export function CategoriesProvider({ activities, children }: { activities: Activity[]; children: ReactNode }) {
  const [categories, setCategories] = useState<CategoryMeta[]>(cargarCategorias)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(categories))
    } catch {
      /* almacenamiento no disponible */
    }
  }, [categories])

  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    activities.forEach((a) => {
      c[a.categoria] = (c[a.categoria] ?? 0) + 1
    })
    return c
  }, [activities])

  const categoryMeta = useCallback(
    (id: CategoryId): CategoryMeta => categories.find((c) => c.id === id) ?? FALLBACK_CATEGORY,
    [categories],
  )

  const addCategory = useCallback((patch: CategoriaPatch): CategoryMeta => {
    const nueva: CategoryMeta = { ...patch, id: nuevoId() }
    setCategories((prev) => [...prev, nueva])
    return nueva
  }, [])

  const updateCategory = useCallback((id: CategoryId, patch: CategoriaPatch) => {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  }, [])

  const removeCategory = useCallback(
    (id: CategoryId): boolean => {
      if ((counts[id] ?? 0) > 0) return false
      setCategories((prev) => prev.filter((c) => c.id !== id))
      return true
    },
    [counts],
  )

  const value = useMemo(
    () => ({ categories, categoryMeta, counts, addCategory, updateCategory, removeCategory }),
    [categories, categoryMeta, counts, addCategory, updateCategory, removeCategory],
  )

  return <CategoriesContext.Provider value={value}>{children}</CategoriesContext.Provider>
}

export function useCategories(): CategoriesContextValue {
  const ctx = useContext(CategoriesContext)
  if (!ctx) throw new Error('useCategories debe usarse dentro de CategoriesProvider')
  return ctx
}