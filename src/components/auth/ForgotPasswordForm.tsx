import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { AuthField } from "@/components/auth/AuthField";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { PRODUCT_TAGLINE } from "@/constants/navigation";
import { confirmPasswordReset, sendPasswordResetOtp } from "@/lib/passwordResetApi";
import { cn } from "@/lib/utils";

const emailSchema = z.object({
  email: z.string().email("Enter a valid email"),
});

const resetSchema = z
  .object({
    otp: z.string().length(6, "Enter the 6-digit code"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type EmailValues = z.infer<typeof emailSchema>;
type ResetValues = z.infer<typeof resetSchema>;

type Step = "email" | "reset";

export function ForgotPasswordForm() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [otp, setOtp] = useState("");

  const emailForm = useForm<EmailValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });

  const resetForm = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { otp: "", password: "", confirmPassword: "" },
  });

  const onSendOtp = async (values: EmailValues) => {
    setSubmitting(true);
    try {
      const result = await sendPasswordResetOtp(values.email);
      setEmail(values.email.trim());
      setStep("reset");
      setOtp("");
      resetForm.reset({ otp: "", password: "", confirmPassword: "" });
      toast.success(result.message || "Verification code sent.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send code.");
    } finally {
      setSubmitting(false);
    }
  };

  const onConfirmReset = async (values: ResetValues) => {
    setSubmitting(true);
    try {
      const result = await confirmPasswordReset({
        email,
        otp: values.otp,
        password: values.password,
        confirmPassword: values.confirmPassword,
      });
      toast.success(result.message || "Password updated.");
      navigate({ to: "/auth/$pathname", params: { pathname: "sign-in" }, replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not reset password.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full min-w-0 max-w-lg rounded-2xl bg-white px-6 py-8 shadow-sm sm:px-8 sm:py-10">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="leading-tight">
          <div className="font-display text-lg font-semibold tracking-tight text-[#1e3a5f]">
            CardSync AI
          </div>
          <div className="text-[11px] text-muted-foreground">{PRODUCT_TAGLINE}</div>
        </div>
      </div>

      <div className="mb-7 space-y-1.5">
        <h1 className="font-display text-2xl font-bold tracking-tight text-[#1e3a5f] sm:text-3xl">
          Reset password
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {step === "email"
            ? "Enter your email and we'll send a 6-digit verification code."
            : `Enter the code sent to ${email} and choose a new password.`}
        </p>
      </div>

      {step === "email" ? (
        <form className="space-y-5" onSubmit={emailForm.handleSubmit(onSendOtp)} noValidate>
          <AuthField
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            error={emailForm.formState.errors.email?.message}
            {...emailForm.register("email")}
          />
          <SubmitButton loading={submitting} label="Send verification code" />
        </form>
      ) : (
        <form
          className="space-y-5"
          onSubmit={resetForm.handleSubmit(onConfirmReset)}
          noValidate
        >
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#1e3a5f]/90">Verification code</label>
            <InputOTP
              maxLength={6}
              value={otp}
              onChange={(value) => {
                setOtp(value);
                resetForm.setValue("otp", value, { shouldValidate: true });
              }}
            >
              <InputOTPGroup className="w-full justify-between gap-2">
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <InputOTPSlot
                    key={index}
                    index={index}
                    className="h-11 w-11 rounded-xl border-slate-200 text-base"
                  />
                ))}
              </InputOTPGroup>
            </InputOTP>
            {resetForm.formState.errors.otp?.message ? (
              <p className="text-xs text-destructive">{resetForm.formState.errors.otp.message}</p>
            ) : null}
          </div>

          <div className="relative">
            <AuthField
              label="New password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              error={resetForm.formState.errors.password?.message}
              className="pr-11"
              {...resetForm.register("password")}
            />
            <button
              type="button"
              className="absolute right-3 top-[2.125rem] text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <div className="relative">
            <AuthField
              label="Confirm new password"
              type={showConfirm ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Repeat new password"
              error={resetForm.formState.errors.confirmPassword?.message}
              className="pr-11"
              {...resetForm.register("confirmPassword")}
            />
            <button
              type="button"
              className="absolute right-3 top-[2.125rem] text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => setShowConfirm((v) => !v)}
              aria-label={showConfirm ? "Hide password" : "Show password"}
            >
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <SubmitButton loading={submitting} label="Update password" />

          <button
            type="button"
            className="w-full text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
            onClick={() => {
              setStep("email");
              setOtp("");
            }}
          >
            Use a different email
          </button>
        </form>
      )}

      <p className="mt-7 text-center text-sm text-muted-foreground">
        Remember your password?{" "}
        <Link
          to="/auth/$pathname"
          params={{ pathname: "sign-in" }}
          className="font-semibold text-primary transition-colors hover:text-primary/80"
        >
          Back to login
        </Link>
      </p>
    </div>
  );
}

function SubmitButton({ loading, label }: { loading: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className={cn(
        "mt-1 flex h-12 w-full items-center justify-center rounded-xl bg-gradient-primary text-sm font-semibold text-primary-foreground shadow-glow transition-all",
        "hover:opacity-95 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60",
      )}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : label}
    </button>
  );
}
