import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { Hub } from './components/Hub'
import { iniciarPWA } from './lib/pwa'
import { noHub, useEndereco } from './lib/rota'
import { aplicarTema } from './lib/tema'
import { detectarServidor, guardarChaveDoLink } from './lib/servidor'

aplicarTema()
guardarChaveDoLink()
void detectarServidor()
iniciarPWA()

/** "/hub..." é o hub de jogos (aberto pelos atletas pelo link); o resto é o app do mesário. */
function Raiz() {
  const endereco = useEndereco()
  return noHub(endereco.split('?')[0]) ? <Hub /> : <App />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Raiz />
  </StrictMode>,
)
