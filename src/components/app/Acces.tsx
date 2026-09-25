import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDroits } from "@/components/app/AppShell";

/**
 * Affiche le contenu uniquement si l’utilisateur possède l’un des rôles requis.
 * Les données restent de toute façon protégées côté base par les règles de sécurité.
 */
export function AccesReserve({
  roles,
  children,
}: {
  roles: ("ADMINISTRATEUR" | "RESPONSABLE" | "FORMATEUR" | "PARTICIPANT")[];
  children: ReactNode;
}) {
  const { roles: mesRoles, chargement } = useDroits();

  if (chargement) {
    return <div className="h-40 animate-pulse rounded-lg bg-card" />;
  }

  if (!roles.some((r) => mesRoles.includes(r))) {
    return (
      <div className="mx-auto mt-10 max-w-md rounded-lg border border-border bg-card p-8 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-cream text-primary">
          <ShieldAlert className="h-6 w-6" />
        </span>
        <h1 className="mt-4 text-lg font-bold text-foreground">Accès réservé</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Vous n’avez pas les droits nécessaires pour consulter cette page. Contactez un administrateur si vous pensez
          qu’il s’agit d’une erreur.
        </p>
        <Button asChild className="mt-5"><Link to="/tableau-de-bord">Retour au tableau de bord</Link></Button>
      </div>
    );
  }

  return <>{children}</>;
}
