// Decorative pitch markings for the hero — half a football pitch drawn in faint
// white lines. Purely visual; sits behind the hero content.
export function PitchBackdrop({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 400 220"
      preserveAspectRatio="xMaxYMid slice"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden
    >
      {/* touchline box */}
      <rect x="8" y="8" width="384" height="204" rx="2" opacity="0.5" />
      {/* halfway line + centre circle + spot */}
      <line x1="200" y1="8" x2="200" y2="212" opacity="0.5" />
      <circle cx="200" cy="110" r="46" opacity="0.5" />
      <circle cx="200" cy="110" r="2.5" fill="currentColor" stroke="none" />
      {/* right penalty area + arc + spot */}
      <rect x="312" y="46" width="80" height="128" opacity="0.5" />
      <rect x="356" y="82" width="36" height="56" opacity="0.5" />
      <path d="M330 80 A 40 40 0 0 1 330 140" opacity="0.5" />
      <circle cx="344" cy="110" r="2.5" fill="currentColor" stroke="none" />
      {/* left penalty area */}
      <rect x="8" y="46" width="80" height="128" opacity="0.5" />
      <path d="M70 80 A 40 40 0 0 0 70 140" opacity="0.5" />
    </svg>
  )
}
