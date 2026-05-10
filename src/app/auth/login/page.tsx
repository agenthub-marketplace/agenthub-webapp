import { PlaceholderPage } from "@/components/layout/placeholder-page";

export default function LoginPage() {
  return (
    <PlaceholderPage
      eyebrow="Auth"
      title="Login placeholder for Supabase Auth."
      description="This page will become the login flow for users, creators, and admins once Supabase Auth is configured."
      notes={[
        "Email and OAuth options to be decided",
        "Role-aware redirect after login",
        "No real auth flow wired in this foundation",
        "Uses environment-based Supabase clients later",
      ]}
    />
  );
}
