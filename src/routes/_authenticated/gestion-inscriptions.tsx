// import { useMemo, useState } from "react";
// import { emailInscriptionAcceptee } from "@/backend/functions/email-auth.functions";
// import { createFileRoute } from "@tanstack/react-router";
// import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
// import { BadgeCheck, Ban, Clock, Plus, Search, Trash2, UserPlus } from "lucide-react";
// import { toast } from "sonner";
// import { supabase } from "@/integrations/supabase/client";
// import { Button } from "@/components/ui/button";
// import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
// import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
// import { SqueletteLignesTableau } from "@/components/app/Squelette";
// import { AccesReserve } from "@/components/app/Acces";
// import {
//   CarteStat, EnteteAdmin, Etiquette, LigneInfo, MenuActions, PanneauDetail, SectionPanneau,
//   champClass, dateFr,dateHeureFr, labelClass, selectClass,
// } from "@/components/app/AdminKit";

// export const Route = createFileRoute("/_authenticated/gestion-inscriptions")({
//   head: () => ({
//     meta: [
//       { title: "Inscriptions et comptes — Orange Digital Center" },
//       { name: "description", content: "Inscrivez un participant à une session avec son rôle, son profil et son statut." },
//       { property: "og:title", content: "Inscriptions et comptes — Orange Digital Center" },
//       { property: "og:description", content: "Inscrivez un participant à une session avec son rôle, son profil et son statut." },
//       { property: "og:type", content: "website" },
//       { name: "twitter:card", content: "summary" },
//     ],
//   }),
//   component: () => (
//     <AccesReserve roles={["ADMINISTRATEUR", "RESPONSABLE"]}>
//       <Page />
//     </AccesReserve>
//   ),
// });

// type StatutInscription = "En attente" | "Acceptée" | "Refusée" | "Liste d'attente" | "Annulée";
// type CodeRole = "PARTICIPANT" | "FORMATEUR" | "RESPONSABLE" | "ADMINISTRATEUR";

// type Inscription = {
//   inscription_id: number;
//   date_inscription: string;
//   statut: StatutInscription;
//   motivation: string | null;
//   engagement: boolean | null;
//   session: { session_id: number; nom_session: string; date_debut: string; date_fin: string; lieu: string | null; formation: { titre: string } | null } | null;
//   participant: {
//     participant_id: number;
//     date_naissance: string | null;
//     utilisateur: { utilisateur_id: number; nom: string; prenoms: string; email: string; telephone: string | null; statut: string } | null;
//     profil_professionnel: { statut_actuel: string | null; institution: string | null; specialisation: string | null; mention: string | null; niveau_education: string | null }[] | null;
//   } | null;
// };

// const STATUTS: StatutInscription[] = ["En attente", "Acceptée", "Refusée", "Liste d'attente", "Annulée"];
// const ROLES: CodeRole[] = ["PARTICIPANT", "FORMATEUR", "RESPONSABLE", "ADMINISTRATEUR"];
// const STATUTS_ACTUELS = ["Étudiant", "Employé", "Fonctionnaire", "Chômeur", "Indépendant", "Entrepreneur", "Autre"];
// const NIVEAUX = ["BEPC", "BAC", "L1", "L2", "L3", "M1", "M2", "Doctorat", "Autre"];

// const formVide = {
//   utilisateur_id: "",
//   statut_compte: "Actif",
//   roles: ["PARTICIPANT"] as CodeRole[],
//   telephone: "",
//   adresse: "",
//   genre: "",
//   date_naissance: "",
//   statut_actuel: "",
//   institution: "",
//   specialisation: "",
//   mention: "",
//   niveau_education: "",
//   session_id: "",
//   statut_inscription: "Acceptée" as StatutInscription,
//   motivation: "",
//   engagement: true,
// };

// function Page() {
//   const queryClient = useQueryClient();
//   const [recherche, setRecherche] = useState("");
//   const [filtreStatut, setFiltreStatut] = useState("Tous");
//   const [detail, setDetail] = useState<Inscription | null>(null);
//   const [ouvert, setOuvert] = useState(false);
//   const [form, setForm] = useState(formVide);

