const FEATURES = [
  {
    title: 'Multi-provider sync',
    body: 'Spotify, Goodreads, Steam, Discogs, GitHub, Flickr, and more — with a consistent response shape across all of them.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <rect x="2" y="2" width="6" height="6" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <rect x="12" y="2" width="6" height="6" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <rect x="2" y="12" width="6" height="6" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <rect x="12" y="12" width="6" height="6" rx="2" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    title: 'Cacheable JSON',
    body: 'Every endpoint sets proper Cache-Control headers. Serve from your CDN edge with zero origin hits for cached responses.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M4 4h12a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" stroke="currentColor" strokeWidth="1.5" />
        <path d="M3 8h14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        <path d="M7 12h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        <path d="M7 14.5h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: 'Custom API domain',
    body: 'CNAME your subdomain to api.chronogrove.com and serve your widget data from api.yourdomain.com — fully branded.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M10 2.5c-2 2-3 4.5-3 7.5s1 5.5 3 7.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        <path d="M10 2.5c2 2 3 4.5 3 7.5s-1 5.5-3 7.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        <path d="M2.5 10h15" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        <path d="M4 7h12M4 13h12" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeDasharray="1.5 1.5" />
      </svg>
    ),
  },
  {
    title: 'Status monitoring',
    body: 'Track last-sync timestamps, provider availability, and data freshness from the operator console at a glance.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M2 13 5.5 9 8.5 12 12 7 15 10.5 18 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M2 17h16" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: 'Open source',
    body: 'Apache 2.0. Fork it, self-host it, build on it. The full stack — API, Functions, and console — lives on GitHub.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M7 5.5 3 10l4 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M13 5.5 17 10l-4 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M11.5 4 8.5 16" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: 'Tenant console',
    body: 'Manage providers, schema, domain settings, and sync history from one polished Next.js dashboard — no infrastructure commands needed.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <rect x="2" y="3" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M2 7h16" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        <circle cx="5" cy="5" r="0.8" fill="currentColor" />
        <circle cx="7.5" cy="5" r="0.8" fill="currentColor" />
        <circle cx="10" cy="5" r="0.8" fill="currentColor" />
        <rect x="5" y="10" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.2" />
        <path d="M12 10h3M12 12.5h3M12 15h1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
]

export function FeaturesGrid() {
  return (
    <section className="features parallax-mid">
      <div className="section-inner">
        <header className="features-header">
          <span className="section-label">Features</span>
          <h2 className="section-title">Everything you need, nothing you don't</h2>
          <p className="section-body">
            Chronogrove is purpose-built for personal and indie developer stacks — small
            footprint, zero maintenance overhead.
          </p>
        </header>

        <div className="features-grid">
          {FEATURES.map(feat => (
            <div key={feat.title} className="feature-card">
              <div className="feature-icon">{feat.icon}</div>
              <h3 className="feature-title">{feat.title}</h3>
              <p className="feature-body">{feat.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
