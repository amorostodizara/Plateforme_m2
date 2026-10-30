import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { AuthShell } from '@/components/auth/AuthShell'
import { Field, BoutonPrincipal } from '@/components/auth/Field'
import { demanderReinitialisation } from '@/backend/functions/email-auth.functions'

export const Route = createFileRoute('/auth/mot-de-passe-oublie')({
  head: () => ({
    meta: [
      { title: 'Mot de passe oublié ' },
      {
        name: 'description',
        content:
          'Recevez un lien sécurisé pour réinitialiser le mot de passe de votre compte.',
      },
      { property: 'og:title', content: 'Mot de passe oublié ' },
      {
        property: 'og:description',
        content: 'Réinitialisation du mot de passe.',
      },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
  }),
  component: MotDePasseOublie,
})

function MotDePasseOublie() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [chargement, setChargement] = useState(false)

  async function envoyer(ev: React.FormEvent) {
    ev.preventDefault()
    setErreur(null)
    if (!email.trim()) {
      setErreur("L'adresse e-mail est requise")
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErreur('Adresse e-mail invalide')
      return
    }
    setChargement(true)
    const r = await demanderReinitialisation({
      data: { email: email.trim() },
    }).catch(() => ({ ok: false }))
    const error = !r.ok
    setChargement(false)
    if (error) {
      setErreur("L'envoi a échoué. Vérifiez l'adresse e-mail saisie.")
      return
    }
    navigate({ to: '/auth/verifier-email', search: { email: email.trim() } })
  }

  return (
    <AuthShell
      titre="Mot de passe oublié"
      sousTitre="Saisissez votre adresse e-mail et nous vous enverrons les instructions pour réinitialiser votre mot de passe."
    >
      <form onSubmit={envoyer} className="space-y-5">
        <Field
          label="Adresse e-mail"
          type="email"
          value={email}
          erreur={erreur ?? undefined}
          onChange={(e) => {
            setEmail(e.target.value)
            setErreur(null)
          }}
        />
        <BoutonPrincipal type="submit" disabled={chargement}>
          {chargement ? 'Envoi...' : 'Continuer'}
        </BoutonPrincipal>
        <Link
          to="/auth"
          className="block text-center text-sm font-medium text-primary underline underline-offset-4"
        >
          Retour au connexion
        </Link>
      </form>
    </AuthShell>
  )
}
