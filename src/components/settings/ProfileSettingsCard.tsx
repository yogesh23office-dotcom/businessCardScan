import { type ReactNode } from "react";
import { Building2, Clock, Loader2, Mail, Phone, User } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TIMEZONE_OPTIONS, type UserSettings } from "@/lib/settingsStorage";

type ProfileSettingsCardProps = {
  profile: UserSettings;
  initials: string;
  isSaving: boolean;
  onChange: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => void;
  onSave: () => void;
};

function Field({
  id,
  label,
  icon,
  children,
  className,
}: {
  id: string;
  label: string;
  icon: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label htmlFor={id} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <span className="text-primary/80">{icon}</span>
        {label}
      </Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

export function ProfileSettingsCard({
  profile,
  initials,
  isSaving,
  onChange,
  onSave,
}: ProfileSettingsCardProps) {
  const displayName = profile.fullName.trim() || "Your name";
  const subtitle = [profile.role, profile.company].filter(Boolean).join(" · ");

  return (
    <Card className="overflow-hidden rounded-2xl border-border/60 shadow-soft lg:col-span-2">
      <div className="relative border-b border-border/60 bg-gradient-to-br from-primary/8 via-card to-violet-500/5 px-5 py-6 sm:px-8 sm:py-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-6">
          <div className="relative mx-auto shrink-0 sm:mx-0">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-primary text-2xl font-semibold text-primary-foreground shadow-glow sm:h-24 sm:w-24">
              {initials}
            </div>
            <span className="absolute -bottom-1 -right-1 rounded-full border-2 border-background bg-green-500 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
              Local
            </span>
          </div>
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Your profile
            </p>
            <h2 className="mt-1 font-display text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              {displayName}
            </h2>
            {profile.email ? (
              <p className="mt-1 truncate text-sm text-muted-foreground">{profile.email}</p>
            ) : null}
            {subtitle ? (
              <p className="mt-2 text-xs text-muted-foreground">{subtitle}</p>
            ) : null}
            <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
              {profile.company ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/80 px-2.5 py-1 text-[11px] font-medium text-foreground/90">
                  <Building2 className="h-3 w-3 text-primary" />
                  {profile.company}
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/80 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                <Clock className="h-3 w-3" />
                {profile.timezone}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6 p-5 sm:p-8">
        <section>
          <h3 className="text-sm font-medium text-foreground">Personal</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Shown in the header and on your Capture greeting.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field id="profile-fullName" label="Full name" icon={<User className="h-3.5 w-3.5" />}>
              <Input
                id="profile-fullName"
                value={profile.fullName}
                onChange={(e) => onChange("fullName", e.target.value)}
                className="h-10 rounded-md border-border/60 bg-background"
                placeholder="Yogesh VR"
              />
            </Field>
            <Field id="profile-email" label="Email" icon={<Mail className="h-3.5 w-3.5" />}>
              <Input
                id="profile-email"
                type="email"
                value={profile.email}
                onChange={(e) => onChange("email", e.target.value)}
                className="h-10 rounded-md border-border/60 bg-background"
                placeholder="you@company.com"
              />
            </Field>
            <Field
              id="profile-phone"
              label="Phone"
              icon={<Phone className="h-3.5 w-3.5" />}
              className="sm:col-span-2"
            >
              <Input
                id="profile-phone"
                type="tel"
                value={profile.phone}
                onChange={(e) => onChange("phone", e.target.value)}
                className="h-10 rounded-md border-border/60 bg-background"
                placeholder="+91 XXXXX XXXXX"
              />
            </Field>
          </div>
        </section>

        <div className="h-px bg-border/60" />

        <section>
          <h3 className="text-sm font-medium text-foreground">Work</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Optional details for cards and contact context.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field id="profile-company" label="Company" icon={<Building2 className="h-3.5 w-3.5" />}>
              <Input
                id="profile-company"
                value={profile.company}
                onChange={(e) => onChange("company", e.target.value)}
                className="h-10 rounded-md border-border/60 bg-background"
                placeholder="Your organisation"
              />
            </Field>
            <Field id="profile-role" label="Role" icon={<User className="h-3.5 w-3.5" />}>
              <Input
                id="profile-role"
                value={profile.role}
                onChange={(e) => onChange("role", e.target.value)}
                className="h-10 rounded-md border-border/60 bg-background"
                placeholder="Workspace owner"
              />
            </Field>
            <Field
              id="profile-timezone"
              label="Timezone"
              icon={<Clock className="h-3.5 w-3.5" />}
              className="sm:col-span-2"
            >
              <Select
                value={profile.timezone}
                onValueChange={(value) => onChange("timezone", value)}
              >
                <SelectTrigger
                  id="profile-timezone"
                  className="h-10 w-full rounded-md border-border/60 bg-background"
                >
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONE_OPTIONS.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        </section>

        <div className="flex flex-col-reverse gap-3 border-t border-border/60 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-center text-[11px] text-muted-foreground sm:text-left">
            Profile data is stored only in this browser.
          </p>
          <Button
            onClick={onSave}
            disabled={isSaving}
            className="w-full rounded-xl bg-gradient-primary shadow-glow sm:w-auto sm:min-w-[140px]"
          >
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isSaving ? "Saving…" : "Save profile"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
