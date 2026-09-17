import { useCallback, useEffect, useState } from 'react'
import type { Activity } from '@/types/activity'

const STORAGE_KEY = 'bitacora-sistemas.actividades.v1'

function load(): Activity[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Activity[]) : []
  } catch {
    return []
  }
}

function persist(acts: Activity[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(acts))
}

export function useActivities() {
  const [activities, setActivities] = useState<Activity[]>(load)

  useEffect(() => {
    persist(activities)
  }, [activities])

  const add = useCallback((a: Omit<Activity, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = Date.now()
    const nuevo: Activity = {
      ...a,
      id: `${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: now,
      updatedAt: now,
    }
    setActivities((prev) => [nuevo, ...prev])
    return nuevo
  }, [])

  const update = useCallback((id: string, patch: Partial<Omit<Activity, 'id' | 'createdAt'>>) => {
    setActivities((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...patch, updatedAt: Date.now() } : a))
    )
  }, [])

  const remove = useCallback((id: string) => {
    setActivities((prev) => prev.filter((a) => a.id !== id))
  }, [])

  const replaceAll = useCallback((acts: Activity[]) => {
    setActivities(acts)
  }, [])

  return { activities, add, update, remove, replaceAll }
}

export type ActivitiesApi = ReturnType<typeof useActivities>
