import { useState } from 'preact/hooks';
import { providerLogoUrl } from '../utils/logo';

// The service answers an unknown domain with a 16 px globe, and a site with
// only a 16 px favicon would look grainy even this small: both stay hidden.
const MIN_LOGO_PX = 32;

/** Small white badge with the shop's logo; renders nothing until one loads. */
export function ProviderLogo({ name, class: className = '' }) {
  const url = providerLogoUrl(name);
  const [loadedUrl, setLoadedUrl] = useState(null);
  if (!url) return null;

  const visible = loadedUrl === url;
  return (
    <span class={`provider-logo ${className}`} hidden={!visible} aria-hidden="true">
      {/* No loading="lazy": a lazy image inside a hidden parent never loads. */}
      <img
        key={url}
        onLoad={e => {
          if (e.currentTarget.naturalWidth >= MIN_LOGO_PX) setLoadedUrl(url);
        }}
        src={url}
        alt=""
        width="24"
        height="24"
        decoding="async"
        referrerpolicy="no-referrer"
        draggable={false}
      />
    </span>
  );
}
