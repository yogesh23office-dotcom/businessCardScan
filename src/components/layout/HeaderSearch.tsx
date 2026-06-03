import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type HeaderSearchProps = {
  className?: string;
  value?: string;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
};

export function HeaderSearch({
  className,
  value,
  onChange,
  onSubmit,
}: HeaderSearchProps) {
  return (
    <form
      className={cn("relative w-full", className)}
      onSubmit={(e) => {
        e.preventDefault();
        const q = (e.currentTarget.elements.namedItem("header-search") as HTMLInputElement)
          ?.value;
        onSubmit?.(q?.trim() ?? "");
      }}
    >
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        id="header-search"
        name="header-search"
        type="search"
        placeholder="Search contacts, companies, queue…"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="h-9 w-full rounded-md border-border/60 bg-white pl-9 text-sm text-foreground shadow-none focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-border/80 dark:bg-white dark:focus-visible:bg-white"
        aria-label="Search contacts, companies, and queue"
      />
    </form>
  );
}
