# Gym Tracker - Claude Instructions

## Project Overview
Workout tracking app built with React + Vite + Supabase. Single-user mode, Spanish UI, no authentication.

## Tech Stack
- React 18 (JavaScript, NO TypeScript)
- Vite
- Supabase (PostgreSQL + JS client)
- TanStack Query (data fetching)
- Zustand (local state)
- Tailwind CSS
- React Router DOM

## Code Standards

### Language
- **Code**: English for all variables, functions, components, file names
- **UI text**: Spanish (user-facing strings)
- **Database columns**: Spanish (already defined)

### File Structure
```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Primitives (Button, Card, Input, etc.)
│   └── [Feature]/      # Feature-specific components (Routine/, Workout/, etc.)
├── hooks/              # Custom React hooks
├── lib/                # Utilities and configurations
│   ├── supabase.js     # Supabase client
│   ├── constants.js    # App-wide constants
│   └── utils.js        # Helper functions
├── pages/              # Route components
├── stores/             # Zustand stores
└── styles/             # Global styles and Tailwind extensions
```

### Naming Conventions
- Components: `PascalCase` (ExerciseCard.jsx)
- Hooks: `camelCase` with `use` prefix (useRoutines.js)
- Utilities: `camelCase` (formatTime.js)
- Constants: `SCREAMING_SNAKE_CASE`
- CSS classes: Use design tokens, not raw values

### Component Rules
1. One component per file
2. Export component as default
3. Keep components under 150 lines - split if larger
4. Props destructuring at function signature level
5. Prefer composition over prop drilling

### DRY Principles
- Extract repeated JSX into components immediately (2+ uses = component)
- Extract repeated logic into hooks or utils
- Use constants for magic numbers and repeated strings
- Define color/spacing tokens in Tailwind config

### Styling with Tailwind
Use design tokens defined in `tailwind.config.js`:
```js
// DO: Use semantic tokens
className="bg-surface text-primary"

// DON'T: Use raw color values
className="bg-zinc-800 text-zinc-100"
```

Design token categories:
- `surface`, `surface-alt`: Background colors
- `primary`, `secondary`, `muted`: Text colors
- `accent`, `success`, `warning`, `danger`: Semantic colors
- `border`: Border colors

### Data Fetching
- Use TanStack Query hooks in `src/hooks/`
- Prefix query hooks with `use` (useRoutines, useExercises)
- Define query keys as constants
- Handle loading/error states in every component that fetches

### State Management
- Server state: TanStack Query
- UI state: React useState/useReducer
- Cross-component state: Zustand stores in `src/stores/`

### No Hardcoded Values
```js
// DO:
import { REST_TIME_DEFAULT } from '@/lib/constants'
const timer = REST_TIME_DEFAULT

// DON'T:
const timer = 90
```

### Error Handling
- Always handle Supabase errors
- Show user-friendly error messages in Spanish
- Log errors to console in development

### Comments
- Only when logic isn't self-evident
- No JSDoc unless truly necessary
- No commented-out code in commits

## Database Schema Reference
Main tables:
- `routines` → `routine_days` → `routine_blocks` → `routine_exercises`
- `exercises` (with equipment, grip_type, grip_width relations)
- `workout_sessions` → `completed_sets`

## Git Commits
- Atomic commits, one feature/fix per commit
- Spanish commit messages
- No co-author or AI attribution lines

## What NOT to Do
- No TypeScript
- No over-engineering for hypothetical futures
- No inline styles (use Tailwind)
- No `any` equivalent loose patterns
- No console.log in committed code (use proper error handling)
- No hardcoded colors - use design tokens
- No magic numbers - use constants

## Development Progress

### Completed
- [x] Fase 1: Setup Supabase + Modelo de Datos
- [x] Fase 2: Setup React + Conexión Supabase
- [x] Fase 3: Visualización de Rutinas
- [x] Fase 4: Sesión de Entrenamiento
- [x] Fase 5: Timer de Descanso
- [x] Fase 6: Referencia Sesión Anterior
- [x] Fase 7: Notas por Serie (RIR + notas opcionales al completar serie)
- [x] Fase 8: Histórico (calendario mensual con grupos musculares)
- [x] Fase 9: Gráficos de Progresión (peso máx, volumen, 1RM estimado)
- [x] CRUD de Ejercicios (crear, editar, eliminar)
- [x] Reordenación y ejercicios extra en sesión

## Known Issues / TODO

### Baja prioridad (para producción)
- [ ] **Habilitar RLS en Supabase**: Actualmente deshabilitado (single-user). Necesario para modo multi-usuario.
- [ ] **Añadir tests**: No hay tests unitarios ni de integración.
- [ ] **Reducir bundle size**: 835KB minified. Considerar code-splitting con `React.lazy()`.
