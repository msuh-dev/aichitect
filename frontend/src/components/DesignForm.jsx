import { useState } from 'react'

const DAU_OPTIONS = ['1K', '10K', '100K', '1M', '10M', '100M+']

const READ_WRITE_OPTIONS = [
  { label: 'Mostly Reads', value: 'mostly_reads' },
  { label: 'Balanced',     value: 'balanced' },
  { label: 'Mostly Writes', value: 'mostly_writes' },
]

const REQUIREMENTS = [
  { label: 'High Availability',    value: 'high_availability' },
  { label: 'Low Latency',          value: 'low_latency' },
  { label: 'Strong Consistency',   value: 'strong_consistency' },
  { label: 'Eventual Consistency', value: 'eventual_consistency' },
  { label: 'Real-Time Updates',    value: 'real_time_updates' },
  { label: 'File / Media Storage', value: 'file_media_storage' },
  { label: 'Search',               value: 'search' },
  { label: 'Geolocation',          value: 'geolocation' },
]

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const GEO_OPTIONS = [
  { label: 'Single Region', value: 'single_region' },
  { label: 'Multi-Region',  value: 'multi_region' },
  { label: 'Global',        value: 'global' },
]

// Returns true when two Sets contain exactly the same elements.
function setsEqual(a, b) {
  if (a.size !== b.size) return false
  for (const item of a) if (!b.has(item)) return false
  return true
}

// Small amber sparkle shown next to a field label while it still matches the AI suggestion.
function AISpark() {
  return (
    <svg
      className="inline-block w-3 h-3 text-amber-500 ml-1.5 mb-0.5"
      fill="none" stroke="currentColor" viewBox="0 0 24 24"
      aria-label="AI suggested"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  )
}

