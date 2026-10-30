import type { LucideIcon } from "lucide-react";

export function SectionPlaceholder({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="flex min-h-80 flex-col items-center justify-center border border-border bg-card px-6 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-cream text-primary">
          <Icon className="h-6 w-6" />
        </span>
        <h2 className="mt-4 text-base font-bold text-foreground">{title}</h2>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          C'est ici que tout les logs et les journal des activités de cette app se trouve. Mbolatsara ! 
        </p>
      </div>
    </div>
  );
}