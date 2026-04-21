import { Link } from 'react-router-dom'
import { SignInButton, SignedOut } from '@clerk/clerk-react'

const tiers = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    credits: '3 credits / month',
    model: 'Claude Haiku',
    modelNote: 'fast, great for practice',
    features: [
      '3 system design generations per month',
      'Diagram generation (Mermaid)',
      'TL;DR summary',
      'PDF export',
    ],
    cta: 'Get started free',
    ctaStyle: 'border border-gray-300 text-gray-700 hover:bg-gray-50',
    highlight: false,
    comingSoon: false,
  },
  {
    name: 'Starter Pack',
    price: '$7',
    period: 'one-time',
    credits: '10 credits',
    model: 'Claude Sonnet',
    modelNote: 'higher quality output',
    features: [
      '10 system design generations',
      'Diagram generation (Mermaid)',
      'TL;DR summary',
      'PDF export',
      'Credits never expire',
    ],
    cta: 'Buy Starter Pack',
    ctaStyle: 'bg-indigo-600 hover:bg-indigo-500 text-white',
    highlight: false,
    comingSoon: true,
  },
  {
    name: 'Prep Pack',
    price: '$15',
    period: 'one-time',
    credits: '30 credits',
    model: 'Claude Sonnet',
    modelNote: 'higher quality output',
    features: [
      '30 system design generations',
      'Diagram generation (Mermaid)',
      'TL;DR summary',
      'PDF export',
      'Credits never expire',
      'Best value per credit',
    ],
    cta: 'Buy Prep Pack',
    ctaStyle: 'bg-indigo-600 hover:bg-indigo-500 text-white',
    highlight: true,
    badge: 'Most popular',
    comingSoon: true,
  },
  {
    name: 'Studio',
    price: '$20',
    period: 'per month',
    credits: '100 credits / month',
    model: 'Claude Sonnet',
    modelNote: 'higher quality output',
    features: [
      '100 system design generations per month',
      'Diagram generation (Mermaid)',
      'TL;DR summary',
      'PDF export',
      'Credits refresh monthly',
    ],
    cta: 'Subscribe to Studio',
    ctaStyle: 'bg-indigo-600 hover:bg-indigo-500 text-white',
    highlight: false,
    comingSoon: true,
  },
  {
    name: 'Expert',
    price: '$30',
    period: 'one-time',
    credits: '10 credits',
    model: 'Claude Opus',
    modelNote: 'maximum depth + reasoning',
    features: [
      '10 system design generations',
      'Powered by Claude Opus — deepest analysis',
      'Senior-level trade-off reasoning',
      'Diagram generation (Mermaid)',
      'TL;DR summary',
      'PDF export',
      'Credits never expire',
    ],
    cta: 'Buy Expert Pack',
    ctaStyle: 'bg-violet-600 hover:bg-violet-500 text-white',
    highlight: false,
    badge: 'Coming soon',
    badgeStyle: 'bg-violet-600',
    comingSoon: true,
  },
]

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-12">

        {/* Heading */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Simple, transparent pricing</h2>
          <p className="text-gray-500 mt-3 text-base max-w-xl mx-auto">
            Buy credits when you need them. Starter, Prep Pack, and Expert credits never expire.
          </p>
        </div>

        {/* Pricing grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative rounded-2xl bg-white border p-6 flex flex-col gap-5 shadow-sm ${
                tier.highlight
                  ? 'border-indigo-400 ring-2 ring-indigo-400'
                  : tier.name === 'Expert'
                  ? 'border-violet-200'
                  : 'border-gray-200'
              }`}
            >
              {tier.badge && (
                <span className={`absolute -top-3 left-1/2 -translate-x-1/2 text-white text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap ${tier.badgeStyle || 'bg-indigo-600'}`}>
                  {tier.badge}
                </span>
              )}

              {/* Name + price */}
              <div>
                <p className={`text-sm font-semibold uppercase tracking-wide ${tier.name === 'Expert' ? 'text-violet-500' : 'text-gray-500'}`}>
                  {tier.name}
                </p>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-3xl font-bold text-gray-900">{tier.price}</span>
                  <span className="text-xs font-semibold text-gray-400 tracking-widest uppercase">USD</span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{tier.period}</p>
                <p className={`text-sm font-medium mt-1 ${tier.name === 'Expert' ? 'text-violet-600' : 'text-indigo-600'}`}>
                  {tier.credits}
                </p>
              </div>

              {/* Model */}
              <div className={`text-xs rounded-lg px-3 py-2 ${tier.name === 'Expert' ? 'bg-violet-50 text-violet-700' : 'bg-gray-50 text-gray-500'}`}>
                <span className="font-semibold">{tier.model}</span>
                <span className="ml-1">— {tier.modelNote}</span>
              </div>

              {/* Features */}
              <ul className="flex-1 space-y-2">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                    <svg className={`w-4 h-4 shrink-0 mt-0.5 ${tier.name === 'Expert' ? 'text-violet-500' : 'text-green-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              {tier.name === 'Free' ? (
                <SignedOut>
                  <SignInButton mode="modal">
                    <button className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors ${tier.ctaStyle}`}>
                      {tier.cta}
                    </button>
                  </SignInButton>
                </SignedOut>
              ) : (
                <button
                  disabled
                  className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors opacity-60 cursor-not-allowed ${tier.ctaStyle}`}
                  title="Payment coming soon"
                >
                  {tier.cta}
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-gray-400 mt-10">
          Payments powered by{' '}
          <a href="https://polar.sh" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600">
            Polar
          </a>
          . Tax handled automatically.
        </p>

        <div className="text-center mt-6">
          <Link to="/" className="text-sm text-indigo-600 hover:underline">
            ← Back to AIchitect
          </Link>
        </div>
      </main>
    </div>
  )
}
