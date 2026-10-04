import { useState, useEffect } from 'react'
import { createFileRoute, useNavigate, useParams } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, Clock, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'

import { useProfilCourant } from '@/components/app/AppShell'
import {
  raisonAccesEvaluation,
  trouverInscriptionEvaluation,
  type Evaluation,
} from '@/lib/evaluations'

import { useMesInscriptionsEvaluations } from '@/hooks/useMesInscriptionsEvaluations'

export const Route = createFileRoute(
  '/_authenticated/evaluations/passer/$evaluationId',
)({
  head: () => ({
    meta: [
      { title: 'Passer l’évaluation — Orange Digital Center' },
      {
        name: 'description',
        content:
          'Répondez au questionnaire de la session puis soumettez votre tentative.',
      },
      {
        property: 'og:title',
        content: 'Passer l’évaluation — Orange Digital Center',
      },
      {
        property: 'og:description',
        content: 'Questionnaire de formation et résultat immédiat.',
      },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: Passage,
})

type Option = {
  option_question_id: number
  texte_option: string
  est_correct: boolean
}
type Question = {
  question_evaluation_id: number
  texte_question: string
  type_question: 'Choix unique' | 'Choix multiple' | 'Vrai/Faux'
  points: number
  est_requis: boolean
  ordre_question: number
  option_question: Option[]
}

function Passage() {
  const navigate = useNavigate()
  const [reponses, setReponses] = useState<Record<number, number[]>>({})
  const [enCours, setEnCours] = useState(false)

  const [secondesRestantes, setSecondesRestantes] = useState<number | null>(
    null,
  )
  const [tentativeId, setTentativeId] = useState<number | null>(null)
  const [commenceLe, setCommenceLe] = useState<string | null>(null)
  const [pleinEcran, setPleinEcran] = useState(false)
  const [soumissionAutomatique, setSoumissionAutomatique] = useState(false)

  const { data: profil } = useProfilCourant()
  const { evaluationId } = useParams({
    from: '/_authenticated/evaluations/passer/$evaluationId',
  })
  const [resultat, setResultat] = useState<{
    score: number
    reussi: boolean
  } | null>(null)

  const { data: inscriptions = [], isLoading: chargementInscriptions } =
    useMesInscriptionsEvaluations(profil?.participant_id)

  const { data } = useQuery({
    queryKey: ['evaluation', evaluationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('evaluation')
        .select(
          `
           evaluation_id,
           titre_evaluation,
           duree_minutes,
           max_tentatives,
           score_reussite,
           session_id,
           statut,
           date_publication,
           date_fermeture,
           session:session_formation(nom_session,
           formation:formation(titre)),
           question_evaluation(
             question_evaluation_id,
             texte_question,
             type_question,
             points,
             est_requis,
             ordre_question,
             option_question(
               option_question_id,
               texte_option,
               est_correct
             )
           )
         `,
        )
        .eq('evaluation_id', Number(evaluationId))
        .single()
      if (error) throw error
      return data
    },
  })

  const questions = ((data?.question_evaluation ?? []) as unknown as Question[])
    .slice()
    .sort((a, b) => a.ordre_question - b.ordre_question)

  function basculer(q: Question, optionId: number) {
    setReponses((r) => {
      const actuelles = r[q.question_evaluation_id] ?? []
      if (q.type_question === 'Choix multiple') {
        return {
          ...r,
          [q.question_evaluation_id]: actuelles.includes(optionId)
            ? actuelles.filter((id) => id !== optionId)
            : [...actuelles, optionId],
        }
      }
      return { ...r, [q.question_evaluation_id]: [optionId] }
    })
  }

  async function soumettre(automatique = false) {
    if (!data) return
    if (secondesRestantes !== null && secondesRestantes <= 0 && !automatique) {
      return
    }

    const evaluation = data as Evaluation
    const raison = raisonAccesEvaluation(evaluation, inscriptions)
    if (raison) {
      throw new Error(raison)
    }
    const inscription = trouverInscriptionEvaluation(evaluation, inscriptions)
    if (!inscription) {
      throw new Error("Votre inscription à cette session n'est pas acceptée.")
    }

    const manquantes = questions.filter(
      (q) => q.est_requis && !(reponses[q.question_evaluation_id] ?? []).length,
    )
    if (manquantes.length && !automatique) {
      toast.error('Répondez à toutes les questions requises.')
      return
    }
    setEnCours(true)
    try {
      let obtenus = 0
      let total = 0
      const lignes: {
        question_evaluation_id: number
        option_question_id: number
        est_correct: boolean
        points_gagnes: number
      }[] = []
      for (const q of questions) {
        total += Number(q.points)
        const choisies = reponses[q.question_evaluation_id] ?? []
        const correctes = q.option_question
          .filter((o) => o.est_correct)
          .map((o) => o.option_question_id)
        const juste =
          choisies.length === correctes.length &&
          choisies.every((id) => correctes.includes(id))
        if (juste) obtenus += Number(q.points)
        for (const id of choisies) {
          lignes.push({
            question_evaluation_id: q.question_evaluation_id,
            option_question_id: id,
            est_correct: correctes.includes(id),
            points_gagnes: juste ? Number(q.points) : 0,
          })
        }
      }
      const score = total ? Math.round((obtenus / total) * 100) : 0
      const reussi = score >= Number(data.score_reussite)

      if (!tentativeId) {
        throw new Error('Tentative introuvable.')
      }

      if (lignes.length) {
        const { error: erreurReponses } = await supabase
          .from('reponse_participant')
          .insert(
            lignes.map((l) => ({
              ...l,
              tentative_evaluation_id: tentativeId,
            })),
          )

        if (erreurReponses) {
          throw erreurReponses
        }
      }

      const { error: erreurTentative } = await supabase
        .from('tentative_evaluation')
        .update({
          soumis_le: new Date().toISOString(),
          score,
          statut: 'Corrigée',
          reussi,
        })
        .eq('tentative_evaluation_id', tentativeId)
        .eq('statut', 'En cours')

      if (erreurTentative) {
        throw erreurTentative
      }

      if (reussi) {
        const { data: existante, error: erreurRecherche } = await supabase
          .from('attestation')
          .select('attestation_id')
          .eq('inscription_id', inscription.inscription_id)
          .maybeSingle()

        if (erreurRecherche) {
          throw erreurRecherche
        }

        if (!existante) {
          const { data: attestation, error: erreurAttestation } = await supabase
            .from('attestation')
            .insert({
              inscription_id: inscription.inscription_id,
              statut: 'Valide',
              numero_attestation: `ATT-${Date.now().toString().slice(-8)}`,
              jeton_verification: crypto.randomUUID().replace(/-/g, ''),
            })
            .select('attestation_id')
            .single()

          if (erreurAttestation) {
            throw erreurAttestation
          }

          console.log('Attestation créée :', attestation)
        }
      }
      setResultat({ score, reussi })
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setEnCours(false)
    }
  }

  useEffect(() => {
    if (!data || !commenceLe || !tentativeId) return

    const dureeSecondes = Number(data.duree_minutes) * 60
    const debutMs = new Date(commenceLe).getTime()

    function mettreAJour() {
      const ecoule = Math.floor((Date.now() - debutMs) / 1000)

      const restantes = Math.max(dureeSecondes - ecoule, 0)

      setSecondesRestantes(restantes)
    }

    mettreAJour()

    const intervalle = window.setInterval(mettreAJour, 1000)

    return () => {
      window.clearInterval(intervalle)
    }
  }, [data, commenceLe, tentativeId])

  useEffect(() => {
    async function chargerTentativeEnCours() {
      if (!data) return
      if (chargementInscriptions) return
      const inscription = trouverInscriptionEvaluation(
        data as Evaluation,
        inscriptions,
      )

      if (!inscription) return

      const { data: tentative, error } = await supabase
        .from('tentative_evaluation')
        .select(
          `
        tentative_evaluation_id,
        commence_le,
        statut
      `,
        )
        .eq('evaluation_id', data.evaluation_id)
        .eq('inscription_id', inscription.inscription_id)
        .eq('statut', 'En cours')
        .order('commence_le', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) {
        toast.error('Impossible de récupérer votre tentative.')
        return
      }

      if (!tentative) {
        toast.error('Aucune tentative en cours.')
        navigate({
          to: '/evaluations/mes-evaluations',
        })
        return
      }

      setTentativeId(tentative.tentative_evaluation_id)
      setCommenceLe(tentative.commence_le)
    }

    void chargerTentativeEnCours()
  }, [data, inscriptions, chargementInscriptions, navigate])

  useEffect(() => {
    if (!data) return
    if (chargementInscriptions) return

    const raison = raisonAccesEvaluation(data as Evaluation, inscriptions)

    if (raison) {
      toast.error(raison)

      navigate({
        to: '/evaluations/mes-evaluations',
      })
    }
  }, [data, inscriptions, chargementInscriptions, navigate])

  useEffect(() => {
    if (secondesRestantes !== 0) return
    if (enCours) return
    if (resultat) return
    if (!data) return
    if (!tentativeId) return
    if (soumissionAutomatique) return
    setSoumissionAutomatique(true)
    toast.warning(
      'Le temps est écoulé. Vos réponses vont être soumises automatiquement.',
    )
    void soumettre(true)
  }, [secondesRestantes, enCours, resultat, data, soumissionAutomatique])

  useEffect(() => {
    function bloquerRaccourcis(e: KeyboardEvent) {
      const touche = e.key.toLowerCase()

      if (
        (e.ctrlKey || e.metaKey) &&
        ['c', 'v', 'x', 'a', 'u', 's', 'p'].includes(touche)
      ) {
        e.preventDefault()
      }
      if (e.key === 'F12') {
        e.preventDefault()
      }

      if (e.ctrlKey && e.shiftKey && ['i', 'j', 'c'].includes(touche)) {
        e.preventDefault()
      }
    }
    document.addEventListener('keydown', bloquerRaccourcis)
    return () => {
      document.removeEventListener('keydown', bloquerRaccourcis)
    }
  }, [])

  async function basculerPleinEcran() {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen({
          navigationUI: 'hide',
        })

        setPleinEcran(true)
      } else {
        await document.exitFullscreen()
        setPleinEcran(false)
      }
    } catch {
      toast.error('Le mode plein écran n’est pas disponible sur ce navigateur.')
    }
  }

  useEffect(() => {
    function gererPleinEcran() {
      setPleinEcran(document.fullscreenElement !== null)
    }

    document.addEventListener('fullscreenchange', gererPleinEcran)

    return () => {
      document.removeEventListener('fullscreenchange', gererPleinEcran)
    }
  }, [])

  if (!data)
    return (
      <p className="text-sm text-muted-foreground">Évaluation introuvable.</p>
    )

  if (resultat) {
    return (
      <div className="mx-auto max-w-lg rounded-lg border border-border bg-card p-8 text-center">
        <button
          type="button"
          onClick={() => void basculerPleinEcran()}
          className="rounded-md border border-border px-3 py-2 text-sm font-semibold hover:bg-secondary"
        >
          {pleinEcran ? 'Quitter le plein écran' : 'Plein écran'}
        </button>

        {resultat.reussi ? (
          <CheckCircle2 className="mx-auto h-12 w-12 text-[#137333]" />
        ) : (
          <XCircle className="mx-auto h-12 w-12 text-destructive" />
        )}
        <h1 className="mt-4 text-xl font-bold text-foreground">
          {resultat.reussi ? 'Évaluation réussie' : 'Évaluation non réussie'}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Votre score : <b className="text-foreground">{resultat.score} %</b> —
          score requis : {data.score_reussite} %
        </p>
        {resultat.reussi ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Votre attestation a été générée et est disponible dans « Mes
            attestations ».
          </p>
        ) : null}
        <button
          onClick={() => navigate({ to: '/evaluations/mes-evaluations' })}
          className="mt-6 h-10 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          Retour aux évaluations
        </button>
      </div>
    )
  }

  return (
    <div
      className="mx-auto max-w-2xl select-none space-y-4 pb-8"
      onContextMenu={(e) => e.preventDefault()}
      onCopy={(e) => e.preventDefault()}
      onCut={(e) => e.preventDefault()}
      onPaste={(e) => e.preventDefault()}
    >
      <div className="rounded-lg border-t-4 border-primary bg-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">
              {data.titre_evaluation}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {data.session?.nom_session}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void basculerPleinEcran()}
            className="rounded-md border border-border px-3 py-2 text-sm font-semibold hover:bg-secondary"
          >
            {pleinEcran ? 'Quitter le plein écran' : 'Plein écran'}
          </button>
        </div>
        <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          Durée conseillée : {data.duree_minutes} minutes — score requis{' '}
          {data.score_reussite} %
        </p>

        <div
          className={`mt-4 flex items-center justify-between rounded-lg border px-3 py-2 ${
            secondesRestantes !== null && secondesRestantes < 60
              ? 'animate-pulse border-red-500/20 bg-[#FCE8E6]'
              : 'border-border bg-secondary'
          }`}
        >
          <span
            className={`text-sm font-semibold ${
              secondesRestantes !== null && secondesRestantes < 60
                ? 'text-red-500'
                : 'text-muted-foreground'
            }`}
          >
            Temps restant
          </span>

          <span
            className={`text-lg font-bold tabular-nums ${
              secondesRestantes !== null && secondesRestantes < 60
                ? 'text-red-500'
                : 'text-foreground'
            }`}
          >
            {secondesRestantes !== null
              ? `${Math.floor(secondesRestantes / 60)
                  .toString()
                  .padStart(2, '0')}:${(secondesRestantes % 60)
                  .toString()
                  .padStart(2, '0')}`
              : '--:--'}
          </span>
        </div>
      </div>

      {questions.map((q, i) => (
        <div
          key={q.question_evaluation_id}
          className="rounded-lg border border-border bg-card p-5"
        >
          <p className="text-sm font-semibold text-foreground">
            {i + 1}. {q.texte_question}{' '}
            {q.est_requis ? <span className="text-destructive">*</span> : null}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {q.points} point(s) — {q.type_question}
          </p>
          <div className="mt-3 space-y-2">
            {q.option_question.map((o) => (
              <label
                key={o.option_question_id}
                className="flex items-center gap-2 text-sm text-foreground"
              >
                <input
                  type={
                    q.type_question === 'Choix multiple' ? 'checkbox' : 'radio'
                  }
                  name={`q-${q.question_evaluation_id}`}
                  checked={(reponses[q.question_evaluation_id] ?? []).includes(
                    o.option_question_id,
                  )}
                  onChange={() => basculer(q, o.option_question_id)}
                />
                {o.texte_option}
              </label>
            ))}
          </div>
        </div>
      ))}
      <div
        className={`mt-4 flex items-center justify-between rounded-lg border px-3 py-2 ${
          secondesRestantes !== null && secondesRestantes < 60
            ? 'animate-pulse border-red-500/20 bg-[#FCE8E6]'
            : 'border-border bg-secondary'
        }`}
      >
        <span
          className={`text-sm font-semibold ${
            secondesRestantes !== null && secondesRestantes < 60
              ? 'text-red-500'
              : 'text-muted-foreground'
          }`}
        >
          Temps restant
        </span>

        <span
          className={`text-lg font-bold tabular-nums ${
            secondesRestantes !== null && secondesRestantes < 60
              ? 'text-red-500'
              : 'text-foreground'
          }`}
        >
          {secondesRestantes !== null
            ? `${Math.floor(secondesRestantes / 60)
                .toString()
                .padStart(2, '0')}:${(secondesRestantes % 60)
                .toString()
                .padStart(2, '0')}`
            : '--:--'}
        </span>
      </div>

      <button
        disabled={enCours}
        onClick={() => void soumettre()}
        className="h-10 w-full rounded-md bg-primary text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
      >
        Soumettre mes réponses
      </button>
    </div>
  )
}
