'use client'

import { useEffect, useState } from 'react'
import { CHRONOGROVE_THEMES } from '@/theme/chronogroveTheme'
import { CHRONOGROVE_THEME_INFO } from '@/theme/chronogroveThemeInfo'
import { useChronogroveThemePersist } from '@/theme/useChronogroveThemePersist'
import styles from './ThemeQuickToggle.module.css'

/** Local `next-themes` switch for auth (and any public) surfaces; syncs to account when signed in. */
export function ThemeQuickToggle() {
  const { activeTheme, persist } = useChronogroveThemePersist()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted) return null

  return (
    <div className={styles.wrap}>
      <span className={styles.label} id="theme-quick-label">
        Background look
      </span>
      <div className={styles.seg} role="group" aria-labelledby="theme-quick-label">
        {CHRONOGROVE_THEMES.map((id) => (
          <button
            key={id}
            type="button"
            className={`${styles.btn} ${activeTheme === id ? styles.btnOn : ''}`}
            aria-pressed={activeTheme === id}
            onClick={() => void persist(id)}
          >
            {CHRONOGROVE_THEME_INFO[id].label}
          </button>
        ))}
      </div>
      <p className={styles.hint}>Uses this device until you change it in Settings. Matches your account when signed in.</p>
    </div>
  )
}
