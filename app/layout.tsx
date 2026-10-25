import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Fahad Laser | FLC Decor", description: "Precision-cut decor for beautiful spaces. A local synthetic demo storefront for FLC Decor." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" data-theme="light"><body>{children}</body></html>;
}
