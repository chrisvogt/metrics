const STEPS = [
  {
    number: '01',
    title: 'Connect your providers',
    body: 'Link Spotify, Goodreads, Steam, Discogs, GitHub, Flickr, and more through the operator console. One-time OAuth — automatic syncing starts immediately.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <circle cx="4" cy="4" r="2" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="16" cy="4" r="2" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="4" cy="16" r="2" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="16" cy="16" r="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M6 4h8M4 6v8M16 6v8M6 16h8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    number: '02',
    title: 'Sync on schedule',
    body: 'Cloud Functions poll each provider on a schedule and write normalized data to Firestore. Your feed is always fresh — no servers to manage or cron jobs to babysit.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M10 6v4.5l3 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M16.5 3.5 A8.5 8.5 0 0 1 18 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M16 2l.5 1.5 1.5-.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    number: '03',
    title: 'Serve JSON from any domain',
    body: 'Call the API from any frontend — no auth required for public widgets. A single fetch returns your data. CORS, caching headers, and custom domains all included.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M10 2.5c-2 2-3.5 4.5-3.5 7.5s1.5 5.5 3.5 7.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        <path d="M10 2.5c2 2 3.5 4.5 3.5 7.5s-1.5 5.5-3.5 7.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        <path d="M2.5 10h15" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
  },
]

export function HowItWorks() {
  return (
    <section className="how-it-works parallax-slow">
      <div className="section-inner">
        <header className="how-it-works-header">
          <span className="section-label">How it works</span>
          <h2 className="section-title">Three steps, then it runs itself</h2>
          <p className="section-body">
            Set it up once. Chronogrove handles the syncing, caching, and serving
            so your widgets stay live without maintenance.
          </p>
        </header>

        <div className="steps-grid">
          {STEPS.map(step => (
            <div key={step.number} className="step">
              <span className="step-number">{step.number}</span>
              <div className="step-icon">{step.icon}</div>
              <h3 className="step-title">{step.title}</h3>
              <p className="step-body">{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
