import { Children, useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import mermaid from 'mermaid'

mermaid.initialize({
  startOnLoad: false,
  theme: 'neutral',
  securityLevel: 'loose',
})

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

// Converts heading text to a stable URL-safe ID.
// Must produce identical output when called on the raw markdown string
// AND on the React children string — so keep it simple.
function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')   // strip punctuation
    .trim()
    .replace(/\s+/g, '-')           // spaces → hyphens
}

// Recursively flatten React children to a plain string (handles nested spans/strongs)
function flattenChildren(children) {
  if (typeof children === 'string') return children
  if (Array.isArray(children)) return children.map(flattenChildren).join('')
  if (children?.props?.children) return flattenChildren(children.props.children)
  return ''
}

// Extract all ## headings from the raw markdown string for the ToC
function extractH2Headings(markdown) {
  const headings = []
  for (const line of markdown.split('\n')) {
    const m = line.match(/^##\s+(.+)$/)
    if (m) {
      const text = m[1].trim()
      headings.push({ text, id: slugify(text) })
    }
  }
  return headings
}

// ---------------------------------------------------------------------------
// Mermaid diagram renderer
// ---------------------------------------------------------------------------

function MermaidDiagram({ chart }) {
  const [svg, setSvg] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    const id = `mermaid-${Date.now()}-${Math.random().toString(36).slice(2)}`
    setSvg(null)
    setError(null)
    mermaid.render(id, chart)
      .then(({ svg: rendered }) => setSvg(rendered))
      .catch((err) => {
        console.error('Mermaid render error:', err)
        setError(chart)
      })
  }, [chart])

  if (error) {
    return (
      <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm font-mono leading-relaxed my-4">
        {error}
      </pre>
    )
  }
  if (!svg) {
    return <div className="my-4 text-sm text-gray-400 italic">Rendering diagram…</div>
  }
  return (
    // max-w-full + overflow-x-auto keeps very wide diagrams from blowing the layout
    <div
      className="my-4 max-w-full overflow-x-auto flex justify-center"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}

// ---------------------------------------------------------------------------
// ReactMarkdown custom renderers
// ---------------------------------------------------------------------------

// Intercept <pre> — fenced code blocks render as <pre><code class="language-*">…
function Pre({ children }) {
  const child = Children.toArray(children)[0]
  const className = child?.props?.className || ''

  if (className.includes('language-mermaid')) {
    const code = String(child.props.children).replace(/\n$/, '')
    return <MermaidDiagram chart={code} />
  }

  return (
    <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm font-mono leading-relaxed my-4">
      {children}
    </pre>
  )
}

// Inline code (not fenced blocks — those go through Pre)
function InlineCode({ children }) {
  return (
    <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-indigo-700">
      {children}
    </code>
  )
}

// Headings with stable IDs so the ToC can scroll-target them.
// `node` is the AST prop from react-markdown — must be excluded from the spread
// to avoid React "unknown prop" warnings on DOM elements.
function makeHeading(Tag) {
  return function Heading({ children, node, ...rest }) {
    const id = slugify(flattenChildren(children))
    return (
      // scroll-mt-4 offsets the scroll position so the heading clears
      // the sticky header after the ToC navigates to it
      <Tag id={id} className="scroll-mt-4" {...rest}>
        {children}
      </Tag>
    )
  }
}

// ---------------------------------------------------------------------------
// Table of Contents
// ---------------------------------------------------------------------------
// Styled as inline text links separated by · dots — compact, familiar,
// reads like a document nav rather than a tag cloud.

