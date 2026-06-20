import { cn } from "@/lib/utils";

const LOGO_SRC = "/logo.png";

const sizeClasses = {
  xs: "h-8 w-8",
  sm: "h-9 w-9",
  md: "h-10 w-10",
  lg: "h-12 w-12",
  xl: "h-16 w-16",
} as const;

type AppLogoProps = {
  size?: keyof typeof sizeClasses;
  className?: string;
  imageClassName?: string;
  alt?: string;
};

export function AppLogo({
  size = "sm",
  className,
  imageClassName,
  alt = "CardScan",
}: AppLogoProps) {
  return (
    <div className={cn("shrink-0", className)}>
      <img
        src={LOGO_SRC}
        alt={alt}
        className={cn("object-contain", sizeClasses[size], imageClassName)}
      />
    </div>
  );
}

export const APP_FAVICON = "/favicon.png";
