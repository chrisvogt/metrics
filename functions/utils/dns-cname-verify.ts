import dns from 'dns'

function normalizeDnsName(name: string): string {
  return name.toLowerCase().replace(/\.$/, '')
}

/**
 * True if `hostname` equals `target` or a CNAME chain from `hostname` reaches `target`.
 * Used for onboarding custom-domain DNS checks.
 */
export async function hostnameCnameChainsTo(
  hostname: string,
  target: string,
  maxHops = 12
): Promise<boolean> {
  const want = normalizeDnsName(target)
  let current = normalizeDnsName(hostname)
  const seen = new Set<string>()

  for (let hop = 0; hop < maxHops; hop++) {
    if (current === want) return true
    if (seen.has(current)) return false
    seen.add(current)

    try {
      const cnames = await dns.promises.resolveCname(current)
      if (cnames.length === 0) return false
      for (const c of cnames) {
        const n = normalizeDnsName(c)
        if (n === want) return true
      }
      current = normalizeDnsName(cnames[0]!)
    } catch (err: unknown) {
      const code = (err as NodeJS.ErrnoException)?.code
      if (code === 'ENOTFOUND' || code === 'ENODATA') return false
      throw err
    }
  }

  return false
}
