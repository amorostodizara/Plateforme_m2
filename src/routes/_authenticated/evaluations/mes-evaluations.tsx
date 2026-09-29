import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, CalendarDays, Clock, Copy, FileClock, Lock, MoreHorizontal, PlayCircle, Send, Target, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useProfilCourant } from "@/components/app/AppShell";
import { SqueletteLignesTableau } from "@/components/app/Squelette";

export const Route = createFileRoute("/_authenticated/evaluations/mes-evaluations")({
  head: () => ({
    meta: [
      { title: "Mes évaluations — Orange Digital Center" },
      { name: "description", content: "Consultez, publiez et suivez vos évaluations de formation." },
      { property: "og:title", content: "Mes évaluations — Orange Digital Center" },
      { property: "og:description", content: "Liste des évaluations avec statut, paramètres et actions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MesEvaluations,
});

type Statut = "Brouillon" | "Publiée" | "Fermée";

type Evaluation = {
  evaluation_id: number;
  titre_evaluation: string;
  date_publication: string | null;
  date_fermeture: string | null;
  duree_minutes: number;
  max_tentatives: number;
  score_reussite: number;
  statut: Statut;
  session: { nom_session: string; formation: { titre: string } | null } | null;
  question_evaluation: { question_evaluation_id: number }[] | null;
};

const dateFr = (v: string | null) =>
  v ? new Date(v).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

const couleur: Record<Statut, string> = {
  Brouillon: "bg-secondary text-muted-foreground",
  Publiée: "bg-[#E6F4EA] text-[#137333]",
  Fermée: "bg-[#FCE8E6] text-[#C5221F]",
};

function MesEvaluations() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [filtre, setFiltre] = useState<"Tous" | Statut>("Tous");
  const [detail, setDetail] = useState<Evaluation | null>(null);
  const { data: profil } = useProfilCourant();
  const peutGerer = (profil?.roles ?? []).some((r) => r === "RESPONSABLE" || r === "ADMINISTRATEUR" || r === "FORMATEUR");

  const { data: evaluations = [], isLoading } = useQuery({
    queryKey: ["evaluations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("evaluation")
        .select(
          "evaluation_id, titre_evaluation, date_publication, date_fermeture, duree_minutes, max_tentatives, score_reussite, statut, session:session_formation(nom_session, formation:formation(titre)), question_evaluation(question_evaluation_id)",
        )
        .order("evaluation_id", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Evaluation[];
    },
  });

  const changerStatut = useMutation({
    mutationFn: async ({ id, statut }: { id: number; statut: Statut }) => {
      const { error } = await supabase.from("evaluation").update({ statut }).eq("evaluation_id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Évaluation mise à jour.");
      queryClient.invalidateQueries({ queryKey: ["evaluations"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const supprimer = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from("evaluation").delete().eq("evaluation_id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Évaluation supprimée.");
      setDetail(null);
      queryClient.invalidateQueries({ queryKey: ["evaluations"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const dupliquer = useMutation({
    mutationFn: async (source: Evaluation) => {
      const { data: complet, error: e0 } = await supabase
        .from("evaluation")
        .select("session_id, duree_minutes, max_tentatives, score_reussite, question_evaluation(texte_question, type_question, ordre_question, points, est_requis, option_question(texte_option, est_correct, ordre_option))")
        .eq("evaluation_id", source.evaluation_id)
        .single();
      if (e0) throw e0;
      const { data: copie, error: e1 } = await supabase
        .from("evaluation")
        .insert({
          session_id: complet.session_id,
          titre_evaluation: `${source.titre_evaluation} (copie)`,
          duree_minutes: complet.duree_minutes,
          max_tentatives: complet.max_tentatives,
          score_reussite: complet.score_reussite,
          statut: "Brouillon",
        })
        .select("evaluation_id")
        .single();
      if (e1) throw e1;
      for (const q of complet.question_evaluation ?? []) {
        const { data: nq, error: e2 } = await supabase
          .from("question_evaluation")
          .insert({
            evaluation_id: copie.evaluation_id,
            texte_question: q.texte_question,
            type_question: q.type_question,
            ordre_question: q.ordre_question,
            points: q.points,
            est_requis: q.est_requis,
          })
          .select("question_evaluation_id")
          .single();
        if (e2) throw e2;
        if ((q.option_question ?? []).length) {
          const { error: e3 } = await supabase.from("option_question").insert(
            (q.option_question ?? []).map((o) => ({
              question_evaluation_id: nq.question_evaluation_id,
              texte_option: o.texte_option,
              est_correct: o.est_correct,
              ordre_option: o.ordre_option,
            })),
          );
          if (e3) throw e3;
        }
      }
    },
    onSuccess: () => {
      toast.success("Évaluation dupliquée.");
      queryClient.invalidateQueries({ queryKey: ["evaluations"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Un participant ne voit que les évaluations publiées par le responsable (ou déjà fermées).
  const visibles = useMemo(
    () => (peutGerer ? evaluations : evaluations.filter((e) => e.statut !== "Brouillon")),
    [evaluations, peutGerer],
  );

  const affichees = useMemo(
    () => visibles.filter((e) => filtre === "Tous" || e.statut === filtre),
    [visibles, filtre],
  );

  return (
    <div className="flex gap-4">
      <div className="min-w-0 flex-1 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Mes évaluations</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {peutGerer
                ? "Suivez vos questionnaires, publiez-les et consultez leurs paramètres."
                : "Les évaluations publiées par le responsable apparaissent ici."}
            </p>
          </div>
          {peutGerer ? (
            <Link to="/evaluations/creation" className="flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90">
              Nouvelle évaluation
            </Link>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {(peutGerer ? (["Tous", "Brouillon", "Publiée", "Fermée"] as const) : (["Tous", "Publiée", "Fermée"] as const)).map((s) => (
            <button
              key={s}
              onClick={() => setFiltre(s)}
              className={`h-9 rounded-md px-3 text-sm font-semibold ${filtre === s ? "bg-primary text-primary-foreground" : "border border-input hover:bg-secondary"}`}
            >
              {s}
            </button>
          ))}
        </div>

        {isLoading ? (
          peutGerer ? null : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-44 animate-pulse rounded-lg border border-border bg-secondary/60" />
              ))}
            </div>
          )
        ) : !peutGerer && affichees.length === 0 ? (
          <div className="flex min-h-72 flex-col items-center justify-center rounded-lg border border-dashed border-input bg-card px-6 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-cream text-primary"><FileClock className="h-7 w-7" /></span>
            <h2 className="mt-4 text-base font-bold text-foreground">En attente d’une évaluation</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">Les évaluations apparaîtront ici dès qu’un responsable les aura publiées ou fermés pour votre session.</p>
          </div>
        ) : !peutGerer ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {affichees.map((e) => (
              <article key={e.evaluation_id} className="group overflow-hidden rounded-lg border border-border bg-card shadow-sm transition hover:shadow-card">
                <div className="flex h-1.5 bg-primary" />
                <button
                  onClick={() => (e.statut === "Publiée" ? navigate({ to: "/evaluations/passer/$evaluationId", params: { evaluationId: String(e.evaluation_id) } }) : setDetail(e))}
                  className="block w-full p-4 text-left"
                  aria-label={`Ouvrir ${e.titre_evaluation}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-bold text-foreground">{e.titre_evaluation}</h3>
                      <p className="mt-0.5 truncate text-sm text-muted-foreground">{e.session?.formation?.titre ?? "—"} · {e.session?.nom_session ?? "—"}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${couleur[e.statut]}`}>{e.statut}</span>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-md bg-secondary/70 px-2 py-1.5">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Questions</p>
                      <p className="text-sm font-bold text-foreground">{e.question_evaluation?.length ?? 0}</p>
                    </div>
                    <div className="rounded-md bg-secondary/70 px-2 py-1.5">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Durée</p>
                      <p className="text-sm font-bold text-foreground">{e.duree_minutes} min</p>
                    </div>
                    <div className="rounded-md bg-secondary/70 px-2 py-1.5">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Réussite</p>
                      <p className="text-sm font-bold text-foreground">{e.score_reussite} %</p>
                    </div>
                  </div>
                </button>
                <div className="flex items-center justify-between border-t border-border px-4 py-2.5">
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Lock className="h-3.5 w-3.5" />{dateFr(e.date_fermeture)}
                  </span>
                  {e.statut === "Publiée" ? (
                    <Link
                      to="/evaluations/passer/$evaluationId"
                      params={{ evaluationId: String(e.evaluation_id) }}
                      className="flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground hover:opacity-90"
                    >
                      <PlayCircle className="h-4 w-4" />Commencer
                    </Link>
                  ) : (
                    <button onClick={() => setDetail(e)} className="text-sm font-semibold text-muted-foreground hover:text-foreground">Détails</button>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
        <div className="rounded-lg border border-border bg-card">
          <div className="max-h-[560px] overflow-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="sticky top-0 bg-secondary">
                <tr>
                  {["Évaluation", "Session", "Publication", "Fermeture", "Durée", "Score requis", "Statut", "Actions"].map((t) => (
                    <th key={t} className="whitespace-nowrap px-3 py-3 text-xs font-bold tracking-wide text-muted-foreground">{t}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <SqueletteLignesTableau colonnes={8} />
                ) : affichees.length === 0 ? (
                  <tr><td colSpan={8} className="px-3 py-6 text-muted-foreground">
                    {peutGerer ? "Aucune évaluation pour le moment." : "Aucune évaluation publiée pour le moment."}
                  </td></tr>
                ) : (
                  affichees.map((e) => (
                    <tr key={e.evaluation_id} onClick={() => setDetail(e)} className="cursor-pointer border-t border-border hover:bg-secondary/60">
                      <td className="px-3 py-3 font-medium text-foreground">{e.titre_evaluation}</td>
                      <td className="px-3 py-3 text-muted-foreground">{e.session?.nom_session ?? "—"}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">{dateFr(e.date_publication)}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">{dateFr(e.date_fermeture)}</td>
                      <td className="px-3 py-3 text-muted-foreground">{e.duree_minutes} min</td>
                      <td className="px-3 py-3 text-muted-foreground">{e.score_reussite} %</td>
                      <td className="px-3 py-3">
                        <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${couleur[e.statut]}`}>{e.statut}</span>
                      </td>
                      <td className="px-3 py-3" onClick={(ev) => ev.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger className="rounded-md p-1.5 hover:bg-secondary"><MoreHorizontal className="h-4 w-4" /></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setDetail(e)}>Consulter</DropdownMenuItem>
                            {e.statut === "Publiée" ? (
                              <DropdownMenuItem asChild>
                                <Link to="/evaluations/passer/$evaluationId" params={{ evaluationId: String(e.evaluation_id) }}>
                                  <PlayCircle />Passer l’évaluation
                                </Link>
                              </DropdownMenuItem>
                            ) : null}
                            {peutGerer ? (
                              <>
                                <DropdownMenuItem onClick={() => dupliquer.mutate(e)}><Copy />Dupliquer</DropdownMenuItem>
                                {e.statut === "Brouillon" ? (
                                  <DropdownMenuItem onClick={() => changerStatut.mutate({ id: e.evaluation_id, statut: "Publiée" })}><Send />Publier</DropdownMenuItem>
                                ) : null}
                                {e.statut === "Publiée" ? (
                                  <DropdownMenuItem onClick={() => changerStatut.mutate({ id: e.evaluation_id, statut: "Fermée" })}><Lock />Fermer</DropdownMenuItem>
                                ) : null}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive" onClick={() => supprimer.mutate(e.evaluation_id)}><Trash2 />Supprimer</DropdownMenuItem>
                              </>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        )}
      </div>

      {detail ? (
        <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-sm overflow-auto border-l border-border bg-card p-5 shadow-card xl:static xl:z-auto xl:w-80 xl:shrink-0 xl:rounded-lg xl:border">
          <div className="flex items-start justify-between">
            <h2 className="text-base font-bold text-foreground">Détails de l’évaluation</h2>
            <button onClick={() => setDetail(null)} className="rounded-md p-1 hover:bg-secondary" aria-label="Fermer"><X className="h-5 w-5" /></button>
          </div>
          <p className="mt-4 text-sm font-bold text-foreground">{detail.titre_evaluation}</p>
          <span className={`mt-2 inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${couleur[detail.statut]}`}>{detail.statut}</span>

          <div className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
            <Ligne icone={CalendarDays} k="Formation" v={detail.session?.formation?.titre ?? "—"} />
            <Ligne icone={CalendarDays} k="Session" v={detail.session?.nom_session ?? "—"} />
            <Ligne icone={Send} k="Publication" v={dateFr(detail.date_publication)} />
            <Ligne icone={Lock} k="Fermeture" v={dateFr(detail.date_fermeture)} />
            <Ligne icone={Clock} k="Durée" v={`${detail.duree_minutes} minutes`} />
            <Ligne icone={BadgeCheck} k="Tentatives" v={String(detail.max_tentatives)} />
            <Ligne icone={Target} k="Score de réussite" v={`${detail.score_reussite} %`} />
            <Ligne icone={BadgeCheck} k="Questions" v={String(detail.question_evaluation?.length ?? 0)} />
          </div>

          {detail.statut === "Publiée" ? (
            <Link
              to="/evaluations/passer/$evaluationId"
              params={{ evaluationId: String(detail.evaluation_id) }}
              className="mt-5 flex h-10 items-center justify-center gap-2 rounded-md bg-primary text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              <PlayCircle className="h-4 w-4" />Passer l’évaluation
            </Link>
          ) : null}
        </aside>
      ) : null}
    </div>
  );
}

function Ligne({ icone: Icone, k, v }: { icone: typeof Clock; k: string; v: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="flex items-center gap-2 text-muted-foreground"><Icone className="h-4 w-4" />{k}</span>
      <span className="text-right font-medium text-foreground">{v}</span>
    </div>
  );
}
