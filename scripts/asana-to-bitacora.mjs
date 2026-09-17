/**
 * Convierte la exportación XLSX de Asana a un respaldo JSON importable
 * en Bitácora de Sistemas (botón "Importar").
 *
 * Uso:
 *   npm run asana                          # usa asana.xlsx -> bitacora-respaldo-asana.json
 *   node scripts/asana-to-bitacora.mjs <input.xlsx> [output.json]
 *
 * Nota: el archivo fuente (asana.xlsx) no se sube al repositorio (está en .gitignore).
 */

import XLSX from 'xlsx'
import fs from 'node:fs'

const SRC = process.argv[2] || 'asana.xlsx'
const OUT = process.argv[3] || 'bitacora-respaldo-asana.json'

/* ===== Configuración (ajustar a gusto) ===== */

const PARTICIPANTE = 'Anibal'
const HORA_INICIO = '07:00'
const HORA_FIN = '13:30'

/* Secciones de Asana que se excluyen del respaldo (no laborales). */
const EXCLUDE_SECTIONS = ['Personal', 'Salud', 'Mantenimiento Hogar', 'Vencimientos']

/* ===== Utilidades ===== */

const norm = (s) =>
  String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

const serialToDate = (ser) => new Date(Math.round((ser - 25569) * 86400000))
const asDate = (v) => (v instanceof Date ? v : typeof v === 'number' ? serialToDate(v) : null)
const iso = (d) =>
  d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : ''

const esNoLaboral = (sec) => EXCLUDE_SECTIONS.some((s) => norm(sec).includes(norm(s)))

/* ===== Clasificadores de categoría / subtipo ===== */

const RULES = [
  {
    cat: 'reunion',
    peso: 3,
    kw: ['reunion', 'reunio', 'reunimos', 'reuni', 'hablamos', 'hablado', 'hablo', 'habla', 'hable',
      'llame', 'llamo', 'llamada', 'pidio', 'pidieron', 'comente', 'comento', 'planteo', 'plantea',
      'convers', 'transmiti', 'whatsapp', 'wsp', 'junta', 'hablar'],
    sub: { usuario: 'Reunión con sectores específicos (grupo de usuarios)', oficina: 'Reunión de oficina' },
    subDefault: 'Reunión de sector',
  },
  {
    cat: 'desarrollo',
    peso: 3,
    kw: ['apecue', 'adecue', 'adecuacion', 'agregue', 'agrego', 'agregar', 'agregado', 'cree', 'crea', 'crear',
      'creacion', 'creado', 'funcionalidad', 'modif', 'cambie', 'cambio', 'cambiar', 'corregir', 'corrige',
      'correccion', 'corregi', 'script', 'codigo', 'tabla', 'tablas', 'vista', 'registro', 'deshabilite',
      'habilite', 'quite', 'elimin', 'insertar', 'edita', 'editar', 'genera', 'generar', 'sql', 'varchar',
      'interface', 'interfaz', 'configuracion', 'configurar', 'desarrollo', 'desarroll'],
    sub: {
      error: 'Corrección de error',
      nueva: 'Funcionalidad adicionada',
      nuevo: 'Funcionalidad adicionada',
      agrega: 'Funcionalidad adicionada',
      crea: 'Funcionalidad adicionada',
      apecu: 'Adecuación de módulo',
      quite: 'Funcionalidad eliminada',
      elimino: 'Funcionalidad eliminada',
      refactor: 'Refactorización',
    },
    subDefault: 'Funcionalidad modificada',
  },
  {
    cat: 'testing',
    peso: 3,
    kw: ['prueba', 'pruebas', 'probar', 'probe', 'probamos', 'ensaye', 'test', 'teste', 'verif', 'regresion',
      'probando', 'probado'],
    sub: { regres: 'Pruebas de regresión', usabilidad: 'Pruebas de usabilidad', codigo: 'Test de código parcial', sql: 'Test de código parcial' },
    subDefault: 'Test de sitio completo',
  },
  {
    cat: 'despliegue',
    peso: 3,
    kw: ['produccion', 'despliegu', 'deploy', 'publica', 'publicar', 'publicado', 'release', 'migrac',
      'reinic', 'instal', 'actualiz', 'actualiza', 'mantenim', 'server', 'servidor', 'rollout'],
    sub: { produccion: 'Despliegue a producción', testing: 'Despliegue a testing / staging', migrac: 'Migración de datos', actualiz: 'Actualización / mantenimiento', mantenim: 'Actualización / mantenimiento' },
    subDefault: 'Actualización / mantenimiento',
  },
  {
    cat: 'analisis',
    peso: 2,
    kw: ['relevamien', 'analisis', 'analice', 'analiza', 'analizo', 'investig', 'estudia', 'documentac',
      'requerim', 'estimac', 'estime', 'estimo', 'consult', 'lectura', 'diseno', 'diseño', 'modelo',
      'entend', 'esquema'],
    sub: { requerim: 'Análisis de requerimientos', estima: 'Estimación de esfuerzo', investig: 'Investigación y documentación', docum: 'Investigación y documentación' },
    subDefault: 'Análisis técnico / diseño',
  },
]

