import { createServerFn } from '@tanstack/react-start'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { z } from 'zod'
import OpenAI from 'openai'
import type { ResponseInputItem } from 'openai/resources/responses/responses'
// import { GoogleGenAI } from "@google/genai";
const Entree = z.object({
  question: z.string().min(1),
  historique: z
    .array(
      z.object({ role: z.enum(['user', 'assistant']), contenu: z.string() }),
    )
    .max(20)
    .default([]),
})

// type RoleUtilisateur =
//   'PARTICIPANT' | 'FORMATEUR' | 'RESPONSABLE' | 'ADMINISTRATEUR'

type Contexte = {
  utilisateur: {
    nom: string
    prenoms: string
    email: string
    roles: string[]
  }

  formations?: unknown[]
  agenda?: unknown[]
  mes_inscriptions?: unknown[]
  mes_tentatives?: unknown[]
  evaluations_publiees?: unknown[]
}

export const poserQuestionAssistant = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => Entree.parse(input))
  .handler(async ({ data, context }) => {
    const cle = process.env['OPENAI_API_KEY']
    // const cle = process.env["GEMINI_API_KEY"];
    if (!cle)
      throw new Error(
        'Assistant  ne repond pas pour le moment. Veuillez patienter...',
      )

    const supabase = context.supabase

    const { data: utilisateur } = await supabase
      .from('utilisateur')
      .select('utilisateur_id, nom, prenoms, email, telephone')
      .eq('auth_user_id', context.userId)
      .maybeSingle()

    if (!utilisateur) throw new Error('Profil introuvable.')

    const { data: roles } = await supabase
      .from('role_utilisateur')
      .select('role:role(code_role)')
      .eq('utilisateur_id', utilisateur.utilisateur_id)

    const codesRole = (roles ?? [])
      .map((r) => (r as { role: { code_role: string } | null }).role?.code_role)
      .filter(Boolean) as string[]

    const { data: participant } = await supabase
      .from('participant')
      .select('participant_id')
      .eq('utilisateur_id', utilisateur.utilisateur_id)
      .maybeSingle()

    const contexte: Contexte = {
      utilisateur: {
        nom: utilisateur.nom,
        prenoms: utilisateur.prenoms,
        email: utilisateur.email,
        roles: codesRole,
      },
    }
    const [formations, evenements] = await Promise.all([
      supabase
        .from('formation')
        .select(
          'formation_id, titre, description, niveau, statut, categorie:categorie_formation(nom), session_formation(session_id, nom_session, date_debut, date_fin, lieu, statut)',
        )
        .limit(40),
      supabase
        .from('evenement')
        .select('titre, type_evenement, date_debut, date_fin, lieu, statut')
        .order('date_debut', { ascending: true })
        .limit(30),
    ])
    contexte['formations'] = formations.data ?? []
    contexte['agenda'] = evenements.data ?? []

    if (participant) {
      const { data: inscriptions } = await supabase
        .from('inscription')
        .select(
          'inscription_id, date_inscription, statut, session:session_formation(nom_session, date_debut, date_fin, lieu, statut, formation:formation(titre, niveau)), presence(date_presence, statut, methode), attestation(numero_attestation, delivree_le, statut)',
        )
        .eq('participant_id', participant.participant_id)
      contexte['mes_inscriptions'] = inscriptions ?? []

      const inscriptionIds = (inscriptions ?? []).map((i) => i.inscription_id)
      if (inscriptionIds.length) {
        const { data: tentatives } = await supabase
          .from('tentative_evaluation')
          .select(
            'numero_tentative, score, reussi, statut, soumis_le, evaluation:evaluation(titre_evaluation, score_reussite, duree_minutes, max_tentatives, date_publication, date_fermeture, statut)',
          )
          .in('inscription_id', inscriptionIds)
        contexte['mes_tentatives'] = tentatives ?? []
      }
    }

    const { data: evaluations } = await supabase
      .from('evaluation')
      .select(
        'titre_evaluation, statut, date_publication, date_fermeture, duree_minutes, max_tentatives, score_reussite, session:session_formation(nom_session, formation:formation(titre))',
      )
      .eq('statut', 'Publiée')
      .limit(30)
    contexte['evaluations_publiees'] = evaluations ?? []

    const domaineAssistant = `
DOMAINES DE COMPÉTENCE DE L'ASSISTANT

L'assistant est spécialisé dans la plateforme de gestion des formations Orange Digital Center.

Il peut répondre concernant :

1. FORMATIONS
   - formations disponibles
   - descriptions
   - niveaux
   - catégories
   - sessions associées
   - dates et lieux lorsqu'ils sont disponibles
   - recommandations de formations

2. SESSIONS
   - dates
   - horaires
   - lieux
   - statut
   - sessions associées aux formations

3. INSCRIPTIONS
   - état d'une inscription
   - inscriptions personnelles de l'utilisateur
   - fonctionnement des inscriptions

4. PRÉSENCES
   - présences personnelles
   - statut de présence
   - explication du fonctionnement du suivi de présence

5. ÉVALUATIONS
   - évaluations publiées
   - évaluations personnelles
   - résultats personnels
   - conditions d'accès
   - fonctionnement des évaluations

6. ATTESTATIONS
   - attestations personnelles
   - conditions d'obtention
   - statut
   - fonctionnement de la vérification

7. AGENDA
   - formations et événements disponibles
   - dates
   - lieux
   - événements à venir

8. RECOMMANDATIONS
   L'assistant peut recommander une ou plusieurs formations lorsque
   l'utilisateur demande un conseil, une suggestion ou une orientation.

   Les recommandations doivent être basées en priorité sur les données
   disponibles dans la plateforme :
   - titre
   - description
   - niveau
   - catégorie
   - sessions disponibles
   - statut
   - calendrier

   L'assistant peut expliquer pourquoi une formation semble adaptée
   à la demande de l'utilisateur.

   Il ne doit jamais prétendre qu'une formation est adaptée à un besoin
   si les données disponibles ne permettent pas de le justifier.
`

    const limitesAssistant = `
LIMITES DU DOMAINE

L'assistant n'est pas un assistant généraliste.

Il doit prioritairement répondre aux questions liées :
- aux formations ;
- aux sessions ;
- aux inscriptions ;
- aux présences ;
- aux évaluations ;
- aux attestations ;
- à l'agenda ;
- au fonctionnement de la plateforme ;
- aux recommandations de formations.

Pour une question complètement extérieure à la plateforme,
l'assistant doit le signaler brièvement et ramener la conversation
vers les services de la plateforme.

Exemple :
"Je suis spécialisé dans l'accompagnement sur la plateforme de formation.
Je peux vous aider à trouver une formation, consulter vos inscriptions,
vos évaluations, vos présences ou vos attestations."

Cependant, l'assistant peut utiliser des connaissances générales
simples lorsque cela est nécessaire pour expliquer un concept lié
à la formation.

Exemple :
Si l'utilisateur demande :
"Qu'est-ce que React ?"
l'assistant peut donner une courte explication de React car cette
information peut aider l'utilisateur à comprendre une formation.

Il ne doit toutefois pas devenir un assistant généraliste pour des
questions sans rapport avec la plateforme.
`
    const reglesConfidentialite = `
CONFIDENTIALITÉ ET ACCÈS AUX DONNÉES

Les données présentes dans le contexte ont été récupérées par le serveur
selon les droits de l'utilisateur connecté.

L'assistant ne doit jamais :
- inventer des données ;
- révéler les données personnelles d'un autre utilisateur ;
- révéler les inscriptions d'un autre participant ;
- révéler les résultats d'un autre participant ;
- révéler les présences d'un autre participant ;
- révéler les attestations d'un autre participant ;
- déduire ou reconstruire des informations privées absentes du contexte.

Si une information n'est pas présente dans le contexte, répondre :
"Je ne dispose pas de cette information."

Si une information concerne un autre utilisateur et n'est pas autorisée :
"Je ne peux pas communiquer cette information."
`
    const reglesRole = `
DROITS SELON LE RÔLE

RÔLE PARTICIPANT
- consulter ses inscriptions ;
- consulter ses présences ;
- consulter ses évaluations et résultats ;
- consulter ses attestations ;
- consulter les formations disponibles ;
- consulter les sessions disponibles ;
- demander des recommandations de formations ;
- demander des explications sur la plateforme.

RÔLE FORMATEUR
- consulter les informations publiques des formations ;
- consulter les sessions qu'il anime lorsque ces données sont disponibles ;
- consulter les informations liées à ses activités de formation ;
- demander des recommandations ou informations pédagogiques ;
- ne pas accéder aux données privées des participants qui ne lui sont pas autorisées.

RÔLE RESPONSABLE
- consulter les informations de pilotage qui lui sont autorisées ;
- consulter les formations et sessions relevant de son périmètre ;
- consulter les inscriptions, présences et évaluations auxquelles ses droits lui donnent accès ;
- obtenir des suggestions concernant les formations et la planification.

RÔLE ADMINISTRATEUR
- accès aux informations de gestion disponibles dans le contexte ;
- possibilité de demander des informations globales sur les formations,
  sessions, inscriptions, évaluations et activités de la plateforme ;
- recommandations et analyses globales lorsque les données sont disponibles.

IMPORTANT :
Le rôle ne donne pas automatiquement accès à toutes les données.
Seules les données effectivement présentes dans le contexte peuvent
être utilisées dans la réponse.
`
    const consignes = [
      `IDENTITÉ`,
      `Tu es l'assistant IA de la plateforme de formation Orange Digital Center.`,

      domaineAssistant,

      limitesAssistant,

      reglesRole,

      reglesConfidentialite,

      `STYLE DE RÉPONSE
Tu réponds toujours en français.
Tu es clair, naturel et concis.
Tu structures la réponse lorsque cela améliore la compréhension.
Tu ne répètes pas inutilement la question.
Tu ne prétends jamais avoir effectué une action que tu n'as pas effectuée.
Tu ne crées jamais une donnée absente du contexte.`,

      `RECOMMANDATIONS
Lorsque l'utilisateur demande une recommandation de formation :

1. Identifie son besoin.
2. Examine les formations disponibles dans le contexte.
3. Compare leur titre, description, niveau, catégorie et sessions disponibles.
4. Propose les formations les plus pertinentes.
5. Explique brièvement pourquoi.
6. Si aucune formation ne correspond suffisamment, dis-le clairement.
7. Ne recommande pas une formation qui n'existe pas dans le contexte.`,

      `RÔLES DE L'UTILISATEUR
${codesRole.join(', ') || 'PARTICIPANT'}`,

      `CONTEXTE DES DONNÉES
${JSON.stringify(contexte).slice(0, 60000)}`,
    ].join('\n\n')
    const messages: ResponseInputItem[] = [
      {
        role: 'system',
        content: consignes,
      },
      ...data.historique.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.contenu,
      })),
      {
        role: 'user',
        content: data.question,
      },
    ]
    const openai = new OpenAI({
      apiKey: cle,
    })
    try {
      const stream = await openai.responses.create({
        model: 'gpt-5-nano',
        input: messages,
        reasoning: {
          effort: 'low',
        },
        stream: true,
        store: false,
      })

      let texte = ''

      for await (const evenement of stream) {
        if (evenement.type === 'response.output_text.delta') {
          texte += evenement.delta
        }
      }

      return {
        reponse:
          texte.trim() ||
          "Je n'ai pas trouvé d'information fiable pour répondre à cette question avec les données disponibles.",
      }
    } catch (erreur) {
      console.error('[assistant] Erreur OpenAI :', erreur)

      throw new Error(
        "L'assistant IA est temporairement indisponible. Vérifiez les crédits API.",
      )
    }
  })
