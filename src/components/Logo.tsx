export function Logo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#D6F7BC" />
          <stop offset="1" stopColor="#BAED91" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#lg)" />
      <path d="M24 20 12 32l12 12M40 20l12 12-12 12" stroke="#16300A" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="32" cy="32" r="4" fill="#2E6B12" />
    </svg>
  );
}
