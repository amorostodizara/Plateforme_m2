import { imageFormation } from "@/lib/images-formation";
import { estCheminStockage, useUrlFichier } from "@/lib/fichiers";

type Props = {
  categorie?: string | null;
  urlImage?: string | null;
  alt: string;
  className?: string;
};

/** Affiche l’image d’une formation : fichier téléversé, lien externe ou visuel par défaut. */
export function ImageFormation({ categorie, urlImage, alt, className }: Props) {
  const stockee = estCheminStockage(urlImage);
  const { data: url } = useUrlFichier(stockee ? urlImage : null);
  const source = stockee ? (url ?? imageFormation(categorie, null)) : imageFormation(categorie, urlImage);
  return <img src={source} alt={alt} loading="lazy" className={className} />;
}
