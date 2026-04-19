import { useState, useEffect } from 'react'

// In development: falls back to localhost.
// In production: set VITE_API_URL to your Railway backend URL in Vercel env vars.
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'
import DesignForm from './components/DesignForm'
import DesignOutput from './components/DesignOutput'

export default function App() {
  const [result, setResult] = useState(null)
  const [modelUsed, setModelUsed] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [currentModel, setCurrentModel] = useState(null)
  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [submittedForm, setSubmittedForm] = useState(null) // stored for PDF print summary

  useEffect(() => {
    fetch(`${API_BASE}/api/config`)
      .then(r => r.json())
      .then(data => setCurrentModel(data.model_label))
      .catch(() => {})
  }, [])

  async function handleSubmit(formData) {
    setSubmittedForm(formData)
    setLoading(true)
    setError(null)
    setResult(null)
    setModelUsed(null)

    try {
      const res = await fetch(`${API_BASE}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    <div className="min-h-screen bg-gray-50 flex flex-col overflow-x-hidden">

      {/* Header */}
      <header className="bg-gray-900 shadow-lg print:hidden">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-500">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">AIchitect</h1>
              <p className="text-xs text-gray-400 leading-none">AI-powered system design advisor</p>
            </div>
          </div>
          {currentModel && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500">Powered by</span>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-500 text-white">
                {currentModel}
              </span>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-6 flex gap-6 items-start">

        {/* ── Left: Form panel ────────────────────────────────────────────────
            Always stays in the DOM — never conditionally removed.
            Form state (filled fields) is preserved across collapse/expand.

            When collapsed:  outer div shrinks to w-0, overflow-hidden clips
                             the 420px-wide inner content invisibly.
            When expanded:   outer div is w-[420px], content is fully visible.

            No overflow-y-auto / max-h here — no nested scrollbar.
            The page scrolls naturally; no competing scroll containers.
        ──────────────────────────────────────────────────────────────────── */}
        <div className={`flex-shrink-0 overflow-hidden transition-[width] duration-200 ease-in-out print:hidden ${
          leftCollapsed ? 'w-0' : 'w-[420px]'
        }`}>
          {/* Fixed-width inner so the form never reflows during the animation */}
          <div className="w-[420px] pr-1">

            {/* «« Hide Form — sits above the form card, matches the mockup */}
            <button
              onClick={() => setLeftCollapsed(true)}
              className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-indigo-700 hover:underline underline-offset-2 mb-3 transition-colors"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7M19 19l-7-7 7-7" />
              </svg>
              Hide Form
            </button>

            <DesignForm onSubmit={handleSubmit} loading={loading} />
          </div>
        </div>

        {/* ── Right: Output panel ──────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">

          {/* »» Show Form — only visible when left panel is collapsed */}
          {leftCollapsed && (
            <button
              onClick={() => setLeftCollapsed(false)}
              className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-indigo-700 hover:underline underline-offset-2 mb-4 transition-colors print:hidden"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
              Show Form
            </button>
          )}

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
      </main>

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
