import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { AuthShell } from '@/components/auth/AuthShell'
import { PasswordField, BoutonPrincipal } from '@/components/auth/Field'
import { supabase } from '@/integrations/supabase/client'
import { reinitialiserMotDePasse } from '@/backend/functions/email-auth.functions'

export const Route = createFileRoute('/auth/nouveau-mot-de-passe')({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    jeton: typeof s['jeton'] === 'string' ? s['jeton'] : '',
  }),
  head: () => ({
    meta: [
      { title: 'Changer votre mot de passe ' },
      {
        name: 'description',
        content:
          'Définissez un nouveau mot de passe pour accéder à votre espace de formation.',
      },
      { property: 'og:title', content: 'Changer votre mot de passe' },
      {
        property: 'og:description',
        content: "Définition d'un nouveau mot de passe.",
      },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
  }),
  component: NouveauMotDePasse,
})

function NouveauMotDePasse() {
  const navigate = useNavigate()
  const { jeton } = Route.useSearch()
  const [motDePasse, setMotDePasse] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [erreurs, setErreurs] = useState<{
    motDePasse?: string
    confirmation?: string
    global?: string
  }>({})
  const [chargement, setChargement] = useState(false)

  async function changer(ev: React.FormEvent) {
    ev.preventDefault()
    const e: typeof erreurs = {}
    if (motDePasse.length < 8)
      e.motDePasse = 'Le mot de passe doit contenir au moins 8 caractères'
    if (confirmation !== motDePasse)
      e.confirmation = 'Les mots de passe ne correspondent pas'
    setErreurs(e)
    if (Object.keys(e).length > 0) return

    setChargement(true)
    const error = jeton
      ? !(
          await reinitialiserMotDePasse({ data: { jeton, motDePasse } }).catch(
            () => ({ ok: false }),
          )
        ).ok
      : (await supabase.auth.updateUser({ password: motDePasse })).error
    setChargement(false)
    if (error) {
      setErreurs({
        global:
          'Le lien de réinitialisation est invalide ou expiré. Demandez un nouveau lien depuis « Mot de passe oublié ».',
      })
      return
    }
    await supabase.auth.signOut()
    navigate({ to: '/auth/mot-de-passe-modifie' })
  }

  return (
    <AuthShell
      titre="Changer votre mot de passe"
      sousTitre="Saisissez un nouveau mot de passe ci-dessous pour modifier votre mot de passe"
    >
      <form onSubmit={changer} className="space-y-5">
        <PasswordField
          label="Nouveau mot de passe"
          value={motDePasse}
          erreur={erreurs.motDePasse}
          onChange={(e) => setMotDePasse(e.target.value)}
        />
        <PasswordField
          label="Retaper nouveau mot de passe"
          value={confirmation}
          erreur={erreurs.confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
        />
        {erreurs.global ? (
          <p className="text-sm text-destructive">{erreurs.global}</p>
        ) : null}
        <BoutonPrincipal type="submit" disabled={chargement}>
          {chargement ? 'Modification...' : 'Changer mot de passe'}
        </BoutonPrincipal>
      </form>
    </AuthShell>
  )
}
