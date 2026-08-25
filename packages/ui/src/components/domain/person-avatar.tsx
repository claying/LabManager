import { Avatar, AvatarFallback, AvatarImage } from "../avatar";
import { cn } from "../../lib/utils";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

export function PersonAvatar({
  name,
  avatarUrl,
  className,
  size = "default",
}: {
  name: string;
  avatarUrl?: string | null;
  className?: string;
  size?: "sm" | "default" | "lg";
}) {
  return (
    <Avatar className={cn(size === "sm" && "h-6 w-6", size === "lg" && "h-14 w-14", className)}>
      {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
      <AvatarFallback className={cn(size === "lg" && "text-lg")}>{initials(name)}</AvatarFallback>
    </Avatar>
  );
}
