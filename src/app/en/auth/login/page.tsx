import { LoginView } from "@/components/views/auth-views";

type EnglishLoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default function EnglishLoginPage({ searchParams }: EnglishLoginPageProps) {
  return <LoginView locale="en" searchParams={searchParams} />;
}
