import {
  Beaker,
  BarChart3,
  CalendarRange,
  FileText,
  Home,
  Inbox,
  Lightbulb,
  PiggyBank,
  UsersRound,
  Users,
  Video,
} from "lucide-react";

export const MAIN_NAV = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/projects", label: "Projects", icon: Beaker },
  { href: "/portfolio", label: "Portfolio", icon: BarChart3 },
  { href: "/people", label: "People", icon: Users },
  { href: "/supervision", label: "Supervision", icon: UsersRound },
  { href: "/publications", label: "Papers", icon: FileText },
  { href: "/meetings", label: "Meetings", icon: Video },
  { href: "/ideas", label: "Ideas", icon: Lightbulb },
  { href: "/grants", label: "Grants", icon: PiggyBank },
  { href: "/calendar", label: "Calendar", icon: CalendarRange },
] as const;
