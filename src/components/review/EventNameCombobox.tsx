import { forwardRef, useId } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { listEventNames, getExampleEventName } from "@/lib/eventStorage";

type EventNameComboboxProps = {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
};

export const EventNameCombobox = forwardRef<HTMLInputElement, EventNameComboboxProps>(
  function EventNameCombobox(
    { value, onChange, error, disabled = false },
    ref,
  ) {
  const listId = useId();
  const eventNames = listEventNames();

  return (
    <div className="space-y-2">
      <label htmlFor={listId} className="text-sm font-medium text-foreground">
        Event name <span className="font-normal text-muted-foreground">(optional)</span>
      </label>
      <Input
        ref={ref}
        id={listId}
        name="eventName"
        type="text"
        list={eventNames.length > 0 ? `${listId}-events` : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`Type event name (e.g. ${getExampleEventName()})`}
        disabled={disabled}
        autoComplete="off"
        className={cn(
          "h-11 rounded-sm border-border/60 bg-background",
          error && "border-destructive/60",
        )}
      />
      {eventNames.length > 0 ? (
        <datalist id={`${listId}-events`}>
          {eventNames.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      ) : null}
      <p className="text-xs text-muted-foreground">
        Optional. When set, saved to Zoho Features as Event name. Events page groups leads by this event.
      </p>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
  },
);
