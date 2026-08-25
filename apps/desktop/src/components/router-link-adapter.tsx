import type { ReactNode } from "react";
import { Link } from "react-router-dom";

export function RouterLinkAdapter({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link to={href} className={className}>
      {children}
    </Link>
  );
}
