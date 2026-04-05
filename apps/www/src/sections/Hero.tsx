import { lazy, Suspense } from 'react'
import { CONSOLE_ORIGIN } from '../config'

const ParticleCanvas = lazy(() => import('../components/ParticleCanvas'))

export function Hero() {
  return (
    <section className="hero">
      {/* Three.js particle field — loaded async so it never blocks initial paint */}
      <div className="hero-canvas-wrapper">
        <Suspense fallback={null}>
          <ParticleCanvas className="hero-canvas" />
        </Suspense>
      </div>

      <div className="hero-content">
        <p className="hero-eyebrow">
          <span className="hero-eyebrow-dot" aria-hidden="true" />
          Open source · Apache&nbsp;2.0
        </p>

        <h1 className="hero-headline">
          Your data.<br />
          <em>Any site.</em><br />
          One&nbsp;API.
        </h1>

        <p className="hero-subhead">
          Chronogrove syncs Spotify, Goodreads, Steam, and more into a cacheable JSON
          feed — add your data to any website in a single&nbsp;
          <code>fetch</code>.
        </p>

        <div className="hero-ctas">
          <a
            href={`${CONSOLE_ORIGIN}/signup/`}
            className="btn-primary"
          >
            Get started
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M2.5 7h9M7.5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
          <a
            href="https://github.com/chrisvogt/chronogrove"
            target="_blank"
            rel="noreferrer"
            className="btn-secondary"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.167 6.839 9.49.5.092.682-.217.682-.483 0-.237-.009-.866-.013-1.7-2.782.603-3.369-1.342-3.369-1.342-.454-1.155-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.026A9.578 9.578 0 0 1 12 6.836a9.59 9.59 0 0 1 2.504.337c1.909-1.295 2.748-1.026 2.748-1.026.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .268.18.58.688.482C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
            </svg>
            View source
          </a>
        </div>
      </div>

      <div className="hero-scroll-hint" aria-hidden="true">
        <span className="scroll-line" />
        scroll
      </div>
    </section>
  )
}
