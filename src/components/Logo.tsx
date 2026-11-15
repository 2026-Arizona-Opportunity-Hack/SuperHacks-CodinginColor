/** Coding in Color's logo (the green < IN > brackets). The image has a white background, so it sits on a white tile in both themes. */
export function Logo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <span className={`inline-grid shrink-0 place-items-center overflow-hidden rounded-xl bg-white ring-1 ring-line ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/cic-logo-256.png" alt="" width={256} height={256} className="h-[88%] w-[88%] object-contain" />
    </span>
  );
}
