import type { ReactNode } from "react";
import { SiteHeader } from "./site-header";
import { Footer } from "./footer";
import { InkThemeTransition } from "./ink-theme-transition";

export function PageShell({ children }: { children: ReactNode }) { return <><SiteHeader databaseCatalog={process.env.CATALOG_RUNTIME === "database"} /><main>{children}</main><Footer /><InkThemeTransition /></>; }