//   const { data: inscriptions = [], isLoading } = useQuery({
//     queryKey: ["gestion-inscriptions"],
//     queryFn: async () => {
//       const { data, error } = await supabase
//         .from("inscription")
//         .select(
//           "inscription_id, date_inscription, statut, motivation, engagement, session:session_formation(session_id, nom_session, date_debut, date_fin, lieu, formation:formation(titre)), participant:participant(participant_id, date_naissance, utilisateur:utilisateur(utilisateur_id, nom, prenoms, email, telephone, statut), profil_professionnel:profil_professionnel(statut_actuel, institution, specialisation, mention, niveau_education))",
//         )
//         .order("date_inscription", { ascending: false });
//       if (error) throw error;
//       return (data ?? []) as unknown as Inscription[];
//     },
//   });

//   const { data: comptes = [] } = useQuery({
//     queryKey: ["comptes-inscription"],
//     queryFn: async () => {
//       const { data, error } = await supabase
//         .from("utilisateur")
//         .select("utilisateur_id, nom, prenoms, email, telephone, adresse, genre, statut")
//         .order("nom");
//       if (error) throw error;
//       return (data ?? []) as {
//         utilisateur_id: number; nom: string; prenoms: string; email: string;
//         telephone: string | null; adresse: string | null; genre: string | null; statut: string;
//       }[];
//     },
//   });

//   const { data: sessions = [] } = useQuery({
//     queryKey: ["sessions-inscription"],
//     queryFn: async () => {
//       const { data, error } = await supabase
//         .from("session_formation")
//         .select("session_id, nom_session, capacite, formation:formation(titre)")
//         .order("date_debut", { ascending: false });
//       if (error) throw error;
//       return (data ?? []) as unknown as { session_id: number; nom_session: string; capacite: number | null; formation: { titre: string } | null }[];
//     },
//   });

//   const enregistrer = useMutation({
//     mutationFn: async () => {
//       if (!form.utilisateur_id) throw new Error("Choisissez le compte utilisateur à inscrire.");
//       if (!form.session_id) throw new Error("Choisissez la session de formation.");
//       const utilisateur_id = Number(form.utilisateur_id);
//       const session_id = Number(form.session_id);

//       const { error: eUser } = await supabase
//         .from("utilisateur")
//         .update({
//           telephone: form.telephone || null,
//           adresse: form.adresse || null,
//           genre: (form.genre || null) as "Homme" | "Femme" | null,
//           statut: form.statut_compte as "Actif" | "Inactif",
//         })
//         .eq("utilisateur_id", utilisateur_id);
//       if (eUser) throw eUser;

//       // Rôles demandés
//       const { data: rolesBase } = await supabase.from("role").select("role_id, code_role");
//       const { data: rolesActuels } = await supabase
//         .from("role_utilisateur").select("role_id").eq("utilisateur_id", utilisateur_id);
//       const dejaLa = new Set((rolesActuels ?? []).map((r) => r.role_id));
//       const aAjouter = (rolesBase ?? [])
//         .filter((r) => form.roles.includes(r.code_role as CodeRole) && !dejaLa.has(r.role_id))
//         .map((r) => ({ utilisateur_id, role_id: r.role_id }));
//       if (aAjouter.length) {
//         const { error } = await supabase.from("role_utilisateur").insert(aAjouter);
//         if (error) throw error;
//       }

//       // Profil participant
//       let participant_id: number;
//       const { data: pExistant } = await supabase
//         .from("participant").select("participant_id").eq("utilisateur_id", utilisateur_id).maybeSingle();
//       if (pExistant) {
//         participant_id = pExistant.participant_id;
//         const { error } = await supabase
//           .from("participant")
//           .update({ date_naissance: form.date_naissance || null })
//           .eq("participant_id", participant_id);
//         if (error) throw error;
//       } else {
//         const { data, error } = await supabase
//           .from("participant")
//           .insert({ utilisateur_id, date_naissance: form.date_naissance || null })
//           .select("participant_id")
//           .single();
//         if (error) throw error;
//         participant_id = data.participant_id;
//       }

