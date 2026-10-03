// import type { Evaluation } from '@/routes/_authenticated/evaluations/mes-evaluations'
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

  if (!inscription) {
    return "Votre inscription à cette session n'est pas acceptée."
  }

  if (!presenceEvaluationValide(inscription)) {
    return 'Vous devez avoir une présence complète et validée pour passer cette évaluation.'
  }

  return null
}
