"use client";
import { RouteError } from "@/components/RouteError";
export default function AboutError({ reset }: { error: Error & { digest?: string }; reset: () => void }) { return <RouteError reset={reset} />; }
