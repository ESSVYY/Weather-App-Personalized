"use client";

import { useMemo } from "react";
import type { WeatherHour } from "@/types/weather";

export function TemperatureGraph({ hours, selected }: { hours: WeatherHour[]; selected: number }) {
  const graph = useMemo(() => {
    if (!hours.length) return { points: "", area: "", width: 640, labels: [] as Array<{x:number;y:number;t:number}> };
    const width = Math.max(640, hours.length * 54); const top = 18; const height = 94;
    const temps = hours.map((h) => h.temperature); const min = Math.min(...temps) - 2; const max = Math.max(...temps) + 2;
    const labels = temps.map((temperature, index) => ({ x: 28 + index * ((width - 56) / Math.max(1, hours.length - 1)), y: top + (max - temperature) / Math.max(1, max - min) * height, t: Math.round(temperature) }));
    const points = labels.map((point, index) => `${index ? "L" : "M"}${point.x},${point.y}`).join(" ");
    return { width, labels, points, area: `${points} L${labels.at(-1)?.x},132 L${labels[0].x},132 Z` };
  }, [hours]);
  if (!hours.length) return <p className="empty-state">Hourly details are not available.</p>;
  return (
    <div className="graph-scroll" aria-label="Hourly temperature curve">
      <svg width={graph.width} height="150" role="img" aria-label={`Temperatures from ${Math.min(...hours.map(h => Math.round(h.temperature)))} to ${Math.max(...hours.map(h => Math.round(h.temperature)))} degrees Celsius`}>
        <defs><linearGradient id="tempFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="currentColor" stopOpacity=".28"/><stop offset="1" stopColor="currentColor" stopOpacity="0"/></linearGradient></defs>
        <path d={graph.area} fill="url(#tempFill)" />
        <path d={graph.points} fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
        {graph.labels.map((point, index) => <g key={index} className={index === selected ? "selected-point" : ""}><circle cx={point.x} cy={point.y} r={index === selected ? 5 : 2.5} fill="currentColor"/><text x={point.x} y={point.y - 10} textAnchor="middle">{point.t}°</text></g>)}
        {hours.map((hour, index) => <rect key={`rain-${index}`} x={graph.labels[index].x - 10} y={138} width="20" height={Math.max(2, hour.precipitationProbability * .1)} rx="2" fill="currentColor" opacity=".35" />)}
      </svg>
    </div>
  );
}
