import { forwardRef } from "react";
import { cn } from "@/lib/utils";

type AuthUnderlineInputProps = React.ComponentProps<"input"> & {
  label: string;
  error?: string;
};

export const AuthUnderlineInput = forwardRef<HTMLInputElement, AuthUnderlineInputProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="space-y-2">
        <label htmlFor={inputId} className="text-sm font-medium text-foreground/90">
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "w-full border-0 border-b border-border/80 bg-transparent px-0 pb-2.5 pt-1 text-base text-foreground outline-none transition-colors",
            "placeholder:text-muted-foreground/70 focus:border-primary",
            error && "border-destructive focus:border-destructive",
            className,
          )}
          {...props}
        />
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </div>
    );
  },
);

AuthUnderlineInput.displayName = "AuthUnderlineInput";
