import { PageShell } from "@/components/page-shell";
import { CartClient } from "./cart-client";
export default function CartPage() { return <PageShell><CartClient databaseCatalog={process.env.CATALOG_RUNTIME === "database"} /></PageShell>; }
