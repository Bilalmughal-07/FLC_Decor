"use client";

import { useSyncExternalStore } from "react";
import { Icon } from "./icon";

function readTheme() { return typeof document === "undefined" ? "light" : document.documentElement.dataset.theme === "dark" ? "dark" : "light"; }
function subscribeTheme(onStoreChange: () => void) { window.addEventListener("flc-theme-change", onStoreChange); return () => window.removeEventListener("flc-theme-change", onStoreChange); }
export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribeTheme, readTheme, () => "light");
  function toggle(event: React.MouseEvent<HTMLButtonElement>) { const rect = event.currentTarget.getBoundingClientRect(); const point = Number.isFinite(event.clientX) && Number.isFinite(event.clientY) && (event.clientX !== 0 || event.clientY !== 0) ? { x: event.clientX, y: event.clientY } : { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }; const handled = window.dispatchEvent(new CustomEvent("flc-theme-toggle", { cancelable: true, detail: { point } })); if (handled) { const next = theme === "dark" ? "light" : "dark"; document.documentElement.dataset.theme = next; localStorage.setItem("flc-theme", next); window.dispatchEvent(new Event("flc-theme-change")); } }
  return <button className="theme-toggle" type="button" onClick={toggle} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`} aria-pressed={theme === "dark"} data-theme-toggle>{theme === "dark" ? <Icon name="sun" /> : <Icon name="moon" />}</button>;
}
