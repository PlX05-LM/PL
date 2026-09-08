export type IconName =
  | 'flame'
  | 'music'
  | 'archive'
  | 'settings'
  | 'pin'
  | 'sparkle'
  | 'refresh'
  | 'scissors'
  | 'book'
  | 'feather'
  | 'quote'
  | 'monitor'
  | 'keyboard'
  | 'wireless'
  | 'film'
  | 'copy'
  | 'user'
  | 'edit'
  | 'document'

interface IconProps {
  name: IconName
  className?: string
}

const paths: Record<IconName, React.ReactNode> = {
  flame: (
    <>
      <path d="M12 2c2.5 3 4 6 4 9a4 4 0 1 1-8 0c0-.9.2-1.7.6-2.4.2 1.1 1 1.9 1.9 1.9A1.5 1.5 0 0 0 12 9c0-1.3-.8-2.1-.8-3.6C11.2 4 11.6 3 12 2Z" />
      <rect x="10" y="15" width="4" height="6" rx="0.6" />
      <line x1="8.5" y1="21" x2="15.5" y2="21" />
    </>
  ),
  music: (
    <>
      <path d="M9 18V5l11-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="17" cy="16" r="3" />
    </>
  ),
  archive: (
    <>
      <rect x="3" y="4" width="18" height="4" rx="1" />
      <path d="M5 8v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8" />
      <line x1="10" y1="13" x2="14" y2="13" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  sparkle: (
    <>
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3Z" />
      <path d="M19 15l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2Z" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 11A8 8 0 0 0 6.3 6.3L4 8.5" />
      <path d="M4 4v4.5h4.5" />
      <path d="M4 13a8 8 0 0 0 13.7 4.7L20 15.5" />
      <path d="M20 20v-4.5h-4.5" />
    </>
  ),
  scissors: (
    <>
      <circle cx="6" cy="6" r="2.2" />
      <circle cx="6" cy="18" r="2.2" />
      <line x1="8.5" y1="7.5" x2="20" y2="19" />
      <line x1="8.5" y1="16.5" x2="20" y2="5" />
    </>
  ),
  book: (
    <>
      <path d="M12 6c-2-1.5-4.5-2-8-1v13c3.5-1 6-.5 8 1 2-1.5 4.5-2 8-1V5c-3.5-1-6-.5-8 1Z" />
      <line x1="12" y1="6" x2="12" y2="19" />
    </>
  ),
  feather: (
    <>
      <path d="M20 4c-6 0-13 3-15 11 1-1 3-2 5-2-1 2-1 4 0 6 3-6 9-9 12-9" />
      <line x1="4" y1="20" x2="10" y2="14" />
    </>
  ),
  quote: (
    <>
      <path d="M7 8c-2 0-3.5 1.5-3.5 3.5S5 15 7 15c0 2-1.5 3.5-3.5 3.5" />
      <path d="M17 8c-2 0-3.5 1.5-3.5 3.5S15 15 17 15c0 2-1.5 3.5-3.5 3.5" />
    </>
  ),
  monitor: (
    <>
      <rect x="3" y="4" width="18" height="12" rx="1.5" />
      <line x1="8" y1="20" x2="16" y2="20" />
      <line x1="12" y1="16" x2="12" y2="20" />
    </>
  ),
  keyboard: (
    <>
      <rect x="2.5" y="6" width="19" height="12" rx="1.5" />
      <line x1="6" y1="10" x2="6" y2="10.01" />
      <line x1="9" y1="10" x2="9" y2="10.01" />
      <line x1="12" y1="10" x2="12" y2="10.01" />
      <line x1="15" y1="10" x2="15" y2="10.01" />
      <line x1="18" y1="10" x2="18" y2="10.01" />
      <line x1="7" y1="14.5" x2="17" y2="14.5" />
    </>
  ),
  wireless: (
    <>
      <path d="M12 20.5v.01" />
      <path d="M8.5 17a5 5 0 0 1 7 0" />
      <path d="M5.5 14a9 9 0 0 1 13 0" />
    </>
  ),
  film: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="1.5" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="3" y1="15" x2="21" y2="15" />
      <line x1="8" y1="4" x2="8" y2="9" />
      <line x1="8" y1="15" x2="8" y2="20" />
      <line x1="16" y1="4" x2="16" y2="9" />
      <line x1="16" y1="15" x2="16" y2="20" />
    </>
  ),
  copy: (
    <>
      <rect x="9" y="9" width="12" height="12" rx="1.5" />
      <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20c1.5-4 5-5.5 7.5-5.5s6 1.5 7.5 5.5" />
    </>
  ),
  edit: <path d="M4 20l.8-3.2L16.6 5a1.5 1.5 0 0 1 2.1 0l.3.3a1.5 1.5 0 0 1 0 2.1L7.2 19.2 4 20Z" />,
  document: (
    <>
      <path d="M6 3h9l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path d="M14 3v5h5" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="16" y2="17" />
    </>
  ),
}

/** Icônes trait fines et sobres (pas d'émojis), pour un rendu homogène et professionnel. */
export default function Icon({ name, className = 'h-4 w-4' }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  )
}
