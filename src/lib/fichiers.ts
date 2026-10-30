import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

/** Un chemin de stockage interne (bucket « fichiers ») plutôt qu’un lien externe. */
export function estCheminStockage(valeur?: string | null): boolean {
  if (!valeur) return false
  return !/^(https?:|data:|blob:|\/)/i.test(valeur)
}

export function tailleLisible(o?: number | null) {
  if (!o) return '—'
  if (o < 1024) return `${o} o`
  if (o < 1024 * 1024) return `${(o / 1024).toFixed(0)} Ko`
  return `${(o / 1024 / 1024).toFixed(1)} Mo`
}

export function fichierTropLourd(
  fichier: File,
  tailleMaxMo: number = 1,
): boolean {
  return fichier.size > tailleMaxMo * 1024 * 1024
}

const nomSain = (nom: string) => nom.replace(/[^\w.\-]/g, '_')

/** Téléverse un fichier dans le bucket privé et renvoie son chemin de stockage. */
export async function televerserFichier(
  dossier: string,
  fichier: File,
  tailleMaxMo = 20,
): Promise<string> {
  if (fichier.size > tailleMaxMo * 1024 * 1024) {
    throw new Error(`Le fichier dépasse ${tailleMaxMo} Mo.`)
  }
  const chemin = `${dossier}/${Date.now()}-${nomSain(fichier.name)}`
  const { error } = await supabase.storage
    .from('fichiers')
    .upload(chemin, fichier, { upsert: false })
  if (error) throw error
  return chemin
}

export async function supprimerFichier(chemin?: string | null) {
  if (estCheminStockage(chemin))
    await supabase.storage.from('fichiers').remove([chemin as string])
}

/** Résout un chemin de stockage en URL signée temporaire (les liens externes sont renvoyés tels quels). */
export async function urlFichier(
  valeur?: string | null,
  secondes = 3600,
): Promise<string | null> {
  if (!valeur) return null
  if (!estCheminStockage(valeur)) return valeur
  const { data, error } = await supabase.storage
    .from('fichiers')
    .createSignedUrl(valeur, secondes)
  if (error || !data) return null
  return data.signedUrl
}

/** Hook React : URL utilisable pour afficher ou télécharger un fichier stocké. */
export function useUrlFichier(valeur?: string | null) {
  return useQuery({
    queryKey: ['url-fichier', valeur],
    enabled: !!valeur,
    staleTime: 30 * 60 * 1000,
    queryFn: () => urlFichier(valeur),
  })
}

/** Ouvre un fichier stocké dans un nouvel onglet. */
export async function ouvrirFichier(valeur?: string | null): Promise<boolean> {
  const url = await urlFichier(valeur)
  if (!url) return false
  window.open(url, '_blank', 'noopener')
  return true
}
