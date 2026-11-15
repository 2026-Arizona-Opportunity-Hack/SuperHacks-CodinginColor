import Link from "next/link";
import { WifiOff } from "lucide-react";

export const metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <div className="card mx-auto max-w-lg p-8 text-center">
      <WifiOff className="mx-auto h-10 w-10 text-muted" aria-hidden />
      <h1 className="h-display mt-3 text-2xl">You&apos;re offline</h1>
      <p className="mt-2 text-muted">Lessons you opened before still work, and the Python playground runs without internet. Your work saves on this device and sends when you&apos;re back online.</p>
      <Link href="/play" className="btn-primary mt-5">Open the playground</Link>
    </div>
  );
}
