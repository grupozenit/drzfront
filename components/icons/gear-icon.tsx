export function GearIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="2" />
      <path d="M13.5 3h-3a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1Z" />
      <path d="M13.5 18h-3a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1Z" />
      <path d="M3 10.5v3a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1Z" />
      <path d="M18 10.5v3a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1Z" />
      <path d="M5.5 5.5l1.4 1.4M17.1 17.1l1.4 1.4M17.1 5.5l-1.4 1.4M5.5 17.1l-1.4-1.4" />
    </svg>
  )
}
