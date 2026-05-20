import Link from "next/link";
import type { Locale } from "@/lib/i18n/config";
import { localizedPath } from "@/lib/i18n/config";
import { loginAction, signupAction } from "@/lib/auth/actions";
import { PasswordInput } from "@/components/auth/password-input";

type SearchParams = Record<string, string | string[] | undefined>;

type AuthFormShellProps = {
  mode: "login" | "signup";
  locale: Locale;
  searchParams?: SearchParams;
};

const copy = {
  fr: {
    loginTitle: "Se connecter",
    signupTitle: "Créer un compte",
    loginSubtitle: "Accédez à votre espace AgentHub sécurisé.",
    signupSubtitle: "Créez un profil utilisateur ou créateur pour la beta.",
    name: "Nom",
    email: "Email",
    password: "Mot de passe",
    passwordPlaceholder: "8+ caractères, Aa, 1, @",
    passwordHelp:
      "Au moins 8 caractères avec une majuscule, une minuscule, un chiffre et un caractère spécial.",
    showPassword: "Afficher le mot de passe",
    hidePassword: "Masquer le mot de passe",
    role: "Type de compte",
    user: "Utilisateur",
    creator: "Créateur",
    submitLogin: "Se connecter",
    submitSignup: "Créer mon compte",
    toSignup: "Pas encore de compte ?",
    toLogin: "Déjà inscrit ?",
    signupLink: "Créer un compte",
    loginLink: "Se connecter",
    checkEmail: "Compte créé. Confirmez votre email avant de vous connecter.",
    invalid: "Identifiants invalides ou inscription impossible.",
    emailUsed: "Cet email est déjà utilisé. Connectez-vous ou utilisez une autre adresse.",
    missingConfig: "Configuration Supabase manquante.",
    callback: "La confirmation email a échoué. Réessayez.",
    passwordPolicy:
      "Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial.",
    note: "L’authentification Supabase est active. Les rôles admin restent attribués manuellement.",
  },
  en: {
    loginTitle: "Sign in",
    signupTitle: "Create account",
    loginSubtitle: "Access your secure AgentHub workspace.",
    signupSubtitle: "Create a user or creator profile for the beta.",
    name: "Name",
    email: "Email",
    password: "Password",
    passwordPlaceholder: "8+ characters, Aa, 1, @",
    passwordHelp:
      "At least 8 characters with one uppercase letter, one lowercase letter, one number, and one special character.",
    showPassword: "Show password",
    hidePassword: "Hide password",
    role: "Account type",
    user: "User",
    creator: "Creator",
    submitLogin: "Sign in",
    submitSignup: "Create account",
    toSignup: "No account yet?",
    toLogin: "Already registered?",
    signupLink: "Create account",
    loginLink: "Sign in",
    checkEmail: "Account created. Confirm your email before signing in.",
    invalid: "Invalid credentials or signup failed.",
    emailUsed: "This email is already in use. Sign in or use another address.",
    missingConfig: "Missing Supabase configuration.",
    callback: "Email confirmation failed. Try again.",
    passwordPolicy:
      "Password must contain at least 8 characters, one uppercase letter, one lowercase letter, one number, and one special character.",
    note: "Supabase Auth is active. Admin roles are still assigned manually.",
  },
} as const;

function getParam(searchParams: SearchParams | undefined, key: string) {
  const value = searchParams?.[key];
  return typeof value === "string" ? value : undefined;
}

function statusMessage(searchParams: SearchParams | undefined, locale: Locale) {
  const dictionary = copy[locale];
  const status = getParam(searchParams, "status");
  const error = getParam(searchParams, "error");

  if (status === "check-email") {
    return { tone: "success" as const, text: dictionary.checkEmail };
  }

  if (error === "missing-config") {
    return { tone: "error" as const, text: dictionary.missingConfig };
  }

  if (error === "callback") {
    return { tone: "error" as const, text: dictionary.callback };
  }

  if (error === "password-policy") {
    return { tone: "error" as const, text: dictionary.passwordPolicy };
  }

  if (error === "email-used") {
    return { tone: "error" as const, text: dictionary.emailUsed };
  }

  if (error) {
    return { tone: "error" as const, text: dictionary.invalid };
  }

  return null;
}

