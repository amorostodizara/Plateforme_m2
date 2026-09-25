import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Download, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/** Badge QR d’un participant : le code scanné à l’entrée d’une session. */
export function BadgeQr({
  ouvert,
  onOuvertChange,
  jeton,
  nom,
  sousTitre,
}: {
  ouvert: boolean;
  onOuvertChange: (v: boolean) => void;
  jeton: string | null;
  nom: string;
  sousTitre?: string;
}) {
  const [image, setImage] = useState<string | null>(null);

  useEffect(() => {
    let annule = false;
    if (!ouvert || !jeton) {
      setImage(null);
      return;
    }
    QRCode.toDataURL(jeton, { width: 320, margin: 1, color: { dark: "#000000", light: "#FFFFFF" } })
      .then((url) => { if (!annule) setImage(url); })
      .catch(() => { if (!annule) setImage(null); });
    return () => { annule = true; };
  }, [ouvert, jeton]);

  return (
    <Dialog open={ouvert} onOpenChange={onOuvertChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle><QrCode className="mr-2 inline h-4 w-4" />Badge de présence</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-cream p-5">
          {image ? (
            <img src={image} alt={`Badge QR de ${nom}`} className="h-56 w-56 rounded-md bg-white p-2" />
          ) : (
            <div className="flex h-56 w-56 items-center justify-center rounded-md bg-white text-xs text-muted-foreground">
              {jeton ? "Génération…" : "Aucun badge disponible"}
            </div>
          )}
          <p className="text-sm font-bold text-foreground">{nom}</p>
          {sousTitre ? <p className="text-xs text-muted-foreground">{sousTitre}</p> : null}
          <p className="break-all text-center text-[10px] text-muted-foreground">{jeton ?? "—"}</p>
        </div>
        {image ? (
          <Button asChild variant="outline">
            <a href={image} download={`badge-${nom.replace(/\s+/g, "-").toLowerCase()}.png`}>
              <Download /> Télécharger le badge
            </a>
          </Button>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
