import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { iniciarPWA } from './lib/pwa'
import { aplicarTema } from './lib/tema'
import { detectarServidor, guardarChaveDoLink } from './lib/servidor'

aplicarTema()
guardarChaveDoLink()
void detectarServidor()
iniciarPWA()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
