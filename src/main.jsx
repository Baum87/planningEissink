import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import './index.css'
import App from './App.jsx'

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  // Stuur geen fouten door in lokale ontwikkeling
  enabled: import.meta.env.PROD,
  integrations: [Sentry.browserTracingIntegration()],
  // Performance monitoring: 10% van sessies bijhouden
  tracesSampleRate: 0.1,
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
