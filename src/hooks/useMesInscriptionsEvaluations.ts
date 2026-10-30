import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import type { InscriptionAvecPresences } from '@/lib/evaluations'
// import { useProfilCourant } from '@/components/app/AppShell'
// const { data: profil } = useProfilCourant()
export function useMesInscriptionsEvaluations(
  participantId: number | null | undefined,
) {
  return useQuery({
    queryKey: ['mes-inscriptions-evaluations', participantId],

    queryFn: async (): Promise<InscriptionAvecPresences[]> => {
      if (!participantId) {
        return []
      }
      const { data, error } = await supabase
        .from('inscription')
        .select(
          `
          inscription_id,
          session_id,
          statut,
          presence(
            presence_id,
            present,
            statut
          )
        `,
        )
        .eq('participant_id', participantId)
        .eq('statut', 'Acceptée')

      if (error) throw error

      return (data ?? []) as InscriptionAvecPresences[]
    },
    // enabled:
    //   profil?.roles?.includes('PARTICIPANT') === true &&
    //   profil.participant_id != null,
    enabled: participantId != null,
  })
}
