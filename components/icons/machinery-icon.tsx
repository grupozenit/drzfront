export function MachineryIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {/* Retroexcavadora */}
      <circle cx="5" cy="19" r="2" />
      <circle cx="15" cy="19" r="2" />
      <path d="M7 19h6" />
      <path d="M3 19v-4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v4" />
      <rect x="5" y="10" width="8" height="3" rx="1" />
      <path d="M13 10l5-6" />
      <path d="M18 4l3 2-1 2" />
      <path d="M20 8l-7 5" />
    </svg>
  )
}

