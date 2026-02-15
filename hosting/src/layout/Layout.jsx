import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import styles from './Layout.module.css'

export function Layout({ children, user, activeSection, onSectionChange }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { logout } = useAuth()


  return (
    <div className={styles.dashboard}>
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarHeader}>
          <span className={styles.logo}>METRICS</span>
          <span className={styles.logoSub}>API</span>
        </div>
        <nav className={styles.nav}>
          <div className={styles.navSection}>
            <span className={styles.navTitle}>Main</span>
            {!user ? (
              <button
                type="button"
                className={`${styles.navItem} ${styles.navItemActive}`}
                onClick={() => onSectionChange('auth')}
              >
                <span className={styles.navIcon}>🔐</span>
                Sign in
              </button>
            ) : (
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
        {user && (
          <div className={styles.sidebarFooter}>
            <div className={styles.userEmail}>{user.email}</div>
            <button type="button" className={styles.logoutBtn} onClick={logout}>
              Sign out
            </button>
          </div>
        )}
      </aside>
      <div className={styles.main}>
        <header className={styles.header}>
          <h1 className={styles.title}>Metrics API</h1>
          <button
            type="button"
            className={styles.menuToggle}
            onClick={() => setSidebarOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            ☰
          </button>
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
