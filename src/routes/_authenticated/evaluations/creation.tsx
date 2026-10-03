import { useState, useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { GripVertical, Plus, Save, Send, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { LabelObligatoire } from '@/components/app/AdminKit'
import { AccesReserve } from '@/components/app/Acces'
export const Route = createFileRoute('/_authenticated/evaluations/creation')({
  validateSearch: (search: Record<string, unknown>) => ({
    evaluationId:
      typeof search.evaluationId === 'number'
        ? search.evaluationId
        : typeof search.evaluationId === 'string' &&
            search.evaluationId.trim() !== ''
          ? Number(search.evaluationId)
          : undefined,
  }),
  head: () => ({
    meta: [
      { title: 'Création d’évaluation — Orange Digital Center' },
      {
        name: 'description',
        content:
          'Composez un questionnaire d’évaluation pour une session de formation.',
      },
      {
        property: 'og:title',
        content: 'Création d’évaluation — Orange Digital Center',
      },
      {
        property: 'og:description',
        content:
          'Questions à choix unique, choix multiple ou vrai/faux avec barème et paramètres.',
      },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: () => (
    <AccesReserve roles={['ADMINISTRATEUR', 'RESPONSABLE', 'FORMATEUR']}>
      <Creation />
    </AccesReserve>
  ),
})

type TypeQuestion = 'Choix unique' | 'Choix multiple' | 'Vrai/Faux'
type Option = { texte: string; correct: boolean }
type Question = {
  texte: string
  type: TypeQuestion
  points: number
  requis: boolean
  options: Option[]
}

const optionsVraiFaux = (): Option[] => [
  { texte: 'Vrai', correct: true },
  { texte: 'Faux', correct: false },
]

function convertirQuestions(questions: any[] | null | undefined): Question[] {
  if (!questions?.length) {
    return [
      {
        texte: '',
        type: 'Choix unique',
        points: 1,
        requis: true,
        options: [
          { texte: '', correct: true },
          { texte: '', correct: false },
        ],
      },
    ]
  }

  return [...questions]
    .sort((a, b) => (a.ordre_question ?? 0) - (b.ordre_question ?? 0))
    .map((q) => ({
      texte: q.texte_question,
      type: q.type_question as TypeQuestion,
      points: q.points,
      requis: q.est_requis,
      options: [...(q.option_question ?? [])]
        .sort((a, b) => (a.ordre_option ?? 0) - (b.ordre_option ?? 0))
        .map((o) => ({
          texte: o.texte_option,
          correct: o.est_correct,
        })),
    }))
}

function versDatetimeLocal(date: string | null) {
  if (!date) return ''

  const d = new Date(date)

  const pad = (value: number) => String(value).padStart(2, '0')

  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
    d.getDate(),
  )}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function Creation() {
  const navigate = useNavigate()
  const { evaluationId } = Route.useSearch()
  const modeModification = evaluationId != null

  const [sessionId, setSessionId] = useState<number | null>(null)
  const [titre, setTitre] = useState('')
  const [datePublication, setDatePublication] = useState('')
  const [dateFermeture, setDateFermeture] = useState('')
  const [duree, setDuree] = useState(30)
  const [tentatives, setTentatives] = useState(1)
  const [scoreReussite, setScoreReussite] = useState(50)
  const [questions, setQuestions] = useState<Question[]>([
    {
      texte: '',
      type: 'Choix unique',
      points: 1,
      requis: true,
      options: [
        { texte: '', correct: true },
        { texte: '', correct: false },
      ],
    },
  ])
  const [enCours, setEnCours] = useState(false)

  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions-evaluation'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('session_formation')
        .select('session_id, nom_session')
        .order('date_debut', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })

  const { data: evaluationExistante } = useQuery({
    queryKey: ['evaluation', evaluationId],
    enabled: modeModification,

    queryFn: async () => {
      if (!evaluationId) {
        throw new Error('Identifiant de l’évaluation manquant.')
      }

      const { data, error } = await supabase
        .from('evaluation')
        .select(
          `
        evaluation_id,
        session_id,
        titre_evaluation,
        date_publication,
        date_fermeture,
        duree_minutes,
        max_tentatives,
        score_reussite,
        statut,
        question_evaluation (
          question_evaluation_id,
          texte_question,
          type_question,
          ordre_question,
          points,
          est_requis,
          option_question (
            option_question_id,
            texte_option,
            est_correct,
            ordre_option
          )
        )
      `,
        )
        .eq('evaluation_id', evaluationId)
        .single()

      if (error) throw error

      return data
    },
  })

  useEffect(() => {
    if (!evaluationExistante) return

    if (evaluationExistante.statut === 'Publiée') {
      toast.error('Une évaluation publiée ne peut pas être modifiée.')

      navigate({
        to: '/evaluations/mes-evaluations',
      })
      return
    }
    setSessionId(evaluationExistante.session_id)
    setTitre(evaluationExistante.titre_evaluation)

    setDatePublication(versDatetimeLocal(evaluationExistante.date_publication))

    setDateFermeture(versDatetimeLocal(evaluationExistante.date_fermeture))

    setDuree(evaluationExistante.duree_minutes)
    setTentatives(evaluationExistante.max_tentatives)
    setScoreReussite(evaluationExistante.score_reussite)

    setQuestions(convertirQuestions(evaluationExistante.question_evaluation))
  }, [evaluationExistante, navigate])

  function majQuestion(index: number, patch: Partial<Question>) {
    setQuestions((qs) =>
      qs.map((q, i) => (i === index ? { ...q, ...patch } : q)),
    )
  }

  function majOption(qi: number, oi: number, patch: Partial<Option>) {
    setQuestions((qs) =>
      qs.map((q, i) => {
        if (i !== qi) return q
        const options = q.options.map((o, j) => {
          if (j !== oi)
            return q.type === 'Choix unique' && patch.correct
              ? { ...o, correct: false }
              : o
          return { ...o, ...patch }
        })
        return { ...q, options }
      }),
    )
  }

  async function enregistrer(publier: boolean) {
    if (!sessionId) {
      toast.error('Choisissez la session concernée.')
      return
    }
    if (
      !titre.trim() ||
      !datePublication ||
      !dateFermeture ||
      !duree ||
      !tentatives ||
      !scoreReussite
    ) {
      toast.error(
        'Le titre, la date, la durée, le nombre de tentatives et le score de réussite ne peuvent pas être vides.',
      )
      return
    }
    if (
      questions.length === 0 ||
      questions.some(
        (q) =>
          !q.texte.trim() ||
          q.options.length === 0 ||
          q.options.some((o) => !o.texte.trim()),
      )
    ) {
      toast.error(
        'Ajoutez au moins une question et renseignez chaque question avec ses options.',
      )
      return
    }
    setEnCours(true)

    try {
      const { data: utilisateur } = await supabase.auth.getUser()

      const { data: moi } = await supabase
        .from('utilisateur')
        .select('utilisateur_id')
        .eq('auth_user_id', utilisateur.user?.id ?? '')
        .maybeSingle()

      const donneesEvaluation = {
        session_id: sessionId,
        titre_evaluation: titre.trim(),
        date_publication: datePublication
          ? new Date(datePublication).toISOString()
          : null,
        date_fermeture: dateFermeture
          ? new Date(dateFermeture).toISOString()
          : null,
        duree_minutes: duree,
        max_tentatives: tentatives,
        score_reussite: scoreReussite,
      }

      let evaluationIdFinal: number
      if (modeModification) {
        if (!evaluationExistante) {
          throw new Error('Évaluation introuvable.')
        }

        if (evaluationExistante.statut === 'Publiée') {
          throw new Error('Une évaluation publiée ne peut pas être modifiée.')
        }
        const { error } = await supabase
          .from('evaluation')
          .update(donneesEvaluation)
          .eq('evaluation_id', evaluationId)
        if (error) throw error
        evaluationIdFinal = evaluationId!
      } else {
        const { data: evaluation, error } = await supabase
          .from('evaluation')
          .insert({
            ...donneesEvaluation,
            statut: publier ? 'Publiée' : 'Brouillon',
            cree_par: moi?.utilisateur_id ?? null,
          })
          .select('evaluation_id')
          .single()
        if (error) throw error
        evaluationIdFinal = evaluation.evaluation_id
      }

      if (modeModification && evaluationExistante) {
        const anciensQuestionIds =
          evaluationExistante.question_evaluation?.map(
            (q) => q.question_evaluation_id,
          ) ?? []
        if (anciensQuestionIds.length > 0) {
          const { error: erreurOptions } = await supabase
            .from('option_question')
            .delete()
            .in('question_evaluation_id', anciensQuestionIds)
          if (erreurOptions) throw erreurOptions
          const { error: erreurQuestions } = await supabase
            .from('question_evaluation')
            .delete()
            .in('question_evaluation_id', anciensQuestionIds)
          if (erreurQuestions) throw erreurQuestions
        }
      }
      for (const [index, q] of questions.entries()) {
        const { data: question, error: erreurQuestion } = await supabase
          .from('question_evaluation')
          .insert({
            evaluation_id: evaluationIdFinal,
            texte_question: q.texte.trim(),
            type_question: q.type,
            ordre_question: index + 1,
            points: q.points,
            est_requis: q.requis,
          })
          .select('question_evaluation_id')
          .single()
        if (erreurQuestion) throw erreurQuestion
        const { error: erreurOptions } = await supabase
          .from('option_question')
          .insert(
            q.options.map((o, j) => ({
              question_evaluation_id: question.question_evaluation_id,
              texte_option: o.texte.trim(),
              est_correct: o.correct,
              ordre_option: j + 1,
            })),
          )
        if (erreurOptions) throw erreurOptions
      }
      if (modeModification) {
        toast.success('Évaluation modifiée avec succès.')
      } else {
        toast.success(
          publier
            ? 'Évaluation publiée.'
            : 'Évaluation enregistrée en brouillon.',
        )
      }
      navigate({
        to: '/evaluations/mes-evaluations',
      })
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setEnCours(false)
    }
  }

  const champ =
    'h-10 w-full rounded-md border border-input bg-card px-3 text-sm focus:border-primary focus:outline-none'

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {modeModification
            ? 'Modifier l’évaluation'
            : 'Création d’une évaluation'}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {modeModification
            ? 'Modifiez les paramètres, les questions et les options de l’évaluation.'
            : 'Composez le questionnaire, définissez le barème puis publiez-le aux participants.'}
        </p>
      </div>

      <div className="space-y-4 rounded-lg border-t-4 border-primary bg-card p-5 shadow-sm">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold tracking-wide text-muted-foreground">
            Session
            <LabelObligatoire />
          </span>
          <select
            className={champ}
            value={sessionId ?? ''}
            onChange={(e) => setSessionId(Number(e.target.value))}
          >
            <option value="" disabled>
              Choisir une session
            </option>
            {sessions.map((s) => (
              <option key={s.session_id} value={s.session_id}>
                {s.nom_session}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold tracking-wide text-muted-foreground">
            Titre de l’évaluation
            <LabelObligatoire />
          </span>
          <input
            className={champ}
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
            placeholder="Évaluation finale"
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold tracking-wide text-muted-foreground">
              Date de publication
              <LabelObligatoire />
            </span>
            <input
              type="datetime-local"
              className={champ}
              value={datePublication}
              onChange={(e) => setDatePublication(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold tracking-wide text-muted-foreground">
              Date de fermeture
              <LabelObligatoire />
            </span>
            <input
              type="datetime-local"
              className={champ}
              value={dateFermeture}
              onChange={(e) => setDateFermeture(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold tracking-wide text-muted-foreground">
              Durée (minutes)
              <LabelObligatoire />
            </span>
            <input
              type="number"
              min={1}
              className={champ}
              value={duree}
              onChange={(e) => setDuree(Number(e.target.value))}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold tracking-wide text-muted-foreground">
              Tentatives maximales
              <LabelObligatoire />
            </span>
            <input
              type="number"
              min={1}
              className={champ}
              value={tentatives}
              onChange={(e) => setTentatives(Number(e.target.value))}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold tracking-wide text-muted-foreground">
              Score de réussite (%)
              <LabelObligatoire />
            </span>
            <input
              type="number"
              min={0}
              max={100}
              className={champ}
              value={scoreReussite}
              onChange={(e) => setScoreReussite(Number(e.target.value))}
            />
          </label>
        </div>
      </div>

      {questions.map((q, qi) => (
        <div
          key={qi}
          className="space-y-3 rounded-lg border border-border bg-card p-5"
        >
          <div className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-bold text-muted-foreground">
              Question {qi + 1}
            </span>
            <button
              onClick={() =>
                setQuestions((qs) => qs.filter((_, i) => i !== qi))
              }
              className="ml-auto rounded-md p-1.5 text-destructive hover:bg-secondary"
              aria-label="Supprimer la question"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
            <input
              className={champ}
              value={q.texte}
              onChange={(e) => majQuestion(qi, { texte: e.target.value })}
              placeholder="Énoncé de la question"
            />
            <select
              className={champ}
              value={q.type}
              onChange={(e) => {
                const type = e.target.value as TypeQuestion
                majQuestion(qi, {
                  type,
                  options:
                    type === 'Vrai/Faux'
                      ? optionsVraiFaux()
                      : q.options.length
                        ? q.options
                        : [{ texte: '', correct: true }],
                })
              }}
            >
              <option>Choix unique</option>
              <option>Choix multiple</option>
              <option>Vrai/Faux</option>
            </select>
          </div>

          <div className="space-y-2">
            {q.options.map((o, oi) => (
              <div key={oi} className="flex items-center gap-2">
                <input
                  type={q.type === 'Choix multiple' ? 'checkbox' : 'radio'}
                  checked={o.correct}
                  onChange={(e) =>
                    majOption(qi, oi, { correct: e.target.checked })
                  }
                  aria-label="Réponse correcte"
                />
                <input
                  className="h-9 flex-1 rounded-md border border-input bg-card px-3 text-sm focus:border-primary focus:outline-none"
                  value={o.texte}
                  onChange={(e) => majOption(qi, oi, { texte: e.target.value })}
                  placeholder={`Option ${oi + 1}`}
                  disabled={q.type === 'Vrai/Faux'}
                />
                {q.type !== 'Vrai/Faux' ? (
                  <button
                    onClick={() =>
                      majQuestion(qi, {
                        options: q.options.filter((_, j) => j !== oi),
                      })
                    }
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary"
                    aria-label="Supprimer l’option"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            ))}
            {q.type !== 'Vrai/Faux' ? (
              <button
                onClick={() =>
                  majQuestion(qi, {
                    options: [...q.options, { texte: '', correct: false }],
                  })
                }
                className="text-xs font-semibold text-primary hover:underline"
              >
                + Ajouter une option
              </button>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-4 border-t border-border pt-3 text-sm">
            <label className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground">
                Points
              </span>
              <input
                type="number"
                min={0}
                step={0.5}
                className="h-9 w-20 rounded-md border border-input bg-card px-2 text-sm focus:border-primary focus:outline-none"
                value={q.points}
                onChange={(e) =>
                  majQuestion(qi, { points: Number(e.target.value) })
                }
              />
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <input
                type="checkbox"
                checked={q.requis}
                onChange={(e) => majQuestion(qi, { requis: e.target.checked })}
              />
              Question requise
            </label>
          </div>
        </div>
      ))}

      <button
        onClick={() =>
          setQuestions((qs) => [
            ...qs,
            {
              texte: '',
              type: 'Choix unique',
              points: 1,
              requis: true,
              options: [
                { texte: '', correct: true },
                { texte: '', correct: false },
              ],
            },
          ])
        }
        className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-input text-sm font-semibold text-primary hover:bg-secondary"
      >
        <Plus className="h-4 w-4" />
        Ajouter une question
      </button>

      <div className="flex flex-wrap gap-3 pb-6">
        {!modeModification && (
          <button
            disabled={enCours}
            onClick={() => void enregistrer(false)}
            className="flex h-10 items-center gap-2 rounded-md border border-input px-4 text-sm font-semibold hover:bg-secondary disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            Enregistrer comme brouillon
          </button>
        )}
        <button
          disabled={enCours}
          onClick={() => void enregistrer(true)}
          className="flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          <Send className="h-4 w-4" />
          {modeModification
            ? 'Enregistrer les modifications'
            : 'Publier l’évaluation'}
        </button>
      </div>
    </div>
  )
}
