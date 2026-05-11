import { SignupView } from "@/components/views/auth-views";

type EnglishSignupPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default function EnglishSignupPage({ searchParams }: EnglishSignupPageProps) {
  return <SignupView locale="en" searchParams={searchParams} />;
}
