import { createAuthClient } from "@neondatabase/auth";

const authUrl = process.env.VITE_NEON_AUTH_URL?.trim();
if (!authUrl) {
  console.error("Set VITE_NEON_AUTH_URL (Neon Auth base URL).");
  process.exit(1);
}

const email = process.env.AUTH_SEED_EMAIL ?? "yogi2324@gmail.com";
const password = process.env.AUTH_SEED_PASSWORD ?? "CardSyncDemo2026!";
const name = process.env.AUTH_SEED_NAME ?? "CardSync Admin";

const auth = createAuthClient(authUrl);

try {
  const result = await auth.signUp.email({
    email,
    password,
    name,
    callbackURL: "http://localhost:5173/scan",
  });

  if (result.error) {
    console.error("Sign-up failed:", result.error);
    process.exit(1);
  }

  console.log("User created successfully.");
  console.log("Email:", email);
  console.log("Password:", password);
  console.log("User ID:", result.data?.user?.id ?? "(check neon_auth.user in Neon)");
} catch (error) {
  const err = error;
  console.error("Sign-up error:", err?.message ?? error);
  if (err?.status) console.error("Status:", err.status);
  if (err?.code) console.error("Code:", err.code);
  console.error("\nIf validation_failed: enable Email sign-up in Neon Console → Auth → Configuration.");
  process.exit(1);
}
