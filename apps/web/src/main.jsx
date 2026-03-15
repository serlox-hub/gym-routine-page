import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/queryClient'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { supabase } from './lib/supabase.js'
import { initApi } from '@gym/shared'
import './index.css'

initApi(supabase)

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
