export type DnsVerificationTimerRefs = {
  dnsTimerRef: { current: ReturnType<typeof setTimeout> | null }
  dnsPollingRef: { current: ReturnType<typeof setInterval> | null }
}

/**
 * Clears DNS verify debounce + polling timers. Used when the saved domain
 * resets from the server and when the user edits the draft, so stale intervals
 * cannot call check APIs for an old hostname.
 */
export function clearDnsVerificationTimers(refs: DnsVerificationTimerRefs): void {
  if (refs.dnsTimerRef.current) clearTimeout(refs.dnsTimerRef.current)
  refs.dnsTimerRef.current = null
  if (refs.dnsPollingRef.current) clearInterval(refs.dnsPollingRef.current)
  refs.dnsPollingRef.current = null
}
