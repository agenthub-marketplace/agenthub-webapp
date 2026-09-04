import { ResetPasswordForm } from "@/components/auth/reset-password-form";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ResetPasswordPage({ searchParams }: PageProps) {
  return <ResetPasswordForm locale="fr" searchParams={await searchParams} />;
}
