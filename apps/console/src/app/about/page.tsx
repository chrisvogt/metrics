import type { Metadata } from 'next'
import Link from 'next/link'
import { MarketingShell } from '@/components/MarketingShell'
import { CHRONOGROVE_GITHUB_REPO, CHRONOGROVE_LICENSE_URL } from '@/lib/chronogroveRepo'
import styles from '../public-page.module.css'

export const metadata: Metadata = {
  title: 'About',
  description:
    'What Chronogrove does: self-hosted provider sync, JSON feeds, and an operator console. Open source under Apache 2.0; maintainer and repo links.',
}

export default function AboutPage() {
  return (
    <MarketingShell>
      <div className={styles.page}>
        <article className={styles.content}>
          <span className={styles.eyebrow}>About</span>
          <h1 className={styles.title}>About Chronogrove</h1>
          <p className={styles.lead}>
            Chronogrove is the backend and operator console behind third-party widgets on{' '}
            <a href="https://www.chrisvogt.me">www.chrisvogt.me</a> — Discogs, Steam, Instagram, Spotify, and others. The
            same HTTP API can power static sites, themes, or embeddable components that speak JSON.
          </p>

          <section className={styles.section}>
            <h2>What it does</h2>
            <p>
              Connects configured providers on a schedule or via manual sync, normalizes their data into cacheable widget
              responses, and documents those routes in the schema browser. The console adds coverage checks, sign-in, and
              sync controls for operators.
            </p>
          </section>

          <section className={styles.section}>
            <h2>Frontend integrations</h2>
            <p>
              The reference consumer is the open-source{' '}
              <a href="https://github.com/chrisvogt/gatsby-theme-chronogrove">Gatsby theme Chronogrove</a>, which renders
              those experiences on the public site. Other site builders (for example WordPress) and HTML-native pieces
              such as Web Components are natural next steps for consuming the same public routes.
            </p>
          </section>

          <section className={styles.section} id="license">
            <h2>Open source</h2>
            <p>
              The Chronogrove API and this operator console are{' '}
              <a href={CHRONOGROVE_GITHUB_REPO} target="_blank" rel="noreferrer">
                free software
              </a>{' '}
              under the{' '}
              <a href={CHRONOGROVE_LICENSE_URL} target="_blank" rel="noreferrer">
                Apache License, Version 2.0
              </a>
              . You may use, modify, and distribute the code subject to that license (including the patent grant). The
              full legal text lives in the{' '}
              <a href={CHRONOGROVE_LICENSE_URL} target="_blank" rel="noreferrer">
                LICENSE
              </a>{' '}
              file in the repository.
            </p>
          </section>

          <section className={styles.section}>
            <h2>Maintainer</h2>
            <p>
              Built and maintained by Chris Vogt. The code is intended to be self-hosted, with support for custom
              domains and public API/status surfaces per site.
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
              <a href="https://github.com/chrisvogt/chronogrove" target="_blank" rel="noreferrer" className={styles.linkButton}>
                GitHub (API &amp; console)
              </a>
              <a
                href="https://github.com/chrisvogt/gatsby-theme-chronogrove"
                target="_blank"
                rel="noreferrer"
                className={styles.linkButton}
              >
                Gatsby theme
              </a>
            </div>
          </section>
        </article>
      </div>
    </MarketingShell>
  )
}
