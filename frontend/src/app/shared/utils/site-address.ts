import { getPublicSuffix } from 'tldts';

/** Normalize for navigation without changing the stored address. */
export function parseSiteAddress(value: string): URL | null {
  const address = value.trim();
  if (!address || /\s/.test(address)) return null;
  const hasScheme = /^[a-z][a-z\d+.-]*:/i.test(address) && !/^[\w.-]+:\d+(?:[/?#]|$)/.test(address);
  try {
    const url = new URL(hasScheme ? address : `https://${address.replace(/^\/\//, '')}`);
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      !url.hostname ||
      url.username ||
      url.password
    )
      return null;
    return url;
  } catch {
    return null;
  }
}

export function siteDisplayName(value: string): string {
  const url = parseSiteAddress(value);
  if (!url) return value.trim();
  const hostname = url.hostname.replace(/^www\./i, '');
  const suffix = getPublicSuffix(hostname, { allowPrivateDomains: true });
  return suffix && hostname.endsWith(`.${suffix}`)
    ? hostname.slice(0, -suffix.length - 1)
    : hostname;
}
