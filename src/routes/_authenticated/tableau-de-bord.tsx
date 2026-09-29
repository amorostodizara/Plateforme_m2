import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Award,
  GraduationCap,
  RotateCcw,
  SlidersHorizontal,
  UserCheck,
  Users,
  UsersRound,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { COULEURS } from "@/lib/images-formation";
import { SqueletteCartes, SqueletteGraphiques } from "@/components/app/Squelette";
import { AccesReserve } from "@/components/app/Acces";
export const Route = createFileRoute("/_authenticated/tableau-de-bord")({
  head: () => ({
    meta: [
      { title: "Dashboard — Suivi des formations" },
      {
        name: "description",
        content:
          "Statistiques des inscriptions, bénéficiaires, formations, formateurs et attestations.",
      },
      { property: "og:title", content: "Dashboard — Suivi des formations" },
      {
        property: "og:description",
        content: "Indicateurs et graphiques de suivi des activités de formation.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
       <AccesReserve roles={["ADMINISTRATEUR", "RESPONSABLE"]}>
         <Dashboard />
       </AccesReserve>
     ),
});

const MOIS = [
  "Jan",
  "Fév",
  "Mar",
  "Avr",
  "Mai",
  "Juin",
  "Juil",
  "Août",
  "Sep",
  "Oct",
  "Nov",
  "Déc",
];

type LigneInscription = {
  inscription_id: number;
  statut: string;
  date_inscription: string;
  session: {
    session_id: number;
    date_debut: string;
    formation: {
      formation_id: number;
      titre: string;
      categorie: { nom: string } | null;
    } | null;
  } | null;
  participant: {
    participant_id: number;
    utilisateur: { genre: string | null } | null;
    profil_professionnel: { statut_actuel: string | null }[] | null;
  } | null;
};

function Carte({
  titre,
  valeur,
  icone: Icone,
}: {
  titre: string;
  valeur: number;
  icone: typeof Users;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground">{titre}</p>
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-cream text-primary">
          <Icone className="h-[18px] w-[18px]" />
        </span>
      </div>
      <p className="mt-3 text-2xl font-bold text-foreground">{valeur}</p>
    </div>
  );
}

function Bloc({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h2 className="text-sm font-bold text-foreground">{titre}</h2>
      <div className="mt-3 h-64">{children}</div>
    </div>
  );
}

function Dashboard() {
  const [annee, setAnnee] = useState("Toutes");
  const [mois, setMois] = useState("Tous");
  const [categorie, setCategorie] = useState("Toutes");
  const [formation, setFormation] = useState("Toutes");
  const [filtres, setFiltres] = useState({
    annee: "Toutes",
    mois: "Tous",
    categorie: "Toutes",
    formation: "Toutes",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const [insc, form, cat, formateurs, attest] = await Promise.all([
        supabase
          .from("inscription")
          .select(
            "inscription_id, statut, date_inscription, session:session_formation(session_id, date_debut, formation:formation(formation_id, titre, categorie:categorie_formation(nom))), participant:participant(participant_id, utilisateur:utilisateur(genre), profil_professionnel:profil_professionnel(statut_actuel))",
          ),
        supabase.from("formation").select("formation_id, titre, categorie:categorie_formation(nom)"),
        supabase.from("categorie_formation").select("nom"),
        supabase.from("formateur").select("formateur_id"),
        supabase.from("attestation").select("attestation_id"),
      ]);

      return {
        inscriptions: (insc.data ?? []) as unknown as LigneInscription[],
        formations: (form.data ?? []) as unknown as {
          formation_id: number;
          titre: string;
          categorie: { nom: string } | null;
        }[],
        categories: (cat.data ?? []).map((c) => c.nom),
        nbFormateurs: formateurs.data?.length ?? 0,
        nbAttestations: attest.data?.length ?? 0,
      };
    },
  });

  const inscriptions = data?.inscriptions ?? [];
  const formations = data?.formations ?? [];

  const annees = useMemo(() => {
    const ens = new Set<string>();
    inscriptions.forEach((i) => ens.add(new Date(i.date_inscription).getFullYear().toString()));
    ens.add(new Date().getFullYear().toString());
    return Array.from(ens).sort().reverse();
  }, [inscriptions]);

  const filtrees = useMemo(() => {
    return inscriptions.filter((i) => {
      const d = new Date(i.date_inscription);
      if (filtres.annee !== "Toutes" && d.getFullYear().toString() !== filtres.annee) return false;
      if (filtres.mois !== "Tous" && MOIS[d.getMonth()] !== filtres.mois) return false;
      if (
        filtres.categorie !== "Toutes" &&
        i.session?.formation?.categorie?.nom !== filtres.categorie
      )
        return false;
      if (filtres.formation !== "Toutes" && i.session?.formation?.titre !== filtres.formation)
        return false;
      return true;
    });
  }, [inscriptions, filtres]);

  const beneficiaires = filtrees.filter((i) => i.statut === "Acceptée");

  const parMois = useMemo(() => {
    return MOIS.map((m, index) => {
      const duMois = filtrees.filter(
        (i) => new Date(i.date_inscription).getMonth() === index,
      );
      const sessions = new Set(duMois.map((i) => i.session?.session_id));
      return {
        mois: m,
        participants: new Set(duMois.map((i) => i.participant?.participant_id)).size,
        formations: sessions.size,
        inscrits: duMois.length,
        beneficiaires: duMois.filter((i) => i.statut === "Acceptée").length,
      };
    });
  }, [filtrees]);

  const parFormation = useMemo(() => {
    const map = new Map<
      string,
      { formation: string; acceptes: number; attente: number; refuses: number; total: number }
    >();
    filtrees.forEach((i) => {
      const titre = i.session?.formation?.titre ?? "—";
      const court = titre.length > 18 ? `${titre.slice(0, 18)}…` : titre;
      const ligne = map.get(court) ?? {
        formation: court,
        acceptes: 0,
        attente: 0,
        refuses: 0,
        total: 0,
      };
      ligne.total += 1;
      if (i.statut === "Acceptée") ligne.acceptes += 1;
      else if (i.statut === "Refusée") ligne.refuses += 1;
      else ligne.attente += 1;
      map.set(court, ligne);
    });
    return Array.from(map.values());
  }, [filtrees]);

  const parGenre = useMemo(() => {
    const compte = { Homme: 0, Femme: 0, "Non renseigné": 0 };
    filtrees.forEach((i) => {
      const g = i.participant?.utilisateur?.genre;
      if (g === "Homme") compte.Homme += 1;
      else if (g === "Femme") compte.Femme += 1;
      else compte["Non renseigné"] += 1;
    });
    return Object.entries(compte)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value }));
  }, [filtrees]);

  const parCategorieSocio = useMemo(() => {
    const map = new Map<string, number>();
    filtrees.forEach((i) => {
      const profils = i.participant?.profil_professionnel;
      const statut =
        (Array.isArray(profils) ? profils[0]?.statut_actuel : null) ?? "Autre";
      map.set(statut, (map.get(statut) ?? 0) + 1);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [filtrees]);

  const tauxParticipation = parFormation.map((f) => ({
    formation: f.formation,
    taux: f.total ? Math.round((f.acceptes / f.total) * 100) : 0,
  }));

  const selectClass =
    "h-10 rounded-md border border-input bg-card px-3 text-sm text-foreground focus:border-primary focus:outline-none";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Tableau de bord</h1>
        <p className="mt-1 text-sm text-muted-foreground">Statistiques de suivi de l’activité de formation</p>
      </div>
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold tracking-wide text-muted-foreground">Année</span>
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
          <span className="text-xs font-semibold tracking-wide text-muted-foreground">Mois</span>
          <select className={selectClass} value={mois} onChange={(e) => setMois(e.target.value)}>
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
            <option>Toutes</option>
            {(data?.categories ?? []).map((c) => (
              <option key={c}>{c}</option>
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
            setAnnee("Toutes");
            setMois("Tous");
            setCategorie("Toutes");
            setFormation("Toutes");
            setFiltres({
              annee: "Toutes",
              mois: "Tous",
              categorie: "Toutes",
              formation: "Toutes",
            });
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
            <Carte titre="INSCRITS" valeur={filtrees.length} icone={Users} />
            <Carte titre="BÉNÉFICIAIRES" valeur={beneficiaires.length} icone={UserCheck} />
            <Carte titre="FORMATIONS" valeur={formations.length} icone={GraduationCap} />
            <Carte titre="FORMATEURS" valeur={data?.nbFormateurs ?? 0} icone={UsersRound} />
            <Carte titre="ATTESTATIONS" valeur={data?.nbAttestations ?? 0} icone={Award} />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Bloc titre="Participants et formations par mois">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={parMois}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EFF4FA" />
                  <XAxis dataKey="mois" fontSize={12} stroke="#5F6368" />
                  <YAxis fontSize={12} stroke="#5F6368" allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="participants"
                    name="Participants"
                    stroke="#FF7900"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="formations"
                    name="Formations"
                    stroke="#000000"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Bloc>

            <Bloc titre="Inscrits et bénéficiaires par mois">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={parMois}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EFF4FA" />
                  <XAxis dataKey="mois" fontSize={12} stroke="#5F6368" />
                  <YAxis fontSize={12} stroke="#5F6368" allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="inscrits"
                    name="Inscrits"
                    stroke="#FF7900"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="beneficiaires"
                    name="Bénéficiaires"
                    stroke="#5F6368"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Bloc>

            <Bloc titre="Participants par formation">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={parFormation}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EFF4FA" />
                  <XAxis dataKey="formation" fontSize={11} stroke="#5F6368" />
                  <YAxis fontSize={12} stroke="#5F6368" allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="acceptes" name="Acceptés" stackId="a" fill="#FF7900" />
                  <Bar dataKey="attente" name="En attente" stackId="a" fill="#F2A65A" />
                  <Bar dataKey="refuses" name="Refusés" stackId="a" fill="#5F6368" />
                </BarChart>
              </ResponsiveContainer>
            </Bloc>

            <Bloc titre="Répartition par sexe">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={parGenre} dataKey="value" nameKey="name" outerRadius={90} label>
                    {parGenre.map((_, i) => (
                      <Cell key={i} fill={COULEURS[i % COULEURS.length]} />
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
                  >
                    {parCategorieSocio.map((_, i) => (
                      <Cell key={i} fill={COULEURS[i % COULEURS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Bloc>

            <Bloc titre="Taux de participation par formation (%)">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tauxParticipation}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EFF4FA" />
                  <XAxis dataKey="formation" fontSize={11} stroke="#5F6368" />
                  <YAxis fontSize={12} stroke="#5F6368" domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="taux" name="Taux (%)" fill="#FF7900" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Bloc>
          </div>
        </>
      )}
    </div>
  );
}
