import { jsPDF } from "jspdf";

export type DonneesDeclaration = {
  nom: string;
  prenoms: string;
  service: string;
  montant: number;
  dateDebut?: string | null;
  dateFin?: string | null;
  motif: string;
  validateur?: { nom: string; prenoms: string; fonction: string } | null;
  datePaiement: string;
};

const moisFr = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const dateLongue = (d: Date) => `${String(d.getDate()).padStart(2, "0")} ${moisFr[d.getMonth()]} ${d.getFullYear()}`;

function periode(debut?: string | null, fin?: string | null) {
  if (!debut) return "—";
  const a = new Date(debut);
  if (!fin) return dateLongue(a);
  const b = new Date(fin);
  if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear())
    return `${String(a.getDate()).padStart(2, "0")} au ${dateLongue(b)}`;
  return `${dateLongue(a)} au ${dateLongue(b)}`;
}

/** Déclaration sur l'honneur (A4 portrait) pour un paiement formateur. */
export function telechargerDeclarationPdf(d: DonneesDeclaration) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  // Logo orange
  doc.setFillColor(255, 121, 0);
  doc.rect(22, 15, 26, 26, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("orange", 24, 38);

  doc.setTextColor(0, 0, 0);
  doc.setFont("times", "bold");
  doc.setFontSize(16);
  const titre = "DECLARATION SUR L\u2019HONNEUR";
  doc.text(titre, 105, 62, { align: "center" });
  const w = doc.getTextWidth(titre);
  doc.setLineWidth(0.5);
  doc.line(105 - w / 2, 63.5, 105 + w / 2, 63.5);

  doc.setFont("times", "normal");
  doc.setFontSize(12);
  let y = 80;
  const ligne = (t: string, x = 22, pas = 6) => { doc.text(t, x, y); y += pas; };
  ligne("Je soussigné(e),", 22, 9);
  ligne(`Nom : ${d.nom}`, 23);
  ligne(`Prénom : ${d.prenoms}`, 23);
  ligne(`Direction/Service : ${d.service || "—"}`, 23, 13);
  ligne(`Déclare sur l\u2019honneur avoir dépensé la somme de : ${Number(d.montant).toLocaleString("fr-FR").replace(/\u202f/g, " ")} Ariary`, 23, 16);
  ligne(`A la date du : ${periode(d.dateDebut, d.dateFin)}`, 24);
  ligne(`Ayant pour motif : ${d.motif}`, 24, 9);
  ligne("Pour lequel je n\u2019ai pas obtenu de justificatif.", 24, 9);
  ligne("Je confirme que cette dépense a été engagée dans l\u2019intérêt de Orange Madagascar.", 24, 20);
  ligne("Signature du demandeur :", 25, 22);

  doc.text("Validation hiérarchique :", 26, y);
  doc.line(26, y + 1, 26 + doc.getTextWidth("Validation hiérarchique :"), y + 1);
  y += 9;
  ligne(`Nom : ${d.validateur?.nom ?? ""}`, 26);
  ligne(`Prénom : ${d.validateur?.prenoms ?? ""}`, 26);
  ligne(`Fonction : ${d.validateur?.fonction ?? ""}`, 26);
  ligne(`Date : ${dateLongue(new Date(d.datePaiement))}`, 26, 10);
  ligne("Signature :", 26);

  doc.setFont("times", "bold");
  doc.setFontSize(11);
  doc.text("Orange Madagascar -Direction Financière -BP 7754 \u2013 101 Antananarivo", 105, 282, { align: "center" });

  doc.save(`declaration-paiement-${d.nom}-${d.datePaiement}.pdf`.replace(/\s+/g, "_"));
}