export default function DesignForm({ onSubmit, loading }) {
  const [systemName,     setSystemName]     = useState('')
  const [dau,            setDau]            = useState('100K')
  const [readWriteRatio, setReadWriteRatio] = useState('mostly_reads')
  const [geoScope,       setGeoScope]       = useState('single_region')
  const [checkedReqs,    setCheckedReqs]    = useState(new Set())
  const [suggesting,     setSuggesting]     = useState(false)
  const [suggestError,   setSuggestError]   = useState(null)
  const [paramReasoning, setParamReasoning] = useState(null)

  // Stores the exact values AI last suggested (null = no suggestion yet).
  // aiSuggested is derived live — sparkle shows when current value === AI value,
  // so it reappears automatically if the user reverts a field back to what AI picked.
  const [aiValues, setAiValues] = useState(null)

  const aiSuggested = aiValues ? {
    dau:            dau === aiValues.dau,
    readWriteRatio: readWriteRatio === aiValues.readWriteRatio,
    geoScope:       geoScope === aiValues.geoScope,
    requirements:   setsEqual(checkedReqs, aiValues.requirements),
  } : { dau: false, readWriteRatio: false, geoScope: false, requirements: false }

  function toggleReq(value) {
    setCheckedReqs(prev => {
      const next = new Set(prev)
      next.has(value) ? next.delete(value) : next.add(value)
      return next
    })
  }

  async function handleSuggest() {
    if (!systemName.trim()) return
    setSuggesting(true)
    setSuggestError(null)
    try {
      const res = await fetch(`${API_BASE}/api/suggest-requirements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system_name: systemName }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.detail || `Server error ${res.status}`)
      }
      const data = await res.json()
      if (data.success) {
        const newReqs = new Set(data.requirements || [])
        const newDau  = data.daily_active_users || dau
        const newRW   = data.read_write_ratio   || readWriteRatio
        const newGeo  = data.geographic_scope   || geoScope

        setCheckedReqs(newReqs)
        setDau(newDau)
        setReadWriteRatio(newRW)
        setGeoScope(newGeo)
        setParamReasoning(data.reasoning || null)

        // Store AI values so sparkles can be derived by comparison
        setAiValues({
          dau:            newDau,
          readWriteRatio: newRW,
          geoScope:       newGeo,
          requirements:   newReqs,
        })
      }
    } catch (err) {
      console.error('Suggest failed:', err)
      setSuggestError(err.message || 'Could not reach the backend — is it running?')
    } finally {
      setSuggesting(false)
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    const additionalContext = e.currentTarget.additional_context.value || null
    // Only attach reasoning if at least one field still matches the AI suggestion
    const anyStillAI = aiValues && Object.values(aiSuggested).some(Boolean)
    onSubmit({
      system_name:         systemName,
      daily_active_users:  dau,
      read_write_ratio:    readWriteRatio,
      geographic_scope:    geoScope,
      requirements:        Array.from(checkedReqs),
      additional_context:  additionalContext,
      parameter_reasoning: anyStillAI ? paramReasoning : null,
    })
  }

  const canSuggest = systemName.trim().length > 0 && !suggesting

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-6">

      {/* System Name */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          What are you building?
        </label>
        <textarea
          name="system_name"
          required
          rows={3}
          value={systemName}
          onChange={e => setSystemName(e.target.value)}
          placeholder="e.g. Twitter-like social feed, Ride-sharing app, WhatsApp-style 1:1 chat…"
          className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition resize-none"
        />
      </div>

      {/* Suggest for me — populates all fields below */}
      <div className="flex flex-col items-end gap-1">
        <div className="relative group/suggest">
          <button
            type="button"
            onClick={handleSuggest}
            disabled={!canSuggest}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border border-indigo-200 hover:border-indigo-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {suggesting ? (
              <>
                <svg className="animate-spin w-3 h-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Suggesting…
              </>
            ) : (
              <>
                <svg className="w-3 h-3 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                Suggest for me
              </>
            )}
          </button>
          {!canSuggest && (
            <div className="absolute bottom-full right-0 mb-2 hidden group-hover/suggest:block w-52 bg-gray-800 text-white text-xs rounded-lg px-3 py-2 text-center pointer-events-none z-10 shadow-lg">
              Fill in "What are you building?" first
              <div className="absolute top-full right-3 border-4 border-transparent border-t-gray-800" />
            </div>
          )}
        </div>
        {suggestError && (
          <p className="text-xs text-red-600">{suggestError}</p>
        )}
      </div>

      {/* Daily Active Users */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          Daily Active Users{aiSuggested.dau && <AISpark />}
        </label>
        <select
          name="daily_active_users"
          value={dau}
          onChange={e => setDau(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition bg-white"
        >
          {DAU_OPTIONS.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>

      {/* Read/Write Ratio */}
      <div>
        <span className="block text-sm font-semibold text-gray-700 mb-2">
          Read / Write Ratio{aiSuggested.readWriteRatio && <AISpark />}
        </span>
        <div className="flex flex-wrap gap-3">
          {READ_WRITE_OPTIONS.map(opt => (
            <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="read_write_ratio"
                value={opt.value}
                checked={readWriteRatio === opt.value}
                onChange={() => setReadWriteRatio(opt.value)}
                className="accent-indigo-600"
              />
              <span className="text-sm text-gray-700">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Key Requirements */}
      <div>
        <div className="mb-2">
          <span className="text-sm font-semibold text-gray-700">
            Key Requirements{aiSuggested.requirements && <AISpark />}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-y-2 gap-x-4">
          {REQUIREMENTS.map(req => (
            <label key={req.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={checkedReqs.has(req.value)}
                onChange={() => toggleReq(req.value)}
                className="accent-indigo-600 w-4 h-4"
              />
              <span className="text-sm text-gray-700">{req.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Geographic Scope */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          Geographic Scope{aiSuggested.geoScope && <AISpark />}
        </label>
        <select
          name="geographic_scope"
          value={geoScope}
          onChange={e => setGeoScope(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition bg-white"
        >
          {GEO_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Additional Context */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          Additional Context
          <span className="font-normal text-gray-400 ml-1">(optional)</span>
        </label>
        <textarea
          name="additional_context"
          rows={3}
          placeholder="Any constraints, tech stack preferences, existing infrastructure…"
          className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition resize-none"
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold text-sm py-3 transition-colors"
      >
        {loading ? (
          <>
            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Generating…
          </>
        ) : (
          'Generate Design'
        )}
      </button>
    </form>
  )
}
