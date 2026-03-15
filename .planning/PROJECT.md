# Gym Tracker — Monorepo: Código Compartido Web / React Native

## What This Is

Restructuración del repositorio Gym Tracker en monorepo con npm workspaces para compartir código entre la app web (React + Vite) y la app móvil (React Native + Expo). Elimina la duplicación de ~16 utils, 7 archivos API, ~14 hooks y 2 stores que actualmente se mantienen por separado.

## Core Value

Un solo lugar para cada pieza de lógica de negocio — un cambio en un archivo se refleja en ambas plataformas sin intervención manual.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

(None yet — ship to validate)

### Active

- [ ] Monorepo con npm workspaces que contenga web, RN y paquete compartido
- [ ] Utils (~16 archivos) en paquete compartido, importados por ambas apps
- [ ] Capa API (7 archivos) en paquete compartido
- [ ] Hooks compartidos con abstracciones para diferencias de plataforma (navegación, notificaciones)
- [ ] Stores Zustand compartidos con storage adapter inyectable por plataforma
- [ ] Vite (web) resuelve imports del paquete compartido sin problemas
- [ ] Metro/Expo (RN) resuelve imports del paquete compartido sin problemas
- [ ] Tests existentes siguen pasando tras la migración
- [ ] Scripts de dev (`npm run dev`, `expo start`) funcionan desde la raíz del monorepo
- [ ] CI/build no se rompe

### Out of Scope

- Migrar a TypeScript — el proyecto es JavaScript y se mantiene así
- Crear un design system compartido (componentes UI) — web usa Tailwind, RN usa NativeWind, divergen demasiado
- Publicar el paquete compartido en npm — es interno al monorepo
- Cambiar de Expo managed workflow a bare

## Context

- **Estado actual**: `gym-native/` vive dentro del repo web como subdirectorio independiente con su propio `package.json`. No hay workspaces configurados.
- **Divergencias conocidas**: `constants.js`, `styles.js` difieren entre plataformas (web tiene tokens Tailwind, RN tiene valores nativos). `authStore.js` difiere por Google OAuth en RN. `workoutStore.js` difiere por `AsyncStorage` adapter.
- **Capa API**: Existe en web (`src/lib/api/`, 7 archivos) pero NO en RN — RN todavía tiene queries Supabase inline en hooks.
- **Hooks**: Divergen por navegación (`useNavigate` vs `navigation.navigate`), notificaciones (sin implementar en web vs Toast en RN), y `useDrag.js` / `useStableHandlers.js` son exclusivos de cada plataforma.
- **Tests**: Solo en web (vitest). ~18 archivos `.test.js` en `src/lib/`.
- **Bundlers**: Vite (web, ESM) y Metro (RN, Expo 55).

## Constraints

- **Tech stack**: JavaScript only, no TypeScript
- **Bundler compatibility**: El paquete compartido debe funcionar con Vite (ESM) y Metro (CommonJS-compatible) simultáneamente
- **Expo managed**: No se puede ejectar de Expo managed workflow
- **Zero downtime**: Ambas apps deben seguir funcionando durante la migración (cambios incrementales, no big bang)
- **Archivos platform-specific**: `styles.js` (tokens difieren), `supabase.js` (env vars difieren), partes de auth (Google OAuth solo en RN) no pueden compartirse directamente

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| npm workspaces como herramienta de monorepo | Zero config, ya integrado en npm, suficiente para este caso | — Pending |
| Paquete compartido sin publicar (internal) | No hay necesidad de versionado npm, simplifica el setup | — Pending |
| Platform adapters inyectables para stores/hooks | Permite compartir lógica core mientras cada plataforma inyecta sus specifics (storage, navigation, notifications) | — Pending |
| Migración incremental (utils → API → stores → hooks) | Reduce riesgo, permite validar cada paso antes de avanzar | — Pending |

---
*Last updated: 2026-03-15 after initialization*
