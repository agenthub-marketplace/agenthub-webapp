import { AuthFormShell } from "@/components/auth/auth-form-shell";

type SignupPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SignupPage({ searchParams }: SignupPageProps) {
  return <AuthFormShell mode="signup" locale="en" searchParams={await searchParams} />;
}
