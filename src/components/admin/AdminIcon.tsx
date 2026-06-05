'use client';

import Image from 'next/image';
import type { LucideIcon } from 'lucide-react';
import { getAdminIconSrc, type AdminIconKey } from '@/config/admin-icons';

interface AdminIconProps {
  /** Admin icon key; if an Iconscout asset exists it is used, else the lucide fallback renders. */
  name: AdminIconKey;
  /** Lucide fallback icon (always provided so the UI never lacks an icon). */
  fallback: LucideIcon;
  /** Tailwind size/style classes applied to whichever icon renders. */
  className?: string;
  /** Pixel size for the Iconscout <Image>. Defaults to 20. */
  size?: number;
}

/**
 * Renders an admin icon with progressive enhancement: prefers a pre-downloaded
 * Iconscout asset when one exists for `name`, otherwise renders the provided
 * lucide-react fallback. Both render decoratively (`aria-hidden`) since the label
 * text alongside conveys meaning.
 */
export default function AdminIcon({
  name,
  fallback: Fallback,
  className = 'h-4 w-4',
  size = 20,
}: AdminIconProps) {
  const src = getAdminIconSrc(name);

  if (src) {
    return (
      <Image
        src={src}
        alt=""
        width={size}
        height={size}
        className={className}
        aria-hidden="true"
      />
    );
  }

  return <Fallback className={className} aria-hidden="true" />;
}