const OTRO = {
  soporte: ['soport', 'incidenc', 'problema', 'falla', 'ayud', 'arrego', 'arregl', 'solucion', 'asist',
    'guardi', 'urgenc', 'inconveniente', 'revive'],
  capacitacion: ['capacit', 'tutorial', 'curso', 'ensen', 'expliqu', 'explique', 'prepara'],
  infraestructura: ['disco', 'servidor', 'host', 'red ', 'windows', 'navegador', 'backup', 'minio', 'impres',
    'instalacion', 'cable', 'espacio', 'memoria'],
  gestion: ['gestio', 'administr', 'pedid', 'oficio', 'tramit', 'correo', 'mail ', 'envie', 'enviar', 'presentac', 'acta'],
}

const mapSubOtro = (sub) =>
  sub === 'soporte' ? 'Soporte / resolución de incidencias'
  : sub === 'capacitacion' ? 'Capacitación'
  : sub === 'infraestructura' ? 'Infraestructura'
  : 'Gestión y administración'

const findCategoria = (text) => {
  const nt = norm(text)
  let best = null
  for (const r of RULES) {
    const hits = r.kw.filter((k) => nt.includes(k))
    if (hits.length > 0) {
      const score = hits.length * r.peso
      if (!best || score > best.score) best = { ...r, score }
    }
  }
  if (best) {
    let sub = best.subDefault
    for (const [k, s] of Object.entries(best.sub)) {
      if (nt.includes(k)) {
        sub = s
        break
      }
    }
    return { categoria: best.cat, subtipo: sub }
  }
  for (const [sub, kws] of Object.entries(OTRO)) {
    if (kws.some((k) => nt.includes(k))) {
      return { categoria: 'otro', subtipo: mapSubOtro(sub) }
    }
  }
  return { categoria: 'otro', subtipo: 'Otro' }
}

/* ===== Sistemas / módulos ===== */

const SISTEMAS = [
  ['sigichacomf', 'SIGI Chaco (MF)'],
  ['sigiprofesionales', 'SIGI Profesionales'],
  ['sigichaco', 'SIGI Chaco'],
  ['sigivisor', 'SIGI Visor'],
  ['justiciachaco', 'JusticiaChaco'],
  ['notificacionesnv', 'Notificaciones'],
  ['procofcol', 'PROCOFCOL'],
  ['conventus', 'Conventus'],
  ['notificaciones', 'Notificaciones'],
  ['estadistico', 'Estadísticas'],
  ['asistencias', 'Asistencias'],
  ['audiencias', 'Audiencias'],
  ['fiscalia', 'Fiscalía'],
  ['juzgado', 'Juzgados'],
  ['expedientes', 'Expedientes'],
  ['expediente', 'Expedientes'],
  ['exptes', 'Expedientes'],
  ['expte', 'Expedientes'],
  ['editor', 'Editor'],
  ['dominio', 'Dominio'],
  ['informix', 'Informix'],
  ['sql02', 'SQL02'],
  ['sql03', 'SQL03'],
  ['minio', 'MinIO'],
  ['procura', 'PROC'],
  ['proc', 'PROC'],
  ['bqueras', 'Búsquedas'],
  ['clickup', 'ClickUp'],
  ['grok', 'Grok'],
  ['firefox', 'Firefox'],
  ['windows', 'Windows'],
  ['servidor', 'Servidor'],
  ['server', 'Servidor'],
  ['host', 'Host'],
]

const findSistemas = (text) => {
  const nt = norm(text)
  const found = []
  for (const [token, label] of SISTEMAS) {
    const re = new RegExp(`\\b${token}\\b`)
    if (re.test(nt) || (token.length > 5 && nt.includes(token))) {
      if (!found.includes(label)) found.push(label)
    }
  }
  return found
}

