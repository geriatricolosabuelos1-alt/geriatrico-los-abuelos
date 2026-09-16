type IconProps = { className?: string };

const ICON_SVG = {
  grid: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
  users:
    "M9 8a3.2 3.2 0 1 0 0-6.4A3.2 3.2 0 0 0 9 8ZM3 20c0-3.6 2.8-6 6-6s6 2.4 6 6M17.5 9a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8ZM15.6 14.3c2.5.3 4.4 2.4 4.4 5.7",
  pill: "M3.5 9h17v6h-17zM9 9.5l6 5",
  shield: "M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6zM9 12l2 2 4-4",
  utensils:
    "M7 2v8M5 2v5a2 2 0 0 0 2 2 2 2 0 0 0 2-2V2M7 12v10M16 2c-1.7 0-3 2-3 5s1.3 5 3 5v9",
  coin: "M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17ZM12 7.5v9M9.5 9.7c0-1.3 1.1-2.2 2.5-2.2s2.5.8 2.5 2c0 3-5 1.6-5 4.5 0 1.2 1.1 2 2.5 2s2.5-.9 2.5-2.2",
  box: "M3.5 7.5 12 3l8.5 4.5V17L12 21.5 3.5 17ZM3.7 7.5 12 12l8.3-4.5M12 12v9.4",
  receipt: "M6 3h12v18l-2.5-1.6L13 21l-2.5-1.6L8 21l-2-1.6ZM9 8h6M9 12h6",
  wallet:
    "M3.5 7.5h14A2.5 2.5 0 0 1 20 10v8a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 18V6.5A2.5 2.5 0 0 1 6.5 4H16M16.2 13.5a.1.1 0 1 0 0 .2.1.1 0 0 0 0-.2Z",
  chart: "M4 20V10M11 20V4M18 20v-7M3 20h18",
  scale: "M12 3v18M8 21h8M5 7h5M14 7h5M5 7l-3 6a3 3 0 0 0 6 0ZM19 7l-3 6a3 3 0 0 0 6 0Z",
  badge:
    "M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1ZM12 12.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM8.5 17c.6-1.7 1.9-2.5 3.5-2.5s2.9.8 3.5 2.5",
  key: "M14.5 3a5.5 5.5 0 1 0 3.2 10L21 16.2l-1.8 1.8-1.3-1.3-1.8 1.8-2-2 1.7-1.7A5.5 5.5 0 0 0 14.5 3ZM12.8 8.7a1.7 1.7 0 1 0 3.4 0 1.7 1.7 0 0 0-3.4 0Z",
} as const;

export type SidebarIconName = keyof typeof ICON_SVG;

export function SidebarIcon({
  name,
  className = "h-4 w-4",
}: IconProps & { name: SidebarIconName }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`flex-shrink-0 ${className}`}
      aria-hidden="true"
    >
      <path d={ICON_SVG[name]} />
    </svg>
  );
}
