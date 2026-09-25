import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { BoutonPrincipal } from "@/components/auth/Field";
import { verifierCode, renvoyerCode } from "@/backend/functions/email-auth.functions";

export const Route = createFileRoute("/auth/verification")({
  validateSearch: (search: Record<string, unknown>) => ({
    email: typeof search['email'] === "string" ? search['email'] : "",
  }),
  head: () => ({
    meta: [
      { title: "Vérifier votre email — Plateforme de formation" },
      {
        name: "description",
        content: "Saisissez le code à 6 chiffres reçu par e-mail pour activer votre compte.",
      },
      { property: "og:title", content: "Vérifier votre email — Plateforme de formation" },
      { property: "og:description", content: "Validation de votre adresse e-mail." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Verification,
});

function Verification() {
  const { email } = Route.useSearch();
  const navigate = useNavigate();
  const [chiffres, setChiffres] = useState<string[]>(Array(6).fill(""));
  const [erreur, setErreur] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);
  const [succes, setSucces] = useState(false);
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (!succes) return;
    const t = setTimeout(() => navigate({ to: "/tableau-de-bord" }), 2000);
    return () => clearTimeout(t);
  }, [succes, navigate]);

  function saisir(index: number, valeur: string) {
    const v = valeur.replace(/\D/g, "").slice(-1);
    setChiffres((prev) => {
      const suivant = [...prev];
      suivant[index] = v;
      return suivant;
    });
    if (v && index < 5) refs.current[index + 1]?.focus();
  }

  async function verifier(ev: React.FormEvent) {
    ev.preventDefault();
    setErreur(null);
    const code = chiffres.join("");
    if (code.length !== 6) {
      setErreur("Veuillez saisir les 6 chiffres du code.");
      return;
    }
    setChargement(true);
    const r = await verifierCode({ data: { email, code } }).catch(() => ({ ok: false }));
    const error = !r.ok;
    setChargement(false);
    if (error) {
      setErreur("Code invalide ou expiré. Demandez un nouveau code.");
      return;
    }
    setSucces(true);
  }

  async function renvoyer() {
    setErreur(null);
    setInfo(null);
    const r = await renvoyerCode({ data: { email } }).catch(() => ({ ok: false }));
    const error = !r.ok;
    if (error) setErreur("Impossible de renvoyer le code pour le moment.");
    else setInfo("Un nouveau code vient d'être envoyé.");
  }

  if (succes) {
    return (
      <AuthShell titre="Vérification succès" sousTitre="Nous vous autorisons à entrer" />
    );
  }

  return (
    <AuthShell
      titre="Vérifier votre email"
      sousTitre={`Nous avons envoyé un code à 6 chiffres à l'adresse ${email}. Cette session d'inscription expirera dans 30 minutes.`}
    >
      <form onSubmit={verifier} className="space-y-5">
        <div className="space-y-2">
          <p
            className="text-sm font-semibold tracking-wide text-foreground"
            style={erreur ? { color: "var(--color-destructive)" } : undefined}
          >
            Enter Code
          </p>
          <div className="flex justify-between gap-2">
            {chiffres.map((chiffre, i) => (
              <input
                key={i}
                ref={(el) => {
                  refs.current[i] = el;
                }}
                inputMode="numeric"
                value={chiffre}
                onChange={(e) => {
                  if (erreur) setErreur(null);
                  saisir(i, e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Backspace" && !chiffres[i] && i > 0) refs.current[i - 1]?.focus();
                }}
                className="h-12 w-12 rounded-sm border border-input text-center text-lg text-foreground outline-none focus:border-primary"
                style={erreur ? { borderColor: "var(--color-destructive)" } : undefined}
              />
            ))}
          </div>
          {erreur ? <p className="mt-1 text-xs text-destructive">{erreur}</p> : null}
        </div>

        {info ? <p className="text-xs text-muted-foreground">{info}</p> : null}

        <BoutonPrincipal type="submit" disabled={chargement}>
          {chargement ? "Vérification..." : "Vérifier"}
        </BoutonPrincipal>

        <button
          type="button"
          onClick={renvoyer}
          className="w-full text-sm font-medium text-primary underline underline-offset-4"
        >
          Renvoyer le code de vérification
        </button>
      </form>
    </AuthShell>
  );
}
