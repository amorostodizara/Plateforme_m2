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

type Contexte = Record<string, unknown>

export const poserQuestionAssistant = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => Entree.parse(input))
  .handler(async ({ data, context }) => {
    const cle = process.env['OPENAI_API_KEY']
    // const cle = process.env["GEMINI_API_KEY"];
    if (!cle)
      throw new Error('Assistant indisponible : configuration manquante.')

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
          'formation_id, titre, description, niveau, statut, categorie:categorie_formation(nom_categorie), session_formation(session_id, nom_session, date_debut, date_fin, lieu, statut)',
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

    const consignes = [
      "Tu es l'assistant de la plateforme de formation Orange Digital Center.",
      'Tu réponds toujours en français, de façon courte, claire et structurée.',
      'Tu utilises uniquement les données fournies dans le contexte JSON ci-dessous.',
      "Ces données sont déjà filtrées selon le rôle et les droits de l'utilisateur connecté.",
      "Tu ne divulgues jamais d'informations personnelles concernant un autre utilisateur.",
      "Si une information est absente du contexte ou si l'utilisateur n'y a pas droit, tu le dis clairement et tu n'inventes rien.",
      "Tu peux expliquer le fonctionnement de la plateforme : inscriptions, sessions, présences, évaluations, attestations, agenda, fil d'actualité.",
      `Rôles de l'utilisateur : ${codesRole.join(', ') || 'PARTICIPANT'}.`,
      `Contexte JSON : ${JSON.stringify(contexte).slice(0, 60000)}`,
    ].join('\n')

    //-------------------------------------------------------------------------------------------------------------------
    // if (!cle) {
    //   throw new Error("Assistant indisponible : configuration Gemini manquante.");
    // }

    // const ai = new GoogleGenAI({
    //   apiKey: cle,
    // });

    // // Historique compatible Gemini
    // const historique = data.historique.map((m) => ({
    //   role: m.role === "assistant" ? "model" : "user",
    //   parts: [
    //     {
    //       text: m.contenu,
    //     },
    //   ],
    // }));

    // const stream = await ai.models.generateContentStream({
    //   model: "gemini-3.5-flash-lite",

    //   config: {
    //     systemInstruction: consignes,
    //   },

    //   contents: [
    //     ...historique,
    //     {
    //       role: "user",
    //       parts: [
    //         {
    //           text: data.question,
    //         },
    //       ],
    //     },
    //   ],
    // });

    // let texte = "";

    // for await (const evenement of stream) {
    //   if (typeof evenement.text === "string") {
    //     texte += evenement.text;
    //   }
    // }

    // return {
    //   reponse:
    //     texte.trim() ||
    //     "Je n'ai pas trouvé d'information fiable pour répondre à cette question avec les données disponibles.",
    // };
    //--------------------------------------------------------------------------------------------------------------------------------
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
