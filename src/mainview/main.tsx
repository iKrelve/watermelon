import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AppProvider } from './context/AppContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ThemeProvider } from './components/ThemeProvider'
import { Toaster } from './components/ui/sonner'
import App from './App'
// Initialize Electrobun RPC before anything else
import './rpc'
import './i18n'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <AppProvider>
          <App />
          <Toaster position="bottom-right" richColors closeButton />
        </AppProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>
)