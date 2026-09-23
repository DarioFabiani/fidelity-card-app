import { PROVIDERS } from '../constants/providers';
import { foldText } from '../hooks/useSearch';

export const LOGO_SERVICE = 'https://www.google.com/s2/favicons';

/**
 * The shop's web domain, used only to look up its logo. Preset shops carry
 * their real domain, and a longer name that starts with one ("Conad
 * Superstore", "Lidl Plus") borrows it. Anything else is a guess at
 * "<name>.it"; a wrong guess just means no logo.
 */
export function providerDomain(name) {
  const folded = foldText(name);
  if (!folded) return null;
  const preset = PROVIDERS.find(p => {
    const presetName = foldText(p.name);
    return folded === presetName || folded.startsWith(presetName + ' ');
  });
  if (preset) return preset.domain;
  const slug = folded.replace(/&/g, 'e').replace(/[^a-z0-9]/g, '');
  return slug.length >= 2 ? `${slug}.it` : null;
}

export function providerLogoUrl(name) {
  const domain = providerDomain(name);
  return domain ? `${LOGO_SERVICE}?domain=${encodeURIComponent(domain)}&sz=128` : null;
}
