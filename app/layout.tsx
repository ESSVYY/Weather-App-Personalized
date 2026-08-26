import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Atmos — Auckland Weather",
  description: "A cinematic, live weather window for Auckland and beyond.",
  applicationName: "Atmos Weather",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Atmos" },
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 1, viewportFit: "cover", themeColor: "#497da6" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en-NZ"><body>{children}</body></html>;
}
