import { cn } from "@/lib/utils";
import type { OutreachDeliveryRecord } from "@/lib/outreachStatusStorage";
import { resolveChannelIconStatus } from "@/lib/outreachStatusStorage";

type ChannelIconProps = {
  status: "success" | "failure" | "pending";
  type: "whatsapp" | "email";
  error?: string | null;
  className?: string;
};

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <path
        d="M3.5 8.5L6.5 11.5L12.5 4.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CrossIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <path
        d="M4.5 4.5L11.5 11.5M11.5 4.5L4.5 11.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PendingIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function channelTitle(
  type: "whatsapp" | "email",
  status: ChannelIconProps["status"],
  error?: string | null,
): string {
  const label = type === "whatsapp" ? "WhatsApp" : "Email";
  if (status === "success") return `${label}: sent successfully`;
  if (status === "failure") {
    return error ? `${label} failed: ${error}` : `${label}: send failed`;
  }
  return `${label}: no send result yet`;
}

function ChannelBadge({ status, type, error, className }: ChannelIconProps) {
  const title = channelTitle(type, status, error);

  return (
    <span
      title={title}
      aria-label={title}
      className={cn(
        "inline-flex h-6 w-6 items-center justify-center rounded-md",
        status === "success"
          ? "bg-success/10 text-success"
          : status === "failure"
            ? "bg-destructive/10 text-destructive"
            : "bg-muted text-muted-foreground/60",
        className,
      )}
    >
      {status === "success" ? (
        <CheckIcon className="h-3.5 w-3.5" />
      ) : status === "failure" ? (
        <CrossIcon className="h-3.5 w-3.5" />
      ) : (
        <PendingIcon className="h-3.5 w-3.5" />
      )}
      <span className="sr-only">{title}</span>
    </span>
  );
}

type ContactChannelIconsProps = {
  phone?: string | null;
  email?: string | null;
  emailDelivery?: OutreachDeliveryRecord;
  whatsappDelivery?: OutreachDeliveryRecord;
  className?: string;
  compact?: boolean;
  showWhatsApp?: boolean;
  showEmail?: boolean;
};

/** WhatsApp + email send status from API results: check = sent, cross = failed, circle = pending. */
export function ContactChannelIcons({
  phone,
  email,
  emailDelivery,
  whatsappDelivery,
  className,
  compact = false,
  showWhatsApp = true,
  showEmail = true,
}: ContactChannelIconsProps) {
  if (!showWhatsApp && !showEmail) return null;

  const whatsappStatus = resolveChannelIconStatus(whatsappDelivery);
  const emailStatus = resolveChannelIconStatus(emailDelivery);

  if (compact) {
    return (
      <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
        {showWhatsApp ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-muted/40 px-1.5 py-0.5 text-[10px]">
            <ChannelBadge
              status={whatsappStatus}
              type="whatsapp"
              error={whatsappDelivery?.error}
              className="h-4 w-4"
            />
            <span className="text-muted-foreground">WhatsApp</span>
          </span>
        ) : null}
        {showEmail ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-muted/40 px-1.5 py-0.5 text-[10px]">
            <ChannelBadge
              status={emailStatus}
              type="email"
              error={emailDelivery?.error}
              className="h-4 w-4"
            />
            <span className="text-muted-foreground">Email</span>
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {showWhatsApp ? (
        <ChannelBadge
          status={whatsappStatus}
          type="whatsapp"
          error={whatsappDelivery?.error}
        />
      ) : null}
      {showEmail ? (
        <ChannelBadge
          status={emailStatus}
          type="email"
          error={emailDelivery?.error}
        />
      ) : null}
    </div>
  );
}
