import { useEffect } from 'react'

// The build bakes the product title into the served <title>; capture it once
// as the restore target instead of duplicating the literal in client code.
const productTitleFallback = typeof document === 'undefined' ? '' : document.title

/** Props for the browser title projection. */
export interface DocumentTitleProps {
  /** Durable title of the selected session, or undefined for the product title. */
  title?: string
}

/**
 * Project the selected durable session title into the browser title and
 * restore the build-selected product title when unmounted.
 * @param props - Selected session title projection.
 * @returns No rendered content.
 */
export function DocumentTitle({ title }: DocumentTitleProps): null {
  const productTitle = process.env.DSH_CLIENT_TITLE ?? productTitleFallback
  useEffect(() => {
    document.title = title === undefined ? productTitle : `${title} — ${productTitle}`
    return () => { document.title = productTitle }
  }, [productTitle, title])
  return null
}
