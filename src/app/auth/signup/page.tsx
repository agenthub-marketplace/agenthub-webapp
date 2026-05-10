import { PlaceholderPage } from "@/components/layout/placeholder-page";

export default function SignupPage() {
  return (
    <PlaceholderPage
      eyebrow="Auth"
      title="Signup placeholder for marketplace accounts."
      description="This page will become the signup flow for users and creators, including creator profile onboarding later."
      notes={[
        "User and creator onboarding paths",
        "Profile creation after auth",
        "Creator verification to be handled separately",
        "No fake accounts or seeded credentials",
      ]}
    />
  );
}
