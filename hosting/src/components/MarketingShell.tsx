import Link from 'next/link'
import styles from './MarketingShell.module.css'

const primaryLinks = [
  { href: '/schema/', label: 'Schema' },
  { href: '/status/', label: 'Status' },
  { href: '/docs/', label: 'Docs' },
]

const secondaryLinks = [
  { href: '/about/', label: 'About' },
  { href: '/privacy/', label: 'Privacy' },
  { href: '/auth/', label: 'Sign in' },
]

const DEFAULT_FOOTER =
  'Chronogrove is a self-hosted JSON API and operator console for personal provider data. Repository and maintainer links are in this footer.'

export function MarketingShell({
  children,
  footerCopy = DEFAULT_FOOTER,
}: {
  children: React.ReactNode
  /** Full footer paragraph. Defaults to a short factual description. */
  footerCopy?: string
}) {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/" className={styles.brand}>
            <span className={styles.brandMark} aria-hidden>
              <svg width="14" height="18" viewBox="0 0 14 18" fill="none" aria-hidden>
                <line x1="7" y1="18" x2="7" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <polyline points="3,9 7,3 11,9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                <polyline points="1,13 7,7 13,13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>
            </span>
            <span>
              <strong>Chronogrove</strong>
              <span className={styles.brandMeta}> by Chris Vogt</span>
            </span>
          </Link>
          <nav className={styles.nav} aria-label="Primary">
            {primaryLinks.map((link) => (
              <Link key={link.href} href={link.href} className={styles.navLink}>
                {link.label}
              </Link>
            ))}
          </nav>
          <div className={styles.actions}>
            {secondaryLinks.map((link) => (
              <Link key={link.href} href={link.href} className={styles.actionLink}>
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </header>
      <main>{children}</main>
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <p className={styles.footerCopy}>{footerCopy}</p>
          <div className={styles.footerLinks}>
            <a href="https://github.com/chrisvogt/metrics" target="_blank" rel="noreferrer">
              GitHub
            </a>
            <a href="https://www.chrisvogt.me" target="_blank" rel="noreferrer">
              Chris Vogt
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
