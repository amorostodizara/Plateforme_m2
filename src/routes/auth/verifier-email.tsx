import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Mail } from 'lucide-react'
import { AuthShell } from '@/components/auth/AuthShell'
import { BoutonPrincipal } from '@/components/auth/Field'
import { demanderReinitialisation } from '@/backend/functions/email-auth.functions'

export const Route = createFileRoute('/auth/verifier-email')({
  validateSearch: (search: Record<string, unknown>) => ({
    email: typeof search['email'] === 'string' ? search['email'] : '',
  }),
  head: () => ({
    meta: [
      { title: 'Vérifier votre email — Réinitialisation' },
      {
        name: 'description',
        content:
          'Consultez votre boîte e-mail pour obtenir les instructions de réinitialisation.',
      },
      {
        property: 'og:title',
        content: 'Vérifier votre email — Réinitialisation',
      },
      {
        property: 'og:description',
        content: 'Instructions de réinitialisation envoyées.',
      },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
  }),
  component: VerifierEmail,
})

function VerifierEmail() {
  const { email } = Route.useSearch()
  const [message, setMessage] = useState<string | null>(null)
  const [chargement, setChargement] = useState(false)

  async function renvoyer() {
    setChargement(true)
    const r = await demanderReinitialisation({ data: { email: email } }).catch(
      () => ({ ok: false }),
    )
    const error = !r.ok
    setChargement(false)
    setMessage(
      error
        ? 'Une erreur est survenue. Réessayez dans un instant.'
        : 'Si un compte est associé à cette adresse, un nouvel e-mail a été envoyé.',
    )
  }

  return (
    <AuthShell
      titre="Verifier votre email"
      sousTitre={`Si un compte est associé à ${email}, un lien de réinitialisation vous sera envoyé. Consultez votre boîte e-mail.`}
      icone={
        <span
          className="flex h-16 w-16 items-center justify-center rounded-full border-2"
          style={{
            borderColor: 'var(--color-success)',
            color: 'var(--color-success)',
          }}
        >
          <Mail className="h-7 w-7" />
        </span>
      }
    >
      <div className="space-y-3">
        <BoutonPrincipal type="button" onClick={renvoyer} disabled={chargement}>
          {chargement ? 'Envoi...' : 'Renvoyer email'}
        </BoutonPrincipal>
        {message ? (
          <p className="text-center text-sm text-muted-foreground">{message}</p>
        ) : null}
      </div>
    </AuthShell>
  )
}
