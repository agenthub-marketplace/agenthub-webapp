import { SignupView } from "@/components/views/auth-views";

type SignupPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default function SignupPage({ searchParams }: SignupPageProps) {
  return <SignupView locale="fr" searchParams={searchParams} />;
}
