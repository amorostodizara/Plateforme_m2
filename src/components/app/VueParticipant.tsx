import { useNavigate } from '@tanstack/react-router'
import { FileClock, Lock, PlayCircle } from 'lucide-react'
import {
  peutPasserEvaluation,
  useCommencerEvaluation,
  type Evaluation,
  type InscriptionAvecPresences,
} from '@/lib/evaluations'

type Props = {
  affichees: Evaluation[]
  inscriptions: InscriptionAvecPresences[]
  couleur: Record<string, string>
  setDetail: (evaluation: Evaluation) => void
  dateHeureFr: (date: string | null) => string
}

export function VueParticipant({
  affichees,
  inscriptions,
  couleur,
  setDetail,
  dateHeureFr,
}: Props) {
  const navigate = useNavigate()
  const commencerEvaluation = useCommencerEvaluation(inscriptions, navigate)

  return (
    <>
      {affichees.length === 0 ? (
        <div className="flex min-h-72 flex-col items-center justify-center rounded-lg border border-dashed border-input bg-card px-6 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-cream text-primary">
            <FileClock className="h-7 w-7" />
          </span>

          <h2 className="mt-4 text-base font-bold text-foreground">
            En attente d’une évaluation
          </h2>

          <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            Les évaluations apparaîtront ici dès qu’un responsable les aura
            publiées ou fermés pour votre session.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {affichees.map((e) => (
            <article
              key={e.evaluation_id}
              className="group overflow-hidden rounded-lg border border-border bg-card shadow-sm transition hover:shadow-card"
            >
              <div className="flex h-1.5 bg-primary" />

              <button
                onClick={() =>
                  peutPasserEvaluation(e, inscriptions)
                    ? commencerEvaluation.mutate(e)
                    : setDetail(e)
                }
                className="block w-full p-4 text-left"
                aria-label={`Ouvrir ${e.titre_evaluation}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-bold text-foreground">
                      {e.titre_evaluation}
                    </h3>

                    <p className="mt-0.5 truncate text-sm text-muted-foreground">
                      {e.session?.formation?.titre ?? '—'} ·{' '}
                      {e.session?.nom_session ?? '—'}
                    </p>
                  </div>

                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${couleur[e.statut]}`}
                  >
                    {e.statut}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-md bg-secondary/70 px-2 py-1.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Questions
                    </p>
                    <p className="text-sm font-bold text-foreground">
                      {e.question_evaluation?.length ?? 0}
                    </p>
                  </div>

                  <div className="rounded-md bg-secondary/70 px-2 py-1.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Durée
                    </p>
                    <p className="text-sm font-bold text-foreground">
                      {e.duree_minutes} min
                    </p>
                  </div>

                  <div className="rounded-md bg-secondary/70 px-2 py-1.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Réussite
                    </p>
                    <p className="text-sm font-bold text-foreground">
                      {e.score_reussite} %
                    </p>
                  </div>
                </div>
              </button>

              <div className="flex items-center justify-between border-t border-border px-4 py-2.5">
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Lock className="h-3.5 w-3.5" />
                  Fermée le {dateHeureFr(e.date_fermeture)}
                </span>

                {peutPasserEvaluation(e, inscriptions) ? (
                  <button
                    type="button"
                    disabled={commencerEvaluation.isPending}
                    onClick={() => commencerEvaluation.mutate(e)}
                    className="flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
                  >
                    <PlayCircle className="h-4 w-4" />

                    {commencerEvaluation.isPending
                      ? 'Démarrage...'
                      : 'Commencer'}
                  </button>
                ) : (
                  <button
                    onClick={() => setDetail(e)}
                    className="text-sm font-semibold text-muted-foreground hover:text-foreground"
                  >
                    Détails
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  )
}
