# External Integrations

**Analysis Date:** 2026-03-15

## APIs & External Services

**Supabase (Primary Backend):**
- Service: PostgreSQL database + Authentication + Real-time + Edge Functions
- Client: `@supabase/supabase-js` 2.49.1
- Location: `src/lib/supabase.js`
- URL: `VITE_SUPABASE_URL` environment variable
- Auth: Anonymous key (`VITE_SUPABASE_ANON_KEY`)
- Usage:
  - Database operations (PostgreSQL queries via PostgREST API)
  - User authentication (email/password, OAuth with Google)
  - Real-time subscriptions
  - Edge Functions invocation (video upload/URL generation)
  - Session management

**Google OAuth:**
- Provider: Google
- Implemented via Supabase Auth
- Integration: `src/stores/authStore.js` → `loginWithGoogle()`
- Callback: Window origin redirect
- Account prompt: "select_account" for multi-account selection

**OpenAI API (Configured, Unused):**
- Service: GPT models for AI features (chatbot/routine generation)
- Configured: `VITE_OPENAI_API_KEY` environment variable
- Status: Currently unused in codebase
- Future: Planned for routine generation with AI

## Data Storage

**Primary Database:**
- Type: PostgreSQL
- Provider: Supabase Cloud
- Connection: Via Supabase client (JavaScript SDK)
- Client Library: `@supabase/supabase-js`

**Key Tables:**
- `exercises` - Exercise definitions with muscle groups
- `routine_exercises` - Exercise configurations in routines
- `routine_blocks` - Block groupings in routines
- `routine_days` - Days in a routine
- `routines` - User routines
- `workout_sessions` - Active and completed workout sessions
- `completed_sets` - Actual performed sets with weight/reps
- `user_settings` - User preferences and permissions
- `muscle_groups` - Muscle group definitions

**File Storage (Videos):**
- Service: MinIO (S3-compatible object storage)
- Endpoint: `VITE_MINIO_ENDPOINT` (https://videos.diariogym.com)
- Access Credentials:
  - `VITE_MINIO_ACCESS_KEY`
  - `VITE_MINIO_SECRET_KEY`
- Bucket: `exercise-videos`
- Upload Mechanism: Presigned URLs via Supabase Edge Function
- Max File Size: 100MB per file
- Allowed Types: video/mp4, video/webm, video/quicktime, video/x-msvideo

## Authentication & Identity

**Provider:** Supabase Auth

**Implementations:**
- Email/Password authentication - Primary method
  - Sign up: `signup(email, password)` in `src/stores/authStore.js`
  - Login: `login(email, password)` in `src/stores/authStore.js`
  - Password reset: `resetPassword(email)` with magic link

- OAuth - Google
  - Login: `loginWithGoogle()` via Supabase provider
  - Redirect: Window origin (current URL)

**Session Management:**
- Storage: Browser localStorage (Supabase-managed)
- Session Token: JWT stored in localStorage with key pattern `sb-[project]-auth-token`
- State Listener: Real-time auth state change events
- Recovery: Password recovery via email magic links (type=recovery in hash)

**User Entity:**
- ID: `user.id` from Supabase Auth
- Email: From Supabase Auth
- Settings: Custom `user_settings` table keyed by `user_id`

**Permissions/Roles:**
- `is_admin` - Admin flag in user_settings
- `can_upload_video` - Video upload permission in user_settings (checked in Edge Functions)

## Monitoring & Observability

**Error Tracking:**
- Not detected - No dedicated error tracking service (Sentry, Rollbar, etc.)
- Errors logged to browser console (with `no-console` ESLint warning)

**Logs:**
- Development: Browser DevTools console + Eruda mobile console
- Edge Functions: Deno console (server-side logging only)
- No centralized logging system detected

**Client-Side Debugging:**
- Eruda 3.4.3 - Mobile console overlay for development (`src/main.jsx`)

## CI/CD & Deployment

**Hosting:**
- Not specified in codebase
- Static SPA deployment (GitHub Pages, Vercel, Netlify recommended)

**CI Pipeline:**
- GitHub Actions (`.github/` directory exists)
- Playwright runs E2E tests on CI with different settings than local

**Test Automation:**
- Playwright E2E tests: `npm run test:e2e`
- Unit tests: `npm run test`
- Lint: `npm run lint`
- Full check: `npm run check` (lint + test + e2e)

**Build Commands:**
- Dev: `npm run dev` (Vite dev server on :5174)
- Production: `npm run build` (vite build)
- Preview: `npm run preview`

## Environment Configuration

**Development Environment (.env.local):**
- Supabase URL and key (local or cloud instance)
- MinIO credentials
- E2E test user credentials
- Optional: OpenAI API key

**Production Environment (.env.pro):**
- Separate credentials for production Supabase instance
- Separate MinIO credentials
- No test user credentials

**Variable Loading:**
- Vite loads variables prefixed `VITE_` at build time
- Runtime: Accessed via `import.meta.env.VITE_*`
- Testing: Playwright loads from `.env.local` via dotenv
- Edge Functions: Deno environment variables via `Deno.env.get()`

## Supabase Edge Functions

**Video Upload Function:**
- Location: `supabase/functions/video-upload/index.ts`
- Method: POST
- Authentication: Bearer token from Authorization header
- Inputs: `{ filename, contentType }`
- Output: `{ uploadUrl, key }`
- Flow:
  1. Verify user is authenticated
  2. Check user has `can_upload_video` permission
  3. Generate unique key: `{user_id}/{timestamp}-{sanitized_filename}`
  4. Create presigned PUT URL valid for 10 minutes
  5. Return uploadUrl for direct browser upload
- Bucket: `exercise-videos` (MinIO)

**Video URL Function:**
- Location: `supabase/functions/video-url/index.ts`
- Method: POST
- Authentication: Bearer token from Authorization header
- Inputs: `{ key }`
- Output: `{ url }` (presigned GET URL)
- URL Valid: 1 hour
- Flow:
  1. Verify user is authenticated
  2. Generate presigned GET URL for the video key
  3. Return signed URL

**Client Integration:**
- Invoked via: `supabase.functions.invoke('video-upload'|'video-url')`
- Implementation: `src/lib/videoStorage.js`
- Upload Progress: XMLHttpRequest with progress events
- Error Handling: Network errors, validation errors, permission checks

## Webhooks & Callbacks

**Incoming:**
- Supabase Auth Callbacks:
  - Confirmation email redirect: `/` (default origin)
  - Password reset redirect: `/reset-password`
- OAuth Redirect: Window origin for Google login callback

**Outgoing:**
- None detected

## Real-Time Features

**Supabase Real-Time Subscriptions:**
- Auth state changes: `supabase.auth.onAuthStateChange()`
- Database subscriptions: Not found in current codebase
- Potential: Could be added via `supabase.from(table).on()` pattern

## Data Format & Serialization

**JSON:**
- All API communication via JSON (Supabase PostgREST, Edge Functions)
- Request/Response bodies are JSON encoded

**Routine Import/Export:**
- Format: JSON export of routine structure
- Handled in: `src/lib/routineIO.js` (critical file for data format schema)
- Not dependent on external service (client-side only)

---

*Integration audit: 2026-03-15*
