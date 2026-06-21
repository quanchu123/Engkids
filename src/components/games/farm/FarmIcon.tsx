'use client';

import { useState } from 'react';
import { farmIconSrc } from '@/game/farm/data/farmIcons';

/**
 * Renders a farm icon by name, using the pre-downloaded Iconscout asset when one
 * exists (via `farmIconSrc`) and falling back to an emoji otherwise.
 *
 * Progressive enhancement: if the manifest has no asset for `name`, or the image
 * fails to load at runtime, the `emoji` fallback is shown instead — the UI never
 * breaks because an icon is missing.
 */
export function FarmIcon({
  name,
  emoji = '🌱',
  className = '',
}: {
  name: string;
  emoji?: string;
  className?: string;
}) {
  const src = farmIconSrc(name);
  const [failed, setFailed] = useState(false);

  if (src && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        aria-hidden="true"
        className={`object-contain ${className}`}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <span className={`inline-flex items-center justify-center ${className}`} aria-hidden="true">
      {emoji}
    </span>
  );
}

export default FarmIcon;
