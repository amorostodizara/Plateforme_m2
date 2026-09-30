import { useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, CheckCheck } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { quand } from '@/components/app/AdminKit'

type Notif = {
  notification_id: number
  type_notification: string
  titre: string
  message: string
  lien: string | null
  lu: boolean
  cree_le: string
}

export function Notifications() {
  const queryClient = useQueryClient()

  // Flux temps réel : toute nouvelle notification arrive immédiatement.
  useEffect(() => {
    const canal = supabase
      .channel('notifications-temps-reel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notification' },
        (payload) => {
          const n = payload.new as { titre?: string; message?: string }
          queryClient.invalidateQueries({ queryKey: ['notifications'] })
          if (n?.titre) toast(n.titre, { description: n.message ?? undefined })
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notification' },
        () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(canal)
    }
  }, [queryClient])

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    refetchInterval: 60000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification')
        .select(
          'notification_id, type_notification, titre, message, lien, lu, cree_le',
        )
        .order('cree_le', { ascending: false })
        .limit(30)
      if (error) throw error
      return (data ?? []) as Notif[]
    },
  })

  const nonLues = notifications.filter((n) => !n.lu).length

  const basculer = useMutation({
    mutationFn: async ({ id, lu }: { id: number; lu: boolean }) => {
      const { error } = await supabase
        .from('notification')
        .update({ lu, lu_le: lu ? new Date().toISOString() : null })
        .eq('notification_id', id)
      if (error) throw error
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const toutLire = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('notification')
        .update({ lu: true, lu_le: new Date().toISOString() })
        .eq('lu', false)
      if (error) throw error
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-muted-foreground"
          aria-label="Notifications"
        >
          <Bell className="!h-6 !w-6 " />
          {nonLues > 0 ? (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
              {nonLues > 99 ? '99+' : nonLues}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[22rem] p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <p className="text-sm font-bold text-foreground">Notifications</p>
          <button
            onClick={() => toutLire.mutate()}
            className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
          >
            <CheckCheck className="h-3.5 w-3.5" /> Tout marquer comme lu
          </button>
        </div>
        <div className="app-scrollbar max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              Aucune notification pour le moment.
            </p>
          ) : (
            notifications.map((n) => {
              const contenu = (
                <>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-cream px-2 py-0.5 text-[10px] font-bold text-primary">
                      {n.type_notification}
                    </span>
                    <span className="ml-auto text-[10px] text-muted-foreground">
                      {quand(n.cree_le)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-semibold text-foreground">
                    {n.titre}
                  </p>
                  <p className="text-xs text-muted-foreground">{n.message}</p>
                </>
              )
              return (
                <div
                  key={n.notification_id}
                  className={`border-b border-border/60 px-3 py-2 ${n.lu ? '' : 'bg-cream/60'}`}
                >
                  {n.lien ? (
                    <Link
                      to={n.lien as never}
                      onClick={() =>
                        !n.lu &&
                        basculer.mutate({ id: n.notification_id, lu: true })
                      }
                      className="block"
                    >
                      {contenu}
                    </Link>
                  ) : (
                    contenu
                  )}
                  <button
                    onClick={() =>
                      basculer.mutate({ id: n.notification_id, lu: !n.lu })
                    }
                    className="mt-1 text-[10px] font-semibold text-primary hover:underline"
                  >
                    Marquer comme {n.lu ? 'non lue' : 'lue'}
                  </button>
                </div>
              )
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
