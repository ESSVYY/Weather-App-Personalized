import type { Metadata, Viewport } from "next";
import "./globals.css";
import { StickyGlassHeader } from "@/components/navigation/StickyGlassHeader";
import { OrganicWeatherMesh } from "@/components/background/OrganicWeatherMesh";
import { PageTransition } from "@/components/navigation/PageTransition";

export const metadata: Metadata = {
  metadataBase: new URL("https://atmos-auckland-weather.arshdeepsingh3105200.chatgpt.site"),
  title: { default: "Atmos — Auckland Weather", template: "%s · Atmos Weather" },
  description: "A cinematic, live weather window for Auckland and beyond.",
  applicationName: "Atmos Weather",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Atmos" },
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  openGraph: { title: "Atmos — Auckland Weather", description: "A calmer, more personal way to see Auckland weather.", type: "website", images: [{ url: "/og.png", width: 1200, height: 630, alt: "Hello Saksham — a calmer way to see Auckland weather" }] },
  twitter: { card: "summary_large_image", title: "Atmos — Auckland Weather", description: "A calmer, more personal way to see Auckland weather.", images: ["/og.png"] },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 1, viewportFit: "cover", themeColor: "#497da6" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en-NZ" suppressHydrationWarning data-scroll-behavior="smooth"><body suppressHydrationWarning><OrganicWeatherMesh /><StickyGlassHeader /><PageTransition>{children}</PageTransition></body></html>;
}
