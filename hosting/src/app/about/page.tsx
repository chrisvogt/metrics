import type { Metadata } from 'next'
import Link from 'next/link'
import { MarketingShell } from '@/components/MarketingShell'
import styles from '../public-page.module.css'

export const metadata: Metadata = {
  title: 'About',
  description:
    'What Chronogrove does: self-hosted provider sync, JSON feeds, and an operator console. Maintainer and repo links.',
}

export default function AboutPage() {
  return (
    <MarketingShell>
      <div className={styles.page}>
        <article className={styles.content}>
          <span className={styles.eyebrow}>About</span>
          <h1 className={styles.title}>About Chronogrove</h1>
          <p className={styles.lead}>
            Chronogrove is open source (see GitHub). This deployment&apos;s UI is the operator surface; the same API can
            feed static sites or themes built in whatever stack you use.
          </p>

          <section className={styles.section}>
            <h2>What it does</h2>
            <p>
              Connects configured providers (for example GitHub, Goodreads, Spotify, Instagram) on a schedule or via
              manual sync, normalizes their data into JSON responses, and documents those routes in the schema
              browser. The console adds coverage checks, sign-in, and sync controls for whoever runs the instance.
            </p>
          </section>

          <section className={styles.section}>
            <h2>Maintainer</h2>
            <p>
              Built and maintained by Chris Vogt as the backing service for a personal site and related themes; the code
              is intended to be self-hosted per tenant.
            </p>
          </section>

          <section className={styles.section}>
            <h2>Where to look</h2>
            <div className={styles.links}>
              <Link href="/docs/" className={styles.linkButton}>
                Docs
              </Link>
              <Link href="/schema/" className={styles.linkButton}>
                Schema
              </Link>
              <a href="https://github.com/chrisvogt/metrics" target="_blank" rel="noreferrer" className={styles.linkButton}>
                GitHub
              </a>
            </div>
          </section>
        </article>
      </div>
    </MarketingShell>
  )
}
