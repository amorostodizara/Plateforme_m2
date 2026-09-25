import { useState } from "react";
import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SqueletteEntete, SqueletteGrilleCartes } from "@/components/app/Squelette";

export const Route = createFileRoute("/_authenticated/evaluations/passer/$evaluationId")({
  head: () => ({
    meta: [
      { title: "Passer l’évaluation — Orange Digital Center" },
      { name: "description", content: "Répondez au questionnaire de la session puis soumettez votre tentative." },
      { property: "og:title", content: "Passer l’évaluation — Orange Digital Center" },
      { property: "og:description", content: "Questionnaire de formation et résultat immédiat." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Passage,
});

type Option = { option_question_id: number; texte_option: string; est_correct: boolean };
type Question = {
  question_evaluation_id: number;
  texte_question: string;
  type_question: "Choix unique" | "Choix multiple" | "Vrai/Faux";
  points: number;
  est_requis: boolean;
  ordre_question: number;
  option_question: Option[];
};

function Passage() {
  const { evaluationId } = useParams({ from: "/_authenticated/evaluations/passer/$evaluationId" });
  const navigate = useNavigate();
  const [reponses, setReponses] = useState<Record<number, number[]>>({});
  const [resultat, setResultat] = useState<{ score: number; reussi: boolean } | null>(null);
  const [enCours, setEnCours] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["evaluation", evaluationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("evaluation")
        .select(
          "evaluation_id, titre_evaluation, duree_minutes, score_reussite, session_id, session:session_formation(nom_session), question_evaluation(question_evaluation_id, texte_question, type_question, points, est_requis, ordre_question, option_question(option_question_id, texte_option, est_correct))",
        )
        .eq("evaluation_id", Number(evaluationId))
        .single();
      if (error) throw error;
      return data;
    },
  });

  const questions = ((data?.question_evaluation ?? []) as unknown as Question[])
    .slice()
    .sort((a, b) => a.ordre_question - b.ordre_question);

  function basculer(q: Question, optionId: number) {
    setReponses((r) => {
      const actuelles = r[q.question_evaluation_id] ?? [];
      if (q.type_question === "Choix multiple") {
        return {
          ...r,
          [q.question_evaluation_id]: actuelles.includes(optionId)
            ? actuelles.filter((id) => id !== optionId)
            : [...actuelles, optionId],
        };
      }
      return { ...r, [q.question_evaluation_id]: [optionId] };
    });
  }

  async function soumettre() {
    if (!data) return;
    const manquantes = questions.filter((q) => q.est_requis && !(reponses[q.question_evaluation_id] ?? []).length);
    if (manquantes.length) {
      toast.error("Répondez à toutes les questions requises.");
      return;
    }
    setEnCours(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const { data: moi } = await supabase
        .from("utilisateur")
        .select("utilisateur_id, participant:participant(participant_id)")
        .eq("auth_user_id", auth.user?.id ?? "")
        .maybeSingle();
      const brut = moi?.participant as { participant_id: number } | { participant_id: number }[] | null | undefined;
      const participantId = Array.isArray(brut) ? brut[0]?.participant_id : brut?.participant_id;
      if (!participantId) throw new Error("Aucun profil participant associé à votre compte.");

      const { data: inscription } = await supabase
        .from("inscription")
        .select("inscription_id")
        .eq("participant_id", participantId)
        .eq("session_id", data.session_id)
        .eq("statut", "Acceptée")
        .maybeSingle();
      if (!inscription) throw new Error("Votre inscription à cette session n’est pas acceptée.");

      let obtenus = 0;
      let total = 0;
      const lignes: { question_evaluation_id: number; option_question_id: number; est_correct: boolean; points_gagnes: number }[] = [];
      for (const q of questions) {
        total += Number(q.points);
        const choisies = reponses[q.question_evaluation_id] ?? [];
        const correctes = q.option_question.filter((o) => o.est_correct).map((o) => o.option_question_id);
        const juste =
          choisies.length === correctes.length && choisies.every((id) => correctes.includes(id));
        if (juste) obtenus += Number(q.points);
        for (const id of choisies) {
          lignes.push({
            question_evaluation_id: q.question_evaluation_id,
            option_question_id: id,
            est_correct: correctes.includes(id),
            points_gagnes: juste ? Number(q.points) : 0,
          });
        }
      }
      const score = total ? Math.round((obtenus / total) * 100) : 0;
      const reussi = score >= Number(data.score_reussite);

      const { data: tentative, error } = await supabase
        .from("tentative_evaluation")
        .insert({
          evaluation_id: data.evaluation_id,
          inscription_id: inscription.inscription_id,
          soumis_le: new Date().toISOString(),
          score,
          statut: "Corrigée",
          reussi,
        })
        .select("tentative_evaluation_id")
        .single();
      if (error) throw error;

      if (lignes.length) {
        const { error: e2 } = await supabase
          .from("reponse_participant")
          .insert(lignes.map((l) => ({ ...l, tentative_evaluation_id: tentative.tentative_evaluation_id })));
        if (e2) throw e2;
      }

      if (reussi) {
        const { data: existante } = await supabase
          .from("attestation")
          .select("attestation_id")
          .eq("inscription_id", inscription.inscription_id)
          .maybeSingle();
        if (!existante) {
          await supabase.from("attestation").insert({
            inscription_id: inscription.inscription_id,
            statut: "Valide",
            numero_attestation: `ATT-${Date.now().toString().slice(-8)}`,
            jeton_verification: crypto.randomUUID().replace(/-/g, ""),
          });
        }
      }

      setResultat({ score, reussi });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setEnCours(false);
    }
  }

  if (isLoading)
    return (
      <div className="space-y-4">
        <SqueletteEntete />
        <SqueletteGrilleCartes nombre={3} />
      </div>
    );
  if (!data) return <p className="text-sm text-muted-foreground">Évaluation introuvable.</p>;

  if (resultat) {
    return (
      <div className="mx-auto max-w-lg rounded-lg border border-border bg-card p-8 text-center">
        {resultat.reussi ? (
          <CheckCircle2 className="mx-auto h-12 w-12 text-[#137333]" />
        ) : (
          <XCircle className="mx-auto h-12 w-12 text-destructive" />
        )}
        <h1 className="mt-4 text-xl font-bold text-foreground">
          {resultat.reussi ? "Évaluation réussie" : "Évaluation non réussie"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Votre score : <b className="text-foreground">{resultat.score} %</b> — score requis : {data.score_reussite} %
        </p>
        {resultat.reussi ? (
          <p className="mt-2 text-sm text-muted-foreground">Votre attestation a été générée et est disponible dans « Mes attestations ».</p>
        ) : null}
        <button
          onClick={() => navigate({ to: "/evaluations/mes-evaluations" })}
          className="mt-6 h-10 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          Retour aux évaluations
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 pb-8">
      <div className="rounded-lg border-t-4 border-primary bg-card p-5">
        <h1 className="text-xl font-bold text-foreground">{data.titre_evaluation}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{data.session?.nom_session}</p>
        <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />Durée conseillée : {data.duree_minutes} minutes — score requis {data.score_reussite} %
        </p>
      </div>

      {questions.map((q, i) => (
        <div key={q.question_evaluation_id} className="rounded-lg border border-border bg-card p-5">
          <p className="text-sm font-semibold text-foreground">
            {i + 1}. {q.texte_question} {q.est_requis ? <span className="text-destructive">*</span> : null}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{q.points} point(s) — {q.type_question}</p>
          <div className="mt-3 space-y-2">
            {q.option_question.map((o) => (
              <label key={o.option_question_id} className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type={q.type_question === "Choix multiple" ? "checkbox" : "radio"}
                  name={`q-${q.question_evaluation_id}`}
                  checked={(reponses[q.question_evaluation_id] ?? []).includes(o.option_question_id)}
                  onChange={() => basculer(q, o.option_question_id)}
                />
                {o.texte_option}
              </label>
            ))}
          </div>
        </div>
      ))}

      <button
        disabled={enCours}
        onClick={() => void soumettre()}
        className="h-10 w-full rounded-md bg-primary text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
      >
        Soumettre mes réponses
      </button>
    </div>
  );
}
