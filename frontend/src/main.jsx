import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  console.warn('VITE_CLERK_PUBLISHABLE_KEY is not set — auth features will be disabled.')
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY || ''}
      afterSignInUrl="/app"
      afterSignUpUrl="/app"
    >
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ClerkProvider>
  </StrictMode>,
)
