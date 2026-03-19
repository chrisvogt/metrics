const getXmlTextOrUndefinedInternal = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value

  // xml2js may wrap text nodes in arrays (especially when `explicitArray` is not disabled).
  if (Array.isArray(value)) return getXmlTextOrUndefinedInternal(value[0])

  if (value && typeof value === 'object') {
    const maybe = value as { _: unknown }
    return typeof maybe._ === 'string' ? maybe._ : undefined
  }

  return undefined
}

/**
 * Extract a text node value from common xml2js shapes.
 *
 * xml2js often represents text nodes as either:
 * - a direct string, or
 * - an object with a `_` charkey, sometimes wrapped in an array.
 */
export const getXmlTextOrUndefined = (value: unknown): string | undefined =>
  getXmlTextOrUndefinedInternal(value)

export const getXmlTextOrNull = (value: unknown): string | null =>
  getXmlTextOrUndefined(value) ?? null

