import type { ReactNode } from "react";

type RightRailProps = {
  children: ReactNode;
  className?: string;
};

export function RightRail({ children, className }: RightRailProps) {
  return (
    <aside className={["space-y-6", className].filter(Boolean).join(" ")}>
      {children}
    </aside>
  );
}
