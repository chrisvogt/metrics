'use client'

import Link from 'next/link'
import { useState, type ReactNode } from 'react'
import type { User } from 'firebase/auth'
import { useAuth } from '../auth/AuthContext'
import { getTenantDisplayHost } from '../lib/tenantDisplay'
import styles from './Layout.module.css'

export type SectionId = 'overview' | 'schema' | 'status' | 'api' | 'sync' | 'auth'

export interface LayoutProps {
  children: ReactNode
  user: User | null
  activeSection: SectionId
  onSectionChange: (section: SectionId) => void
}

const navItems: Array<{
  id: Exclude<SectionId, 'auth'>
  label: string
  icon: ReactNode
  requiresAuth?: boolean
}> = [
  {
    id: 'schema',
    label: 'Schema',
    icon: (
      <svg viewBox="0 0 20 20" aria-hidden>
        <path d="M5 4.5h10m-10 5h10m-10 5h6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'status',
    label: 'Status',
    icon: (
      <svg viewBox="0 0 20 20" aria-hidden>
        <path d="M4 13.5 7.5 10l2.5 2.5L16 6.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'api',
    label: 'Try API',
    requiresAuth: true,
    icon: (
      <svg viewBox="0 0 20 20" aria-hidden>
        <path d="M7 6.5 3.5 10 7 13.5M13 6.5 16.5 10 13 13.5M11 4 9 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'sync',
    label: 'Sync',
    requiresAuth: true,
    icon: (
      <svg viewBox="0 0 20 20" aria-hidden>
        <path d="M5 10a5 5 0 0 1 8.53-3.53M15 10a5 5 0 0 1-8.53 3.53M13.5 3.5v3h-3M6.5 16.5v-3h3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
]

const sectionCopy: Record<SectionId, { label: string; kicker: string }> = {
  overview: { label: 'Overview', kicker: '' }, // kicker filled in Layout with tenant host
  schema: { label: 'Schema', kicker: 'Public routes, payloads, and authenticated helpers' },
  status: { label: 'Status', kicker: 'Fast checks for the public-facing API surface' },
  api: { label: 'Try API', kicker: 'Session helpers and endpoint testing for signed-in operators' },
  sync: { label: 'Sync', kicker: 'Manual provider runs with live progress and final payloads' },
  auth: { label: 'Sign in', kicker: 'Access the protected console for this deployment' },
}

function userInitial(user: User): string {
  const fromName = user.displayName?.trim().charAt(0)
  if (fromName) return fromName.toUpperCase()
  const fromEmail = user.email?.trim().charAt(0)
  return fromEmail ? fromEmail.toUpperCase() : '?'
}

export function Layout({ children, user, activeSection, onSectionChange }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { logout } = useAuth()
  const tenantHost = getTenantDisplayHost()
  const activeCopy =
    activeSection === 'overview'
      ? {
          label: sectionCopy.overview.label,
          kicker: `Live provider health, metrics, and sync · ${tenantHost || 'this deployment'}`,
        }
      : sectionCopy[activeSection]

  return (
    <div className={styles.dashboard}>
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarHeader}>
          <Link href="/" className={styles.logoLink}>
            <span className={styles.logo}>CHRONOGROVE</span>
          </Link>
          <span className={styles.logoTag}>Core data service</span>
          <span className={styles.logoSub} title="Git commit when this UI was built">
            {process.env.NEXT_PUBLIC_GIT_SHA ?? 'unknown'}
          </span>
        </div>
        <nav className={styles.nav}>
          <div className={styles.navSection}>
            {navItems.map((item) =>
              !item.requiresAuth || user ? (
                <button
                  key={item.id}
                  type="button"
                  className={`${styles.navItem} ${activeSection === item.id ? styles.navItemActive : ''}`}
                  onClick={() => {
                    setSidebarOpen(false)
                    onSectionChange(item.id)
                  }}
                  aria-current={activeSection === item.id ? 'page' : undefined}
                >
                  <span className={styles.navIcon}>{item.icon}</span>
                  {item.label}
                </button>
              ) : null
            )}
          </div>
          <div className={styles.navSection}>
            <p className={styles.navHeading}>More</p>
            <Link href="/about/" className={styles.navLink}>
              About
            </Link>
            <Link href="/docs/" className={styles.navLink}>
              Docs
            </Link>
            <Link href="/privacy/" className={styles.navLink}>
              Privacy
            </Link>
          </div>
        </nav>
      </aside>
      <div className={styles.main}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <button
              type="button"
              className={styles.menuToggle}
              onClick={() => setSidebarOpen((o) => !o)}
              aria-label="Open navigation menu"
            >
              ☰
            </button>
          </div>
          <div className={styles.headerCenter}>
            <p className={styles.sectionLabel}>{activeCopy.label}</p>
            <p className={styles.sectionKicker}>{activeCopy.kicker}</p>
          </div>
          <div className={styles.headerRight}>
            {user ? (
              <div className={styles.authCluster}>
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt=""
                    className={styles.avatar}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className={styles.avatarPlaceholder} aria-hidden>
                    {userInitial(user)}
                  </span>
                )}
                <button type="button" className={styles.signOutBtn} onClick={() => void logout()}>
                  Sign out
                </button>
              </div>
            ) : (
              <button type="button" className={styles.signInBtn} onClick={() => onSectionChange('auth')}>
                Sign in
              </button>
            )}
          </div>
        </header>
        <div className={styles.content}>{children}</div>
      </div>
      <div
        className={styles.overlay}
        aria-hidden={!sidebarOpen}
        onClick={() => setSidebarOpen(false)}
      />
    </div>
  )
}
