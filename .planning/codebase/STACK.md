# Technology Stack

**Analysis Date:** 2026-03-15

## Languages

**Primary:**
- JavaScript (ES2022) - All application code, components, utilities
- JSX - React components

**Backend:**
- TypeScript - Supabase Edge Functions (Deno runtime)

## Runtime

**Environment:**
- Node.js - Development and build
- Deno - Supabase Edge Functions (serverless computing)
- Browser (React SPA)

**Package Manager:**
- npm - Lockfile version 3 (`package-lock.json`)

## Frameworks

**Core:**
- React 18.3.1 - UI library and component framework
- Vite 6.0.3 - Build tool and development server
- React Router DOM 7.0.2 - Client-side routing

**Data & State:**
- TanStack React Query (TanStack/react-query 5.62.0) - Server state, data fetching, caching
- Zustand 5.0.2 - Client-side state management (auth, workout sessions)

**Styling:**
- Tailwind CSS 3.4.16 - Utility-first CSS framework
- PostCSS 8.4.49 - CSS processing
- Autoprefixer 10.4.20 - CSS vendor prefixes

**UI & Visualization:**
- Lucide React 0.555.0 - Icon library
- Recharts 3.5.1 - Charts and data visualization (analytics)
- Framer Motion 12.35.1 - Animation library

## Key Dependencies

**Critical:**
- @supabase/supabase-js 2.49.1 - Supabase client (authentication, database, real-time)
- supabase 2.63.1 - CLI for managing Supabase project

**Infrastructure:**
- @vitejs/plugin-react 4.3.4 - Vite React support
- dotenv 17.2.3 - Environment variable loading
- eruda 3.4.3 - Mobile console for development debugging

## Development & Testing

**Testing:**
- Vitest 4.0.15 - Unit/integration test runner
- @testing-library/react 16.3.0 - React component testing utilities
- @testing-library/jest-dom 6.9.1 - Custom Jest matchers
- jsdom 27.2.0 - DOM implementation for tests
- @playwright/test 1.57.0 - E2E testing framework

**Code Quality:**
- ESLint 9.39.1 - JavaScript linting
- @eslint/js 9.39.1 - ESLint core rules
- eslint-plugin-react 7.37.5 - React-specific ESLint rules
- eslint-plugin-react-hooks 7.0.1 - React hooks rules
- globals 16.5.0 - ESLint globals definitions

**Utilities:**
- baseline-browser-mapping 2.10.8 - Browser compatibility mapping

## Configuration

**Environment:**
- Configuration via environment variables prefixed `VITE_` (Vite client-side)
- `.env.local` - Development environment variables
- `.env.pro` - Production environment variables

**Key Environment Variables Required:**
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous/public key
- `VITE_OPENAI_API_KEY` - OpenAI API integration (optional, currently unused)
- `VITE_MINIO_ENDPOINT` - MinIO/S3 storage endpoint
- `VITE_MINIO_ACCESS_KEY` - MinIO S3 access credentials
- `VITE_MINIO_SECRET_KEY` - MinIO S3 secret credentials
- `E2E_TEST_EMAIL` - Test user email for E2E tests
- `E2E_TEST_PASSWORD` - Test user password for E2E tests

**Build Configuration:**
- `vite.config.js` - Vite bundler configuration with code splitting (vendor, query, supabase chunks)
- `tailwind.config.js` - Tailwind theme and color extensions
- `postcss.config.js` - PostCSS plugins (Tailwind, Autoprefixer)
- `eslint.config.js` - ESLint configuration (flat config format)
- `playwright.config.js` - E2E test configuration

## Platform Requirements

**Development:**
- Node.js (no specific version enforced, no .nvmrc file)
- npm 10+ (lockfile v3 format)
- Modern browser with ES2022 support
- Port 5174 for Vite dev server (default in playwright.config.js)

**Production:**
- Any modern browser (SPA deployment to static hosting)
- Supabase cloud infrastructure
- MinIO/S3-compatible object storage for video uploads
- CDN support for asset delivery

## Build & Deployment

**Build Output:**
- Distribution: `dist/` directory (Vite output)
- Code splitting enabled for faster loading
- Base path: `/` (can be customized)

**Deployment Target:**
- Static hosting (GitHub Pages, Vercel, Netlify, etc.)
- No server-side rendering (pure SPA)

---

*Stack analysis: 2026-03-15*
