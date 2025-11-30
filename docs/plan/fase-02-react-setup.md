# Fase 2: Setup React + Conexión Supabase

## Objetivos
1. Crear proyecto con Vite + React (JavaScript)
2. Configurar Tailwind CSS con variables del dark mode actual
3. Configurar Supabase client y React Query
4. Configurar React Router (/, /workout, /history, /progress)

---

## Crear Proyecto

```bash
npm create vite@latest gym-tracker -- --template react
cd gym-tracker
npm install
```

---

## Dependencias

```bash
# Core
npm install react-router-dom @tanstack/react-query zustand

# Supabase
npm install @supabase/supabase-js

# UI
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# Extras
npm install date-fns recharts use-sound
```

---

## Configuración Tailwind

### tailwind.config.js
```javascript
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Migrar variables del CSS actual
        bg: {
          primary: '#0d1117',
          secondary: '#161b22',
          tertiary: '#21262d',
        },
        text: {
          primary: '#e6edf3',
          secondary: '#8b949e',
          muted: '#6e7681',
        },
        accent: {
          DEFAULT: '#58a6ff',
          green: '#3fb950',
          purple: '#a371f7',
          orange: '#d29922',
          red: '#f85149',
        },
        border: '#30363d',
      },
    },
  },
  plugins: [],
}
```

### src/index.css
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  @apply bg-bg-primary text-text-primary;
}
```

---

## Configuración Supabase

### src/lib/supabase/client.js
```javascript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### .env.local
```
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

---

## Configuración React Query

### src/app/providers.jsx
```javascript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutos
      retry: 1,
    },
  },
})

export function Providers({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
```

---

## Configuración Router

### src/app/router.jsx
```javascript
import { createBrowserRouter } from 'react-router-dom'
import { PageLayout } from '../components/layout/PageLayout'
import { HomePage } from '../features/routines/pages/HomePage'
import { WorkoutPage } from '../features/workout-session/pages/WorkoutPage'
import { HistoryPage } from '../features/history/pages/HistoryPage'
import { ProgressPage } from '../features/progress/pages/ProgressPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <PageLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'workout/:dayId', element: <WorkoutPage /> },
      { path: 'history', element: <HistoryPage /> },
      { path: 'progress', element: <ProgressPage /> },
    ],
  },
])
```

---

## Estructura Inicial de Archivos

```
src/
├── app/
│   ├── App.jsx
│   ├── router.jsx
│   └── providers.jsx
├── components/
│   ├── ui/
│   │   └── .gitkeep
│   └── layout/
│       ├── PageLayout.jsx
│       ├── Header.jsx
│       └── BottomNav.jsx
├── features/
│   ├── routines/
│   │   └── pages/HomePage.jsx
│   ├── workout-session/
│   │   └── pages/WorkoutPage.jsx
│   ├── history/
│   │   └── pages/HistoryPage.jsx
│   └── progress/
│       └── pages/ProgressPage.jsx
├── lib/
│   └── supabase/
│       └── client.js
└── index.css
```

---

## Tareas

- [ ] Crear proyecto Vite + React
- [ ] Instalar dependencias
- [ ] Configurar Tailwind con colores del dark mode
- [ ] Configurar cliente Supabase
- [ ] Configurar React Query provider
- [ ] Configurar React Router con rutas base
- [ ] Crear layout básico (Header + BottomNav)
- [ ] Crear páginas placeholder
