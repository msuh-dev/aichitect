import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/clerk-react'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

/**
 * Fetches and displays the signed-in user's active plan + remaining credits.
 * Renders nothing while loading or if the fetch fails (graceful degradation).
 * Phase 4 will wire the backend to return real Supabase data.
 */
export default function CreditsBadge() {
  const { getToken } = useAuth()
  const [credits, setCredits] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function fetchCredits() {
      try {
        const token = await getToken()
        if (!token) return

        const res = await fetch(`${API_BASE}/api/credits`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) return

        const data = await res.json()
        if (!cancelled) setCredits(data)
      } catch {
        // Silently swallow — endpoint may not be available in all environments
      }
    }

    fetchCredits()
    return () => { cancelled = true }
  }, [getToken])

  if (!credits) return null

  const { plan, credits_remaining, credits_total } = credits
  const isLow   = credits_remaining <= 1
  const isPaid  = plan !== 'Free' && plan !== 'Guest'

  // Colour scheme: amber when almost out, indigo for paid plans, subtle gray for free
  const containerStyle = isLow
    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
    : isPaid
    ? 'bg-indigo-500/20 text-indigo-200 border border-indigo-500/30'
    : 'bg-white/10 text-gray-300 border border-white/10'

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${containerStyle}`}>
      {/* Plan name */}
      <span className="font-semibold">{plan}</span>

      {/* Divider */}
      <span className="opacity-40">·</span>

      {/* Credit count */}
      <span>
        {credits_remaining}
        <span className="opacity-50 font-normal"> / {credits_total} credits</span>
      </span>

      {/* Low-credit warning dot */}
      {isLow && (
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
      )}
    </div>
  )
}