//       const valeursProfil = {
//         participant_id,
//         statut_actuel: (form.statut_actuel || null) as never,
//         institution: form.institution || null,
//         specialisation: form.specialisation || null,
//         mention: form.mention || null,
//         niveau_education: (form.niveau_education || null) as never,
//       };
//       const { data: profilExistant } = await supabase
//         .from("profil_professionnel").select("profil_id").eq("participant_id", participant_id).maybeSingle();
//       const { error: eProfil } = profilExistant
//         ? await supabase.from("profil_professionnel").update(valeursProfil).eq("participant_id", participant_id)
//         : await supabase.from("profil_professionnel").insert(valeursProfil);
//       if (eProfil) throw eProfil;

//       // Inscription à la session
//       const { data: dejaInscrit } = await supabase
//         .from("inscription").select("inscription_id")
//         .eq("participant_id", participant_id).eq("session_id", session_id).maybeSingle();
//       if (dejaInscrit) {
//         const { error } = await supabase
//           .from("inscription")
//           .update({ statut: form.statut_inscription, motivation: form.motivation || null, engagement: form.engagement })
//           .eq("inscription_id", dejaInscrit.inscription_id);
//         if (error) throw error;
//       } else {
//         const { error } = await supabase.from("inscription").insert({
//           participant_id,
//           session_id,
//           statut: form.statut_inscription,
//           motivation: form.motivation || null,
//           engagement: form.engagement,
//         });
//         if (error) throw error;
//       }
//     },
//     onSuccess: () => {
//       toast.success("Inscription enregistrée avec le rôle, le profil et le statut.");
//       setOuvert(false);
//       setForm(formVide);
//       queryClient.invalidateQueries({ queryKey: ["gestion-inscriptions"] });
//       queryClient.invalidateQueries({ queryKey: ["admin-participants"] });
//       queryClient.invalidateQueries({ queryKey: ["inscriptions"] });
//     },
//     onError: (e: Error) => toast.error(e.message),
//   });

//   const changerStatut = useMutation({
//     mutationFn: async ({ id, statut }: { id: number; statut: StatutInscription }) => {
//       const { error } = await supabase.from("inscription").update({ statut }).eq("inscription_id", id);
//       if (error) throw error;
//       if (statut === "Acceptée") {
//         const r = await emailInscriptionAcceptee({ data: { inscriptionId: id } }).catch(() => ({ ok: false }));
//         return r.ok ? "E-mail de confirmation envoyé au participant." : "Statut mis à jour, mais l’e-mail n’a pas pu être envoyé.";
//       }
//       return undefined;
//     },
//     onSuccess: (msg) => {
//       toast.success(msg ?? "Statut de l’inscription mis à jour.");
//       queryClient.invalidateQueries({ queryKey: ["gestion-inscriptions"] });
//     },
//     onError: (e: Error) => toast.error(e.message),
//   });

//   const supprimer = useMutation({
//     mutationFn: async (id: number) => {
//       const { error } = await supabase.from("inscription").delete().eq("inscription_id", id);
//       if (error) throw error;
//     },
//     onSuccess: () => {
//       toast.success("Inscription supprimée.");
//       setDetail(null);
//       queryClient.invalidateQueries({ queryKey: ["gestion-inscriptions"] });
//     },
//     onError: (e: Error) => toast.error(e.message),
//   });

//   const affichees = useMemo(
//     () =>
//       inscriptions.filter((i) => {
//         const u = i.participant?.utilisateur;
//         const champ = `${u?.prenoms ?? ""} ${u?.nom ?? ""} ${u?.email ?? ""} ${i.session?.formation?.titre ?? ""}`.toLowerCase();
//         if (recherche && !champ.includes(recherche.toLowerCase())) return false;
//         if (filtreStatut !== "Tous" && i.statut !== filtreStatut) return false;
//         return true;
//       }),
//     [inscriptions, recherche, filtreStatut],
//   );

//   function choisirCompte(id: string) {
//     const compte = comptes.find((c) => String(c.utilisateur_id) === id);
//     setForm((f) => ({
//       ...f,
//       utilisateur_id: id,
//       telephone: compte?.telephone ?? "",
//       adresse: compte?.adresse ?? "",
//       genre: compte?.genre ?? "",
//       statut_compte: compte?.statut ?? "Actif",
//     }));
//   }

//   function basculerRole(role: CodeRole) {
//     setForm((f) => ({
//       ...f,
//       roles: f.roles.includes(role) ? f.roles.filter((r) => r !== role) : [...f.roles, role],
//     }));
//   }

