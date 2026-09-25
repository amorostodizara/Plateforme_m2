import { useId, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  erreur?: string | undefined;
};

export function Field({ label, erreur, className = "", ...props }: FieldProps) {
  const id = useId();
  const enErreur = Boolean(erreur);

  return (
    <div className={className}>
      <div
        className="field-shell h-12 px-3"
        style={enErreur ? { borderColor: "var(--color-destructive)" } : undefined}
      >
        <label
          htmlFor={id}
          className="absolute -top-2 left-3 bg-card px-1 text-xs font-semibold tracking-wide text-muted-foreground"
          style={enErreur ? { color: "var(--color-destructive)" } : undefined}
        >
          {label}
        </label>
        <input
          id={id}
          {...props}
          className="h-full w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
      </div>
      {erreur ? <p className="mt-1 text-xs text-destructive">{erreur}</p> : null}
    </div>
  );
}

export function PasswordField({ label, erreur, className = "", ...props }: FieldProps) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const enErreur = Boolean(erreur);

  return (
    <div className={className}>
      <div
        className="field-shell flex h-12 items-center gap-2 px-3"
        style={enErreur ? { borderColor: "var(--color-destructive)" } : undefined}
      >
        <label
          htmlFor={id}
          className="absolute -top-2 left-3 bg-card px-1 text-xs font-semibold tracking-wide text-muted-foreground"
          style={enErreur ? { color: "var(--color-destructive)" } : undefined}
        >
          {label}
        </label>
        <input
          id={id}
          type={visible ? "text" : "password"}
          {...props}
          className="h-full w-full bg-transparent text-sm text-foreground outline-none"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          className="text-primary"
        >
          {visible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </div>
      {erreur ? <p className="mt-1 text-xs text-destructive">{erreur}</p> : null}
    </div>
  );
}

export function BoutonPrincipal({
  children,
  ...props
}: InputHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) {
  return (
    <button
      {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}
      className="h-12 w-full rounded-sm bg-primary text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
    >
      {children}
    </button>
  );
}

export function BoutonSecondaire({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="h-12 w-full rounded-sm border border-primary/40 bg-cream text-sm font-medium text-primary transition-colors hover:bg-accent"
    >
      {children}
    </button>
  );
}
