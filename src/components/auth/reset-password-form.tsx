import Link from "next/link";

import { updatePasswordAction } from "@/lib/auth/actions";
import { localizedPath, type Locale } from "@/lib/i18n/config";
import { PasswordInput } from "@/components/auth/password-input";

type SearchParams = Record<string, string | string[] | undefined>;

type ResetPasswordFormProps = {
  locale: Locale;
  searchParams?: SearchParams;
};

const copy = {
  fr: {
    title: "Nouveau mot de passe",
    subtitle: "Choisissez un mot de passe solide pour sécuriser votre compte.",
    password: "Mot de passe",
    passwordPlaceholder: "8+ caractères, Aa, 1, @",
    passwordHelp:
      "Au moins 8 caractères avec une majuscule, une minuscule, un chiffre et un caractère spécial.",
    showPassword: "Afficher le mot de passe",
    hidePassword: "Masquer le mot de passe",
    submit: "Mettre à jour le mot de passe",
    backToLogin: "Retour à la connexion",
    missingConfig: "Configuration Supabase manquante.",
    invalid: "Impossible de mettre à jour le mot de passe. Le lien a peut-être expiré.",
    passwordPolicy:
      "Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial.",
  },
  en: {
    title: "New password",
    subtitle: "Choose a strong password to secure your account.",
    password: "Password",
    passwordPlaceholder: "8+ characters, Aa, 1, @",
    passwordHelp:
      "At least 8 characters with one uppercase letter, one lowercase letter, one number, and one special character.",
    showPassword: "Show password",
    hidePassword: "Hide password",
    submit: "Update password",
    backToLogin: "Back to sign in",
    missingConfig: "Missing Supabase configuration.",
    invalid: "Unable to update the password. The link may have expired.",
    passwordPolicy:
      "Password must contain at least 8 characters, one uppercase letter, one lowercase letter, one number, and one special character.",
  },
} as const;

function getParam(searchParams: SearchParams | undefined, key: string) {
  const value = searchParams?.[key];
  return typeof value === "string" ? value : undefined;
}

function errorMessage(searchParams: SearchParams | undefined, locale: Locale) {
  const dictionary = copy[locale];
  const error = getParam(searchParams, "error");

  if (error === "missing-config") {
    return dictionary.missingConfig;
  }

  if (error === "password-policy") {
    return dictionary.passwordPolicy;
  }

  if (error) {
    return dictionary.invalid;
  }

  return null;
}

export function ResetPasswordForm({ locale, searchParams }: ResetPasswordFormProps) {
  const dictionary = copy[locale];
  const message = errorMessage(searchParams, locale);

  return (
    <main className="min-h-screen bg-[#080612] text-[#F5F1FA]">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-12">
        <Link href={localizedPath("/", locale)} className="mb-8 inline-flex items-center gap-3 font-display text-xl font-bold">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#6B3FA0] shadow-[0_0_18px_rgba(139,92,246,0.45)]">
            AH
          </span>
          AgentHub
        </Link>

        <section className="rounded-3xl border border-[#251A40] bg-[#110D24] p-6 shadow-2xl">
          <p className="font-label mb-2 text-xs text-[#A78BCF]">AgentHub beta</p>
          <h1 className="font-display text-3xl font-bold">{dictionary.title}</h1>
          <p className="mt-2 text-sm text-[#D6C5E8]">{dictionary.subtitle}</p>

          {message && (
            <div className="mt-5 rounded-xl border border-[#EF4444]/40 bg-[#EF4444]/10 px-4 py-3 text-sm text-[#FCA5A5]">
              {message}
            </div>
          )}

          <form action={updatePasswordAction.bind(null, locale)} className="mt-6 space-y-4">
            <label className="block">
              <span className="font-label mb-1.5 block text-xs text-[#A78BCF]">{dictionary.password}</span>
              <PasswordInput
                name="password"
                autoComplete="new-password"
                minLength={8}
                pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}"
                describedBy="reset-password-help"
                placeholder={dictionary.passwordPlaceholder}
                showLabel={dictionary.showPassword}
                hideLabel={dictionary.hidePassword}
              />
              <p
                id="reset-password-help"
                className="mt-2 rounded-lg border border-[#8B5CF6]/25 bg-[#8B5CF6]/10 px-3 py-2 text-xs leading-relaxed text-[#D6C5E8]"
              >
                {dictionary.passwordHelp}
              </p>
            </label>

            <button
              type="submit"
              className="h-11 w-full rounded-xl bg-gradient-to-r from-[#6B3FA0] to-[#8B5CF6] text-sm font-semibold text-white shadow-[0_0_18px_rgba(139,92,246,0.18)] transition-all hover:from-[#7C3AED] hover:to-[#A78BCF]"
            >
              {dictionary.submit}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-[#A78BCF]">
            <Link href={localizedPath("/auth/login", locale)} className="font-semibold text-[#F5F1FA] hover:text-[#A78BCF]">
              {dictionary.backToLogin}
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
