'use client'

import dynamic from 'next/dynamic'
import styles from './AuthScene.module.css'

const StarryNightScene = dynamic(() => import('./StarryNightScene'), { ssr: false })

export function AuthScene() {
  return (
    <div className={styles.root} aria-hidden>
      <div className={styles.canvasWrap}>
        <StarryNightScene className={styles.canvas} />
      </div>
      <div className={styles.vignette} />
    </div>
  )
}
