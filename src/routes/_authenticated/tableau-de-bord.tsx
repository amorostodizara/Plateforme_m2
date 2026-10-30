import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
  Award,
  GraduationCap,
  RotateCcw,
  SlidersHorizontal,
  UserCheck,
  Users,
  UsersRound,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  AreaChart,
  Area,
} from 'recharts'
import { supabase } from '@/integrations/supabase/client'
import { PIE_COLORS } from '@/lib/images-formation'
import {
  SqueletteCartes,
  SqueletteGraphiques,
} from '@/components/app/Squelette'
import { AccesReserve } from '@/components/app/Acces'
import { CarteDash } from '@/components/app/AdminKit'
export const Route = createFileRoute('/_authenticated/tableau-de-bord')({
  head: () => ({
    meta: [
      { title: 'Dashboard' },
      {
        name: 'description',
        content:
          'Statistiques des inscriptions, bénéficiaires, formations, formateurs et attestations.',
      },
      { property: 'og:title', content: 'Dashboard — Suivi des formations' },
      {
        property: 'og:description',
        content:
          'Indicateurs et graphiques de suivi des activités de formation.',
      },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
  }),
  component: () => (
    <AccesReserve roles={['ADMINISTRATEUR', 'RESPONSABLE', 'FORMATEUR']}>
      <Dashboard />
    </AccesReserve>
  ),
})

const MOIS = [
  'Jan',
  'Fév',
  'Mar',
  'Avr',
  'Mai',
  'Juin',
  'Juil',
  'Août',
  'Sep',
  'Oct',
  'Nov',
  'Déc',
]

type LigneInscription = {
  inscription_id: number
  statut: string
  date_inscription: string
  session: {
    session_id: number
    date_debut: string
    formation: {
      formation_id: number
      titre: string
    } | null
  } | null
  participant: {
    participant_id: number
    utilisateur: { genre: string | null } | null
    profil_professionnel: { statut_actuel: string | null } | null
  } | null
  presence:
    | {
        presence_id: number
        present: boolean
        statut: string
      }[]
    | null
}

function Bloc({
  titre,
  children,
}: {
  titre: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h2 className="text-sm font-bold text-foreground">{titre}</h2>
      <div className="mt-3 h-64">{children}</div>
    </div>
  )
}

function Dashboard() {
  const [annee, setAnnee] = useState('Toutes')
  const [mois, setMois] = useState('Tous')
  const [categorie, setCategorie] = useState('Toutes')
  const [formation, setFormation] = useState('Toutes')
  const [filtres, setFiltres] = useState({
    annee: 'Toutes',
    mois: 'Tous',
    categorie: 'Toutes',
    formation: 'Toutes',
  })

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const [insc, form, formateurs, attest, util] = await Promise.all([
        supabase
          .from('inscription')
          .select(
            'inscription_id, statut, date_inscription, session:session_formation(session_id, date_debut, formation:formation(formation_id, titre)), participant:participant(participant_id, utilisateur:utilisateur(genre), profil_professionnel:profil_professionnel(statut_actuel)), presence:presence(presence_id, present, statut)',
          ),
        supabase
          .from('formation')
          .select('formation_id, titre, categorie:categorie_formation(nom)'),
        supabase.from('formateur').select('formateur_id'),
        supabase.from('attestation').select('attestation_id'),
        supabase.from('utilisateur').select('utilisateur_id, genre'),
      ])
      const erreurs = [insc, form, formateurs, attest, util].filter(
        (resultat) => resultat.error,
      )
      if (erreurs.length > 0) {
        throw new Error(
          erreurs.map((resultat) => resultat.error?.message).join('; '),
        )
      }
      return {
        inscriptions: (insc.data ?? []) as unknown as LigneInscription[],
        formations: (form.data ?? []) as unknown as {
          formation_id: number
          titre: string
        }[],
        utilisateurs: util.data ?? [],
        nbFormateurs: formateurs.data?.length ?? 0,
        nbAttestations: attest.data?.length ?? 0,
      }
    },
  })

  const inscriptions = data?.inscriptions ?? []
  const formations = data?.formations ?? []

  const annees = useMemo(() => {
    const ens = new Set<string>()
    inscriptions.forEach((i) =>
      ens.add(new Date(i.date_inscription).getFullYear().toString()),
    )
    ens.add(new Date().getFullYear().toString())
    return Array.from(ens).sort().reverse()
  }, [inscriptions])

  const filtrees = useMemo(() => {
    return inscriptions.filter((i) => {
      const d = new Date(i.date_inscription)
      if (
        filtres.annee !== 'Toutes' &&
        d.getFullYear().toString() !== filtres.annee
      )
        return false
      if (filtres.mois !== 'Tous' && MOIS[d.getMonth()] !== filtres.mois)
        return false
      if (
        filtres.categorie !== 'Toutes' &&
        (i.participant?.profil_professionnel?.statut_actuel ?? 'Autre') !==
          filtres.categorie
      )
        return false
      if (
        filtres.formation !== 'Toutes' &&
        i.session?.formation?.titre !== filtres.formation
      )
        return false
      return true
    })
  }, [inscriptions, filtres])

  const statutActuel = useMemo(() => {
    return [
      ...new Set(
        inscriptions
          .map((i) => i.participant?.profil_professionnel?.statut_actuel)
          .filter(
            (statut): statut is string =>
              statut != null && statut.trim() !== '',
          ),
      ),
    ].sort((a, b) => a.localeCompare(b))
  }, [inscriptions])

  const parMois = useMemo(() => {
    return MOIS.map((m, index) => {
      const duMois = filtrees.filter(
        (i) => new Date(i.date_inscription).getMonth() === index,
      )
      const sessions = new Set(duMois.map((i) => i.session?.session_id))
      return {
        mois: m,
        participants: new Set(duMois.map((i) => i.participant?.participant_id))
          .size,
        formations: sessions.size,
        inscrits: duMois.length,
        beneficiaires: duMois.filter((i) => i.statut === 'Acceptée').length,
      }
    })
  }, [filtrees])

  const presencesParFormation = useMemo(() => {
    const map = new Map<string, number>()
    filtrees.forEach((inscription) => {
      const titre = inscription.session?.formation?.titre ?? '—'
      const presences = inscription.presence ?? []
      const nombrePresences = presences.filter(
        (presence) =>
          presence.present === true || presence.statut === 'Présent',
      ).length

      map.set(titre, (map.get(titre) ?? 0) + nombrePresences)
    })
    return Array.from(map.entries()).map(([formation, presences]) => ({
      formation,
      presences,
    }))
  }, [filtrees])

  const parGenre = useMemo(() => {
    const participantsUniques = new Map<number, string | null>()
    filtrees.forEach((i) => {
      const participantId = i.participant?.participant_id
      const utilisateur = i.participant?.utilisateur
      if (participantId != null && utilisateur) {
        participantsUniques.set(participantId, utilisateur.genre ?? null)
      }
    })
    const compte = { Homme: 0, Femme: 0, 'Non renseigné': 0 }
    participantsUniques.forEach((genre) => {
      const sexe = genre?.trim()
      if (sexe === 'Homme') compte.Homme++
      else if (sexe === 'Femme') compte.Femme++
      else compte['Non renseigné']++
    })
    return Object.entries(compte).map(([name, value]) => ({ name, value }))
  }, [filtrees])

  // const parCategorieSocio = useMemo(() => {
  //   const map = new Map<string, number>()
  //   filtrees.forEach((i) => {
  //     const statut =
  //       i.participant?.profil_professionnel?.statut_actuel?.trim() || 'Autre'
  //     map.set(statut, (map.get(statut) ?? 0) + 1)
  //   })
  //   return Array.from(map.entries()).map(([name, value]) => ({
  //     name,
  //     value,
  //   }))
  // }, [filtrees])

  const parCategorieSocio = useMemo(() => {
    const participantsUniques = new Map<number, string | null>()
    filtrees.forEach((i) => {
      const participantId = i.participant?.participant_id
      const statut = i.participant?.profil_professionnel?.statut_actuel

      if (participantId != null) {
        participantsUniques.set(participantId, statut?.trim() || null)
      }
    })
    const compte: Record<string, number> = {}
    participantsUniques.forEach((statut) => {
      const categorie = statut ?? 'Non renseigné'
      compte[categorie] = (compte[categorie] ?? 0) + 1
    })

    return Object.entries(compte)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [filtrees])

  const tauxParticipation = useMemo(() => {
    const map = new Map<
      string,
      {
        inscrits: Set<number>
        presentsComplets: Set<number>
      }
    >()
    filtrees.forEach((i) => {
      const titre = i.session?.formation?.titre ?? '—'
      const participantId = i.participant?.participant_id
      if (participantId == null) return
      if (!map.has(titre)) {
        map.set(titre, {
          inscrits: new Set(),
          presentsComplets: new Set(),
        })
      }
      const ligne = map.get(titre)!
      ligne.inscrits.add(participantId)

      const presences = i.presence ?? []
      const presenceComplete =
        presences.length > 0 && presences.every((p) => p.statut === 'Présent')

      if (presenceComplete) {
        ligne.presentsComplets.add(participantId)
      }
    })
    return Array.from(map.entries()).map(([formation, valeurs]) => ({
      formation,
      taux: valeurs.inscrits.size
        ? Math.round(
            (valeurs.presentsComplets.size / valeurs.inscrits.size) * 100,
          )
        : 0,
    }))
  }, [filtrees])

  const selectClass =
    'h-10 rounded-md border border-input bg-card px-3 text-sm text-foreground focus:border-primary focus:outline-none'
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Tableau de bord</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Statistiques de suivi de l’activité de formation
        </p>
      </div>
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold tracking-wide text-muted-foreground">
            Année
          </span>
          <select
            className={selectClass}
            value={annee}
            onChange={(e) => setAnnee(e.target.value)}
          >
            <option>Toutes</option>
            {annees.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold tracking-wide text-muted-foreground">
            Mois
          </span>
          <select
            className={selectClass}
            value={mois}
            onChange={(e) => setMois(e.target.value)}
          >
            <option>Tous</option>
            {MOIS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold tracking-wide text-muted-foreground">
            Catégorie
          </span>
          <select
            className={selectClass}
            value={categorie}
            onChange={(e) => setCategorie(e.target.value)}
          >
            <option value="Toutes">Toutes</option>
            {statutActuel.map((statut) => (
              <option key={statut} value={statut}>
                {statut}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold tracking-wide text-muted-foreground">
            Formation
          </span>
          <select
            className={selectClass}
            value={formation}
            onChange={(e) => setFormation(e.target.value)}
          >
            <option>Toutes</option>
            {formations.map((f) => (
              <option key={f.formation_id}>{f.titre}</option>
            ))}
          </select>
        </label>

        <button
          onClick={() => setFiltres({ annee, mois, categorie, formation })}
          className="flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Appliquer
        </button>
        <button
          onClick={() => {
            setAnnee('Toutes')
            setMois('Tous')
            setCategorie('Toutes')
            setFormation('Toutes')
            setFiltres({
              annee: 'Toutes',
              mois: 'Tous',
              categorie: 'Toutes',
              formation: 'Toutes',
            })
          }}
          className="flex h-10 items-center gap-2 rounded-md border border-input px-4 text-sm font-semibold text-foreground hover:bg-secondary"
        >
          <RotateCcw className="h-4 w-4" />
          Réinitialiser
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <SqueletteCartes nombre={5} />
          <SqueletteGraphiques nombre={6} />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <CarteDash
              titre="INSCRITS"
              valeur={filtrees.length}
              icone={Users}
            />
            <CarteDash
              titre="PARTICIPANTS"
              valeur={filtrees.filter((i) => i.statut === 'Acceptée').length}
              icone={UserCheck}
            />
            <CarteDash
              titre="FORMATIONS"
              valeur={formations.length}
              icone={GraduationCap}
            />
            <CarteDash
              titre="FORMATEURS"
              valeur={data?.nbFormateurs ?? 0}
              icone={UsersRound}
            />
            <CarteDash
              titre="ATTESTATIONS"
              valeur={data?.nbAttestations ?? 0}
              icone={Award}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Bloc titre="Participants et formations par mois">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={parMois}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#EFF4FA" />
                  <XAxis dataKey="mois" fontSize={12} stroke="#5F6368" />
                  <YAxis fontSize={12} stroke="#5F6368" allowDecimals={false} />
                  <Tooltip />
                  <Legend />

                  <Area
                    type="monotone"
                    dataKey="participants"
                    name="Participants"
                    stroke="#FF7900"
                    fill="#FF7900"
                    fillOpacity={0.25}
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="formations"
                    name="Formations"
                    stroke="#5F6368"
                    fill="#000000"
                    fillOpacity={0.15}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Bloc>

            <Bloc titre="Inscrits et bénéficiaires par mois">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={parMois}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#EFF4FA" />
                  <XAxis dataKey="mois" fontSize={12} stroke="#5F6368" />
                  <YAxis fontSize={12} stroke="#5F6368" allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="inscrits"
                    name="Inscrits"
                    stroke="#FF7900"
                    fill="#FF7900"
                    fillOpacity={0.25}
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="beneficiaires"
                    name="Bénéficiaires"
                    stroke="#5F6368"
                    fill="#000000"
                    fillOpacity={0.15}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Bloc>

            <Bloc titre="Présence par formation">
              <div
                style={{
                  width: '100%',
                  overflowX: 'auto',
                  overflowY: 'hidden',
                }}
              >
                <div
                  style={{
                    width: Math.max(600, presencesParFormation.length * 100),
                    height: 270,
                  }}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={presencesParFormation}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#EFF4FA" />
                      <XAxis
                        dataKey="formation"
                        fontSize={11}
                        stroke="#5F6368"
                        tickFormatter={(nom) =>
                          nom.length > 10 ? `${nom.slice(0, 10)}…` : nom
                        }
                      />
                      <YAxis
                        fontSize={12}
                        stroke="#5F6368"
                        allowDecimals={false}
                      />
                      <Tooltip formatter={(value) => [value, 'Présences']} />
                      <Bar
                        dataKey="presences"
                        name="Présences"
                        fill="#FF7900"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </Bloc>

            <Bloc titre="Répartition par sexe">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={parGenre}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={90}
                    labelLine={false}
                    label={({
                      cx,
                      cy,
                      midAngle,
                      innerRadius,
                      outerRadius,
                      percent,
                    }) => {
                      const RADIAN = Math.PI / 180
                      const angle = midAngle ?? 0
                      const rayon =
                        (Number(innerRadius ?? 0) + Number(outerRadius ?? 0)) /
                        2

                      const x =
                        Number(cx ?? 0) + rayon * Math.cos(-angle * RADIAN)
                      const y =
                        Number(cy ?? 0) + rayon * Math.sin(-angle * RADIAN)
                      return (
                        <text
                          x={x}
                          y={y}
                          fill="#FFFFFF"
                          textAnchor="middle"
                          dominantBaseline="central"
                          fontSize={12}
                          fontWeight="bold"
                        >
                          {`${((percent ?? 0) * 100).toFixed(0)}%`}
                        </text>
                      )
                    }}
                  >
                    {parGenre.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Bloc>

            <Bloc titre="Répartition par catégorie">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={parCategorieSocio}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={90}
                    label={({
                      cx,
                      cy,
                      midAngle,
                      innerRadius,
                      outerRadius,
                      percent,
                    }) => {
                      const RADIAN = Math.PI / 180
                      const angle = midAngle ?? 0
                      const rayon =
                        (Number(innerRadius ?? 0) + Number(outerRadius ?? 0)) /
                        2

                      const x =
                        Number(cx ?? 0) + rayon * Math.cos(-angle * RADIAN)
                      const y =
                        Number(cy ?? 0) + rayon * Math.sin(-angle * RADIAN)
                      return (
                        <text
                          x={x}
                          y={y}
                          fill="#FFFFFF"
                          textAnchor="middle"
                          dominantBaseline="central"
                          fontSize={12}
                          fontWeight="bold"
                        >
                          {`${((percent ?? 0) * 100).toFixed(0)}%`}
                        </text>
                      )
                    }}
                    labelLine={false}
                  >
                    {parCategorieSocio.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Bloc>

            <Bloc titre="Taux de présence par formation">
              <div style={{ height: 260, overflowY: 'auto' }}>
                <ResponsiveContainer
                  width="100%"
                  height={Math.max(250, tauxParticipation.length * 42)}
                >
                  <BarChart
                    data={[...tauxParticipation].sort(
                      (a, b) => b.taux - a.taux,
                    )}
                    layout="vertical"
                    margin={{ left: 0, right: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#EFF4FA" />

                    <XAxis
                      type="number"
                      domain={[0, 100]}
                      unit="%"
                      fontSize={12}
                      stroke="#5F6368"
                    />

                    <YAxis
                      type="category"
                      dataKey="formation"
                      fontSize={11}
                      stroke="#5F6368"
                      width={150}
                      tickFormatter={(nom) =>
                        nom.length > 15 ? `${nom.slice(0, 15)}…` : nom
                      }
                    />

                    <Tooltip formatter={(value) => [`${value}%`, 'Taux']} />

                    <Bar
                      dataKey="taux"
                      name="Taux (%)"
                      fill="#FF7900"
                      // radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Bloc>
          </div>
        </>
      )}
    </div>
  )
}
