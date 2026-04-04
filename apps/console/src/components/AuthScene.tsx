'use client'

import dynamic from 'next/dynamic'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import styles from './AuthScene.module.css'

const StarryNightScene = dynamic(() => import('./StarryNightScene'), { ssr: false })
const SonoranDuskScene = dynamic(() => import('./SonoranDuskScene'), { ssr: false })

export function AuthScene() {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const theme = mounted ? resolvedTheme : 'sonoran-dusk'
  const Scene = theme === 'starry-night' ? StarryNightScene : SonoranDuskScene

  return (
    <div className={styles.root} aria-hidden>
      <div className={styles.canvasWrap}>
        {mounted ? <Scene className={styles.canvas} /> : null}
      </div>
      <div className={styles.vignette} />
    </div>
  )
}
