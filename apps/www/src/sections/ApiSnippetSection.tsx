import { ApiSnippet } from '../components/ApiSnippet'
import { CONSOLE_ORIGIN } from '../config'

export function ApiSnippetSection() {
  return (
    <section className="api-section parallax-slow">
      <div className="section-inner">
        <div className="api-section-grid">
          <div className="api-section-text">
            <span className="section-label">The API</span>
            <h2 className="section-title">
              One endpoint per provider.
              <br />
              Consistent shape across all of them.
            </h2>
            <p className="section-body">
              Every widget returns the same envelope — provider name, updated
              timestamp, and a data object. Your frontend never has to know which
              backend changed.
            </p>
            <ul className="api-detail-list">
              <li>
                <strong>No auth required</strong> for public widget endpoints — just
                fetch and render.
              </li>
              <li>
                <code>Cache-Control: public, max-age=300</code> on every response.
                CDN-friendly by default.
              </li>
              <li>
                CORS headers scoped to the origins you declare in the console. No
                wildcard{' '}
                <code>*</code> in production.
              </li>
              <li>
                Custom domain: point <code>api.yourdomain.com</code> at{' '}
                <code>api.chronogrove.com</code> and serve your data from your
                own hostname.
              </li>
            </ul>
            <div style={{ marginTop: '1.5rem' }}>
              <a href={`${CONSOLE_ORIGIN}/schema/`} className="btn-secondary">
                Explore the schema
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
                  <path d="M2 6.5h9M7.5 3l3.5 3.5L7.5 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            </div>
          </div>

          {/* Animated terminal / code block */}
          <ApiSnippet />
        </div>
      </div>
    </section>
  )
}
