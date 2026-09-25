/** Blocs de chargement reproduisant la maquette de chaque écran. */

export function Bloc({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-secondary ${className}`} />;
}

export function SqueletteEntete() {
  return (
    <div className="space-y-2">
      <Bloc className="h-7 w-56" />
      <Bloc className="h-4 w-80" />
    </div>
  );
}

export function SqueletteCartes({ nombre = 5 }: { nombre?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {Array.from({ length: nombre }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border bg-card p-4">
          <Bloc className="h-4 w-24" />
          <Bloc className="mt-3 h-7 w-16" />
          <Bloc className="mt-2 h-3 w-20" />
        </div>
      ))}
    </div>
  );
}

export function SqueletteGraphiques({ nombre = 6 }: { nombre?: number }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: nombre }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border bg-card p-4">
          <Bloc className="h-4 w-40" />
          <div className="mt-4 flex h-44 items-end gap-2">
            {Array.from({ length: 8 }).map((_, j) => (
              <div
                key={j}
                className="flex-1 animate-pulse rounded-md bg-secondary"
                style={{ height: `${30 + ((j * 17) % 60)}%` }}
              />

            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function SqueletteLignesTableau({ colonnes, lignes = 6 }: { colonnes: number; lignes?: number }) {
  return (
    <>
      {Array.from({ length: lignes }).map((_, i) => (
        <tr key={i} className="border-t border-border">
          {Array.from({ length: colonnes }).map((_, j) => (
            <td key={j} className="px-3 py-3">
              <Bloc className="h-4 w-full max-w-[140px]" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function SqueletteGrilleCartes({ nombre = 6 }: { nombre?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: nombre }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-lg border border-border bg-card">
          <Bloc className="h-36 w-full rounded-none" />
          <div className="space-y-2 p-4">
            <Bloc className="h-3 w-20" />
            <Bloc className="h-5 w-3/4" />
            <Bloc className="h-3 w-full" />
            <Bloc className="h-3 w-2/3" />
            <Bloc className="mt-3 h-9 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SqueletteFil({ nombre = 3 }: { nombre?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: nombre }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <Bloc className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Bloc className="h-4 w-40" />
              <Bloc className="h-3 w-24" />
            </div>
          </div>
          <Bloc className="mt-3 h-4 w-2/3" />
          <Bloc className="mt-2 h-3 w-full" />
          <Bloc className="mt-3 h-48 w-full" />
          <div className="mt-3 flex gap-2 border-t border-border pt-3">
            {Array.from({ length: 4 }).map((_, j) => (
              <Bloc key={j} className="h-8 w-24 rounded-full" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
