// import type { Evaluation } from '@/routes/_authenticated/evaluations/mes-evaluations'

import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

export type Statut = 'Brouillon' | 'Publiée' | 'Fermée'

export type Evaluation = {
  evaluation_id: number
  session_id: number
  titre_evaluation: string
  date_publication: string | null
  date_fermeture: string | null
  duree_minutes: number
  max_tentatives: number
  score_reussite: number
  statut: Statut
  session: {
    nom_session: string
    formation: { titre: string } | null
  } | null
  question_evaluation:
    | {
        question_evaluation_id: number
      }[]
    | null
}

export type PresenceEvaluation = {
  presence_id: number
  present: boolean
  statut: string
}

export type InscriptionAvecPresences = {
  inscription_id: number
  session_id: number
  statut: string
  presence: PresenceEvaluation[]
}

export function evaluationEstPubliee(evaluation: Evaluation) {
  return evaluation.statut === 'Publiée'
}

export function evaluationExpiree(evaluation: Evaluation) {
  if (evaluation.statut !== 'Publiée') {
    return false
  }
  if (!evaluation.date_fermeture) {
    return false
  }
  return new Date() >= new Date(evaluation.date_fermeture)
}

/**
 * Recherche l'inscription du participant pour la session
 * de l'évaluation.
 */
export function trouverInscriptionEvaluation(
  evaluation: Evaluation,
  inscriptions: InscriptionAvecPresences[],
) {
  return inscriptions.find(
    (inscription) =>
      inscription.session_id === evaluation.session_id &&
      inscription.statut === 'Acceptée',
  )
}

/**
 * Vérifie que toutes les présences nécessaires sont validées.
 */
export function presenceEvaluationValide(
  inscription: InscriptionAvecPresences | undefined,
) {
  if (!inscription) {
    return false
  }
  const presences = inscription.presence ?? []
  return (
    presences.length > 0 &&
    presences.every(
      (presence) => presence.present === true && presence.statut === 'Présent',
    )
  )
}

/**
 * Vérifie toutes les conditions nécessaires pour
 * commencer une évaluation.
 */
export function peutPasserEvaluation(
  evaluation: Evaluation,
  inscriptions: InscriptionAvecPresences[],
) {
  if (!evaluationEstPubliee(evaluation)) {
    return false
  }

  if (evaluationExpiree(evaluation)) {
    return false
  }

  const inscription = trouverInscriptionEvaluation(evaluation, inscriptions)

  if (!inscription) {
    return false
  }

  return presenceEvaluationValide(inscription)
}

/**
 * Retourne la raison pour laquelle l'utilisateur
 * ne peut pas passer l'évaluation.
 *
 * Utile pour la page Passage.
 */
export function raisonAccesEvaluation(
  evaluation: Evaluation,
  inscriptions: InscriptionAvecPresences[],
) {
  if (!evaluationEstPubliee(evaluation)) {
    return "Cette évaluation n'est pas disponible."
  }

  if (evaluationExpiree(evaluation)) {
    return 'Cette évaluation est terminée.'
  }

  const inscription = trouverInscriptionEvaluation(evaluation, inscriptions)

  if (!presenceEvaluationValide(inscription)) {
    return 'Vous devez avoir une présence complète et validée pour passer cette évaluation.'
  }

  return null
}

export function useCommencerEvaluation(
  inscriptions: InscriptionAvecPresences[],

  navigate: (options: {
    to: '/evaluations/passer/$evaluationId'
    params: { evaluationId: string }
  }) => void,
) {
  return useMutation({
    mutationFn: async (evaluation: Evaluation) => {
      const inscription = trouverInscriptionEvaluation(evaluation, inscriptions)
      if (!inscription) {
        throw new Error("Votre inscription à cette session n'est pas acceptée.")
      }
      // 1. Vérifier s'il existe déjà une tentative en cours
      const { data: tentativeEnCours, error: erreurEnCours } = await supabase
        .from('tentative_evaluation')
        .select('tentative_evaluation_id')
        .eq('evaluation_id', evaluation.evaluation_id)
        .eq('inscription_id', inscription.inscription_id)
        .eq('statut', 'En cours')
        .order('commence_le', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (erreurEnCours) {
        throw erreurEnCours
      }

      // Une tentative existe déjà : on la reprend
      if (tentativeEnCours) {
        return tentativeEnCours
      }

      // 2. Compter les tentatives déjà effectuées
      const { count, error: erreurTentatives } = await supabase
        .from('tentative_evaluation')
        .select('tentative_evaluation_id', {
          count: 'exact',
          head: true,
        })
        .eq('evaluation_id', evaluation.evaluation_id)
        .eq('inscription_id', inscription.inscription_id)

      if (erreurTentatives) {
        throw erreurTentatives
      }

      // 3. Vérifier la limite
      if ((count ?? 0) >= Number(evaluation.max_tentatives)) {
        throw new Error(
          'Vous avez atteint le nombre maximum de tentatives pour cette évaluation.',
        )
      }

      // 4. Créer la nouvelle tentative
      const { data: tentative, error: erreurCreation } = await supabase
        .from('tentative_evaluation')
        .insert({
          evaluation_id: evaluation.evaluation_id,
          inscription_id: inscription.inscription_id,
          commence_le: new Date().toISOString(),
          statut: 'En cours',
        })
        .select('tentative_evaluation_id')
        .single()

      if (erreurCreation) {
        throw erreurCreation
      }

      return tentative
    },

    onSuccess: (_, evaluation) => {
      navigate({
        to: '/evaluations/passer/$evaluationId',
        params: {
          evaluationId: String(evaluation.evaluation_id),
        },
      })
    },

    onError: (error) => {
      toast.error(error.message)
    },
  })
}
