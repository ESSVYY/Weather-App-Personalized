"use client";

import Link from "next/link";
import { CloudOff, RefreshCw } from "lucide-react";

export function RouteError({ reset }: { reset: () => void }) {
  return <main className="route-recovery"><div><CloudOff aria-hidden /><span>ATMOS</span><h1>Something interrupted this view.</h1><p>Your saved weather has not been removed.</p><div><button onClick={reset}><RefreshCw aria-hidden /> Try again</button><Link href="/">Return to weather</Link></div></div></main>;
}
