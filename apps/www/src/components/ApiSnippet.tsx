import { useEffect, useRef, useState } from 'react'

type LineKind = 'cmd' | 'blank' | 'status' | 'header' | 'brace' | 'key' | 'string' | 'comment'

interface Line {
  kind: LineKind
  text: string
}

const LINES: Line[] = [
  { kind: 'comment', text: '# Fetch your widget data — no auth required' },
  { kind: 'cmd',    text: '$ curl https://api.chronogrove.com/u/chrisvogt/widgets/spotify' },
  { kind: 'blank',  text: '' },
  { kind: 'status', text: 'HTTP/1.1 200 OK' },
  { kind: 'header', text: 'Content-Type: application/json; charset=utf-8' },
  { kind: 'header', text: 'Cache-Control: public, max-age=300, s-maxage=300' },
  { kind: 'header', text: 'X-Tenant: chrisvogt' },
  { kind: 'blank',  text: '' },
  { kind: 'brace',  text: '{' },
  { kind: 'key',    text: '  "provider": ' },
  { kind: 'string', text: '"spotify",' },
  { kind: 'key',    text: '  "updatedAt": ' },
  { kind: 'string', text: '"2026-04-05T12:00:00Z",' },
  { kind: 'key',    text: '  "data": {' },
  { kind: 'key',    text: '    "recentlyPlayed": [' },
  { kind: 'brace',  text: '      {' },
  { kind: 'key',    text: '        "trackName": ' },
  { kind: 'string', text: '"Motion Picture Soundtrack",' },
  { kind: 'key',    text: '        "artistName": ' },
  { kind: 'string', text: '"Radiohead"' },
  { kind: 'brace',  text: '      }' },
  { kind: 'brace',  text: '    ]' },
  { kind: 'brace',  text: '  }' },
  { kind: 'brace',  text: '}' },
]

const KIND_CLASS: Record<LineKind, string> = {
  cmd:     't-cmd',
  blank:   't-blank',
  status:  't-status',
  header:  't-header',
  brace:   't-brace',
  key:     't-key',
  string:  't-string',
  comment: 't-header',
}

export function ApiSnippet() {
  const [visibleCount, setVisibleCount] = useState(0)
  const [badgeVisible, setBadgeVisible] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const started = useRef(false)

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true
          observer.disconnect()

          if (reduced) {
            setVisibleCount(LINES.length)
            setBadgeVisible(true)
            return
          }

          const DELAY_MS = 55
          intervalRef.current = setInterval(() => {
            setVisibleCount(prev => {
              const next = prev + 1
              if (next >= LINES.length) {
                clearInterval(intervalRef.current!)
                // Status badge appears after all lines have rendered
                setTimeout(() => setBadgeVisible(true), 200)
              }
              return next
            })
          }, DELAY_MS)
        }
      },
      { threshold: 0.25 },
    )

    const el = containerRef.current
    if (el) observer.observe(el)

    return () => {
      observer.disconnect()
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  const visibleLines = LINES.slice(0, visibleCount)
  const isAnimating = visibleCount < LINES.length

  return (
    <div ref={containerRef} className="terminal">
      <div className="terminal-bar">
        <span className="terminal-dot terminal-dot-red" />
        <span className="terminal-dot terminal-dot-yellow" />
        <span className="terminal-dot terminal-dot-green" />
        <span className="terminal-title">widgets/spotify · live response</span>
        <span className={`terminal-status-badge ${badgeVisible ? 'visible' : ''}`}>
          <span className="terminal-status-dot" />
          200 OK
        </span>
      </div>
      <pre className="terminal-body">
        <code>
          {visibleLines.map((line, i) => (
            <span key={i} className={`t-line ${KIND_CLASS[line.kind]}`}>
              {line.text}
              {'\n'}
            </span>
          ))}
          {isAnimating && <span className="t-cursor" />}
        </code>
      </pre>
    </div>
  )
}
