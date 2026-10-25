import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Fahad Laser | FLC Decor", template: "%s | Fahad Laser" },
  description: "Discover decorative laser-cut designs at Fahad Laser by FLC Decor. Browse wall decor, explore sizes and colors, and review the synthetic Cash on Delivery demo flow.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const themeBootstrap = `(() => { try { const saved = localStorage.getItem('flc-theme'); const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches; document.documentElement.dataset.theme = saved === 'dark' || saved === 'light' ? saved : prefersDark ? 'dark' : 'light'; } catch {} })()`;
  return <html lang="en" data-theme="light" data-scroll-behavior="smooth" suppressHydrationWarning><body><Script id="theme-bootstrap" strategy="beforeInteractive">{themeBootstrap}</Script>{children}</body></html>;
}
