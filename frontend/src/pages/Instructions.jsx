import { Link } from 'react-router-dom'

const steps = [
  {
    number: '01',
    title: 'Describe your system',
    body: 'Type the name or a short description of the system you want to design — for example "Uber", "Instagram Stories", or "a real-time collaborative document editor". The more specific you are, the better the output.',
  },
  {
    number: '02',
    title: 'Use "Suggest for me" to auto-fill',
    body: 'Click the Suggest for me button and AIchitect will analyse your description and automatically fill in scale requirements, read/write ratio, geographic scope, and key non-functional requirements. You can accept the suggestions as-is or adjust any field manually.',
  },
  {
    number: '03',
    title: 'Review and tune the parameters',
    body: 'Look over the pre-filled fields. Daily active users, read/write ratio, geographic scope, and requirements like high availability or low latency all directly influence the architecture choices AIchitect makes. Tuning these gives you a design that matches your actual scenario.',
  },
  {
    number: '04',
    title: 'Generate your design',
    body: 'Click Generate Design. In a few seconds you will get a complete system design document covering architecture overview, component breakdown, data flow, database choices, scaling strategy, and a Mermaid architecture diagram.',
  },
  {
    number: '05',
    title: 'Navigate and export',
    body: 'Use the Table of Contents to jump between sections. When you are happy with the output, click Export PDF to save a clean, print-ready version of your design.',
  },
]

const tips = [
  'Practice out loud as you read — narrate each section as if you were in a real interview.',
  'Re-generate with different scale parameters (e.g. 10K DAU vs 10M DAU) to see how the architecture changes.',
  'Focus on the trade-off explanations — interviewers care more about your reasoning than perfect answers.',
  'Use the "Hide Form" button to give yourself more reading space once a design is generated.',
  'Try a system you are already familiar with first, then verify the output against what you know.',
]

export default function InstructionsPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-12">

        {/* Heading */}
        <div className="mb-10">
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">How to use AIchitect</h2>
          <p className="text-gray-500 mt-2 text-base">
            AIchitect generates detailed, interview-ready system design documents from a short description and a handful of scale parameters.
            Here is how to get the most out of it.
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-6 mb-12">
          {steps.map((step) => (
            <div key={step.number} className="flex gap-5 bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="shrink-0 w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center">
                <span className="text-xs font-bold text-indigo-600">{step.number}</span>
              </div>
              <div>
                <p className="font-semibold text-gray-900 mb-1">{step.title}</p>
                <p className="text-sm text-gray-600 leading-relaxed">{step.body}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tips */}
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 mb-10">
          <p className="font-semibold text-indigo-900 mb-3">Tips for interview prep</p>
          <ul className="space-y-2">
            {tips.map((tip) => (
              <li key={tip} className="flex items-start gap-2 text-sm text-indigo-800">
                <svg className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                {tip}
              </li>
            ))}
          </ul>
        </div>

        {/* Credits note */}
        <div className="text-sm text-gray-500 bg-white border border-gray-200 rounded-2xl p-5 mb-8">
          <p className="font-semibold text-gray-700 mb-1">About credits</p>
          <p>
            Free accounts get 3 credits per month. Each generation uses 1 credit.
            Credits from paid packs never expire.{' '}
            <Link to="/pricing" className="text-indigo-600 hover:underline">See pricing →</Link>
          </p>
        </div>

        <div className="text-center">
          <Link to="/" className="text-sm text-indigo-600 hover:underline">
            ← Back to AIchitect
          </Link>
        </div>
      </main>
    </div>
  )
}
