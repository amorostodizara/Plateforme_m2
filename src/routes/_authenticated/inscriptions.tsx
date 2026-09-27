import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUpDown,
  BadgeCheck,
  Building2,
  CalendarDays,
  GraduationCap,
  Mail,
  MoreHorizontal,
  Phone,
  Search,
  Settings2,
  Trash2,
  User,
  X,
} from "lucide-react";

import {dateHeureFr} from "@/components/app/AdminKit";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SqueletteLignesTableau } from "@/components/app/Squelette";

export const Route = createFileRoute("/_authenticated/inscriptions")({
  head: () => ({
    meta: [
      { title: "Inscriptions — Suivi des formations" },
      {
        name: "description",
        content: "Gérez les demandes d'inscription : acceptation, refus, liste d'attente.",
      },
      { property: "og:title", content: "Inscriptions — Suivi des formations" },
      {
        property: "og:description",
        content: "Suivi et traitement des demandes d'inscription aux sessions de formation.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Inscriptions,
});

type StatutInscription =
  | "En attente"
  | "Acceptée"
  | "Refusée"
  | "Liste d'attente"
  | "Annulée";

type Ligne = {
  inscription_id: number;
  statut: StatutInscription;
  date_inscription: string;
  motivation: string | null;
  engagement: boolean | null;
  session: {
    session_id: number;
    nom_session: string;
    date_debut: string;
    date_fin: string;
    lieu: string | null;
    formation: { titre: string } | null;
  } | null;
  participant: {
    participant_id: number;
    utilisateur: {
      nom: string;
      prenoms: string;
      email: string;
      telephone: string | null;
      adresse: string | null;
    } | null;
    profil_professionnel: { statut_actuel: string | null; institution: string | null }[] | null;
  } | null;
};

const STATUTS: StatutInscription[] = ["En attente", "Acceptée", "Refusée", "Liste d'attente", "Annulée"];

const couleurStatut: Record<string, string> = {
  "En attente": "bg-cream text-primary",
  Acceptée: "bg-[#E6F4EA] text-[#137333]",
  Refusée: "bg-[#FCE8E6] text-[#C5221F]",
  "Liste d'attente": "bg-secondary text-muted-foreground",
  Annulée: "bg-secondary text-muted-foreground",
};


function Inscriptions() {
  const queryClient = useQueryClient();
  const [session, setSession] = useState("Toutes les sessions");
  const [statut, setStatut] = useState("Tous");
  const [recherche, setRecherche] = useState("");
  const [tri, setTri] = useState<"nom" | "date">("date");
  const [selection, setSelection] = useState<number[]>([]);
  const [detail, setDetail] = useState<Ligne | null>(null);

  const { data: lignes = [], isLoading } = useQuery({
    queryKey: ["inscriptions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inscription")
        .select(
          "inscription_id, statut, date_inscription, motivation, engagement, session:session_formation(session_id, nom_session, date_debut, date_fin, lieu, formation:formation(titre)), participant:participant(participant_id, utilisateur:utilisateur(nom, prenoms, email, telephone, adresse), profil_professionnel:profil_professionnel(statut_actuel, institution))",
        )
        .order("date_inscription", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Ligne[];
    },
  });

  const changerStatut = useMutation({
    mutationFn: async ({ id, valeur }: { id: number; valeur: StatutInscription }) => {
      const { error } = await supabase
        .from("inscription")
        .update({ statut: valeur })
        .eq("inscription_id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Statut mis à jour.");
      queryClient.invalidateQueries({ queryKey: ["inscriptions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const supprimer = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from("inscription").delete().eq("inscription_id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Inscription supprimée.");
      setDetail(null);
      queryClient.invalidateQueries({ queryKey: ["inscriptions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const sessions = useMemo(
    () =>
      Array.from(new Set(lignes.map((l) => l.session?.nom_session).filter(Boolean) as string[])),
    [lignes],
  );

  const affichees = useMemo(() => {
    const filtrees = lignes.filter((l) => {
      if (session !== "Toutes les sessions" && l.session?.nom_session !== session) return false;
      if (statut !== "Tous" && l.statut !== statut) return false;
      if (recherche) {
        const u = l.participant?.utilisateur;
        const champ =
          `${u?.prenoms ?? ""} ${u?.nom ?? ""} ${u?.email ?? ""} ${u?.telephone ?? ""}`.toLowerCase();
        if (!champ.includes(recherche.toLowerCase())) return false;
      }
      return true;
    });
    return filtrees.sort((a, b) => {
      if (tri === "nom") {
        return `${a.participant?.utilisateur?.nom ?? ""}`.localeCompare(
          `${b.participant?.utilisateur?.nom ?? ""}`,
        );
      }
      return b.date_inscription.localeCompare(a.date_inscription);
    });
  }, [lignes, session, statut, recherche, tri]);

  const compte = (valeur: string) => lignes.filter((l) => l.statut === valeur).length;

  const selectClass =
    "h-10 rounded-md border border-input bg-card px-3 text-sm text-foreground focus:border-primary focus:outline-none";

  const entetes: { libelle: string; icone: typeof User }[] = [
    { libelle: "Nom complet", icone: User },
    { libelle: "Contact", icone: Phone },
    { libelle: "Adresse", icone: Building2 },
    { libelle: "Email", icone: Mail },
    { libelle: "Formation", icone: GraduationCap },
    { libelle: "Session", icone: CalendarDays },
    { libelle: "Date d'inscription", icone: CalendarDays },
    { libelle: "Statut", icone: BadgeCheck },
    { libelle: "Actions", icone: Settings2 },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Gestion des demandes d’inscription</h1>
        <p className="mt-1 text-sm text-muted-foreground">Validez ou refusez les demandes d’inscription aux formations.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Total", lignes.length],
          ["Acceptés", compte("Acceptée")],
          ["Liste d'attente", compte("Liste d'attente")],
          ["Refusés", compte("Refusée")],
        ].map(([titre, valeur]) => (
          <div key={titre as string} className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground">{titre}</p>
            <p className="mt-2 text-2xl font-bold text-foreground">{valeur}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-4">
        <select
          className={selectClass}
          value={session}
          onChange={(e) => setSession(e.target.value)}
        >
          <option>Toutes les sessions</option>
          {sessions.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <div className="relative min-w-56 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher un nom, un contact ou un email"
            className="h-10 w-full rounded-md border border-input bg-card pl-9 pr-3 text-sm focus:border-primary focus:outline-none"
          />
        </div>
        <select className={selectClass} value={statut} onChange={(e) => setStatut(e.target.value)}>
          <option>Tous</option>
          {STATUTS.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <button
          onClick={() => setTri(tri === "nom" ? "date" : "nom")}
          className="flex h-10 items-center gap-2 rounded-md border border-input px-4 text-sm font-semibold hover:bg-secondary"
        >
          <ArrowUpDown className="h-4 w-4" />
          Trier par {tri === "nom" ? "nom" : "date"}
        </button>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <div className="max-h-[520px] overflow-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="sticky top-0 bg-secondary">
              <tr>
                <th className="w-10 px-3 py-3">
                  <input
                    type="checkbox"
                    checked={selection.length > 0 && selection.length === affichees.length}
                    onChange={(e) =>
                      setSelection(e.target.checked ? affichees.map((l) => l.inscription_id) : [])
                    }
                  />
                </th>
                {entetes.map(({ libelle, icone: Icone }) => (
                  <th
                    key={libelle}
                    className="whitespace-nowrap px-3 py-3 text-xs font-bold tracking-wide text-muted-foreground"
                  >
                    <span className="flex items-center gap-1.5">
                      <Icone className="h-3.5 w-3.5" />
                      {libelle}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <SqueletteLignesTableau colonnes={10} />
              ) : affichees.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-3 py-6 text-muted-foreground">
                    Aucune inscription trouvée.
                  </td>
                </tr>
              ) : (
                affichees.map((l) => {
                  const u = l.participant?.utilisateur;
                  return (
                    <tr
                      key={l.inscription_id}
                      onClick={() => setDetail(l)}
                      className="cursor-pointer border-t border-border hover:bg-secondary/60"
                    >
                      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selection.includes(l.inscription_id)}
                          onChange={(e) =>
                            setSelection((prev) =>
                              e.target.checked
                                ? [...prev, l.inscription_id]
                                : prev.filter((id) => id !== l.inscription_id),
                            )
                          }
                        />
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 font-medium text-foreground">
                        {u ? `${u.prenoms} ${u.nom}` : "—"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">
                        {u?.telephone ?? "—"}
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">{u?.adresse ?? "—"}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">
                        {u?.email ?? "—"}
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">
                        {l.session?.formation?.titre ?? "—"}
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">
                        {l.session?.nom_session ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">
                        {dateHeureFr(l.date_inscription)}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${couleurStatut[l.statut] ?? "bg-secondary"}`}
                        >
                          {l.statut}
                        </span>
                      </td>
                      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger className="rounded-md p-1.5 hover:bg-secondary">
                            <MoreHorizontal className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Statut</DropdownMenuLabel>
                            {STATUTS.map((s) => (
                              <DropdownMenuItem
                                key={s}
                                onClick={() =>
                                  changerStatut.mutate({ id: l.inscription_id, valeur: s })
                                }
                              >
                                {s}
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setDetail(l)}>
                              Modifier
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => supprimer.mutate(l.inscription_id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {detail ? (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md overflow-auto border-l border-border bg-card p-6 shadow-card">
          <div className="flex items-start justify-between">
            <h2 className="text-lg font-bold text-primary">Détail de l'inscription</h2>
            <button onClick={() => setDetail(null)} className="rounded-md p-1 hover:bg-secondary">
              <X className="h-5 w-5" />
            </button>
          </div>

          <section className="mt-5 space-y-2">
            <p className="text-xs font-bold tracking-wide text-muted-foreground">PARTICIPANT</p>
            <p className="text-sm font-semibold text-foreground">
              {detail.participant?.utilisateur?.prenoms} {detail.participant?.utilisateur?.nom}
            </p>
            <p className="text-sm text-muted-foreground">
              {detail.participant?.utilisateur?.telephone ?? "—"}
            </p>
            <p className="text-sm text-muted-foreground">
              {detail.participant?.utilisateur?.email}
            </p>
            <p className="text-sm text-muted-foreground">
              {detail.participant?.profil_professionnel?.[0]?.statut_actuel ?? "Profil non précisé"}
              {detail.participant?.profil_professionnel?.[0]?.institution
                ? ` — ${detail.participant.profil_professionnel[0]?.institution}`
                : ""}
            </p>
          </section>

          <section className="mt-5 space-y-2">
            <p className="text-xs font-bold tracking-wide text-muted-foreground">FORMATION</p>
            <p className="text-sm font-semibold text-foreground">
              {detail.session?.formation?.titre}
            </p>
            <p className="text-sm text-muted-foreground">{detail.session?.nom_session}</p>
            <p className="text-sm text-muted-foreground">
              {detail.session ? `${dateHeureFr(detail.session.date_debut)} → ${dateHeureFr(detail.session.date_fin)}` : "—"}
            </p>
            <p className="text-sm text-muted-foreground">{detail.session?.lieu ?? "—"}</p>
          </section>

          <section className="mt-5 space-y-2">
            <p className="text-xs font-bold tracking-wide text-muted-foreground">DEMANDE</p>
            <p className="text-sm text-muted-foreground">
              {detail.motivation ?? "Aucune motivation renseignée."}
            </p>
            <p className="text-sm text-muted-foreground">
              Engagement : {detail.engagement ? "Oui" : "Non"}
            </p>
            <div className="pt-2">
              <select
                className={selectClass}
                value={detail.statut}
                onChange={(e) => {
                  const v = e.target.value as StatutInscription;
                  changerStatut.mutate({ id: detail.inscription_id, valeur: v });
                  setDetail({ ...detail, statut: v });
                }}
              >
                {STATUTS.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
