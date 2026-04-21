import { useState, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'

import Header from './components/Header'
import DesignForm from './components/DesignForm'
import DesignOutput from './components/DesignOutput'
import PricingPage from './pages/Pricing'
import InstructionsPage from './pages/Instructions'

// In development: falls back to localhost.
// In production: set VITE_API_URL to your Render backend URL in Vercel env vars.
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// ─────────────────────────────────────────────────────────────────────────────
// Main app page (the design tool itself)
// ─────────────────────────────────────────────────────────────────────────────
function DesignPage({ currentModel }) {
  const { getToken } = useAuth()

  const [result, setResult]               = useState(null)
  const [modelUsed, setModelUsed]         = useState(null)
  const [loading, setLoading]             = useState(false)
  const [error, setError]                 = useState(null)
  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [submittedForm, setSubmittedForm] = useState(null)

  async function handleSubmit(formData) {
    setSubmittedForm(formData)
    setLoading(true)
    setError(null)
    setResult(null)
    setModelUsed(null)

    try {
      // Phase 4: getToken() will attach the user's JWT so the backend can
      // check + deduct credits. Token obtained here but not yet sent —
      // backend still accepts unauthenticated requests until Phase 4.
      const token = await getToken().catch(() => null)

      const res = await fetch(`${API_BASE}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Phase 4: uncomment to enforce credits
          // ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.detail || `Server error ${res.status}`)
      }

      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Generation failed')
      setResult(data.content)
      setModelUsed(data.model_used || null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-6 flex flex-col">

      {/* ── Control row ───────────────────────────────────────────────────────
          Lives OUTSIDE the collapsible area — always visible, never animated.
          Uses the same gap-6 as the panel row below so columns align exactly.
          Left zone is fixed at 420px (mirrors the form panel width).
          Right zone is an empty flex-1 spacer (mirrors the output panel).
      ──────────────────────────────────────────────────────────────────── */}
      <div className="flex gap-6 items-center mb-3 print:hidden">

        {/* Left zone — fixed 420px, matches form panel. Only the toggle button lives here. */}
        <div className="w-[420px] flex-shrink-0 pr-1">
          {leftCollapsed ? (
            <button
              onClick={() => setLeftCollapsed(false)}
              className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-indigo-700 hover:underline underline-offset-2 transition-colors"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
              Show Form
            </button>
          ) : (
            <button
              onClick={() => setLeftCollapsed(true)}
              className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-indigo-700 hover:underline underline-offset-2 transition-colors"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7M19 19l-7-7 7-7" />
              </svg>
              Hide Form
            </button>
          )}
        </div>

        {/* Right zone — model badge pinned to the right edge */}
        <div className="flex-1 min-w-0 flex justify-end">
          {currentModel && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-400">Powered by</span>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-500 text-white">
                {currentModel}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Panel row ─────────────────────────────────────────────────────── */}
      <div className="flex gap-6 items-start">

      {/* ── Left panel ───────────────────────────────────────────────────────
          Always in the DOM — collapsed via width animation, never unmounted,
          so form state (filled fields) is preserved across collapse/expand.
      ──────────────────────────────────────────────────────────────────── */}
      <div className={`flex-shrink-0 overflow-hidden transition-[width] duration-200 ease-in-out print:hidden ${
        leftCollapsed ? 'w-0' : 'w-[420px]'
      }`}>
        <div className="w-[420px] pr-1">
          <DesignForm onSubmit={handleSubmit} loading={loading} />
        </div>
      </div>

      {/* ── Right panel ──────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0">

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 flex items-start gap-3 mb-6">
            <svg className="w-5 h-5 text-red-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-red-800">Generation failed</p>
              <p className="text-sm text-red-700 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {!result && !error && !loading && (
          <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white px-8 py-16 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-gray-500 text-sm font-medium">Your system design will appear here</p>
            <p className="text-gray-400 text-xs mt-1">Fill out the form and click "Generate Design"</p>
          </div>
        )}

        {loading && (
          <div className="rounded-2xl border border-gray-200 bg-white px-8 py-16 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center mb-4">
              <svg className="animate-spin w-6 h-6 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            </div>
            <p className="text-gray-600 text-sm font-medium">Generating your system design…</p>
            <p className="text-gray-400 text-xs mt-1">This may take a few seconds</p>
          </div>
        )}

        <DesignOutput content={result} modelUsed={modelUsed} formSummary={submittedForm} />
      </div>

      </div>{/* end panel row */}
    </main>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Root component — shared shell (Header + Footer) wrapping all routes
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [currentModel, setCurrentModel] = useState(null)

  useEffect(() => {
    fetch(`${API_BASE}/api/config`)
      .then(r => r.json())
      .then(data => setCurrentModel(data.model_label))
      .catch(() => {})
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col overflow-x-hidden">
      <Header />

      <Routes>
        <Route path="/" element={<DesignPage currentModel={currentModel} />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/instructions" element={<InstructionsPage />} />
      </Routes>

      {/* Footer */}
      <footer className="text-center text-xs text-gray-400 py-4 print:hidden">
        © {new Date().getFullYear()}{' '}
        <a
          href="https://michaelsuh.vercel.app/"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-indigo-600 hover:underline underline-offset-2 transition-colors"
        >
          Michael Suh
        </a>
      </footer>
    </div>
  )
}