/* ===== Etiquetas ===== */

const TAGS = [
  'expediente', 'expte', 'sigi', 'notificaciones', 'editor', 'dominio', 'informix', 'sql', 'minio',
  'disco', 'servidor', 'windows', 'firefox', 'clickup', 'grok', 'usuario', 'usuarios', 'permisos',
  'script', 'migracion', 'relevamiento', 'estadistica', 'audiencias', 'firma', 'asistencias', 'produccion',
  'tests', 'reunion', 'correo', 'penal', 'civil', 'laboral', 'federal', 'chaco', 'potencia', 'matricula',
  'contrase', 'procurador', 'proc', 'dependencia', 'dependencias', 'sala', 'camara', 'juicio', 'causas',
  'garantias', 'recurso', 'descarga', 'carpeta', 'expedientes', 'digital', 'fiscalia', 'juzgado',
]

const findTags = (text) => {
  const nt = norm(text)
  const tags = new Set()
  for (const t of TAGS) {
    if (nt.includes(t)) tags.add(norm(t))
  }
  return [...tags].slice(0, 6)
}

const resultadoDe = (text, completada) => {
  const nt = norm(text)
  if (/pendiente|falta |resta|queda pend|deberia|debe /.test(nt)) return 'Pendiente'
  if (completada) return 'Completada'
  return ''
}

/* ===== Lectura y conversión ===== */

const wb = XLSX.readFile(SRC, { cellDates: true, raw: false })
const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' })

const headers = rows[0]
const normMap = new Map(Object.entries(headers).map(([k, v]) => [String(v), k]))
const col = (r, name) => r[normMap.get(name) ?? ''] ?? ''

const actividades = []
const report = { total: 0, excluidas: {}, porCategoria: {} }

for (const r of rows.slice(1)) {
  const id = String(col(r, 'Task ID') || '').trim()
  if (id === 'Task ID' || id === '') continue

  const seccion = String(col(r, 'Section/Column') || '')
  if (esNoLaboral(seccion)) {
    report.excluidas[seccion] = (report.excluidas[seccion] ?? 0) + 1
    continue
  }

  const nombre = String(col(r, 'Name') || '').trim()
  const notas = String(col(r, 'Notes') || '').trim()
  const detalle = nombre ? (notas ? nombre + '\n\n' + notas : nombre) : notas
  if (!detalle) continue
  report.total++

  const creada = asDate(col(r, 'Created At'))
  const completada = asDate(col(r, 'Completed At'))
  const modificada = asDate(col(r, 'Last Modified'))
  const due = asDate(col(r, 'Due Date'))
  const priority = String(col(r, 'Priority') || '')
  const tagsAsana = String(col(r, 'Tags') || '').split(',').map((t) => norm(t)).filter(Boolean)

  const fecha = iso(creada) || iso(due)
  const textoClasif = `${detalle} ${seccion} ${tagsAsana.join(' ')}`
  const { categoria, subtipo } = findCategoria(textoClasif)
  const sistemas = findSistemas(textoClasif)
  const tags = [...new Set([...findTags(textoClasif), ...tagsAsana])].slice(0, 6)
  const completadaFlag = !!completada
  const resultado = resultadoDe(detalle, completadaFlag) || (priority ? `Prioridad: ${priority}` : '')

  report.porCategoria[categoria] = (report.porCategoria[categoria] ?? 0) + 1

  actividades.push({
    id,
    fecha,
    horaInicio: HORA_INICIO,
    horaFin: HORA_FIN,
    categoria,
    subtipo,
    sistema: sistemas.length ? sistemas.join(', ') : (String(col(r, 'Projects') || '') || 'Tareas diarias'),
    descripcion: detalle,
    resultado,
    participantes: PARTICIPANTE,
    tags,
    createdAt: creada ? creada.getTime() : Date.now(),
    updatedAt: (completada || modificada || creada || new Date()).getTime(),
  })
}

fs.writeFileSync(OUT, JSON.stringify({ app: 'bitacora-sistemas', version: 1, actividades }, null, 2), 'utf8')

console.log('Origen:', SRC)
console.log('Procesadas:', report.total)
console.log('Excluidas (personal):', JSON.stringify(report.excluidas))
console.log('Por categoría:', JSON.stringify(report.porCategoria))
console.log('Salida:', OUT, `(${(fs.statSync(OUT).size / 1024).toFixed(1)} KB, ${actividades.length} registros)`)