import type { Metadata, Viewport } from "next";
import "./globals.css";
import { StickyGlassHeader } from "@/components/navigation/StickyGlassHeader";
import { OrganicWeatherMesh } from "@/components/background/OrganicWeatherMesh";
import { PageTransition } from "@/components/navigation/PageTransition";
import { ThemeProvider } from "@/components/theme/ThemeProvider";

export const metadata: Metadata = {
  metadataBase: new URL("https://atmos-auckland-weather.arshdeepsingh3105200.chatgpt.site"),
  title: { default: "Atmos Weather App", template: "%s · Atmos Weather" },
  description: "A cinematic, live weather window for Auckland and beyond.",
  applicationName: "Atmos Weather",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Atmos" },
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  openGraph: { title: "Atmos Weather App", description: "A calmer, more personal way to see Auckland weather.", type: "website", images: [{ url: "/og.png", width: 1200, height: 630, alt: "Hello Saksham — a calmer way to see Auckland weather" }] },
  twitter: { card: "summary_large_image", title: "Atmos Weather App", description: "A calmer, more personal way to see Auckland weather.", images: ["/og.png"] },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 1, viewportFit: "cover", themeColor: "#497da6" };

const themeInitialization = `(function(){try{var p=localStorage.getItem('atmos-theme');if(p!=='light'&&p!=='dark'&&p!=='system')p='dark';var t=p==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):p;var r=document.documentElement;r.dataset.theme=t;r.style.colorScheme=t;var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',t==='light'?'#d9e7eb':'#497da6')}catch(e){document.documentElement.dataset.theme='dark';document.documentElement.style.colorScheme='dark'}})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en-NZ" data-theme="dark" suppressHydrationWarning data-scroll-behavior="smooth"><body suppressHydrationWarning><script dangerouslySetInnerHTML={{ __html: themeInitialization }} /><ThemeProvider><OrganicWeatherMesh /><StickyGlassHeader /><PageTransition>{children}</PageTransition></ThemeProvider></body></html>;
}
