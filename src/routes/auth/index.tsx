import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Field, PasswordField, BoutonPrincipal, BoutonSecondaire } from "@/components/auth/Field";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/")({
  head: () => ({
    meta: [
      { title: "Connexion — Plateforme de formation" },
      {
        name: "description",
        content:
          "Connectez-vous pour suivre et gérer vos formations, sessions, inscriptions et présences.",
      },
      { property: "og:title", content: "Connexion — Plateforme de formation" },
      {
        property: "og:description",
        content: "Accédez à votre espace de suivi et de gestion des activités de formation.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Connexion,
});

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.2 17.6 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.1 24.6c0-1.6-.1-2.8-.4-4.1H24v7.5h12.7c-.3 2.1-1.6 5.2-4.7 7.3l7.2 5.6c4.3-4 6.9-9.9 6.9-16.3z"
      />
      <path
        fill="#FBBC05"
        d="M10.4 28.7c-.5-1.5-.8-3.1-.8-4.7s.3-3.2.8-4.7l-7.8-6.1C1 16.3 0 20 0 24s1 7.7 2.6 10.8l7.8-6.1z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.2-5.6c-2 1.4-4.6 2.3-8.7 2.3-6.4 0-11.7-3.7-13.6-9.2l-7.8 6.1C6.5 42.6 14.6 48 24 48z"
      />
    </svg>
  );
}

function Connexion() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [erreurs, setErreurs] = useState<{
    email?: string | undefined;
    motDePasse?: string | undefined;
    global?: string | undefined;
  }>({});
  const [chargement, setChargement] = useState(false);

  async function seConnecter(e: React.FormEvent) {
    e.preventDefault();
    const nouvelles: typeof erreurs = {};
    if (!email.trim()) nouvelles.email = "L'adresse e-mail est requise";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      nouvelles.email = "Adresse e-mail invalide";
    if (!motDePasse) nouvelles.motDePasse = "Le mot de passe est requis";
    setErreurs(nouvelles);
    if (Object.keys(nouvelles).length > 0) return;
    setChargement(true);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password: motDePasse });

    if (error) {
      setChargement(false);
      if (error.message.toLowerCase().includes("not confirmed")) {
        navigate({ to: "/auth/verification", search: { email } });
        return;
      }
      setErreurs({ global: "Adresse e-mail ou mot de passe incorrect." });
      return;
    }

    const { data: profil } = await supabase
      .from("utilisateur")
      .select("statut")
      .eq("auth_user_id", data.user.id)
      .maybeSingle();

    if (profil?.statut === "Inactif") {
      navigate({ to: "/auth" });
      await supabase.auth.signOut();
      setChargement(false);
      setErreurs({ global: "Votre compte est inactif. Contactez un administrateur." });
      return;
    }

    navigate({ to: "/tableau-de-bord" });
  }

  async function connexionGoogle() {
    setErreurs({});
  
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });
    if (error) {
      setErreurs({
        global: "La connexion avec Google a échoué.",
      });
    }
  }


  return (
    <AuthShell
      titre="Connexion"
      sousTitre="Entrer adresse e-mail et le mot de passe que vous avez défini pour continuer."
    >
      <form onSubmit={seConnecter} className="space-y-5">
        <Field
          label="Adresse e-mail"
          type="email"
          value={email}
          erreur={erreurs.email}
          onChange={(e) => {
            setEmail(e.target.value);
            setErreurs((prev) => ({ ...prev, email: undefined, global: undefined }));
          }}
        />
        <PasswordField
          label="Mot de passe"
          value={motDePasse}
          erreur={erreurs.motDePasse}
          onChange={(e) => {
            setMotDePasse(e.target.value);
            setErreurs((prev) => ({ ...prev, motDePasse: undefined, global: undefined }));
          }}
        />

        <Link
          to="/auth/mot-de-passe-oublie"
          className="inline-block text-sm font-medium text-primary underline underline-offset-4"
        >
          Mot de passe oublié ?
        </Link>

        {erreurs.global ? <p className="text-sm text-destructive">{erreurs.global}</p> : null}

        <BoutonPrincipal type="submit" disabled={chargement}>
          {chargement ? "Connexion..." : "Se connecter"}
        </BoutonPrincipal>

        <div className="flex items-center gap-3">
          <span className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">OU</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <button
          type="button"
          onClick={connexionGoogle}
          className="flex h-12 w-full items-center justify-center gap-3 rounded-sm border border-input bg-card text-sm font-medium text-foreground transition-colors hover:bg-secondary"
        >
          <GoogleIcon />
          Continuer avec Google
        </button>

        <Link to="/auth/inscription" className="block">
          <BoutonSecondaire type="button">Pas encore un compte ? S'inscrire</BoutonSecondaire>
        </Link>
      </form>
    </AuthShell>
  );
}
