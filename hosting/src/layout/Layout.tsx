import { useState, type ReactNode } from 'react'
import type { User } from 'firebase/auth'
import { useAuth } from '../auth/AuthContext'
import styles from './Layout.module.css'

export type SectionId = 'schema' | 'status' | 'api' | 'sync' | 'auth'

export interface LayoutProps {
  children: ReactNode
  user: User | null
  activeSection: SectionId
  onSectionChange: (section: SectionId) => void
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

  return (
    <div className={styles.dashboard}>
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarHeader}>
          <span className={styles.logo}>METRICS API</span>
          <span className={styles.logoSub} title="Git commit when this UI was built">
            {__GIT_SHORT_SHA__}
          </span>
        </div>
        <nav className={styles.nav}>
          <div className={styles.navSection}>
            <button
              type="button"
              className={`${styles.navItem} ${activeSection === 'schema' ? styles.navItemActive : ''}`}
              onClick={() => onSectionChange('schema')}
            >
              <span className={styles.navIcon}>📋</span>
              Schema
            </button>
            <button
              type="button"
              className={`${styles.navItem} ${activeSection === 'status' ? styles.navItemActive : ''}`}
              onClick={() => onSectionChange('status')}
            >
              <span className={styles.navIcon}>◉</span>
              Status
            </button>
            {user && (
              <>
                <button
                  type="button"
                  className={`${styles.navItem} ${activeSection === 'api' ? styles.navItemActive : ''}`}
                  onClick={() => onSectionChange('api')}
                >
                  <span className={styles.navIcon}>🔌</span>
                  API
                </button>
                <button
                  type="button"
                  className={`${styles.navItem} ${activeSection === 'sync' ? styles.navItemActive : ''}`}
                  onClick={() => onSectionChange('sync')}
                >
                  <span className={styles.navIcon}>📊</span>
                  Sync
                </button>
              </>
            )}
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
