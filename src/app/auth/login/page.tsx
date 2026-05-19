import { AuthFormShell } from "@/components/auth/auth-form-shell";

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  return <AuthFormShell mode="login" locale="fr" searchParams={await searchParams} />;
}
