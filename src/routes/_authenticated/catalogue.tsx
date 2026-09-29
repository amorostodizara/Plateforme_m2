import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  Code2,
  FileText,
  GraduationCap,
  Grid2X2,
  Lightbulb,
  MapPin,
  Megaphone,
  Search,
  ShieldCheck,
  User,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ImageFormation } from "@/components/app/ImageFormation";
import { useProfilCourant } from "@/components/app/AppShell";
import post_bienvenue from "@/assets/post-bienvenue.png";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SqueletteGrilleCartes } from "@/components/app/Squelette";
import {dateHeureFr } from "@/components/app/AdminKit";
export const Route = createFileRoute("/_authenticated/catalogue")({
  head: () => ({
    meta: [
      { title: "Catalogue des formations — Orange Digital Center" },
      {
        name: "description",
        content: "Parcourez les formations publiées, consultez les sessions et inscrivez-vous.",
      },
      { property: "og:title", content: "Catalogue des formations" },
      {
        property: "og:description",
        content: "Formations publiées, sessions planifiées et inscription en ligne.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Catalogue,
});

type Session = {
  session_id: number;
  nom_session: string;
  date_debut: string;
  date_fin: string;
  lieu: string | null;
  capacite: number | null;
  statut: string;
  formateur: { utilisateur: { nom: string; prenoms: string } | null } | null;
};

type Formation = {
  formation_id: number;
  titre: string;
  description: string | null;
  niveau: string;
  url_image: string | null;
  duree_jours: number | null;
  categorie: { nom: string } | null;
  session_formation: Session[];
};

/** Une session proposée à l’inscription, enrichie des informations de sa formation. */
type SessionCarte = Session & {
  formation_id: number;
  formation: string;
  description: string | null;
  niveau: string;
  url_image: string | null;
  categorie: string | null;
  duree_jours: number | null;
};

const ENGAGEMENTS = [
  "Être présent(e) et assidu(e) durant toute la durée de la formation.",
  "Autoriser Orange Digital Center et Orange Madagascar à utiliser les photos prises pendant la formation à des fins de communication.",
  "Garantir l’exactitude des informations fournies dans cette plateforme.",
  "Je reconnais avoir pris connaissance de ces engagements et les accepter.",
];



const iconesCategorie: Record<string, LucideIcon> = {
  Développement: Code2,
  Cybersécurité: ShieldCheck,
  Bureautique: FileText,
  "Création de contenu": Megaphone,
  "Data & IA": BarChart3,
  "Développement personnel": Users,
};

function JourSession({ date }: { date: string }) {
  const valeur = new Date(date);
  return (
    <span className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-md bg-secondary text-foreground">
      <strong className="text-base leading-none">{String(valeur.getDate()).padStart(2, "0")}</strong>
      <span className="mt-1 text-[10px] font-semibold capitalize">
        {valeur.toLocaleDateString("fr-FR", { month: "short" }).replace(".", "")}
      </span>
    </span>
  );
}

function Catalogue() {
  const queryClient = useQueryClient();
  const { data: profil } = useProfilCourant();
  const [onglet, setOnglet] = useState<"toutes" | "mes" | "avenir">("toutes");
  const [recherche, setRecherche] = useState("");
  const [categorie, setCategorie] = useState("Toutes");
  const [niveau, setNiveau] = useState("Tous");
  const [ouverte, setOuverte] = useState<SessionCarte | null>(null);
  const [motivation, setMotivation] = useState("");
  const [engagements, setEngagements] = useState<boolean[]>([false, false, false, false]);
  const [erreur, setErreur] = useState<string | null>(null);

  const { data: formations = [], isLoading } = useQuery({
    queryKey: ["catalogue"],
    queryFn: async () => {
      const { data } = await supabase
        .from("formation")
        .select(
          "formation_id, titre, description, niveau, url_image, duree_jours, categorie:categorie_formation(nom), session_formation(session_id, nom_session, date_debut, date_fin, lieu, capacite, statut, formateur:formateur(utilisateur:utilisateur(nom, prenoms)))",
        )
        .eq("statut", "Publiée")
        .order("titre");
      return (data ?? []) as unknown as Formation[];
    },
  });

  const { data: mesInscriptions = [] } = useQuery({
    queryKey: ["mes-inscriptions", profil?.participant_id],
    enabled: !!profil?.participant_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("inscription")
        .select("inscription_id, statut, session:session_formation(session_id, formation_id)")
        .eq("participant_id", profil?.participant_id ?? -1);
      return (data ?? []) as unknown as {
        inscription_id: number;
        statut: string;
        session: { session_id: number; formation_id: number } | null;
      }[];
    },
  });

  // const formationsInscrites = new Set(
  //   mesInscriptions.map((i) => i.session?.formation_id).filter(Boolean) as number[],
  // );

  const inscrire = useMutation({
    mutationFn: async ({ sessionId, texte }: { sessionId: number; texte: string }) => {
      if (!profil?.participant_id) throw new Error("Profil participant introuvable.");
      const { error } = await supabase.from("inscription").insert({
        session_id: sessionId,
        participant_id: profil.participant_id,
        statut: "En attente",
        motivation: texte,
        engagement: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Inscription envoyée. Statut : En attente.");
      queryClient.invalidateQueries({ queryKey: ["mes-inscriptions"] });
      fermer();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const categories = useMemo(() => {
    const map = new Map<string, number>();
    formations.forEach((f) => {
      const n = f.categorie?.nom ?? "Autre";
      map.set(n, (map.get(n) ?? 0) + 1);
    });
    return Array.from(map.entries());
  }, [formations]);

  const sessionsInscrites = new Set(
    mesInscriptions.map((i) => i.session?.session_id).filter(Boolean) as number[],
  );

  const toutesSessions: SessionCarte[] = formations.flatMap((f) =>
    f.session_formation.map((s) => ({
      ...s,
      formation_id: f.formation_id,
      formation: f.titre,
      description: f.description,
      niveau: f.niveau,
      url_image: f.url_image,
      categorie: f.categorie?.nom ?? null,
      duree_jours: f.duree_jours,
    })),
  );

  const affichees = toutesSessions
    .filter((s) => {
      if (onglet === "mes" && !sessionsInscrites.has(s.session_id)) return false;
      if (onglet === "avenir" && new Date(s.date_debut) <= new Date()) return false;
      if (categorie !== "Toutes" && s.categorie !== categorie) return false;
      if (niveau !== "Tous" && s.niveau !== niveau) return false;
      const texte = `${s.formation} ${s.nom_session}`.toLowerCase();
      if (recherche && !texte.includes(recherche.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => a.date_debut.localeCompare(b.date_debut));

  function fermer() {
    setOuverte(null);
    setMotivation("");
    setEngagements([false, false, false, false]);
    setErreur(null);
  }

  function envoyer() {
    if (!ouverte) return;
    if (motivation.trim().length < 10) {
      setErreur("Merci d’indiquer votre motivation (au moins 10 caractères).");
      return;
    }
    if (engagements.some((v) => !v)) {
      setErreur("Vous devez accepter l’ensemble des engagements.");
      return;
    }
    setErreur(null);
    inscrire.mutate({ sessionId: ouverte.session_id, texte: motivation.trim() });
  }

  const prochaines = formations
    .flatMap((f) => f.session_formation.map((s) => ({ ...s, formation: f.titre })))
    .filter((s) => new Date(s.date_debut) > new Date())
    .sort((a, b) => a.date_debut.localeCompare(b.date_debut))
    .slice(0, 5);

  const selectClass =
    "h-10 rounded-md border border-input bg-card px-3 text-sm text-foreground focus:border-primary focus:outline-none";

  return (
    <div className="space-y-5">
      <section className="relative min-h-32 overflow-hidden rounded-lg border border-primary/10 bg-accent px-5 py-5 md:px-7">
        <div className="relative z-10 flex max-w-xl items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-card">
            <GraduationCap className="h-7 w-7" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-foreground md:text-2xl">
              Bienvenue, {profil?.prenoms || profil?.nom || "apprenant"} !
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Découvrez nos formations et développez vos compétences.
            </p>
          </div>
        </div>
        <img
          src={post_bienvenue}
          alt="Apprenant travaillant sur son ordinateur"
          className="absolute bottom-0 right-[18%] hidden h-[125%] w-auto object-contain lg:block"
        />
        <blockquote className="absolute right-7 top-1/2 z-10 hidden w-48 -translate-y-1/2 text-sm xl:block">
          <p className="font-semibold text-primary">“ Vers un numérique responsable. ”</p>
          <footer className="mt-2 text-xs text-muted-foreground">Orange Digital Center Madagascar</footer>
        </blockquote>
      </section>

      <div>
        <h2 className="text-xl font-bold text-foreground">Catalogue des formations</h2>
        <p className="mt-1 text-sm text-muted-foreground">Explorez les parcours disponibles et trouvez la formation qui vous convient.</p>
      </div>

      <div className="grid items-start gap-5 min-[1000px]:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-1 border-b border-border">
            {(
              [
                ["toutes", "Toutes les sessions"],
                ["mes", "Mes inscriptions"],
                ["avenir", "À venir"],
              ] as const
            ).map(([cle, libelle]) => (
              <Button
                variant="ghost"
                key={cle}
                onClick={() => setOnglet(cle)}
                className={`h-10 rounded-none border-b-2 px-4 text-sm font-semibold ${
                  onglet === cle
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:bg-secondary"
                }`}
              >
                {libelle}
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-52">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                placeholder="Rechercher une formation"
                className="h-10 w-full rounded-md border border-input bg-card pl-9 pr-3 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <select
              className={selectClass}
              value={categorie}
              onChange={(e) => setCategorie(e.target.value)}
            >
              <option>Toutes</option>
              {categories.map(([nom]) => (
                <option key={nom}>{nom}</option>
              ))}
            </select>
            <select
              className={selectClass}
              value={niveau}
              onChange={(e) => setNiveau(e.target.value)}
            >
              <option>Tous</option>
              <option>Débutant</option>
              <option>Intermédiaire</option>
              <option>Avancé</option>
            </select>
          </div>

          {isLoading ? (
            <SqueletteGrilleCartes nombre={6} />
          ) : affichees.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune session ne correspond.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {affichees.map((s) => {
                const dejaInscrit = sessionsInscrites.has(s.session_id);
                const complet = s.statut === "Annulée" || s.statut === "Terminée";
                return (
                  <article
                    key={s.session_id}
                    className="overflow-hidden rounded-lg border border-border bg-card"
                  >
                    <ImageFormation
                      categorie={s.categorie}
                      urlImage={s.url_image}
                      alt={s.formation}
                      className="h-36 w-full object-cover"
                    />
                    <div className="space-y-2.5 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-semibold uppercase text-primary">{s.categorie ?? "Formation"}</span>
                        <span className="rounded-full bg-cream px-2.5 py-1 text-[10px] font-semibold text-primary">{s.niveau}</span>
                      </div>
                      <h3 className="text-sm font-bold text-foreground">{s.nom_session}</h3>
                      <p className="text-xs font-medium text-muted-foreground">{s.formation}</p>
                      <div className="space-y-1 border-y border-border py-2 text-xs text-muted-foreground">
                        <p className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5 text-primary" />{dateHeureFr(s.date_debut)} — {dateHeureFr(s.date_fin)}</p>
                        <p className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-primary" />{s.lieu ?? "Lieu à préciser"}</p>
                        <p className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5 text-primary" />
                          {s.capacite ? `${s.capacite} places` : "Places non limitées"} · {s.statut}
                        </p>
                      </div>
                      <Button
                        disabled={dejaInscrit || complet}
                        onClick={() => setOuverte(s)}
                        className="h-9 w-full text-xs"
                      >
                        {dejaInscrit ? "Déjà inscrit" : complet ? "Inscriptions fermées" : "S’inscrire"}
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-4 shadow-card">
            <h3 className="text-base font-bold text-foreground">Catégories de formation</h3>
            <ul className="mt-4 space-y-1">
              <li>
                <Button variant="ghost" onClick={() => setCategorie("Toutes")} className={`h-11 w-full justify-start gap-3 px-3 ${categorie === "Toutes" ? "bg-cream text-primary hover:bg-cream" : "text-muted-foreground"}`}>
                  <Grid2X2 className="h-5 w-5" /><span>Toutes les catégories</span><span className="ml-auto">{formations.length}</span>
                </Button>
              </li>
              {categories.map(([nom, nb]) => (
                <li key={nom}>
                  <Button
                    variant="ghost"
                    onClick={() => setCategorie(nom)}
                    className={`h-11 w-full justify-start gap-3 px-3 ${categorie === nom ? "bg-cream text-primary hover:bg-cream" : "text-muted-foreground"}`}
                  >
                    {(() => { const Icone = iconesCategorie[nom] ?? BriefcaseBusiness; return <Icone className="h-5 w-5" />; })()}
                    <span>{nom}</span>
                    <span className="ml-auto">{nb}</span>
                  </Button>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border border-border bg-card p-4 shadow-card">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              <h3 className="text-base font-bold text-foreground">Prochaines formations</h3>
              <Button variant="link" className="ml-auto h-auto p-0 text-xs" onClick={() => setOnglet("avenir")}>Voir tout</Button>
            </div>
            <ul className="mt-4 space-y-3">
              {prochaines.map((s) => (
                <li key={s.session_id} className="flex items-center gap-3">
                  <JourSession date={s.date_debut} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{s.formation}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {new Date(s.date_debut).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} · {s.nom_session}
                    </p>
                  </div>
                </li>
              ))}
              {prochaines.length === 0 ? (
                <li className="text-xs text-muted-foreground">Aucune session à venir.</li>
              ) : null}
            </ul>
            <div className="mt-5 flex gap-3 rounded-md bg-cream p-3 text-xs leading-5 text-muted-foreground">
              <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <p>Restez connecté pour voir les formations disponibles. Visitez souvent la plateforme pour ne pas manquer les formations gratuites.</p>
            </div>
          </div>
        </aside>
      </div>

      <Dialog open={!!ouverte} onOpenChange={(o) => !o && fermer()}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-primary">Inscription — {ouverte?.nom_session}</DialogTitle>
            <DialogDescription>{ouverte?.formation}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-1 rounded-md border border-border bg-cream/60 p-3 text-xs text-muted-foreground">
              <p className="flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5 text-primary" />
                {ouverte ? `${dateHeureFr(ouverte.date_debut)} — ${dateHeureFr(ouverte.date_fin)}` : ""}
              </p>
              <p className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                {ouverte?.lieu ?? "Lieu à préciser"}
              </p>
              <p className="flex items-center gap-1">
                <User className="h-3.5 w-3.5 text-primary" />
                {ouverte?.formateur?.utilisateur
                  ? `${ouverte.formateur.utilisateur.prenoms} ${ouverte.formateur.utilisateur.nom}`
                  : "Formateur à confirmer"}
              </p>
            </div>

            <div>
              <label htmlFor="motivation" className="mb-1.5 block text-sm font-semibold tracking-wide text-foreground">
                Quel est votre motivation pour cette formation ?
              </label>
              <textarea
                id="motivation"
                value={motivation}
                onChange={(e) => { setMotivation(e.target.value); setErreur(null); }}
                rows={4}
                placeholder="Expliquez en quelques lignes pourquoi vous souhaitez suivre cette session."
                className="w-full rounded-md border border-input bg-card p-3 text-sm focus:border-primary focus:outline-none"
              />
            </div>

            <fieldset className="rounded-md border border-border p-3">
              <legend className="px-1 text-sm font-semibold tracking-wide text-foreground">Je m’engage à :</legend>
              <div className="space-y-2.5 pt-1">
                {ENGAGEMENTS.map((texte, i) => (
                  <label key={texte} className="flex items-start gap-3 text-xs leading-5 text-muted-foreground">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 shrink-0 accent-[#FF7900]"
                      checked={engagements[i] ?? false}
                      onChange={(e) => {
                        const copie = [...engagements];
                        copie[i] = e.target.checked;
                        setEngagements(copie);
                        setErreur(null);
                      }}
                    />
                    <span><strong className="text-foreground">{i + 1}-</strong> {texte}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            {erreur ? <p className="text-sm font-medium text-destructive">{erreur}</p> : null}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={fermer} className="h-10">Annuler</Button>
              <Button onClick={envoyer} disabled={inscrire.isPending} className="h-10">
                {inscrire.isPending ? "Envoi…" : "Confirmer mon inscription"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
