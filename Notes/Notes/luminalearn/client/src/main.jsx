import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { useDocumentStore } from './store/useDocumentStore'

function BootstrappedApp() {
  const hydrateFileUrls = useDocumentStore((s) => s.hydrateFileUrls)

  useEffect(() => {
    hydrateFileUrls()
  }, [hydrateFileUrls])

  return <App />
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BootstrappedApp />
  </StrictMode>,
)
