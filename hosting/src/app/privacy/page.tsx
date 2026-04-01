import type { Metadata } from 'next'
import Link from 'next/link'
import { MarketingShell } from '@/components/MarketingShell'
import styles from '../public-page.module.css'

export const metadata: Metadata = {
  title: 'Privacy',
  description:
    'How Chronogrove exposes public JSON routes, uses sign-in for operator features, and handles sessions. Summary only.',
}

export default function PrivacyPage() {
  return (
    <MarketingShell>
      <div className={styles.page}>
        <article className={styles.content}>
          <span className={styles.eyebrow}>Privacy</span>
          <h1 className={styles.title}>Privacy</h1>
          <p className={styles.lead}>
            Short description of how this app splits public data from signed-in tooling. It is not a legal policy;
            use it as orientation for operators and auditors.
          </p>

          <section className={styles.section}>
            <h2>Public routes</h2>
            <p>
              Widget-style public endpoints return published, cacheable JSON (TLS in production; local dev may use
              plain HTTP). The schema and status UI list what is exposed so you do not have to infer it from code alone.
            </p>
          </section>

          <section className={styles.section}>
            <h2>Signed-in routes</h2>
            <p>
              Authentication gates session creation, protected API helpers in the console, and manual sync. Those paths
              are separate from the public read surface.
            </p>
          </section>

          <section className={styles.section}>
            <h2>Sessions</h2>
            <p>
              Auth is Firebase-backed; protected flows may use HTTP-only session cookies. Session behavior is documented
              in the repo (see link below) if you need specifics.
            </p>
          </section>

          <section className={styles.section}>
            <h2>Related</h2>
            <div className={styles.links}>
              <Link href="/docs/" className={styles.linkButton}>
                Docs
              </Link>
              <Link href="/schema/" className={styles.linkButton}>
                Schema
              </Link>
              <a
                href="https://github.com/chrisvogt/chronogrove/blob/main/docs/SESSION_COOKIES.md"
                target="_blank"
                rel="noreferrer"
                className={styles.linkButton}
              >
                Session cookies (repo)
              </a>
            </div>
          </section>
        </article>
      </div>
    </MarketingShell>
  )
}
