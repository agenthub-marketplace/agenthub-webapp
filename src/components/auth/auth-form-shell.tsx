import Link from "next/link";
import type { Locale } from "@/lib/i18n/config";
import { localizedPath } from "@/lib/i18n/config";
import {
  loginAction,
  requestPasswordResetAction,
  resendConfirmationEmailAction,
  signupAction,
} from "@/lib/auth/actions";
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
    confirmationEmailSent:
      "Si ce compte attend une confirmation, un nouvel email vient d’être envoyé.",
    passwordResetEmailSent:
      "Si ce compte existe, un email de réinitialisation vient d’être envoyé.",
    passwordUpdated: "Mot de passe mis à jour. Vous pouvez vous connecter.",
    invalid: "Identifiants invalides ou inscription impossible.",
    emailUsed: "Cet email est déjà utilisé. Connectez-vous ou utilisez une autre adresse.",
    missingConfig: "Configuration Supabase manquante.",
    callback: "La confirmation email a échoué. Réessayez.",
    sessionExpired: "Votre session a expiré. Reconnectez-vous pour continuer.",
    emailRateLimit: "Trop d’emails envoyés. Attendez quelques minutes puis réessayez.",
    emailSendFailed:
      "L’email n’a pas pu être envoyé pour le moment. Réessayez ou contactez l’équipe.",
    passwordPolicy:
      "Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial.",
    forgotTitle: "Mot de passe oublié ?",
    forgotDescription: "Entrez votre email pour recevoir un lien de réinitialisation.",
    forgotSubmit: "Envoyer le lien",
    resendTitle: "Email de confirmation non reçu ?",
    resendDescription:
      "Entrez l’email utilisé à l’inscription pour renvoyer la confirmation.",
    resendLimit: "Si rien n’arrive, attendez quelques minutes : Supabase limite les emails répétés.",
    resendSubmit: "Renvoyer l’email",
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
    confirmationEmailSent:
      "If this account is waiting for confirmation, a new email has been sent.",
    passwordResetEmailSent: "If this account exists, a password reset email has been sent.",
    passwordUpdated: "Password updated. You can sign in.",
    invalid: "Invalid credentials or signup failed.",
    emailUsed: "This email is already in use. Sign in or use another address.",
    missingConfig: "Missing Supabase configuration.",
    callback: "Email confirmation failed. Try again.",
    sessionExpired: "Your session expired. Sign in again to continue.",
    emailRateLimit: "Too many emails sent. Wait a few minutes, then try again.",
    emailSendFailed: "The email could not be sent right now. Try again or contact the team.",
    passwordPolicy:
      "Password must contain at least 8 characters, one uppercase letter, one lowercase letter, one number, and one special character.",
    forgotTitle: "Forgot your password?",
    forgotDescription: "Enter your email to receive a reset link.",
    forgotSubmit: "Send reset link",
    resendTitle: "No confirmation email?",
    resendDescription: "Enter the email used at signup to resend confirmation.",
    resendLimit: "If nothing arrives, wait a few minutes: Supabase rate-limits repeated emails.",
    resendSubmit: "Resend email",
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

  if (status === "confirmation-email-sent") {
    return { tone: "success" as const, text: dictionary.confirmationEmailSent };
  }

  if (status === "password-reset-email-sent") {
    return { tone: "success" as const, text: dictionary.passwordResetEmailSent };
  }

  if (status === "password-updated") {
    return { tone: "success" as const, text: dictionary.passwordUpdated };
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

  if (error === "session-expired") {
    return { tone: "error" as const, text: dictionary.sessionExpired };
  }

  if (error === "email-rate-limit") {
    return { tone: "error" as const, text: dictionary.emailRateLimit };
  }

  if (error === "email-send-failed") {
    return { tone: "error" as const, text: dictionary.emailSendFailed };
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
  const nextPath = getParam(searchParams, "next") ?? "";

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
            {isLogin && nextPath && <input type="hidden" name="next" value={nextPath} />}

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

          {isLogin && (
            <div className="mt-6 grid gap-3 border-t border-[#251A40] pt-5">
              <form
                action={requestPasswordResetAction.bind(null, locale)}
                className="rounded-2xl border border-[#251A40] bg-[#080612]/60 p-4"
              >
                <h2 className="font-display text-sm font-bold text-[#F5F1FA]">{dictionary.forgotTitle}</h2>
                <p className="mt-1 text-xs leading-relaxed text-[#A78BCF]">{dictionary.forgotDescription}</p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <input
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder={dictionary.email}
                    className="h-10 min-w-0 flex-1 rounded-xl border border-[#251A40] bg-[#080612] px-3 text-sm text-[#F5F1FA] outline-none transition-colors focus:border-[#8B5CF6]"
                  />
                  <button
                    type="submit"
                    className="h-10 shrink-0 rounded-xl border border-[#8B5CF6]/50 px-4 text-xs font-semibold text-[#F5F1FA] transition-colors hover:bg-[#8B5CF6]/15"
                  >
                    {dictionary.forgotSubmit}
                  </button>
                </div>
              </form>

              <form
                action={resendConfirmationEmailAction.bind(null, locale)}
                className="rounded-2xl border border-[#251A40] bg-[#080612]/60 p-4"
              >
                <h2 className="font-display text-sm font-bold text-[#F5F1FA]">{dictionary.resendTitle}</h2>
                <p className="mt-1 text-xs leading-relaxed text-[#A78BCF]">{dictionary.resendDescription}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-[#8A7CA0]">{dictionary.resendLimit}</p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <input
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder={dictionary.email}
                    className="h-10 min-w-0 flex-1 rounded-xl border border-[#251A40] bg-[#080612] px-3 text-sm text-[#F5F1FA] outline-none transition-colors focus:border-[#8B5CF6]"
                  />
                  <button
                    type="submit"
                    className="h-10 shrink-0 rounded-xl border border-[#8B5CF6]/50 px-4 text-xs font-semibold text-[#F5F1FA] transition-colors hover:bg-[#8B5CF6]/15"
                  >
                    {dictionary.resendSubmit}
                  </button>
                </div>
              </form>
            </div>
          )}
        </section>

        <p className="mt-5 text-xs leading-relaxed text-[#8A7CA0]">{dictionary.note}</p>
      </div>
    </main>
  );
}
