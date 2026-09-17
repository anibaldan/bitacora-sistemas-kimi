# Bitácora de Sistemas

Webapp para el registro diario de actividades del área de sistemas / desarrollo de un departamento de informática. 100% client-side: los datos se guardan en el `localStorage` del navegador, sin backend ni cuenta de usuario.

## Características

- **Registro de actividades** con fecha, horas, categoría, subtipo, sistema, descripción, resultado, participantes y etiquetas.
- **Listado con filtros**: texto libre, categoría, sistema, rango de fechas y etiqueta; orden ascendente/descendente y timeline agrupada por mes.
- **Memoria anual**: KPIs, distribución por categoría, matriz mes × categoría, top de subtipos y etiquetas, y generación de una memoria en Markdown (copiar o descargar).
- **Comparación de períodos** A/B con delta por categoría, actividad mensual y sistemas en común / exclusivos.
- **Respaldo**: exportación e importación de la base completa en JSON.

### Persistencia

Los datos viven únicamente en el navegador, en la clave `bitacora-sistemas.actividades.v1`. **El backup JSON es la única defensa**: si se limpia el navegador o se usa otro dispositivo, los datos no viajan solos.

## Stack

- React 19 + TypeScript (strict)
- Vite 7
- Tailwind CSS + shadcn/ui (Radix)
- react-router 7, sonner (notificaciones), lucide-react (íconos)

## Desarrollo local

```bash
npm install
npm run dev     # http://localhost:3000/bitacora-sistemas-kimi/
```

## Build y publicación (GitHub Pages)

```bash
npm run build   # genera ./dist
npm run preview # previsualizar el build local
```

El repositorio incluye un workflow de GitHub Actions (`.github/workflows/deploy.yml`) que compila y publica en GitHub Pages con cada push a `main`.

**URL publicada:** https://anibaldan.github.io/bitacora-sistemas-kimi/

> Publica como *project site*, por eso la base y el router usan el prefijo `/bitacora-sistemas-kimi/`. Si algún día lo movés a la raíz de un dominio propio, cambiá `base` en `vite.config.ts` (el router toma el `basename` automáticamente de ahí). El `public/404.html` redirige cualquier ruta inexistente a la app.

## Scripts

| Comando        | Descripción                              |
| -------------- | ---------------------------------------- |
| `npm run dev`  | Servidor de desarrollo con HMR           |
| `npm run build`| Typecheck + build de producción          |
| `npm run lint` | ESLint                                   |
| `npm run preview` | Previsualiza el build de producción  |