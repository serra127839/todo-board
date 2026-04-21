# Estado actual (resumen)

## App publicada

- URL: https://project-ptorv.vercel.app/
- El deployment sirve directamente `tableaux2.html` (sin build de React/Vite).
- Interacción principal: tabla tipo calendario con tareas (filas) y días (columnas) con “pasteles” de progreso.

## Modelo de datos (cliente)

- Persistencia local (por proyecto): `localStorage`.
  - Índice de proyectos: `tableaux:projects:index`
  - Proyecto actual: `tableaux:projects:current`
  - Snapshot por proyecto: `tableaux:project:<ProjectName>`
- Estructura base del JSON de proyecto:
  - `board`: incluye `projectName`, `startDate`, `endDate`
  - `tasks`: lista con `{id,title,owner,order}`
  - `cells`: mapa por día/tarea con `{percent,status}`
  - Convención estados: `red|yellow|green|black`
  - Convención percent: `0|25|50|75|100`

## Export/Import (usuario)

- Export en cabecera (selector + botón Save):
  - HTML: genera HTML con JSON embebido (`<script id="tableaux-embedded" type="application/json">…</script>`)
  - JSON: exporta el proyecto actual
  - PDF: `window.print()` con ajustes `@media print`
- Import: arrastrar y soltar un `.json` sobre la página (importa a `localStorage`).

## Compartición (nube)

- Objetivo actual: que todo el mundo trabaje “con lo mismo”.
- Implementación: estado compartido en Supabase con una fila única (último en guardar gana).
  - Tabla: `public.shared_state`
  - Clave fija: `id = 'main'`
  - Columna: `data jsonb` con un “paquete” de todos los proyectos:
    - `projects[]`, `current`, `dataByProject{ name: projectJson }`
- RLS: acceso permitido a usuarios autenticados (`auth.role() = 'authenticated'`).
- Flujo:
  - Al abrir web: si hay sesión, intenta `pull` de `shared_state/main`.
  - Si la fila no existe y el navegador ya tiene datos locales, se “siembra” (`upsert`) automáticamente.
  - En cambios: autosave (debounce ~800ms) hace `upsert` a `shared_state/main`.

## Supabase (scripts)

- Esquema base user-scoped (opción A) existente: `supabase_schema.sql`
- Esquema de estado compartido: `supabase_shared_state.sql`
- Verificación básica: `supabase_verify.sql`

## Comunicación a usuarios

- Instrucción simple:
  - Abrir URL
  - Crear cuenta / iniciar sesión
  - Trabajar normal (no hace falta exportar para guardar)
- Export HTML/JSON/PDF queda como backup/impresión/compartición por archivo, no como persistencia universal.

