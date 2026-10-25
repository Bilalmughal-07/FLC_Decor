"use client";

import { useSyncExternalStore } from "react";

function readTheme() { return typeof document === "undefined" ? "light" : document.documentElement.dataset.theme === "dark" ? "dark" : "light"; }
function subscribeTheme(onStoreChange: () => void) { window.addEventListener("flc-theme-change", onStoreChange); return () => window.removeEventListener("flc-theme-change", onStoreChange); }
export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribeTheme, readTheme, () => "light");
  function toggle() { const next = theme === "dark" ? "light" : "dark"; document.documentElement.dataset.theme = next; localStorage.setItem("flc-theme", next); window.dispatchEvent(new Event("flc-theme-change")); }
  return <button className="theme-toggle" onClick={toggle} aria-label="Toggle light and dark theme">{theme === "dark" ? "☼" : "◐"}</button>;
}
