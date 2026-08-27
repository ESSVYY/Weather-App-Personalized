import type { Metadata } from "next";
import { WeatherIntelligencePage } from "@/components/analysis/WeatherIntelligencePage";

export const metadata: Metadata = {
  title: "Weather Intelligence",
  description: "Explore Auckland weather patterns, momentum, comfort, activity fit and microclimates.",
};

export default function AnalysisPage() {
  return <WeatherIntelligencePage />;
}
