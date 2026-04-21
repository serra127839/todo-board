## Objetivo

Despliegue 100% gratuito:

- Frontend: Vercel (Hobby)
- Backend/Auth/DB: Supabase (Free)

## Supabase

1. Crear un proyecto (plan Free).
2. SQL Editor → ejecutar el archivo `supabase_schema.sql`.
3. Authentication → Providers → habilitar Email (password).
4. Project Settings → API → copiar:
   - Project URL → `VITE_SUPABASE_URL`
   - anon public key → `VITE_SUPABASE_ANON_KEY`

## Vercel

1. Importar el repositorio.
2. Settings → Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Deploy.

## Prueba rápida

1. Abrir la URL de Vercel.
2. Crear cuenta / iniciar sesión.
3. Crear proyecto y guardar.

Si sale una pantalla de “Configurar Supabase”, faltan variables de entorno.

