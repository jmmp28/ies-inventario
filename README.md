# IES Inventario

Sistema de gestión de inventario para institutos de educación.

## Stack
- React 18 + Vite
- Supabase (base de datos + autenticación)
- React Router v6
- Desplegado en Vercel (gratuito)

## Desarrollo local

```bash
npm install
npm run dev
```

Abre http://localhost:5173

## Despliegue en Vercel

### Opción A — desde GitHub (recomendada)

1. Sube este proyecto a un repositorio de GitHub
2. Ve a https://vercel.com → "Add New Project"
3. Importa el repositorio
4. Vercel detecta Vite automáticamente → haz clic en "Deploy"
5. En ~1 minuto tendrás una URL pública (ej. `ies-inventario.vercel.app`)

### Opción B — con Vercel CLI

```bash
npm install -g vercel
vercel
```

## Primer usuario (Superadmin)

Tras el despliegue, crea el primer usuario desde Supabase:

1. Supabase → Authentication → Users → "Add user"
2. Introduce email y contraseña
3. Ve a Table Editor → perfiles → edita el registro creado → cambia `rol` a `superadmin`

A partir de ahí, el superadmin puede gestionar el resto de usuarios desde la app.

## Estructura del proyecto

```
src/
  lib/
    supabase.js       ← cliente Supabase
  hooks/
    useAuth.jsx       ← contexto de autenticación
  components/
    Layout.jsx        ← sidebar + navegación
  pages/
    Login.jsx         ← pantalla de acceso
    Dashboard.jsx     ← panel general con estadísticas
    Inventario.jsx    ← CRUD completo de ítems
    Buscar.jsx        ← búsqueda full-text
    Estructura.jsx    ← gestión de dept/taller/cat/subcat
    Usuarios.jsx      ← gestión de usuarios y roles
```
