export type CategoryId =
  | 'desarrollo'
  | 'analisis'
  | 'testing'
  | 'despliegue'
  | 'reunion'
  | 'otro'

export interface Activity {
  id: string
  /** Fecha ISO YYYY-MM-DD */
  fecha: string
  horaInicio?: string
  horaFin?: string
  categoria: CategoryId
  /** Subtipo dentro de la categoría (p. ej. "Funcionalidad adicionada") */
  subtipo: string
  /** Sistema / módulo / proyecto afectado */
  sistema: string
  /** Descripción de lo realizado */
  descripcion: string
  /** Resultado / observaciones / conclusiones */
  resultado?: string
  /** Participantes (relevante en reuniones) */
  participantes?: string
  tags: string[]
  createdAt: number
  updatedAt: number
}

export interface CategoryMeta {
  id: CategoryId
  label: string
  icon: string
  /** Clases de color para badges y puntos de timeline */
  badge: string
  dot: string
  bar: string
  subtipos: string[]
}

export const CATEGORIES: CategoryMeta[] = [
  {
    id: 'desarrollo',
    label: 'Desarrollo de software',
    icon: 'code',
    badge: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
    dot: 'bg-blue-500',
    bar: 'bg-blue-500',
    subtipos: [
      'Adecuación de módulo',
      'Funcionalidad adicionada',
      'Funcionalidad modificada',
      'Funcionalidad eliminada',
      'Corrección de error',
      'Refactorización',
    ],
  },
  {
    id: 'analisis',
    label: 'Análisis',
    icon: 'search',
    badge: 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300',
    dot: 'bg-violet-500',
    bar: 'bg-violet-500',
    subtipos: [
      'Análisis de requerimientos',
      'Análisis técnico / diseño',
      'Investigación y documentación',
      'Estimación de esfuerzo',
    ],
  },
  {
    id: 'testing',
    label: 'Testing',
    icon: 'flask',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
    dot: 'bg-amber-500',
    bar: 'bg-amber-500',
    subtipos: [
      'Test de código parcial',
      'Test de sitio completo',
      'Pruebas de regresión',
      'Pruebas de usabilidad',
    ],
  },
  {
    id: 'despliegue',
    label: 'Despliegue',
    icon: 'rocket',
    badge: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300',
    dot: 'bg-green-500',
    bar: 'bg-green-500',
    subtipos: [
      'Despliegue a producción',
      'Despliegue a testing / staging',
      'Actualización / mantenimiento',
      'Migración de datos',
    ],
  },
  {
    id: 'reunion',
    label: 'Reuniones',
    icon: 'users',
    badge: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300',
    dot: 'bg-cyan-500',
    bar: 'bg-cyan-500',
    subtipos: [
      'Reunión de oficina',
      'Reunión de sector',
      'Reunión con sectores específicos (grupo de usuarios)',
      'Reunión con proveedores / terceros',
    ],
  },
  {
    id: 'otro',
    label: 'Otras actividades',
    icon: 'clipboard',
    badge: 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    dot: 'bg-gray-500',
    bar: 'bg-gray-500',
    subtipos: [
      'Soporte / resolución de incidencias',
      'Capacitación',
      'Gestión y administración',
      'Infraestructura',
      'Otro',
    ],
  },
]

export const categoryMeta = (id: CategoryId): CategoryMeta =>
  CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1]