//   return (
//     <div className="space-y-5">
//       <EnteteAdmin
//         titre="Inscriptions & comptes"
//         description="Inscrivez un participant à une session en définissant son rôle, son profil et son statut."
//         action={<Button onClick={() => { setForm(formVide); setOuvert(true); }}><Plus /> Nouvelle inscription</Button>}
//       />

//       <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
//         <CarteStat libelle="Inscriptions" valeur={inscriptions.length} />
//         <CarteStat libelle="Acceptées" valeur={inscriptions.filter((i) => i.statut === "Acceptée").length} />
//         <CarteStat libelle="En attente" valeur={inscriptions.filter((i) => i.statut === "En attente").length} />
//         <CarteStat libelle="Liste d’attente" valeur={inscriptions.filter((i) => i.statut === "Liste d'attente").length} />
//       </div>

//       <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4">
//         <div className="relative min-w-56 flex-1">
//           <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
//           <input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Rechercher un participant ou une formation" className={`${champClass} pl-9`} />
//         </div>
//         <div>
//           <label className={labelClass}>Statut</label>
//           <select className={selectClass} value={filtreStatut} onChange={(e) => setFiltreStatut(e.target.value)}>
//             <option>Tous</option>
//             {STATUTS.map((s) => <option key={s}>{s}</option>)}
//           </select>
//         </div>
//       </div>

//       <div className="rounded-lg border border-border bg-card">
//         <div className="max-h-[540px] overflow-auto">
//           <table className="w-full min-w-[900px] text-left text-sm">
//             <thead className="sticky top-0 bg-secondary">
//               <tr>
//                 {["Participant", "Formation / Session", "Profil", "Date", "Compte", "Statut", "Actions"].map((t) => (
//                   <th key={t} className="px-3 py-3 text-xs font-bold text-muted-foreground">{t}</th>
//                 ))}
//               </tr>
//             </thead>
//             <tbody>
//               {isLoading ? (
//                 <SqueletteLignesTableau colonnes={7} />
//               ) : affichees.length === 0 ? (
//                 <tr><td colSpan={7} className="px-3 py-10 text-center text-sm text-muted-foreground">Aucune inscription.</td></tr>
//               ) : (
//                 affichees.map((i) => {
//                   const u = i.participant?.utilisateur;
//                   const pro = i.participant?.profil_professionnel?.[0];
//                   return (
//                     <tr key={i.inscription_id} onClick={() => setDetail(i)} className="cursor-pointer border-t border-border hover:bg-secondary/50">
//                       <td className="px-3 py-3">
//                         <p className="font-semibold text-foreground">{u ? `${u.prenoms} ${u.nom}` : "—"}</p>
//                         <p className="text-xs text-muted-foreground">{u?.email}</p>
//                       </td>
//                       <td className="px-3 py-3 text-xs">
//                         <p className="font-medium text-foreground">{i.session?.formation?.titre ?? "—"}</p>
//                         <p className="text-muted-foreground">{i.session?.nom_session ?? "—"}</p>
//                       </td>
//                       <td className="px-3 py-3 text-xs">{pro?.statut_actuel ?? "—"}</td>
//                       <td className="px-3 py-3 text-xs">{dateHeureFr(i.date_inscription)}</td>
//                       <td className="px-3 py-3"><Etiquette valeur={u?.statut} /></td>
//                       <td className="px-3 py-3"><Etiquette valeur={i.statut} /></td>
//                       <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
//                         <MenuActions>
//                           <DropdownMenuItem onClick={() => changerStatut.mutate({ id: i.inscription_id, statut: "Acceptée" })}><BadgeCheck /> Accepter</DropdownMenuItem>
//                           <DropdownMenuItem onClick={() => changerStatut.mutate({ id: i.inscription_id, statut: "Liste d'attente" })}><Clock /> Liste d’attente</DropdownMenuItem>
//                           <DropdownMenuItem onClick={() => changerStatut.mutate({ id: i.inscription_id, statut: "Refusée" })}><Ban /> Refuser</DropdownMenuItem>
//                           <DropdownMenuItem onClick={() => changerStatut.mutate({ id: i.inscription_id, statut: "Annulée" })}><Ban /> Annuler</DropdownMenuItem>
//                           <DropdownMenuSeparator />
//                           <DropdownMenuItem
//                             onClick={() => supprimer.mutate(i.inscription_id)}
//                             className="text-destructive focus:bg-destructive focus:text-destructive-foreground"
//                           >
//                             <Trash2 /> Supprimer
//                           </DropdownMenuItem>
//                         </MenuActions>
//                       </td>
//                     </tr>
//                   );
//                 })
//               )}
//             </tbody>
//           </table>
//         </div>
//       </div>

