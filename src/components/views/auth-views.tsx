import Link from "next/link";
import { LockKeyhole, UserPlus } from "lucide-react";

import { loginAction, signupAction } from "@/lib/auth/actions";
import { localizedPath, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { AppShell } from "@/components/app/app-shell";
import { PageHeader } from "@/components/app/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type AuthViewProps = {
  locale: Locale;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getSearchValue(
  params: Record<string, string | string[] | undefined> | undefined,
  key: string,
) {
  const value = params?.[key];
  return Array.isArray(value) ? value[0] : value;
}

export async function LoginView({ locale, searchParams }: AuthViewProps) {
  const t = getDictionary(locale);
  const params = searchParams ? await searchParams : undefined;
  const error = getSearchValue(params, "error");
  const action = loginAction.bind(null, locale);

  return (
    <AppShell locale={locale}>
      <div className="mx-auto max-w-xl">
        <PageHeader
          eyebrow={t.auth.loginEyebrow}
          title={t.auth.loginTitle}
          description={t.auth.loginDescription}
        />

        <Card className="rounded-lg bg-white">
          <CardHeader>
            <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-[#f2eee8] text-[#5f5a52]">
              <LockKeyhole className="size-5" aria-hidden="true" />
            </div>
            <CardTitle>{t.common.login}</CardTitle>
            {error ? (
              <p className="mt-3 rounded-lg border border-[#e9b7b7] bg-[#f8dede] p-3 text-sm text-[#8a2f2f]">
                {error === "missing-config" ? t.auth.missingConfig : error === "callback" ? t.auth.callbackError : t.auth.invalidCredentials}
              </p>
            ) : null}
            <form action={action} className="mt-4 grid gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium" htmlFor="email">
                  {t.auth.email}
                </label>
                <Input id="email" name="email" placeholder="you@example.com" required type="email" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium" htmlFor="password">
                  {t.auth.password}
                </label>
                <Input id="password" name="password" placeholder="••••••••" required type="password" />
              </div>
              <button type="submit" className={cn(buttonVariants({ size: "lg" }), "h-11 bg-[#181716]")}>
                {t.auth.loginButton}
              </button>
            </form>
            <p className="pt-2 text-sm text-[#6f675d]">
              {t.auth.noAccount}{" "}
              <Link href={localizedPath("/auth/signup", locale)} className="font-medium text-[#181716] underline">
                {t.auth.createOne}
              </Link>
            </p>
          </CardHeader>
        </Card>
      </div>
    </AppShell>
  );
}

export async function SignupView({ locale, searchParams }: AuthViewProps) {
  const t = getDictionary(locale);
  const params = searchParams ? await searchParams : undefined;
  const error = getSearchValue(params, "error");
  const status = getSearchValue(params, "status");
  const action = signupAction.bind(null, locale);

  return (
    <AppShell locale={locale}>
      <div className="mx-auto max-w-xl">
        <PageHeader
          eyebrow={t.auth.signupEyebrow}
          title={t.auth.signupTitle}
          description={t.auth.signupDescription}
        />

        <Card className="rounded-lg bg-white">
          <CardHeader>
            <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-[#f2eee8] text-[#5f5a52]">
              <UserPlus className="size-5" aria-hidden="true" />
            </div>
            <CardTitle>{t.common.signup}</CardTitle>
            {status === "check-email" ? (
              <p className="mt-3 rounded-lg border border-[#b8dccd] bg-[#dceee6] p-3 text-sm text-[#1e5d47]">
                {t.auth.checkEmail}
              </p>
            ) : null}
            {error ? (
              <p className="mt-3 rounded-lg border border-[#e9b7b7] bg-[#f8dede] p-3 text-sm text-[#8a2f2f]">
                {error === "missing-config" ? t.auth.missingConfig : t.auth.invalidCredentials}
              </p>
            ) : null}
            <form action={action} className="mt-4 grid gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium" htmlFor="name">
                  {t.auth.name}
                </label>
                <Input id="name" name="name" placeholder={t.auth.name} required type="text" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium" htmlFor="email">
                  {t.auth.email}
                </label>
                <Input id="email" name="email" placeholder="you@example.com" required type="email" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium" htmlFor="password">
                  {t.auth.password}
                </label>
                <Input id="password" name="password" placeholder="••••••••" required type="password" />
              </div>
              <fieldset>
                <legend className="mb-2 block text-sm font-medium">{t.auth.role}</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#e2dacd] bg-[#faf9f6] p-3 text-sm">
                    <input defaultChecked name="role" type="radio" value="user" />
                    {t.auth.userRole}
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#e2dacd] bg-[#faf9f6] p-3 text-sm">
                    <input name="role" type="radio" value="creator" />
                    {t.auth.creatorRole}
                  </label>
                </div>
              </fieldset>
              <button type="submit" className={cn(buttonVariants({ size: "lg" }), "h-11 bg-[#181716]")}>
                {t.auth.signupButton}
              </button>
            </form>
            <p className="pt-2 text-sm text-[#6f675d]">
              {t.auth.hasAccount}{" "}
              <Link href={localizedPath("/auth/login", locale)} className="font-medium text-[#181716] underline">
                {t.auth.loginLink}
              </Link>
            </p>
          </CardHeader>
        </Card>
      </div>
    </AppShell>
  );
}
