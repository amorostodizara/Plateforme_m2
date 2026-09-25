
import { useState, type ReactNode } from "react";
import { ImageStockee } from "@/components/app/ImageStockee";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Award, BookOpen, Bot, CalendarCheck, CalendarDays, ChevronDown, ChevronRight,
  ClipboardCheck, ClipboardList, FolderOpen, GraduationCap, LayoutDashboard, LogOut,
  Menu, MessageSquareMore, PanelLeftClose, PanelLeftOpen, Settings, UserCog, UserPen,
  UserRound, Users, UsersRound, Wallet, X,
} from "lucide-react";
import logo_odc from "@/assets/logo-odc.png";
import { Notifications } from "@/components/app/Notifications";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Lien =
  | { to: string; libelle: string; icone: typeof LayoutDashboard }
  | { libelle: string; icone: typeof LayoutDashboard; enfants: readonly { to: string; libelle: string }[] };

export type ProfilCourant = {
  utilisateur_id: number;
  nom: string;
  prenoms: string;
  email: string;
  url_profil: string | null;
  roles: string[];
  permissions: string[];
  participant_id: number | null;
  formateur_id: number | null;
};

export function useProfilCourant() {
  return useQuery({
    queryKey: ["profil-courant"],
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<ProfilCourant | null> => {
      const { data: auth } = await supabase.auth.getUser();
      const authId = auth.user?.id;
      if (!authId) return null;

      const { data: u } = await supabase
        .from("utilisateur")
        .select("utilisateur_id, nom, prenoms, email, url_profil, statut")
        .eq("auth_user_id", authId)
        .maybeSingle();
      if (!u) return null;
      if (u.statut === "Inactif") {
        await supabase.auth.signOut();
        if (typeof window !== "undefined") window.location.href = "/auth?inactif=1";
        return null;
      }

      const { data: roles } = await supabase
        .from("role_utilisateur")
        .select("role_id, role:role(code_role)")
        .eq("utilisateur_id", u.utilisateur_id);

      const idsRoles = (roles ?? []).map((r) => r.role_id);
      const { data: perms } = idsRoles.length
        ? await supabase
            .from("role_permission")
            .select("permission:permission(code)")
            .in("role_id", idsRoles)
        : { data: [] as { permission: { code: string } | null }[] };

      const { data: p } = await supabase
        .from("participant")
        .select("participant_id")
        .eq("utilisateur_id", u.utilisateur_id)
        .maybeSingle();

      const { data: f } = await supabase
        .from("formateur")
        .select("formateur_id")
        .eq("utilisateur_id", u.utilisateur_id)
        .maybeSingle();

      return {
        utilisateur_id: u.utilisateur_id,
        nom: u.nom,
        prenoms: u.prenoms,
        email: u.email,
        url_profil: u.url_profil,
        participant_id: p?.participant_id ?? null,
        formateur_id: f?.formateur_id ?? null,
        roles: (roles ?? []).map((r) => r.role?.code_role).filter(Boolean) as string[],
        permissions: Array.from(new Set((perms ?? []).map((x) => x.permission?.code).filter(Boolean) as string[])),
      };
    },
  });
}

