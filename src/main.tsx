import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'

// Céréo ne s'affiche jamais à l'intérieur d'une autre page : un site piégé ne peut pas
// l'encadrer pour faire cliquer ou saisir à l'insu de l'utilisateur (« clickjacking »).
// GitHub Pages ne permet pas d'envoyer l'en-tête qui l'interdit : la page s'en charge.
const framed = (() => {
  try {
    return window.self !== window.top
  } catch {
    return true
  }
})()

if (framed) {
  document.getElementById('root')!.textContent =
    'Céréo ne peut pas être affiché dans une autre page. Ouvrez-le directement dans le navigateur.'
} else createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)