//       {detail ? (
//         <PanneauDetail
//           titre={detail.participant?.utilisateur ? `${detail.participant.utilisateur.prenoms} ${detail.participant.utilisateur.nom}` : "Inscription"}
//           sousTitre={detail.session?.formation?.titre ?? undefined}
//           onFermer={() => setDetail(null)}
//         >
//           <SectionPanneau titre="Inscription">
//             <LigneInfo libelle="Statut" valeur={<Etiquette valeur={detail.statut} />} />
//             <LigneInfo libelle="Date" valeur={dateFr(detail.date_inscription)} />
//             <LigneInfo libelle="Engagement" valeur={detail.engagement ? "Oui" : "Non"} />
//             <LigneInfo libelle="Motivation" valeur={detail.motivation} />
//           </SectionPanneau>
//           <SectionPanneau titre="Session">
//             <LigneInfo libelle="Session" valeur={detail.session?.nom_session} />
//             <LigneInfo libelle="Lieu" valeur={detail.session?.lieu} />
//             <LigneInfo libelle="Début" valeur={detail.session ? dateFr(detail.session.date_debut) : "—"} />
//             <LigneInfo libelle="Fin" valeur={detail.session ? dateFr(detail.session.date_fin) : "—"} />
//           </SectionPanneau>
//           <SectionPanneau titre="Profil du participant">
//             <LigneInfo libelle="Email" valeur={detail.participant?.utilisateur?.email} />
//             <LigneInfo libelle="Téléphone" valeur={detail.participant?.utilisateur?.telephone} />
//             <LigneInfo libelle="Situation" valeur={detail.participant?.profil_professionnel?.[0]?.statut_actuel} />
//             <LigneInfo libelle="Établissement" valeur={detail.participant?.profil_professionnel?.[0]?.institution} />
//             <LigneInfo libelle="Niveau" valeur={detail.participant?.profil_professionnel?.[0]?.niveau_education} />
//             <LigneInfo libelle="Compte" valeur={<Etiquette valeur={detail.participant?.utilisateur?.statut} />} />
//           </SectionPanneau>
//         </PanneauDetail>
//       ) : null}

//       <Dialog open={ouvert} onOpenChange={setOuvert}>
//         <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
//           <DialogHeader>
//             <DialogTitle><UserPlus className="mr-2 inline h-4 w-4" />Nouvelle inscription</DialogTitle>
//           </DialogHeader>

//           <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Compte et rôle</p>
//           <div className="grid gap-3 sm:grid-cols-2">
//             <div className="sm:col-span-2">
//               <label className={labelClass}>Compte utilisateur</label>
//               <select className={`${selectClass} w-full`} value={form.utilisateur_id} onChange={(e) => choisirCompte(e.target.value)}>
//                 <option value="">Choisir…</option>
//                 {comptes.map((c) => <option key={c.utilisateur_id} value={c.utilisateur_id}>{c.prenoms} {c.nom} — {c.email}</option>)}
//               </select>
//             </div>
//             <div className="sm:col-span-2">
//               <label className={labelClass}>Rôles attribués</label>
//               <div className="flex flex-wrap gap-3">
//                 {ROLES.map((r) => (
//                   <label key={r} className="flex items-center gap-2 rounded-md border border-input px-3 py-2 text-xs font-medium">
//                     <input type="checkbox" className="accent-[#FF7900]" checked={form.roles.includes(r)} onChange={() => basculerRole(r)} />
//                     {r.charAt(0) + r.slice(1).toLowerCase()}
//                   </label>
//                 ))}
//               </div>
//             </div>
//             <div>
//               <label className={labelClass}>Statut du compte</label>
//               <select className={`${selectClass} w-full`} value={form.statut_compte} onChange={(e) => setForm({ ...form, statut_compte: e.target.value })}>
//                 <option>Actif</option><option>Inactif</option>
//               </select>
//             </div>
//             <div>
//               <label className={labelClass}>Genre</label>
//               <select className={`${selectClass} w-full`} value={form.genre} onChange={(e) => setForm({ ...form, genre: e.target.value })}>
//                 <option value="">—</option><option>Homme</option><option>Femme</option>
//               </select>
//             </div>
//             <div><label className={labelClass}>Téléphone</label><input className={champClass} value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} /></div>
//             <div><label className={labelClass}>Adresse</label><input className={champClass} value={form.adresse} onChange={(e) => setForm({ ...form, adresse: e.target.value })} /></div>
//           </div>