export function AuthFormShell({ mode, locale, searchParams }: AuthFormShellProps) {
  const dictionary = copy[locale];
  const isLogin = mode === "login";
  const message = statusMessage(searchParams, locale);
  const action = isLogin ? loginAction.bind(null, locale) : signupAction.bind(null, locale);

  return (
    <main className="min-h-screen bg-[#080612] text-[#F5F1FA]">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-12">
        <Link href="/" className="mb-8 inline-flex items-center gap-3 font-display text-xl font-bold">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#6B3FA0] shadow-[0_0_18px_rgba(139,92,246,0.45)]">
            AH
          </span>
          AgentHub
        </Link>

        <section className="rounded-3xl border border-[#251A40] bg-[#110D24] p-6 shadow-2xl">
          <p className="font-label mb-2 text-xs text-[#A78BCF]">AgentHub beta</p>
          <h1 className="font-display text-3xl font-bold">{isLogin ? dictionary.loginTitle : dictionary.signupTitle}</h1>
          <p className="mt-2 text-sm text-[#D6C5E8]">{isLogin ? dictionary.loginSubtitle : dictionary.signupSubtitle}</p>

          {message && (
            <div
              className={`mt-5 rounded-xl border px-4 py-3 text-sm ${
                message.tone === "success"
                  ? "border-[#10B981]/40 bg-[#10B981]/10 text-[#10B981]"
                  : "border-[#EF4444]/40 bg-[#EF4444]/10 text-[#FCA5A5]"
              }`}
            >
              {message.text}
            </div>
          )}

          <form action={action} className="mt-6 space-y-4">
            {!isLogin && (
              <label className="block">
                <span className="font-label mb-1.5 block text-xs text-[#A78BCF]">{dictionary.name}</span>
                <input
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  className="h-11 w-full rounded-xl border border-[#251A40] bg-[#080612] px-3 text-sm text-[#F5F1FA] outline-none transition-colors focus:border-[#8B5CF6]"
                />
              </label>
            )}

            <label className="block">
              <span className="font-label mb-1.5 block text-xs text-[#A78BCF]">{dictionary.email}</span>
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                className="h-11 w-full rounded-xl border border-[#251A40] bg-[#080612] px-3 text-sm text-[#F5F1FA] outline-none transition-colors focus:border-[#8B5CF6]"
              />
            </label>

            <label className="block">
              <span className="font-label mb-1.5 block text-xs text-[#A78BCF]">{dictionary.password}</span>
              <PasswordInput
                name="password"
                autoComplete={isLogin ? "current-password" : "new-password"}
                minLength={isLogin ? undefined : 8}
                pattern={isLogin ? undefined : "(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{8,}"}
                describedBy={!isLogin ? "password-help" : undefined}
                placeholder={!isLogin ? dictionary.passwordPlaceholder : undefined}
                showLabel={dictionary.showPassword}
                hideLabel={dictionary.hidePassword}
              />
              {!isLogin && (
                <p
                  id="password-help"
                  className="mt-2 rounded-lg border border-[#8B5CF6]/25 bg-[#8B5CF6]/10 px-3 py-2 text-xs leading-relaxed text-[#D6C5E8]"
                >
                  {dictionary.passwordHelp}
                </p>
              )}
            </label>

            {!isLogin && (
              <label className="block">
                <span className="font-label mb-1.5 block text-xs text-[#A78BCF]">{dictionary.role}</span>
                <select
                  name="role"
                  defaultValue="user"
                  className="h-11 w-full rounded-xl border border-[#251A40] bg-[#080612] px-3 text-sm text-[#F5F1FA] outline-none transition-colors focus:border-[#8B5CF6]"
                >
                  <option value="user">{dictionary.user}</option>
                  <option value="creator">{dictionary.creator}</option>
                </select>
              </label>
            )}

            <button
              type="submit"
              className="h-11 w-full rounded-xl bg-gradient-to-r from-[#6B3FA0] to-[#8B5CF6] text-sm font-semibold text-white shadow-[0_0_18px_rgba(139,92,246,0.18)] transition-all hover:from-[#7C3AED] hover:to-[#A78BCF]"
            >
              {isLogin ? dictionary.submitLogin : dictionary.submitSignup}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-[#A78BCF]">
            {isLogin ? dictionary.toSignup : dictionary.toLogin}{" "}
            <Link
              href={localizedPath(isLogin ? "/auth/signup" : "/auth/login", locale)}
              className="font-semibold text-[#F5F1FA] hover:text-[#A78BCF]"
            >
              {isLogin ? dictionary.signupLink : dictionary.loginLink}
            </Link>
          </p>
        </section>

        <p className="mt-5 text-xs leading-relaxed text-[#8A7CA0]">{dictionary.note}</p>
      </div>
    </main>
  );
}
