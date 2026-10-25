import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Fahad Laser | FLC Decor", template: "%s | Fahad Laser" },
  description: "Discover decorative laser-cut designs at Fahad Laser by FLC Decor. Browse wall decor, explore sizes and colors, and review the synthetic Cash on Delivery demo flow.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" data-theme="light"><body>{children}</body></html>;
}
