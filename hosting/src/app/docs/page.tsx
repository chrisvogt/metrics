import type { Metadata } from 'next'
import Link from 'next/link'
import { MarketingShell } from '@/components/MarketingShell'
import styles from '../public-page.module.css'

export const metadata: Metadata = {
  title: 'Docs',
  description:
    'Where to find API routes in this Chronogrove deployment, repository docs, and local development notes.',
}

export default function DocsPage() {
  return (
    <MarketingShell>
      <div className={styles.page}>
        <article className={styles.content}>
          <span className={styles.eyebrow}>Docs</span>
          <h1 className={styles.title}>Documentation</h1>
          <p className={styles.lead}>
            Entry points for this console and for the GitHub repository. For behavior and contracts, prefer the in-app
            schema and status pages over this summary.
          </p>

          <section className={styles.section}>
            <h2>In this deployment</h2>
            <ul>
              <li>
                <strong>/schema/</strong> — route list, sample shapes, and what requires sign-in.
              </li>
              <li>
                <strong>/status/</strong> — live requests to public widget endpoints (status codes and timing).
              </li>
              <li>
                <strong>/endpoints/</strong> and <strong>/sync/</strong> — signed-in testing and manual provider sync.
              </li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>Repository</h2>
            <p>
              The root README covers install, emulators, and how this API feeds{' '}
              <a href="https://www.chrisvogt.me">www.chrisvogt.me</a> and the{' '}
              <a href="https://github.com/chrisvogt/gatsby-theme-chronogrove">Gatsby theme</a>. Topic docs in{' '}
              <code>docs/</code> cover the sync queue, session cookies, and similar implementation details.
            </p>
            <div className={styles.links}>
              <a href="https://github.com/chrisvogt/chronogrove" target="_blank" rel="noreferrer" className={styles.linkButton}>
                Repository
              </a>
              <a
                href="https://github.com/chrisvogt/gatsby-theme-chronogrove"
                target="_blank"
                rel="noreferrer"
                className={styles.linkButton}
              >
                Gatsby theme
              </a>
              <a
                href="https://github.com/chrisvogt/chronogrove/blob/main/docs/SYNC_JOB_QUEUE.md"
                target="_blank"
                rel="noreferrer"
                className={styles.linkButton}
              >
                Sync queue
              </a>
              <a
                href="https://github.com/chrisvogt/chronogrove/blob/main/docs/SESSION_COOKIES.md"
                target="_blank"
                rel="noreferrer"
                className={styles.linkButton}
              >
                Session cookies
              </a>
            </div>
          </section>

          <section className={styles.section}>
            <h2>Local development</h2>
            <p>
              Use the workspace scripts from the repo root. Run the Next app with Firebase emulators when you need
              auth-backed routes; use the console to confirm public and protected responses.
            </p>
            <div className={styles.links}>
              <Link href="/auth/" className={styles.linkButton}>
                Sign in
              </Link>
              <Link href="/status/" className={styles.linkButton}>
                Status
              </Link>
            </div>
          </section>
        </article>
      </div>
    </MarketingShell>
  )
}