function TableOfContents({ headings }) {
  if (!headings.length) return null

  function scrollTo(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="border-b border-gray-100 px-6 py-2.5 bg-gray-50/80">
      <p className="text-xs leading-relaxed">
        <span className="text-gray-400 font-medium mr-2">Jump to:</span>
        {headings.map(({ text, id }, i) => (
          <span key={id}>
            <button
              onClick={() => scrollTo(id)}
              className="text-indigo-600 hover:text-indigo-900 hover:underline underline-offset-2 transition-colors"
            >
              {text}
            </button>
            {i < headings.length - 1 && (
              <span className="text-gray-300 mx-1.5 select-none" aria-hidden>·</span>
            )}
          </span>
        ))}
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Label maps for print summary
// ---------------------------------------------------------------------------

const RW_LABELS = {
  mostly_reads:  'Mostly Reads (90/10)',
  balanced:      'Balanced (50/50)',
  mostly_writes: 'Mostly Writes (20/80)',
}
const GEO_LABELS = {
  single_region: 'Single Region',
  multi_region:  'Multi-Region',
  global:        'Global',
}
const REQ_LABELS = {
  high_availability:  'High Availability',
  low_latency:        'Low Latency',
  strong_consistency: 'Strong Consistency',
  eventual_consistency: 'Eventual Consistency',
  real_time_updates:  'Real-Time Updates',
  file_media_storage: 'File / Media Storage',
  search:             'Search',
  geolocation:        'Geolocation',
}

// Strip characters Windows (and most OSes) reject in filenames.
function sanitizeFilename(name) {
  return name
    .replace(/[\\/:*?"<>|]/g, '-')   // Windows-illegal chars
    .replace(/[—–]/g, '-')            // em/en dashes
    .replace(/\s+/g, ' ')             // collapse whitespace
    .trim()
    .slice(0, 120)                     // keep within reasonable path limits
}

// Extract the design title from the generated markdown.
// The output always starts with "# System Design: {title}" per the system prompt.
function extractDesignTitle(markdown) {
  const match = markdown.match(/^#\s+System Design:\s*(.+)$/m)
  return match ? match[1].trim() : null
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export default function DesignOutput({ content, modelUsed, formSummary }) {
  const [copied, setCopied] = useState(false)

  if (!content) return null

  const headings = extractH2Headings(content)

  function handleCopy() {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function handlePrint() {
    const originalTitle = document.title
    // Use the AI-generated title (e.g. "Global Wikipedia Archive (GWA)") rather than
    // the raw user input, which is often too long or descriptive for a filename.
    const designTitle = extractDesignTitle(content)
    if (designTitle) {
      document.title = sanitizeFilename(`AIchitect - ${designTitle}`)
    }
    window.print()
    // Restore after a short delay — the print dialog is asynchronous
    setTimeout(() => { document.title = originalTitle }, 1000)
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden prose-print-wrapper">

      {/* Toolbar — hidden on print; only the prose content below prints */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100 bg-gray-50 print:hidden">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-600">System Design</span>
          {modelUsed && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">
              {modelUsed}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-indigo-600 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
          title="Opens the browser print dialog — choose 'Save as PDF' to export"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Print / Save as PDF
        </button>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-indigo-600 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
        >
          {copied ? (
            <>
              <svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
              Copy as Markdown
            </>
          )}
        </button>
        </div>
      </div>

      {/* Table of Contents — hidden on print */}
      <div className="print:hidden">
        <TableOfContents headings={headings} />
      </div>

      {/* Print-only: Design Request summary — shows form inputs at top of PDF */}
      {formSummary && (
        <div className="hidden print:block px-6 pt-6 pb-4 mb-2 border-b border-gray-300">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Design Request</p>
          <div className="text-sm text-gray-700 space-y-1">
            <p>
              <span className="font-semibold text-gray-900">System: </span>
              {formSummary.system_name}
            </p>
            <p>
              <span className="font-semibold text-gray-900">DAU: </span>{formSummary.daily_active_users}
              <span className="mx-2 text-gray-300">·</span>
              <span className="font-semibold text-gray-900">Read/Write: </span>{RW_LABELS[formSummary.read_write_ratio] || formSummary.read_write_ratio}
              <span className="mx-2 text-gray-300">·</span>
              <span className="font-semibold text-gray-900">Scope: </span>{GEO_LABELS[formSummary.geographic_scope] || formSummary.geographic_scope}
            </p>
            {formSummary.requirements?.length > 0 && (
              <p>
                <span className="font-semibold text-gray-900">Requirements: </span>
                {formSummary.requirements.map(r => REQ_LABELS[r] || r).join(', ')}
              </p>
            )}
            {formSummary.additional_context && (
              <p>
                <span className="font-semibold text-gray-900">Notes: </span>
                {formSummary.additional_context}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Rendered markdown — overflow-x-hidden clips anything wider than the panel */}
      <div className="px-6 py-6 prose prose-slate max-w-none overflow-x-hidden
        prose-headings:font-semibold
        prose-h1:text-2xl prose-h1:text-gray-900 prose-h1:mb-4
        prose-h2:text-lg prose-h2:text-gray-800 prose-h2:mt-8 prose-h2:mb-3
        prose-h3:text-base prose-h3:text-gray-700
        prose-p:text-gray-700 prose-p:leading-relaxed
        prose-strong:text-gray-900
        prose-table:text-sm prose-th:bg-gray-50 prose-th:font-semibold
        prose-li:text-gray-700
        prose-hr:border-gray-200
        prose-code:before:content-none prose-code:after:content-none
      ">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            pre: Pre,
            code: InlineCode,
            h1: makeHeading('h1'),
            h2: makeHeading('h2'),
            h3: makeHeading('h3'),
          }}
        >
          {content}
        </ReactMarkdown>
      </div>

      {/* Print-only attribution footer — appears at bottom of every exported PDF */}
      <div className="hidden print:block px-6 pb-6 pt-2 text-center border-t border-gray-200 mt-2">
        <p className="text-xs text-gray-400">
          Generated by <span className="font-semibold text-gray-500">AIchitect</span>
          {' · '}Built by{' '}
          <span className="font-semibold text-gray-500">Michael Suh</span>
          {' · '}michaelsuh.vercel.app
        </p>
      </div>
    </div>
  )
}
