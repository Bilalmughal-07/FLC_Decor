export type CartLine = { variantId: string; quantity: number };
const key = "flc-cart";
export function readCart() { return typeof window === "undefined" ? "[]" : window.localStorage.getItem(key) ?? "[]"; }
export function subscribeCart(onChange: () => void) { window.addEventListener("flc-cart-change", onChange); window.addEventListener("storage", onChange); return () => { window.removeEventListener("flc-cart-change", onChange); window.removeEventListener("storage", onChange); }; }
export function parseCart(value: string): CartLine[] {
  try { const data = JSON.parse(value) as unknown; return Array.isArray(data) ? data.filter((item): item is CartLine => Boolean(item && typeof item === "object" && typeof item.variantId === "string" && Number.isInteger(item.quantity) && item.quantity > 0 && item.quantity <= 99)).slice(0, 30) : []; }
  catch { return []; }
}
export function writeCart(lines: CartLine[]) {
  if (typeof window === "undefined") return;
  const clean = parseCart(JSON.stringify(lines));
  window.localStorage.setItem(key, JSON.stringify(clean));
  window.localStorage.setItem("flc-cart-count", String(clean.reduce((sum, item) => sum + item.quantity, 0)));
  window.dispatchEvent(new Event("flc-cart-change"));
}
