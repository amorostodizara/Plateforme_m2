import { useMemo, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Eye, Pencil, Plus, Search, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { SqueletteLignesTableau } from "@/components/app/Squelette";
import {
  CarteStat, EnteteAdmin, Etiquette, LigneInfo, MenuActions, PanneauDetail, SectionPanneau,
  champClass, dateFr, labelClass, selectClass,
} from "@/components/app/AdminKit";
import { ouvrirFichier, supprimerFichier, tailleLisible, televerserFichier } from "@/lib/fichiers";

const champFichierClass =
  "block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-cream file:px-3 file:py-2 file:text-sm file:font-semibold file:text-primary";

async function televerserCv(fichier: File) {
  const ok = fichier.type === "application/pdf" || fichier.name.toLowerCase().endsWith(".pdf");
  if (!ok) throw new Error("Le CV doit être un fichier PDF.");
  return televerserFichier("cv-formateurs", fichier, 10);
}

export const Route = createFileRoute("/_authenticated/formateurs")({
  head: () => ({
    meta: [
      { title: "Formateurs — Orange Digital Center" },
      { name: "description", content: "Gérez les profils des formateurs, leur historique et leurs paiements." },
      { property: "og:title", content: "Formateurs — Orange Digital Center" },
      { property: "og:description", content: "Gérez les profils des formateurs, leur historique et leurs paiements." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

type Formateur = {
  formateur_id: number;
  institution: string | null;
  intitule_poste: string | null;
  specialisation: string | null;
  annees_experience: number | null;
  curriculum_vitae: string | null;
  utilisateur: { nom: string; prenoms: string; email: string; telephone: string | null; adresse: string | null; statut: string } | null;
};

type SessionFormateur = {
  session_id: number;
  nom_session: string;
  date_debut: string;
  date_fin: string;
  lieu: string | null;
  statut: string;
  formation: { titre: string } | null;
  inscriptions: { inscription_id: number }[] | null;
};

type Paiement = {
  paiement_id: number;
  montant: number;
  methode: string;
  date_paiement: string;
  statut: string;
  remarque: string | null;
  session: { nom_session: string; formation: { titre: string } | null } | null;
};

const paiementVide = { session_id: "", montant: "", methode: "Virement", date_paiement: new Date().toISOString().slice(0, 10), statut: "En attente", remarque: "" };
const nouveauVide = { utilisateur_id: "", institution: "", intitule_poste: "", specialisation: "", annees_experience: "", curriculum_vitae: "" };

function Page() {
  const queryClient = useQueryClient();
  const [recherche, setRecherche] = useState("");
  const [detail, setDetail] = useState<Formateur | null>(null);
  const [onglet, setOnglet] = useState<"historique" | "paiements">("historique");
  const [profilOuvert, setProfilOuvert] = useState(false);
  const [profil, setProfil] = useState({ institution: "", intitule_poste: "", specialisation: "", annees_experience: "", curriculum_vitae: "" });
  const [paiementOuvert, setPaiementOuvert] = useState(false);
  const [paiement, setPaiement] = useState(paiementVide);
  const [paiementEdite, setPaiementEdite] = useState<number | null>(null);
  const [nouveauOuvert, setNouveauOuvert] = useState(false);
  const [nouveau, setNouveau] = useState(nouveauVide);
  const [cvProfil, setCvProfil] = useState<File | null>(null);
  const [cvNouveau, setCvNouveau] = useState<File | null>(null);

  const { data: formateurs = [], isLoading } = useQuery({
    queryKey: ["admin-formateurs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("formateur")
        .select("formateur_id, institution, intitule_poste, specialisation, annees_experience, curriculum_vitae, utilisateur:utilisateur(nom, prenoms, email, telephone, adresse, statut)");
      if (error) throw error;
      return (data ?? []) as unknown as Formateur[];
    },
  });

  const { data: comptes = [] } = useQuery({
    queryKey: ["comptes-disponibles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("utilisateur").select("utilisateur_id, nom, prenoms, email").order("nom");
      if (error) throw error;
      return (data ?? []) as { utilisateur_id: number; nom: string; prenoms: string; email: string }[];
    },
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ["formateur-sessions", detail?.formateur_id],
    enabled: !!detail,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("session_formation")
        .select("session_id, nom_session, date_debut, date_fin, lieu, statut, formation:formation(titre), inscriptions:inscription(inscription_id)")
        .eq("formateur_id", detail!.formateur_id)
        .order("date_debut", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as SessionFormateur[];
    },
  });

  const { data: paiements = [] } = useQuery({
    queryKey: ["formateur-paiements", detail?.formateur_id],
    enabled: !!detail,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("paiement_formateur")
        .select("paiement_id, montant, methode, date_paiement, statut, remarque, session:session_formation(nom_session, formation:formation(titre))")
        .eq("formateur_id", detail!.formateur_id)
        .order("date_paiement", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Paiement[];
    },
  });

  const enregistrerProfil = useMutation({
    mutationFn: async () => {
      let cv = profil.curriculum_vitae || null;
      if (cvProfil) cv = await televerserCv(cvProfil);
      const { error } = await supabase
        .from("formateur")
        .update({
          institution: profil.institution || null,
          intitule_poste: profil.intitule_poste || null,
          specialisation: profil.specialisation || null,
          annees_experience: profil.annees_experience ? Number(profil.annees_experience) : null,
          curriculum_vitae: cv,
        })
        .eq("formateur_id", detail!.formateur_id);
      if (error) {
        if (cvProfil && cv) await supprimerFichier(cv);
        throw error;
      }
      if (cvProfil && profil.curriculum_vitae && profil.curriculum_vitae !== cv) {
        await supprimerFichier(profil.curriculum_vitae);
      }
    },
    onSuccess: () => {
      toast.success("Profil formateur mis à jour.");
      setProfilOuvert(false);
      setCvProfil(null);
      queryClient.invalidateQueries({ queryKey: ["admin-formateurs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const creerFormateur = useMutation({
    mutationFn: async () => {
      if (!nouveau.utilisateur_id) throw new Error("Choisissez le compte utilisateur du formateur.");
      const utilisateur_id = Number(nouveau.utilisateur_id);
      const cv = cvNouveau ? await televerserCv(cvNouveau) : null;
      const { error } = await supabase.from("formateur").insert({
        utilisateur_id,
        institution: nouveau.institution || null,
        intitule_poste: nouveau.intitule_poste || null,
        specialisation: nouveau.specialisation || null,
        annees_experience: nouveau.annees_experience ? Number(nouveau.annees_experience) : null,
        curriculum_vitae: cv,
      });
      if (error) {
        if (cv) await supprimerFichier(cv);
        throw error;
      }
      const { data: role } = await supabase.from("role").select("role_id").eq("code_role", "FORMATEUR").maybeSingle();
      if (role) await supabase.from("role_utilisateur").insert({ utilisateur_id, role_id: role.role_id });
    },
    onSuccess: () => {
      toast.success("Formateur enregistré.");
      setNouveauOuvert(false);
      setNouveau(nouveauVide);
      setCvNouveau(null);
      queryClient.invalidateQueries({ queryKey: ["admin-formateurs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const supprimerFormateur = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from("formateur").delete().eq("formateur_id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Formateur supprimé.");
      setDetail(null);
      queryClient.invalidateQueries({ queryKey: ["admin-formateurs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const enregistrerPaiement = useMutation({
    mutationFn: async () => {
      if (!paiement.montant) throw new Error("Le montant est obligatoire.");
      const valeurs = {
        session_id: paiement.session_id ? Number(paiement.session_id) : null,
        montant: Number(paiement.montant),
        methode: paiement.methode as "Espèces" | "Mobile Money" | "Virement" | "Chèque",
        date_paiement: paiement.date_paiement,
        statut: paiement.statut as "En attente" | "Payé" | "Annulé",
        remarque: paiement.remarque || null,
      };
      const { error } = paiementEdite
        ? await supabase.from("paiement_formateur").update(valeurs).eq("paiement_id", paiementEdite)
        : await supabase.from("paiement_formateur").insert({ ...valeurs, formateur_id: detail!.formateur_id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(paiementEdite ? "Paiement modifié." : "Paiement enregistré.");
      setPaiementOuvert(false);
      setPaiementEdite(null);
      setPaiement(paiementVide);
      queryClient.invalidateQueries({ queryKey: ["formateur-paiements", detail?.formateur_id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const supprimerPaiement = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from("paiement_formateur").delete().eq("paiement_id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Paiement supprimé.");
      queryClient.invalidateQueries({ queryKey: ["formateur-paiements", detail?.formateur_id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const changerStatutPaiement = useMutation({
    mutationFn: async ({ id, statut }: { id: number; statut: string }) => {
      const { error } = await supabase
        .from("paiement_formateur")
        .update({ statut: statut as "En attente" | "Payé" | "Annulé" })
        .eq("paiement_id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["formateur-paiements", detail?.formateur_id] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const affiches = useMemo(
    () =>
      formateurs.filter((f) => {
        const champ = `${f.utilisateur?.prenoms ?? ""} ${f.utilisateur?.nom ?? ""} ${f.utilisateur?.email ?? ""} ${f.specialisation ?? ""}`.toLowerCase();
        return !recherche || champ.includes(recherche.toLowerCase());
      }),
    [formateurs, recherche],
  );

  const realisees = sessions.filter((s) => s.statut === "Terminée");
  const enCours = sessions.filter((s) => s.statut === "En cours");
  const planifiees = sessions.filter((s) => s.statut === "Planifiée");
  const totalPaye = paiements.filter((p) => p.statut === "Payé").reduce((t, p) => t + Number(p.montant), 0);

  function ouvrirProfil(f: Formateur) {
    setProfil({
      institution: f.institution ?? "",
      intitule_poste: f.intitule_poste ?? "",
      specialisation: f.specialisation ?? "",
      annees_experience: f.annees_experience ? String(f.annees_experience) : "",
      curriculum_vitae: f.curriculum_vitae ?? "",
    });
    setCvProfil(null);
    setProfilOuvert(true);
  }

  return (
    <div className="space-y-5">
      <EnteteAdmin
        titre="Gestion des formateurs"
        description="Profils, historique des sessions enseignées et paiements des formateurs."
        action={<Button onClick={() => { setNouveau(nouveauVide); setCvNouveau(null); setNouveauOuvert(true); }}><Plus /> Nouveau formateur</Button>}
      />

      <div className="inline-flex rounded-full border border-border bg-card p-1">
        <span className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground">Formateurs</span>
        <Link to="/paiements-formateurs" className="rounded-full px-4 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground">
          Paiements formateurs
        </Link>
      </div>



      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <CarteStat libelle="Formateurs" valeur={formateurs.length} />
        <CarteStat libelle="Actifs" valeur={formateurs.filter((f) => f.utilisateur?.statut === "Actif").length} />
        <CarteStat libelle="Spécialisations" valeur={new Set(formateurs.map((f) => f.specialisation).filter(Boolean)).size} />
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-4">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Rechercher un formateur" className={`${champClass} pl-9`} />
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <div className="max-h-[520px] overflow-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="sticky top-0 bg-secondary">
              <tr>
                {["Formateur", "Contact", "Institution", "Poste", "Spécialisation", "Expérience", "Statut", "Actions"].map((t) => (
                  <th key={t} className="px-3 py-3 text-xs font-bold text-muted-foreground">{t}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <SqueletteLignesTableau colonnes={8} />
              ) : affiches.length === 0 ? (
                <tr><td colSpan={8} className="px-3 py-10 text-center text-sm text-muted-foreground">Aucun formateur.</td></tr>
              ) : (
                affiches.map((f) => (
                  <tr key={f.formateur_id} onClick={() => { setDetail(f); setOnglet("historique"); }} className="cursor-pointer border-t border-border hover:bg-secondary/50">
                    <td className="px-3 py-3">
                      <p className="font-semibold text-foreground">{f.utilisateur ? `${f.utilisateur.prenoms} ${f.utilisateur.nom}` : "—"}</p>
                      <p className="text-xs text-muted-foreground">{f.utilisateur?.email}</p>
                    </td>
                    <td className="px-3 py-3 text-xs">{f.utilisateur?.telephone ?? "—"}</td>
                    <td className="px-3 py-3 text-xs">{f.institution ?? "—"}</td>
                    <td className="px-3 py-3 text-xs">{f.intitule_poste ?? "—"}</td>
                    <td className="px-3 py-3 text-xs">{f.specialisation ?? "—"}</td>
                    <td className="px-3 py-3 text-xs">{f.annees_experience ? `${f.annees_experience} ans` : "—"}</td>
                    <td className="px-3 py-3"><Etiquette valeur={f.utilisateur?.statut} /></td>
                    <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      <MenuActions>
                        <DropdownMenuItem onClick={() => { setDetail(f); setOnglet("historique"); }}><Eye /> Voir la fiche</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setDetail(f); ouvrirProfil(f); }}><Pencil /> Modifier le profil</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setDetail(f); setOnglet("paiements"); }}><Wallet /> Paiements</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => supprimerFormateur.mutate(f.formateur_id)}
                          className="text-destructive focus:bg-destructive focus:text-destructive-foreground"
                        >
                          <Trash2 /> Supprimer
                        </DropdownMenuItem>
                      </MenuActions>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {detail ? (
        <PanneauDetail
          titre={detail.utilisateur ? `${detail.utilisateur.prenoms} ${detail.utilisateur.nom}` : "Formateur"}
          sousTitre={detail.specialisation ?? detail.intitule_poste ?? undefined}
          onFermer={() => setDetail(null)}
        >
          <SectionPanneau titre="Profil">
            <LigneInfo libelle="Email" valeur={detail.utilisateur?.email} />
            <LigneInfo libelle="Téléphone" valeur={detail.utilisateur?.telephone} />
            <LigneInfo libelle="Adresse" valeur={detail.utilisateur?.adresse} />
            <LigneInfo libelle="Institution" valeur={detail.institution} />
            <LigneInfo libelle="Poste" valeur={detail.intitule_poste} />
            <LigneInfo libelle="Expérience" valeur={detail.annees_experience ? `${detail.annees_experience} ans` : "—"} />
            <LigneInfo
              libelle="CV"
              valeur={detail.curriculum_vitae ? (
                <button
                  type="button"
                  className="text-primary underline"
                  onClick={async () => {
                    const ok = await ouvrirFichier(detail.curriculum_vitae);
                    if (!ok) toast.error("Impossible d’ouvrir ce CV.");
                  }}
                >
                  Ouvrir le PDF
                </button>
              ) : "—"}
            />
          </SectionPanneau>

          <div className="mb-4 flex gap-2">
            {(["historique", "paiements"] as const).map((o) => (
              <button key={o} onClick={() => setOnglet(o)} className={`rounded-full px-3 py-1 text-xs font-semibold ${onglet === o ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                {o === "historique" ? "Historique" : "Paiements"}
              </button>
            ))}
          </div>

          {onglet === "historique" ? (
            <>
              <div className="mb-4 grid grid-cols-3 gap-2 text-center">
                {[["Réalisées", realisees.length], ["En cours", enCours.length], ["Planifiées", planifiees.length]].map(([l, v]) => (
                  <div key={l as string} className="rounded-md bg-secondary p-2">
                    <p className="text-lg font-bold text-foreground">{v}</p>
                    <p className="text-[10px] text-muted-foreground">{l}</p>
                  </div>
                ))}
              </div>
              <SectionPanneau titre={`Sessions et formations (${sessions.length})`}>
                {sessions.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Aucune session enseignée.</p>
                ) : (
                  sessions.map((s) => (
                    <div key={s.session_id} className="rounded-md border border-border p-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-xs font-semibold">{s.formation?.titre ?? "—"}</p>
                        <Etiquette valeur={s.statut} />
                      </div>
                      <p className="text-[11px] text-muted-foreground">{s.nom_session} · {dateFr(s.date_debut)} → {dateFr(s.date_fin)}</p>
                      <p className="text-[11px] text-muted-foreground">{s.lieu ?? "—"} · {s.inscriptions?.length ?? 0} participant(s)</p>
                    </div>
                  ))
                )}
              </SectionPanneau>
            </>
          ) : (
            <>
              <div className="mb-3 rounded-md bg-cream p-3">
                <p className="text-[10px] font-semibold uppercase text-muted-foreground">Total payé</p>
                <p className="text-lg font-bold text-primary">{totalPaye.toLocaleString("fr-FR")}</p>
              </div>
              <SectionPanneau titre={`Paiements (${paiements.length})`}>
                {paiements.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Aucun paiement enregistré.</p>
                ) : (
                  paiements.map((p) => (
                    <div key={p.paiement_id} className="rounded-md border border-border p-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold">{Number(p.montant).toLocaleString("fr-FR")}</p>
                        <Etiquette valeur={p.statut} />
                      </div>
                      <p className="text-[11px] text-muted-foreground">{p.session?.formation?.titre ?? "—"} · {p.session?.nom_session ?? "—"}</p>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] text-muted-foreground">{p.methode} · {dateFr(p.date_paiement)}</p>
                        <MenuActions>
                          <DropdownMenuItem
                            onClick={() => {
                              setPaiementEdite(p.paiement_id);
                              setPaiement({
                                session_id: "",
                                montant: String(p.montant),
                                methode: p.methode,
                                date_paiement: p.date_paiement.slice(0, 10),
                                statut: p.statut,
                                remarque: p.remarque ?? "",
                              });
                              setPaiementOuvert(true);
                            }}
                          >
                            <Pencil /> Modifier le paiement
                          </DropdownMenuItem>
                          {p.statut !== "Payé" ? (
                            <DropdownMenuItem onClick={() => changerStatutPaiement.mutate({ id: p.paiement_id, statut: "Payé" })}>
                              <BadgeCheck /> Marquer comme payé
                            </DropdownMenuItem>
                          ) : null}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => supprimerPaiement.mutate(p.paiement_id)}
                            className="text-destructive focus:bg-destructive focus:text-destructive-foreground"
                          >
                            <Trash2 /> Supprimer
                          </DropdownMenuItem>
                        </MenuActions>
                      </div>
                      {p.remarque ? <p className="text-[11px] italic text-muted-foreground">{p.remarque}</p> : null}
                    </div>
                  ))
                )}
              </SectionPanneau>
              <Button className="mb-2 w-full" onClick={() => { setPaiementEdite(null); setPaiement(paiementVide); setPaiementOuvert(true); }}><Plus /> Enregistrer un paiement</Button>
            </>
          )}

          <Button variant="outline" className="w-full" onClick={() => ouvrirProfil(detail)}><Pencil /> Modifier le profil</Button>
        </PanneauDetail>
      ) : null}

      <Dialog open={profilOuvert} onOpenChange={setProfilOuvert}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Modifier le profil formateur</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className={labelClass}>Institution</label><input className={champClass} value={profil.institution} onChange={(e) => setProfil({ ...profil, institution: e.target.value })} /></div>
            <div><label className={labelClass}>Intitulé du poste</label><input className={champClass} value={profil.intitule_poste} onChange={(e) => setProfil({ ...profil, intitule_poste: e.target.value })} /></div>
            <div><label className={labelClass}>Spécialisation</label><input className={champClass} value={profil.specialisation} onChange={(e) => setProfil({ ...profil, specialisation: e.target.value })} /></div>
            <div><label className={labelClass}>Années d’expérience</label><input type="number" min={0} className={champClass} value={profil.annees_experience} onChange={(e) => setProfil({ ...profil, annees_experience: e.target.value })} /></div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Curriculum vitae (fichier PDF, 10 Mo maximum)</label>
              <input type="file" accept="application/pdf,.pdf" className={champFichierClass} onChange={(e) => setCvProfil(e.target.files?.[0] ?? null)} />
              {cvProfil ? (
                <p className="mt-1 text-[11px] text-muted-foreground">{cvProfil.name} · {tailleLisible(cvProfil.size)}</p>
              ) : profil.curriculum_vitae ? (
                <p className="mt-1 text-[11px] text-muted-foreground">Un CV est déjà enregistré — choisissez un fichier pour le remplacer.</p>
              ) : null}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProfilOuvert(false)}>Annuler</Button>
            <Button onClick={() => enregistrerProfil.mutate()} disabled={enregistrerProfil.isPending}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={paiementOuvert} onOpenChange={(o) => { setPaiementOuvert(o); if (!o) setPaiementEdite(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle><Wallet className="mr-2 inline h-4 w-4" />{paiementEdite ? "Modifier le paiement" : "Nouveau paiement"}</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelClass}>Session</label>
              <select className={`${selectClass} w-full`} value={paiement.session_id} onChange={(e) => setPaiement({ ...paiement, session_id: e.target.value })}>
                <option value="">Sans session</option>
                {sessions.map((s) => <option key={s.session_id} value={s.session_id}>{s.formation?.titre} — {s.nom_session}</option>)}
              </select>
            </div>
            <div><label className={labelClass}>Montant</label><input type="number" min={0} className={champClass} value={paiement.montant} onChange={(e) => setPaiement({ ...paiement, montant: e.target.value })} /></div>
            <div>
              <label className={labelClass}>Méthode</label>
              <select className={`${selectClass} w-full`} value={paiement.methode} onChange={(e) => setPaiement({ ...paiement, methode: e.target.value })}>
                {["Espèces", "Mobile Money", "Virement", "Chèque"].map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div><label className={labelClass}>Date</label><input type="date" className={champClass} value={paiement.date_paiement} onChange={(e) => setPaiement({ ...paiement, date_paiement: e.target.value })} /></div>
            <div>
              <label className={labelClass}>Statut</label>
              <select className={`${selectClass} w-full`} value={paiement.statut} onChange={(e) => setPaiement({ ...paiement, statut: e.target.value })}>
                {["En attente", "Payé", "Annulé"].map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2"><label className={labelClass}>Remarque</label><input className={champClass} value={paiement.remarque} onChange={(e) => setPaiement({ ...paiement, remarque: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaiementOuvert(false)}>Annuler</Button>
            <Button onClick={() => enregistrerPaiement.mutate()} disabled={enregistrerPaiement.isPending}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={nouveauOuvert} onOpenChange={setNouveauOuvert}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nouveau formateur</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelClass}>Compte utilisateur</label>
              <select className={`${selectClass} w-full`} value={nouveau.utilisateur_id} onChange={(e) => setNouveau({ ...nouveau, utilisateur_id: e.target.value })}>
                <option value="">Choisir…</option>
                {comptes
                  .filter((c) => !formateurs.some((f) => f.utilisateur?.email === c.email))
                  .map((c) => <option key={c.utilisateur_id} value={c.utilisateur_id}>{c.prenoms} {c.nom} — {c.email}</option>)}
              </select>
            </div>
            <div><label className={labelClass}>Institution</label><input className={champClass} value={nouveau.institution} onChange={(e) => setNouveau({ ...nouveau, institution: e.target.value })} /></div>
            <div><label className={labelClass}>Intitulé du poste</label><input className={champClass} value={nouveau.intitule_poste} onChange={(e) => setNouveau({ ...nouveau, intitule_poste: e.target.value })} /></div>
            <div><label className={labelClass}>Spécialisation</label><input className={champClass} value={nouveau.specialisation} onChange={(e) => setNouveau({ ...nouveau, specialisation: e.target.value })} /></div>
            <div><label className={labelClass}>Années d’expérience</label><input type="number" min={0} className={champClass} value={nouveau.annees_experience} onChange={(e) => setNouveau({ ...nouveau, annees_experience: e.target.value })} /></div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Curriculum vitae (fichier PDF, 10 Mo maximum)</label>
              <input type="file" accept="application/pdf,.pdf" className={champFichierClass} onChange={(e) => setCvNouveau(e.target.files?.[0] ?? null)} />
              {cvNouveau ? <p className="mt-1 text-[11px] text-muted-foreground">{cvNouveau.name} · {tailleLisible(cvNouveau.size)}</p> : null}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNouveauOuvert(false)}>Annuler</Button>
            <Button onClick={() => creerFormateur.mutate()} disabled={creerFormateur.isPending}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
