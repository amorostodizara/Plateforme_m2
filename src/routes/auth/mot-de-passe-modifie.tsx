import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { BoutonPrincipal } from "@/components/auth/Field";

export const Route = createFileRoute("/auth/mot-de-passe-modifie")({
  head: () => ({
    meta: [
      { title: "Mot de passe modifié — Plateforme de formation" },
      { name: "description", content: "Votre mot de passe a été modifié avec succès." },
      { property: "og:title", content: "Mot de passe modifié" },
      { property: "og:description", content: "Votre mot de passe a été modifié avec succès." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MotDePasseModifie,
});

function MotDePasseModifie() {
  const navigate = useNavigate();
  return (
    <AuthShell
      titre="Mot de passe modifié"
      sousTitre="Votre mot de passe a été modifié avec succès."
      icone={
        <span
          className="flex h-16 w-16 items-center justify-center rounded-full border-2"
          style={{ borderColor: "var(--color-success)", color: "var(--color-success)" }}
        >
          <Check className="h-7 w-7" />
        </span>
      }
    >
      <BoutonPrincipal type="button" onClick={() => navigate({ to: "/auth" })}>
        Retourner au page connexion
      </BoutonPrincipal>
    </AuthShell>
  );
}
