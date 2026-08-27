"use client";

import { useEffect, useState } from "react";
import type { QualityMode } from "@/types/weather";

export function OrganicWeatherMesh() {
  const [quality, setQuality] = useState<QualityMode>("auto");
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    try { const saved = localStorage.getItem("atmos-quality") as QualityMode | null; if (saved) queueMicrotask(() => setQuality(saved)); } catch { /* Automatic quality remains active. */ }
    const qualityChanged = (event: Event) => setQuality((event as CustomEvent<QualityMode>).detail);
    const visibilityChanged = () => setVisible(!document.hidden);
    window.addEventListener("atmos-quality-changed", qualityChanged);
    document.addEventListener("visibilitychange", visibilityChanged);
    return () => { window.removeEventListener("atmos-quality-changed", qualityChanged); document.removeEventListener("visibilitychange", visibilityChanged); };
  }, []);
  return <div className={`organic-atmosphere quality-${quality} ${visible ? "" : "paused"}`} aria-hidden="true">
    <i className="atmos-glow warm" /><i className="atmos-glow sky" /><i className="atmos-glow lavender" />
    <svg className="organic-mesh" viewBox="0 0 1440 1000" preserveAspectRatio="xMidYMid slice">
      <defs><radialGradient id="meshWarm"><stop offset="0" stopColor="#ffd7ad" stopOpacity=".38"/><stop offset="1" stopColor="#fff4e8" stopOpacity=".02"/></radialGradient><radialGradient id="meshCool"><stop offset="0" stopColor="#a9d9ef" stopOpacity=".3"/><stop offset="1" stopColor="#dceffd" stopOpacity=".02"/></radialGradient><pattern id="meshDots" width="17" height="17" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.1" fill="#fff" fillOpacity=".42"/></pattern></defs>
      <g className="mesh-form form-one"><path d="M-80 210C130 20 470 45 590 230S460 590 170 560-220 390-80 210Z" fill="url(#meshWarm)"/><path d="M-40 235C145 80 440 90 535 250S405 520 175 505-165 370-40 235Z" fill="url(#meshDots)" opacity=".3"/></g>
      <g className="mesh-form form-two"><path d="M850 80c250-100 560 45 650 260s-90 395-350 330-520-190-500-380S690 145 850 80Z" fill="url(#meshCool)"/><path d="M895 130c205-75 455 55 505 215s-95 290-300 240-400-150-370-280 35-120 165-175Z" fill="url(#meshDots)" opacity=".25"/></g>
      <g className="mesh-form form-three"><path d="M430 640c170-150 510-120 650 30s30 360-245 390-545-50-570-210 45-105 165-210Z" fill="url(#meshWarm)" opacity=".55"/><path d="M485 680c145-105 420-85 530 30s5 270-205 285-415-45-425-155 10-75 100-160Z" fill="url(#meshDots)" opacity=".2"/></g>
    </svg>
  </div>;
}
