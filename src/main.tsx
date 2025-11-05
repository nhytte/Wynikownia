import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import AuthProvider from './auth/AuthProvider'
import { BrowserRouter } from 'react-router-dom'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter basename={(import.meta as any).env.DEV ? '/' : (() => { const seg = (window.location.pathname.split('/')[1] || '').trim(); return seg ? `/${seg}/` : '/'; })()}>
        <App />
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>,
)
