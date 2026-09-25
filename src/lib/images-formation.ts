import dev from "@/assets/formation-dev.jpg";
import cyber from "@/assets/formation-cyber.jpg";
import bureautique from "@/assets/formation-bureautique.jpg";
import contenu from "@/assets/formation-contenu.jpg";
import leadership from "@/assets/formation-leadership.jpg";
import data from "@/assets/formation-data.jpg";

const parCategorie: Record<string, string> = {
  Développement: dev,
  Cybersécurité: cyber,
  Bureautique: bureautique,
  "Création de contenu": contenu,
  "Développement personnel": leadership,
  "Data & IA": data,
};

export function imageFormation(categorie?: string | null, urlImage?: string | null): string {
  if (urlImage) return urlImage;
  if (categorie && parCategorie[categorie]) return parCategorie[categorie] as string;
  return dev;
}

export const COULEURS = [
  "#FF7900",
  "#000000",
  "#5F6368",
  "#F2A65A",
  "#2C7BE5",
  "#00A36C",
  "#B3B7BB",
];
