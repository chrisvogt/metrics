import { useEffect } from 'react'
import { Hero } from './sections/Hero'
import { HowItWorks } from './sections/HowItWorks'
import { ApiSnippetSection } from './sections/ApiSnippetSection'
import { FeaturesGrid } from './sections/FeaturesGrid'
import { CtaStrip } from './sections/CtaStrip'
import { CONSOLE_ORIGIN, GITHUB_REPO } from './config'

const NAV_LINKS = [
  { href: `${CONSOLE_ORIGIN}/schema/`, label: 'Schema' },
  { href: `${CONSOLE_ORIGIN}/u/chrisvogt/`, label: 'Status' },
  { href: GITHUB_REPO, label: 'GitHub', external: true },
]

const FOOTER_LINKS = [
  { href: GITHUB_REPO, label: 'GitHub', external: true },
  { href: `${GITHUB_REPO}/blob/main/LICENSE`, label: 'Apache 2.0', external: true },
  { href: 'https://www.chrisvogt.me', label: 'Chris Vogt', external: true },
  { href: `${CONSOLE_ORIGIN}/privacy/`, label: 'Privacy' },
]

// Brand mark SVG — shared with console MarketingShell
function BrandMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 22V8.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path
        d="M12 8.5 7 4.5M12 8.5 17 4.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 13.5 6.5 11M12 13.5 17.5 11"
        stroke="currentColor"
        strokeWidth="1.45"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.85"
      />
      <circle cx="12" cy="3" r="1.35" fill="currentColor" opacity="0.9" />
    </svg>
  )
}

export function App() {
  // Wire --scroll-y CSS variable for parallax; guarded by prefers-reduced-motion
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches) return

    let ticking = false
    const update = () => {
      document.documentElement.style.setProperty('--scroll-y', String(window.scrollY))
      ticking = false
    }

    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(update)
        ticking = true
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      {/* ---- Navigation ---- */}
      <nav className="nav" aria-label="Primary">
        <div className="nav-inner">
          <a href="/" className="nav-brand" aria-label="Chronogrove home">
            <span className="nav-brand-mark">
              <BrandMark />
            </span>
            <span className="nav-wordmark">
              <span>Chrono</span>
              <span>grove</span>
            </span>
          </a>

          <ul className="nav-links" role="list">
            {NAV_LINKS.map(link => (
              <li key={link.label}>
                <a
                  href={link.href}
                  {...(link.external
                    ? { target: '_blank', rel: 'noreferrer' }
                    : {})}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>

          <a
            href={`${CONSOLE_ORIGIN}/signup/`}
            className="nav-cta"
            aria-label="Get started with Chronogrove"
          >
            Get started
          </a>
        </div>
      </nav>

      {/* ---- Main content ---- */}
      <main>
        <Hero />
        <HowItWorks />
        <ApiSnippetSection />
        <FeaturesGrid />
        <CtaStrip />
      </main>

      {/* ---- Footer ---- */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <a href="/" className="nav-brand" style={{ textDecoration: 'none' }}>
              <span className="nav-brand-mark">
                <BrandMark />
              </span>
              <span className="nav-wordmark">
                <span>Chrono</span>
                <span>grove</span>
              </span>
            </a>
            <p className="footer-copy">
              Chronogrove syncs third-party providers into a JSON API that powers widget
              experiences on personal sites. Open source under Apache&nbsp;2.0.
            </p>
          </div>
          <nav className="footer-links" aria-label="Footer">
            {FOOTER_LINKS.map(link => (
              <a
                key={link.label}
                href={link.href}
                {...(link.external
                  ? { target: '_blank', rel: 'noreferrer' }
                  : {})}
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>
      </footer>
    </>
  )
}
