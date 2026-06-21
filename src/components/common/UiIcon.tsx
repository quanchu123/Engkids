import Image from 'next/image';

/**
 * UiIcon — renders a colorful Icons8 PNG icon stored locally in /public/icons.
 *
 * These replace the old text/letter placeholders on the Progress & Shop pages
 * with real, playful artwork. Icons are decorative, so they are marked
 * aria-hidden by default (give a `label` only when the icon conveys meaning on
 * its own).
 */

export type UiIconName =
  | 'home'
  | 'dictionary'
  | 'open-book'
  | 'books'
  | 'notebook'
  | 'medal'
  | 'trophy'
  | 'star'
  | 'fire'
  | 'abc'
  | 'treasure-chest'
  | 'crown'
  | 'controller'
  | 'audio'
  | 'gift'
  | 'family'
  | 'certificate'
  | 'goal'
  | 'light'
  | 'sprout'
  | 'graduation-cap'
  | 'microphone'
  | 'calendar'
  | 'coins'
  | 'snowflake';

interface UiIconProps {
  name: UiIconName;
  size?: number;
  className?: string;
  label?: string;
}

export default function UiIcon({ name, size = 28, className, label }: UiIconProps) {
  return (
    <Image
      src={`/icons/${name}.png`}
      alt={label ?? ''}
      aria-hidden={label ? undefined : true}
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size, objectFit: 'contain' }}
      unoptimized
    />
  );
}
