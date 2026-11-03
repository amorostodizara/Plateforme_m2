import { useEffect, useRef, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import {
  Bot,
  MessageSquarePlus,
  Send,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  User,
} from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { poserQuestionAssistant } from '@/backend/functions/assistant.functions'
import { useProfilCourant } from '@/components/app/AppShell'
import { Bloc } from '@/components/app/Squelette'

export const Route = createFileRoute('/_authenticated/assistant-ia')({
  head: () => ({
    meta: [
      { title: 'Assistant IA ' },
      {
        name: 'description',
        content:
          'Posez vos questions sur vos formations, inscriptions, présences et attestations.',
      },
      { property: 'og:title', content: 'Assistant IA ' },
      {
        property: 'og:description',
        content:
          'Un assistant qui répond en langage naturel avec vos données de formation.',
      },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: AssistantIA,
})

const QUESTIONS_FREQUENTES = [
  'Quelles sont mes inscriptions et leur statut ?',
  'Quelles formations sont disponibles en ce moment ?',
  "Combien d'absences ai-je sur mes sessions ?",
  'Ai-je une évaluation à passer et quelle est sa date de fermeture ?',
  'Où en est mon attestation de formation ?',
  "Quels événements sont prévus dans l'agenda ?",
  "Comment fonctionne l'inscription à une session ?",
]

type Message = {
  message_id: number
  role_message: string
  contenu: string
  cree_le: string
  retour_ia:
    { retour_id: number; type_retour: 'Positive' | 'Négative' }[] | null
}

type Conversation = { conversation_id: number; titre: string; maj_le: string }

function AssistantIA() {
  const queryClient = useQueryClient()
  const { data: profil } = useProfilCourant()
  const demander = useServerFn(poserQuestionAssistant)
  const [conversationId, setConversationId] = useState<number | null>(null)
  const [question, setQuestion] = useState('')
  const zoneRef = useRef<HTMLDivElement>(null)
  const champRef = useRef<HTMLTextAreaElement>(null)

  const { data: conversations = [], isLoading: chargementConversations } =
    useQuery({
      queryKey: ['conversations-ia'],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('conversation_ia')
          .select('conversation_id, titre, maj_le')
          .order('maj_le', { ascending: false })
        if (error) throw error
        return (data ?? []) as Conversation[]
      },
    })

  const { data: messages = [], isLoading: chargementMessages } = useQuery({
    queryKey: ['messages-ia', conversationId],
    enabled: conversationId !== null,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('message_ia')
        .select(
          'message_id, role_message, contenu, cree_le, retour_ia(retour_id, type_retour)',
        )
        .eq('conversation_id', conversationId!)
        .order('message_id', { ascending: true })
      if (error) throw error
      return (data ?? []) as unknown as Message[]
    },
  })

  useEffect(() => {
    champRef.current?.focus()
  }, [conversationId])

  useEffect(() => {
    zoneRef.current?.scrollTo({
      top: zoneRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages.length])

  const envoyer = useMutation({
    mutationFn: async (texte: string) => {
      if (!profil) throw new Error('Profil introuvable.')
      let id = conversationId
      if (id === null) {
        const { data, error } = await supabase
          .from('conversation_ia')
          .insert({
            utilisateur_id: profil.utilisateur_id,
            titre: texte.slice(0, 60),
          })
          .select('conversation_id')
          .single()
        if (error) throw error
        id = data.conversation_id
        setConversationId(id)
      }

      const { error: eUser } = await supabase
        .from('message_ia')
        .insert({ conversation_id: id, role_message: 'user', contenu: texte })
      if (eUser) throw eUser
      await queryClient.invalidateQueries({ queryKey: ['messages-ia', id] })

      const historique = messages
        .filter(
          (m) => m.role_message === 'user' || m.role_message === 'assistant',
        )
        .slice(-10)
        .map((m) => ({
          role: m.role_message as 'user' | 'assistant',
          contenu: m.contenu,
        }))

      const resultat = await demander({ data: { question: texte, historique } })

      const { error: eIa } = await supabase.from('message_ia').insert({
        conversation_id: id,
        role_message: 'assistant',
        contenu: resultat.reponse,
      })
      if (eIa) throw eIa

      await supabase
        .from('conversation_ia')
        .update({ maj_le: new Date().toISOString() })
        .eq('conversation_id', id)
      return id
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ['messages-ia', id] })
      queryClient.invalidateQueries({ queryKey: ['conversations-ia'] })
      champRef.current?.focus()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const noter = useMutation({
    mutationFn: async ({
      messageId,
      type,
    }: {
      messageId: number
      type: 'Positive' | 'Négative'
    }) => {
      if (!profil) throw new Error('Profil introuvable.')
      const { error } = await supabase.from('retour_ia').upsert(
        {
          message_id: messageId,
          utilisateur_id: profil.utilisateur_id,
          type_retour: type,
        },
        { onConflict: 'message_id,utilisateur_id' },
      )
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Merci pour votre retour.')
      queryClient.invalidateQueries({
        queryKey: ['messages-ia', conversationId],
      })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const supprimerConversation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('conversation_ia')
        .delete()
        .eq('conversation_id', id)
      if (error) throw error
    },
    onSuccess: (_d, id) => {
      if (id === conversationId) setConversationId(null)
      queryClient.invalidateQueries({ queryKey: ['conversations-ia'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  function soumettre(texte: string) {
    const valeur = texte.trim()
    if (!valeur || envoyer.isPending) return
    setQuestion('')
    envoyer.mutate(valeur)
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      <aside className="hidden w-64 shrink-0 flex-col rounded-lg border border-border bg-card p-3 lg:flex">
        <button
          onClick={() => setConversationId(null)}
          className="mb-3 flex h-9 items-center justify-center gap-2 rounded-md bg-primary text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          <MessageSquarePlus className="h-4 w-4" />
          Nouvelle conversation
        </button>
        <p className="px-1 pb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
          Historique
        </p>
        <div className="min-h-0 flex-1 space-y-1 overflow-auto">
          {chargementConversations ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Bloc key={i} className="h-9 w-full" />
            ))
          ) : conversations.length === 0 ? (
            <p className="px-1 text-xs text-muted-foreground">
              Aucune conversation enregistrée.
            </p>
          ) : (
            conversations.map((c) => (
              <div
                key={c.conversation_id}
                className={`flex items-center gap-1 rounded-md px-2 ${c.conversation_id === conversationId ? 'bg-cream' : 'hover:bg-secondary'}`}
              >
                <button
                  onClick={() => setConversationId(c.conversation_id)}
                  className={`min-w-0 flex-1 truncate py-2 text-left text-xs ${c.conversation_id === conversationId ? 'font-semibold text-primary' : 'text-muted-foreground'}`}
                >
                  {c.titre}
                </button>
                <button
                  onClick={() =>
                    supprimerConversation.mutate(c.conversation_id)
                  }
                  className="rounded p-1 text-muted-foreground hover:text-destructive"
                  aria-label="Supprimer la conversation"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col rounded-lg border border-border bg-card">
        <header className="flex items-center gap-3 border-b border-border px-4 py-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-cream text-primary">
            <Bot className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-base font-bold text-foreground">
              Assistant IA
            </h1>
            <p className="text-xs text-muted-foreground">
              Vos formations, inscriptions, présences, évaluations et
              attestations.
            </p>
          </div>
        </header>

        <div
          ref={zoneRef}
          className="min-h-0 flex-1 space-y-4 overflow-auto px-4 py-4"
        >
          {conversationId !== null && chargementMessages ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Bloc className="ml-auto h-10 w-2/5" />
                  <Bloc className="h-4 w-4/5" />
                  <Bloc className="h-4 w-3/5" />
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="mx-auto max-w-xl text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-cream text-primary">
                <Bot className="h-7 w-7" />
              </span>
              <h2 className="mt-3 text-base font-bold text-foreground">
                Bonjour {profil?.prenoms ?? ''}, comment puis-je vous aider ?
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Posez votre question librement ou choisissez une question
                fréquente.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {QUESTIONS_FREQUENTES.map((q) => (
                  <button
                    key={q}
                    onClick={() => soumettre(q)}
                    className="rounded-full border border-input px-3 py-2 text-xs font-medium text-muted-foreground hover:border-primary hover:bg-cream hover:text-primary"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) =>
              m.role_message === 'user' ? (
                <div key={m.message_id} className="flex justify-end gap-2">
                  <p className="max-w-[80%] whitespace-pre-line rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground">
                    {m.contenu}
                  </p>
                  <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                    <User className="h-4 w-4" />
                  </span>
                </div>
              ) : (
                <div key={m.message_id} className="flex gap-2">
                  <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cream text-primary">
                    <Bot className="h-4 w-4" />
                  </span>
                  <div className="max-w-[85%]">
                    <p className="whitespace-pre-line text-sm text-foreground">
                      {m.contenu}
                    </p>
                    <div className="mt-1 flex gap-1">
                      {(['Positive', 'Négative'] as const).map((t) => {
                        const actif = (m.retour_ia ?? []).some(
                          (r) => r.type_retour === t,
                        )
                        const Icone = t === 'Positive' ? ThumbsUp : ThumbsDown
                        return (
                          <button
                            key={t}
                            onClick={() =>
                              noter.mutate({ messageId: m.message_id, type: t })
                            }
                            className={`rounded p-1 ${actif ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                            aria-label={`Réponse ${t.toLowerCase()}`}
                          >
                            <Icone className="h-3.5 w-3.5" />
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              ),
            )
          )}

          {envoyer.isPending ? (
            <div className="flex gap-2">
              <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cream text-primary">
                <Bot className="h-4 w-4" />
              </span>
              <div className="w-2/3 space-y-2">
                <Bloc className="h-4 w-full" />
                <Bloc className="h-4 w-4/5" />
                <Bloc className="h-4 w-2/5" />
              </div>
            </div>
          ) : null}
        </div>

        {messages.length > 0 ? (
          <div className="flex flex-wrap gap-2 border-t border-border px-4 pt-3">
            {QUESTIONS_FREQUENTES.slice(0, 4).map((q) => (
              <button
                key={q}
                onClick={() => soumettre(q)}
                className="rounded-full border border-input px-3 py-1.5 text-xs text-muted-foreground hover:border-primary hover:bg-cream hover:text-primary"
              >
                {q}
              </button>
            ))}
          </div>
        ) : null}

        <form
          className="flex items-end gap-2 p-4"
          onSubmit={(e) => {
            e.preventDefault()
            soumettre(question)
          }}
        >
          <textarea
            ref={champRef}
            value={question}
            rows={1}
            maxLength={5000}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                soumettre(question)
              }
            }}
            placeholder="Posez votre question…"
            className="max-h-32 min-h-10 flex-1 resize-none rounded-md border border-input bg-card px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
          <button
            type="submit"
            disabled={
              envoyer.isPending || !question.trim() || question.length > 5000
            }
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-60"
            aria-label="Envoyer"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </section>
    </div>
  )
}
