type IconName = "search" | "user" | "menu" | "close" | "arrow-up-right" | "arrow-right" | "sun" | "moon";

const paths: Record<IconName, React.ReactNode> = {
  search: <><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></>,
  user: <><circle cx="12" cy="8" r="3.5" /><path d="M5.5 20c.7-3.4 2.9-5.2 6.5-5.2s5.8 1.8 6.5 5.2" /></>,
  menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
  close: <><path d="m6 6 12 12M18 6 6 18" /></>,
  "arrow-up-right": <><path d="M7 17 17 7M8 7h9v9" /></>,
  "arrow-right": <><path d="M4 12h15M13 6l6 6-6 6" /></>,
  sun: <><circle cx="12" cy="12" r="3.5" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4" /></>,
  moon: <path d="M19.4 15.2A7.6 7.6 0 0 1 8.8 4.6 7.7 7.7 0 1 0 19.4 15.2Z" />,
};

export function Icon({ name }: { name: IconName }) {
  return <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" className="icon" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}
