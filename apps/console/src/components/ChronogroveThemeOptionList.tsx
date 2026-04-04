'use client'

import { CHRONOGROVE_THEMES, type ChronogroveThemeId } from '@/theme/chronogroveTheme'
import { CHRONOGROVE_THEME_INFO } from '@/theme/chronogroveThemeInfo'
import styles from './ChronogroveThemeOptionList.module.css'

export function ChronogroveThemeOptionList({
  value,
  disabled,
  labelledBy,
  onSelect,
}: {
  value: ChronogroveThemeId
  disabled?: boolean
  labelledBy: string
  onSelect: (id: ChronogroveThemeId) => void
}) {
  return (
    <div className={styles.options} role="radiogroup" aria-labelledby={labelledBy}>
      {CHRONOGROVE_THEMES.map((id) => {
        const meta = CHRONOGROVE_THEME_INFO[id]
        const selected = value === id
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={selected}
            className={`${styles.option} ${selected ? styles.optionSelected : ''}`}
            onClick={() => onSelect(id)}
            disabled={disabled}
          >
            <span className={styles.optionTitle}>{meta.label}</span>
            <span className={styles.optionBlurb}>{meta.blurb}</span>
            <span className={styles.swatchStrip} data-theme-preview={id} aria-hidden />
          </button>
        )
      })}
    </div>
  )
}
