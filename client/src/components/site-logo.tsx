import { cn } from "@/lib/utils";

const LOGO_URL =
  "https://res.cloudinary.com/de2wrwg6e/image/upload/v1773912025/header_logo-removebg-preview_1_dym01r.png";

interface SiteLogoProps {
  className?: string;
}

export function SiteLogo({ className }: SiteLogoProps) {
  return (
    <img
      src={LOGO_URL}
      alt="Strivo"
      className={cn(
        "w-auto object-contain",
        "dark:brightness-0 dark:invert",
        className
      )}
    />
  );
}
