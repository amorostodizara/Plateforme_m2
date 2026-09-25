import type { ReactNode } from "react";
import logoAsset from "@/assets/orange-logo.png";

export function BrandLogo({ className = "h-10 w-10" }: { className?: string }) {
  return <img src={logoAsset} alt="Logo" className={className} />;
}

export function AuthShell({
  titre,
  sousTitre,
  children,
  icone,
  largeur = "max-w-md",
}: {
  titre: string;
  sousTitre?: string;
  children?: ReactNode;
  icone?: ReactNode;
  largeur?: string;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <section className={`w-full ${largeur} rounded-lg border-2 border-dashed border-primary/70 bg-card px-6 py-8 sm:px-10 sm:py-10`}>
        <div className="flex flex-col items-center text-center">
          {icone ?? <BrandLogo />}
          <h1 className="mt-4 text-2xl font-bold text-primary">{titre}</h1>
          {sousTitre ? (
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">{sousTitre}</p>
          ) : null}
        </div>
        {children ? <div className="mt-6">{children}</div> : null}
      </section>
    </main>
  );
}
