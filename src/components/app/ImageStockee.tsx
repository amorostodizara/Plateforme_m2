import { useUrlFichier } from "@/lib/fichiers";

/** Affiche une image stockée (chemin interne résolu en lien temporaire, ou lien externe). */
export function ImageStockee({ src, alt = "", className }: { src: string | null | undefined; alt?: string; className?: string }) {
  const { data } = useUrlFichier(src);
  if (!data) return <span className={`${className ?? ""} block animate-pulse bg-cream`} />;
  return <img src={data} alt={alt} className={className} />;
}
