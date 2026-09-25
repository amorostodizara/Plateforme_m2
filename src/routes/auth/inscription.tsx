import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Field, PasswordField, BoutonPrincipal, BoutonSecondaire } from "@/components/auth/Field";
import { creerCompte } from "@/backend/functions/email-auth.functions";

export const Route = createFileRoute("/auth/inscription")({
  head: () => ({
    meta: [
      { title: "Créer votre compte — Plateforme de formation" },
      {
        name: "description",
        content: "Créez votre compte pour vous inscrire aux sessions de formation et suivre votre parcours.",
      },
      { property: "og:title", content: "Créer votre compte — Plateforme de formation" },
      {
        property: "og:description",
        content: "Inscription à la plateforme de suivi et de gestion des activités de formation.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Inscription,
});

type Champs = {
  nom: string;
  prenoms: string;
  email: string;
  telephone: string;
  motDePasse: string;
  confirmation: string;
};

function Inscription() {
  const navigate = useNavigate();
  const [valeurs, setValeurs] = useState<Champs>({
    nom: "",
    prenoms: "",
    email: "",
    telephone: "",
    motDePasse: "",
    confirmation: "",
  });
  const [erreurs, setErreurs] = useState<Partial<Record<keyof Champs | "global", string>>>({});
  const [chargement, setChargement] = useState(false);

  function maj(champ: keyof Champs, valeur: string) {
    setValeurs((v) => ({ ...v, [champ]: valeur }));
  }

  function valider() {
    const e: Partial<Record<keyof Champs, string>> = {};
    if (!valeurs.nom.trim()) e.nom = "Le nom est requis";
    if (!valeurs.prenoms.trim()) e.prenoms = "Le prénom est requis";
    if (!valeurs.email.trim()) e.email = "L'adresse e-mail est requise";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valeurs.email)) e.email = "Adresse e-mail invalide";
    if (!valeurs.telephone.trim()) e.telephone = "Le contact est requis";
    if (valeurs.motDePasse.length < 8)
      e.motDePasse = "Le mot de passe doit contenir au moins 8 caractères";
    if (!valeurs.confirmation) e.confirmation = "Veuillez confirmer votre mot de passe";
    else if (valeurs.confirmation !== valeurs.motDePasse)
      e.confirmation = "Les mots de passe ne correspondent pas";
    return e;
  }

  async function soumettre(ev: React.FormEvent) {
    ev.preventDefault();
    const e = valider();
    setErreurs(e);
    if (Object.keys(e).length > 0) return;

    setChargement(true);
    const r = await creerCompte({ data: { email: valeurs.email.trim(), motDePasse: valeurs.motDePasse, nom: valeurs.nom.trim(), prenoms: valeurs.prenoms.trim(), telephone: valeurs.telephone.trim() } }).catch(() => ({ ok: false as const, erreur: "La création du compte a échoué. Réessayez." }));
    setChargement(false);
    if (!r.ok) { setErreurs({ global: r.erreur }); return; }

    navigate({ to: "/auth/verification", search: { email: valeurs.email.trim() } });
  }

  return (
    <AuthShell
      titre="Créer votre compte"
      sousTitre="Complétez les informations ci-dessous pour créer votre compte."
      largeur="max-w-xl"
    >
      <form onSubmit={soumettre} className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Nom"
            value={valeurs.nom}
            erreur={erreurs.nom}
            onChange={(e) => maj("nom", e.target.value)}
          />
          <Field
            label="Prénom"
            value={valeurs.prenoms}
            erreur={erreurs.prenoms}
            onChange={(e) => maj("prenoms", e.target.value)}
          />
          <Field
            label="Adresse e-mail"
            type="email"
            value={valeurs.email}
            erreur={erreurs.email}
            onChange={(e) => maj("email", e.target.value)}
          />
          <Field
            label="Contact"
            value={valeurs.telephone}
            erreur={erreurs.telephone}
            onChange={(e) => maj("telephone", e.target.value)}
          />
        </div>

        <PasswordField
          label="Mot de passe"
          value={valeurs.motDePasse}
          erreur={erreurs.motDePasse}
          onChange={(e) => maj("motDePasse", e.target.value)}
        />
        <PasswordField
          label="Confirmer mot de passe"
          value={valeurs.confirmation}
          erreur={erreurs.confirmation}
          onChange={(e) => maj("confirmation", e.target.value)}
        />

        {erreurs.global ? <p className="text-sm text-destructive">{erreurs.global}</p> : null}

        <BoutonPrincipal type="submit" disabled={chargement}>
          {chargement ? "Création..." : "Continue"}
        </BoutonPrincipal>

        <Link to="/auth" className="block">
          <BoutonSecondaire type="button">Vous avez déjà un compte ? S'identifier</BoutonSecondaire>
        </Link>
      </form>
    </AuthShell>
  );
}
