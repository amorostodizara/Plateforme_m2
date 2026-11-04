import { createServerFn } from '@tanstack/react-start'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { z } from 'zod'
import OpenAI from 'openai'
import type { ResponseInputItem } from 'openai/resources/responses/responses'
const Entree = z.object({
  question: z.string().trim().min(1).max(5000),
  historique: z
    .array(
      z.object({ role: z.enum(['user', 'assistant']), contenu: z.string() }),
    )
    .max(20)
    .default([]),
})

type Contexte = Record<string, unknown>

export const poserQuestionAssistant = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => Entree.parse(input))
  .handler(async ({ data, context }) => {
    const APIKey = process.env['OPENAI_API_KEY']
    if (!APIKey)
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
          `
      formation_id,
      titre,
      description,
      niveau,
      statut,
      categorie:categorie_formation(nom),
      session_formation!inner(
        session_id,
        nom_session,
        date_debut,
        date_fin,
        lieu,
        statut
      )
    `,
        )
        .eq('statut', 'Publiée')
        .eq('session_formation.statut', 'Planifiée')
        .order('titre', { ascending: true })
        .limit(50),
      codesRole.some((role) => ['RESPONSABLE', 'ADMINISTRATEUR'].includes(role))
        ? supabase
            .from('evenement')
            .select('titre, type_evenement, date_debut, date_fin, lieu, statut')
            .order('date_debut', { ascending: true })
            .limit(30)
        : Promise.resolve({ data: [] }),
    ])

    contexte['formations_catalogue_disponibles'] = formations.data ?? []
    contexte['agenda'] = evenements.data ?? []

    if (participant) {
      const { data: inscriptions } = await supabase
        .from('inscription')
        .select(
          'inscription_id, date_inscription, statut, session:session_formation(nom_session, date_debut, date_fin, lieu, statut,formateur_id,formateur:formateur(utilisateur:utilisateur(nom, prenoms)), formation:formation(titre, niveau)), presence(date_presence, statut, methode), attestation(numero_attestation, delivree_le, statut)',
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

    const consignes = [
      "Tu es l'assistant de la plateforme de formation Orange Digital Center.",
      'Tu réponds toujours en français, de façon courte, claire et structurée.',
      'Tu utilises uniquement les données fournies dans le contexte JSON ci-dessous.',
      "Ces données sont déjà filtrées selon le rôle et les droits de l'utilisateur connecté.",
      "Tu ne divulgues jamais d'informations personnelles concernant un autre utilisateur.",
      "Si une information est absente du contexte ou si l'utilisateur n'y a pas droit, tu le dis clairement et tu n'inventes rien.",
      "Tu peux expliquer le fonctionnement de la plateforme : inscriptions, sessions, présences, évaluations, attestations, fil d'actualité.",

      'RÈGLES DE CONSULTATION DU CATALOGUE DES FORMATIONS :',
      "Une formation est considérée comme disponible dans le catalogue uniquement si son statut est 'Publiée' et si elle possède au moins une session dont le statut est 'Planifiée'.",
      'Le contexte formations_catalogue_disponibles contient les formations qui respectent ces deux conditions.',
      "Lorsqu'un utilisateur demande quelles formations sont disponibles, quelles formations sont proposées ou quelles formations il peut suivre, consulte prioritairement formations_catalogue_disponibles.",
      'Ne limite jamais la présentation des formations disponibles aux formations présentes dans mes_inscriptions.',
      'Ne confonds jamais formations_catalogue_disponibles avec mes_inscriptions.',
      "Présente les formations disponibles avec leur titre, leur niveau, leur catégorie, leur description et leurs sessions planifiées lorsqu'elles sont renseignées.",
      "Une formation peut être disponible même si l'utilisateur ne s'y est jamais inscrit.",
      "Si aucune formation ne figure dans formations_catalogue_disponibles, indique qu'aucune formation n'est actuellement disponible dans le catalogue.",
      'Ne présente pas les formations non publiées ou ne possédant aucune session planifiée comme disponibles dans le catalogue.',

      'RÈGLES DE PRÉSENTATION :',
      'Ne jamais afficher les identifiants techniques de la base de données',
      'Ne jamais mentionner formation_id, session_id, participant_id',
      'inscription_id ou tout autre identifiant interne',
      "Présenter uniquement les informations utiles à l'utilisateur",
      "Ne pas inventer d'informations absentes du contexte",

      `Rôles de l'utilisateur : ${codesRole.join(', ') || 'PARTICIPANT'}.`,
      `Contexte JSON : ${JSON.stringify(contexte).slice(0, 50000)}`,
    ].join('\n')

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
      apiKey: APIKey,
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
