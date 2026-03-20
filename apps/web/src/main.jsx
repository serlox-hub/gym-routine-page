import React from 'react'
import ReactDOM from 'react-dom/client'
import * as Sentry from '@sentry/react'
import { QueryClientProvider } from '@tanstack/react-query'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { supabase } from './lib/supabase.js'
import { queryClient, initApi, initStores, initNotifications } from '@gym/shared'
import { getShowToast } from './components/ui/Toast.jsx'
import useAuthStore from './stores/authStore'
import useWorkoutStore from './stores/workoutStore'
import './index.css'

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    enabled: import.meta.env.PROD,
  })
}

initApi(supabase)
initStores({ authStore: useAuthStore, workoutStore: useWorkoutStore })
initNotifications((message, type = 'success') => {
  getShowToast()?.(message, type)
})

// Consola de desarrollo para móvil
if (import.meta.env.DEV) {
  import('eruda').then(eruda => eruda.default.init())
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </QueryClientProvider>
  </React.StrictMode>,
)
