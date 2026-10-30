import { useMemo, useState, useEffect } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  BadgeCheck,
  CalendarDays,
  Clock,
  Lock,
  PlayCircle,
  Send,
  Target,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { useProfilCourant } from '@/components/app/AppShell'
import { dateHeureFr } from '@/components/app/AdminKit'
import { VueParticipant } from '@/components/app/VueParticipant'
import { VueGestionnaire } from '@/components/app/VueGestionnaire'
import {
  peutPasserEvaluation,
  type Evaluation,
  type Statut,
} from '@/lib/evaluations'
import { useMesInscriptionsEvaluations } from '@/hooks/useMesInscriptionsEvaluations'

export const Route = createFileRoute(
  '/_authenticated/evaluations/mes-evaluations',
)({
  head: () => ({
    meta: [
      { title: 'Mes évaluations ' },
      {
        name: 'description',
        content: 'Consultez, publiez et suivez vos évaluations de formation.',
      },
      {
        property: 'og:title',
        content: 'Mes évaluations ',
      },
      {
        property: 'og:description',
        content: 'Liste des évaluations avec statut, paramètres et actions.',
      },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: MesEvaluations,
})
const couleur: Record<Statut, string> = {
  Brouillon: 'bg-secondary text-muted-foreground',
  Publiée: 'bg-[#E6F4EA] text-[#137333]',
  Fermée: 'bg-[#FCE8E6] text-[#C5221F]',
}

function MesEvaluations() {
  const queryClient = useQueryClient()
  const [filtre, setFiltre] = useState<'Tous' | Statut>('Tous')
  const [detail, setDetail] = useState<Evaluation | null>(null)
  const { data: profil } = useProfilCourant()

  const { data: inscriptions = [], isLoading: isLoadingInscriptions } =
    useMesInscriptionsEvaluations(profil?.participant_id)
  const peutGerer =
    profil?.roles?.includes('ADMINISTRATEUR') ||
    profil?.roles?.includes('RESPONSABLE') ||
    profil?.roles?.includes('FORMATEUR') ||
    false

  const { data: evaluations = [], isLoading } = useQuery({
    queryKey: ['evaluations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('evaluation')
        .select(
          'evaluation_id,session_id, titre_evaluation, date_publication, date_fermeture, duree_minutes, max_tentatives, score_reussite, statut, session:session_formation(nom_session, formation:formation(titre)), question_evaluation(question_evaluation_id)',
        )
        .order('evaluation_id', { ascending: false })
      if (error) throw error
      return (data ?? []) as unknown as Evaluation[]
    },
  })

  const fermerEvaluationsExpirees = useMutation({
    mutationFn: async () => {
      const maintenant = new Date().toISOString()

      const { error } = await supabase
        .from('evaluation')
        .update({ statut: 'Fermée' })
        .eq('statut', 'Publiée')
        .not('date_fermeture', 'is', null)
        .lte('date_fermeture', maintenant)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluations'] })
    },
  })

  useEffect(() => {
    void fermerEvaluationsExpirees.mutateAsync()
  }, [])

  const changerStatut = useMutation({
    mutationFn: async ({ id, statut }: { id: number; statut: Statut }) => {
      const { error } = await supabase
        .from('evaluation')
        .update({ statut })
        .eq('evaluation_id', id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Évaluation mise à jour.')
      queryClient.invalidateQueries({ queryKey: ['evaluations'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const supprimer = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('evaluation')
        .delete()
        .eq('evaluation_id', id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Évaluation supprimée.')
      setDetail(null)
      queryClient.invalidateQueries({ queryKey: ['evaluations'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const dupliquer = useMutation({
    mutationFn: async (source: Evaluation) => {
      const { data: complet, error: e0 } = await supabase
        .from('evaluation')
        .select(
          'session_id,date_publication, date_fermeture, duree_minutes, max_tentatives, score_reussite, question_evaluation(texte_question, type_question, ordre_question, points, est_requis, option_question(texte_option, est_correct, ordre_option))',
        )
        .eq('evaluation_id', source.evaluation_id)
        .single()
      if (e0) throw e0
      const { data: copie, error: e1 } = await supabase
        .from('evaluation')
        .insert({
          session_id: complet.session_id,
          titre_evaluation: `${source.titre_evaluation} (copie)`,
          date_publication: complet.date_publication,
          date_fermeture: complet.date_fermeture,
          duree_minutes: complet.duree_minutes,
          max_tentatives: complet.max_tentatives,
          score_reussite: complet.score_reussite,
          statut: 'Brouillon',
        })
        .select('evaluation_id')
        .single()
      if (e1) throw e1
      for (const q of complet.question_evaluation ?? []) {
        const { data: nq, error: e2 } = await supabase
          .from('question_evaluation')
          .insert({
            evaluation_id: copie.evaluation_id,
            texte_question: q.texte_question,
            type_question: q.type_question,
            ordre_question: q.ordre_question,
            points: q.points,
            est_requis: q.est_requis,
          })
          .select('question_evaluation_id')
          .single()
        if (e2) throw e2
        if ((q.option_question ?? []).length) {
          const { error: e3 } = await supabase.from('option_question').insert(
            (q.option_question ?? []).map((o) => ({
              question_evaluation_id: nq.question_evaluation_id,
              texte_option: o.texte_option,
              est_correct: o.est_correct,
              ordre_option: o.ordre_option,
            })),
          )
          if (e3) throw e3
        }
      }
    },
    onSuccess: () => {
      toast.success('Évaluation dupliquée.')
      queryClient.invalidateQueries({ queryKey: ['evaluations'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  // Un participant ne voit que les évaluations publiées par le responsable (ou déjà fermées).
  const visibles = useMemo(
    () =>
      peutGerer
        ? evaluations
        : evaluations.filter((e) => e.statut !== 'Brouillon'),
    [evaluations, peutGerer],
  )

  const affichees = useMemo(
    () => visibles.filter((e) => filtre === 'Tous' || e.statut === filtre),
    [visibles, filtre],
  )

  function peutModifierEvaluation(e: Evaluation) {
    return e.statut === 'Brouillon' || e.statut === 'Fermée'
  }

  function peutPublierEvaluation(e: Evaluation) {
    return e.statut === 'Brouillon' || e.statut === 'Fermée'
  }

  function peutFermerEvaluation(e: Evaluation) {
    return e.statut === 'Publiée'
  }

  const chargement = isLoading || isLoadingInscriptions

  return (
    <div className="flex gap-4">
      <div className="min-w-0 flex-1 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Mes évaluations
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {peutGerer
                ? 'Suivez vos questionnaires, publiez-les et consultez leurs paramètres.'
                : 'Les évaluations publiées par le responsable apparaissent ici.'}
            </p>
          </div>
          {peutGerer ? (
            <Link
              to="/evaluations/creation"
              search={{ evaluationId: undefined }}
              className="flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              Nouvelle évaluation
            </Link>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {(peutGerer
            ? (['Tous', 'Brouillon', 'Publiée', 'Fermée'] as const)
            : (['Tous', 'Publiée', 'Fermée'] as const)
          ).map((s) => (
            <button
              key={s}
              onClick={() => setFiltre(s)}
              className={`h-9 rounded-md px-3 text-sm font-semibold ${filtre === s ? 'bg-primary text-primary-foreground' : 'border border-input hover:bg-secondary'}`}
            >
              {s}
            </button>
          ))}
        </div>
        {!peutGerer ? (
          <VueParticipant
            affichees={affichees}
            inscriptions={inscriptions}
            couleur={couleur}
            setDetail={setDetail}
            dateHeureFr={dateHeureFr}
          />
        ) : (
          <VueGestionnaire
            chargement={chargement}
            affichees={affichees}
            inscriptions={inscriptions}
            couleur={couleur}
            peutGerer={peutGerer}
            setDetail={setDetail}
            dateHeureFr={dateHeureFr}
            dupliquer={dupliquer}
            changerStatut={changerStatut}
            supprimer={supprimer}
            peutPublierEvaluation={peutPublierEvaluation}
            peutFermerEvaluation={peutFermerEvaluation}
            peutModifierEvaluation={peutModifierEvaluation}
          />
        )}
      </div>

      {detail ? (
        <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-sm overflow-auto border-l border-border bg-card p-5 shadow-card xl:static xl:z-auto xl:w-80 xl:shrink-0 xl:rounded-lg xl:border">
          <div className="flex items-start justify-between">
            <h2 className="text-base font-bold text-foreground">
              Détails de l’évaluation
            </h2>
            <button
              onClick={() => setDetail(null)}
              className="rounded-md p-1 hover:bg-secondary"
              aria-label="Fermer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="mt-4 text-sm font-bold text-foreground">
            {detail.titre_evaluation}
          </p>
          <span
            className={`mt-2 inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${couleur[detail.statut]}`}
          >
            {detail.statut}
          </span>

          <div className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
            <Ligne
              icone={CalendarDays}
              k="Formation"
              v={detail.session?.formation?.titre ?? '—'}
            />
            <Ligne
              icone={CalendarDays}
              k="Session"
              v={detail.session?.nom_session ?? '—'}
            />
            <Ligne
              icone={Send}
              k="Publication"
              v={dateHeureFr(detail.date_publication)}
            />
            <Ligne
              icone={Lock}
              k="Fermeture"
              v={dateHeureFr(detail.date_fermeture)}
            />
            <Ligne
              icone={Clock}
              k="Durée"
              v={`${detail.duree_minutes} minutes`}
            />
            <Ligne
              icone={BadgeCheck}
              k="Tentatives"
              v={String(detail.max_tentatives)}
            />
            <Ligne
              icone={Target}
              k="Score de réussite"
              v={`${detail.score_reussite} %`}
            />
            <Ligne
              icone={BadgeCheck}
              k="Questions"
              v={String(detail.question_evaluation?.length ?? 0)}
            />
          </div>

          {peutPasserEvaluation(detail, inscriptions) ? (
            <Link
              to="/evaluations/passer/$evaluationId"
              params={{ evaluationId: String(detail.evaluation_id) }}
            >
              <PlayCircle className="h-4 w-4" />
              Passer l’évaluation
            </Link>
          ) : null}
        </aside>
      ) : null}
    </div>
  )
}

function Ligne({
  icone: Icone,
  k,
  v,
}: {
  icone: typeof Clock
  k: string
  v: string
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="flex items-center gap-2 text-muted-foreground">
        <Icone className="h-4 w-4" />
        {k}
      </span>
      <span className="text-right font-medium text-foreground">{v}</span>
    </div>
  )
}
