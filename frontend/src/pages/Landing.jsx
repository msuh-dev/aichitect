import { Link } from 'react-router-dom'
import { SignInButton, SignedIn, SignedOut } from '@clerk/clerk-react'

const steps = [
  {
    number: '01',
    title: 'Describe your system',
    body: 'Type a name or short description — "Uber", "Instagram Stories", "a real-time collaborative doc editor". The more specific, the better.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
  },
  {
    number: '02',
    title: 'Set the scale',
    body: 'Tune daily active users, read/write ratio, geographic scope, and requirements — or click "Suggest for me" to auto-fill based on your description.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
      </svg>
    ),
  },
  {
    number: '03',
    title: 'Get your design',
    body: 'Receive a complete architecture document — component breakdown, data flow, scaling strategy, trade-offs, and a Mermaid diagram — in seconds.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
]

const features = [
  { label: 'Architecture diagram (Mermaid)', icon: '🗺' },
  { label: 'TL;DR executive summary', icon: '⚡' },
  { label: 'Component breakdown + data flow', icon: '🧩' },
  { label: 'Scaling strategy + trade-offs', icon: '⚖️' },
  { label: 'PDF export', icon: '📄' },
  { label: 'Interview-ready language', icon: '🎯' },
]

export default function LandingPage() {
  return (
    <div className="flex flex-col">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative bg-gray-900 overflow-hidden">
        {/* Subtle grid background */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        <div className="relative max-w-4xl mx-auto px-6 py-24 text-center">
          {/* Badge */}
          <span className="inline-flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold px-3 py-1 rounded-full mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
            Free to start — 3 credits to start
          </span>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight leading-tight mb-5">
            Ace your{' '}
            <span className="text-indigo-400">system design</span>{' '}
            interview
          </h1>

          {/* Subtext */}
          <p className="text-gray-400 text-lg max-w-xl mx-auto leading-relaxed mb-10">
            Describe a system, set the scale, and get a complete architecture
            document — diagrams included — in seconds. Built for engineers
            preparing for senior-level interviews.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <SignedOut>
              <SignInButton mode="modal" afterSignInUrl="/app">
                <button className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-8 py-3 rounded-xl transition-colors text-sm">
                  Get started free
                </button>
              </SignInButton>
            </SignedOut>

            <SignedIn>
              <Link
                to="/app"
                className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-8 py-3 rounded-xl transition-colors text-sm text-center"
              >
                Go to the tool →
              </Link>
            </SignedIn>

            <Link
              to="/pricing"
              className="w-full sm:w-auto bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 font-semibold px-8 py-3 rounded-xl transition-colors text-sm text-center"
            >
              View pricing
            </Link>
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto w-full px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">How it works</h2>
          <p className="text-gray-500 mt-2 text-sm">Three steps from zero to interview-ready.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((step) => (
            <div key={step.number} className="bg-white rounded-2xl border border-gray-200 p-7 shadow-sm flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500 shrink-0">
                  {step.icon}
                </div>
                <span className="text-xs font-bold text-indigo-400 tracking-widest">{step.number}</span>
              </div>
              <div>
                <p className="font-semibold text-gray-900 mb-1.5">{step.title}</p>
                <p className="text-sm text-gray-500 leading-relaxed">{step.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── What you get ─────────────────────────────────────────────────── */}
      <section className="bg-white border-y border-gray-100">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Everything in every design</h2>
            <p className="text-gray-500 mt-2 text-sm">Each generation includes all of the following, every time.</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
            {features.map((f) => (
              <div key={f.label} className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                <span className="text-lg">{f.icon}</span>
                <span className="text-sm text-gray-700 font-medium">{f.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────────── */}
      <section className="bg-gray-900">
        <div className="max-w-2xl mx-auto px-6 py-16 text-center">
          <h2 className="text-2xl font-bold text-white tracking-tight mb-3">
            Ready to start practicing?
          </h2>
          <p className="text-gray-400 text-sm mb-8">
            Free account gets you 3 credits to start. No credit card required.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <SignedOut>
              <SignInButton mode="modal" afterSignInUrl="/app">
                <button className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-8 py-3 rounded-xl transition-colors text-sm">
                  Create free account
                </button>
              </SignInButton>
            </SignedOut>

            <SignedIn>
              <Link
                to="/app"
                className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-8 py-3 rounded-xl transition-colors text-sm text-center"
              >
                Go to the tool →
              </Link>
            </SignedIn>

            <Link
              to="/instructions"
              className="w-full sm:w-auto text-gray-400 hover:text-white text-sm font-medium transition-colors"
            >
              See how it works →
            </Link>
          </div>
        </div>
      </section>

    </div>
  )
}
