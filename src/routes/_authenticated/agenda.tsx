import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Filter, MoreHorizontal, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/agenda")({
  head: () => ({
    meta: [
      { title: "Agenda des activités — Suivi des formations" },
      {
        name: "description",
        content: "Planifiez réunions, ateliers, conférences et cérémonies sur un agenda partagé.",
      },
      { property: "og:title", content: "Agenda des activités" },
      {
        property: "og:description",
        content: "Vues jour, semaine, mois et ordre du jour des activités de formation.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Agenda,
});

type TypeEvenement = "Réunion" | "Atelier" | "Conférence" | "Cérémonie" | "Autre";
type StatutEvenement = "Brouillon" | "Planifié" | "En cours" | "Terminé" | "Annulé";

type Evenement = {
  evenement_id: number;
  titre: string;
  type_evenement: TypeEvenement;
  date_debut: string;
  date_fin: string;
  lieu: string | null;
  statut: StatutEvenement;
  description: string | null;
};

const TYPES: TypeEvenement[] = ["Réunion", "Atelier", "Conférence", "Cérémonie", "Autre"];
const STATUTS: StatutEvenement[] = ["Brouillon", "Planifié", "En cours", "Terminé", "Annulé"];
const VUES = ["Jour", "Semaine", "Mois", "Ordre du jour"] as const;

const couleurType: Record<string, string> = {
  Réunion: "#FF7900",
  Atelier: "#2C7BE5",
  Conférence: "#00A36C",
  Cérémonie: "#000000",
  Autre: "#5F6368",
};

const pourInput = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

const memeJour = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

function Agenda() {
  const queryClient = useQueryClient();
  const [vue, setVue] = useState<(typeof VUES)[number]>("Mois");
  const [curseur, setCurseur] = useState(new Date());
  const [typesAffiches, setTypesAffiches] = useState<string[]>([...TYPES]);
  const [afficherWeekends, setAfficherWeekends] = useState(true);
  const [afficherTermines, setAfficherTermines] = useState(true);
  const [formulaire, setFormulaire] = useState<null | (Partial<Evenement> & { date?: Date })>(null);
  const [calendrierOuvert, setCalendrierOuvert] = useState(false);

  const { data: evenements = [] } = useQuery({
    queryKey: ["evenements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("evenement")
        .select("evenement_id, titre, type_evenement, date_debut, date_fin, lieu, statut, description")
        .order("date_debut");
      if (error) throw error;
      return (data ?? []) as unknown as Evenement[];
    },
  });

  const enregistrer = useMutation({
    mutationFn: async (valeurs: Partial<Evenement>) => {
      const charge = {
        titre: valeurs.titre ?? "",
        type_evenement: (valeurs.type_evenement ?? "Réunion") as Evenement["type_evenement"],
        date_debut: valeurs.date_debut ?? new Date().toISOString(),
        date_fin: valeurs.date_fin ?? new Date().toISOString(),
        lieu: valeurs.lieu ?? null,
        statut: (valeurs.statut ?? "Planifié") as Evenement["statut"],
        description: valeurs.description ?? null,
      };
      if (valeurs.evenement_id) {
        const { error } = await supabase
          .from("evenement")
          .update(charge)
          .eq("evenement_id", valeurs.evenement_id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("evenement").insert(charge);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Événement enregistré.");
      setFormulaire(null);
      queryClient.invalidateQueries({ queryKey: ["evenements"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const supprimer = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from("evenement").delete().eq("evenement_id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Événement supprimé.");
      setFormulaire(null);
      queryClient.invalidateQueries({ queryKey: ["evenements"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const visibles = evenements.filter((e) => {
    if (!typesAffiches.includes(e.type_evenement)) return false;
    if (!afficherTermines && (e.statut === "Terminé" || e.statut === "Annulé")) return false;
    return true;
  });

  const jours = useMemo(() => {
    if (vue === "Jour") return [new Date(curseur)];
    if (vue === "Semaine") {
      const debut = new Date(curseur);
      debut.setDate(debut.getDate() - ((debut.getDay() + 6) % 7));
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(debut);
        d.setDate(debut.getDate() + i);
        return d;
      });
    }
    const premier = new Date(curseur.getFullYear(), curseur.getMonth(), 1);
    const debut = new Date(premier);
    debut.setDate(premier.getDate() - ((premier.getDay() + 6) % 7));
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(debut);
      d.setDate(debut.getDate() + i);
      return d;
    });
  }, [vue, curseur]);

  const joursAffiches = afficherWeekends
    ? jours
    : jours.filter((d) => d.getDay() !== 0 && d.getDay() !== 6);

  function deplacer(sens: number) {
    const d = new Date(curseur);
    if (vue === "Jour") d.setDate(d.getDate() + sens);
    else if (vue === "Semaine") d.setDate(d.getDate() + 7 * sens);
    else d.setMonth(d.getMonth() + sens);
    setCurseur(d);
  }

  function ouvrirNouveau(date?: Date) {
    const base = date ?? new Date();
    const debut = new Date(base);
    if (!date) debut.setMinutes(0, 0, 0);
    else debut.setHours(9, 0, 0, 0);
    const fin = new Date(debut);
    fin.setHours(debut.getHours() + 2);
    setFormulaire({
      titre: "",
      type_evenement: "Réunion",
      date_debut: pourInput(debut),
      date_fin: pourInput(fin),
      lieu: "",
      statut: "Planifié",
      description: "",
    });
  }

  const champ =
    "h-10 w-full rounded-md border border-input bg-card px-3 text-sm focus:border-primary focus:outline-none";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Agenda</h1>
        <p className="mt-1 text-sm text-muted-foreground">Planifiez et suivez toutes les activités.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2 border border-border bg-card p-3">
        <Popover open={calendrierOuvert} onOpenChange={setCalendrierOuvert}>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="Sélectionner la date"
              className="flex h-10 min-w-48 items-center gap-2 rounded-md border border-input bg-card px-3 text-sm font-medium capitalize text-foreground"
            >
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              {curseur.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
              <ChevronDown className="ml-auto h-4 w-4 text-muted-foreground" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-0">
            <div className="flex items-center justify-between border-b border-border bg-secondary px-3 py-2">
              <p className="text-sm font-bold text-foreground">Sélectionner la date</p>
              <button
                type="button"
                aria-label="Fermer"
                onClick={() => setCalendrierOuvert(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <Calendar
              mode="single"
              locale={fr}
              selected={curseur}
              onSelect={(d) => {
                if (d) setCurseur(d);
                setCalendrierOuvert(false);
              }}
              initialFocus
              className="pointer-events-auto p-3"
            />
          </PopoverContent>
        </Popover>
        <Button variant="outline" size="icon" onClick={() => deplacer(-1)} aria-label="Période précédente"><ChevronLeft /></Button>
        <Button variant="outline" onClick={() => setCurseur(new Date())}>Aujourd’hui</Button>
        <Button variant="outline" size="icon" onClick={() => deplacer(1)} aria-label="Période suivante"><ChevronRight /></Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="outline" className="ml-auto min-w-32 justify-between"><CalendarDays />{vue}<ChevronDown /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72 p-2">
            <div className="mb-1 flex items-center justify-between bg-secondary px-2 py-1.5">
              <p className="text-sm font-bold text-muted-foreground">Changer de vue</p>
              <DropdownMenuItem aria-label="Fermer" className="h-auto w-auto cursor-pointer p-0 text-muted-foreground hover:bg-transparent focus:bg-transparent hover:text-foreground">
                <X className="h-4 w-4" />
              </DropdownMenuItem>
            </div>
            <DropdownMenuRadioGroup value={vue} onValueChange={(v) => setVue(v as (typeof VUES)[number])}>
              {VUES.map((v) => <DropdownMenuRadioItem key={v} value={v}>{v}</DropdownMenuRadioItem>)}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="outline" size="icon" aria-label="Filtrer par catégorie"><Filter /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72 p-2">
            <div className="mb-1 flex items-center justify-between bg-secondary px-2 py-1.5">
              <p className="text-sm font-bold text-muted-foreground">Affiché par catégorie</p>
              <DropdownMenuItem aria-label="Fermer" className="h-auto w-auto cursor-pointer p-0 text-muted-foreground hover:bg-transparent focus:bg-transparent hover:text-foreground">
                <X className="h-4 w-4" />
              </DropdownMenuItem>
            </div>
            {TYPES.map((t) => <DropdownMenuCheckboxItem key={t} checked={typesAffiches.includes(t)} onCheckedChange={(coche) => setTypesAffiches((prev) => coche ? [...prev, t] : prev.filter((x) => x !== t))}>{t}</DropdownMenuCheckboxItem>)}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="outline" size="icon" aria-label="Autres options"><MoreHorizontal /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72 p-2">
            <div className="mb-1 flex items-center justify-between bg-secondary px-2 py-1.5">
              <p className="text-sm font-bold text-muted-foreground">Autre menu</p>
              <DropdownMenuItem aria-label="Fermer" className="h-auto w-auto cursor-pointer p-0 text-muted-foreground hover:bg-transparent focus:bg-transparent hover:text-foreground">
                <X className="h-4 w-4" />
              </DropdownMenuItem>
            </div>
            <DropdownMenuCheckboxItem checked={afficherWeekends} onCheckedChange={(v) => setAfficherWeekends(!!v)}>Afficher les week-ends</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem disabled>Afficher les vacances</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem disabled>Afficher les jours fériés</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={afficherTermines} onCheckedChange={(v) => setAfficherTermines(!!v)}>Afficher les activités terminées</DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button size="icon" onClick={() => ouvrirNouveau()} aria-label="Nouvel événement">
          <Plus />
        </Button>
      </div>

      {vue === "Ordre du jour" ? (
        <div className="space-y-2 rounded-lg border border-border bg-card p-4">
          {visibles.map((e) => (
            <button
              key={e.evenement_id}
              onClick={() =>
                setFormulaire({
                  ...e,
                  date_debut: pourInput(new Date(e.date_debut)),
                  date_fin: pourInput(new Date(e.date_fin)),
                })
              }
              className="flex w-full items-center gap-3 rounded-md border border-border p-3 text-left hover:bg-secondary"
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: couleurType[e.type_evenement] }}
              />
              <span className="text-sm font-semibold text-foreground">{e.titre}</span>
              <span className="text-xs text-muted-foreground">
                {new Date(e.date_debut).toLocaleString("fr-FR")} — {e.lieu ?? "—"}
              </span>
              <span className="ml-auto rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                {e.statut}
              </span>
            </button>
          ))}
          {visibles.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune activité à afficher.</p>
          ) : null}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <div
            className="grid border-b border-border bg-secondary"
            style={{ gridTemplateColumns: `repeat(${vue === "Mois" ? (afficherWeekends ? 7 : 5) : joursAffiches.length}, minmax(0,1fr))` }}
          >
            {(vue === "Mois" ? joursAffiches.slice(0, afficherWeekends ? 7 : 5) : joursAffiches).map(
              (d, i) => (
                <div
                  key={i}
                  className="px-2 py-2 text-center text-xs font-bold capitalize text-muted-foreground"
                >
                  {d.toLocaleDateString("fr-FR", { weekday: "short" })}
                </div>
              ),
            )}
          </div>
          <div
            className="grid"
            style={{ gridTemplateColumns: `repeat(${vue === "Mois" ? (afficherWeekends ? 7 : 5) : joursAffiches.length}, minmax(0,1fr))` }}
          >
            {joursAffiches.map((jour, i) => {
              const duJour = visibles.filter((e) => memeJour(new Date(e.date_debut), jour));
              const horsMois = vue === "Mois" && jour.getMonth() !== curseur.getMonth();
              return (
                <button
                  key={i}
                  onClick={() => ouvrirNouveau(jour)}
                  className={`min-h-28 border-b border-r border-border p-2 text-left align-top hover:bg-cream/60 ${
                    horsMois ? "bg-secondary/40" : ""
                  }`}
                >
                  <span
                    className={`text-xs font-bold ${
                      memeJour(jour, new Date()) ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {jour.getDate()}
                  </span>
                  <span className="mt-1 block space-y-1">
                    {duJour.map((e) => (
                      <span
                        key={e.evenement_id}
                        role="button"
                        tabIndex={0}
                        onClick={(ev) => {
                          ev.stopPropagation();
                          setFormulaire({
                            ...e,
                            date_debut: pourInput(new Date(e.date_debut)),
                            date_fin: pourInput(new Date(e.date_fin)),
                          });
                        }}
                        className="block truncate rounded px-1.5 py-1 text-xs font-medium text-white"
                        style={{ backgroundColor: couleurType[e.type_evenement] }}
                      >
                        {new Date(e.date_debut).toLocaleTimeString("fr-FR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        {e.titre}
                      </span>
                    ))}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <Dialog open={!!formulaire} onOpenChange={(o) => !o && setFormulaire(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-primary">
              {formulaire?.evenement_id ? "Modifier l'événement" : "Nouvel événement"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <input
              className={champ}
              placeholder="Titre"
              value={formulaire?.titre ?? ""}
              onChange={(e) => setFormulaire({ ...formulaire, titre: e.target.value })}
            />
            <select
              className={champ}
              value={formulaire?.type_evenement ?? "Réunion"}
              onChange={(e) => setFormulaire({ ...formulaire, type_evenement: e.target.value as TypeEvenement })}
            >
              {TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                type="datetime-local"
                className={champ}
                value={formulaire?.date_debut ?? ""}
                onChange={(e) => setFormulaire({ ...formulaire, date_debut: e.target.value })}
              />
              <input
                type="datetime-local"
                className={champ}
                value={formulaire?.date_fin ?? ""}
                onChange={(e) => setFormulaire({ ...formulaire, date_fin: e.target.value })}
              />
            </div>
            <input
              className={champ}
              placeholder="Lieu"
              value={formulaire?.lieu ?? ""}
              onChange={(e) => setFormulaire({ ...formulaire, lieu: e.target.value })}
            />
            <select
              className={champ}
              value={formulaire?.statut ?? "Planifié"}
              onChange={(e) => setFormulaire({ ...formulaire, statut: e.target.value as StatutEvenement })}
            >
              {STATUTS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <textarea
              className="min-h-24 w-full rounded-md border border-input bg-card p-3 text-sm focus:border-primary focus:outline-none"
              placeholder="Description"
              value={formulaire?.description ?? ""}
              onChange={(e) => setFormulaire({ ...formulaire, description: e.target.value })}
            />
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            {formulaire?.evenement_id ? (
              <button
                onClick={() => supprimer.mutate(formulaire.evenement_id as number)}
                className="flex items-center gap-2 rounded-md border border-destructive px-4 py-2 text-sm font-semibold text-destructive hover:bg-destructive/5"
              >
                <Trash2 className="h-4 w-4" />
                Supprimer
              </button>
            ) : (
              <span />
            )}
            <button
              onClick={() => {
                if (!formulaire?.titre) {
                  toast.error("Le titre est obligatoire.");
                  return;
                }
                enregistrer.mutate({
                  ...formulaire,
                  date_debut: new Date(formulaire.date_debut ?? "").toISOString(),
                  date_fin: new Date(formulaire.date_fin ?? "").toISOString(),
                });
              }}
              className="rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              Enregistrer
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