/** Droits de l’utilisateur connecté, utilisés pour masquer et bloquer les actions. */
export function useDroits() {
  const { data: profil, isLoading } = useProfilCourant();
  const roles = profil?.roles ?? [];
  const estAdmin = roles.includes("ADMINISTRATEUR");
  const estResponsable = roles.includes("RESPONSABLE");
  const estFormateur = roles.includes("FORMATEUR");
  const permissions = profil?.permissions ?? [];
  /** Vrai si l’utilisateur possède l’autorisation demandée (l’administrateur les possède toutes). */
  const peut = (code: string) => estAdmin || permissions.includes(code);
  return {
    profil: profil ?? null,
    roles,
    permissions,
    peut,
    estAdmin,
    estResponsable,
    estFormateur,
    estGestionnaire: estAdmin || estResponsable,
    peutSuivrePresence: estAdmin || estResponsable || estFormateur,
    chargement: isLoading,
  };
}

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { profil, estGestionnaire, estFormateur, peut, chargement } = useDroits();

  const [mobileOuvert, setMobileOuvert] = useState(false);
  const [reduit, setReduit] = useState(false);
  const initiales = `${profil?.prenoms?.[0] ?? ""}${profil?.nom?.[0] ?? ""}`.toUpperCase() || "U";
  const role = profil?.roles.includes("ADMINISTRATEUR")
    ? "Admin"
    : profil?.roles.includes("RESPONSABLE")
      ? "Responsable"
      : profil?.roles.includes("FORMATEUR") ? "Formateur" : "Participant";

  // Pendant le chargement des droits, on garde les menus de base pour éviter un menu vide.
  const autorise = (code: string) => chargement || peut(code);

  const sousEvaluations = [
    ...(autorise("evaluation.gerer") ? [{ to: "/evaluations/creation", libelle: "Création d’évaluations" }] : []),
    ...(autorise("evaluation.lire") || autorise("evaluation.passer")
      ? [{ to: "/evaluations/mes-evaluations", libelle: "Mes évaluations" }]
      : []),
  ];

  const liens: Lien[] = [
    ...(autorise("dashboard.lire") ? [{ to: "/tableau-de-bord", libelle: "Tableau de bord", icone: LayoutDashboard } as Lien] : []),
    ...(autorise("agenda.lire") ? [{ to: "/agenda", libelle: "Agenda", icone: CalendarDays } as Lien] : []),
    ...(autorise("catalogue.lire") ? [{ to: "/catalogue", libelle: "Catalogue", icone: BookOpen } as Lien] : []),
    ...(autorise("inscription.lire") || autorise("inscription.creer")
      ? [{ to: "/inscriptions", libelle: "Inscriptions", icone: ClipboardList } as Lien] : []),
    ...(autorise("presence.gerer") ? [{ to: "/presence", libelle: "Présence", icone: ClipboardCheck } as Lien] : []),
    ...(sousEvaluations.length ? [{ libelle: "Évaluations", icone: CalendarCheck, enfants: sousEvaluations } as Lien] : []),
    ...(autorise("attestation.lire") ? [{ to: "/attestations", libelle: "Mes attestations", icone: Award } as Lien] : []),
    ...(autorise("support.lire") ? [{ to: "/supports", libelle: "Supports", icone: FolderOpen } as Lien] : []),
    ...(autorise("publication.lire") ? [{ to: "/actualites", libelle: "Fil d’actualité", icone: MessageSquareMore } as Lien] : []),
    ...(autorise("ia.lire") ? [{ to: "/assistant-ia", libelle: "Assistant IA", icone: Bot } as Lien] : []),
  ];

  const sousFormation = [
    ...(peut("formation.gerer") ? [{ to: "/formations", libelle: "Gestion des formations" }] : []),
    ...(peut("session.gerer") ? [{ to: "/sessions", libelle: "Gestion des sessions" }] : []),
  ];
  const sousFormateurs = [
    ...(peut("formateur.gerer") ? [{ to: "/formateurs", libelle: "Profils formateurs" }] : []),
    ...(peut("paiement_formateur.lire") ? [{ to: "/paiements-formateurs", libelle: "Paiements formateurs" }] : []),
  ];
  const sousParametres = [
    ...(peut("role.gerer") ? [{ to: "/parametres/roles-permissions", libelle: "Rôles et permissions" }] : []),
    ...(peut("journal.lire") ? [{ to: "/parametres/journal", libelle: "Logs activités" }] : []),
  ];

  const liensGestion: Lien[] = [
    ...(sousFormation.length ? [{ libelle: "Formation", icone: GraduationCap, enfants: sousFormation } as Lien] : []),
    ...(sousFormateurs.length ? [{ libelle: "Formateurs", icone: UsersRound, enfants: sousFormateurs } as Lien] : []),
    ...(peut("participant.gerer") ? [{ to: "/participants", libelle: "Participants", icone: Users } as Lien] : []),
    ...(peut("responsable.gerer") ? [{ to: "/responsables", libelle: "Responsables", icone: UserCog } as Lien] : []),
    ...(peut("utilisateur.gerer") ? [{ to: "/utilisateurs", libelle: "Utilisateurs", icone: UsersRound } as Lien] : []),
    ...(sousParametres.length ? [{ libelle: "Paramètres", icone: Settings, enfants: sousParametres } as Lien] : []),
  ];

  const liensFormateur: Lien[] = [
    ...(peut("paiement_formateur.lire") ? [{ to: "/paiements-formateurs", libelle: "Mes paiements", icone: Wallet } as Lien] : []),
  ];

  const liensAdmin = liensGestion.length ? liensGestion : estFormateur ? liensFormateur : [];

  async function seDeconnecter() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  function rendreLiens(listes: readonly Lien[], compact = false) {
    return listes.map((lien) => {
      const Icone = lien.icone;
      if ("to" in lien) {
        const actif = pathname.startsWith(lien.to);
        return (
          <Link key={lien.to} to={lien.to as never} title={lien.libelle} onClick={() => setMobileOuvert(false)} className={`mb-0.5 flex h-9 items-center gap-3 rounded-sm text-[13px] font-medium transition-colors ${compact ? "justify-center px-0" : "px-3"} ${actif ? "bg-cream text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
            <Icone className="h-4 w-4 shrink-0" />{compact ? null : lien.libelle}
          </Link>
        );
      }
      const ouvert = lien.enfants.some((enfant) => pathname.startsWith(enfant.to));
      if (compact) {
        const premier = lien.enfants[0];
        if (!premier) return null;
        return (
          <Link key={lien.libelle} to={premier.to as never} title={lien.libelle} className={`mb-0.5 flex h-9 items-center justify-center rounded-sm transition-colors ${ouvert ? "bg-cream text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
            <Icone className="h-4 w-4 shrink-0" />
          </Link>
        );
      }
      return (
        <div key={lien.libelle} className="mb-0.5">
          <div className="flex h-9 items-center gap-3 px-3 text-[13px] font-medium text-foreground">
            <Icone className="h-4 w-4 shrink-0" />{lien.libelle}
            {ouvert ? <ChevronDown className="ml-auto h-4 w-4" /> : <ChevronRight className="ml-auto h-4 w-4" />}
          </div>
          <div className="pb-1 pl-10">
            {lien.enfants.map((enfant) => (
              <Link key={enfant.to} to={enfant.to as never} onClick={() => setMobileOuvert(false)} className={`block py-1 text-xs ${pathname.startsWith(enfant.to) ? "font-semibold text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                {enfant.libelle}
              </Link>
            ))}
          </div>
        </div>
      );
    });
  }

  const menuProfil = (
    <>
      <DropdownMenuLabel>Mon profil</DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem asChild><Link to="/profil"><UserRound />Mon profil</Link></DropdownMenuItem>
      <DropdownMenuItem asChild><Link to="/modifier-profil"><UserPen />Modifier profil</Link></DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={seDeconnecter} className="text-destructive focus:bg-destructive focus:text-destructive-foreground"><LogOut />Déconnexion</DropdownMenuItem>
    </>
  );

  function rendreNavigation(compact: boolean) {
    return (
      <>
        <div className={`flex h-16 shrink-0 items-center border-b border-border ${compact ? "justify-center px-2" : "px-4"}`}>
          <img src={logo_odc} alt="Orange Digital Center" className={compact ? "h-8 w-auto" : "h-10 w-auto"} />
          <Button variant="ghost" size="icon" className="ml-auto md:hidden" onClick={() => setMobileOuvert(false)} aria-label="Fermer le menu">
            <X />
          </Button>
        </div>
        <nav className={`app-scrollbar flex-1 overflow-y-auto py-5 ${compact ? "px-2" : "px-3"}`}>
          {rendreLiens(liens, compact)}
          {liensAdmin.length > 0 ? (
            <>
              <div className="my-3 border-t border-border" />
              {compact ? null : (
                <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                  {estGestionnaire ? "Administration" : "Espace formateur"}
                </p>
              )}
              {rendreLiens(liensAdmin, compact)}
            </>
          ) : null}
        </nav>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className={`m-3 h-auto gap-3 bg-cream py-2 text-left hover:bg-accent ${compact ? "justify-center px-2" : "justify-start px-3"}`}>
              {profil?.url_profil ? <ImageStockee src={profil.url_profil} alt="Photo de profil" className="h-9 w-9 rounded-full object-cover" /> : <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{initiales}</span>}
              {compact ? null : (
                <>
                  <span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-foreground">{profil ? `${profil.prenoms} ${profil.nom}`.trim() : "Utilisateur"}</span><span className="mt-0.5 inline-block bg-primary/10 px-1.5 text-[10px] font-medium text-primary">{role}</span></span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="end" className="w-56">{menuProfil}</DropdownMenuContent>
        </DropdownMenu>
      </>
    );
  }

  return (
    <div className="flex min-h-screen bg-secondary">
      <aside className={`fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-border bg-card transition-all md:flex ${reduit ? "w-16" : "w-60"}`}>{rendreNavigation(reduit)}</aside>
      {mobileOuvert ? <div className="fixed inset-0 z-50 md:hidden"><div className="absolute inset-0 bg-foreground/30" onClick={() => setMobileOuvert(false)} /><aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-card shadow-xl">{rendreNavigation(false)}</aside></div> : null}

      <div className={`flex min-w-0 flex-1 flex-col transition-all ${reduit ? "md:pl-16" : "md:pl-60"}`}>
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-card px-4 md:px-6">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOuvert(true)} aria-label="Ouvrir le menu"><Menu /></Button>
          <Button variant="ghost" size="icon" className="hidden md:inline-flex" onClick={() => setReduit((v) => !v)} aria-label={reduit ? "Afficher le menu" : "Réduire le menu"}>
            {reduit ? <PanelLeftOpen /> : <PanelLeftClose />}
          </Button>
          <div className="ml-auto flex items-center gap-1">
            <Button asChild variant="ghost" size="icon">
              <Link to="/assistant-ia" aria-label="Ouvrir l’Assistant IA"><MessageSquareMore /></Link>
            </Button>
            <Notifications />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{initiales}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">{menuProfil}</DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="min-w-0 flex-1 p-4 md:p-5">{children}</main>
      </div>
    </div>
  );
}


        // {/* Actions header */}
        // <div className="ml-auto flex items-center gap-4">
        //   {/* Assistant IA */}
        //   <Button
        //     asChild
        //     variant="ghost"
        //     size="icon"
        //     className="h-10 w-10 rounded-full p-0 hover:bg-transparent"
        //   >
        //     <Link
        //       to="/assistant-ia"
        //       aria-label="Ouvrir l’Assistant IA"
        //       className="flex h-10 w-10 items-center justify-center"
        //     >
        //       <Bot className="h-9 w-9 stroke-[2.5] text-black" />
        //     </Link>
        //   </Button>

        //   {/* Notifications */}
        //   <div className="relative flex h-10 w-10 items-center justify-center">
        //     <Notifications />
        //   </div>

        //   {/* Profil */}
        //   <DropdownMenu>
        //     <DropdownMenuTrigger asChild>
        //       <Button
        //         variant="ghost"
        //         size="icon"
        //         className="h-11 w-11 rounded-full p-0 hover:bg-transparent"
        //       >
        //         <span
        //           className="
        //             flex h-11 w-11 items-center justify-center
        //             rounded-full
        //             bg-gradient-to-br from-[#FF7900] via-[#FFB066] to-[#FF7900]
        //             p-[5px]
        //           "
        //         >
        //           <span
        //             className="
        //               flex h-full w-full items-center justify-center
        //               rounded-full
        //               bg-[#FF7900]
        //               text-base font-semibold
        //               text-white
        //             "
        //           >
        //             {initiales}
        //           </span>
        //         </span>
        //       </Button>
        //     </DropdownMenuTrigger>

        //     <DropdownMenuContent align="end" className="w-56">
        //       {menuProfil}
        //     </DropdownMenuContent>
        //   </DropdownMenu>
        // </div>
