import { LoginView } from "@/components/views/auth-views";

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default function LoginPage({ searchParams }: LoginPageProps) {
  return <LoginView locale="fr" searchParams={searchParams} />;
}
