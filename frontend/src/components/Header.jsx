import { Link } from 'react-router-dom'
import { SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/clerk-react'
import CreditsBadge from './CreditsBadge'

/**
 * Global site header — shared across all pages.
 * The "Powered by" model badge lives in the left panel of the design tool,
 * not here, so this component needs no props.
 */
export default function Header() {
  return (
    <header className="bg-gray-900 shadow-lg print:hidden">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">

        {/* ── Logo / wordmark ── */}
        <Link to="/" className="flex items-center gap-3 shrink-0">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-500">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2" />
            </svg>
          </div>
          <div>
            <p className="text-lg font-bold text-white tracking-tight leading-none">AIchitect</p>
            <p className="text-xs text-gray-400 leading-none mt-0.5">AI-powered system design advisor</p>
          </div>
        </Link>

        {/* ── Right side ── */}
        <div className="flex items-center gap-3 flex-wrap justify-end">

          {/* Plan + credits badge — only shown when signed in */}
          <SignedIn>
            <CreditsBadge />
          </SignedIn>

          {/* Nav links */}
          <nav className="flex items-center gap-0.5">
            <Link
              to="/instructions"
              className="text-sm text-gray-400 hover:text-white px-3 py-1.5 rounded-md hover:bg-gray-800 transition-colors"
            >
              Instructions
            </Link>
            <Link
              to="/pricing"
              className="text-sm text-gray-400 hover:text-white px-3 py-1.5 rounded-md hover:bg-gray-800 transition-colors"
            >
              Pricing
            </Link>
            <Link
              to="/app"
              className="text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 rounded-md transition-colors ml-1"
            >
              App
            </Link>
          </nav>

          {/* Auth */}
          <SignedOut>
            <SignInButton mode="modal" afterSignInUrl="/app">
              <button className="text-sm font-medium text-white border border-white/20 hover:bg-white/10 px-4 py-1.5 rounded-lg transition-colors">
                Sign in
              </button>
            </SignInButton>
          </SignedOut>

          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>

        </div>
      </div>
    </header>
  )
}
