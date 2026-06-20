import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { authClient } from "@/auth";
import { AuthField } from "@/components/auth/AuthField";
import { resolvePostAuthPath } from "@/components/auth/AuthGate";
import { clearAuthTokenCache } from "@/lib/authSession";
import { neonAuthConfigIssue, neonAuthUrl } from "@/lib/authConfig";
import { PRODUCT_TAGLINE } from "@/constants/navigation";
import { cn } from "@/lib/utils";

type AuthMode = "sign-in" | "sign-up";

const signInSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  rememberMe: z.boolean().optional(),
});

const signUpSchema = z
  .object({
    name: z.string().min(2, "Enter your full name"),
    email: z.string().email("Enter a valid email"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type SignInValues = z.infer<typeof signInSchema>;
type SignUpValues = z.infer<typeof signUpSchema>;

const copy: Record<
  AuthMode,
  {
    title: string;
    subtitle: string;
    submit: string;
    footer?: { text: string; linkText: string; pathname: "sign-in" | "sign-up" };
  }
> = {
  "sign-in": {
    title: "Welcome back",
    subtitle: "Sign in to continue scanning and syncing contacts.",
    submit: "Log in",
    footer: { text: "Don't have an account?", linkText: "Sign up", pathname: "sign-up" },
  },
  "sign-up": {
    title: "Create account",
    subtitle: "Get started in under a minute — no credit card required.",
    submit: "Create account",
    footer: { text: "Already have an account?", linkText: "Log in", pathname: "sign-in" },
  },
};

function extractErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    const record = error as { message?: string; error?: { message?: string } };
    const message = record.error?.message ?? record.message ?? "";
    if (/failed to fetch|networkerror|name not resolved|err_name_not_resolved/i.test(message)) {
      const hint = neonAuthConfigIssue
        ? neonAuthConfigIssue
        : `Current auth URL: ${neonAuthUrl || "(not set)"}. Restart \`npm run dev\` after editing frontend/.env.`;
      return `Cannot reach Neon Auth (sign-up uses Neon, not Brevo). ${hint}`;
    }
    if (record.error?.message) return record.error.message;
    if (record.message) return record.message;
  }
  return "Something went wrong. Please try again.";
}

export function AuthCredentialsForm({ mode }: { mode: AuthMode }) {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const signInForm = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "", rememberMe: true },
  });

  const signUpForm = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });

  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (!isPending && session?.user) {
      navigate({ to: resolvePostAuthPath(), replace: true });
    }
  }, [isPending, session?.user, navigate]);

  const onSignIn = async (values: SignInValues) => {
    setSubmitting(true);
    try {
      const result = await authClient.signIn.email({
        email: values.email.trim(),
        password: values.password,
        rememberMe: values.rememberMe ?? true,
        callbackURL: "/scan",
      });

      if (result.error) {
        toast.error(extractErrorMessage(result.error));
        return;
      }

      clearAuthTokenCache();
      toast.success("Welcome back!");
      await authClient.getSession();
    } catch (error) {
      toast.error(extractErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const onSignUp = async (values: SignUpValues) => {
    setSubmitting(true);
    try {
      const result = await authClient.signUp.email({
        name: values.name.trim(),
        email: values.email.trim(),
        password: values.password,
        callbackURL: "/scan",
      });

      if (result.error) {
        toast.error(extractErrorMessage(result.error));
        return;
      }

      clearAuthTokenCache();
      toast.success("Account created! You're signed in.");
      await authClient.getSession();
    } catch (error) {
      toast.error(extractErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const content = copy[mode];

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
          {content.title}
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">{content.subtitle}</p>
      </div>

      {mode === "sign-in" ? (
        <form className="space-y-5" onSubmit={signInForm.handleSubmit(onSignIn)} noValidate>
          <AuthField
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            error={signInForm.formState.errors.email?.message}
            {...signInForm.register("email")}
          />

          <div className="relative">
            <AuthField
              label="Password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              error={signInForm.formState.errors.password?.message}
              className="pr-11"
              {...signInForm.register("password")}
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

          <div className="flex items-center justify-between gap-3 text-sm">
            <label className="flex cursor-pointer items-center gap-2 text-muted-foreground">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-border accent-primary"
                {...signInForm.register("rememberMe")}
              />
              Remember me
            </label>
            <Link
              to="/auth/$pathname"
              params={{ pathname: "forgot-password" }}
              className="font-medium text-primary transition-colors hover:text-primary/80"
            >
              Forgot password?
            </Link>
          </div>

          <SubmitButton loading={submitting} label={content.submit} />
        </form>
      ) : null}

      {mode === "sign-up" ? (
        <form className="space-y-4" onSubmit={signUpForm.handleSubmit(onSignUp)} noValidate>
          <AuthField
            label="Full name"
            autoComplete="name"
            placeholder="Jane Smith"
            error={signUpForm.formState.errors.name?.message}
            {...signUpForm.register("name")}
          />
          <AuthField
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            error={signUpForm.formState.errors.email?.message}
            {...signUpForm.register("email")}
          />

          <div className="relative">
            <AuthField
              label="Password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              error={signUpForm.formState.errors.password?.message}
              className="pr-11"
              {...signUpForm.register("password")}
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
              label="Confirm password"
              type={showConfirm ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Repeat password"
              error={signUpForm.formState.errors.confirmPassword?.message}
              className="pr-11"
              {...signUpForm.register("confirmPassword")}
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

          <SubmitButton loading={submitting} label={content.submit} />
        </form>
      ) : null}

      {content.footer ? (
        <p className="mt-7 text-center text-sm text-muted-foreground">
          {content.footer.text}{" "}
          <Link
            to="/auth/$pathname"
            params={{ pathname: content.footer.pathname }}
            className="font-semibold text-primary transition-colors hover:text-primary/80"
          >
            {content.footer.linkText}
          </Link>
        </p>
      ) : null}
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
