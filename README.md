# ToDoLst (Tableaux)

Aplicación web (Vite + React + TypeScript) con guardado universal usando Supabase (Auth + Postgres) y despliegue gratuito en Vercel.

## Desarrollo local

1. Crea un fichero `.env` (puedes copiar `.env.example`).
2. Rellena:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Arranca:

```bash
npm install
npm run dev
```

## Supabase (gratis)

1. Crea un proyecto en Supabase (plan Free).
2. Ve a **SQL Editor** y ejecuta el contenido de [supabase_schema.sql](file:///c:/Didako/ToDoLst/supabase_schema.sql).
3. Ve a **Authentication → Providers**:
   - Para empezar fácil, usa Email/Password.
4. Ve a **Project Settings → API** y copia:
   - Project URL → `VITE_SUPABASE_URL`
   - anon public key → `VITE_SUPABASE_ANON_KEY`

## Vercel (gratis)

1. Importa el repo en Vercel (plan Hobby).
2. En **Environment Variables**, configura:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Deploy.

## Qué guarda y cómo

- Proyectos: tabla `projects`
- Estado actual por proyecto: tabla `project_state`
- Snapshots históricos: tabla `snapshots`
- Acceso y seguridad: RLS por usuario (`auth.uid()`)

## Solución de problemas

- Error “Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY”: faltan variables de entorno.
- Veo proyectos de otros: revisa que se ejecutó `supabase_schema.sql` (RLS + policies).
