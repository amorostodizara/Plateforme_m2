import { Link, useNavigate } from '@tanstack/react-router'
import {
  Copy,
  Lock,
  MoreHorizontal,
  Pencil,
  PlayCircle,
  Send,
  Trash2,
} from 'lucide-react'

import { SqueletteLignesTableau } from '@/components/app/Squelette'
import {
  peutPasserEvaluation,
  type Evaluation,
  type InscriptionAvecPresences,
} from '@/lib/evaluations'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type Props = {
  chargement: boolean
  affichees: Evaluation[]
  inscriptions: InscriptionAvecPresences[]
  couleur: Record<string, string>
  peutGerer: boolean
  setDetail: (evaluation: Evaluation) => void
  dateHeureFr: (date: string | null) => string
  dupliquer: {
    mutate: (evaluation: Evaluation) => void
  }
  changerStatut: {
    mutate: (args: { id: number; statut: 'Publiée' | 'Fermée' }) => void
  }
  supprimer: {
    mutate: (evaluationId: number) => void
  }
  peutPublierEvaluation: (evaluation: Evaluation) => boolean
  peutFermerEvaluation: (evaluation: Evaluation) => boolean
  peutModifierEvaluation: (evaluation: Evaluation) => boolean
}

export function VueGestionnaire({
  chargement,
  affichees,
  inscriptions,
  couleur,
  peutGerer,
  setDetail,
  dateHeureFr,
  dupliquer,
  changerStatut,
  supprimer,
  peutPublierEvaluation,
  peutFermerEvaluation,
  peutModifierEvaluation,
}: Props) {
  const navigate = useNavigate()

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="max-h-[560px] overflow-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="sticky top-0 bg-secondary">
            <tr>
              {[
                'Évaluation',
                'Session',
                'Publication',
                'Fermeture',
                'Durée',
                'Score requis',
                'Statut',
                'Actions',
              ].map((t) => (
                <th
                  key={t}
                  className="whitespace-nowrap px-3 py-3 text-xs font-bold tracking-wide text-muted-foreground"
                >
                  {t}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {chargement ? (
              <SqueletteLignesTableau colonnes={8} />
            ) : affichees.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-muted-foreground">
                  Aucune évaluation pour le moment.
                </td>
              </tr>
            ) : (
              affichees.map((e) => (
                <tr
                  key={e.evaluation_id}
                  onClick={() => setDetail(e)}
                  className="cursor-pointer border-t border-border hover:bg-secondary/60"
                >
                  <td className="px-3 py-3 font-medium text-foreground">
                    {e.titre_evaluation}
                  </td>

                  <td className="px-3 py-3 text-muted-foreground">
                    {e.session?.nom_session ?? '—'}
                  </td>

                  <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">
                    {dateHeureFr(e.date_publication)}
                  </td>

                  <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">
                    {dateHeureFr(e.date_fermeture)}
                  </td>

                  <td className="px-3 py-3 text-muted-foreground">
                    {e.duree_minutes} min
                  </td>

                  <td className="px-3 py-3 text-muted-foreground">
                    {e.score_reussite} %
                  </td>

                  <td className="px-3 py-3">
                    <span
                      className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${couleur[e.statut]}`}
                    >
                      {e.statut}
                    </span>
                  </td>

                  <td
                    className="px-3 py-3"
                    onClick={(ev) => ev.stopPropagation()}
                  >
                    <DropdownMenu>
                      <DropdownMenuTrigger className="rounded-md p-1.5 hover:bg-secondary">
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>

                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="cursor-pointer"
                          onClick={() => setDetail(e)}
                        >
                          Consulter
                        </DropdownMenuItem>

                        {peutPasserEvaluation(e, inscriptions) ? (
                          <DropdownMenuItem className="cursor-pointer" asChild>
                            <Link
                              to="/evaluations/passer/$evaluationId"
                              params={{
                                evaluationId: String(e.evaluation_id),
                              }}
                            >
                              <PlayCircle />
                              Passer l’évaluation
                            </Link>
                          </DropdownMenuItem>
                        ) : null}

                        {peutGerer ? (
                          <div>
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={() => dupliquer.mutate(e)}
                            >
                              <Copy />
                              Dupliquer
                            </DropdownMenuItem>

                            {peutPublierEvaluation(e) ? (
                              <DropdownMenuItem
                                className="cursor-pointer"
                                onClick={() =>
                                  changerStatut.mutate({
                                    id: e.evaluation_id,
                                    statut: 'Publiée',
                                  })
                                }
                              >
                                <Send />
                                Publier
                              </DropdownMenuItem>
                            ) : null}

                            {peutFermerEvaluation(e) ? (
                              <DropdownMenuItem
                                className="cursor-pointer"
                                onClick={() =>
                                  changerStatut.mutate({
                                    id: e.evaluation_id,
                                    statut: 'Fermée',
                                  })
                                }
                              >
                                <Lock />
                                Fermer
                              </DropdownMenuItem>
                            ) : null}

                            <DropdownMenuSeparator />

                            <DropdownMenuItem
                              className="cursor-pointer"
                              disabled={!peutModifierEvaluation(e)}
                              onClick={() => {
                                if (!peutModifierEvaluation(e)) return

                                navigate({
                                  to: '/evaluations/creation',
                                  search: {
                                    evaluationId: e.evaluation_id,
                                  },
                                })
                              }}
                            >
                              <Pencil />
                              Modifier
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              className="background-delete cursor-pointer"
                              onClick={() => supprimer.mutate(e.evaluation_id)}
                            >
                              <Trash2 />
                              Supprimer
                            </DropdownMenuItem>
                          </div>
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
  )
}
