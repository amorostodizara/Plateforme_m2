import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, QrCode } from "lucide-react";

type Props = { onCode: (code: string) => void };

// Arrêt tolérant : html5-qrcode lève une erreur si le scanner n'est pas en cours.
async function arreter(scanner: any) {
  try {
    const etat = typeof scanner?.getState === "function" ? scanner.getState() : 2;
    if (etat === 2 || etat === 3) {
      await scanner.stop();
    }
  } catch {
    /* ignoré */
  }
  try {
    scanner?.clear?.();
  } catch {
    /* ignoré */
  }
}


export function ScannerQr({ onCode }: Props) {
  const [actif, setActif] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [saisie, setSaisie] = useState("");
  const instance = useRef<any>(null);
  const dernier = useRef<{ code: string; at: number }>({ code: "", at: 0 });
  const rappel = useRef(onCode);
  rappel.current = onCode;

  useEffect(() => {
    if (!actif) return;
    let annule = false;
    async function demarrer() {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (annule) return;
        const scanner = new Html5Qrcode("zone-scanner-qr");
        instance.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (texte: string) => {
            const now = Date.now();
            if (dernier.current.code === texte && now - dernier.current.at < 3000) return;
            dernier.current = { code: texte, at: now };
            rappel.current(texte.trim());
          },
          () => {},
        );
        if (annule) {
          await arreter(scanner);
          instance.current = null;
          return;
        }
        setErreur(null);
      } catch {
        instance.current = null;
        setErreur("La caméra n’a pas pu être ouverte. Vérifiez l’autorisation d’accès.");
        setActif(false);
      }
    }
    void demarrer();
    return () => {
      annule = true;
      const s = instance.current;
      instance.current = null;
      if (s) void arreter(s);
    };
  }, [actif]);


  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-bold text-foreground">
          <QrCode className="h-4 w-4 text-primary" />
          Scanner de présence
        </p>
        <button
          type="button"
          onClick={() => setActif((v) => !v)}
          className={`flex h-9 items-center gap-2 rounded-md px-3 text-sm font-semibold ${actif ? "border border-input hover:bg-secondary" : "bg-primary text-primary-foreground hover:opacity-90"}`}
        >
          {actif ? <CameraOff className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
          {actif ? "Arrêter la caméra" : "Ouvrir la caméra"}
        </button>
      </div>

      <div
        id="zone-scanner-qr"
        className={`mt-3 overflow-hidden rounded-md bg-secondary ${actif ? "min-h-56" : "hidden"}`}
      />
      {!actif ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Ouvrez la caméra et présentez le QR code du participant pour enregistrer sa présence.
        </p>
      ) : null}
      {erreur ? <p className="mt-2 text-xs font-semibold text-destructive">{erreur}</p> : null}

      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!saisie.trim()) return;
          onCode(saisie.trim());
          setSaisie("");
        }}
      >
        <input
          value={saisie}
          onChange={(e) => setSaisie(e.target.value)}
          placeholder="Ou saisir le code du badge"
          className="h-9 flex-1 rounded-md border border-input bg-card px-3 text-sm focus:border-primary focus:outline-none"
        />
        <button type="submit" className="h-9 rounded-md border border-input px-3 text-sm font-semibold hover:bg-secondary">
          Valider
        </button>
      </form>
    </div>
  );
}
