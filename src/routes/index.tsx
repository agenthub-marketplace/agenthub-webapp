import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import { PrismLogo } from "@/components/PrismLogo";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PRISM — Votre portefeuille, éclairé par l'actualité" },
      { name: "description", content: "PRISM analyse l'actualité financière en temps réel pour éclairer votre portefeuille." },
      { property: "og:title", content: "PRISM — Votre portefeuille, éclairé par l'actualité" },
      { property: "og:description", content: "L'app fintech qui relie votre portefeuille aux nouvelles du marché." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"choose" | "email">("choose");
  const [isLogin, setIsLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/dashboard" });
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/dashboard` },
        });
        if (error) throw error;
        toast.success("Compte créé. Bienvenue !");
        navigate({ to: "/dashboard" });
      }
    } catch (err: any) {
      toast.error(err.message ?? "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell flex flex-col">
      {/* Top section with logo */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-12 pb-10">
        <PrismLogo size={300} />
        <h1 className="mt-10 text-center text-[19px] font-bold uppercase tracking-tight leading-tight text-foreground">
          Votre portefeuille,<br />éclairé par l'actualité.
        </h1>
      </div>

      {/* Bottom white section */}
      <div className="bg-surface px-6 pt-8 pb-10 rounded-t-[28px] shadow-[0_-4px_24px_-12px_rgba(0,0,0,0.06)]">
        {mode === "choose" ? (
          <div className="space-y-3">
            <button
              onClick={() => { setIsLogin(false); setMode("email"); }}
              className="w-full h-14 bg-foreground text-primary-foreground rounded-full font-semibold flex items-center justify-center gap-3 active:scale-[0.99] transition"
            >
              <Mail size={20} />
              Sign up with e-mail
            </button>
            <button
              onClick={async () => {
                try {
                  const result = await lovable.auth.signInWithOAuth("google", {
                    redirect_uri: window.location.origin,
                  });
                  if (result.error) {
                    toast.error(result.error.message ?? "Erreur Google sign-in");
                    return;
                  }
                  if (result.redirected) return;
                  navigate({ to: "/dashboard" });
                } catch (err: any) {
                  toast.error(err?.message ?? "Erreur Google sign-in");
                }
              }}
              className="w-full h-14 bg-surface border border-border text-foreground rounded-full font-semibold flex items-center justify-center gap-3 active:scale-[0.99] transition"
            >
              <GoogleIcon />
              Sign up with Google
            </button>
            <p className="text-center text-[13px] text-muted-foreground pt-3">
              Already have an account?{" "}
              <button onClick={() => { setIsLogin(true); setMode("email"); }} className="font-bold underline text-foreground">
                Log In!
              </button>
            </p>
          </div>
        ) : (
          <form onSubmit={handleEmailAuth} className="space-y-3">
            <h2 className="text-[15px] font-semibold mb-2">{isLogin ? "Connexion" : "Créer un compte"}</h2>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemple.com"
              className="w-full h-12 px-4 bg-background border border-border rounded-xl text-[14px] outline-none focus:border-foreground"
            />
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mot de passe (6+ caractères)"
              className="w-full h-12 px-4 bg-background border border-border rounded-xl text-[14px] outline-none focus:border-foreground"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full h-14 bg-foreground text-primary-foreground rounded-full font-semibold disabled:opacity-60"
            >
              {loading ? "..." : isLogin ? "Se connecter" : "Créer le compte"}
            </button>
            <button
              type="button"
              onClick={() => setMode("choose")}
              className="w-full text-center text-[13px] text-muted-foreground pt-1"
            >
              ← Retour
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}
