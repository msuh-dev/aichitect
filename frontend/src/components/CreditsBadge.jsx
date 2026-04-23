import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@clerk/clerk-react'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

/**
 * Fetches and displays the signed-in user's active plan + remaining credits.
 *
 * Refreshes automatically when:
 *   - Component mounts (on sign-in)
 *   - A "credits-updated" custom event is dispatched (after each generation)
 *
 * Renders nothing while loading or if the fetch fails (graceful degradation).
 */
export default function CreditsBadge() {
  const { getToken } = useAuth()
  const [credits, setCredits] = useState(null)

  const fetchCredits = useCallback(async (signal) => {
    try {
      const token = await getToken()
      if (!token) return

      const res = await fetch(`${API_BASE}/api/credits`, {
        headers: { Authorization: `Bearer ${token}` },
        signal,
      })
      if (!res.ok) return

      const data = await res.json()
      setCredits(data)
    } catch (err) {
      if (err?.name === 'AbortError') return  // unmounted — ignore
      // Silently swallow other errors — badge simply won't render
    }
  }, [getToken])

  // Fetch on mount; cancel in-flight request on unmount
  useEffect(() => {
    const controller = new AbortController()
    fetchCredits(controller.signal)
    return () => controller.abort()
  }, [fetchCredits])

  // Refresh whenever a generation completes
  useEffect(() => {
    const handler = () => fetchCredits()
    window.addEventListener('credits-updated', handler)
    return () => window.removeEventListener('credits-updated', handler)
  }, [fetchCredits])

  if (!credits) return null

  const { plan, credits_remaining, credits_total } = credits
  const isLow  = credits_remaining <= 1 && plan !== 'Admin'
  const isPaid = plan !== 'Free' && plan !== 'Guest'

  const containerStyle = isLow
    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
    : isPaid
    ? 'bg-indigo-500/20 text-indigo-200 border border-indigo-500/30'
    : 'bg-white/10 text-gray-300 border border-white/10'

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${containerStyle}`}>
      <span className="font-semibold">{plan}</span>
      <span className="opacity-40">·</span>
      <span>
        {plan === 'Admin' ? '∞' : credits_remaining}
        {plan !== 'Admin' && (
          <span className="opacity-50 font-normal"> / {credits_total}</span>
        )}
      </span>
      {isLow && (
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
      )}
    </div>
  )
}