//           <p className="mt-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Profil professionnel</p>
//           <div className="grid gap-3 sm:grid-cols-2">
//             <div><label className={labelClass}>Date de naissance</label><input type="date" className={champClass} value={form.date_naissance} onChange={(e) => setForm({ ...form, date_naissance: e.target.value })} /></div>
//             <div>
//               <label className={labelClass}>Situation actuelle</label>
//               <select className={`${selectClass} w-full`} value={form.statut_actuel} onChange={(e) => setForm({ ...form, statut_actuel: e.target.value })}>
//                 <option value="">—</option>
//                 {STATUTS_ACTUELS.map((s) => <option key={s}>{s}</option>)}
//               </select>
//             </div>
//             <div><label className={labelClass}>Établissement / Entreprise</label><input className={champClass} value={form.institution} onChange={(e) => setForm({ ...form, institution: e.target.value })} /></div>
//             <div><label className={labelClass}>Spécialisation</label><input className={champClass} value={form.specialisation} onChange={(e) => setForm({ ...form, specialisation: e.target.value })} /></div>
//             <div><label className={labelClass}>Mention</label><input className={champClass} value={form.mention} onChange={(e) => setForm({ ...form, mention: e.target.value })} /></div>
//             <div>
//               <label className={labelClass}>Niveau d’étude</label>
//               <select className={`${selectClass} w-full`} value={form.niveau_education} onChange={(e) => setForm({ ...form, niveau_education: e.target.value })}>
//                 <option value="">—</option>
//                 {NIVEAUX.map((n) => <option key={n}>{n}</option>)}
//               </select>
//             </div>
//           </div>

//           <p className="mt-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Inscription à la session</p>
//           <div className="grid gap-3 sm:grid-cols-2">
//             <div className="sm:col-span-2">
//               <label className={labelClass}>Session de formation</label>
//               <select className={`${selectClass} w-full`} value={form.session_id} onChange={(e) => setForm({ ...form, session_id: e.target.value })}>
//                 <option value="">Choisir…</option>
//                 {sessions.map((s) => <option key={s.session_id} value={s.session_id}>{s.formation?.titre} — {s.nom_session}</option>)}
//               </select>
//             </div>
//             <div>
//               <label className={labelClass}>Statut de l’inscription</label>
//               <select className={`${selectClass} w-full`} value={form.statut_inscription} onChange={(e) => setForm({ ...form, statut_inscription: e.target.value as StatutInscription })}>
//                 {STATUTS.map((s) => <option key={s}>{s}</option>)}
//               </select>
//             </div>
//             <div className="flex items-end">
//               <label className="flex items-center gap-2 text-xs font-medium">
//                 <input type="checkbox" className="accent-[#FF7900]" checked={form.engagement} onChange={(e) => setForm({ ...form, engagement: e.target.checked })} />
//                 Engagement à suivre la formation
//               </label>
//             </div>
//             <div className="sm:col-span-2">
//               <label className={labelClass}>Motivation</label>
//               <textarea rows={3} className="w-full rounded-md border border-input bg-card p-2 text-sm focus:border-primary focus:outline-none" value={form.motivation} onChange={(e) => setForm({ ...form, motivation: e.target.value })} />
//             </div>
//           </div>

//           <DialogFooter>
//             <Button variant="outline" onClick={() => setOuvert(false)}>Annuler</Button>
//             <Button onClick={() => enregistrer.mutate()} disabled={enregistrer.isPending}>Enregistrer l’inscription</Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>
//     </div>
//   );
// }
